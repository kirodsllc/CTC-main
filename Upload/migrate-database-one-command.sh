#!/bin/bash

# One-Command Database Migration
# This script imports database data from SQL file to server

set +e

echo "=========================================="
echo "  Database Migration - One Command"
echo "=========================================="
echo ""

BACKEND_DIR="/var/www/nextapp/backend"
DB_FILE="$BACKEND_DIR/prisma/inventory.db"
UPLOAD_DIR="/var/www/Upload"

# Find SQL file
SQL_FILE=""
if [ -f "/var/www/Upload/database-export/import-all-data.sql" ]; then
    SQL_FILE="/var/www/Upload/database-export/import-all-data.sql"
elif [ -f "/var/www/Upload/import-all-data.sql" ]; then
    SQL_FILE="/var/www/Upload/import-all-data.sql"
elif [ -f "./import-all-data.sql" ]; then
    SQL_FILE="./import-all-data.sql"
else
    echo "[✗] SQL file not found!"
    echo "[!] Please upload import-all-data.sql to /var/www/Upload/"
    exit 1
fi

echo "[✓] Found SQL file: $SQL_FILE"

# Step 1: Stop backend
echo ""
echo "Step 1: Stopping backend..."
pm2 stop backend > /dev/null 2>&1 || true
pm2 delete backend > /dev/null 2>&1 || true
sleep 3

# Step 2: Backup
echo ""
echo "Step 2: Backing up database..."
BACKUP_FILE="$BACKEND_DIR/prisma/inventory.db.backup.$(date +%Y%m%d_%H%M%S)"
cp "$DB_FILE" "$BACKUP_FILE" 2>/dev/null || true
echo "[✓] Backup: $BACKUP_FILE"

# Step 3: Import
echo ""
echo "Step 3: Importing data..."
cd "$BACKEND_DIR" || exit 1
if sqlite3 "$DB_FILE" < "$SQL_FILE" 2>&1; then
    echo "[✓] Data imported successfully"
else
    echo "[✗] Import failed, restoring backup..."
    cp "$BACKUP_FILE" "$DB_FILE" 2>/dev/null || true
    exit 1
fi

# Step 4: Regenerate Prisma
echo ""
echo "Step 4: Regenerating Prisma client..."
rm -rf node_modules/.prisma node_modules/@prisma/client 2>/dev/null || true
npx prisma generate > /dev/null 2>&1
echo "[✓] Prisma client regenerated"

# Step 5: Start backend
echo ""
echo "Step 5: Starting backend..."
pm2 start dist/server.js --name "backend" > /dev/null 2>&1
sleep 5
echo "[✓] Backend started"

# Step 6: Verify
echo ""
echo "Step 6: Verifying..."
sleep 2
PARTS_COUNT=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM Part;" 2>/dev/null || echo "0")
USERS_COUNT=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM User;" 2>/dev/null || echo "0")
echo "[✓] Parts: $PARTS_COUNT, Users: $USERS_COUNT"

pm2 save > /dev/null 2>&1 || true

echo ""
echo "=========================================="
echo "  Migration Complete!"
echo "=========================================="
pm2 list | grep backend

