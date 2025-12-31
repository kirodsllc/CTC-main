#!/bin/bash

# Fix All Nginx Configurations
# Run: sudo bash fix-all-nginx-configs.sh

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
echo "  Fixing All Nginx Configurations"
echo "=========================================="

# Step 1: Check all enabled sites
echo ""
echo "Step 1: Checking enabled Nginx sites..."
print_info "Enabled sites:"
ls -la /etc/nginx/sites-enabled/

# Step 2: Remove ALL old configs
echo ""
echo "Step 2: Removing old configurations..."
rm -f /etc/nginx/sites-enabled/default
rm -f /etc/nginx/sites-enabled/nextapp
print_status "Old configs removed"

# Step 3: Check for any other config files that might conflict
echo ""
echo "Step 3: Checking for conflicting configs..."
if [ -f /etc/nginx/conf.d/default.conf ]; then
    print_warning "Found /etc/nginx/conf.d/default.conf - backing up..."
    mv /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf.backup
fi

# Step 4: Create the correct, simple configuration
echo ""
echo "Step 4: Creating correct Nginx configuration..."
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
    
    # Frontend - serve index.html for SPA
    location / {
        try_files $uri $uri/ /index.html;
    }
}
NGINXEOF

# Step 5: Enable the site
echo ""
echo "Step 5: Enabling site..."
ln -sf /etc/nginx/sites-available/nextapp /etc/nginx/sites-enabled/
print_status "Site enabled"

# Step 6: Test configuration
echo ""
echo "Step 6: Testing Nginx configuration..."
if nginx -t 2>&1; then
    print_status "Configuration is valid"
else
    print_error "Configuration test failed!"
    nginx -t
    exit 1
fi

# Step 7: Clear Nginx cache and restart
echo ""
echo "Step 7: Restarting Nginx..."
systemctl stop nginx 2>/dev/null || true
sleep 1
systemctl start nginx
sleep 2

if systemctl is-active --quiet nginx; then
    print_status "Nginx restarted successfully"
else
    print_error "Nginx failed to start!"
    systemctl status nginx
    exit 1
fi

# Step 8: Verify it's working
echo ""
echo "Step 8: Verifying website..."
sleep 2

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/ 2>/dev/null)
if [ "$HTTP_CODE" = "200" ]; then
    print_status "Website is working! (HTTP $HTTP_CODE)"
else
    print_warning "Got HTTP $HTTP_CODE, checking logs..."
    tail -5 /var/log/nginx/error.log
fi

# Step 9: Check for any remaining errors
echo ""
echo "Step 9: Checking for new errors..."
sleep 3
NEW_ERRORS=$(tail -5 /var/log/nginx/error.log | grep -c "error" || echo "0")
if [ "$NEW_ERRORS" -eq 0 ]; then
    print_status "No new errors in log"
else
    print_warning "Found new errors:"
    tail -5 /var/log/nginx/error.log | grep "error"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}  Configuration Fixed!${NC}"
echo "=========================================="
echo ""
echo "Your website should now work at:"
echo "  http://103.60.12.157"
echo ""
echo "If you still see errors in browser:"
echo "  1. Clear browser cache (Ctrl+Shift+Delete)"
echo "  2. Try incognito/private mode"
echo "  3. Hard refresh (Ctrl+Shift+R)"
echo ""

