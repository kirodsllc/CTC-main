#!/bin/bash

# Complete Verification and Fix Script
# Run: sudo bash verify-and-fix.sh

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
BACKEND_DIR="$APP_DIR/backend"

echo "=========================================="
echo "  Complete Verification and Fix"
echo "=========================================="

# Check 1: Verify index.html exists and is readable
echo ""
echo "Check 1: Verifying index.html..."
if [ -f "$APP_DIR/dist/index.html" ]; then
    if [ -r "$APP_DIR/dist/index.html" ]; then
        print_status "index.html exists and is readable"
        FILE_SIZE=$(stat -f%z "$APP_DIR/dist/index.html" 2>/dev/null || stat -c%s "$APP_DIR/dist/index.html" 2>/dev/null)
        print_info "File size: $FILE_SIZE bytes"
    else
        print_error "index.html exists but is not readable!"
        chmod 644 $APP_DIR/dist/index.html
        print_status "Fixed permissions on index.html"
    fi
else
    print_error "index.html NOT FOUND! Rebuilding..."
    cd $APP_DIR
    npm run build
    if [ ! -f "$APP_DIR/dist/index.html" ]; then
        print_error "Build failed! Check build errors above."
        exit 1
    fi
fi

# Check 2: Verify dist folder structure
echo ""
echo "Check 2: Verifying dist folder structure..."
ls -la $APP_DIR/dist/ | head -10
if [ -d "$APP_DIR/dist/assets" ]; then
    print_status "assets folder exists"
    ASSET_COUNT=$(find $APP_DIR/dist/assets -type f 2>/dev/null | wc -l)
    print_info "Found $ASSET_COUNT asset files"
else
    print_warning "assets folder not found"
fi

# Check 3: Fix all permissions
echo ""
echo "Check 3: Fixing all permissions..."
chown -R www-data:www-data $APP_DIR/dist 2>/dev/null || true
chmod -R 755 $APP_DIR/dist 2>/dev/null || true
chmod 644 $APP_DIR/dist/index.html 2>/dev/null || true
print_status "Permissions fixed"

# Check 4: Check current Nginx config
echo ""
echo "Check 4: Checking Nginx configuration..."
if [ -f /etc/nginx/sites-available/nextapp ]; then
    print_status "Nginx config file exists"
    print_info "Current root directive:"
    grep -E "^\s*root" /etc/nginx/sites-available/nextapp || echo "  (not found)"
else
    print_error "Nginx config file missing!"
fi

# Check 5: Create a simpler, more reliable Nginx config
echo ""
echo "Check 5: Creating optimized Nginx configuration..."
cat > /etc/nginx/sites-available/nextapp << 'NGINXEOF'
server {
    listen 80;
    server_name _;
    
    # Root directory for static files
    root /var/www/nextapp/dist;
    index index.html;
    
    # Logging
    access_log /var/log/nginx/nextapp_access.log;
    error_log /var/log/nginx/nextapp_error.log;
    
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
    
    # Static assets with caching
    location /assets {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
    
    # Favicon
    location = /favicon.ico {
        access_log off;
        log_not_found off;
    }
    
    # Frontend routes - SPA support
    location / {
        try_files $uri $uri/ =404;
    }
    
    # If file not found, serve index.html for SPA routing
    error_page 404 = @spa_fallback;
    
    location @spa_fallback {
        rewrite ^.*$ /index.html last;
    }
}
NGINXEOF

# Remove old symlink and create new one
rm -f /etc/nginx/sites-enabled/default
rm -f /etc/nginx/sites-enabled/nextapp
ln -sf /etc/nginx/sites-available/nextapp /etc/nginx/sites-enabled/

# Test configuration
if nginx -t 2>&1; then
    systemctl reload nginx 2>/dev/null || systemctl restart nginx
    print_status "Nginx configuration updated"
else
    print_error "Nginx configuration test failed!"
    nginx -t
    exit 1
fi

# Check 6: Test if we can read index.html as www-data
echo ""
echo "Check 6: Testing file access..."
if sudo -u www-data test -r "$APP_DIR/dist/index.html"; then
    print_status "www-data can read index.html"
else
    print_warning "www-data cannot read index.html, fixing..."
    chmod 644 $APP_DIR/dist/index.html
    chown www-data:www-data $APP_DIR/dist/index.html
fi

# Check 7: Verify backend
echo ""
echo "Check 7: Verifying backend..."
if pm2 list | grep -q "backend.*online"; then
    print_status "Backend is running"
    BACKEND_RESPONSE=$(curl -s http://localhost:3001/health 2>/dev/null)
    if [ ! -z "$BACKEND_RESPONSE" ]; then
        print_status "Backend API responding: $BACKEND_RESPONSE"
    else
        print_warning "Backend not responding, restarting..."
        pm2 restart backend
        sleep 3
    fi
else
    print_error "Backend not running!"
    cd $BACKEND_DIR
    pm2 start npm --name "backend" -- start
    sleep 3
fi

# Check 8: Test Nginx serving files
echo ""
echo "Check 8: Testing Nginx file serving..."
sleep 2

# Test if Nginx can serve index.html
HTTP_TEST=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/ 2>/dev/null)
if [ "$HTTP_TEST" = "200" ]; then
    print_status "Nginx serving index.html successfully (HTTP $HTTP_TEST)"
elif [ "$HTTP_TEST" = "404" ]; then
    print_error "Nginx returning 404 - file not found"
    print_info "Checking if root path is correct..."
    grep "root" /etc/nginx/sites-available/nextapp
    ls -la $APP_DIR/dist/index.html
elif [ "$HTTP_TEST" = "500" ]; then
    print_error "Nginx returning 500 - internal server error"
    print_info "Recent Nginx errors:"
    tail -10 /var/log/nginx/error.log | grep -v "favicon"
else
    print_warning "Unexpected HTTP code: $HTTP_TEST"
fi

# Check 9: Show recent Nginx errors
echo ""
echo "Check 9: Recent Nginx errors (last 5):"
tail -5 /var/log/nginx/error.log 2>/dev/null | grep -v "favicon" || echo "  (no recent errors)"

# Final summary
echo ""
echo "=========================================="
echo "  Verification Complete"
echo "=========================================="
echo ""
echo "Current status:"
echo "  - Frontend dist: $([ -f $APP_DIR/dist/index.html ] && echo 'OK' || echo 'MISSING')"
echo "  - Backend: $(pm2 list | grep backend | awk '{print $10}' || echo 'NOT RUNNING')"
echo "  - Nginx: $(systemctl is-active nginx 2>/dev/null || echo 'NOT RUNNING')"
echo ""
echo "Test your website:"
echo "  curl -I http://localhost/"
echo ""
echo "If still getting 500 error, check:"
echo "  sudo tail -20 /var/log/nginx/nextapp_error.log"
echo "  sudo tail -20 /var/log/nginx/error.log"

