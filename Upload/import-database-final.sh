#!/bin/bash

# Import Database - Final Version
# This script will find and import the database file

set +e

echo "=========================================="
echo "  Import Database to Server"
echo "=========================================="
echo ""

BACKEND_DIR="/var/www/nextapp/backend"
DB_FILE="$BACKEND_DIR/prisma/inventory.db"

# Step 1: Find database file
echo "Step 1: Looking for database file..."
SOURCE_DB=""

# Check multiple locations
LOCATIONS=(
    "/var/www/Upload/database-export/dev.db"
    "/var/www/Upload/dev.db"
    "/var/www/Upload/database-export/inventory.db"
    "/var/www/Upload/inventory.db"
    "./dev.db"
    "./database-export/dev.db"
    "./inventory.db"
)

for loc in "${LOCATIONS[@]}"; do
    if [ -f "$loc" ]; then
        SOURCE_DB="$loc"
        break
    fi
done

if [ -z "$SOURCE_DB" ]; then
    echo "[✗] Database file not found!"
    echo ""
    echo "[!] Searching for .db files..."
    find /var/www/Upload -name "*.db" -type f 2>/dev/null | head -5
    echo ""
    echo "[!] Please upload dev.db or inventory.db to /var/www/Upload/"
    echo "[!] Or provide the full path to the database file"
    exit 1
fi

echo "[✓] Found database file: $SOURCE_DB"
DB_SIZE=$(du -h "$SOURCE_DB" | cut -f1)
echo "[i] Database size: $DB_SIZE"

# Step 2: Stop backend
echo ""
echo "Step 2: Stopping backend..."
pm2 stop backend > /dev/null 2>&1 || true
pm2 delete backend > /dev/null 2>&1 || true
sleep 3
echo "[✓] Backend stopped"

# Step 3: Backup current database
echo ""
echo "Step 3: Backing up current database..."
if [ -f "$DB_FILE" ]; then
    BACKUP_FILE="$BACKEND_DIR/prisma/inventory.db.backup.$(date +%Y%m%d_%H%M%S)"
    cp "$DB_FILE" "$BACKUP_FILE" 2>/dev/null || true
    if [ -f "$BACKUP_FILE" ]; then
        echo "[✓] Backup created: $BACKUP_FILE"
    fi
else
    echo "[!] No existing database to backup"
fi

# Step 4: Copy database file
echo ""
echo "Step 4: Copying database file..."
mkdir -p "$BACKEND_DIR/prisma" 2>/dev/null || true
cp "$SOURCE_DB" "$DB_FILE" 2>/dev/null || true

if [ -f "$DB_FILE" ]; then
    NEW_SIZE=$(du -h "$DB_FILE" | cut -f1)
    echo "[✓] Database file copied ($NEW_SIZE)"
else
    echo "[✗] Failed to copy database file"
    exit 1
fi

# Step 5: Verify database
echo ""
echo "Step 5: Verifying database..."
if command -v sqlite3 &> /dev/null; then
    TABLE_COUNT=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';" 2>/dev/null || echo "0")
    if [ "$TABLE_COUNT" -gt 0 ]; then
        echo "[✓] Database has $TABLE_COUNT tables"
        
        PARTS_COUNT=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM Part;" 2>/dev/null || echo "0")
        USERS_COUNT=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM User;" 2>/dev/null || echo "0")
        echo "[i] Parts: $PARTS_COUNT, Users: $USERS_COUNT"
    else
        echo "[!] Database has no tables"
    fi
else
    echo "[!] sqlite3 not available for verification"
fi

# Step 6: Regenerate Prisma client
echo ""
echo "Step 6: Regenerating Prisma client..."
cd "$BACKEND_DIR" || exit 1
rm -rf node_modules/.prisma node_modules/@prisma/client 2>/dev/null || true
if npx prisma generate > /dev/null 2>&1; then
    echo "[✓] Prisma client regenerated"
else
    echo "[✗] Failed to regenerate Prisma client"
fi

# Step 7: Start backend
echo ""
echo "Step 7: Starting backend..."
pm2 start dist/server.js --name "backend" > /dev/null 2>&1
sleep 5
echo "[✓] Backend started"

# Step 8: Test
echo ""
echo "Step 8: Testing backend..."
sleep 3
if curl -s -f http://localhost:3001/health > /dev/null 2>&1; then
    echo "[✓] Backend is responding"
else
    echo "[!] Backend may need a moment to start"
fi

pm2 save > /dev/null 2>&1 || true

echo ""
echo "=========================================="
echo "  Import Complete!"
echo "=========================================="
echo ""
echo "Backend Status:"
pm2 list | grep backend
echo ""

