# CTC Item Lists Import Guide

This script imports all items from `CTC Item Lists.xlsx` into the application with **100% accuracy** - no calculations or changes to the data.

## Required Excel Columns

The script expects the following columns in your Excel file:

1. **Master Part No** - Master part number
2. **Part No** - Part number (required)
3. **Origin** - Country/Origin of the part
4. **Description** - Item description
5. **Application** - Application name
6. **Grade** - Item grade (A, B, C, etc.)
7. **Order Level** - Reorder level
8. **Weight** - Item weight
9. **Main Category** - Main category name
10. **Sub Category** - Sub category name
11. **Size** - Item size
12. **Brand** - Brand name
13. **Cost** - Cost price
14. **Price A** - Price A
15. **Price B** - Price B
16. **Model** - Machine model
17. **Quantity** - Initial stock quantity

## How to Use

1. **Make sure your Excel file is in the project root:**
   - File name: `CTC Item Lists.xlsx`
   - Location: Same directory as this script

2. **Ensure the backend server is running:**
   ```bash
   # In the backend directory
   npm run dev
   # or
   npm start
   ```

3. **Run the import script:**
   ```bash
   node import-ctc-items-accurate.cjs
   ```

## What the Script Does

1. **Reads the Excel file** - Extracts all rows with data
2. **Maps all fields accurately** - No calculations, no changes
3. **Creates parts** - Imports each item as a part in the system
4. **Handles relationships** - Automatically creates/links:
   - Master Parts
   - Brands
   - Categories
   - Subcategories
   - Applications
   - Models
5. **Creates stock movements** - If quantity is provided, creates initial stock entries

## Field Mapping

| Excel Column | Database Field | Notes |
|-------------|---------------|-------|
| Master Part No | master_part_no | Creates master part if needed |
| Part No | part_no | Required field |
| Origin | origin | Normalized to dropdown values (local, import, china, japan, germany, usa) |
| Description | description | Main description |
| Application | application_id | Creates application if needed |
| Grade | grade | Normalized to dropdown values (A, B, C, D) |
| Order Level | reorder_level | Converted to integer |
| Weight | weight | Converted to float |
| Main Category | category_id | Creates category if needed |
| Sub Category | subcategory_id | Creates subcategory if needed |
| Size | size | Stored as string |
| Brand | brand_name | Creates brand if needed |
| Cost | cost | Converted to float |
| Price A | price_a | Converted to float |
| Price B | price_b | Converted to float |
| Model | models[] | Creates model relationship |
| Quantity | stock_movement | Creates initial stock entry |

## Important Notes

- **Origin**: Values are normalized to match the dropdown options:
  - Local/LOC → `local`
  - Import/IMP → `import`
  - China/CHN/PRC → `china`
  - Japan/JAP → `japan`
  - Germany/GER → `germany`
  - USA → `usa`
  - PPR → `ppr` (now a valid dropdown option)
  - Other values are kept as-is (may need to be added to dropdown)

- **Grade**: Values are normalized to uppercase (A, B, C, D). Other values are kept as-is.

- **Backend Schema**: If the backend doesn't have `origin` and `grade` fields in the Part model yet, you may need to add them to the schema. The import script will send them, but they'll be ignored if the backend doesn't accept them.
- **All numeric fields** are preserved exactly as they appear in Excel (after removing commas)
- **No calculations** are performed - values are imported as-is
- **Empty fields** are skipped (not sent to API)
- **Duplicate part numbers** will cause errors (the system requires unique part numbers)

## Progress Tracking

The script shows progress every 100 items:
```
✅ Imported 100/14508 items...
✅ Imported 200/14508 items...
```

## Error Handling

- Errors are logged for the first 10 failed items
- A summary shows total successes and errors at the end
- If the backend is not running, the script will exit with an error message

## Example Output

```
============================================================
CTC Item Lists - Accurate Import
Importing all items with accurate data - no calculations or changes
============================================================
📊 Reading items from Excel: D:\CTC-KSO\admin-replicate-magic-main\CTC Item Lists.xlsx
✅ Found headers: Master Part No, Part No, Origin, Description, ...
✅ Read 14508 items from Excel

✅ Found 14508 items to import
   Columns expected:
   - Master Part No, Part No, Origin, Description
   - Application, Grade, Order Level, Weight
   - Main Category, Sub Category, Size, Brand
   - Cost, Price A, Price B, Model, Quantity

============================================================
Starting import...
============================================================

📤 Importing 14508 items to the app...
  ✅ Imported 100/14508 items...
  ✅ Imported 200/14508 items...
  ...

✅ Import Complete!
   Success: 14508
   Errors: 0
```

## Troubleshooting

1. **"Excel file not found"**
   - Make sure `CTC Item Lists.xlsx` is in the same directory as the script
   - Check the file name matches exactly (case-sensitive on some systems)

2. **"Cannot connect to backend"**
   - Start the backend server first
   - Check that it's running on `http://localhost:3001`
   - Verify the API endpoint is accessible

3. **"Duplicate part number" errors**
   - The system requires unique part numbers
   - Check your Excel file for duplicates
   - You may need to clean the data before importing

4. **Import is slow**
   - This is normal for large files (14,000+ items)
   - The script includes delays to avoid overwhelming the server
   - Be patient - it may take 10-30 minutes depending on your system

