# CTC Item Lists - Import Instructions

## Quick Start

Since PDF parsing can be complex, here are two options:

### Option 1: Manual Conversion (Recommended for ASAP)

1. **Convert PDF to Excel manually:**
   - Open "CTC Item Lists.pdf" in Excel or Google Sheets
   - Or use an online PDF to Excel converter
   - Save as "CTC Item Lists.xlsx" in the project root

2. **Ensure Excel has these columns (or similar names):**
   - Part No (required)
   - Brand
   - Description
   - Category
   - Subcategory
   - Application
   - UOM
   - Cost
   - Price A
   - Status

3. **Run the import script:**
   ```powershell
   node import-items-simple.cjs --auto-import
   ```

### Option 2: Automated PDF Extraction (If PDF structure is simple)

The script `import-items-from-pdf.cjs` attempts to extract data directly from PDF, but may need adjustments based on your PDF structure.

## Import Script

The import script will:
1. ✅ Read items from Excel file
2. ✅ Normalize field names automatically
3. ✅ Import all items to the app via API
4. ✅ Show progress and summary
5. ✅ Handle errors gracefully

## API Endpoint

The script uses: `POST http://localhost:3001/api/parts`

Make sure your backend server is running on port 3001.

## Troubleshooting

- **Backend not responding**: Start the backend server with `cd backend && npm run dev`
- **Excel file not found**: Make sure "CTC Item Lists.xlsx" is in the project root
- **Import errors**: Check the error messages - some items may already exist or have invalid data

## Notes

- The script will skip empty rows
- Part No is required - if missing, it will be generated from description
- Categories, subcategories, and applications will be auto-created if they don't exist
- All items are imported with status "active" by default

