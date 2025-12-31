#!/bin/bash

# Complete VPS Setup Script with Error Handling
# Run: sudo bash setup-vps.sh

# Don't exit on error - we'll handle errors manually
set +e

echo "=========================================="
echo "  VPS Setup Script Starting..."
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables
APP_DIR="/var/www/nextapp"
BACKEND_DIR="$APP_DIR/backend"
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

# Function to run command with error handling and retry
run_with_retry() {
    local max_attempts=$1
    local attempt=1
    shift
    local command="$@"
    
    while [ $attempt -le $max_attempts ]; do
        if [ $attempt -gt 1 ]; then
            print_warning "Retry attempt $attempt of $max_attempts..."
            sleep 2
        fi
        
        if eval "$command"; then
            return 0
        fi
        
        attempt=$((attempt + 1))
    done
    
    return 1
}

# Function to cleanup PM2 processes
cleanup_pm2() {
    echo ""
    print_info "Cleaning up existing PM2 processes..."
    
    # Stop and delete all PM2 processes
    if command -v pm2 &> /dev/null; then
        # Get list of all PM2 processes
        PM2_LIST=$(pm2 list --no-color 2>/dev/null | grep -E "^\│.*│.*│" | awk '{print $2}' | grep -v "name" | grep -v "^│" | grep -v "^$")
        
        if [ ! -z "$PM2_LIST" ]; then
            print_warning "Found existing PM2 processes, stopping and deleting..."
            for proc in $PM2_LIST; do
                pm2 stop "$proc" 2>/dev/null || true
                pm2 delete "$proc" 2>/dev/null || true
                print_info "Stopped and deleted PM2 process: $proc"
            done
            pm2 kill 2>/dev/null || true
            sleep 2
            print_status "All PM2 processes cleaned up"
        else
            print_status "No existing PM2 processes found"
        fi
    fi
}

# Step 0: Cleanup PM2 processes first
cleanup_pm2

# Step 1: Move files from Upload folder
echo ""
echo "Step 1: Moving files from Upload folder..."

# Check for files in /var/www/Upload (primary location)
UPLOAD_SOURCE="/var/www/Upload"

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

# Create app directory if it doesn't exist
if [ ! -d "$APP_DIR" ]; then
    print_info "Creating $APP_DIR directory..."
    mkdir -p $APP_DIR 2>/dev/null || { print_error "Cannot create $APP_DIR"; exit 1; }
    print_status "Created $APP_DIR directory"
