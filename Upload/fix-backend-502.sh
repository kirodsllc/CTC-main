#!/bin/bash

# Fix 502 Bad Gateway - Backend Connection Issues
# This script fixes backend connection and Nginx proxy issues

set +e

echo "=========================================="
echo "  Fix 502 Bad Gateway - Backend Issues"
echo "=========================================="

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

BACKEND_DIR="/var/www/nextapp/backend"

print_status() { echo -e "${GREEN}[✓]${NC} $1"; }
print_error() { echo -e "${RED}[✗]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[!]${NC} $1"; }
print_info() { echo -e "${BLUE}[i]${NC} $1"; }

# Step 1: Check PM2 status
echo ""
echo "Step 1: Checking PM2 status..."
if command -v pm2 &> /dev/null; then
    pm2 list
    echo ""
    
    # Check if backend process exists
    if pm2 list | grep -q "backend"; then
        PM2_STATUS=$(pm2 list | grep "backend" | awk '{print $10}' | head -1)
        print_info "Backend PM2 status: $PM2_STATUS"
        
        if [ "$PM2_STATUS" != "online" ]; then
            print_warning "Backend is not online, checking logs..."
            pm2 logs backend --lines 20 --nostream 2>&1 | tail -20
        fi
    else
        print_error "Backend not found in PM2!"
    fi
fi

# Step 2: Check if backend is listening on port 3001
echo ""
echo "Step 2: Checking if backend is listening on port 3001..."
if command -v netstat &> /dev/null; then
    PORT_CHECK=$(netstat -tlnp 2>/dev/null | grep ":3001" || ss -tlnp 2>/dev/null | grep ":3001" || echo "")
    if [ -n "$PORT_CHECK" ]; then
        print_status "Backend is listening on port 3001"
        echo "$PORT_CHECK"
    else
        print_error "Backend is NOT listening on port 3001!"
    fi
else
    # Try with ss or lsof
    if command -v ss &> /dev/null; then
        PORT_CHECK=$(ss -tlnp | grep ":3001" || echo "")
        if [ -n "$PORT_CHECK" ]; then
            print_status "Backend is listening on port 3001"
        else
            print_error "Backend is NOT listening on port 3001!"
        fi
    fi
fi

# Step 3: Test backend directly
echo ""
echo "Step 3: Testing backend directly..."
if command -v curl &> /dev/null; then
    # Test localhost:3001
    if curl -s -f http://localhost:3001/health > /dev/null 2>&1; then
        print_status "Backend responds on localhost:3001/health"
    elif curl -s -f http://localhost:3001/api/health > /dev/null 2>&1; then
        print_status "Backend responds on localhost:3001/api/health"
    else
        print_error "Backend does NOT respond on localhost:3001"
        print_info "Trying to get response..."
        curl -v http://localhost:3001/health 2>&1 | head -10
    fi
fi

# Step 4: Check backend logs for errors
echo ""
echo "Step 4: Checking backend logs for errors..."
if command -v pm2 &> /dev/null; then
    ERROR_COUNT=$(pm2 logs backend --lines 50 --nostream 2>&1 | grep -i "error\|failed\|cannot" | wc -l || echo "0")
    if [ "$ERROR_COUNT" -gt 0 ]; then
        print_warning "Found errors in backend logs:"
        pm2 logs backend --lines 30 --nostream 2>&1 | grep -i "error\|failed\|cannot" | head -10
    else
        print_status "No critical errors in recent logs"
    fi
fi

# Step 5: Stop and restart backend properly
echo ""
echo "Step 5: Restarting backend properly..."
cd $BACKEND_DIR || exit 1

# Kill all PM2 processes
pm2 kill > /dev/null 2>&1 || true
sleep 3

# Start backend fresh
print_info "Starting backend..."
if [ -f "dist/server.js" ]; then
    pm2 start dist/server.js --name "backend" > /dev/null 2>&1
else
    pm2 start npm --name "backend" -- start > /dev/null 2>&1
fi

sleep 5

