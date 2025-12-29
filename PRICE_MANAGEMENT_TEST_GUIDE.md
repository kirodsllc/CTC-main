# Stock Price Management - Testing Guide

## Overview
The Stock Price Management system is now fully functional with the following features:
- Fetch parts with stock quantities
- Individual price updates
- Bulk price updates (percentage or fixed amount)
- Price update history tracking
- Export functionality

## Prerequisites

1. **Run Database Migration**
   ```bash
   cd backend
   npm run migrate
   ```
   This will create the `PriceHistory` table in the database.

2. **Start Backend Server**
   ```bash
   cd backend
   npm run dev
   ```
   Server should be running on `http://localhost:3001`

3. **Start Frontend** (in a separate terminal)
   ```bash
   npm run dev
   ```

## Manual Testing Steps

### 1. Test Fetching Parts for Price Management

**Using Browser:**
- Navigate to: `http://localhost:3001/api/parts/price-management?limit=10`
- Should return JSON with parts data including: id, partNo, description, category, qty, cost, priceA, priceB

**Using curl:**
```bash
curl http://localhost:3001/api/parts/price-management?limit=10
```

### 2. Test Individual Price Update

**Using curl:**
```bash
# Replace {PART_ID} with an actual part ID from step 1
curl -X PUT http://localhost:3001/api/parts/{PART_ID}/prices \
  -H "Content-Type: application/json" \
  -d '{
    "cost": 1500,
    "priceA": 2000,
    "reason": "Manual price adjustment",
    "updated_by": "Test User"
  }'
```

### 3. Test Bulk Price Update

**Using curl:**
```bash
curl -X POST http://localhost:3001/api/parts/bulk-update-prices \
  -H "Content-Type: application/json" \
  -d '{
    "part_ids": ["PART_ID_1", "PART_ID_2"],
    "price_field": "priceA",
    "update_type": "percentage",
    "update_value": 10,
    "reason": "Market price increase - 10%",
    "updated_by": "Admin"
  }'
```

### 4. Test Price History

**Using Browser:**
- Navigate to: `http://localhost:3001/api/parts/price-history?limit=10`
- Should return JSON with price update history

**Using curl:**
```bash
curl http://localhost:3001/api/parts/price-history?limit=10
```

## Frontend Testing

### 1. Access Price Management Page
- Navigate to Inventory → Price Control (or "$ Price Control" in navigation)
- You should see the Price Editor tab

### 2. Test Data Loading
- The page should automatically load parts with their current prices
- Check that:
  - Total Items count is correct
  - Parts are displayed in the table
  - Current prices (Cost, Price A, Price B) are shown

### 3. Test Individual Price Editing
- Click on any "NEW COST", "NEW A", or "NEW B" input field
- Enter a new value
- The row should highlight in green (indicating modification)
- Modified count should increase

### 4. Test Bulk Price Update
- Select one or more parts using checkboxes
- Choose a Price Field (Cost, Price A, Price B, or All Prices)
- Choose Update Type (Percentage or Fixed Amount)
- Enter a value (e.g., 10 for 10% increase)
- Enter a reason (required)
- Click "Apply to Selected"
- Verify that selected items show updated values in green

### 5. Test Apply Changes
- After making modifications, click "Apply X Changes" button
- Changes should be saved to the database
- Page should refresh with updated data
- Modified count should reset to 0

### 6. Test Reset All
- Make some modifications
- Click "Reset All"
- All changes should be reverted
- Modified count should be 0

### 7. Test Search and Filter
- Use the search box to filter by part number or description
- Use category dropdown to filter by category
- Verify results update correctly

### 8. Test Export
- Click "Export" button
- Should download a CSV file with all price data

### 9. Test Update History Tab
- Click "Update History" tab
- Should display a table with:
  - Date & Time
  - Items Updated
  - Price Field
  - Update Type
  - Value
  - Reason
  - Updated By

## Expected Behavior

### Success Cases:
- ✅ Parts load with correct stock quantities
- ✅ Individual price edits work correctly
- ✅ Bulk updates apply to selected items
- ✅ Changes are saved to database
- ✅ Price history is tracked
- ✅ Export generates CSV file
- ✅ Search and filters work

### Error Handling:
- ❌ Shows error if no items selected for bulk update
- ❌ Shows error if reason is missing
- ❌ Shows error if value is invalid
- ❌ Shows error if API calls fail

## Database Verification

After testing, verify in the database:

```sql
-- Check PriceHistory table
SELECT * FROM PriceHistory ORDER BY createdAt DESC LIMIT 10;

-- Verify parts were updated
SELECT partNo, cost, priceA, priceB FROM Part WHERE id IN (SELECT DISTINCT partId FROM PriceHistory);
```

## Troubleshooting

1. **No parts showing:**
   - Check if parts exist in database
   - Run seed script: `cd backend && npm run seed`
   - Check backend server is running

2. **Price updates not saving:**
   - Check browser console for errors
   - Verify backend server is running
   - Check database connection

3. **History not showing:**
   - Verify PriceHistory table exists
   - Check if migrations ran successfully
   - Verify data was inserted into PriceHistory

## API Endpoints Summary

- `GET /api/parts/price-management` - Get parts with stock quantities
- `POST /api/parts/bulk-update-prices` - Bulk update prices
- `PUT /api/parts/:id/prices` - Update individual part prices
- `GET /api/parts/price-history` - Get price update history