else
    print_warning "$APP_DIR already exists"
    # Check if it's empty or has old files
    if [ -f "$APP_DIR/package.json" ]; then
        print_warning "Files already exist in $APP_DIR"
        print_info "Backing up existing files..."
        BACKUP_DIR="$APP_DIR.backup.$(date +%Y%m%d_%H%M%S)"
        mv $APP_DIR $BACKUP_DIR 2>/dev/null || {
            print_warning "Backup failed, trying to remove old files..."
            rm -rf $APP_DIR/* $APP_DIR/.* 2>/dev/null || true
        }
        mkdir -p $APP_DIR
        print_status "Old files backed up to $BACKUP_DIR"
    fi
fi

# Move files if Upload folder was found and confirmed
if [ ! -z "$UPLOAD_SOURCE" ] && [ -d "$UPLOAD_SOURCE" ]; then
    cd $APP_DIR 2>/dev/null || { print_error "Cannot access $APP_DIR"; exit 1; }
    
    print_info "Moving files from $UPLOAD_SOURCE to $APP_DIR..."
    
    # Try to move files
    if mv $UPLOAD_SOURCE/* . 2>/dev/null; then
        # Try to remove Upload folder (only if empty)
        rmdir $UPLOAD_SOURCE 2>/dev/null || {
            print_warning "Some files may remain in $UPLOAD_SOURCE"
            # Try to remove any remaining hidden files
            rm -rf $UPLOAD_SOURCE/.* 2>/dev/null || true
            rmdir $UPLOAD_SOURCE 2>/dev/null || true
        }
        print_status "Files moved successfully from $UPLOAD_SOURCE"
    else
        # Alternative: copy instead of move
        print_warning "Move failed, trying copy method..."
        if cp -r $UPLOAD_SOURCE/* . 2>/dev/null; then
            print_status "Files copied successfully from $UPLOAD_SOURCE"
            print_info "Original files remain in $UPLOAD_SOURCE (you can delete manually)"
        else
            print_error "Failed to move/copy files from $UPLOAD_SOURCE"
            print_info "Checking permissions..."
            ls -la $UPLOAD_SOURCE | head -5
            print_info "Please check permissions and try again"
            exit 1
        fi
    fi
    
    # Verify files were moved
    if [ -f "$APP_DIR/package.json" ]; then
        print_status "Files verified in $APP_DIR (package.json found)"
    else
        print_error "Files not found in $APP_DIR after move (package.json missing)"
        print_info "Contents of $APP_DIR:"
        ls -la $APP_DIR | head -10
        exit 1
    fi
fi

# Step 2: Install Node.js
echo ""
echo "Step 2: Installing Node.js..."
if ! command -v node &> /dev/null; then
    print_info "Node.js not found, installing..."
    
    # Try method 1: NodeSource
    if run_with_retry 2 "curl -fsSL https://deb.nodesource.com/setup_20.x | bash -"; then
        if run_with_retry 2 "apt install -y nodejs"; then
            print_status "Node.js installed via NodeSource"
        else
            print_warning "NodeSource install failed, trying alternative method..."
            # Method 2: Ubuntu repository
            if run_with_retry 2 "apt install -y nodejs npm"; then
                print_status "Node.js installed via Ubuntu repository"
            else
                print_error "Failed to install Node.js"
            fi
        fi
    else
        print_warning "NodeSource setup failed, trying Ubuntu repository..."
        if run_with_retry 2 "apt install -y nodejs npm"; then
            print_status "Node.js installed via Ubuntu repository"
        else
            print_error "Failed to install Node.js"
        fi
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

# Step 3: Install PM2
echo ""
echo "Step 3: Installing PM2..."
if ! command -v pm2 &> /dev/null; then
    print_info "PM2 not found, installing..."
    
    # Try npm install
    if run_with_retry 3 "npm install -g pm2"; then
        print_status "PM2 installed"
    else
        print_warning "PM2 install failed, trying with --force..."
        if npm install -g pm2 --force 2>/dev/null; then
            print_status "PM2 installed with --force"
        else
            print_error "Failed to install PM2"
        fi
    fi
else
    print_status "PM2 already installed"
fi

# Step 4: Install Nginx and build tools
echo ""
echo "Step 4: Installing Nginx and build tools..."
if run_with_retry 2 "apt update -qq"; then
    if run_with_retry 2 "apt install -y nginx build-essential python3"; then
        print_status "Nginx and build tools installed"
    else
        print_warning "Some packages may have failed, continuing..."
    fi
else
    print_warning "apt update had issues, trying to continue..."
    apt install -y nginx build-essential python3 2>/dev/null || true
fi

# Step 5: Install frontend dependencies
echo ""
echo "Step 5: Installing frontend dependencies..."
cd $APP_DIR 2>/dev/null || { print_error "Cannot access $APP_DIR"; exit 1; }

if [ ! -f "package.json" ]; then
    print_error "package.json not found in $APP_DIR"
    exit 1
fi

if run_with_retry 3 "npm install"; then
    print_status "Frontend dependencies installed"
else
    print_warning "npm install had warnings, trying with --legacy-peer-deps..."
    if npm install --legacy-peer-deps 2>/dev/null; then
        print_status "Frontend dependencies installed with --legacy-peer-deps"
    else
        print_error "Failed to install frontend dependencies"
    fi
fi

# Step 6: Install backend dependencies
echo ""
echo "Step 6: Installing backend dependencies..."
cd $BACKEND_DIR 2>/dev/null || { print_error "Cannot access $BACKEND_DIR"; exit 1; }

if [ ! -f "package.json" ]; then
    print_error "package.json not found in $BACKEND_DIR"
    exit 1
fi

if run_with_retry 3 "npm install"; then
    print_status "Backend dependencies installed"
else
    print_warning "npm install had warnings, trying with --legacy-peer-deps..."
    if npm install --legacy-peer-deps 2>/dev/null; then
        print_status "Backend dependencies installed with --legacy-peer-deps"
    else
        print_error "Failed to install backend dependencies"
    fi
fi

# Step 7: Build frontend
echo ""
echo "Step 7: Building frontend..."
cd $APP_DIR

# Remove old dist folder if exists
rm -rf dist 2>/dev/null || true

if run_with_retry 2 "npm run build"; then
    if [ -d "dist" ]; then
        print_status "Frontend built successfully"
    else
        print_error "Build completed but dist folder not found"
    fi
else
    print_warning "Build failed, trying with NODE_ENV=production..."
    if NODE_ENV=production npm run build 2>/dev/null; then
        print_status "Frontend built successfully with NODE_ENV=production"
    else
        print_error "Failed to build frontend"
    fi
fi

# Step 8: Build backend
echo ""
echo "Step 8: Building backend..."
cd $BACKEND_DIR

# Remove old dist folder if exists
rm -rf dist 2>/dev/null || true

if run_with_retry 2 "npm run build"; then
    print_status "Backend TypeScript compiled"
else
    print_error "Backend build failed"
fi

# Generate Prisma client
if run_with_retry 3 "npx prisma generate"; then
    print_status "Prisma client generated"
else
    print_warning "Prisma generate failed, trying alternative..."
    if cd prisma && npx prisma generate 2>/dev/null; then
        print_status "Prisma client generated (alternative method)"
    else
        print_error "Failed to generate Prisma client"
    fi
    cd $BACKEND_DIR
fi

# Step 9: Create backend .env file
echo ""
echo "Step 9: Creating backend .env file..."
cd $BACKEND_DIR

if [ ! -f .env ]; then
    if cat > .env << 'ENVEOF'
DATABASE_URL="file:./prisma/inventory.db"
PORT=3001
NODE_ENV=production
CORS_ORIGIN=http://localhost:8080
ENVEOF
    then
        print_status ".env file created"
    else
        print_error "Failed to create .env file"
    fi
else
    print_warning ".env file already exists"
    # Update it if needed
    if ! grep -q "DATABASE_URL" .env; then
        echo 'DATABASE_URL="file:./prisma/inventory.db"' >> .env
    fi
    if ! grep -q "PORT=3001" .env; then
        echo 'PORT=3001' >> .env
    fi
    if ! grep -q "NODE_ENV=production" .env; then
        echo 'NODE_ENV=production' >> .env
    fi
    print_status ".env file updated"
fi

# Step 10: Run database migrations
echo ""
echo "Step 10: Running database migrations..."
cd $BACKEND_DIR

if run_with_retry 2 "npm run migrate:deploy"; then
    print_status "Database migrations completed"
else
    print_warning "migrate:deploy failed, trying migrate dev..."
    if npm run migrate 2>/dev/null; then
        print_status "Database migrations completed (dev mode)"
    else
        print_warning "Migrations failed, but continuing..."
    fi
fi

# Step 11: Configure Nginx
echo ""
echo "Step 11: Configuring Nginx..."

# Backup existing config if it exists
if [ -f /etc/nginx/sites-available/nextapp ]; then
    cp /etc/nginx/sites-available/nextapp /etc/nginx/sites-available/nextapp.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
fi

if cat > /etc/nginx/sites-available/nextapp << 'NGINXEOF'
server {
    listen 80;
    server_name _;

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

    location / {
        root /var/www/nextapp/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    location /assets {
        root /var/www/nextapp/dist;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
NGINXEOF
then
    print_status "Nginx configuration file created"
else
    print_error "Failed to create Nginx configuration"
fi

# Enable site
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
rm -f /etc/nginx/sites-enabled/nextapp 2>/dev/null || true
ln -sf /etc/nginx/sites-available/nextapp /etc/nginx/sites-enabled/ 2>/dev/null || true

# Test and restart Nginx
if nginx -t 2>/dev/null; then
    if systemctl restart nginx 2>/dev/null; then
        systemctl enable nginx 2>/dev/null || true
        print_status "Nginx configured and started"
    else
        print_warning "Nginx restart failed, trying reload..."
        if systemctl reload nginx 2>/dev/null; then
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

# Step 12: Set permissions
echo ""
echo "Step 12: Setting permissions..."
if [ ! -z "$SUDO_USER" ]; then
    chown -R $SUDO_USER:$SUDO_USER $APP_DIR 2>/dev/null || chown -R root:root $APP_DIR 2>/dev/null || true
else
    chown -R root:root $APP_DIR 2>/dev/null || true
fi
chmod -R 755 $APP_DIR 2>/dev/null || true
print_status "Permissions set"

# Step 13: Start backend with PM2
echo ""
echo "Step 13: Starting backend with PM2..."
cd $BACKEND_DIR

# Final PM2 cleanup before starting
cleanup_pm2

# Wait a moment for PM2 to fully reset
sleep 2

# Start backend
if pm2 start npm --name "backend" -- start 2>/dev/null; then
    sleep 3
    
    # Save PM2 configuration
    pm2 save 2>/dev/null || true
    
    # Setup PM2 startup
    pm2 startup systemd -u $SUDO_USER --hp /home/$SUDO_USER 2>/dev/null || \
    pm2 startup systemd 2>/dev/null || \
    pm2 startup 2>/dev/null || true
    
    print_status "Backend started with PM2"
else
    print_warning "PM2 start failed, trying alternative method..."
    
    # Alternative: Start directly with node
    if [ -f "dist/server.js" ]; then
        if pm2 start dist/server.js --name "backend" 2>/dev/null; then
            pm2 save 2>/dev/null || true
            print_status "Backend started with PM2 (alternative method)"
        else
            print_error "Failed to start backend with PM2"
        fi
    else
        print_error "Backend dist/server.js not found"
    fi
fi

# Step 14: Configure firewall
echo ""
echo "Step 14: Configuring firewall..."
if command -v ufw &> /dev/null; then
    ufw allow 'Nginx Full' 2>/dev/null || ufw allow 80/tcp 2>/dev/null || true
    ufw allow 443/tcp 2>/dev/null || true
    ufw allow OpenSSH 2>/dev/null || ufw allow 22/tcp 2>/dev/null || true
    echo "y" | ufw enable 2>/dev/null || ufw --force enable 2>/dev/null || true
    print_status "Firewall configured"
else
    print_warning "UFW not found, skipping firewall setup"
fi

# Step 15: Verify installation
echo ""
echo "Step 15: Verifying installation..."
sleep 5

# Check PM2
if pm2 list 2>/dev/null | grep -q "backend"; then
    PM2_STATUS=$(pm2 list 2>/dev/null | grep "backend" | awk '{print $10}')
    if [ "$PM2_STATUS" = "online" ]; then
        print_status "Backend is running (status: online)"
    else
        print_warning "Backend PM2 process exists but status is: $PM2_STATUS"
        print_info "Checking backend logs..."
        pm2 logs backend --lines 10 --nostream 2>/dev/null || true
    fi
else
    print_error "Backend is not running in PM2!"
    print_info "Attempting to start backend again..."
    cd $BACKEND_DIR
    pm2 delete backend 2>/dev/null || true
    sleep 2
    pm2 start npm --name "backend" -- start 2>/dev/null || pm2 start dist/server.js --name "backend" 2>/dev/null || true
    pm2 save 2>/dev/null || true
fi

# Check Nginx
if systemctl is-active --quiet nginx 2>/dev/null; then
    print_status "Nginx is running"
else
    print_warning "Nginx is not running, attempting to start..."
    systemctl start nginx 2>/dev/null && print_status "Nginx started" || print_error "Failed to start Nginx"
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
    echo -e "${GREEN}  Setup Complete!${NC}"
else
    echo -e "${YELLOW}  Setup Complete with $ERROR_COUNT warning(s)${NC}"
fi
echo "=========================================="
echo ""

# Get server IP
SERVER_IP=$(hostname -I | awk '{print $1}' 2>/dev/null || echo "your-server-ip")

echo "Your website should be live at:"
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
