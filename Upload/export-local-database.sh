#!/bin/bash

# Export Local Database to SQL Migration Files
# Run this on your LOCAL machine

set +e

echo "=========================================="
echo "  Export Local Database Data"
echo "=========================================="
echo ""

BACKEND_DIR="./backend"
EXPORT_DIR="./database-export"
DB_FILE="$BACKEND_DIR/prisma/inventory.db"

if [ ! -f "$DB_FILE" ]; then
    echo "[✗] Database file not found: $DB_FILE"
    echo "[!] Trying dev.db..."
    DB_FILE="$BACKEND_DIR/prisma/dev.db"
    if [ ! -f "$DB_FILE" ]; then
        echo "[✗] Database file not found: $DB_FILE"
        exit 1
    fi
fi

echo "[✓] Found database: $DB_FILE"

# Create export directory
mkdir -p "$EXPORT_DIR"
echo "[✓] Created export directory: $EXPORT_DIR"

# Get all tables
echo ""
echo "Step 1: Getting list of tables..."
TABLES=$(sqlite3 "$DB_FILE" "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_%' ORDER BY name;" 2>/dev/null)

if [ -z "$TABLES" ]; then
    echo "[✗] No tables found in database"
    exit 1
fi

TABLE_COUNT=$(echo "$TABLES" | wc -l | tr -d ' ')
echo "[✓] Found $TABLE_COUNT tables"

# Create master SQL file
MASTER_SQL="$EXPORT_DIR/import-all-data.sql"
echo "-- Database Migration: Import All Data" > "$MASTER_SQL"
echo "-- Generated: $(date)" >> "$MASTER_SQL"
echo "-- Source: $DB_FILE" >> "$MASTER_SQL"
echo "" >> "$MASTER_SQL"
echo "BEGIN TRANSACTION;" >> "$MASTER_SQL"
echo "" >> "$MASTER_SQL"

# Export each table
echo ""
echo "Step 2: Exporting table data..."
EXPORTED_COUNT=0

for table in $TABLES; do
    echo "[i] Exporting: $table"
    
    # Get row count
    ROW_COUNT=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM \"$table\";" 2>/dev/null || echo "0")
    
    if [ "$ROW_COUNT" -gt 0 ]; then
        # Create individual table SQL file
        TABLE_SQL="$EXPORT_DIR/${table}.sql"
        
        echo "-- Table: $table" >> "$MASTER_SQL"
        echo "-- Rows: $ROW_COUNT" >> "$MASTER_SQL"
        
        # Export data with INSERT statements
        sqlite3 "$DB_FILE" << EOF > "$TABLE_SQL"
.mode insert $table
SELECT * FROM "$table";
EOF
        
        # Add to master SQL file
        echo "" >> "$MASTER_SQL"
        cat "$TABLE_SQL" >> "$MASTER_SQL"
        echo "" >> "$MASTER_SQL"
        
        echo "  [✓] Exported $ROW_COUNT rows"
        EXPORTED_COUNT=$((EXPORTED_COUNT + 1))
    else
        echo "  [!] Table is empty, skipping"
    fi
done

echo "" >> "$MASTER_SQL"
echo "COMMIT;" >> "$MASTER_SQL"

echo ""
echo "Step 3: Creating import script..."
cat > "$EXPORT_DIR/import-to-server.sh" << 'IMPORTEOF'
#!/bin/bash

# Import Database Data to Server
# Run this on the SERVER

set +e

echo "=========================================="
echo "  Import Database Data to Server"
echo "=========================================="
echo ""

BACKEND_DIR="/var/www/nextapp/backend"
DB_FILE="$BACKEND_DIR/prisma/inventory.db"

if [ ! -f "$DB_FILE" ]; then
    echo "[✗] Database file not found: $DB_FILE"
    exit 1
fi

echo "[✓] Found database: $DB_FILE"

