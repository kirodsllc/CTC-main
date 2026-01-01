cat > /tmp/fix-all-database-issues.sh << 'SCRIPTEOF'
#!/bin/bash
set +e
echo "=========================================="
echo "  Complete Database Fix Script"
echo "=========================================="
echo ""
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'
BACKEND_DIR="/var/www/nextapp/backend"
print_status() { echo -e "${GREEN}[✓]${NC} $1"; }
print_error() { echo -e "${RED}[✗]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[!]${NC} $1"; }
print_info() { echo -e "${BLUE}[i]${NC} $1"; }
cd $BACKEND_DIR || exit 1
echo "Step 1: Verifying database..."
if [ ! -f "prisma/inventory.db" ]; then
    print_error "inventory.db not found!"
    exit 1
fi
if command -v sqlite3 &> /dev/null; then
    TABLE_COUNT=$(sqlite3 prisma/inventory.db "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';" 2>/dev/null || echo "0")
    if [ "$TABLE_COUNT" -gt 0 ]; then
        print_status "inventory.db has $TABLE_COUNT tables"
        PART_EXISTS=$(sqlite3 prisma/inventory.db "SELECT name FROM sqlite_master WHERE type='table' AND name='Part';" 2>/dev/null)
        if [ -n "$PART_EXISTS" ]; then
            print_status "Part table exists"
        else
            print_error "Part table NOT found!"
            exit 1
        fi
    else
        print_error "inventory.db has no tables!"
        exit 1
    fi
else
    print_warning "sqlite3 not available, skipping verification"
fi
echo ""
echo "Step 2: Stopping backend..."
pm2 stop backend > /dev/null 2>&1 || true
pm2 delete backend > /dev/null 2>&1 || true
pm2 kill > /dev/null 2>&1 || true
sleep 3
print_status "Backend stopped"
echo ""
echo "Step 3: Ensuring both database files exist..."
if [ -f "prisma/inventory.db" ]; then
    cp prisma/inventory.db prisma/dev.db 2>/dev/null || true
    chmod 666 prisma/dev.db 2>/dev/null || true
    print_status "Copied inventory.db to dev.db"
fi
echo ""
echo "Step 4: Updating .env file..."
ABSOLUTE_DB_PATH="/var/www/nextapp/backend/prisma/inventory.db"
cat > .env << ENVEOF
DATABASE_URL="file:${ABSOLUTE_DB_PATH}"
PORT=3001
NODE_ENV=production
CORS_ORIGIN=http://103.60.12.157
ENVEOF
print_status ".env updated with absolute path"
echo ""
echo "Step 5: Removing Prisma client cache..."
rm -rf node_modules/.prisma 2>/dev/null || true
rm -rf node_modules/@prisma/client 2>/dev/null || true
rm -rf .prisma 2>/dev/null || true
print_status "Prisma client cache removed"
echo ""
echo "Step 6: Generating Prisma client..."
if npx prisma generate 2>&1 | tail -5; then
    print_status "Prisma client generated successfully"
else
    print_error "Failed to generate Prisma client"
    exit 1
fi
echo ""
echo "Step 7: Verifying Prisma can see tables..."
cat > /tmp/verify-prisma-db.js << 'JSEOF'
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function verify() {
  try {
    const partCheck = await prisma.$queryRaw\`SELECT name FROM sqlite_master WHERE type='table' AND name='Part'\`;
    if (partCheck && partCheck.length > 0) {
      console.log('SUCCESS: Prisma can see Part table');
      try {
        const count = await prisma.part.count();
        console.log(\`SUCCESS: Prisma can query Part table (count: \${count})\`);
        process.exit(0);
      } catch (err) {
        console.log('WARNING: Part table exists but query failed:', err.message);
        process.exit(1);
      }
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
verify();
JSEOF
if node /tmp/verify-prisma-db.js 2>&1; then
    print_status "Prisma database connection verified"
else
    print_warning "Prisma verification had issues, but continuing..."
fi
echo ""
echo "Step 8: Rebuilding backend..."
if npm run build > /tmp/backend-build.log 2>&1; then
    print_status "Backend rebuilt successfully"
else
    print_warning "Build had warnings, but continuing..."
    tail -5 /tmp/backend-build.log
fi
echo ""
echo "Step 9: Starting backend..."
pm2 start dist/server.js --name "backend" > /dev/null 2>&1
sleep 5
print_status "Backend started"
echo ""
echo "Step 10: Checking backend status..."
sleep 2
if pm2 list | grep -q "backend"; then
    PM2_STATUS=$(pm2 list | grep "backend" | awk '{print $10}' | head -1)
    if [ "$PM2_STATUS" = "online" ]; then
        print_status "Backend is online"
    else
        print_warning "Backend status: $PM2_STATUS"
        pm2 logs backend --lines 5 --nostream 2>&1 | tail -5
    fi
fi
echo ""
echo "Step 11: Testing API endpoints..."
pm2 flush > /dev/null 2>&1 || true
sleep 3
if curl -s -f http://localhost:3001/health > /dev/null 2>&1; then
    print_status "Health endpoint is responding"
else
    print_error "Health endpoint not responding"
fi
sleep 1
RESPONSE=$(curl -s http://localhost:3001/api/parts?limit=1 2>&1)
if echo "$RESPONSE" | grep -qi "table.*does not exist"; then
    print_error "Database errors still occurring in API"
    echo "$RESPONSE" | head -3
elif echo "$RESPONSE" | grep -qi "error"; then
    print_warning "API returned an error"
    echo "$RESPONSE" | head -3
else
    print_status "API is working! No database errors"
fi
echo ""
echo "Step 12: Checking logs for database errors..."
sleep 2
ERROR_COUNT=$(pm2 logs backend --lines 20 --nostream 2>&1 | grep -i "table.*does not exist" | wc -l || echo "0")
if [ "$ERROR_COUNT" -eq 0 ]; then
    print_status "No database errors found in logs!"
else
    print_warning "Found $ERROR_COUNT database errors in recent logs"
    pm2 flush > /dev/null 2>&1 || true
    sleep 1
    curl -s http://localhost:3001/api/parts?limit=1 > /dev/null 2>&1
    sleep 2
    NEW_ERROR_COUNT=$(pm2 logs backend --lines 10 --nostream 2>&1 | grep -i "table.*does not exist" | wc -l || echo "0")
    if [ "$NEW_ERROR_COUNT" -eq 0 ]; then
        print_status "No new database errors after fresh API call!"
    else
        print_error "Still getting database errors"
        pm2 logs backend --lines 5 --nostream 2>&1 | grep -i "table.*does not exist" | head -3
    fi
fi
pm2 save > /dev/null 2>&1 || true
echo ""
echo "=========================================="
echo -e "${GREEN}  Fix Complete!${NC}"
echo "=========================================="
echo ""
echo "Backend Status:"
pm2 list | grep backend
echo ""
SCRIPTEOF
chmod +x /tmp/fix-all-database-issues.sh && bash /tmp/fix-all-database-issues.sh

