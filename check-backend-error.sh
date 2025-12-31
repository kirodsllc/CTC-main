#!/bin/bash

# Check Backend Error Logs
# Run: sudo bash check-backend-error.sh

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

echo "=========================================="
echo "  Checking Backend Error Logs"
echo "=========================================="

echo ""
echo "Recent backend error logs:"
pm2 logs backend --err --lines 30 --nostream

echo ""
echo "=========================================="
echo "  Testing API Endpoint"
echo "=========================================="

echo ""
echo "Testing /api/parts endpoint:"
curl -v http://localhost:3001/api/parts?limit=10 2>&1 | head -30

echo ""
echo "=========================================="
echo "  Backend Status"
echo "=========================================="

pm2 status backend

echo ""
echo "If backend is not running, restart it with:"
echo "  pm2 restart backend"

