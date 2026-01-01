#!/bin/bash

# Final Database Connection Fix
# This script ensures Prisma connects to the correct database with tables

set +e

echo "=========================================="
echo "  Final Database Connection Fix"
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

# Step 1: Verify inventory.db has tables
echo ""
echo "Step 1: Verifying inventory.db..."
if [ -f "prisma/inventory.db" ] && command -v sqlite3 &> /dev/null; then
    TABLE_COUNT=$(sqlite3 prisma/inventory.db "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';" 2>/dev/null || echo "0")
    if [ "$TABLE_COUNT" -gt 0 ]; then
        print_status "inventory.db has $TABLE_COUNT tables"
        
        # Check for Part table specifically
        PART_EXISTS=$(sqlite3 prisma/inventory.db "SELECT name FROM sqlite_master WHERE type='table' AND name='Part';" 2>/dev/null)
        if [ -n "$PART_EXISTS" ]; then
            print_status "Part table exists in inventory.db"
        else
            print_error "Part table NOT in inventory.db!"
            exit 1
        fi
    else
        print_error "inventory.db has no tables!"
        exit 1
    fi
else
    print_error "inventory.db not found or sqlite3 not available"
    exit 1
fi

# Step 2: Stop backend
echo ""
echo "Step 2: Stopping backend..."
pm2 stop backend > /dev/null 2>&1 || true
pm2 delete backend > /dev/null 2>&1 || true
pm2 kill > /dev/null 2>&1 || true
sleep 2

# Step 3: Copy inventory.db to dev.db (Prisma might be looking for dev.db)
echo ""
echo "Step 3: Ensuring Prisma uses the correct database..."
# Check if Prisma schema expects dev.db or inventory.db
if grep -q "dev.db" prisma/schema.prisma 2>/dev/null; then
    print_info "Schema references dev.db, copying inventory.db to dev.db"
    cp prisma/inventory.db prisma/dev.db
    chmod 666 prisma/dev.db
    print_status "Copied inventory.db to dev.db"
    
    # Update .env to use dev.db
    cat > .env << 'ENVEOF'
DATABASE_URL="file:./prisma/dev.db"
PORT=3001
NODE_ENV=production
CORS_ORIGIN=http://103.60.12.157
ENVEOF
    print_status ".env set to use dev.db"
else
    # Use inventory.db
    cat > .env << 'ENVEOF'
DATABASE_URL="file:./prisma/inventory.db"
PORT=3001
NODE_ENV=production
CORS_ORIGIN=http://103.60.12.157
ENVEOF
    print_status ".env set to use inventory.db"
fi

# Step 4: Remove Prisma client
echo ""
echo "Step 4: Removing Prisma client..."
rm -rf node_modules/.prisma 2>/dev/null || true
rm -rf node_modules/@prisma/client 2>/dev/null || true

# Step 5: Generate Prisma client
echo ""
echo "Step 5: Generating Prisma client..."
if npx prisma generate > /tmp/prisma-gen.log 2>&1; then
    print_status "Prisma client generated"
else
    print_error "Failed to generate Prisma client"
    exit 1
fi

# Step 6: Test Prisma connection directly
echo ""
echo "Step 6: Testing Prisma database connection..."
# Create a test script to check if Prisma can see tables
cat > /tmp/test-prisma.js << 'TESTEOF'
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const count = await prisma.$queryRaw`SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`;
    console.log('Tables found:', count[0].count);
    
    const partCheck = await prisma.$queryRaw`SELECT name FROM sqlite_master WHERE type='table' AND name='Part'`;
    if (partCheck.length > 0) {
      console.log('Part table exists');
    } else {
      console.log('Part table NOT found');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
TESTEOF

if node /tmp/test-prisma.js 2>&1 | tee /tmp/prisma-test.log; then
    if grep -q "Part table exists" /tmp/prisma-test.log; then
        print_status "Prisma can see the Part table"
    else
        print_warning "Prisma cannot see Part table"
        cat /tmp/prisma-test.log
    fi
fi

# Step 7: Start backend
echo ""
echo "Step 7: Starting backend..."
pm2 start dist/server.js --name "backend" > /dev/null 2>&1
sleep 5

# Step 8: Check status
echo ""
echo "Step 8: Checking backend status..."
sleep 2
if pm2 list | grep -q "backend"; then
    PM2_STATUS=$(pm2 list | grep "backend" | awk '{print $10}' | head -1)
    if [ "$PM2_STATUS" = "online" ]; then
        print_status "Backend is online"
    else
        print_warning "Backend status: $PM2_STATUS"
    fi
fi

# Step 9: Test API
echo ""
echo "Step 9: Testing API..."
sleep 3
pm2 flush > /dev/null 2>&1 || true
sleep 1

RESPONSE=$(curl -s http://localhost:3001/api/parts?limit=1 2>&1)
if echo "$RESPONSE" | grep -q "table.*does not exist"; then
    print_error "Database errors still occurring"
    echo "$RESPONSE" | head -3
else
    if echo "$RESPONSE" | grep -q "data\|\[\]"; then
        print_status "API is working! No database errors"
    else
        print_info "API response: $RESPONSE" | head -3
    fi
fi

# Check logs
sleep 2
ERROR_COUNT=$(pm2 logs backend --lines 20 --nostream 2>&1 | grep -i "table.*does not exist" | wc -l || echo "0")

if [ "$ERROR_COUNT" -eq 0 ]; then
    print_status "No database errors found!"
else
    print_warning "Found $ERROR_COUNT database errors"
fi

pm2 save > /dev/null 2>&1 || true

echo ""
echo "=========================================="
echo -e "${GREEN}  Complete!${NC}"
echo "=========================================="
echo ""

