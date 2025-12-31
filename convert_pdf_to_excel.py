#!/usr/bin/env python3
"""
Convert CTC Item Lists.pdf to Excel with all required columns.
Extracts: part no., ss part no, origin, decc, application grade, main, sub, size, brand, remarks, loc, cost, mkt, price a, price b, model, qty
"""

import sys
import pandas as pd
from pathlib import Path

try:
    import pdfplumber
except ImportError:
    print("Installing required packages: pdfplumber, openpyxl, pandas...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pdfplumber", "openpyxl", "pandas"])
    import pdfplumber

def normalize_header(header):
    """Normalize header names to match required columns."""
    if not header:
        return None
    
    header_lower = str(header).lower().strip()
    
    # Map various header formats to standard names
    mappings = {
        'part no': 'part no.',
        'part no.': 'part no.',
        'part number': 'part no.',
        'part#': 'part no.',
        'part #': 'part no.',
        'ss part no': 'ss part no',
        'ss part no.': 'ss part no',
        'ss part number': 'ss part no',
        'origin': 'origin',
        'decc': 'decc',
        'desc': 'decc',
        'description': 'decc',
        'application grade': 'application grade',
        'app grade': 'application grade',
        'grade': 'application grade',
        'main': 'main',
        'sub': 'sub',
        'subcategory': 'sub',
        'size': 'size',
        'brand': 'brand',
        'brand name': 'brand',
        'remarks': 'remarks',
        'remark': 'remarks',
        'loc': 'loc',
        'location': 'loc',
        'cost': 'cost',
        'mkt': 'mkt',
        'market': 'mkt',
        'price a': 'price a',
        'pricea': 'price a',
        'price_a': 'price a',
        'price b': 'price b',
        'priceb': 'price b',
        'price_b': 'price b',
        'model': 'model',
        'qty': 'qty',
        'quantity': 'qty',
    }
    
    for key, value in mappings.items():
        if key in header_lower:
            return value
    
    return None

