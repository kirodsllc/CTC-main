/**
 * Complete re-extraction of ALL fields from PDF with accurate column matching
 * The PDF has a columnar structure where each column position = one item
 */

const fs = require('fs');
const path = require('path');

const PDF_PATH = path.join(__dirname, 'CTC Item Lists.pdf');
const JSON_PATH = path.join(__dirname, 'CTC Item Lists.json');
const TEXT_PATH = path.join(__dirname, 'pdf_extracted_text.txt');

/**
 * Extract text from PDF
 */
async function extractTextFromPDF() {
  console.log('📄 Extracting text from PDF...');
  
  if (fs.existsSync(TEXT_PATH)) {
    console.log('   ✅ Using existing extracted text file\n');
    return fs.readFileSync(TEXT_PATH, 'utf-8');
  }
  
  const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
  const pdf = await pdfjs.getDocument({ url: PDF_PATH, verbosity: 0 }).promise;
  const textParts = [];
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(' ');
    textParts.push(pageText);
    if (i % 50 === 0) {
      process.stdout.write(`   ⏳ Processed ${i}/${pdf.numPages} pages...\r`);
    }
  }
  
  const fullText = textParts.join('\n');
  fs.writeFileSync(TEXT_PATH, fullText, 'utf-8');
  console.log(`\n   ✅ Extracted text from ${pdf.numPages} pages\n`);
  return fullText;
}

/**
 * Parse columnar structure - each column position = one item
 */
function parseColumnarStructure(text) {
  console.log('🔍 Parsing columnar structure...\n');
  
  const lines = text.split(/\n|\r/).map(l => l.trim()).filter(l => l.length > 20);
  const items = [];
  
  // Process each data line
  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    
    // Skip header-only lines
    if (line.match(/^Part No\.\s+Part No\./i) || line.match(/^SS Part No\.\s+SS Part No\./i)) {
      continue;
    }
    
    // Skip page numbers
    if (line.match(/^Page\s+\d+\s+of\s+\d+$/i)) continue;
    
    // Extract all columns from this line
    const lineItems = extractItemsFromLine(line, lineIdx, lines);
    items.push(...lineItems);
    
    if (lineIdx % 100 === 0 && lineIdx > 0) {
      console.log(`   ⏳ Processed ${lineIdx} lines, extracted ${items.length} items...`);
    }
  }
  
  console.log(`\n   ✅ Extracted ${items.length} items from ${lines.length} lines\n`);
  return items;
}

/**
 * Extract items from a single line using columnar structure
 */
