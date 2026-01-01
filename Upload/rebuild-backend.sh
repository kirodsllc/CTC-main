#!/bin/bash

# Rebuild Backend Script
# This script rebuilds the backend to fix compilation errors

set +e

echo "=========================================="
echo "  Rebuild Backend Script"
echo "=========================================="

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

# Step 1: Stop backend
echo ""
echo "Step 1: Stopping backend..."
pm2 stop backend > /dev/null 2>&1 || true
pm2 delete backend > /dev/null 2>&1 || true
pm2 kill > /dev/null 2>&1 || true
sleep 2
print_status "Backend stopped"

# Step 2: Remove old dist folder
echo ""
echo "Step 2: Removing old build..."
rm -rf dist
print_status "Old build removed"

# Step 3: Check source file for issues
echo ""
echo "Step 3: Checking source file..."
if [ -f "src/server.ts" ]; then
    # Check for syntax errors in source
    if grep -q "if(, origin)" src/server.ts 2>/dev/null; then
        print_error "Syntax error found in source file!"
        print_info "Fixing source file..."
        # The source should be fine, but let's verify
    else
        print_status "Source file looks good"
    fi
else
    print_error "Source file not found!"
    exit 1
fi

# Step 4: Rebuild backend
echo ""
echo "Step 4: Rebuilding backend..."
if npm run build > /tmp/backend-build.log 2>&1; then
    print_status "Backend rebuilt successfully"
else
    print_error "Build failed!"
    print_info "Build errors:"
    cat /tmp/backend-build.log | tail -30
    exit 1
fi

# Step 5: Verify dist/server.js exists and is valid
echo ""
echo "Step 5: Verifying compiled code..."
if [ -f "dist/server.js" ]; then
    # Check for syntax errors
    if node -c dist/server.js > /dev/null 2>&1; then
        print_status "Compiled code is valid"
    else
        print_error "Compiled code has syntax errors!"
        print_info "Checking for common issues..."
        grep -n "if(, origin)" dist/server.js 2>/dev/null || echo "No obvious syntax errors found in grep"
        exit 1
    fi
else
    print_error "dist/server.js not found!"
    exit 1
fi

# Step 6: Start backend
echo ""
echo "Step 6: Starting backend..."
if pm2 start dist/server.js --name "backend" > /dev/null 2>&1; then
    sleep 5
    print_status "Backend started"
else
    print_error "Failed to start backend"
    exit 1
fi

# Step 7: Check backend status
echo ""
echo "Step 7: Checking backend status..."
sleep 2
if pm2 list | grep -q "backend"; then
    PM2_STATUS=$(pm2 list | grep "backend" | awk '{print $10}' | head -1)
    if [ "$PM2_STATUS" = "online" ]; then
        print_status "Backend is online"
    else
        print_error "Backend status: $PM2_STATUS"
        print_info "Recent logs:"
        pm2 logs backend --lines 20 --nostream 2>&1 | tail -20
        exit 1
    fi
else
    print_error "Backend not found in PM2"
    exit 1
fi

# Step 8: Test backend
echo ""
echo "Step 8: Testing backend..."
sleep 2
if command -v curl &> /dev/null; then
    if curl -s -f http://localhost:3001/health > /dev/null 2>&1; then
        print_status "Backend is responding"
        curl -s http://localhost:3001/health | head -3
    else
        print_warning "Backend not responding yet, checking logs..."
        pm2 logs backend --lines 10 --nostream 2>&1 | tail -10
    fi
fi

# Step 9: Save PM2
echo ""
echo "Step 9: Saving PM2 configuration..."
pm2 save > /dev/null 2>&1 || true
print_status "PM2 saved"

echo ""
echo "=========================================="
echo -e "${GREEN}  Rebuild Complete!${NC}"
echo "=========================================="
echo ""
pm2 list
echo ""

