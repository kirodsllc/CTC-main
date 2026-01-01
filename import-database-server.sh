#!/bin/bash

# Import Database Data to Server
# Run this on the SERVER after uploading the export files

set +e

echo "=========================================="
echo "  Import Database Data to Server"
echo "=========================================="
echo ""

BACKEND_DIR="/var/www/nextapp/backend"
DB_FILE="$BACKEND_DIR/prisma/inventory.db"
UPLOAD_DIR="/var/www/Upload"

# Check for SQL file in current directory or Upload directory
SQL_FILE=""
if [ -f "./import-all-data.sql" ]; then
    SQL_FILE="./import-all-data.sql"
elif [ -f "$UPLOAD_DIR/import-all-data.sql" ]; then
    SQL_FILE="$UPLOAD_DIR/import-all-data.sql"
elif [ -f "./database-export/import-all-data.sql" ]; then
    SQL_FILE="./database-export/import-all-data.sql"
else
    echo "[✗] SQL file not found!"
    echo "[!] Looking for: import-all-data.sql"
    echo "[!] Searched in:"
    echo "    - Current directory"
    echo "    - $UPLOAD_DIR"
    echo "    - ./database-export/"
    echo ""
    echo "Please upload the database export files first."
    exit 1
fi

echo "[✓] Found SQL file: $SQL_FILE"

if [ ! -f "$DB_FILE" ]; then
    echo "[✗] Database file not found: $DB_FILE"
    exit 1
fi

echo "[✓] Found database: $DB_FILE"

# Step 1: Stop backend
echo ""
echo "Step 1: Stopping backend..."
pm2 stop backend > /dev/null 2>&1 || true
pm2 delete backend > /dev/null 2>&1 || true
sleep 3
echo "[✓] Backend stopped"

# Step 2: Backup current database
echo ""
echo "Step 2: Backing up current database..."
BACKUP_FILE="$BACKEND_DIR/prisma/inventory.db.backup.$(date +%Y%m%d_%H%M%S)"
cp "$DB_FILE" "$BACKUP_FILE" 2>/dev/null || true
if [ -f "$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "[✓] Backup created: $BACKUP_FILE ($BACKUP_SIZE)"
else
    echo "[!] Could not create backup"
fi

# Step 3: Get current row counts (for comparison)
echo ""
echo "Step 3: Checking current database state..."
if command -v sqlite3 &> /dev/null; then
    CURRENT_PARTS=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM Part;" 2>/dev/null || echo "0")
    CURRENT_USERS=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM User;" 2>/dev/null || echo "0")
    echo "[i] Current data:"
    echo "    Parts: $CURRENT_PARTS"
    echo "    Users: $CURRENT_USERS"
fi

# Step 4: Clear existing data (optional - comment out if you want to merge)
echo ""
echo "Step 4: Preparing database..."
read -p "Do you want to clear existing data before import? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "[!] Clearing existing data..."
    # Get list of tables and delete data
    TABLES=$(sqlite3 "$DB_FILE" "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_%';" 2>/dev/null)
    for table in $TABLES; do
        sqlite3 "$DB_FILE" "DELETE FROM \"$table\";" 2>/dev/null || true
    done
    echo "[✓] Existing data cleared"
else
    echo "[i] Keeping existing data (will try to insert, may cause duplicates)"
fi

# Step 5: Import data
echo ""
echo "Step 5: Importing data..."
echo "[i] This may take a while depending on data size..."

# Create a temporary import script that handles errors
TEMP_IMPORT="/tmp/import-data.sql"
cat > "$TEMP_IMPORT" << 'TEMPEOF'
-- Disable foreign key checks temporarily
PRAGMA foreign_keys = OFF;
TEMPEOF

cat "$SQL_FILE" >> "$TEMP_IMPORT"

cat >> "$TEMP_IMPORT" << 'TEMPEOF'
-- Re-enable foreign key checks
PRAGMA foreign_keys = ON;
TEMPEOF

if sqlite3 "$DB_FILE" < "$TEMP_IMPORT" 2>&1 | tee /tmp/import-errors.log; then
    ERROR_COUNT=$(grep -i "error\|constraint\|unique" /tmp/import-errors.log | wc -l || echo "0")
    if [ "$ERROR_COUNT" -gt 0 ]; then
        echo "[!] Import completed with $ERROR_COUNT warnings/errors"
        echo "[i] Check /tmp/import-errors.log for details"
        tail -20 /tmp/import-errors.log
    else
        echo "[✓] Data imported successfully"
    fi
else
    echo "[✗] Import failed"
    echo "[!] Check /tmp/import-errors.log for details"
    tail -20 /tmp/import-errors.log
    echo ""
    read -p "Do you want to restore backup? (Y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]] && [ -f "$BACKUP_FILE" ]; then
        cp "$BACKUP_FILE" "$DB_FILE"
        echo "[✓] Backup restored"
    fi
    exit 1
fi

# Step 6: Verify import
echo ""
echo "Step 6: Verifying import..."
if command -v sqlite3 &> /dev/null; then
    NEW_PARTS=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM Part;" 2>/dev/null || echo "0")
    NEW_USERS=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM User;" 2>/dev/null || echo "0")
    TOTAL_TABLES=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';" 2>/dev/null || echo "0")
    
    echo "[✓] Import verification:"
    echo "    Total tables: $TOTAL_TABLES"
    echo "    Parts: $NEW_PARTS (was: $CURRENT_PARTS)"
    echo "    Users: $NEW_USERS (was: $CURRENT_USERS)"
fi

# Step 7: Regenerate Prisma client
echo ""
echo "Step 7: Regenerating Prisma client..."
cd "$BACKEND_DIR" || exit 1
rm -rf node_modules/.prisma node_modules/@prisma/client 2>/dev/null || true
if npx prisma generate > /dev/null 2>&1; then
    echo "[✓] Prisma client regenerated"
else
    echo "[✗] Failed to regenerate Prisma client"
fi

# Step 8: Start backend
echo ""
echo "Step 8: Starting backend..."
pm2 start dist/server.js --name "backend" > /dev/null 2>&1
sleep 5
echo "[✓] Backend started"

# Step 9: Test API
echo ""
echo "Step 9: Testing API..."
sleep 3
pm2 flush > /dev/null 2>&1 || true
sleep 1

if curl -s -f http://localhost:3001/health > /dev/null 2>&1; then
    echo "[✓] Backend health check passed"
    
    # Test parts API
    PARTS_RESPONSE=$(curl -s "http://localhost:3001/api/parts?limit=1" 2>&1)
    if echo "$PARTS_RESPONSE" | grep -qi "data\|\[\]"; then
        echo "[✓] Parts API is working"
    else
        echo "[!] Parts API response:"
        echo "$PARTS_RESPONSE" | head -3
    fi
else
    echo "[✗] Backend health check failed"
    pm2 logs backend --lines 10 --nostream 2>&1 | tail -10
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
echo "Database backup saved at: $BACKUP_FILE"
echo ""
echo "To verify data:"
echo "  sqlite3 $DB_FILE \"SELECT COUNT(*) FROM Part;\""
echo "  sqlite3 $DB_FILE \"SELECT COUNT(*) FROM User;\""
echo ""

