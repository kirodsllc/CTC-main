#!/bin/bash

# Find and Import Database
set +e

echo "=========================================="
echo "  Find and Import Database"
echo "=========================================="
echo ""

echo "Step 1: Checking Upload directory..."
ls -lah /var/www/Upload/ | head -20
echo ""

echo "Step 2: Searching for database files..."
find /var/www/Upload -name "*.db" -type f 2>/dev/null
echo ""

echo "Step 3: Searching in subdirectories..."
find /var/www/Upload -type f -name "*.db" -o -name "*database*" -o -name "*export*" 2>/dev/null | head -10
echo ""

# Try to find the file
SOURCE_DB=""
BACKEND_DIR="/var/www/nextapp/backend"
DB_FILE="$BACKEND_DIR/prisma/inventory.db"

# Search more thoroughly
for file in $(find /var/www/Upload -type f 2>/dev/null); do
    if [[ "$file" == *.db ]] || [[ "$file" == *database* ]] || [[ "$(file "$file" 2>/dev/null | grep -i sqlite)" != "" ]]; then
        if [ -f "$file" ]; then
            SIZE=$(du -h "$file" | cut -f1)
            echo "[!] Found potential database: $file ($SIZE)"
            SOURCE_DB="$file"
            break
        fi
    fi
done

if [ -z "$SOURCE_DB" ]; then
    echo "[✗] No database file found!"
    echo ""
    echo "[!] Please check:"
    echo "  1. Is the file uploaded to /var/www/Upload/?"
    echo "  2. What is the exact filename?"
    echo ""
    echo "Listing all files in Upload:"
    ls -lah /var/www/Upload/ 2>/dev/null | tail -20
    exit 1
fi

echo ""
echo "[✓] Using database file: $SOURCE_DB"
echo ""

# Import
echo "Step 4: Stopping backend..."
pm2 stop backend > /dev/null 2>&1 || true
pm2 delete backend > /dev/null 2>&1 || true
sleep 3

echo ""
echo "Step 5: Backing up current database..."
if [ -f "$DB_FILE" ]; then
    BACKUP="$BACKEND_DIR/prisma/inventory.db.backup.$(date +%Y%m%d_%H%M%S)"
    cp "$DB_FILE" "$BACKUP" 2>/dev/null || true
    echo "[✓] Backup: $BACKUP"
fi

echo ""
echo "Step 6: Copying database..."
mkdir -p "$BACKEND_DIR/prisma" 2>/dev/null || true
cp "$SOURCE_DB" "$DB_FILE" 2>/dev/null || true

if [ -f "$DB_FILE" ]; then
    DB_SIZE=$(du -h "$DB_FILE" | cut -f1)
    echo "[✓] Database copied ($DB_SIZE)"
    
    if command -v sqlite3 &> /dev/null; then
        TABLE_COUNT=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';" 2>/dev/null || echo "0")
        PARTS_COUNT=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM Part;" 2>/dev/null || echo "0")
        echo "[i] Tables: $TABLE_COUNT, Parts: $PARTS_COUNT"
    fi
else
    echo "[✗] Failed to copy database"
    exit 1
fi

echo ""
echo "Step 7: Regenerating Prisma client..."
cd "$BACKEND_DIR" || exit 1
rm -rf node_modules/.prisma node_modules/@prisma/client 2>/dev/null || true
npx prisma generate > /dev/null 2>&1
echo "[✓] Prisma client regenerated"

echo ""
echo "Step 8: Starting backend..."
pm2 start dist/server.js --name "backend" > /dev/null 2>&1
sleep 5
echo "[✓] Backend started"

pm2 save > /dev/null 2>&1 || true

echo ""
echo "=========================================="
echo "  Import Complete!"
echo "=========================================="
pm2 list | grep backend

