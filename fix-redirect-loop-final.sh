#!/bin/bash

# Final Fix for Nginx Redirect Loop
# Run: sudo bash fix-redirect-loop-final.sh

set +e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

APP_DIR="/var/www/nextapp"

echo "=========================================="
echo "  Fixing Redirect Loop - Final Solution"
echo "=========================================="

# Create a simple, working Nginx configuration
cat > /etc/nginx/sites-available/nextapp << 'NGINXEOF'
server {
    listen 80;
    server_name _;
    
    root /var/www/nextapp/dist;
    index index.html;
    
    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Static assets
    location /assets {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Favicon and robots.txt
    location ~ ^/(favicon.ico|robots.txt)$ {
        access_log off;
        log_not_found off;
    }
    
    # Frontend - serve index.html for all routes (SPA)
    location / {
        try_files $uri $uri/ /index.html;
    }
}
NGINXEOF

# Remove old symlinks
rm -f /etc/nginx/sites-enabled/default
rm -f /etc/nginx/sites-enabled/nextapp

# Create new symlink
ln -sf /etc/nginx/sites-available/nextapp /etc/nginx/sites-enabled/

# Test and restart
if nginx -t; then
    systemctl restart nginx
    print_status "Nginx configuration updated and restarted"
    
    echo ""
    echo "Testing..."
    sleep 2
    
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/)
    if [ "$HTTP_CODE" = "200" ]; then
        print_status "Website is now working! (HTTP $HTTP_CODE)"
    else
        print_error "Still getting HTTP $HTTP_CODE"
        echo "Check logs: sudo tail -20 /var/log/nginx/error.log"
    fi
else
    print_error "Nginx configuration test failed!"
    nginx -t
    exit 1
fi

echo ""
echo "Your website should now be accessible at:"
echo "  http://103.60.12.157"

