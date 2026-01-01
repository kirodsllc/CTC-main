#!/bin/bash

# Fix Prisma Client and Restart Backend
# This script regenerates Prisma client and fully restarts the backend

set +e

echo "=========================================="
echo "  Fix Prisma Client and Restart Backend"
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

# Step 1: Verify database exists and has tables
echo ""
echo "Step 1: Verifying database..."
if [ -f "prisma/inventory.db" ] && command -v sqlite3 &> /dev/null; then
    TABLE_COUNT=$(sqlite3 prisma/inventory.db "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';" 2>/dev/null || echo "0")
    
    if [ "$TABLE_COUNT" -gt 0 ]; then
        print_status "Database verified: $TABLE_COUNT tables exist"
        
        # Check for Part table specifically
        PART_EXISTS=$(sqlite3 prisma/inventory.db "SELECT name FROM sqlite_master WHERE type='table' AND name='Part';" 2>/dev/null)
        if [ -n "$PART_EXISTS" ]; then
            print_status "Part table exists"
        else
            print_error "Part table NOT found!"
            exit 1
        fi
        
        # Check for Supplier table
        SUPPLIER_EXISTS=$(sqlite3 prisma/inventory.db "SELECT name FROM sqlite_master WHERE type='table' AND name='Supplier';" 2>/dev/null)
        if [ -n "$SUPPLIER_EXISTS" ]; then
            print_status "Supplier table exists"
        else
            print_error "Supplier table NOT found!"
            exit 1
        fi
    else
        print_error "Database has no tables!"
        exit 1
    fi
else
    print_error "Database file not found or sqlite3 not available"
    exit 1
fi

# Step 2: Stop backend completely
echo ""
echo "Step 2: Stopping backend completely..."
pm2 stop backend > /dev/null 2>&1 || true
pm2 delete backend > /dev/null 2>&1 || true
sleep 2
print_status "Backend stopped and removed from PM2"

# Step 3: Remove old Prisma client
echo ""
echo "Step 3: Removing old Prisma client..."
rm -rf node_modules/.prisma 2>/dev/null || true
rm -rf node_modules/@prisma/client 2>/dev/null || true
print_status "Old Prisma client removed"

# Step 4: Verify .env file
echo ""
echo "Step 4: Verifying .env file..."
if [ -f ".env" ]; then
    DATABASE_URL=$(grep DATABASE_URL .env | cut -d'=' -f2 | tr -d '"' || echo "")
    print_info "DATABASE_URL: $DATABASE_URL"
    
    # Ensure it points to inventory.db
    if [[ "$DATABASE_URL" != *"inventory.db"* ]]; then
        print_warning "Updating DATABASE_URL to use inventory.db"
        sed -i 's|DATABASE_URL=.*|DATABASE_URL="file:./prisma/inventory.db"|' .env
        print_status ".env updated"
    fi
else
    print_error ".env file not found!"
    exit 1
fi

# Step 5: Generate Prisma client fresh
echo ""
echo "Step 5: Generating Prisma client..."
if npx prisma generate > /tmp/prisma-generate.log 2>&1; then
    print_status "Prisma client generated"
    
    # Check if client was actually generated
    if [ -d "node_modules/.prisma/client" ] || [ -d "node_modules/@prisma/client" ]; then
        print_status "Prisma client files verified"
    else
        print_warning "Prisma client files not found, checking logs..."
        tail -10 /tmp/prisma-generate.log
    fi
else
    print_error "Failed to generate Prisma client"
    print_info "Prisma generate output:"
    cat /tmp/prisma-generate.log | tail -20
    exit 1
fi

# Step 6: Rebuild backend (optional but recommended)
echo ""
echo "Step 6: Rebuilding backend..."
if npm run build > /tmp/backend-build.log 2>&1; then
    print_status "Backend rebuilt"
else
    print_warning "Build had warnings, but continuing..."
    tail -5 /tmp/backend-build.log
fi

# Step 7: Start backend fresh
echo ""
echo "Step 7: Starting backend fresh..."
cd $BACKEND_DIR

# Kill any existing PM2 processes
pm2 kill > /dev/null 2>&1 || true
sleep 2

# Start backend
if pm2 start npm --name "backend" -- start > /dev/null 2>&1; then
    sleep 5
    print_status "Backend started"
else
    print_warning "PM2 start failed, trying alternative method..."
    if [ -f "dist/server.js" ]; then
        pm2 start dist/server.js --name "backend" > /dev/null 2>&1
        sleep 5
        print_status "Backend started (alternative method)"
    else
        print_error "Failed to start backend"
        exit 1
    fi
fi

# Step 8: Verify backend is running
echo ""
echo "Step 8: Verifying backend status..."
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
else
    print_error "Backend not found in PM2"
    exit 1
fi

# Step 9: Test database connection
echo ""
echo "Step 9: Testing database connection..."
sleep 2

# Check backend logs for database errors
ERROR_COUNT=$(pm2 logs backend --lines 50 --nostream 2>&1 | grep -i "table.*does not exist" | wc -l || echo "0")

if [ "$ERROR_COUNT" -eq 0 ]; then
    print_status "No database errors found in logs"
else
    print_warning "Found $ERROR_COUNT database errors in logs"
    print_info "Recent errors:"
    pm2 logs backend --lines 20 --nostream 2>&1 | grep -i "table.*does not exist" | head -5
fi

# Step 10: Test API endpoint
echo ""
echo "Step 10: Testing API endpoint..."
sleep 2
if command -v curl &> /dev/null; then
    if curl -s -f http://localhost:3001/health > /dev/null 2>&1; then
        print_status "Backend API is responding"
    elif curl -s -f http://localhost:3001/api/health > /dev/null 2>&1; then
        print_status "Backend API is responding (alternative endpoint)"
    else
        print_warning "Backend API health check failed"
    fi
fi

# Final summary
echo ""
echo "=========================================="
echo -e "${GREEN}  Fix Complete!${NC}"
echo "=========================================="
echo ""

echo "Database Status:"
if command -v sqlite3 &> /dev/null; then
    TABLE_COUNT=$(sqlite3 prisma/inventory.db "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';" 2>/dev/null || echo "0")
    echo "  - Tables: $TABLE_COUNT"
fi

echo ""
echo "Backend Status:"
if pm2 list | grep -q "backend"; then
    PM2_STATUS=$(pm2 list | grep "backend" | awk '{print $10}' | head -1)
    echo "  - Status: $PM2_STATUS"
fi

echo ""
echo "Next steps:"
echo "  1. Check application in browser: http://103.60.12.157"
echo "  2. Monitor logs: pm2 logs backend"
echo "  3. If errors persist, check: pm2 logs backend --lines 50"
echo ""

