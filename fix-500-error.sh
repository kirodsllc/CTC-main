#!/bin/bash

# Fix 500 Internal Server Error
# Run: sudo bash fix-500-error.sh

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
echo "  Diagnosing 500 Error..."
echo "=========================================="

# Check 1: Verify dist folder exists
echo ""
echo "Check 1: Verifying frontend build..."
if [ -d "$APP_DIR/dist" ]; then
    if [ -f "$APP_DIR/dist/index.html" ]; then
        print_status "Frontend dist folder exists with index.html"
        ls -la $APP_DIR/dist/ | head -5
    else
        print_error "dist folder exists but index.html is missing!"
        print_info "Rebuilding frontend..."
        cd $APP_DIR && npm run build
    fi
else
    print_error "dist folder not found! Rebuilding..."
    cd $APP_DIR && npm run build
fi

# Check 2: Check Nginx error logs
echo ""
echo "Check 2: Checking Nginx error logs..."
if [ -f /var/log/nginx/error.log ]; then
    print_info "Recent Nginx errors:"
    tail -20 /var/log/nginx/error.log
else
    print_warning "Nginx error log not found"
fi

# Check 3: Verify backend is running
echo ""
echo "Check 3: Verifying backend..."
if pm2 list | grep -q "backend.*online"; then
    print_status "Backend is running in PM2"
    pm2 status
else
    print_error "Backend is not running!"
    print_info "Starting backend..."
    cd $BACKEND_DIR
    pm2 restart backend || pm2 start npm --name "backend" -- start
fi

# Check 4: Test backend API
echo ""
echo "Check 4: Testing backend API..."
sleep 2
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    print_status "Backend health endpoint responding"
    curl -s http://localhost:3001/health
elif curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    print_status "Backend API health endpoint responding"
    curl -s http://localhost:3001/api/health
else
    print_error "Backend not responding on port 3001"
    print_info "Backend logs:"
    pm2 logs backend --lines 10 --nostream
fi

# Check 5: Verify Nginx configuration
echo ""
echo "Check 5: Verifying Nginx configuration..."
if nginx -t 2>&1; then
    print_status "Nginx configuration is valid"
else
    print_error "Nginx configuration has errors!"
fi

# Check 6: Fix permissions
echo ""
echo "Check 6: Fixing permissions..."
chown -R www-data:www-data $APP_DIR/dist 2>/dev/null || chown -R root:root $APP_DIR/dist 2>/dev/null || true
chmod -R 755 $APP_DIR/dist 2>/dev/null || true
print_status "Permissions updated"

# Check 7: Update Nginx config with better error handling
echo ""
echo "Check 7: Updating Nginx configuration..."
cat > /etc/nginx/sites-available/nextapp << 'NGINXEOF'
server {
    listen 80;
    server_name _;
    
    # Increase timeouts
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
    
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
    
    # Frontend static files
    location / {
        root /var/www/nextapp/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
        
        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
    }
    
    # Static assets with caching
    location /assets {
        root /var/www/nextapp/dist;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Error pages
    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
    }
}
NGINXEOF

# Test and reload Nginx
if nginx -t; then
    systemctl reload nginx || systemctl restart nginx
    print_status "Nginx configuration updated and reloaded"
else
    print_error "Nginx configuration test failed!"
fi

# Check 8: Verify file ownership
echo ""
echo "Check 8: Checking file ownership..."
ls -la $APP_DIR/ | head -5
ls -la $APP_DIR/dist/ | head -5

# Final verification
echo ""
echo "=========================================="
echo "  Final Checks..."
echo "=========================================="

# Test frontend
if [ -f "$APP_DIR/dist/index.html" ]; then
    print_status "Frontend index.html exists"
else
    print_error "Frontend index.html missing - rebuilding..."
    cd $APP_DIR && npm run build
fi

# Test backend
sleep 2
if curl -s http://localhost:3001/health > /dev/null 2>&1 || curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    print_status "Backend is responding"
else
    print_warning "Backend may need a moment to start"
    print_info "Check logs: pm2 logs backend"
fi

# Test Nginx
if systemctl is-active --quiet nginx; then
    print_status "Nginx is running"
else
    print_error "Nginx is not running!"
    systemctl start nginx
fi

echo ""
echo "=========================================="
echo -e "${GREEN}  Diagnostic Complete!${NC}"
echo "=========================================="
echo ""
echo "If you still see 500 error, check:"
echo "  1. Nginx error log: sudo tail -f /var/log/nginx/error.log"
echo "  2. Backend logs: pm2 logs backend"
echo "  3. Backend status: pm2 status"
echo "  4. Test backend: curl http://localhost:3001/health"
echo ""