function extractItemsFromLine(line, lineIdx, allLines) {
  const items = [];
  
  // The structure is: Part No columns -> SS Part No columns -> Brands -> Descriptions -> Costs -> Prices -> Locations -> Origins -> etc.
  
  // Step 1: Extract Part Numbers (first group)
  const partNos = extractPartNumbers(line, 0);
  if (partNos.length === 0) return items;
  
  // Step 2: Extract SS Part Numbers (second group, after Part Nos)
  const ssPartNos = extractPartNumbers(line, partNos[partNos.length - 1].endIndex);
  
  // Step 3: Extract Brands (after SS Part Nos)
  const brands = extractBrands(line, ssPartNos.length > 0 ? ssPartNos[ssPartNos.length - 1].endIndex : partNos[partNos.length - 1].endIndex);
  
  // Step 4: Extract Descriptions (after Brands)
  const descriptions = extractDescriptions(line, brands.length > 0 ? brands[brands.length - 1].endIndex : (ssPartNos.length > 0 ? ssPartNos[ssPartNos.length - 1].endIndex : partNos[partNos.length - 1].endIndex));
  
  // Step 5: Extract Costs (after Descriptions)
  const costs = extractCosts(line, descriptions.length > 0 ? descriptions[descriptions.length - 1].endIndex : (brands.length > 0 ? brands[brands.length - 1].endIndex : partNos[partNos.length - 1].endIndex));
  
  // Step 6: Extract Prices (after Costs)
  const prices = extractPrices(line, costs.length > 0 ? costs[costs.length - 1].endIndex : (descriptions.length > 0 ? descriptions[descriptions.length - 1].endIndex : partNos[partNos.length - 1].endIndex));
  
  // Step 7: Extract Locations (after Prices)
  const locations = extractLocations(line, prices.length > 0 ? prices[prices.length - 1].endIndex : (costs.length > 0 ? costs[costs.length - 1].endIndex : partNos[partNos.length - 1].endIndex));
  
  // Step 8: Extract Origins (look in the line and nearby lines)
  const origins = extractOrigins(line, lineIdx, allLines);
  
  // Step 9: Extract other fields from context
  const context = getContext(lineIdx, allLines);
  const applications = extractApplications(context);
  const grades = extractGrades(context);
  const mains = extractMains(context);
  const subs = extractSubs(context);
  const sizes = extractSizes(context);
  const remarks = extractRemarks(context);
  const models = extractModels(context);
  const qtys = extractQtys(context);
  
  // Create items - match by column index
  const maxCols = Math.max(partNos.length, ssPartNos.length, brands.length, descriptions.length, costs.length, prices.length, locations.length);
  
  for (let colIdx = 0; colIdx < maxCols; colIdx++) {
    const item = {
      'part no.': partNos[colIdx]?.value || '',
      'ss part no': ssPartNos[colIdx]?.value || '',
      'origin': origins[colIdx] || '',
      'decc': descriptions[colIdx]?.value || '',
      'application grade': applications[colIdx] || '',
      'main': mains[colIdx] || '',
      'sub': subs[colIdx] || '',
      'size': sizes[colIdx] || '',
      'brand': brands[colIdx]?.value || '',
      'remarks': remarks[colIdx] || '',
      'loc': locations[colIdx]?.value || '',
      'cost': costs[colIdx]?.value || '',
      'mkt': '',
      'price a': prices[colIdx]?.priceA || '',
      'price b': prices[colIdx]?.priceB || '',
      'model': models[colIdx] || '',
      'qty': qtys[colIdx] || ''
    };
    
    // Only add if it has at least a part number or SS part number
    if (item['part no.'] || item['ss part no']) {
      items.push(item);
    }
  }
  
  return items;
}

/**
 * Extract part numbers from line starting at given position
 */
function extractPartNumbers(line, startPos) {
  const partNos = [];
  const section = line.substring(startPos);
  
  // Pattern for part numbers
  const pattern = /\b([0-9]{4,7}|[0-9]{5}-[0-9]{5}|[0-9]{3}-[0-9]{2}-[0-9]{5}|[0-9]{2}-[0-9]{5}|[A-Z0-9\-]{4,20})\b/g;
  let match;
  let lastIndex = startPos;
  
  while ((match = pattern.exec(section)) !== null) {
    const value = match[1];
    // Filter out invalid part numbers
    if (value.includes('.') || value.match(/^\d{1,3}$/)) continue;
    if (value.match(/^-|-$/)) continue;
    
    const actualIndex = startPos + match.index;
    partNos.push({
      value,
      index: actualIndex,
      endIndex: actualIndex + value.length
    });
    lastIndex = actualIndex + value.length;
    
    // Stop if we hit brands section (short codes like CAT, R, WG)
    if (section.substring(match.index, match.index + 50).match(/\b(CAT|R|WG|ITR|MAH|CTC|VAR|FP|KMP|NTN|FAG|TIMKEN|SKF)\b/i)) {
      break;
    }
  }
  
  return partNos;
}

/**
 * Extract brands from line
 */
function extractBrands(line, startPos) {
  const brands = [];
  const section = line.substring(startPos);
  const brandPattern = /\b(CAT|R|WG|ITR|MAH|CTC|VAR|FP|KMP|NTN|FAG|TIMKEN|SKF|CATERPILLER|KOMATSU|CUMMINS|HYUNDAI|KOBELCO|HITACHI|VOLVO|JCB|CASE|DEERE|NOK|PRC|CGR)\b/gi;
  let match;
  
  while ((match = brandPattern.exec(section)) !== null) {
    const value = match[1].toUpperCase();
    const actualIndex = startPos + match.index;
    
    // Stop if we hit descriptions (technical terms)
    if (section.substring(match.index, match.index + 50).match(/\b(SEAL|RING|BEARING|GASKET|FILTER|PUMP|CYLINDER|GEAR|SHAFT|BOLT|NUT|WASHER|PIN|LINER|VALVE|PISTON|BLOCK|METAL|RETAINING)\b/i)) {
      break;
    }
    
    brands.push({
      value,
      index: actualIndex,
      endIndex: actualIndex + match[0].length
    });
  }
  
  return brands;
}

