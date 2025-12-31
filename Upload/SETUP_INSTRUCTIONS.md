# Complete System Setup Instructions

## Overview

This guide will help you set up both the backend and frontend for the Inventory ERP system.

## Part 1: Backend Setup

### Step 1: Install PostgreSQL

**Windows:**
1. Download from https://www.postgresql.org/download/windows/
2. Install with default settings
3. Remember the password you set for the `postgres` user

**Mac:**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### Step 2: Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE inventory_erp;

# Exit
\q
```

### Step 3: Setup Backend

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create .env file (copy from .env.example and update)
# Edit .env and set your PostgreSQL password

# Run migrations
npm run migrate

# Seed initial data (optional)
npm run seed

# Start backend server
npm run dev
```

The backend should now be running on http://localhost:3001

## Part 2: Frontend Setup

### Step 1: Install Frontend Dependencies

```bash
# From project root
npm install
```

### Step 2: Configure API URL

The frontend is already configured to use `http://localhost:3001/api` by default.

If you need to change it, create a `.env` file in the project root:

```env
VITE_API_URL=http://localhost:3001/api
```

### Step 3: Start Frontend

```bash
npm run dev
```

The frontend should now be running on http://localhost:5173

## Part 3: Testing

### Test Backend API

1. Open http://localhost:3001/health - Should return `{"status":"ok",...}`
2. Open http://localhost:3001/api/dropdowns/categories - Should return categories array
3. Open http://localhost:3001/api/dropdowns/brands - Should return brands array

### Test Frontend

1. Open http://localhost:5173
2. Navigate to "Parts" in the sidebar
3. Try creating a new part:
   - Fill in Part No (required)
   - Fill in Brand (required)
   - Fill in Cost (required)
   - Click "Save"
4. Check if the part appears in the Parts List on the right

### Test Database

```bash
# Connect to database
psql -U postgres -d inventory_erp

# Check if parts table exists
\dt

# View parts
SELECT * FROM parts;

# View categories
SELECT * FROM categories;

# View brands
SELECT * FROM brands;

# Exit
\q
```

## Troubleshooting

### Backend won't start

1. Check PostgreSQL is running:
   ```bash
   pg_isready
   ```

2. Verify database exists:
   ```bash
   psql -U postgres -l | grep inventory_erp
   ```

3. Check .env file has correct credentials

4. Check port 3001 is not in use:
   ```bash
   # Windows
   netstat -ano | findstr :3001
   
   # Mac/Linux
   lsof -i :3001
   ```

### Frontend can't connect to backend

1. Verify backend is running on http://localhost:3001
2. Check browser console for CORS errors
3. Verify CORS_ORIGIN in backend .env matches frontend URL
4. Check network tab in browser dev tools

### Database errors

1. Make sure migrations ran successfully:
   ```bash
   cd backend
   npm run migrate
   ```

2. Check database connection:
   ```bash
   psql -U postgres -d inventory_erp -c "SELECT 1;"
   ```

3. Verify user has proper permissions

## Quick Start Commands

```bash
# Terminal 1: Start Backend
cd backend
npm install
npm run migrate
npm run dev

# Terminal 2: Start Frontend
npm install
npm run dev
```

## Next Steps

Once everything is working:
1. ✅ Backend API is running
2. ✅ Database is connected
3. ✅ Frontend can create/read parts
4. ✅ Data persists in database

You can now proceed to the next module!

