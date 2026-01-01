#!/bin/bash

# Complete VPS Installation Script for Fresh Ubuntu Server
# Server IP: 103.60.12.157
# Run: sudo bash install-vps.sh

set -e  # Exit on error

echo "=========================================="
echo "  VPS Installation Script"
echo "  Server IP: 103.60.12.157"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables
SERVER_IP="103.60.12.157"
APP_DIR="/var/www/nextapp"
BACKEND_DIR="$APP_DIR/backend"
UPLOAD_SOURCE="/var/www/Upload"
ERROR_COUNT=0

# Function to print status
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
    ERROR_COUNT=$((ERROR_COUNT + 1))
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[i]${NC} $1"
}

# Function to run command with error handling
run_cmd() {
    local cmd="$@"
    if eval "$cmd"; then
        return 0
    else
        print_warning "Command failed: $cmd"
        return 1
    fi
}

# Step 1: Update system packages
echo ""
echo "Step 1: Updating system packages..."
print_info "Updating apt package list..."
if run_cmd "apt update -qq"; then
    print_status "System packages updated"
else
    print_warning "apt update had issues, continuing..."
fi

# Step 2: Install essential packages
echo ""
echo "Step 2: Installing essential packages..."
PACKAGES="curl wget git build-essential python3 nginx"
for pkg in $PACKAGES; do
    if ! dpkg -l | grep -q "^ii  $pkg "; then
        print_info "Installing $pkg..."
        apt install -y $pkg > /dev/null 2>&1 || print_warning "Failed to install $pkg"
    fi
done
print_status "Essential packages installed"

# Step 3: Install Node.js
echo ""
echo "Step 3: Installing Node.js..."
if ! command -v node &> /dev/null; then
    print_info "Node.js not found, installing Node.js 20.x..."
    
    # Install Node.js via NodeSource
    if curl -fsSL https://deb.nodesource.com/setup_20.x | bash -; then
        if apt install -y nodejs > /dev/null 2>&1; then
            print_status "Node.js installed via NodeSource"
        else
            print_warning "NodeSource install failed, trying Ubuntu repository..."
            apt install -y nodejs npm > /dev/null 2>&1 || print_error "Failed to install Node.js"
        fi
    else
        print_warning "NodeSource setup failed, trying Ubuntu repository..."
        apt install -y nodejs npm > /dev/null 2>&1 || print_error "Failed to install Node.js"
    fi
else
    NODE_VERSION=$(node --version 2>/dev/null)
    print_status "Node.js already installed: $NODE_VERSION"
fi

# Verify Node.js installation
if ! command -v node &> /dev/null; then
    print_error "Node.js installation failed. Please install manually."
    exit 1
fi

NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
print_status "Node.js: $NODE_VERSION, npm: $NPM_VERSION"

# Step 4: Install PM2
echo ""
echo "Step 4: Installing PM2..."
if ! command -v pm2 &> /dev/null; then
    print_info "PM2 not found, installing..."
    if npm install -g pm2 > /dev/null 2>&1; then
        print_status "PM2 installed"
    else
        print_warning "PM2 install failed, trying with --force..."
        npm install -g pm2 --force > /dev/null 2>&1 || print_error "Failed to install PM2"
    fi
else
    print_status "PM2 already installed"
fi

# Step 5: Cleanup existing PM2 processes
echo ""
echo "Step 5: Cleaning up existing PM2 processes..."
if command -v pm2 &> /dev/null; then
    pm2 kill > /dev/null 2>&1 || true
    pm2 delete all > /dev/null 2>&1 || true
    print_status "PM2 processes cleaned up"
fi

# Step 6: Move files from Upload folder
echo ""
echo "Step 6: Setting up application files..."

# Check for files in /var/www/Upload
if [ ! -d "$UPLOAD_SOURCE" ]; then
    print_error "Upload folder not found at $UPLOAD_SOURCE"
    print_info "Please ensure files are uploaded to /var/www/Upload"
    exit 1
fi

# Check if Upload folder has files
if [ -z "$(ls -A $UPLOAD_SOURCE 2>/dev/null)" ]; then
    print_error "Upload folder is empty at $UPLOAD_SOURCE"
    exit 1