/**
 * Extract descriptions from line
 */
function extractDescriptions(line, startPos) {
  const descriptions = [];
  const section = line.substring(startPos, startPos + 600);
  
  let pos = 0;
  while (pos < section.length && descriptions.length < 20) {
    // Skip whitespace
    while (pos < section.length && /\s/.test(section[pos])) pos++;
    if (pos >= section.length) break;
    
    // Pattern 1: Hyphenated (SEAL-O-RING)
    const hyphenMatch = section.substring(pos).match(/^([A-Z][A-Za-z]*-[A-Z][A-Za-z]*(?:-[A-Z][A-Za-z]*)?)/);
    if (hyphenMatch && hyphenMatch[1].length >= 5 && hyphenMatch[1].length <= 30) {
      const nextChar = section[pos + hyphenMatch[0].length];
      if (!nextChar || /\s/.test(nextChar) || /[0-9]/.test(nextChar)) {
        descriptions.push({
          value: hyphenMatch[1],
          index: startPos + pos,
          endIndex: startPos + pos + hyphenMatch[0].length
        });
        pos += hyphenMatch[0].length;
        continue;
      }
    }
    
    // Pattern 2: With comma (RING METAL, RETAINING)
    const commaMatch = section.substring(pos).match(/^([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+),\s+[A-Z][A-Za-z]+)\b/);
    if (commaMatch && commaMatch[1].length >= 8 && commaMatch[1].length <= 50) {
      descriptions.push({
        value: commaMatch[1],
        index: startPos + pos,
        endIndex: startPos + pos + commaMatch[0].length
      });
      pos += commaMatch[0].length;
      continue;
    }
    
    // Pattern 3: Two words (LINER CYLINDER)
    const twoWordMatch = section.substring(pos).match(/^([A-Z][A-Za-z]{4,}(?:\s+[A-Z][A-Za-z]{4,}))\b/);
    if (twoWordMatch) {
      const desc = twoWordMatch[1];
      // Filter out brands
      if (!desc.match(/^(PRC|USA|ITAL|TURK|IND|KOR|UK|CHN|AFR|TAIW|JAP|GER|SAM|JPN|CAT|R|WG|ITR|MAH|CTC|VAR|FP|KMP|NTN|FAG|TIMKEN|SKF)\s/i)) {
        const techTerms = ['SEAL', 'RING', 'BEARING', 'GASKET', 'FILTER', 'PUMP', 'CYLINDER', 'GEAR', 'SHAFT', 'BOLT', 'NUT', 'WASHER', 'PIN', 'LINER', 'VALVE', 'PISTON', 'BLOCK', 'METAL', 'RETAINING', 'LOCK', 'DOWEL', 'SNAP', 'BALL'];
        const descUpper = desc.toUpperCase();
        if (techTerms.some(term => descUpper.includes(term)) && desc.length >= 5 && desc.length <= 40) {
          descriptions.push({
            value: desc,
            index: startPos + pos,
            endIndex: startPos + pos + twoWordMatch[0].length
          });
          pos += twoWordMatch[0].length;
          continue;
        }
      }
    }
    
    // Stop if we hit numbers (costs/prices)
    if (section[pos] && /[\d,.]/.test(section.substring(pos, pos + 10))) {
      break;
    }
    
    pos++;
  }
  
  return descriptions;
}

/**
 * Extract costs from line
 */
function extractCosts(line, startPos) {
  const costs = [];
  const section = line.substring(startPos);
  const costPattern = /\b(\d{1,3}(?:,\d{3})*\.\d{3})\b/g;
  let match;
  
  while ((match = costPattern.exec(section)) !== null) {
    const value = match[1];
    const actualIndex = startPos + match.index;
    
    // Stop if we hit prices (no decimal or different format)
    if (section.substring(match.index, match.index + 50).match(/\b\d{1,3}(?:,\d{3})*(?!\.\d{3})\b/)) {
      break;
    }
    
    costs.push({
      value,
      index: actualIndex,
      endIndex: actualIndex + match[0].length
    });
  }
  
  return costs;
}

