#!/usr/bin/env python3
"""
Script to extract items from PDF, convert to Excel, and import into the app.
"""

import sys
import json
import requests
import pandas as pd
from pathlib import Path

try:
    import pdfplumber
except ImportError:
    print("Installing required package: pdfplumber")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pdfplumber", "openpyxl", "pandas", "requests"])
    import pdfplumber

# API Configuration
API_BASE_URL = "http://localhost:3001/api"
PARTS_ENDPOINT = f"{API_BASE_URL}/parts"

def extract_pdf_data(pdf_path):
    """Extract table data from PDF file."""
    print(f"📄 Extracting data from PDF: {pdf_path}")
    all_data = []
    
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page_num, page in enumerate(pdf.pages, 1):
                print(f"  Processing page {page_num}...")
                
                # Try to extract tables
                tables = page.extract_tables()
                
                if tables:
                    for table in tables:
                        # Skip empty tables
                        if not table or len(table) < 2:
                            continue
                        
                        # First row is usually headers
                        headers = [str(cell).strip() if cell else "" for cell in table[0]]
                        
                        # Process data rows
                        for row in table[1:]:
                            if not row or all(not cell or str(cell).strip() == "" for cell in row):
                                continue
                            
                            # Create dictionary from row
                            row_data = {}
                            for i, cell in enumerate(row):
                                if i < len(headers) and headers[i]:
                                    row_data[headers[i]] = str(cell).strip() if cell else ""
                            
                            if row_data:
                                all_data.append(row_data)
                
                # If no tables found, try extracting text and parsing
                if not tables:
                    text = page.extract_text()
                    if text:
                        lines = text.split('\n')
                        # Try to parse as structured data
                        # This is a fallback - adjust based on your PDF structure
                        print(f"  No tables found on page {page_num}, trying text extraction...")
    
    except Exception as e:
        print(f"❌ Error extracting PDF: {e}")
        return []
    
    print(f"✅ Extracted {len(all_data)} rows from PDF")
    return all_data

def normalize_data(data):
    """Normalize extracted data to match API format."""
    normalized = []
    
    # Common column name mappings
    column_mappings = {
        'part_no': ['part_no', 'part no', 'part number', 'partnumber', 'part#', 'part #'],
        'part_no': ['part_no', 'part no', 'part number', 'partnumber', 'part#', 'part #'],
        'brand_name': ['brand', 'brand_name', 'brand name', 'manufacturer'],
        'description': ['description', 'desc', 'item description', 'name', 'item name'],
        'category': ['category', 'category_id', 'category name'],
        'subcategory': ['subcategory', 'subcategory_id', 'subcategory name'],
        'application': ['application', 'application_id', 'application name'],
        'uom': ['uom', 'unit', 'unit of measure', 'unit_of_measure'],
        'cost': ['cost', 'purchase price', 'purchase_price', 'buying price'],
        'price_a': ['price', 'price_a', 'price a', 'sale price', 'sale_price', 'selling price'],
        'master_part_no': ['master_part_no', 'master part no', 'master part number'],
    }
    
    for row in data:
        normalized_row = {}
        
        # Find matching columns
        row_lower = {k.lower().strip(): v for k, v in row.items()}
        
        for target_field, possible_names in column_mappings.items():
            for name in possible_names:
                name_lower = name.lower().strip()
                if name_lower in row_lower:
                    value = row_lower[name_lower]
                    if value and value.strip():
                        normalized_row[target_field] = value.strip()
                        break
        
        # If we have at least a part_no, add the row
        if normalized_row.get('part_no') or normalized_row.get('description'):
            # Ensure part_no exists - use description if not available
            if not normalized_row.get('part_no'):
                normalized_row['part_no'] = normalized_row.get('description', f"ITEM_{len(normalized)}")
            
            # Set defaults
            normalized_row.setdefault('status', 'active')
            normalized_row.setdefault('uom', 'pcs')
            
            normalized.append(normalized_row)
    
    return normalized

def save_to_excel(data, excel_path):
    """Save data to Excel file."""
    print(f"📊 Saving to Excel: {excel_path}")
    
    if not data:
        print("⚠️  No data to save!")
        return False
    
    # Create DataFrame
    df = pd.DataFrame(data)
    
    # Save to Excel
    df.to_excel(excel_path, index=False, engine='openpyxl')
    print(f"✅ Saved {len(data)} rows to Excel")
    return True