# Check status
if pm2 list | grep -q "backend"; then
    PM2_STATUS=$(pm2 list | grep "backend" | awk '{print $10}' | head -1)
    if [ "$PM2_STATUS" = "online" ]; then
        print_status "Backend is now online"
    else
        print_error "Backend status: $PM2_STATUS"
        print_info "Recent logs:"
        pm2 logs backend --lines 20 --nostream 2>&1 | tail -20
    fi
fi

# Step 6: Test backend again
echo ""
echo "Step 6: Testing backend after restart..."
sleep 2
if command -v curl &> /dev/null; then
    if curl -s -f http://localhost:3001/health > /dev/null 2>&1; then
        print_status "Backend is responding"
        curl -s http://localhost:3001/health | head -5
    elif curl -s -f http://localhost:3001/api/health > /dev/null 2>&1; then
        print_status "Backend is responding (alternative endpoint)"
    else
        print_error "Backend still not responding"
        print_info "Checking if process is running:"
        ps aux | grep -i "node.*server\|node.*backend" | grep -v grep | head -5
    fi
fi

# Step 7: Check Nginx configuration
echo ""
echo "Step 7: Checking Nginx configuration..."
if [ -f "/etc/nginx/sites-available/nextapp" ]; then
    print_status "Nginx config file exists"
    
    # Check if proxy_pass is correct
    if grep -q "proxy_pass http://localhost:3001" /etc/nginx/sites-available/nextapp; then
        print_status "Nginx proxy_pass configured correctly"
    else
        print_warning "Nginx proxy_pass might be misconfigured"
        grep "proxy_pass" /etc/nginx/sites-available/nextapp
    fi
    
    # Check if site is enabled
    if [ -L "/etc/nginx/sites-enabled/nextapp" ]; then
        print_status "Nginx site is enabled"
    else
        print_warning "Nginx site might not be enabled"
    fi
else
    print_error "Nginx config file not found!"
fi

# Step 8: Test Nginx configuration and restart
echo ""
echo "Step 8: Testing and restarting Nginx..."
if nginx -t > /dev/null 2>&1; then
    print_status "Nginx configuration is valid"
    systemctl restart nginx > /dev/null 2>&1
    sleep 2
    print_status "Nginx restarted"
else
    print_error "Nginx configuration has errors!"
    nginx -t 2>&1 | head -10
fi

# Step 9: Test API through Nginx
echo ""
echo "Step 9: Testing API through Nginx..."
sleep 2
if command -v curl &> /dev/null; then
    if curl -s -f http://localhost/api/health > /dev/null 2>&1; then
        print_status "API responds through Nginx"
    elif curl -s -f http://103.60.12.157/api/health > /dev/null 2>&1; then
        print_status "API responds through Nginx (external IP)"
    else
        print_warning "API not responding through Nginx"
        print_info "Testing direct backend connection:"
        curl -s http://localhost:3001/health 2>&1 | head -5
    fi
fi

# Step 10: Save PM2 configuration
echo ""
echo "Step 10: Saving PM2 configuration..."
pm2 save > /dev/null 2>&1 || true
print_status "PM2 configuration saved"

# Final summary
echo ""
echo "=========================================="
echo -e "${GREEN}  Fix Complete!${NC}"
echo "=========================================="
echo ""

echo "Backend Status:"
if pm2 list | grep -q "backend"; then
    PM2_STATUS=$(pm2 list | grep "backend" | awk '{print $10}' | head -1)
    echo "  - PM2 Status: $PM2_STATUS"
fi

echo ""
echo "Port Check:"
if command -v netstat &> /dev/null; then
    netstat -tlnp 2>/dev/null | grep ":3001" || ss -tlnp 2>/dev/null | grep ":3001" || echo "  - Port 3001: Not listening"
fi

echo ""
echo "Nginx Status:"
if systemctl is-active --quiet nginx 2>/dev/null; then
    echo "  - Nginx: Running"
else
    echo "  - Nginx: Not running"
fi

echo ""
echo "Next steps:"
echo "  1. Check backend logs: pm2 logs backend"
echo "  2. Check Nginx logs: tail -f /var/log/nginx/error.log"
echo "  3. Test API: curl http://localhost:3001/health"
echo "  4. Test through Nginx: curl http://localhost/api/health"
echo ""