/**
 * Extract prices from line
 */
function extractPrices(line, startPos) {
  const prices = [];
  const section = line.substring(startPos);
  // Prices are usually: "1,000 250 3,000 900" (Price A values) followed by Price B values
  const pricePattern = /\b(\d{1,3}(?:,\d{3})*(?!\.\d{3}))\b/g;
  const matches = [...section.matchAll(pricePattern)];
  
  // Prices usually come in pairs (Price A, Price B) or groups
  // For now, extract all and pair them
  for (let i = 0; i < matches.length; i += 2) {
    const priceA = matches[i]?.[1] || '';
    const priceB = matches[i + 1]?.[1] || '';
    
    if (priceA) {
      prices.push({
        priceA,
        priceB,
        index: startPos + matches[i].index,
        endIndex: startPos + matches[i].index + matches[i][0].length
      });
    }
  }
  
  return prices;
}

/**
 * Extract locations from line
 */
function extractLocations(line, startPos) {
  const locations = [];
  const section = line.substring(startPos);
  // Locations are like: S1D4, S2D3, C2A, G5A, etc.
  const locPattern = /\b([A-Z]\d+[A-Z]\d*|[A-Z]\d+[A-Z])\b/g;
  let match;
  
  while ((match = locPattern.exec(section)) !== null) {
    const value = match[1];
    const actualIndex = startPos + match.index;
    
    // Stop if we hit "PARTS LIST" or headers
    if (section.substring(match.index, match.index + 50).match(/\b(PARTS LIST|Part No\.|SS Part No\.|Desc\.)\b/i)) {
      break;
    }
    
    locations.push({
      value,
      index: actualIndex,
      endIndex: actualIndex + match[0].length
    });
  }
  
  return locations;
}

/**
 * Extract origins from line and context
 */
function extractOrigins(line, lineIdx, allLines) {
  const origins = [];
  // Look for origin keywords in the line
  const originPattern = /\b(PRC|USA|ITAL|TURK|IND|KOR|UK|CHN|AFR|TAIW|JAP|GER|SAM|JPN|CHINA|INDIA|JAPAN|KOREA|ITALY|TURKEY|-)\b/gi;
  const matches = [...line.matchAll(originPattern)];
  
  for (const match of matches) {
    let origin = match[1].toUpperCase();
    if (origin === '-') origin = '';
    origins.push(origin);
  }
  
  return origins;
}

/**
 * Get context from surrounding lines
 */
function getContext(lineIdx, allLines) {
  const start = Math.max(0, lineIdx - 5);
  const end = Math.min(allLines.length, lineIdx + 10);
  return allLines.slice(start, end).join(' ');
}

/**
 * Extract applications from context
 */
function extractApplications(context) {
  // Applications appear in context like "FUEL SYSTEM", "PLANETARY 2ND GEAR"
  const appPattern = /\b(FUEL SYSTEM|PLANETARY 2ND GEAR|CYLINDER BLOCK GROUP|PLANETARY GEAR & SHAFT|TORQUE CONVERTOR GROUP|WATER PUMP GROUP|BRAKE BAND AND LINKAGE|FINAL DRIVE GEAR SHAFT|HYDRAULIC PUMP GROUP|FRONT IDLER GROUP|STEERING CLUTCH & BRAKES GROUP|RIPPER CYLINDER|FINAL DRIVE GROUP|BLADE LIFT CYLINDER|PLANETARY TRANSMISSION GROUP)\b/gi;
  const matches = [...context.matchAll(appPattern)];
  return matches.map(m => m[1].toUpperCase());
}

/**
 * Extract grades from context
 */
function extractGrades(context) {
  const gradePattern = /\b(Grade\s+)?([ABC])\b/gi;
  const matches = [...context.matchAll(gradePattern)];
  return matches.map(m => (m[2] || m[1] || '').toUpperCase());
}

/**
 * Extract mains from context
 */