def import_items_to_app(items):
    """Import items to the app via API."""
    print(f"\n📤 Importing {len(items)} items to the app...")
    
    success_count = 0
    error_count = 0
    errors = []
    
    for idx, item in enumerate(items, 1):
        try:
            # Prepare API payload
            payload = {
                'part_no': item.get('part_no', f"ITEM_{idx}"),
                'brand_name': item.get('brand_name', ''),
                'description': item.get('description', item.get('part_no', '')),
                'category_id': item.get('category', ''),
                'subcategory_id': item.get('subcategory', ''),
                'application_id': item.get('application', ''),
                'uom': item.get('uom', 'pcs'),
                'status': item.get('status', 'active'),
            }
            
            # Add optional fields
            if item.get('cost'):
                try:
                    payload['cost'] = float(str(item['cost']).replace(',', ''))
                except:
                    pass
            
            if item.get('price_a'):
                try:
                    payload['price_a'] = float(str(item['price_a']).replace(',', ''))
                except:
                    pass
            
            if item.get('master_part_no'):
                payload['master_part_no'] = item['master_part_no']
            
            # Remove empty strings
            payload = {k: v for k, v in payload.items() if v != ''}
            
            # Make API call
            response = requests.post(PARTS_ENDPOINT, json=payload, timeout=30)
            
            if response.status_code in [200, 201]:
                success_count += 1
                if idx % 10 == 0:
                    print(f"  ✅ Imported {idx}/{len(items)} items...")
            else:
                error_count += 1
                error_msg = f"Item {idx} ({item.get('part_no', 'N/A')}): {response.status_code} - {response.text[:100]}"
                errors.append(error_msg)
                print(f"  ❌ Error importing item {idx}: {response.status_code}")
        
        except Exception as e:
            error_count += 1
            error_msg = f"Item {idx} ({item.get('part_no', 'N/A')}): {str(e)[:100]}"
            errors.append(error_msg)
            print(f"  ❌ Exception importing item {idx}: {str(e)[:100]}")
    
    print(f"\n✅ Import Summary:")
    print(f"   Success: {success_count}")
    print(f"   Errors: {error_count}")
    
    if errors:
        print(f"\n⚠️  First 10 errors:")
        for err in errors[:10]:
            print(f"   {err}")
    
    return success_count, error_count

def main():
    pdf_path = Path("CTC Item Lists.pdf")
    excel_path = Path("CTC Item Lists.xlsx")
    
    if not pdf_path.exists():
        print(f"❌ PDF file not found: {pdf_path}")
        return
    
    # Step 1: Extract from PDF
    raw_data = extract_pdf_data(pdf_path)
    
    if not raw_data:
        print("❌ No data extracted from PDF!")
        print("   Trying alternative extraction method...")
        # Try text-based extraction
        try:
            with pdfplumber.open(pdf_path) as pdf:
                all_text = []
                for page in pdf.pages:
                    text = page.extract_text()
                    if text:
                        all_text.append(text)
                
                # Save raw text for manual review
                with open("pdf_extracted_text.txt", "w", encoding="utf-8") as f:
                    f.write("\n\n".join(all_text))
                print("   Saved raw text to pdf_extracted_text.txt for review")
        except Exception as e:
            print(f"   Error: {e}")
        return
    
    # Step 2: Normalize data
    print("\n🔄 Normalizing data...")
    normalized_data = normalize_data(raw_data)
    print(f"✅ Normalized {len(normalized_data)} items")
    
    # Step 3: Save to Excel
    if save_to_excel(normalized_data, excel_path):
        print(f"✅ Excel file created: {excel_path}")
    
    # Step 4: Import to app
    print("\n" + "="*60)
    response = input("Do you want to import items to the app now? (y/n): ")
    if response.lower() == 'y':
        # Check if backend is running
        try:
            test_response = requests.get(f"{API_BASE_URL}/parts?limit=1", timeout=5)
            if test_response.status_code == 200:
                import_items_to_app(normalized_data)
            else:
                print(f"❌ Backend not responding correctly. Status: {test_response.status_code}")
        except requests.exceptions.RequestException as e:
            print(f"❌ Cannot connect to backend at {API_BASE_URL}")
            print(f"   Error: {e}")
            print(f"   Please make sure the backend server is running.")
    else:
        print("⏭️  Skipping import. You can import manually later using the Excel file.")

if __name__ == "__main__":
    main()

