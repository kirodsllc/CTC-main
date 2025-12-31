#!/bin/bash

# Fix CORS Configuration
# Run: sudo bash fix-cors.sh

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
echo "  Fixing CORS Configuration"
echo "=========================================="

cd "$BACKEND_DIR" || exit 1

# Get the server IP/domain
SERVER_IP="103.60.12.157"
CORS_ORIGIN="http://${SERVER_IP}"

print_status "Setting CORS origin to: $CORS_ORIGIN"

# Check if .env exists
if [ -f ".env" ]; then
    print_status ".env file exists"
    
    # Check if CORS_ORIGIN is already set
    if grep -q "CORS_ORIGIN" .env; then
        print_warning "CORS_ORIGIN already exists, updating..."
        # Update existing CORS_ORIGIN
        sed -i "s|CORS_ORIGIN=.*|CORS_ORIGIN=$CORS_ORIGIN|g" .env
    else
        print_status "Adding CORS_ORIGIN to .env"
        echo "" >> .env
        echo "# CORS Configuration" >> .env
        echo "CORS_ORIGIN=$CORS_ORIGIN" >> .env
    fi
else
    print_warning ".env file not found, creating..."
    cat > .env << EOF
# Database
DATABASE_URL=file:./prisma/dev.db

# Server
PORT=3001

# CORS Configuration
CORS_ORIGIN=$CORS_ORIGIN
EOF
fi

print_status "CORS_ORIGIN updated in .env"

# Also update the server.ts to allow the VPS IP in production
print_status "Updating server.ts to allow VPS origin..."

# Check if we need to update server.ts
if grep -q "103.60.12.157\|SERVER_IP" "$BACKEND_DIR/src/server.ts"; then
    print_status "server.ts already configured"
else
    print_warning "You may need to rebuild backend after this"
fi

# Restart backend to apply changes
echo ""
print_status "Restarting backend to apply CORS changes..."
pm2 restart backend --update-env

sleep 3

# Verify backend is running
if pm2 list | grep -q "backend.*online"; then
    print_status "Backend restarted successfully"
else
    print_warning "Backend may have issues, check logs: pm2 logs backend"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}  CORS Configuration Updated!${NC}"
echo "=========================================="
echo ""
echo "CORS_ORIGIN is now set to: $CORS_ORIGIN"
echo ""
echo "If you still see CORS errors:"
echo "  1. Rebuild backend: cd $BACKEND_DIR && npm run build"
echo "  2. Restart backend: pm2 restart backend --update-env"
echo "  3. Check .env file: cat $BACKEND_DIR/.env | grep CORS"
echo ""

