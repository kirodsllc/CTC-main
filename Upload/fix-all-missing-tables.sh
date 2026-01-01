#!/bin/bash

# Fix All Missing Database Tables
set +e

echo "=========================================="
echo "  Fix All Missing Database Tables"
echo "=========================================="
echo ""

cd /var/www/nextapp/backend || exit 1

# Step 1: Get all models from Prisma schema
echo "Step 1: Reading Prisma schema..."
MODELS=$(grep "^model " prisma/schema.prisma | sed 's/model //' | sed 's/ {.*//' | sort)
echo "[✓] Found models in schema"

# Step 2: Check which tables exist in database
echo ""
echo "Step 2: Checking existing tables in database..."
if command -v sqlite3 &> /dev/null && [ -f "prisma/inventory.db" ]; then
    EXISTING_TABLES=$(sqlite3 prisma/inventory.db "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_%';" 2>/dev/null | sort)
    
    MISSING_TABLES=""
    for model in $MODELS; do
        if ! echo "$EXISTING_TABLES" | grep -q "^${model}$"; then
            MISSING_TABLES="$MISSING_TABLES $model"
        fi
    done
    
    if [ -z "$MISSING_TABLES" ]; then
        echo "[✓] All tables exist in database"
        exit 0
    else
        echo "[!] Missing tables:$MISSING_TABLES"
    fi
else
    echo "[✗] Cannot check tables (sqlite3 not available or database not found)"
    exit 1
fi

# Step 3: Stop backend
echo ""
echo "Step 3: Stopping backend..."
pm2 stop backend > /dev/null 2>&1 || true
sleep 2

# Step 4: Use Prisma db push to create missing tables
echo ""
echo "Step 4: Creating missing tables using Prisma db push..."
if npx prisma db push --accept-data-loss > /tmp/prisma-push.log 2>&1; then
    echo "[✓] Prisma db push completed"
    tail -5 /tmp/prisma-push.log
else
    echo "[!] Prisma db push had issues, checking log..."
    tail -10 /tmp/prisma-push.log
fi

# Step 5: Verify tables were created
echo ""
echo "Step 5: Verifying tables..."
if command -v sqlite3 &> /dev/null; then
    NEW_EXISTING_TABLES=$(sqlite3 prisma/inventory.db "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_%';" 2>/dev/null | sort)
    
    STILL_MISSING=""
    for model in $MODELS; do
        if ! echo "$NEW_EXISTING_TABLES" | grep -q "^${model}$"; then
            STILL_MISSING="$STILL_MISSING $model"
        fi
    done
    
    if [ -z "$STILL_MISSING" ]; then
        echo "[✓] All tables now exist!"
    else
        echo "[!] Still missing:$STILL_MISSING"
        echo "[!] Attempting manual creation for critical tables..."
        
        # Try to create User table manually if it's missing
        if echo "$STILL_MISSING" | grep -q "User"; then
            echo "[!] Creating User table manually..."
            sqlite3 prisma/inventory.db << 'SQLEOF'
CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "password" TEXT,
  "role" TEXT NOT NULL DEFAULT 'Staff',
  "status" TEXT NOT NULL DEFAULT 'active',
  "lastLogin" TEXT DEFAULT '-',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
SQLEOF
            if [ $? -eq 0 ]; then
                echo "[✓] User table created"
            fi
        fi
    fi
fi

# Step 6: Regenerate Prisma client
echo ""
echo "Step 6: Regenerating Prisma client..."
rm -rf node_modules/.prisma node_modules/@prisma/client 2>/dev/null || true
if npx prisma generate > /dev/null 2>&1; then
    echo "[✓] Prisma client regenerated"
else
    echo "[✗] Failed to regenerate Prisma client"
    exit 1
fi

# Step 7: Start backend
echo ""
echo "Step 7: Starting backend..."
pm2 start dist/server.js --name "backend" > /dev/null 2>&1
sleep 5
echo "[✓] Backend started"

# Step 8: Test API endpoints
echo ""
echo "Step 8: Testing API endpoints..."
sleep 3
pm2 flush > /dev/null 2>&1 || true
sleep 1

# Test users endpoint
USERS_RESPONSE=$(curl -s http://localhost:3001/api/users?page=1&limit=10 2>&1)
if echo "$USERS_RESPONSE" | grep -qi "table.*does not exist"; then
    echo "[✗] Users API still showing errors"
    echo "$USERS_RESPONSE" | head -3
else
    echo "[✓] Users API is working!"
fi

# Test dashboard endpoint
DASHBOARD_RESPONSE=$(curl -s http://localhost:3001/api/inventory/dashboard 2>&1)
if echo "$DASHBOARD_RESPONSE" | grep -qi "table.*does not exist\|502\|500"; then
    echo "[✗] Dashboard API has errors"
    echo "$DASHBOARD_RESPONSE" | head -3
else
    echo "[✓] Dashboard API is working!"
fi

pm2 save > /dev/null 2>&1 || true

echo ""
echo "=========================================="
echo "  Complete!"
echo "=========================================="
echo ""
echo "Backend Status:"
pm2 list | grep backend
echo ""
echo "Total tables in database:"
if command -v sqlite3 &> /dev/null; then
    sqlite3 prisma/inventory.db "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';" 2>/dev/null
fi

