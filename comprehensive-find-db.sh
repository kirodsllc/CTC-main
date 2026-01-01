#!/bin/bash

# Comprehensive Database File Finder
set +e

echo "=========================================="
echo "  Comprehensive Database Search"
echo "=========================================="
echo ""

echo "Step 1: Checking Upload directory structure..."
find /var/www/Upload -type d 2>/dev/null | head -20
echo ""

echo "Step 2: Looking for large files (potential databases)..."
find /var/www/Upload -type f -size +1M 2>/dev/null -exec ls -lh {} \; | head -10
echo ""

echo "Step 3: Checking backend/prisma folder..."
if [ -d "/var/www/Upload/backend/prisma" ]; then
    ls -lah /var/www/Upload/backend/prisma/ 2>/dev/null
    echo ""
    find /var/www/Upload/backend/prisma -name "*.db" -type f 2>/dev/null
fi
echo ""

echo "Step 4: Checking for database-export folder..."
if [ -d "/var/www/Upload/database-export" ]; then
    ls -lah /var/www/Upload/database-export/ 2>/dev/null
    find /var/www/Upload/database-export -type f 2>/dev/null
fi
echo ""

echo "Step 5: All files larger than 100KB..."
find /var/www/Upload -type f -size +100k 2>/dev/null -exec ls -lh {} \; | head -20
echo ""

echo "Step 6: Checking current server database location..."
BACKEND_DIR="/var/www/nextapp/backend"
if [ -f "$BACKEND_DIR/prisma/inventory.db" ]; then
    SIZE=$(du -h "$BACKEND_DIR/prisma/inventory.db" | cut -f1)
    echo "[✓] Current server database: $BACKEND_DIR/prisma/inventory.db ($SIZE)"
fi
if [ -f "$BACKEND_DIR/prisma/dev.db" ]; then
    SIZE=$(du -h "$BACKEND_DIR/prisma/dev.db" | cut -f1)
    echo "[✓] Current server database: $BACKEND_DIR/prisma/dev.db ($SIZE)"
fi
echo ""

echo "=========================================="
echo "  Search Complete"
echo "=========================================="
echo ""
echo "If you uploaded the database file, please:"
echo "  1. Tell me the exact filename"
echo "  2. Or upload it again as 'dev.db' to /var/www/Upload/"
echo "  3. Or I can help you copy it from your local machine"
echo ""

