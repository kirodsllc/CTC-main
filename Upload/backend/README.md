# Inventory ERP Backend

Backend API for the Inventory ERP System built with Node.js, Express, TypeScript, and PostgreSQL.

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and update with your database credentials:

```bash
cp .env.example .env
```

Edit `.env`:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=inventory_erp
DB_USER=postgres
DB_PASSWORD=your_password
PORT=3001
CORS_ORIGIN=http://localhost:5173
```

### 3. Create Database

Make sure PostgreSQL is installed and running. Create the database:

```bash
createdb inventory_erp
```

Or using psql:
```sql
CREATE DATABASE inventory_erp;
```

### 4. Run Migrations

```bash
npm run migrate
```

This will create all necessary tables for the Parts Management module.

### 5. Seed Initial Data (Optional)

```bash
npm run seed
```

This will add sample categories and brands.

### 6. Start Development Server

```bash
npm run dev
```

The server will start on http://localhost:3001

## API Endpoints

### Parts Management

- `GET /api/parts` - Get all parts (with filters and pagination)
- `GET /api/parts/:id` - Get single part by ID
- `POST /api/parts` - Create new part
- `PUT /api/parts/:id` - Update part
- `DELETE /api/parts/:id` - Delete part

### Dropdowns

- `GET /api/dropdowns/master-parts` - Get master part numbers
- `GET /api/dropdowns/brands` - Get all brands
- `GET /api/dropdowns/categories` - Get all categories
- `GET /api/dropdowns/subcategories?category_id=xxx` - Get subcategories by category
- `GET /api/dropdowns/applications?subcategory_id=xxx` - Get applications by subcategory
- `GET /api/dropdowns/parts?master_part_no=xxx` - Get parts by master part number

## Development

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run migrate` - Run database migrations
- `npm run seed` - Seed initial data

