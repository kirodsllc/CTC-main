#!/bin/bash

# Fix Server CORS Configuration Script
# This script fixes the corrupted CORS configuration in server.ts

set +e

echo "=========================================="
echo "  Fix Server CORS Configuration"
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

# Step 2: Backup server.ts
echo ""
echo "Step 2: Backing up server.ts..."
if [ -f "src/server.ts" ]; then
    cp src/server.ts src/server.ts.backup.$(date +%Y%m%d_%H%M%S)
    print_status "Backup created"
else
    print_error "server.ts not found!"
    exit 1
fi

# Step 3: Fix CORS configuration
echo ""
echo "Step 3: Fixing CORS configuration..."

# Read the file and fix the CORS section
# Find the CORS configuration block and replace it
cat > /tmp/fix_cors.js << 'FIXEOF'
const fs = require('fs');
const filePath = process.argv[2];
let content = fs.readFileSync(filePath, 'utf8');

// Fix the broken CORS configuration
const correctCors = `// Middleware - CORS configuration
const allowedOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : ['http://localhost:5173', 'http://localhost:8080'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // For development, allow all localhost origins
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        callback(null, true);
      } else {
        // In production, allow requests from same origin (when served through Nginx)
        // This allows the frontend served from the same domain to access the API
        const isProduction = process.env.NODE_ENV === 'production';
        if (isProduction) {
          // Allow if origin matches the server IP or domain
          const serverOrigin = process.env.SERVER_ORIGIN || 'http://103.60.12.157';
          if (origin.startsWith(serverOrigin) || origin.includes('103.60.12.157')) {
            callback(null, true);
            return;
          }
        }
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));`;

// Find and replace the broken CORS section
// Look for the pattern that indicates the broken CORS config
const corsStartPattern = /\/\/ Middleware - CORS configuration/;
const corsEndPattern = /app\.use\(express\.json/;

if (corsStartPattern.test(content) && corsEndPattern.test(content)) {
  // Extract everything before CORS and after express.json
  const beforeCors = content.substring(0, content.search(corsStartPattern));
  const afterExpress = content.substring(content.search(corsEndPattern));
  
  // Reconstruct with correct CORS
  content = beforeCors + correctCors + '\n' + afterExpress;
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('CORS configuration fixed');
} else {
  console.log('Could not find CORS section to fix');
  process.exit(1);
}
FIXEOF

# Run the fix script
if node /tmp/fix_cors.js src/server.ts; then
    print_status "CORS configuration fixed"
else
    print_warning "JavaScript fix failed, trying manual fix..."
    
    # Manual fix using sed - find the broken section and replace
    # This is a fallback method
    sed -i '/\/\/ Middleware - CORS configuration/,/app\.use(cors({/{
        /app\.use(cors({/{
            r /dev/stdin
        }
        d
    }' src/server.ts << 'CORSEOF'
// Middleware - CORS configuration
const allowedOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : ['http://localhost:5173', 'http://localhost:8080'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // For development, allow all localhost origins
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        callback(null, true);
      } else {
        // In production, allow requests from same origin (when served through Nginx)
        const isProduction = process.env.NODE_ENV === 'production';
        if (isProduction) {
          const serverOrigin = process.env.SERVER_ORIGIN || 'http://103.60.12.157';
          if (origin.startsWith(serverOrigin) || origin.includes('103.60.12.157')) {
            callback(null, true);
            return;
          }
        }
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
CORSEOF
    
    print_status "Manual fix applied"
fi

# Step 4: Verify the fix
echo ""
echo "Step 4: Verifying fix..."
if grep -q "origin: (origin, callback)" src/server.ts 2>/dev/null; then
    print_status "CORS configuration looks correct"
else
    print_error "CORS configuration still broken!"
    print_info "Checking file..."
    sed -n '28,65p' src/server.ts
    exit 1
fi

# Step 5: Remove old build
echo ""
echo "Step 5: Removing old build..."
rm -rf dist
print_status "Old build removed"

# Step 6: Rebuild backend
echo ""
echo "Step 6: Rebuilding backend..."
if npm run build 2>&1 | tee /tmp/backend-build.log; then
    print_status "Backend rebuilt"
else
    print_error "Build failed!"
    print_info "Build errors:"
    cat /tmp/backend-build.log | grep "error TS" | head -10
    exit 1
fi

# Step 7: Verify compiled code
echo ""
echo "Step 7: Verifying compiled code..."
if [ -f "dist/server.js" ]; then
    if node -c dist/server.js > /dev/null 2>&1; then
        print_status "Compiled code is valid"
    else
        print_error "Compiled code still has errors!"
        exit 1
    fi
else
    print_error "dist/server.js not found!"
    exit 1
fi

# Step 8: Start backend
echo ""
echo "Step 8: Starting backend..."
pm2 start dist/server.js --name "backend" > /dev/null 2>&1
sleep 5

# Step 9: Check status
echo ""
echo "Step 9: Checking backend status..."
if pm2 list | grep -q "backend"; then
    PM2_STATUS=$(pm2 list | grep "backend" | awk '{print $10}' | head -1)
    if [ "$PM2_STATUS" = "online" ]; then
        print_status "Backend is online"
    else
        print_error "Backend status: $PM2_STATUS"
        pm2 logs backend --lines 20 --nostream 2>&1 | tail -20
        exit 1
    fi
else
    print_error "Backend not found"
    exit 1
fi

# Step 10: Test backend
echo ""
echo "Step 10: Testing backend..."
sleep 2
if curl -s -f http://localhost:3001/health > /dev/null 2>&1; then
    print_status "Backend is responding"
    curl -s http://localhost:3001/health
else
    print_warning "Backend not responding yet"
fi

# Save PM2
pm2 save > /dev/null 2>&1 || true

echo ""
echo "=========================================="
echo -e "${GREEN}  Complete!${NC}"
echo "=========================================="
echo ""

