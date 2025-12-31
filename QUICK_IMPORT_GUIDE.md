# Quick Import Guide - CTC Item Lists

## Step 1: Convert PDF to Excel (2 minutes)

**Option A: Using Excel (Recommended)**
1. Open "CTC Item Lists.pdf" in Microsoft Excel
2. Excel will automatically detect and import the table
3. Save as "CTC Item Lists.xlsx" in the project root folder

**Option B: Using Online Converter**
1. Go to https://www.ilovepdf.com/pdf-to-excel or similar
2. Upload "CTC Item Lists.pdf"
3. Download the Excel file
4. Save as "CTC Item Lists.xlsx" in the project root folder

## Step 2: Run Import Script

```powershell
node import-items-simple.cjs --auto-import
```

The script will:
- ✅ Read all items from Excel
- ✅ Import every item to the app
- ✅ Auto-create categories, subcategories, and applications
- ✅ Show progress and summary

## Excel Column Requirements

Your Excel file should have these columns (names can vary):
- **Part No** (required) - or "Part Number", "Part#"
- **Brand** - or "Brand Name"
- **Description** - or "Desc", "Item Description"
- **Category** (optional)
- **Subcategory** (optional)
- **Application** (optional)
- **UOM** - or "Unit", "Unit of Measure" (defaults to "pcs")
- **Cost** - or "Purchase Price"
- **Price A** - or "Price", "Sale Price"
- **Status** (optional, defaults to "active")

## Troubleshooting

**Backend not running?**
```powershell
cd backend
npm run dev
```

**Excel file not found?**
- Make sure "CTC Item Lists.xlsx" is in the project root (same folder as package.json)

**Import errors?**
- Check that Part No column exists
- Some items may already exist (duplicates are skipped)
- Check backend server logs for details

## Notes

- All items will be imported with status "active"
- Missing fields are optional and will be set to defaults
- The script processes items one by one to avoid overwhelming the server
- Progress is shown every 10 items

