#!/bin/bash

# Initialize LongCat Settings with Default API Key
set +e

echo "=========================================="
echo "  Initialize LongCat Settings"
echo "=========================================="
echo ""

cd /var/www/nextapp/backend || exit 1

# Step 1: Check if LongCatSettings table exists
echo "Step 1: Checking LongCatSettings table..."
if command -v sqlite3 &> /dev/null && [ -f "prisma/inventory.db" ]; then
    TABLE_EXISTS=$(sqlite3 prisma/inventory.db "SELECT name FROM sqlite_master WHERE type='table' AND name='LongCatSettings';" 2>/dev/null)
    if [ -z "$TABLE_EXISTS" ]; then
        echo "[✗] LongCatSettings table does not exist"
        echo "[!] Creating table first..."
        sqlite3 prisma/inventory.db << 'SQLEOF'
CREATE TABLE IF NOT EXISTS "LongCatSettings" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "apiKey" TEXT,
  "model" TEXT DEFAULT 'LongCat-Flash-Chat',
  "baseUrl" TEXT DEFAULT 'https://api.longcat.chat',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
SQLEOF
        echo "[✓] Table created"
    else
        echo "[✓] LongCatSettings table exists"
    fi
else
    echo "[✗] Cannot access database"
    exit 1
fi

# Step 2: Check if settings already exist
echo ""
echo "Step 2: Checking existing settings..."
EXISTING_COUNT=$(sqlite3 prisma/inventory.db "SELECT COUNT(*) FROM LongCatSettings;" 2>/dev/null || echo "0")

if [ "$EXISTING_COUNT" -gt 0 ]; then
    echo "[✓] Settings already exist ($EXISTING_COUNT record(s))"
    echo "[i] Current settings:"
    sqlite3 prisma/inventory.db "SELECT id, apiKey, model, baseUrl FROM LongCatSettings LIMIT 1;" 2>/dev/null | while IFS='|' read -r id apiKey model baseUrl; do
        if [ -z "$apiKey" ] || [ "$apiKey" = "" ]; then
            echo "[!] API key is empty, will update..."
        else
            echo "[✓] API key is configured"
            echo "    Model: $model"
            echo "    Base URL: $baseUrl"
            exit 0
        fi
    done
else
    echo "[!] No settings found, creating default..."
fi

# Step 3: Stop backend
echo ""
echo "Step 3: Stopping backend..."
pm2 stop backend > /dev/null 2>&1 || true
sleep 2

# Step 4: Initialize settings using Node.js script
echo ""
echo "Step 4: Initializing LongCat settings..."
cat > /tmp/init-longcat.js << 'JSEOF'
const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

async function initLongCat() {
  try {
    // Check if settings exist
    const existing = await prisma.longCatSettings.findFirst();
    
    if (existing) {
      if (!existing.apiKey || existing.apiKey.trim() === '') {
        console.log('Updating existing settings with default API key...');
        await prisma.longCatSettings.update({
          where: { id: existing.id },
          data: {
            apiKey: 'ak_2No6Dx1vk4Di5so3aB53O3gd0B61t',
            model: 'LongCat-Flash-Chat',
            baseUrl: 'https://api.longcat.chat',
          },
        });
        console.log('SUCCESS: Settings updated with default API key');
      } else {
        console.log('SUCCESS: Settings already have API key configured');
        console.log('API Key:', existing.apiKey.substring(0, 10) + '...');
        console.log('Model:', existing.model);
        console.log('Base URL:', existing.baseUrl);
      }
    } else {
      console.log('Creating new settings with default API key...');
      await prisma.longCatSettings.create({
        data: {
          id: uuidv4(),
          apiKey: 'ak_2No6Dx1vk4Di5so3aB53O3gd0B61t',
          model: 'LongCat-Flash-Chat',
          baseUrl: 'https://api.longcat.chat',
        },
      });
      console.log('SUCCESS: Settings created with default API key');
    }
  } catch (error) {
    console.log('ERROR:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

initLongCat();
JSEOF

if node /tmp/init-longcat.js 2>&1; then
    echo "[✓] LongCat settings initialized"
else
    echo "[✗] Failed to initialize settings"
    echo "[!] Trying direct SQL method..."
    
    # Fallback: Direct SQL
    if command -v sqlite3 &> /dev/null; then
        EXISTING_COUNT=$(sqlite3 prisma/inventory.db "SELECT COUNT(*) FROM LongCatSettings;" 2>/dev/null || echo "0")
        if [ "$EXISTING_COUNT" -eq 0 ]; then
            sqlite3 prisma/inventory.db << 'SQLEOF'
INSERT INTO "LongCatSettings" ("id", "apiKey", "model", "baseUrl", "createdAt", "updatedAt")
VALUES (
  lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6))),
  'ak_2No6Dx1vk4Di5so3aB53O3gd0B61t',
  'LongCat-Flash-Chat',
  'https://api.longcat.chat',
  datetime('now'),
  datetime('now')
);
SQLEOF
            if [ $? -eq 0 ]; then
                echo "[✓] Settings created using SQL"
            fi
        else
            # Update existing record
            sqlite3 prisma/inventory.db << 'SQLEOF'
UPDATE "LongCatSettings" 
SET "apiKey" = 'ak_2No6Dx1vk4Di5so3aB53O3gd0B61t',
    "model" = 'LongCat-Flash-Chat',
    "baseUrl" = 'https://api.longcat.chat',
    "updatedAt" = datetime('now')
WHERE "apiKey" IS NULL OR "apiKey" = '';
SQLEOF
            if [ $? -eq 0 ]; then
                echo "[✓] Settings updated using SQL"
            fi
        fi
    fi
fi

# Step 5: Verify settings
echo ""
echo "Step 5: Verifying settings..."
if command -v sqlite3 &> /dev/null; then
    SETTINGS=$(sqlite3 prisma/inventory.db "SELECT apiKey, model, baseUrl FROM LongCatSettings LIMIT 1;" 2>/dev/null)
    if [ -n "$SETTINGS" ]; then
        IFS='|' read -r apiKey model baseUrl <<< "$SETTINGS"
        if [ -n "$apiKey" ] && [ "$apiKey" != "" ]; then
            echo "[✓] API key is configured"
            echo "    Model: $model"
            echo "    Base URL: $baseUrl"
        else
            echo "[✗] API key is still empty"
        fi
    fi
fi

# Step 6: Regenerate Prisma client
echo ""
echo "Step 6: Regenerating Prisma client..."
rm -rf node_modules/.prisma node_modules/@prisma/client 2>/dev/null || true
if npx prisma generate > /dev/null 2>&1; then
    echo "[✓] Prisma client regenerated"
fi

# Step 7: Start backend
echo ""
echo "Step 7: Starting backend..."
pm2 start dist/server.js --name "backend" > /dev/null 2>&1
sleep 5
echo "[✓] Backend started"

# Step 8: Test API
echo ""
echo "Step 8: Testing LongCat settings API..."
sleep 3
RESPONSE=$(curl -s http://localhost:3001/api/longcat-settings 2>&1)
if echo "$RESPONSE" | grep -qi "apiKey\|LongCat"; then
    echo "[✓] LongCat settings API is working!"
    echo "$RESPONSE" | head -5
else
    echo "[✗] API response:"
    echo "$RESPONSE" | head -3
fi

pm2 save > /dev/null 2>&1 || true

echo ""
echo "=========================================="
echo "  Complete!"
echo "=========================================="
pm2 list | grep backend

