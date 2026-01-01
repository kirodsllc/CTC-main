#!/bin/bash

# Import Database from Database File
# This script replaces the server database with the local database file

set +e

echo "=========================================="
echo "  Import Database from File"
echo "=========================================="
echo ""

BACKEND_DIR="/var/www/nextapp/backend"
DB_FILE="$BACKEND_DIR/prisma/inventory.db"
UPLOAD_DIR="/var/www/Upload"

# Find database file
SOURCE_DB=""
if [ -f "/var/www/Upload/database-export/dev.db" ]; then
    SOURCE_DB="/var/www/Upload/database-export/dev.db"
elif [ -f "/var/www/Upload/dev.db" ]; then
    SOURCE_DB="/var/www/Upload/dev.db"
elif [ -f "./dev.db" ]; then
    SOURCE_DB="./dev.db"
else
    echo "[✗] Database file (dev.db) not found!"
    echo "[!] Please upload dev.db to /var/www/Upload/"
    ls -la /var/www/Upload/ | grep -i "\.db"
    exit 1
fi

echo "[✓] Found database file: $SOURCE_DB"

# Step 1: Stop backend
echo ""
echo "Step 1: Stopping backend..."
pm2 stop backend > /dev/null 2>&1 || true
pm2 delete backend > /dev/null 2>&1 || true
sleep 3

# Step 2: Backup current database
echo ""
echo "Step 2: Backing up current database..."
BACKUP_FILE="$BACKEND_DIR/prisma/inventory.db.backup.$(date +%Y%m%d_%H%M%S)"
if [ -f "$DB_FILE" ]; then
    cp "$DB_FILE" "$BACKUP_FILE" 2>/dev/null || true
    echo "[✓] Backup created: $BACKUP_FILE"
else
    echo "[!] No existing database to backup"
fi

# Step 3: Copy database file
echo ""
echo "Step 3: Copying database file..."
cp "$SOURCE_DB" "$DB_FILE" 2>/dev/null || true
if [ -f "$DB_FILE" ]; then
    DB_SIZE=$(du -h "$DB_FILE" | cut -f1)
    echo "[✓] Database file copied ($DB_SIZE)"
else
    echo "[✗] Failed to copy database file"
    exit 1
fi

# Step 4: Verify tables
echo ""
echo "Step 4: Verifying database..."
if command -v sqlite3 &> /dev/null; then
    TABLE_COUNT=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';" 2>/dev/null || echo "0")
    PARTS_COUNT=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM Part;" 2>/dev/null || echo "0")
    USERS_COUNT=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM User;" 2>/dev/null || echo "0")
    echo "[✓] Tables: $TABLE_COUNT, Parts: $PARTS_COUNT, Users: $USERS_COUNT"
fi

# Step 5: Regenerate Prisma client
echo ""
echo "Step 5: Regenerating Prisma client..."
cd "$BACKEND_DIR" || exit 1
rm -rf node_modules/.prisma node_modules/@prisma/client 2>/dev/null || true
if npx prisma generate > /dev/null 2>&1; then
    echo "[✓] Prisma client regenerated"
else
    echo "[✗] Failed to regenerate Prisma client"
fi

# Step 6: Start backend
echo ""
echo "Step 6: Starting backend..."
pm2 start dist/server.js --name "backend" > /dev/null 2>&1
sleep 5
echo "[✓] Backend started"

pm2 save > /dev/null 2>&1 || true

echo ""
echo "=========================================="
echo "  Import Complete!"
echo "=========================================="
pm2 list | grep backend