function extractMains(context) {
  const mainPattern = /\b(SEAL-CAT|SEAL-KOM|KOMATSU|CATERPILLER|VALVO|BEARINGS|UNDER-CARRIAGE|G\.E\.T|VEHICLE-PARTS|TRANSMISSION-PARTS|ENGINE-PARTS)\b/gi;
  const matches = [...context.matchAll(mainPattern)];
  return matches.map(m => m[1].toUpperCase());
}

/**
 * Extract subs from context
 */
function extractSubs(context) {
  const subPattern = /\b(SEAL-O-RING|RING-METAL|ENGINE-PARTS|TRANSMISSION-PARTS|BEARING|UNDER-CARRIAGE|G\.E\.T|VEHICLE-PARTS)\b/gi;
  const matches = [...context.matchAll(subPattern)];
  return matches.map(m => m[1].toUpperCase());
}

/**
 * Extract sizes from context
 */
function extractSizes(context) {
  const sizePattern = /\b(\d+\.\d+\s+X\s+\d+\.\d+|\d+MM|\d+X\d+X\d+)\b/gi;
  const matches = [...context.matchAll(sizePattern)];
  return matches.map(m => m[1]);
}

/**
 * Extract remarks from context
 */
function extractRemarks(context) {
  // Remarks often repeat size or other info
  const sizePattern = /\b(\d+\.\d+\s+X\s+\d+\.\d+)\b/gi;
  const matches = [...context.matchAll(sizePattern)];
  return matches.map(m => m[1]);
}

/**
 * Extract models from context
 */
function extractModels(context) {
  // Models are like: 3114, 3116, 950F-2, D155A-1, etc.
  const modelPattern = /\b(\d{4}|[A-Z]\d+[A-Z]-\d+|[A-Z]\d+[A-Z]|[A-Z]+\d+[A-Z]?-\d+)\b/g;
  const matches = [...context.matchAll(modelPattern)];
  return matches.map(m => m[1]);
}

/**
 * Extract quantities from context
 */
function extractQtys(context) {
  // Quantities are usually small numbers: 1, 2, 3, 6, etc.
  const qtyPattern = /\b(\d{1,2})\b/g;
  const matches = [...context.matchAll(qtyPattern)];
  return matches.map(m => m[1]);
}

/**
 * Main function
 */
async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 COMPLETE RE-EXTRACTION OF ALL FIELDS');
  console.log('='.repeat(60) + '\n');
  
  const text = await extractTextFromPDF();
  const items = parseColumnarStructure(text);
  
  // Remove duplicates
  const uniqueItems = [];
  const seen = new Set();
  
  for (const item of items) {
    const key = `${item['part no.']}_${item['ss part no']}`;
    if (!seen.has(key) && (item['part no.'] || item['ss part no'])) {
      seen.add(key);
      uniqueItems.push(item);
    }
  }
  
  console.log(`\n📊 Final count: ${uniqueItems.length} unique items\n`);
  
  // Create JSON structure
  const jsonData = {
    metadata: {
      source: 'CTC Item Lists.pdf',
      totalItems: uniqueItems.length,
      extractedAt: new Date().toISOString(),
      columns: [
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
    },
    items: uniqueItems
  };
  
  // Save
  console.log('💾 Saving JSON...');
  fs.writeFileSync(JSON_PATH, JSON.stringify(jsonData, null, 2), 'utf-8');
  const fileSize = fs.statSync(JSON_PATH).size;
  console.log(`   ✅ Saved: ${JSON_PATH}`);
  console.log(`   💾 File Size: ${(fileSize / 1024).toFixed(2)} KB\n`);
  
  // Show samples
  console.log('📋 Sample items:');
  for (let i = 0; i < Math.min(5, uniqueItems.length); i++) {
    const item = uniqueItems[i];
    console.log(`\n   Item ${i + 1}:`);
    console.log(`     Part No: ${item['part no.']}`);
    console.log(`     SS Part No: ${item['ss part no']}`);
    console.log(`     Origin: ${item['origin']}`);
    console.log(`     Description: ${item['decc']}`);
    console.log(`     Brand: ${item['brand']}`);
    console.log(`     Cost: ${item['cost']}`);
    console.log(`     Price A: ${item['price a']}`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ COMPLETE');
  console.log('='.repeat(60) + '\n');
}

main().catch(console.error);

