#!/bin/bash

# Final Database Fix Script - Handles path and permission issues

set +e

echo "=========================================="
echo "  Final Database Fix Script"
echo "=========================================="

# Colors
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

# Step 1: Navigate to backend
echo ""
echo "Step 1: Navigating to backend..."
cd $BACKEND_DIR || exit 1
print_status "In $BACKEND_DIR"

# Step 2: Stop backend
echo ""
echo "Step 2: Stopping backend..."
pm2 stop backend > /dev/null 2>&1 || true
sleep 2
print_status "Backend stopped"

# Step 3: Check and fix .env file
echo ""
echo "Step 3: Checking .env file..."
if [ ! -f ".env" ]; then
    print_info "Creating .env file..."
    cat > .env << 'ENVEOF'
DATABASE_URL="file:./prisma/inventory.db"
PORT=3001
NODE_ENV=production
CORS_ORIGIN=http://103.60.12.157
ENVEOF
    print_status ".env file created"
else
    print_info "Updating DATABASE_URL in .env..."
    # Update DATABASE_URL to use absolute path
    sed -i 's|DATABASE_URL=.*|DATABASE_URL="file:'"$BACKEND_DIR"'/prisma/inventory.db"|' .env || \
    sed -i 's|DATABASE_URL=.*|DATABASE_URL="file:./prisma/inventory.db"|' .env
    print_status ".env file updated"
fi

# Show current DATABASE_URL
CURRENT_DB_URL=$(grep DATABASE_URL .env | cut -d'=' -f2 | tr -d '"' || echo "")
print_info "Current DATABASE_URL: $CURRENT_DB_URL"

# Step 4: Create prisma directory
echo ""
echo "Step 4: Ensuring prisma directory exists..."
mkdir -p prisma
chmod 755 prisma
print_status "Prisma directory ready"

