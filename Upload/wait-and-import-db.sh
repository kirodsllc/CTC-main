#!/bin/bash

# Wait for Database File and Import
set +e

echo "=========================================="
echo "  Wait and Import Database"
echo "=========================================="
echo ""

BACKEND_DIR="/var/www/nextapp/backend"
DB_FILE="$BACKEND_DIR/prisma/inventory.db"
UPLOAD_DIR="/var/www/Upload"

echo "Waiting for database file to be uploaded..."
echo "Looking for: dev.db or inventory.db in /var/www/Upload/"
echo ""
echo "To upload from your local machine, run this command on YOUR COMPUTER (not on server):"
echo ""
echo "  scp D:\\CTC-KSO\\admin-replicate-magic-main\\backend\\prisma\\dev.db root@103.60.12.157:/var/www/Upload/dev.db"
echo ""
echo "Or use FileZilla/WinSCP to upload the file."
echo ""
echo "Press Enter once you've uploaded the file, or Ctrl+C to cancel..."
read

echo ""
echo "Searching for database file..."
SOURCE_DB=""

# Check multiple locations
for loc in \
    "/var/www/Upload/dev.db" \
    "/var/www/Upload/inventory.db" \
    "/var/www/Upload/database-export/dev.db" \
    "/var/www/Upload/backend/prisma/dev.db" \
    "/var/www/Upload/backend/prisma/inventory.db"; do
    if [ -f "$loc" ]; then
        SOURCE_DB="$loc"
        break
    fi
done

# If still not found, search for any .db file
if [ -z "$SOURCE_DB" ]; then
    echo "Searching for any .db files..."
    FOUND_DB=$(find /var/www/Upload -name "*.db" -type f 2>/dev/null | head -1)
    if [ -n "$FOUND_DB" ]; then
        SOURCE_DB="$FOUND_DB"
    fi
fi

if [ -z "$SOURCE_DB" ]; then
    echo "[✗] Database file still not found!"
    echo ""
    echo "Current files in /var/www/Upload/:"
    ls -lah /var/www/Upload/ | grep -E "\.db|database" || ls -lah /var/www/Upload/ | head -20
    echo ""
    echo "Please upload the file and run this script again."
    exit 1
fi

echo "[✓] Found database file: $SOURCE_DB"
DB_SIZE=$(du -h "$SOURCE_DB" | cut -f1)
echo "[i] Database size: $DB_SIZE"
echo ""

# Step 1: Stop backend
echo "Step 1: Stopping backend..."
pm2 stop backend > /dev/null 2>&1 || true
pm2 delete backend > /dev/null 2>&1 || true
sleep 3
echo "[✓] Backend stopped"

# Step 2: Backup
echo ""
echo "Step 2: Backing up current database..."
if [ -f "$DB_FILE" ]; then
    BACKUP_FILE="$BACKEND_DIR/prisma/inventory.db.backup.$(date +%Y%m%d_%H%M%S)"
    cp "$DB_FILE" "$BACKUP_FILE" 2>/dev/null || true
    if [ -f "$BACKUP_FILE" ]; then
        echo "[✓] Backup created: $BACKUP_FILE"
    fi
else
    echo "[!] No existing database to backup"
fi

# Step 3: Copy database
echo ""
echo "Step 3: Copying database file..."
mkdir -p "$BACKEND_DIR/prisma" 2>/dev/null || true
cp "$SOURCE_DB" "$DB_FILE" 2>/dev/null || true

if [ -f "$DB_FILE" ]; then
    NEW_SIZE=$(du -h "$DB_FILE" | cut -f1)
    echo "[✓] Database file copied ($NEW_SIZE)"
else
    echo "[✗] Failed to copy database file"
    exit 1
fi

# Step 4: Verify
echo ""
echo "Step 4: Verifying database..."
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
fi

# Step 5: Regenerate Prisma
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

# Step 7: Test
echo ""
echo "Step 7: Testing backend..."
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

