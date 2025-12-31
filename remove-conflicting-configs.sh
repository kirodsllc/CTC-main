#!/bin/bash

# Remove Conflicting Nginx Configurations
# Run: sudo bash remove-conflicting-configs.sh

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

echo "=========================================="
echo "  Removing Conflicting Configs"
echo "=========================================="

# Remove the conflicting "upload" config
echo ""
echo "Removing conflicting 'upload' configuration..."
rm -f /etc/nginx/sites-enabled/upload
rm -f /etc/nginx/sites-available/upload
print_status "Removed 'upload' configuration"

# Ensure only nextapp is enabled
echo ""
echo "Ensuring only nextapp is enabled..."
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/nextapp /etc/nginx/sites-enabled/nextapp
print_status "Only nextapp configuration is enabled"

# Verify what's enabled
echo ""
echo "Currently enabled sites:"
ls -la /etc/nginx/sites-enabled/

# Test and restart
echo ""
if nginx -t; then
    systemctl restart nginx
    print_status "Nginx restarted"
    
    sleep 2
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/)
    if [ "$HTTP_CODE" = "200" ]; then
        print_status "Website is working! (HTTP $HTTP_CODE)"
    fi
else
    print_warning "Nginx test failed"
    nginx -t
fi

echo ""
echo "=========================================="
echo -e "${GREEN}  Done!${NC}"
echo "=========================================="
echo ""
echo "The conflicting 'upload' config has been removed."
echo "Your website should now work properly."
echo ""
echo "Clear your browser cache and try again:"
echo "  - Press Ctrl+Shift+Delete"
echo "  - Or use Incognito mode: Ctrl+Shift+N"