# Step 5: Remove old database files
echo ""
echo "Step 5: Removing old database files..."
rm -f prisma/dev.db prisma/dev.db-journal prisma/inventory.db prisma/inventory.db-journal 2>/dev/null || true
rm -f prisma/*.db prisma/*.db-journal 2>/dev/null || true
print_status "Old database files removed"

# Step 6: Update .env to use inventory.db
echo ""
echo "Step 6: Setting correct database path..."
# Use relative path that Prisma can handle
sed -i 's|DATABASE_URL=.*|DATABASE_URL="file:./prisma/inventory.db"|' .env
print_status "Database path set to: file:./prisma/inventory.db"

# Step 7: Verify schema exists
echo ""
echo "Step 7: Verifying Prisma schema..."
if [ ! -f "prisma/schema.prisma" ]; then
    print_error "Prisma schema not found!"
    exit 1
fi
MODEL_COUNT=$(grep -c "^model " prisma/schema.prisma 2>/dev/null || echo "0")
print_info "Found $MODEL_COUNT models in schema"

# Step 8: Create database using db push with explicit path
echo ""
echo "Step 8: Creating database tables..."
print_info "Using db push to create all tables..."

# Try db push
if npx prisma db push --accept-data-loss --skip-generate 2>&1 | tee /tmp/prisma-output.log; then
    print_status "db push command completed"
else
    print_warning "db push had issues, checking output..."
    cat /tmp/prisma-output.log | tail -10
fi

# Step 9: Check if database file was created
echo ""
echo "Step 9: Checking for database file..."
sleep 1

# Check for any .db file in prisma directory
DB_FILE=$(find prisma -name "*.db" -type f 2>/dev/null | head -1)

if [ -n "$DB_FILE" ]; then
    print_status "Database file found: $DB_FILE"
    DB_SIZE=$(stat -c%s "$DB_FILE" 2>/dev/null || stat -f%z "$DB_FILE" 2>/dev/null || echo "0")
    print_info "Database size: $DB_SIZE bytes"
    
    # Check tables
    if command -v sqlite3 &> /dev/null; then
        TABLE_COUNT=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';" 2>/dev/null || echo "0")
        if [ "$TABLE_COUNT" -gt 0 ]; then
            print_status "Database has $TABLE_COUNT tables"
        else
            print_warning "Database exists but has no tables"
        fi
    fi
else
    print_warning "No database file found, trying to create manually..."
    
    # Create database file manually
    touch prisma/inventory.db
    chmod 666 prisma/inventory.db
    
    # Try db push again
    print_info "Retrying db push..."
    npx prisma db push --accept-data-loss --skip-generate > /dev/null 2>&1
    
    if [ -f "prisma/inventory.db" ]; then
        DB_SIZE=$(stat -c%s prisma/inventory.db 2>/dev/null || stat -f%z prisma/inventory.db 2>/dev/null || echo "0")
        if [ "$DB_SIZE" -gt 1000 ]; then
            print_status "Database file created: prisma/inventory.db"
        else
            print_warning "Database file is too small"
        fi
    fi
fi

# Step 10: Update .env to match actual database file
echo ""
echo "Step 10: Updating .env to match database file..."
if [ -f "prisma/inventory.db" ]; then
    sed -i 's|DATABASE_URL=.*|DATABASE_URL="file:./prisma/inventory.db"|' .env
    print_status ".env updated to use inventory.db"
elif [ -f "prisma/dev.db" ]; then
    sed -i 's|DATABASE_URL=.*|DATABASE_URL="file:./prisma/dev.db"|' .env
    print_status ".env updated to use dev.db"
fi

# Step 11: Generate Prisma client
echo ""
echo "Step 11: Generating Prisma client..."
if npx prisma generate > /dev/null 2>&1; then
    print_status "Prisma client generated"
else
    print_error "Failed to generate Prisma client"
    exit 1
fi

# Step 12: Final verification
echo ""
echo "Step 12: Final database verification..."
DB_FILE=$(find prisma -name "*.db" -type f 2>/dev/null | head -1)

if [ -n "$DB_FILE" ] && [ -f "$DB_FILE" ]; then
    if command -v sqlite3 &> /dev/null; then
        TABLE_COUNT=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';" 2>/dev/null || echo "0")
        if [ "$TABLE_COUNT" -gt 0 ]; then
            print_status "✓ SUCCESS: Database has $TABLE_COUNT tables"
            echo ""
            echo "Tables in database:"
            sqlite3 "$DB_FILE" "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;" 2>/dev/null | head -20 | while read table; do
                echo "  - $table"
            done
        else
            print_error "Database file exists but has no tables"
            print_info "Trying one more db push..."
            npx prisma db push --accept-data-loss --skip-generate
            exit 1
        fi
    else
        DB_SIZE=$(stat -c%s "$DB_FILE" 2>/dev/null || stat -f%z "$DB_FILE" 2>/dev/null || echo "0")
        if [ "$DB_SIZE" -gt 1000 ]; then
            print_status "✓ Database file exists: $DB_FILE (size: $DB_SIZE bytes)"
        else
            print_error "Database file is too small"
            exit 1
        fi
    fi
else
    print_error "No database file found after all attempts"
    print_info "Listing prisma directory:"
    ls -la prisma/
    exit 1
fi

# Step 13: Restart backend
echo ""
echo "Step 13: Restarting backend..."
pm2 restart backend > /dev/null 2>&1 || pm2 start npm --name "backend" -- start > /dev/null 2>&1
sleep 3
print_status "Backend restarted"

# Step 14: Check backend status
echo ""
echo "Step 14: Checking backend status..."
sleep 2
if pm2 list | grep -q "backend"; then
    PM2_STATUS=$(pm2 list | grep "backend" | awk '{print $10}' | head -1)
    if [ "$PM2_STATUS" = "online" ]; then
        print_status "Backend is online"
    else
        print_warning "Backend status: $PM2_STATUS"
    fi
fi

# Final summary
echo ""
echo "=========================================="
echo -e "${GREEN}  Database Fix Complete!${NC}"
echo "=========================================="
echo ""
echo "Database file: $DB_FILE"
if command -v sqlite3 &> /dev/null; then
    TABLE_COUNT=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';" 2>/dev/null || echo "0")
    echo "Tables: $TABLE_COUNT"
fi
echo ""
echo "Check backend logs: pm2 logs backend"
echo ""

