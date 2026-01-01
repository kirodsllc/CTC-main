#!/bin/bash

# One Command Fix - Database Connection
set +e

cd /var/www/nextapp/backend || exit 1

echo "Fixing database connection..."

# Stop backend
pm2 stop backend > /dev/null 2>&1 || true
pm2 delete backend > /dev/null 2>&1 || true
pm2 kill > /dev/null 2>&1 || true
sleep 2

# Copy inventory.db to dev.db (Prisma might expect dev.db)
if [ -f "prisma/inventory.db" ]; then
    cp prisma/inventory.db prisma/dev.db
    chmod 666 prisma/dev.db
    echo "Copied inventory.db to dev.db"
fi

# Update .env to use dev.db
cat > .env << 'ENVEOF'
DATABASE_URL="file:./prisma/dev.db"
PORT=3001
NODE_ENV=production
CORS_ORIGIN=http://103.60.12.157
ENVEOF

# Remove Prisma client
rm -rf node_modules/.prisma node_modules/@prisma/client 2>/dev/null || true

# Generate Prisma client
npx prisma generate > /dev/null 2>&1

# Start backend
pm2 start dist/server.js --name "backend" > /dev/null 2>&1
sleep 5

# Test
sleep 2
if curl -s -f http://localhost:3001/health > /dev/null 2>&1; then
    echo "Backend is responding"
    
    # Test API
    sleep 1
    RESPONSE=$(curl -s http://localhost:3001/api/parts?limit=1 2>&1)
    if echo "$RESPONSE" | grep -q "table.*does not exist"; then
        echo "ERROR: Database errors still occurring"
    else
        echo "SUCCESS: API is working!"
    fi
else
    echo "ERROR: Backend not responding"
fi

pm2 save > /dev/null 2>&1 || true
pm2 list | grep backend

