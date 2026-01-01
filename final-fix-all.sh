#!/bin/bash

# Final Fix All Script
# This script fixes all remaining issues

set +e

echo "=========================================="
echo "  Final Fix All Script"
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

cd $BACKEND_DIR || exit 1

# Step 1: Verify database
echo ""
echo "Step 1: Verifying database..."
if [ -f "prisma/inventory.db" ] && command -v sqlite3 &> /dev/null; then
    TABLE_COUNT=$(sqlite3 prisma/inventory.db "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';" 2>/dev/null || echo "0")
    if [ "$TABLE_COUNT" -gt 0 ]; then
        print_status "Database verified: $TABLE_COUNT tables"
        
        # Check for Part table
        PART_EXISTS=$(sqlite3 prisma/inventory.db "SELECT name FROM sqlite_master WHERE type='table' AND name='Part';" 2>/dev/null)
        if [ -n "$PART_EXISTS" ]; then
            print_status "Part table exists"
        else
            print_error "Part table NOT found!"
            exit 1
        fi
    else
        print_error "Database has no tables!"
        exit 1
    fi
fi

# Step 2: Verify .env
echo ""
echo "Step 2: Verifying .env..."
if grep -q 'DATABASE_URL="file:./prisma/inventory.db"' .env; then
    print_status ".env is correct"
else
    print_warning "Updating .env..."
    sed -i 's|DATABASE_URL=.*|DATABASE_URL="file:./prisma/inventory.db"|' .env
    print_status ".env updated"
fi

# Step 3: Stop backend completely
echo ""
echo "Step 3: Stopping backend completely..."
pm2 stop backend > /dev/null 2>&1 || true
pm2 delete backend > /dev/null 2>&1 || true
pm2 kill > /dev/null 2>&1 || true
sleep 3
print_status "Backend stopped"

# Step 4: Remove old Prisma client
echo ""
echo "Step 4: Removing old Prisma client..."
rm -rf node_modules/.prisma 2>/dev/null || true
rm -rf node_modules/@prisma/client 2>/dev/null || true
print_status "Old Prisma client removed"

# Step 5: Generate Prisma client fresh
echo ""
echo "Step 5: Generating Prisma client..."
if npx prisma generate > /tmp/prisma-gen.log 2>&1; then
    print_status "Prisma client generated"
else
    print_error "Failed to generate Prisma client"
    cat /tmp/prisma-gen.log | tail -10
    exit 1
fi

# Step 6: Start backend fresh
echo ""
echo "Step 6: Starting backend fresh..."
if [ -f "dist/server.js" ]; then
    pm2 start dist/server.js --name "backend" > /dev/null 2>&1
else
    pm2 start npm --name "backend" -- start > /dev/null 2>&1
fi

sleep 5
print_status "Backend started"

# Step 7: Check status
echo ""
echo "Step 7: Checking backend status..."
sleep 3
if pm2 list | grep -q "backend"; then
    PM2_STATUS=$(pm2 list | grep "backend" | awk '{print $10}' | head -1)
    if [ "$PM2_STATUS" = "online" ]; then
        print_status "Backend is online"
    else
        print_warning "Backend status: $PM2_STATUS"
        print_info "Checking logs..."
        pm2 logs backend --lines 10 --nostream 2>&1 | tail -10
    fi
fi

# Step 8: Test backend
echo ""
echo "Step 8: Testing backend..."
sleep 2
if curl -s -f http://localhost:3001/health > /dev/null 2>&1; then
    print_status "Backend health check passed"
    curl -s http://localhost:3001/health
else
    print_error "Backend health check failed"
fi

# Step 9: Check for current database errors
echo ""
echo "Step 9: Checking for database errors..."
sleep 3

# Clear old logs and check for new errors
pm2 flush > /dev/null 2>&1 || true
sleep 2

# Try to trigger an API call to see if errors occur
curl -s http://localhost:3001/api/parts?limit=1 > /dev/null 2>&1 || true
sleep 1

ERROR_COUNT=$(pm2 logs backend --lines 20 --nostream 2>&1 | grep -i "table.*does not exist" | wc -l || echo "0")

if [ "$ERROR_COUNT" -eq 0 ]; then
    print_status "No database errors found"
else
    print_warning "Found $ERROR_COUNT database errors in recent logs"
    print_info "Recent errors:"
    pm2 logs backend --lines 30 --nostream 2>&1 | grep -i "table.*does not exist" | head -5
fi

# Step 10: Test API endpoints
echo ""
echo "Step 10: Testing API endpoints..."
sleep 1

# Test parts endpoint
if curl -s -f http://localhost:3001/api/parts?limit=1 > /dev/null 2>&1; then
    print_status "Parts API is working"
else
    print_warning "Parts API test failed"
fi

# Test categories endpoint
if curl -s -f http://localhost:3001/api/dropdowns/categories > /dev/null 2>&1; then
    print_status "Categories API is working"
else
    print_warning "Categories API test failed"
fi

# Step 11: Restart Nginx
echo ""
echo "Step 11: Restarting Nginx..."
systemctl restart nginx > /dev/null 2>&1
sleep 1
print_status "Nginx restarted"

# Step 12: Save PM2
pm2 save > /dev/null 2>&1 || true

# Final summary
echo ""
echo "=========================================="
echo -e "${GREEN}  Final Fix Complete!${NC}"
echo "=========================================="
echo ""

echo "Backend Status:"
pm2 list | grep backend

echo ""
echo "Database:"
if command -v sqlite3 &> /dev/null; then
    TABLE_COUNT=$(sqlite3 prisma/inventory.db "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';" 2>/dev/null || echo "0")
    echo "  - Tables: $TABLE_COUNT"
    echo "  - File: prisma/inventory.db"
fi

echo ""
echo "Test your application:"
echo "  - Frontend: http://103.60.12.157"
echo "  - Backend API: http://103.60.12.157/api"
echo ""

echo "If you still see errors, check:"
echo "  - Backend logs: pm2 logs backend"
echo "  - Nginx logs: tail -f /var/log/nginx/error.log"
echo ""

