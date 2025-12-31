#!/bin/bash

# Fix API Endpoint - Use Relative URLs
# Run: sudo bash fix-api-endpoint.sh

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

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

APP_DIR="/var/www/nextapp"

echo "=========================================="
echo "  Fixing API Endpoint Configuration"
echo "=========================================="

cd "$APP_DIR" || exit 1

# Step 1: Update API configuration to use relative URLs
echo ""
echo "Step 1: Updating API configuration..."

# Update src/lib/api.ts
if [ -f "src/lib/api.ts" ]; then
    sed -i "s|'http://localhost:3001/api'|'/api'|g" src/lib/api.ts
    sed -i 's|"http://localhost:3001/api"|"/api"|g' src/lib/api.ts
    print_status "Updated src/lib/api.ts"
else
    print_error "src/lib/api.ts not found!"
    exit 1
fi

# Update accounting components
echo "Updating accounting components..."
for file in src/components/accounting/*.tsx; do
    if [ -f "$file" ]; then
        # Change API_URL default to empty string so ${API_URL}/api becomes /api
        sed -i 's|"http://localhost:3001"|""|g' "$file"
        sed -i "s|'http://localhost:3001'|''|g" "$file"
    fi
done

# Update inventory components
echo "Updating inventory components..."
for file in src/components/inventory/*.tsx; do
    if [ -f "$file" ]; then
        sed -i "s|'http://localhost:3001/api'|'/api'|g" "$file"
        sed -i 's|"http://localhost:3001/api"|"/api"|g' "$file"
    fi
done

print_status "Updated all API endpoints to use relative URLs"

# Step 2: Rebuild frontend
echo ""
echo "Step 2: Rebuilding frontend..."
cd "$APP_DIR" || exit 1

if npm run build; then
    print_status "Frontend rebuilt successfully"
else
    print_error "Frontend build failed!"
    exit 1
fi

# Step 3: Fix permissions
echo ""
echo "Step 3: Fixing permissions..."
chown -R www-data:www-data "$APP_DIR/dist"
chmod -R 755 "$APP_DIR/dist"
print_status "Permissions fixed"

# Step 4: Restart Nginx
echo ""
echo "Step 4: Restarting Nginx..."
systemctl restart nginx
print_status "Nginx restarted"

# Step 5: Verify backend is running
echo ""
echo "Step 5: Verifying backend..."
if pm2 list | grep -q "backend.*online"; then
    print_status "Backend is running"
else
    print_warning "Backend is not running! Starting it..."
    cd "$APP_DIR/backend" || exit 1
    pm2 start npm --name backend -- start
    pm2 save
    print_status "Backend started"
fi

# Step 6: Test API endpoint
echo ""
echo "Step 6: Testing API endpoint..."
sleep 2
API_RESPONSE=$(curl -s http://localhost/api/health 2>/dev/null)
if echo "$API_RESPONSE" | grep -q "ok"; then
    print_status "API endpoint is accessible"
    echo "Response: $API_RESPONSE"
else
    print_warning "API endpoint test failed"
    echo "Testing backend directly..."
    curl -s http://localhost:3001/health || print_warning "Backend not responding on port 3001"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}  Fix Complete!${NC}"
echo "=========================================="
echo ""
echo "The frontend now uses relative URLs (/api) instead of localhost:3001"
echo "This means API calls will go through Nginx proxy correctly."
echo ""
echo "Clear your browser cache and refresh:"
echo "  - Press Ctrl+Shift+Delete"
echo "  - Or use Incognito mode: Ctrl+Shift+N"
echo ""
