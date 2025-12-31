#!/bin/bash

# Diagnose 500 Error
# Run: sudo bash diagnose-500-error.sh

set +e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_info() {
    echo -e "${YELLOW}[i]${NC} $1"
}

echo "=========================================="
echo "  Diagnosing 500 Error"
echo "=========================================="

# Check backend status
echo ""
echo "Step 1: Checking backend status..."
pm2 status backend

# Check recent error logs
echo ""
echo "Step 2: Recent backend error logs (last 50 lines):"
pm2 logs backend --err --lines 50 --nostream | tail -50

# Test API directly
echo ""
echo "Step 3: Testing API endpoint directly..."
echo "Testing: GET http://localhost:3001/api/parts?limit=10"
API_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" http://localhost:3001/api/parts?limit=10 2>&1)
HTTP_CODE=$(echo "$API_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
RESPONSE_BODY=$(echo "$API_RESPONSE" | grep -v "HTTP_CODE")

echo "HTTP Status Code: $HTTP_CODE"
if [ "$HTTP_CODE" = "200" ]; then
    print_status "API is working!"
    echo "Response (first 500 chars):"
    echo "$RESPONSE_BODY" | head -c 500
    echo ""
elif [ "$HTTP_CODE" = "500" ]; then
    print_error "API returned 500 error"
    echo "Error response:"
    echo "$RESPONSE_BODY"
else
    print_info "API returned HTTP $HTTP_CODE"
    echo "Response:"
    echo "$RESPONSE_BODY" | head -20
fi

# Check if backend process is healthy
echo ""
echo "Step 4: Checking backend health..."
HEALTH=$(curl -s http://localhost:3001/health 2>/dev/null)
if [ -n "$HEALTH" ]; then
    print_status "Backend health check: $HEALTH"
else
    print_error "Backend health check failed"
fi

# Check database connection
echo ""
echo "Step 5: Checking database file..."
DB_FILE="/var/www/nextapp/backend/prisma/dev.db"
if [ -f "$DB_FILE" ]; then
    print_status "Database file exists: $DB_FILE"
    DB_SIZE=$(du -h "$DB_FILE" | cut -f1)
    print_info "Database size: $DB_SIZE"
else
    print_error "Database file not found: $DB_FILE"
fi

echo ""
echo "=========================================="
echo "  Diagnosis Complete"
echo "=========================================="
echo ""
echo "If you see errors above, they indicate the issue."
echo "Common fixes:"
echo "  1. Restart backend: pm2 restart backend"
echo "  2. Check database permissions"
echo "  3. Rebuild backend: cd /var/www/nextapp/backend && npm run build"

