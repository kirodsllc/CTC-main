#!/bin/bash

# Fix 502 Bad Gateway Error
set +e

echo "=========================================="
echo "  Fix 502 Bad Gateway Error"
echo "=========================================="
echo ""

cd /var/www/nextapp/backend || exit 1

# Step 1: Check PM2 status
echo "Step 1: Checking PM2 status..."
pm2 list
echo ""

# Step 2: Check if backend is listening on port 3001
echo "Step 2: Checking if backend is listening on port 3001..."
if netstat -tuln 2>/dev/null | grep -q ":3001 " || ss -tuln 2>/dev/null | grep -q ":3001 "; then
    echo "[✓] Backend is listening on port 3001"
else
    echo "[✗] Backend is NOT listening on port 3001"
    echo "[!] Restarting backend..."
    pm2 restart backend > /dev/null 2>&1 || pm2 start dist/server.js --name "backend" > /dev/null 2>&1
    sleep 5
fi

# Step 3: Test backend directly
echo ""
echo "Step 3: Testing backend directly..."
if curl -s -f http://localhost:3001/health > /dev/null 2>&1; then
    echo "[✓] Backend health check passed"
else
    echo "[✗] Backend health check failed"
    echo "[!] Checking backend logs..."
    pm2 logs backend --lines 10 --nostream 2>&1 | tail -10
    echo ""
    echo "[!] Restarting backend..."
    pm2 restart backend > /dev/null 2>&1 || pm2 start dist/server.js --name "backend" > /dev/null 2>&1
    sleep 5
fi

# Step 4: Check Nginx configuration
echo ""
echo "Step 4: Checking Nginx configuration..."
if [ -f "/etc/nginx/sites-available/default" ]; then
    if grep -q "proxy_pass http://localhost:3001" /etc/nginx/sites-available/default || grep -q "proxy_pass http://127.0.0.1:3001" /etc/nginx/sites-available/default; then
        echo "[✓] Nginx proxy configuration looks correct"
    else
        echo "[!] Nginx proxy configuration might be incorrect"
    fi
fi

# Step 5: Test Nginx
echo ""
echo "Step 5: Testing Nginx..."
if systemctl is-active --quiet nginx; then
    echo "[✓] Nginx is running"
else
    echo "[✗] Nginx is not running, starting it..."
    systemctl start nginx
fi

# Step 6: Restart Nginx to apply any changes
echo ""
echo "Step 6: Restarting Nginx..."
if systemctl restart nginx > /dev/null 2>&1; then
    echo "[✓] Nginx restarted"
else
    echo "[✗] Failed to restart Nginx"
fi

# Step 7: Test API endpoint through Nginx
echo ""
echo "Step 7: Testing API through Nginx..."
sleep 2
if curl -s -f http://localhost/api/inventory/dashboard > /dev/null 2>&1; then
    echo "[✓] API is accessible through Nginx"
else
    echo "[!] API not accessible through Nginx, checking external access..."
    EXTERNAL_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" http://103.60.12.157/api/inventory/dashboard 2>&1 | tail -1)
    if echo "$EXTERNAL_RESPONSE" | grep -q "HTTP_CODE:502"; then
        echo "[✗] Still getting 502 error"
        echo "[!] Checking backend logs for errors..."
        pm2 logs backend --lines 20 --nostream 2>&1 | grep -i "error\|fatal\|crash" | tail -5
    elif echo "$EXTERNAL_RESPONSE" | grep -q "HTTP_CODE:200"; then
        echo "[✓] External API is working!"
    else
        echo "[!] HTTP Status: $EXTERNAL_RESPONSE"
    fi
fi

# Step 8: Check backend process
echo ""
echo "Step 8: Checking backend process..."
BACKEND_PID=$(pm2 jlist 2>/dev/null | grep -o '"pid":[0-9]*' | head -1 | cut -d: -f2)
if [ -n "$BACKEND_PID" ] && ps -p "$BACKEND_PID" > /dev/null 2>&1; then
    echo "[✓] Backend process is running (PID: $BACKEND_PID)"
else
    echo "[✗] Backend process is not running"
    echo "[!] Starting backend..."
    pm2 start dist/server.js --name "backend" > /dev/null 2>&1
    sleep 5
fi

# Step 9: Final test
echo ""
echo "Step 9: Final API test..."
sleep 2
pm2 flush > /dev/null 2>&1 || true
sleep 1

# Test health endpoint
if curl -s http://localhost:3001/health | grep -q "ok"; then
    echo "[✓] Backend health endpoint working"
else
    echo "[✗] Backend health endpoint not working"
fi

# Test dashboard endpoint
DASHBOARD_RESPONSE=$(curl -s http://localhost:3001/api/inventory/dashboard 2>&1)
if echo "$DASHBOARD_RESPONSE" | grep -qi "error\|502"; then
    echo "[✗] Dashboard endpoint has errors"
    echo "$DASHBOARD_RESPONSE" | head -3
else
    echo "[✓] Dashboard endpoint is working"
fi

pm2 save > /dev/null 2>&1 || true

echo ""
echo "=========================================="
echo "  Complete!"
echo "=========================================="
echo ""
echo "Backend Status:"
pm2 list | grep backend
echo ""
echo "To check logs: pm2 logs backend"
echo "To check Nginx: systemctl status nginx"

