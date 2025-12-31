# Backend Setup Guide

## Prerequisites

1. **Node.js** (v18 or higher)
2. **PostgreSQL** (v12 or higher)
3. **npm** or **yarn**

## Step-by-Step Setup

### 1. Install Backend Dependencies

```bash
cd backend
npm install
```

### 2. Create PostgreSQL Database

Make sure PostgreSQL is installed and running. Then create the database:

**Option A: Using psql command line**
```bash
psql -U postgres
CREATE DATABASE inventory_erp;
\q
```

**Option B: Using createdb command**
```bash
createdb -U postgres inventory_erp
```

### 3. Configure Environment Variables

Create a `.env` file in the `backend` directory:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=inventory_erp
DB_USER=postgres
DB_PASSWORD=your_postgres_password

# Server Configuration
PORT=3001
NODE_ENV=development

# CORS Configuration
CORS_ORIGIN=http://localhost:5173
```

**Important:** Replace `your_postgres_password` with your actual PostgreSQL password.

### 4. Run Database Migrations

This will create all necessary tables:

```bash
npm run migrate
```

You should see:
```
🔄 Starting database migration...
✅ Migration completed successfully!
✅ Migration process completed
```

### 5. Seed Initial Data (Optional)

This adds sample categories and brands:

```bash
npm run seed
```

You should see:
```
🌱 Starting database seeding...
✅ Seeding completed successfully!
✅ Seed process completed
```

### 6. Start the Backend Server

```bash
npm run dev
```

You should see:
```
🚀 Server is running on http://localhost:3001
📊 Health check: http://localhost:3001/health
✅ Database connected successfully
```

### 7. Test the API

Open your browser or use curl:

```bash
# Health check
curl http://localhost:3001/health

# Get all parts (should return empty array initially)
curl http://localhost:3001/api/parts

# Get categories
curl http://localhost:3001/api/dropdowns/categories

# Get brands
curl http://localhost:3001/api/dropdowns/brands
```

## Troubleshooting

### Database Connection Error

If you see "Database connection failed":
1. Check PostgreSQL is running: `pg_isready`
2. Verify database exists: `psql -U postgres -l | grep inventory_erp`
3. Check credentials in `.env` file
4. Verify PostgreSQL is listening on the correct port (default: 5432)

### Migration Errors

If migrations fail:
1. Make sure database exists
2. Check database user has CREATE privileges
3. Try dropping and recreating the database:
   ```sql
   DROP DATABASE inventory_erp;
   CREATE DATABASE inventory_erp;
   ```

### Port Already in Use

If port 3001 is already in use:
1. Change PORT in `.env` file
2. Or kill the process using port 3001:
   ```bash
   # Windows
   netstat -ano | findstr :3001
   taskkill /PID <PID> /F
   
   # Linux/Mac
   lsof -ti:3001 | xargs kill
   ```

## Next Steps

Once the backend is running:
1. Update frontend `.env` or `vite.config.ts` to point to the API
2. Test creating a part from the frontend
3. Verify data is saved in the database

## Database Schema

The migration creates these tables:
- `master_parts` - Master part numbers
- `brands` - Brand names
- `categories` - Part categories
- `subcategories` - Subcategories (linked to categories)
- `applications` - Applications (linked to subcategories)
- `parts` - Main parts table
- `models` - Models linked to parts

