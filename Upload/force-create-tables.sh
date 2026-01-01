#!/bin/bash

# Force Create Tables Script
# This script forces Prisma to actually create all tables

set +e

echo "=========================================="
echo "  Force Create Tables Script"
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

# Stop backend
pm2 stop backend > /dev/null 2>&1 || true
sleep 2

# Remove database completely
echo ""
echo "Removing database file..."
rm -f prisma/inventory.db prisma/inventory.db-journal
print_status "Database removed"

# Update .env to use absolute path
echo ""
echo "Updating .env with absolute path..."
ABSOLUTE_DB_PATH="$BACKEND_DIR/prisma/inventory.db"
sed -i "s|DATABASE_URL=.*|DATABASE_URL=\"file:$ABSOLUTE_DB_PATH\"|" .env
print_status "Updated DATABASE_URL to: file:$ABSOLUTE_DB_PATH"

# Show current .env
echo ""
echo "Current DATABASE_URL:"
grep DATABASE_URL .env

# Try db push with force reset
echo ""
echo "Creating database with force reset..."
npx prisma db push --force-reset --skip-generate

# Check database
echo ""
echo "Checking database..."
sleep 2

if [ -f "prisma/inventory.db" ]; then
    DB_SIZE=$(stat -c%s prisma/inventory.db 2>/dev/null || stat -f%z prisma/inventory.db 2>/dev/null || echo "0")
    print_info "Database size: $DB_SIZE bytes"
    
    if command -v sqlite3 &> /dev/null; then
        TABLE_COUNT=$(sqlite3 prisma/inventory.db "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';" 2>/dev/null || echo "0")
        print_info "Table count: $TABLE_COUNT"
        
        if [ "$TABLE_COUNT" -eq 0 ]; then
            print_warning "No tables found, trying alternative method..."
            
            # Try using migrate dev instead
            echo ""
            echo "Trying migrate dev method..."
            rm -f prisma/inventory.db prisma/inventory.db-journal
            
            # Change back to relative path for migrate
            sed -i 's|DATABASE_URL=.*|DATABASE_URL="file:./prisma/inventory.db"|' .env
            
            # Create migration
            npx prisma migrate dev --name init --create-only --skip-seed > /dev/null 2>&1
            
            # Apply migration
            if [ -d "prisma/migrations" ]; then
                LATEST_MIGRATION=$(ls -t prisma/migrations | head -1)
                if [ -n "$LATEST_MIGRATION" ] && [ -f "prisma/migrations/$LATEST_MIGRATION/migration.sql" ]; then
                    print_info "Found migration: $LATEST_MIGRATION"
                    # Apply migration manually using sqlite3
                    sqlite3 prisma/inventory.db < "prisma/migrations/$LATEST_MIGRATION/migration.sql" 2>&1
                fi
            fi
            
            # Try db push again
            npx prisma db push --accept-data-loss --skip-generate
            
            # Check again
            sleep 1
            TABLE_COUNT=$(sqlite3 prisma/inventory.db "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';" 2>/dev/null || echo "0")
            
            if [ "$TABLE_COUNT" -gt 0 ]; then
                print_status "Tables created: $TABLE_COUNT"
            else
                print_error "Still no tables. Checking Prisma output..."
                
                # Try one more time with verbose output
                echo ""
                echo "Final attempt with verbose output:"
                npx prisma db push --accept-data-loss 2>&1 | head -20
                
                sleep 1
                TABLE_COUNT=$(sqlite3 prisma/inventory.db "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';" 2>/dev/null || echo "0")
                
                if [ "$TABLE_COUNT" -gt 0 ]; then
                    print_status "Success! Tables created: $TABLE_COUNT"
                else
                    print_error "Failed to create tables"
                    print_info "Listing database file:"
                    ls -lh prisma/inventory.db
                    print_info "Trying to read database directly:"
                    sqlite3 prisma/inventory.db ".tables" 2>&1 || echo "Cannot read database"
                    exit 1
                fi
            fi
        else
            print_status "SUCCESS! Database has $TABLE_COUNT tables"
        fi
        
        # Show tables
        if [ "$TABLE_COUNT" -gt 0 ]; then
            echo ""
            echo "Tables in database:"
            sqlite3 prisma/inventory.db "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;" 2>/dev/null | head -20 | while read table; do
                echo "  - $table"
            done
        fi
    else
        if [ "$DB_SIZE" -gt 1000 ]; then
            print_status "Database file exists and has content"
        else
            print_warning "Database file is very small ($DB_SIZE bytes)"
        fi
    fi
else
    print_error "Database file was not created!"
    exit 1
fi

# Generate Prisma client
echo ""
echo "Generating Prisma client..."
npx prisma generate > /dev/null 2>&1
print_status "Prisma client generated"

# Update .env back to relative path
sed -i 's|DATABASE_URL=.*|DATABASE_URL="file:./prisma/inventory.db"|' .env

# Restart backend
echo ""
echo "Restarting backend..."
pm2 restart backend > /dev/null 2>&1 || pm2 start npm --name "backend" -- start > /dev/null 2>&1
sleep 3
print_status "Backend restarted"

echo ""
echo "=========================================="
echo -e "${GREEN}  Complete!${NC}"
echo "=========================================="
echo ""

