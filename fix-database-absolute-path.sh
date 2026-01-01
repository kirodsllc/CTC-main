#!/bin/bash

# Fix Database Connection with Absolute Path
set +e

cd /var/www/nextapp/backend || exit 1

echo "=========================================="
echo "  Fix Database Connection (Absolute Path)"
echo "=========================================="

# Step 1: Verify inventory.db has tables
echo ""
echo "Step 1: Verifying database..."
if command -v sqlite3 &> /dev/null && [ -f "prisma/inventory.db" ]; then
    TABLE_COUNT=$(sqlite3 prisma/inventory.db "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';" 2>/dev/null || echo "0")
    if [ "$TABLE_COUNT" -gt 0 ]; then
        echo "[✓] inventory.db has $TABLE_COUNT tables"
    else
        echo "[✗] inventory.db has no tables!"
        exit 1
    fi
fi

# Step 2: Stop backend
echo ""
echo "Step 2: Stopping backend..."
pm2 stop backend > /dev/null 2>&1 || true
pm2 delete backend > /dev/null 2>&1 || true
sleep 2

# Step 3: Copy inventory.db to dev.db (in case Prisma expects it)
echo ""
echo "Step 3: Ensuring both database files exist..."
if [ -f "prisma/inventory.db" ]; then
    cp prisma/inventory.db prisma/dev.db 2>/dev/null || true
    chmod 666 prisma/dev.db 2>/dev/null || true
    echo "[✓] Copied inventory.db to dev.db"
fi

# Step 4: Update .env with absolute path
echo ""
echo "Step 4: Updating .env with absolute path..."
ABSOLUTE_PATH="/var/www/nextapp/backend/prisma/inventory.db"
cat > .env << ENVEOF
DATABASE_URL="file:${ABSOLUTE_PATH}"
PORT=3001
NODE_ENV=production
CORS_ORIGIN=http://103.60.12.157
ENVEOF
echo "[✓] .env updated with absolute path: $ABSOLUTE_PATH"

# Step 5: Remove Prisma client
echo ""
echo "Step 5: Removing Prisma client..."
rm -rf node_modules/.prisma 2>/dev/null || true
rm -rf node_modules/@prisma/client 2>/dev/null || true

# Step 6: Generate Prisma client
echo ""
echo "Step 6: Generating Prisma client..."
if npx prisma generate 2>&1 | tail -3; then
    echo "[✓] Prisma client generated"
else
    echo "[✗] Failed to generate Prisma client"
    exit 1
fi

# Step 7: Verify Prisma can see the database
echo ""
echo "Step 7: Verifying Prisma connection..."
cat > /tmp/check-db.js << 'JSEOF'
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const result = await prisma.$queryRaw\`SELECT name FROM sqlite_master WHERE type='table' AND name='Part'\`;
    if (result && result.length > 0) {
      console.log('SUCCESS: Prisma can see Part table');
      process.exit(0);
    } else {
      console.log('ERROR: Prisma cannot see Part table');
      process.exit(1);
    }
  } catch (error) {
    console.log('ERROR:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}
check();
JSEOF

if node /tmp/check-db.js 2>&1; then
    echo "[✓] Prisma connection verified"
else
    echo "[!] Prisma connection check failed"
fi

# Step 8: Start backend
echo ""
echo "Step 8: Starting backend..."
pm2 start dist/server.js --name "backend" > /dev/null 2>&1
sleep 5

# Step 9: Test
echo ""
echo "Step 9: Testing backend..."
sleep 3
pm2 flush > /dev/null 2>&1 || true
sleep 1

# Test health endpoint
if curl -s -f http://localhost:3001/health > /dev/null 2>&1; then
    echo "[✓] Backend is responding"
    
    # Test API endpoint
    sleep 1
    RESPONSE=$(curl -s http://localhost:3001/api/parts?limit=1 2>&1)
    if echo "$RESPONSE" | grep -qi "table.*does not exist"; then
        echo "[✗] Database errors still occurring"
        echo "$RESPONSE" | head -2
    else
        echo "[✓] API is working! No database errors"
    fi
else
    echo "[✗] Backend not responding"
fi

# Check recent logs
sleep 2
ERROR_COUNT=$(pm2 logs backend --lines 15 --nostream 2>&1 | grep -i "table.*does not exist" | wc -l || echo "0")
if [ "$ERROR_COUNT" -eq 0 ]; then
    echo "[✓] No database errors in logs"
else
    echo "[!] Found $ERROR_COUNT database errors in logs"
fi

pm2 save > /dev/null 2>&1 || true

echo ""
echo "=========================================="
echo "  Complete!"
echo "=========================================="
pm2 list | grep backend