def extract_pdf_to_excel(pdf_path, excel_path):
    """Extract all data from PDF and save to Excel with required columns."""
    print(f"📄 Extracting data from PDF: {pdf_path}")
    
    # Required columns in order
    required_columns = [
        'part no.',
        'ss part no',
        'origin',
        'decc',
        'application grade',
        'main',
        'sub',
        'size',
        'brand',
        'remarks',
        'loc',
        'cost',
        'mkt',
        'price a',
        'price b',
        'model',
        'qty'
    ]
    
    all_rows = []
    
    try:
        with pdfplumber.open(pdf_path) as pdf:
            total_pages = len(pdf.pages)
            print(f"✅ PDF loaded: {total_pages} pages")
            
            for page_num, page in enumerate(pdf.pages, 1):
                if page_num % 10 == 0:
                    print(f"  Processing page {page_num}/{total_pages}...")
                
                # Try to extract tables first (most accurate)
                tables = page.extract_tables()
                
                if tables:
                    for table in tables:
                        if not table or len(table) < 2:
                            continue
                        
                        # Process headers
                        header_row = None
                        header_row_idx = 0
                        
                        # Find header row (usually first row with column names)
                        for idx, row in enumerate(table[:5]):  # Check first 5 rows
                            if not row:
                                continue
                            
                            row_text = ' '.join([str(cell).lower() if cell else '' for cell in row])
                            
                            # Check if this row contains header keywords
                            if any(keyword in row_text for keyword in ['part no', 'origin', 'brand', 'cost', 'price']):
                                header_row = row
                                header_row_idx = idx
                                break
                        
                        # If no header found, use first row
                        if header_row is None and table:
                            header_row = table[0]
                            header_row_idx = 0
                        
                        # Normalize headers
                        if header_row:
                            column_mapping = {}
                            for col_idx, header_cell in enumerate(header_row):
                                normalized = normalize_header(header_cell)
                                if normalized:
                                    column_mapping[col_idx] = normalized
                            
                            # Process data rows
                            for row_idx in range(header_row_idx + 1, len(table)):
                                row = table[row_idx]
                                if not row or all(not cell or str(cell).strip() == '' for cell in row):
                                    continue
                                
                                # Create row data
                                row_data = {col: '' for col in required_columns}
                                
                                for col_idx, cell_value in enumerate(row):
                                    if col_idx in column_mapping:
                                        col_name = column_mapping[col_idx]
                                        if col_name in required_columns:
                                            value = str(cell_value).strip() if cell_value else ''
                                            row_data[col_name] = value
                                
                                # Check if row has any meaningful data
                                if any(row_data[col] for col in required_columns[:10]):  # At least one of first 10 columns
                                    all_rows.append(row_data)
                
                # If no tables found, try text extraction with pattern matching
                if not tables:
                    text = page.extract_text()
                    if text:
                        lines = text.split('\n')
                        # Try to parse structured text
                        # This is a fallback method
                        current_row = {col: '' for col in required_columns}
                        
                        for line in lines:
                            line = line.strip()
                            if not line:
                                continue
                            
                            # Look for patterns like "Part No: XXX" or column:value pairs
                            parts = line.split(':')
                            if len(parts) == 2:
                                key = normalize_header(parts[0].strip())
                                value = parts[1].strip()
                                if key and key in required_columns:
                                    current_row[key] = value
                            
                            # If line looks like a data row (has multiple values separated by spaces/tabs)
                            elif '\t' in line or '  ' in line:
                                values = line.split('\t') if '\t' in line else line.split('  ')
                                values = [v.strip() for v in values if v.strip()]
                                
                                # Try to match with known column positions
                                if len(values) >= 3:
                                    # Heuristic: first value is usually part no
                                    if not current_row['part no.']:
                                        current_row['part no.'] = values[0]
                                    
                                    # Try to identify other columns based on position and content
                                    for idx, val in enumerate(values[1:], 1):
                                        # This is a simplified approach - may need adjustment
                                        if idx == 1 and not current_row['ss part no']:
                                            current_row['ss part no'] = val
                                        elif idx == 2 and not current_row['origin']:
                                            current_row['origin'] = val
                                        elif idx == 3 and not current_row['brand']:
                                            current_row['brand'] = val
                                    
                                    # If we have enough data, save row
                                    if current_row['part no.']:
                                        all_rows.append(current_row.copy())
                                        current_row = {col: '' for col in required_columns}
    
    except Exception as e:
        print(f"❌ Error extracting PDF: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    print(f"✅ Extracted {len(all_rows)} rows from PDF")
    
    if not all_rows:
        print("⚠️  No data extracted! Trying alternative extraction method...")
        return False
    
    # Create DataFrame with all required columns
    df = pd.DataFrame(all_rows)
    
    # Ensure all required columns exist
    for col in required_columns:
        if col not in df.columns:
            df[col] = ''
    
    # Reorder columns to match required order
    df = df[required_columns]
    
    # Remove completely empty rows
    df = df[df.astype(str).ne('').any(axis=1)]
    
    print(f"✅ Final data: {len(df)} rows, {len(df.columns)} columns")
    
    # Save to Excel
    print(f"📊 Saving to Excel: {excel_path}")
    try:
        df.to_excel(excel_path, index=False, engine='openpyxl')
        print(f"✅ Excel file created successfully: {excel_path}")
        print(f"   Columns: {', '.join(df.columns.tolist())}")
        return True
    except Exception as e:
        print(f"❌ Error saving to Excel: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    pdf_path = Path("CTC Item Lists.pdf")
    excel_path = Path("CTC Item Lists.xlsx")
    
    if not pdf_path.exists():
        print(f"❌ PDF file not found: {pdf_path}")
        return
    
    print("=" * 60)
    print("PDF to Excel Converter")
    print("=" * 60)
    print()
    
    success = extract_pdf_to_excel(pdf_path, excel_path)
    
    if success:
        print()
        print("=" * 60)
        print("✅ Conversion complete!")
        print(f"   Excel file: {excel_path}")
        print("=" * 60)
    else:
        print()
        print("=" * 60)
        print("❌ Conversion failed!")
        print("=" * 60)

if __name__ == "__main__":
    main()

