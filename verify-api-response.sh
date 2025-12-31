#!/bin/bash

# Verify API Response
# Run: sudo bash verify-api-response.sh

set +e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_info() {
    echo -e "${YELLOW}[i]${NC} $1"
}

echo "=========================================="
echo "  Verifying API Response"
echo "=========================================="

# Test backend API directly
echo ""
echo "Testing backend API directly..."
API_RESPONSE=$(curl -s http://localhost:3001/api/parts?limit=10 2>/dev/null)
echo "$API_RESPONSE" | head -50

echo ""
echo "=========================================="
echo "  Testing through Nginx proxy"
echo "=========================================="

# Test through Nginx
echo ""
echo "Testing through Nginx proxy..."
NGINX_RESPONSE=$(curl -s http://localhost/api/parts?limit=10 2>/dev/null)
echo "$NGINX_RESPONSE" | head -50

echo ""
echo "=========================================="
echo "  Summary"
echo "=========================================="

# Check if response contains data
if echo "$API_RESPONSE" | grep -q '"data":\[\]' || echo "$API_RESPONSE" | grep -q '"total":0'; then
    print_status "API is returning empty data (correct)"
else
    print_info "API response may contain data"
fi

echo ""
echo "If API returns empty but browser shows data, it's browser cache."
echo "Clear browser cache and hard refresh (Ctrl+Shift+R)"

