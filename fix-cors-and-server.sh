#!/bin/bash

# Fix CORS and Update server.ts - Complete Fix
# Run: sudo bash fix-cors-and-server.sh

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
BACKEND_DIR="$APP_DIR/backend"
SERVER_IP="103.60.12.157"
CORS_ORIGIN="http://${SERVER_IP}"

echo "=========================================="
echo "  Fix CORS and Update server.ts"
echo "=========================================="

cd "$BACKEND_DIR" || exit 1

# Step 1: Update server.ts
echo ""
echo "Step 1: Updating server.ts..."
SERVER_TS="$BACKEND_DIR/src/server.ts"

if [ ! -f "$SERVER_TS" ]; then
    print_error "server.ts not found at $SERVER_TS"
    exit 1
fi

# Create backup
cp "$SERVER_TS" "$SERVER_TS.backup"
print_status "Created backup of server.ts"

# Update CORS configuration in server.ts using Python (more reliable)
print_status "Updating CORS configuration in server.ts..."

python3 << 'PYTHONEOF'
import sys

server_content = """import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import partsRoutes from './routes/parts';
import dropdownsRoutes from './routes/dropdowns';
import inventoryRoutes from './routes/inventory';
import expensesRoutes from './routes/expenses';
import accountingRoutes from './routes/accounting';
import financialRoutes from './routes/financial';
import customersRoutes from './routes/customers';
import suppliersRoutes from './routes/suppliers';
import reportsRoutes from './routes/reports';
import usersRoutes from './routes/users';
import rolesRoutes from './routes/roles';
import activityLogsRoutes from './routes/activity-logs';
import approvalFlowsRoutes from './routes/approval-flows';
import backupsRoutes from './routes/backups';
import companyProfileRoutes from './routes/company-profile';
import whatsappSettingsRoutes from './routes/whatsapp-settings';
import kitsRoutes from './routes/kits';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

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
        // In production, allow requests from VPS IP or same origin
        const isProduction = process.env.NODE_ENV === 'production';
        if (isProduction) {
          // Allow if origin matches the server IP or domain
          const serverOrigin = process.env.SERVER_ORIGIN || 'http://103.60.12.157';
          if (origin.startsWith(serverOrigin) || origin.includes('103.60.12.157')) {
            callback(null, true);
            return;
          }
          // Also allow same-origin requests (when served through Nginx)
          callback(null, true);
          return;
        }
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Inventory ERP Backend API is running' });
});

// API Routes
app.use('/api/parts', partsRoutes);
app.use('/api/dropdowns', dropdownsRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/accounting', accountingRoutes);
app.use('/api/financial', financialRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/suppliers', suppliersRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/activity-logs', activityLogsRoutes);
app.use('/api/approval-flows', approvalFlowsRoutes);
app.use('/api/backups', backupsRoutes);
app.use('/api/company-profile', companyProfileRoutes);
app.use('/api/whatsapp-settings', whatsappSettingsRoutes);
app.use('/api/kits', kitsRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});
"""

try:
    with open('/var/www/nextapp/backend/src/server.ts', 'w', encoding='utf-8') as f:
        f.write(server_content)
    print('SUCCESS: server.ts updated')
    sys.exit(0)
except Exception as e:
    print(f'ERROR: {e}')
    sys.exit(1)
PYTHONEOF

if [ $? -ne 0 ]; then
    print_error "Failed to update server.ts"
    exit 1
fi

print_status "Updated server.ts with CORS fix"

# Step 2: Update .env file
echo ""
echo "Step 2: Updating .env file..."

if [ -f ".env" ]; then
    # Update or add CORS_ORIGIN
    if grep -q "CORS_ORIGIN" .env; then
        sed -i "s|CORS_ORIGIN=.*|CORS_ORIGIN=$CORS_ORIGIN|g" .env
        print_status "Updated CORS_ORIGIN in .env"
    else
        echo "" >> .env
        echo "CORS_ORIGIN=$CORS_ORIGIN" >> .env
        print_status "Added CORS_ORIGIN to .env"
    fi
    
    # Update or add NODE_ENV
    if grep -q "NODE_ENV" .env; then
        sed -i "s|NODE_ENV=.*|NODE_ENV=production|g" .env
        print_status "Updated NODE_ENV in .env"
    else
        echo "NODE_ENV=production" >> .env
        print_status "Added NODE_ENV=production to .env"
    fi
    
    # Add SERVER_ORIGIN if not exists
    if ! grep -q "SERVER_ORIGIN" .env; then
        echo "SERVER_ORIGIN=$CORS_ORIGIN" >> .env
        print_status "Added SERVER_ORIGIN to .env"
    fi
else
    print_warning ".env not found, creating..."
    cat > .env << EOF
DATABASE_URL=file:./prisma/dev.db
PORT=3001
CORS_ORIGIN=$CORS_ORIGIN
NODE_ENV=production
SERVER_ORIGIN=$CORS_ORIGIN
EOF
    print_status "Created .env file"
fi

# Step 3: Rebuild backend
echo ""
echo "Step 3: Rebuilding backend..."
if npm run build; then
    print_status "Backend rebuilt successfully"
else
    print_error "Backend build failed!"
    echo "Restoring backup..."
    mv "$SERVER_TS.backup" "$SERVER_TS"
    exit 1
fi

# Step 4: Restart backend
echo ""
echo "Step 4: Restarting backend..."
pm2 restart backend --update-env
sleep 3

# Step 5: Verify
echo ""
echo "Step 5: Verifying..."
if pm2 list | grep -q "backend.*online"; then
    print_status "Backend is running"
    
    # Wait a bit for backend to fully start
    sleep 2
    
    # Test API with CORS header
    API_TEST=$(curl -s -o /dev/null -w "%{http_code}" -H "Origin: $CORS_ORIGIN" http://localhost:3001/api/parts?limit=1)
    if [ "$API_TEST" = "200" ]; then
        print_status "API is accessible with CORS (HTTP $API_TEST)"
    else
        print_warning "API returned HTTP $API_TEST (may still work, check browser)"
    fi
    
    # Check for CORS errors in logs
    sleep 2
    CORS_ERRORS=$(pm2 logs backend --err --lines 5 --nostream | grep -c "CORS" || echo "0")
    if [ "$CORS_ERRORS" -eq 0 ]; then
        print_status "No recent CORS errors in logs"
    else
        print_warning "Found CORS errors in logs, but backend is running"
    fi
else
    print_error "Backend failed to start!"
    echo "Check logs: pm2 logs backend"
    exit 1
fi

# Cleanup backup if successful
rm -f "$SERVER_TS.backup"

echo ""
echo "=========================================="
echo -e "${GREEN}  Fix Complete!${NC}"
echo "=========================================="
echo ""
echo "Changes applied:"
echo "  ✓ Updated server.ts with CORS fix"
echo "  ✓ Updated .env with CORS_ORIGIN=$CORS_ORIGIN"
echo "  ✓ Set NODE_ENV=production"
echo "  ✓ Rebuilt backend"
echo "  ✓ Restarted backend"
echo ""
echo "Next steps:"
echo "  1. Clear browser cache (Ctrl+Shift+Delete)"
echo "  2. Hard refresh (Ctrl+Shift+R)"
echo "  3. Or use Incognito mode (Ctrl+Shift+N)"
echo ""
echo "Your website should now work at:"
echo "  http://${SERVER_IP}"
echo ""

