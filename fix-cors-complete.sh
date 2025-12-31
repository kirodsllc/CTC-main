#!/bin/bash

# Complete CORS Fix
# Run: sudo bash fix-cors-complete.sh

set +e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

APP_DIR="/var/www/nextapp"
BACKEND_DIR="$APP_DIR/backend"

echo "=========================================="
echo "  Complete CORS Fix"
echo "=========================================="

cd "$BACKEND_DIR" || exit 1

# Step 1: Update .env file
echo ""
echo "Step 1: Updating .env file..."
SERVER_IP="103.60.12.157"
CORS_ORIGIN="http://${SERVER_IP}"

if [ -f ".env" ]; then
    if grep -q "CORS_ORIGIN" .env; then
        sed -i "s|CORS_ORIGIN=.*|CORS_ORIGIN=$CORS_ORIGIN|g" .env
        print_status "Updated CORS_ORIGIN in .env"
    else
        echo "" >> .env
        echo "CORS_ORIGIN=$CORS_ORIGIN" >> .env
        print_status "Added CORS_ORIGIN to .env"
    fi
    
    # Also set NODE_ENV to production
    if ! grep -q "NODE_ENV" .env; then
        echo "NODE_ENV=production" >> .env
        print_status "Added NODE_ENV=production to .env"
    fi
else
    print_warning ".env not found, creating..."
    cat > .env << EOF
DATABASE_URL=file:./prisma/dev.db
PORT=3001
CORS_ORIGIN=$CORS_ORIGIN
NODE_ENV=production
EOF
    print_status "Created .env file"
fi

# Step 2: Rebuild backend (since we updated server.ts)
echo ""
echo "Step 2: Rebuilding backend..."
if npm run build; then
    print_status "Backend rebuilt successfully"
else
    print_error "Backend build failed!"
    exit 1
fi

# Step 3: Restart backend
echo ""
echo "Step 3: Restarting backend..."
pm2 restart backend --update-env
sleep 3

# Step 4: Verify
echo ""
echo "Step 4: Verifying..."
if pm2 list | grep -q "backend.*online"; then
    print_status "Backend is running"
    
    # Test API
    sleep 2
    API_TEST=$(curl -s -o /dev/null -w "%{http_code}" -H "Origin: http://${SERVER_IP}" http://localhost:3001/api/parts?limit=1)
    if [ "$API_TEST" = "200" ]; then
        print_status "API is accessible with CORS"
    else
        print_warning "API returned HTTP $API_TEST"
    fi
else
    print_warning "Backend may have issues, check logs: pm2 logs backend"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}  CORS Fix Complete!${NC}"
echo "=========================================="
echo ""
echo "The backend should now accept requests from:"
echo "  - http://${SERVER_IP}"
echo ""
echo "Clear your browser cache and refresh the page."
echo ""