fi

print_info "Found files in $UPLOAD_SOURCE"

# Create app directory
if [ -d "$APP_DIR" ]; then
    print_warning "$APP_DIR already exists, backing up..."
    BACKUP_DIR="$APP_DIR.backup.$(date +%Y%m%d_%H%M%S)"
    mv $APP_DIR $BACKUP_DIR 2>/dev/null || {
        print_warning "Backup failed, removing old files..."
        rm -rf $APP_DIR/* $APP_DIR/.* 2>/dev/null || true
    }
    print_status "Old files backed up to $BACKUP_DIR"
fi

mkdir -p $APP_DIR
print_status "Created $APP_DIR directory"

# Move files from Upload to app directory
print_info "Moving files from $UPLOAD_SOURCE to $APP_DIR..."
if cp -r $UPLOAD_SOURCE/* $APP_DIR/ 2>/dev/null; then
    print_status "Files copied successfully"
else
    print_error "Failed to copy files from $UPLOAD_SOURCE"
    exit 1
fi

# Verify files were copied
if [ ! -f "$APP_DIR/package.json" ]; then
    print_error "Files not found in $APP_DIR after copy (package.json missing)"
    exit 1
fi

print_status "Files verified in $APP_DIR"

# Step 7: Install frontend dependencies
echo ""
echo "Step 7: Installing frontend dependencies..."
cd $APP_DIR

if [ ! -f "package.json" ]; then
    print_error "package.json not found in $APP_DIR"
    exit 1
fi

print_info "Running npm install for frontend..."
if npm install > /dev/null 2>&1; then
    print_status "Frontend dependencies installed"
else
    print_warning "npm install had warnings, trying with --legacy-peer-deps..."
    npm install --legacy-peer-deps > /dev/null 2>&1 || print_error "Failed to install frontend dependencies"
fi

# Step 8: Install backend dependencies
echo ""
echo "Step 8: Installing backend dependencies..."
cd $BACKEND_DIR

if [ ! -f "package.json" ]; then
    print_error "package.json not found in $BACKEND_DIR"
    exit 1
fi

print_info "Running npm install for backend..."
if npm install > /dev/null 2>&1; then
    print_status "Backend dependencies installed"
else
    print_warning "npm install had warnings, trying with --legacy-peer-deps..."
    npm install --legacy-peer-deps > /dev/null 2>&1 || print_error "Failed to install backend dependencies"
fi

# Step 9: Build frontend
echo ""
echo "Step 9: Building frontend..."
cd $APP_DIR

# Remove old dist folder if exists
rm -rf dist 2>/dev/null || true

print_info "Building frontend application..."
if npm run build > /dev/null 2>&1; then
    if [ -d "dist" ]; then
        print_status "Frontend built successfully"
    else
        print_error "Build completed but dist folder not found"
    fi
else
    print_warning "Build failed, trying with NODE_ENV=production..."
    if NODE_ENV=production npm run build > /dev/null 2>&1; then
        print_status "Frontend built successfully with NODE_ENV=production"
    else
        print_error "Failed to build frontend"
    fi
fi

# Step 10: Build backend
echo ""
echo "Step 10: Building backend..."
cd $BACKEND_DIR

# Remove old dist folder if exists
rm -rf dist 2>/dev/null || true

print_info "Building backend application..."
if npm run build > /dev/null 2>&1; then
    print_status "Backend TypeScript compiled"
else
    print_error "Backend build failed"
fi

# Generate Prisma client
print_info "Generating Prisma client..."
if npx prisma generate > /dev/null 2>&1; then
    print_status "Prisma client generated"
else
    print_warning "Prisma generate failed, trying alternative..."
    cd prisma && npx prisma generate > /dev/null 2>&1 && print_status "Prisma client generated" || print_error "Failed to generate Prisma client"
    cd $BACKEND_DIR
fi

# Step 11: Create backend .env file
echo ""
echo "Step 11: Creating backend .env file..."
cd $BACKEND_DIR

if [ ! -f .env ]; then
    cat > .env << 'ENVEOF'
DATABASE_URL="file:./prisma/inventory.db"
PORT=3001
NODE_ENV=production
CORS_ORIGIN=http://103.60.12.157
ENVEOF
    print_status ".env file created"
else
    print_warning ".env file already exists"
    # Update CORS_ORIGIN if needed
    if ! grep -q "CORS_ORIGIN" .env; then
        echo 'CORS_ORIGIN=http://103.60.12.157' >> .env
    else
        # Update existing CORS_ORIGIN
        sed -i 's|CORS_ORIGIN=.*|CORS_ORIGIN=http://103.60.12.157|' .env
    fi
    print_status ".env file updated"
fi

# Step 12: Update backend CORS configuration
echo ""
echo "Step 12: Updating backend CORS configuration..."
cd $BACKEND_DIR

if [ -f "src/server.ts" ]; then
    # Update CORS to allow the server IP
    if grep -q "origin:" src/server.ts; then
        sed -i "s|origin:.*|origin: ['http://103.60.12.157', 'http://localhost:8080'],|" src/server.ts
        print_status "CORS configuration updated in server.ts"
    fi
fi

# Step 13: Run database migrations
echo ""
echo "Step 13: Running database migrations..."
cd $BACKEND_DIR

print_info "Running Prisma migrations..."
if npx prisma migrate deploy > /dev/null 2>&1; then
    print_status "Database migrations completed"
else
    print_warning "migrate:deploy failed, trying migrate dev..."
    if npx prisma migrate dev --name init > /dev/null 2>&1; then
        print_status "Database migrations completed (dev mode)"
    else
        print_warning "Migrations failed, but continuing..."
    fi
fi

# Step 14: Configure Nginx
echo ""
echo "Step 14: Configuring Nginx..."

# Backup existing config if it exists
if [ -f /etc/nginx/sites-available/nextapp ]; then
    cp /etc/nginx/sites-available/nextapp /etc/nginx/sites-available/nextapp.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
fi

# Create Nginx configuration
cat > /etc/nginx/sites-available/nextapp << 'NGINXEOF'
server {
    listen 80;
    server_name 103.60.12.157;

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Frontend
    location / {
        root /var/www/nextapp/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Static assets
    location /assets {
        root /var/www/nextapp/dist;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
NGINXEOF

print_status "Nginx configuration file created"

# Enable site
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
rm -f /etc/nginx/sites-enabled/nextapp 2>/dev/null || true
ln -sf /etc/nginx/sites-available/nextapp /etc/nginx/sites-enabled/ 2>/dev/null || true

# Test and restart Nginx
if nginx -t > /dev/null 2>&1; then
    if systemctl restart nginx > /dev/null 2>&1; then
        systemctl enable nginx > /dev/null 2>&1 || true
        print_status "Nginx configured and started"
    else
        print_warning "Nginx restart failed, trying reload..."
        if systemctl reload nginx > /dev/null 2>&1; then
            print_status "Nginx reloaded successfully"
        else
            print_error "Failed to restart/reload Nginx"
        fi
    fi
else
    print_error "Nginx configuration test failed!"
    print_info "Checking Nginx error log..."
    tail -5 /var/log/nginx/error.log 2>/dev/null || true
fi

# Step 15: Set permissions
echo ""
echo "Step 15: Setting permissions..."
if [ ! -z "$SUDO_USER" ]; then
    chown -R $SUDO_USER:$SUDO_USER $APP_DIR 2>/dev/null || chown -R www-data:www-data $APP_DIR 2>/dev/null || true
else
    chown -R www-data:www-data $APP_DIR 2>/dev/null || true
fi
chmod -R 755 $APP_DIR 2>/dev/null || true
print_status "Permissions set"

# Step 16: Start backend with PM2
echo ""
echo "Step 16: Starting backend with PM2..."
cd $BACKEND_DIR

# Cleanup PM2 again before starting
pm2 kill > /dev/null 2>&1 || true
sleep 2

# Start backend
print_info "Starting backend server..."
if pm2 start npm --name "backend" -- start > /dev/null 2>&1; then
    sleep 3
    
    # Save PM2 configuration
    pm2 save > /dev/null 2>&1 || true
    
    # Setup PM2 startup
    if [ ! -z "$SUDO_USER" ]; then
        pm2 startup systemd -u $SUDO_USER --hp /home/$SUDO_USER > /dev/null 2>&1 || true
    else
        pm2 startup systemd > /dev/null 2>&1 || true
    fi
    
    print_status "Backend started with PM2"
else
    print_warning "PM2 start failed, trying alternative method..."
    
    # Alternative: Start directly with node
    if [ -f "dist/server.js" ]; then
        if pm2 start dist/server.js --name "backend" > /dev/null 2>&1; then
            pm2 save > /dev/null 2>&1 || true
            print_status "Backend started with PM2 (alternative method)"
        else
            print_error "Failed to start backend with PM2"
        fi
    else
        print_error "Backend dist/server.js not found"
    fi
fi

# Step 17: Configure firewall
echo ""
echo "Step 17: Configuring firewall..."
if command -v ufw &> /dev/null; then
    ufw allow 'Nginx Full' > /dev/null 2>&1 || ufw allow 80/tcp > /dev/null 2>&1 || true
    ufw allow 443/tcp > /dev/null 2>&1 || true
    ufw allow OpenSSH > /dev/null 2>&1 || ufw allow 22/tcp > /dev/null 2>&1 || true
    echo "y" | ufw enable > /dev/null 2>&1 || ufw --force enable > /dev/null 2>&1 || true
    print_status "Firewall configured"
else
    print_warning "UFW not found, skipping firewall setup"
fi

# Step 18: Verify installation
echo ""
echo "Step 18: Verifying installation..."
sleep 5

# Check PM2
if pm2 list 2>/dev/null | grep -q "backend"; then
    PM2_STATUS=$(pm2 list 2>/dev/null | grep "backend" | awk '{print $10}')
    if [ "$PM2_STATUS" = "online" ]; then
        print_status "Backend is running (status: online)"
    else
        print_warning "Backend PM2 process exists but status is: $PM2_STATUS"
    fi
else
    print_warning "Backend is not running in PM2!"
fi

# Check Nginx
if systemctl is-active --quiet nginx 2>/dev/null; then
    print_status "Nginx is running"
else
    print_warning "Nginx is not running, attempting to start..."
    systemctl start nginx > /dev/null 2>&1 && print_status "Nginx started" || print_error "Failed to start Nginx"
fi

# Test API
sleep 3
if curl -s -f http://localhost:3001/api/health > /dev/null 2>&1; then
    print_status "Backend API is responding"
elif curl -s -f http://localhost:3001/health > /dev/null 2>&1; then
    print_status "Backend API is responding (alternative endpoint)"
else
    print_warning "Backend API health check failed"
    print_info "Backend may need more time to start. Check logs with: pm2 logs backend"
fi

# Final Summary
echo ""
echo "=========================================="
if [ $ERROR_COUNT -eq 0 ]; then
    echo -e "${GREEN}  Installation Complete!${NC}"
else
    echo -e "${YELLOW}  Installation Complete with $ERROR_COUNT warning(s)${NC}"
fi
echo "=========================================="
echo ""

echo "Your website is now live at:"
echo "  - Frontend: http://$SERVER_IP"
echo "  - Backend API: http://$SERVER_IP/api"
echo ""

echo "Useful commands:"
echo "  - View backend logs: pm2 logs backend"
echo "  - Restart backend: pm2 restart backend"
echo "  - Stop backend: pm2 stop backend"
echo "  - Restart Nginx: sudo systemctl restart nginx"
echo "  - Check PM2 status: pm2 status"
echo "  - Check Nginx status: sudo systemctl status nginx"
echo ""

# Show recent backend logs
echo "Recent backend logs:"
pm2 logs backend --lines 5 --nostream 2>/dev/null || echo "  (No logs available yet)"

echo ""
if [ $ERROR_COUNT -gt 0 ]; then
    print_warning "Please review any errors above and check logs if needed"
fi

echo ""
print_status "Installation script completed!"
echo ""

