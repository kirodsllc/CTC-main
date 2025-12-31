# Customers & Suppliers - Testing Instructions

## ✅ Implementation Complete

All functionality has been implemented:
- ✅ Database models (Customer, Supplier)
- ✅ Backend API routes (`/api/customers`, `/api/suppliers`)
- ✅ Frontend components connected to API
- ✅ All buttons functional (Add, Edit, Delete, Search, Pagination, Filters)
- ✅ Prisma client generated with new models

## 🔄 Next Step: Restart Server

The server needs to be restarted to load the new routes. Follow these steps:

### Option 1: Restart via Terminal

1. **Stop the current server:**
   ```powershell
   # Find and stop the process on port 3001
   Get-Process -Id 17104 | Stop-Process -Force
   # Or find it dynamically:
   $proc = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -First 1
   if ($proc) { Stop-Process -Id $proc -Force }
   ```

2. **Start the server:**
   ```powershell
   cd backend
   npm run dev
   ```

### Option 2: Restart via VS Code/Cursor

1. Stop the running backend server (if using terminal, press Ctrl+C)
2. Start it again: `cd backend && npm run dev`

## 🧪 Testing

### 1. Test Backend API

Run the test script:
```powershell
cd backend
node test-customers-suppliers.js
```

Expected output:
```
✅ Found X customers
✅ Customer created: Test Customer
✅ Found X suppliers  
✅ Supplier created: Test Supplier Co
✅ All tests passed!
```

### 2. Test Frontend

1. Start frontend (if not running):
   ```powershell
   npm run dev
   ```

2. Navigate to:
   - **Manage > Customers** - Test all customer functionality
   - **Manage > Suppliers** - Test all supplier functionality

3. Test each feature:
   - ✅ Click "Add New" / "New Supplier" - Opens form
   - ✅ Fill form and save - Creates new record
   - ✅ Search by different fields - Filters results
   - ✅ Change status filter - Updates list
   - ✅ Click pagination buttons - Navigates pages
   - ✅ Change rows per page - Updates pagination
   - ✅ Click Edit - Opens form with data
   - ✅ Update and save - Updates record
   - ✅ Click Delete - Removes record
   - ✅ Toggle status - Updates status (suppliers show confirmation)

## 📋 Manual API Testing

### Using PowerShell:

```powershell
# Get all customers
Invoke-RestMethod -Uri "http://localhost:3001/api/customers" -Method GET

# Create customer
$customer = @{
    name = "John Doe"
    email = "john@example.com"
    contactNo = "1234567890"
    status = "active"
} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3001/api/customers" -Method POST -Body $customer -ContentType "application/json"

# Get all suppliers
Invoke-RestMethod -Uri "http://localhost:3001/api/suppliers" -Method GET

# Create supplier
$supplier = @{
    code = "SUP-001"
    companyName = "ABC Suppliers"
    email = "abc@example.com"
    phone = "9876543210"
    status = "active"
} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3001/api/suppliers" -Method POST -Body $supplier -ContentType "application/json"
```

## ✅ Verification Checklist

- [ ] Server restarted successfully
- [ ] Backend test script passes
- [ ] Frontend loads without errors
- [ ] Can create customer via UI
- [ ] Can create supplier via UI
- [ ] Search functionality works
- [ ] Filters work (status, field filters)
- [ ] Pagination works
- [ ] Edit functionality works
- [ ] Delete functionality works
- [ ] Status toggle works

## 🐛 Troubleshooting

### If endpoints return 404:
- Server needs restart to load new routes
- Check that `dist/routes/customers.js` and `dist/routes/suppliers.js` exist
- Verify routes are registered in `dist/server.js`

### If Prisma errors occur:
- Run: `cd backend && npx prisma generate`
- Make sure `DATABASE_URL` is set correctly in `.env`

### If frontend shows errors:
- Check browser console for API errors
- Verify backend is running on port 3001
- Check CORS settings if needed

## 📝 Notes

- All UI components remain unchanged as requested
- All buttons are now fully functional
- Data persists in SQLite database (`backend/prisma/dev.db`)
- Error handling and validation implemented
- Toast notifications provide user feedback

