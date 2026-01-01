#!/bin/bash

# Fix Database Path Script
# Updates .env to use the correct database file

set +e

echo "=========================================="
echo "  Fix Database Path Script"
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

# Step 1: Check which database file exists
echo ""
echo "Step 1: Checking database files..."
if [ -f "prisma/inventory.db" ]; then
    if command -v sqlite3 &> /dev/null; then
        TABLE_COUNT=$(sqlite3 prisma/inventory.db "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';" 2>/dev/null || echo "0")
        if [ "$TABLE_COUNT" -gt 0 ]; then
            print_status "inventory.db exists with $TABLE_COUNT tables"
            USE_DB="inventory.db"
        else
            print_warning "inventory.db exists but has no tables"
        fi
    else
        USE_DB="inventory.db"
    fi
fi

if [ -f "prisma/dev.db" ]; then
    if command -v sqlite3 &> /dev/null; then
        TABLE_COUNT=$(sqlite3 prisma/dev.db "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';" 2>/dev/null || echo "0")
        if [ "$TABLE_COUNT" -gt 0 ]; then
            print_status "dev.db exists with $TABLE_COUNT tables"
            if [ -z "$USE_DB" ]; then
                USE_DB="dev.db"
            fi
        fi
    fi
fi

# Use inventory.db if it has tables, otherwise use dev.db
if [ -z "$USE_DB" ]; then
    if [ -f "prisma/inventory.db" ]; then
        USE_DB="inventory.db"
    elif [ -f "prisma/dev.db" ]; then
        USE_DB="dev.db"
    else
        print_error "No database file found!"
        exit 1
    fi
fi

print_info "Using database: $USE_DB"

# Step 2: Update .env file
echo ""
echo "Step 2: Updating .env file..."
if [ ! -f ".env" ]; then
    print_info "Creating .env file..."
    cat > .env << ENVEOF
DATABASE_URL="file:./prisma/$USE_DB"
PORT=3001
NODE_ENV=production
CORS_ORIGIN=http://103.60.12.157
ENVEOF
    print_status ".env file created"
else
    # Update DATABASE_URL
    sed -i "s|DATABASE_URL=.*|DATABASE_URL=\"file:./prisma/$USE_DB\"|" .env
    print_status ".env file updated to use $USE_DB"
fi

# Show current .env
echo ""
echo "Current DATABASE_URL:"
grep DATABASE_URL .env

# Step 3: Restart backend
echo ""
echo "Step 3: Restarting backend..."
pm2 restart backend > /dev/null 2>&1 || pm2 start dist/server.js --name "backend" > /dev/null 2>&1
sleep 3
print_status "Backend restarted"

# Step 4: Check backend status
echo ""
echo "Step 4: Checking backend status..."
sleep 2
if pm2 list | grep -q "backend"; then
    PM2_STATUS=$(pm2 list | grep "backend" | awk '{print $10}' | head -1)
    if [ "$PM2_STATUS" = "online" ]; then
        print_status "Backend is online"
    else
        print_warning "Backend status: $PM2_STATUS"
    fi
fi

# Step 5: Test backend
echo ""
echo "Step 5: Testing backend..."
sleep 2
if command -v curl &> /dev/null; then
    if curl -s -f http://localhost:3001/health > /dev/null 2>&1; then
        print_status "Backend is responding"
        curl -s http://localhost:3001/health | head -3
    else
        print_warning "Backend not responding"
    fi
fi

# Step 6: Check backend logs for database errors
echo ""
echo "Step 6: Checking for database errors..."
sleep 2
ERROR_COUNT=$(pm2 logs backend --lines 30 --nostream 2>&1 | grep -i "table.*does not exist" | wc -l || echo "0")

if [ "$ERROR_COUNT" -eq 0 ]; then
    print_status "No database errors found"
else
    print_warning "Found $ERROR_COUNT database errors"
    print_info "Recent errors:"
    pm2 logs backend --lines 20 --nostream 2>&1 | grep -i "table.*does not exist" | head -3
fi

# Save PM2
pm2 save > /dev/null 2>&1 || true

echo ""
echo "=========================================="
echo -e "${GREEN}  Complete!${NC}"
echo "=========================================="
echo ""
echo "Database: $USE_DB"
echo "Backend should now be using the correct database"
echo ""