# Step 1: Stop backend
echo ""
echo "Step 1: Stopping backend..."
pm2 stop backend > /dev/null 2>&1 || true
sleep 2
echo "[✓] Backend stopped"

# Step 2: Backup current database
echo ""
echo "Step 2: Backing up current database..."
BACKUP_FILE="$BACKEND_DIR/prisma/inventory.db.backup.$(date +%Y%m%d_%H%M%S)"
cp "$DB_FILE" "$BACKUP_FILE" 2>/dev/null || true
if [ -f "$BACKUP_FILE" ]; then
    echo "[✓] Backup created: $BACKUP_FILE"
else
    echo "[!] Could not create backup"
fi

# Step 3: Check if SQL file exists
SQL_FILE="./import-all-data.sql"
if [ ! -f "$SQL_FILE" ]; then
    echo "[✗] SQL file not found: $SQL_FILE"
    echo "[!] Make sure you're in the directory containing import-all-data.sql"
    exit 1
fi

echo "[✓] Found SQL file: $SQL_FILE"

# Step 4: Import data
echo ""
echo "Step 3: Importing data..."
echo "[i] This may take a while depending on data size..."

if sqlite3 "$DB_FILE" < "$SQL_FILE" 2>&1; then
    echo "[✓] Data imported successfully"
else
    echo "[✗] Import failed"
    echo "[!] Restoring backup..."
    if [ -f "$BACKUP_FILE" ]; then
        cp "$BACKUP_FILE" "$DB_FILE"
        echo "[✓] Backup restored"
    fi
    exit 1
fi

# Step 5: Verify import
echo ""
echo "Step 4: Verifying import..."
TOTAL_ROWS=$(sqlite3 "$DB_FILE" "SELECT SUM((SELECT COUNT(*) FROM \"$table\" FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'));" 2>/dev/null || echo "0")
echo "[i] Total rows in database: $TOTAL_ROWS"

# Step 6: Regenerate Prisma client
echo ""
echo "Step 5: Regenerating Prisma client..."
cd "$BACKEND_DIR" || exit 1
rm -rf node_modules/.prisma node_modules/@prisma/client 2>/dev/null || true
if npx prisma generate > /dev/null 2>&1; then
    echo "[✓] Prisma client regenerated"
else
    echo "[✗] Failed to regenerate Prisma client"
fi

# Step 7: Start backend
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
echo ""
echo "Backend Status:"
pm2 list | grep backend
echo ""
echo "To verify data, check:"
echo "  - Total parts: sqlite3 $DB_FILE \"SELECT COUNT(*) FROM Part;\""
echo "  - Total users: sqlite3 $DB_FILE \"SELECT COUNT(*) FROM User;\""
IMPORTEOF

chmod +x "$EXPORT_DIR/import-to-server.sh"

echo ""
echo "Step 4: Creating compressed archive..."
cd "$EXPORT_DIR" || exit 1
tar -czf "../database-export.tar.gz" . 2>/dev/null || zip -r "../database-export.zip" . > /dev/null 2>&1
if [ -f "../database-export.tar.gz" ]; then
    echo "[✓] Created: database-export.tar.gz"
elif [ -f "../database-export.zip" ]; then
    echo "[✓] Created: database-export.zip"
fi

echo ""
echo "=========================================="
echo "  Export Complete!"
echo "=========================================="
echo ""
echo "Exported $EXPORTED_COUNT tables with data"
echo ""
echo "Files created:"
echo "  - $MASTER_SQL (master import file)"
echo "  - $EXPORT_DIR/import-to-server.sh (server import script)"
echo "  - Individual table SQL files in $EXPORT_DIR/"
echo ""
echo "To import on server:"
echo "  1. Upload database-export.tar.gz or database-export/ folder to server"
echo "  2. Extract if needed: tar -xzf database-export.tar.gz"
echo "  3. Run: bash import-to-server.sh"
echo ""

