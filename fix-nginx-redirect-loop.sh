#!/bin/bash

# Fix Nginx Redirect Loop Error
# Run: sudo bash fix-nginx-redirect-loop.sh

set +e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[i]${NC} $1"
}

APP_DIR="/var/www/nextapp"

echo "=========================================="
echo "  Fixing Nginx Redirect Loop..."
echo "=========================================="

# Check if index.html exists
echo ""
echo "Step 1: Checking dist folder..."
if [ ! -f "$APP_DIR/dist/index.html" ]; then
    print_error "index.html not found in dist folder!"
    print_info "Rebuilding frontend..."
    cd $APP_DIR
    npm run build
    if [ ! -f "$APP_DIR/dist/index.html" ]; then
        print_error "Build failed or index.html still missing!"
        print_info "Contents of dist folder:"
        ls -la $APP_DIR/dist/
        exit 1
    fi
else
    print_status "index.html found"
fi

# Step 2: Fix Nginx configuration to prevent redirect loop
echo ""
echo "Step 2: Fixing Nginx configuration..."

# Remove any existing problematic configs
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true

# Create correct Nginx configuration
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
        proxy_buffering off;
    }
    
    # Static assets
    location /assets {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
    
    # Frontend - handle all routes
    location / {
        try_files $uri $uri/ @fallback;
    }
    
    # Fallback to index.html for SPA routing
    location @fallback {
        rewrite ^.*$ /index.html last;
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
}
NGINXEOF

# Enable site
rm -f /etc/nginx/sites-enabled/nextapp 2>/dev/null || true
ln -sf /etc/nginx/sites-available/nextapp /etc/nginx/sites-enabled/

# Test configuration
if nginx -t; then
    systemctl reload nginx || systemctl restart nginx
    print_status "Nginx configuration fixed and reloaded"
else
    print_error "Nginx configuration test failed!"
    exit 1
fi

# Step 3: Fix permissions
echo ""
echo "Step 3: Fixing permissions..."
chown -R www-data:www-data $APP_DIR/dist 2>/dev/null || true
chmod -R 755 $APP_DIR/dist 2>/dev/null || true
print_status "Permissions fixed"

# Step 4: Verify
echo ""
echo "Step 4: Verifying setup..."
sleep 2

if [ -f "$APP_DIR/dist/index.html" ]; then
    print_status "index.html exists"
else
    print_error "index.html still missing!"
    exit 1
fi

if systemctl is-active --quiet nginx; then
    print_status "Nginx is running"
else
    print_error "Nginx is not running!"
    systemctl start nginx
fi

echo ""
echo "=========================================="
echo -e "${GREEN}  Fix Complete!${NC}"
echo "=========================================="
echo ""
echo "Try accessing your website now:"
echo "  http://103.60.12.157"
echo ""
echo "If still having issues, check:"
echo "  sudo tail -f /var/log/nginx/error.log"

