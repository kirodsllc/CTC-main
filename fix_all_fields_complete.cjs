/**
 * Complete fix for ALL fields - accurate column-by-column extraction
 */

const fs = require('fs');
const path = require('path');

const JSON_PATH = path.join(__dirname, 'CTC Item Lists.json');
const TEXT_PATH = path.join(__dirname, 'pdf_extracted_text.txt');

/**
 * Load data
 */
function loadData() {
  console.log('📄 Loading data...');
  const pdfText = fs.readFileSync(TEXT_PATH, 'utf-8');
  const allLines = pdfText.split(/\n|\r/).map(l => l.trim()).filter(l => l.length > 20);
  console.log(`   ✅ Loaded ${allLines.length} lines\n`);
  return { pdfText, allLines };
}

/**
 * Extract all columns from a line - accurate column matching
 */
function extractColumnsFromLine(line) {
  if (!line || line.length < 30) return null;
  
  // Skip header lines
  if (line.match(/^Part No\.\s+Part No\./i) || line.match(/^SS Part No\.\s+SS Part No\./i)) {
    return null;
  }
  
  // Skip page numbers
  if (line.match(/^Page\s+\d+\s+of\s+\d+$/i)) return null;
  
  const columns = {
    partNos: [],
    ssPartNos: [],
    brands: [],
    descriptions: [],
    costs: [],
    priceAs: [],
    priceBs: [],
    locations: [],
    origins: []
  };
  
  // Step 1: Extract Part Numbers (first group, before SS Part Nos)
  // Strategy: Split by spaces and identify part number patterns
  // Part numbers can be: 1258274, 0328970, 04020-01228, 037WN29, etc.
  
  // First, split the line by multiple spaces to get potential columns
  const tokens = line.split(/\s+/).filter(t => t.length > 0);
  
  // Find Part No section - look for sequence of part number patterns
  let partNoStart = 0;
  let partNoEnd = 0;
  
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    
    // Check if token is a valid part number
    const isPartNo = (
      /^[0-9]{4,7}$/.test(token) ||  // 1258274, 0328970
      /^[0-9]{5}-[0-9]{5}$/.test(token) ||  // 04020-01228
      /^[0-9]{3}-[0-9]{2}-[0-9]{5}$/.test(token) ||  // 195-27-12641
      /^[A-Z0-9]{3,}-[A-Z0-9]{3,}$/.test(token) ||  // Alphanumeric with dash
      /^[A-Z0-9\-]{4,20}$/.test(token)  // General alphanumeric
    ) && !token.includes('.') && !token.match(/^\d{1,3}$/);
    
    if (isPartNo) {
      if (columns.partNos.length === 0) {
        partNoStart = line.indexOf(token);
      }
      columns.partNos.push({ value: token, index: line.indexOf(token, partNoStart) });
      partNoEnd = line.indexOf(token, partNoStart) + token.length;
    } else {
      // If we've found part numbers and now hit a non-part-number, check if it's the start of SS Part No section
      if (columns.partNos.length > 0) {
        // Check if this token matches an earlier part number (indicating SS Part No section)
        if (columns.partNos.some(p => p.value === token)) {
          partNoEnd = line.indexOf(token);
          break;
        }
        // Or if we hit brands/descriptions
        if (token.match(/^(CAT|R|WG|ITR|MAH|CTC|VAR|FP|KMP|NTN|FAG|TIMKEN|SKF|SEAL|RING|BEARING)$/i)) {
          partNoEnd = line.indexOf(token);
          break;
        }
      }
    }
  }
  
  // Step 2: Extract SS Part Numbers (second group, after Part Nos)
  // Find where SS Part No section starts (after Part No section)
  let ssPartNoStart = -1;
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    // SS Part No section starts when we see a part number that matches an earlier one
    if (columns.partNos.length > 0 && columns.partNos.some(p => p.value === token)) {
      ssPartNoStart = i;
      break;
    }
  }
  
  if (ssPartNoStart >= 0) {
    for (let i = ssPartNoStart; i < tokens.length; i++) {
      const token = tokens[i];
      
      // Check if token is a valid part number
      const isPartNo = (
        /^[0-9]{4,7}$/.test(token) ||
        /^[0-9]{5}-[0-9]{5}$/.test(token) ||
        /^[0-9]{3}-[0-9]{2}-[0-9]{5}$/.test(token) ||
        /^[A-Z0-9]{3,}-[A-Z0-9]{3,}$/.test(token) ||
        /^[A-Z0-9\-]{4,20}$/.test(token)
      ) && !token.includes('.') && !token.match(/^\d{1,3}$/);
      
      if (isPartNo) {
        const index = line.indexOf(token, partNoEnd);
        if (index >= 0) {
          columns.ssPartNos.push({ value: token, index });
        }
      } else {
        // Stop when we hit brands or descriptions
        if (token.match(/^(CAT|R|WG|ITR|MAH|CTC|VAR|FP|KMP|NTN|FAG|TIMKEN|SKF|SEAL|RING|BEARING)$/i)) {
          break;
        }
      }
    }
  }
  
  // Step 3: Extract Brands (after SS Part Nos)
  const brandStartIdx = columns.ssPartNos.length > 0 
    ? columns.ssPartNos[columns.ssPartNos.length - 1].index + columns.ssPartNos[columns.ssPartNos.length - 1].value.length
    : partNoEnd;
  const brandSection = line.substring(brandStartIdx);
  const brandPattern = /\b(CAT|R|WG|ITR|MAH|CTC|VAR|FP|KMP|NTN|FAG|TIMKEN|SKF|CATERPILLER|KOMATSU|CUMMINS|HYUNDAI|KOBELCO|HITACHI|VOLVO|JCB|CASE|DEERE|NOK|PRC|CGR)\b/gi;
  const brandMatches = [...brandSection.matchAll(brandPattern)];
  
  for (const match of brandMatches) {
    // Stop if we hit descriptions
    if (brandSection.substring(match.index, match.index + 50).match(/\b(SEAL-O-RING|RING METAL|LINER CYLINDER|BEARING|GASKET|FILTER|PUMP|CYLINDER|GEAR|SHAFT|BOLT|NUT|WASHER|PIN|VALVE|PISTON|BLOCK|METAL|RETAINING)\b/i)) {
      break;
    }
    columns.brands.push({ value: match[1].toUpperCase(), index: brandStartIdx + match.index });
  }
  
  // Step 4: Extract Descriptions (after Brands)
  const descStartIdx = columns.brands.length > 0
    ? columns.brands[columns.brands.length - 1].index + columns.brands[columns.brands.length - 1].value.length
    : brandStartIdx;
  const descSection = line.substring(descStartIdx, descStartIdx + 600);
  
  let descPos = 0;
  while (descPos < descSection.length && columns.descriptions.length < 20) {
    while (descPos < descSection.length && /\s/.test(descSection[descPos])) descPos++;
    if (descPos >= descSection.length) break;
    
    // Hyphenated (SEAL-O-RING)
    const hyphenMatch = descSection.substring(descPos).match(/^([A-Z][A-Za-z]*-[A-Z][A-Za-z]*(?:-[A-Z][A-Za-z]*)?)/);
    if (hyphenMatch && hyphenMatch[1].length >= 5 && hyphenMatch[1].length <= 30) {
      const nextChar = descSection[descPos + hyphenMatch[0].length];
      if (!nextChar || /\s/.test(nextChar) || /[0-9]/.test(nextChar)) {
        columns.descriptions.push({ value: hyphenMatch[1], index: descStartIdx + descPos });
        descPos += hyphenMatch[0].length;
        continue;
      }
    }
    
    // With comma (RING METAL, RETAINING)
    const commaMatch = descSection.substring(descPos).match(/^([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+),\s+[A-Z][A-Za-z]+)\b/);
    if (commaMatch && commaMatch[1].length >= 8 && commaMatch[1].length <= 50) {
      columns.descriptions.push({ value: commaMatch[1], index: descStartIdx + descPos });
      descPos += commaMatch[0].length;
      continue;
    }
    
    // Two words (LINER CYLINDER)
    const twoWordMatch = descSection.substring(descPos).match(/^([A-Z][A-Za-z]{4,}(?:\s+[A-Z][A-Za-z]{4,}))\b/);
    if (twoWordMatch) {
      const desc = twoWordMatch[1];
      if (!desc.match(/^(PRC|USA|ITAL|TURK|IND|KOR|UK|CHN|AFR|TAIW|JAP|GER|SAM|JPN|CAT|R|WG|ITR|MAH|CTC|VAR|FP|KMP|NTN|FAG|TIMKEN|SKF)\s/i)) {
        const techTerms = ['SEAL', 'RING', 'BEARING', 'GASKET', 'FILTER', 'PUMP', 'CYLINDER', 'GEAR', 'SHAFT', 'BOLT', 'NUT', 'WASHER', 'PIN', 'LINER', 'VALVE', 'PISTON', 'BLOCK', 'METAL', 'RETAINING', 'LOCK', 'DOWEL', 'SNAP', 'BALL'];
        const descUpper = desc.toUpperCase();
        if (techTerms.some(term => descUpper.includes(term)) && desc.length >= 5 && desc.length <= 40) {
          columns.descriptions.push({ value: desc, index: descStartIdx + descPos });
          descPos += twoWordMatch[0].length;
          continue;
        }
      }
    }
    
    // Stop if we hit numbers (costs/prices)
    if (descSection[descPos] && /[\d,.]/.test(descSection.substring(descPos, descPos + 10))) {
      break;
    }
    
    descPos++;
  }
  
  // Step 5: Extract Costs (decimal numbers like 750.000)
  const costStartIdx = columns.descriptions.length > 0
    ? columns.descriptions[columns.descriptions.length - 1].index + columns.descriptions[columns.descriptions.length - 1].value.length
    : descStartIdx;
  const costSection = line.substring(costStartIdx);
  const costPattern = /\b(\d{1,3}(?:,\d{3})*\.\d{3})\b/g;
  const costMatches = [...costSection.matchAll(costPattern)];
  
  for (const match of costMatches) {
    columns.costs.push({ value: match[1], index: costStartIdx + match.index });
  }
  
  // Step 6: Extract Prices (numbers without .000, like 1,000, 250, 3,000)
  const priceStartIdx = columns.costs.length > 0
    ? columns.costs[columns.costs.length - 1].index + columns.costs[columns.costs.length - 1].value.length
    : costStartIdx;
  const priceSection = line.substring(priceStartIdx);
  const pricePattern = /\b(\d{1,3}(?:,\d{3})*(?!\.\d{3}))\b/g;
  const priceMatches = [...priceSection.matchAll(pricePattern)];
  
  // Prices come in pairs (Price A, Price B)
  for (let i = 0; i < priceMatches.length; i += 2) {
    if (priceMatches[i]) {
      columns.priceAs.push({ value: priceMatches[i][1], index: priceStartIdx + priceMatches[i].index });
    }
    if (priceMatches[i + 1]) {
      columns.priceBs.push({ value: priceMatches[i + 1][1], index: priceStartIdx + priceMatches[i + 1].index });
    }
  }
  
  // Step 7: Extract Locations (like S1D4, C2A, G5A)
  const locPattern = /\b([A-Z]\d+[A-Z]\d*|[A-Z]\d+[A-Z])\b/g;
  const locMatches = [...line.matchAll(locPattern)];
  
  for (const match of locMatches) {
    // Stop if we hit headers
    if (line.substring(match.index, match.index + 50).match(/\b(PARTS LIST|Part No\.|SS Part No\.|Desc\.)\b/i)) {
      break;
    }
    columns.locations.push({ value: match[1], index: match.index });
  }
  
  // Step 8: Extract Origins
  const originPattern = /\b(PRC|USA|ITAL|TURK|IND|KOR|UK|CHN|AFR|TAIW|JAP|GER|SAM|JPN|CHINA|INDIA|JAPAN|KOREA|ITALY|TURKEY|-)\b/gi;
  const originMatches = [...line.matchAll(originPattern)];
  
  for (const match of originMatches) {
    let origin = match[1].toUpperCase();
    if (origin === '-') origin = '';
    columns.origins.push({ value: origin, index: match.index });
  }
  
  return columns;
}

/**
 * Create items from columns
 */
function createItemsFromColumns(columns) {
  const items = [];
  const maxCols = Math.max(
    columns.partNos.length,
    columns.ssPartNos.length,
    columns.brands.length,
    columns.descriptions.length,
    columns.costs.length,
    columns.priceAs.length,
    columns.locations.length
  );
  
  for (let colIdx = 0; colIdx < maxCols; colIdx++) {
    const item = {
      'part no.': columns.partNos[colIdx]?.value || '',
      'ss part no': columns.ssPartNos[colIdx]?.value || '',
      'origin': columns.origins[colIdx]?.value || '',
      'decc': columns.descriptions[colIdx]?.value || '',
      'application grade': '',
      'main': '',
      'sub': '',
      'size': '',
      'brand': columns.brands[colIdx]?.value || '',
      'remarks': '',
      'loc': columns.locations[colIdx]?.value || '',
      'cost': columns.costs[colIdx]?.value || '',
      'mkt': '',
      'price a': columns.priceAs[colIdx]?.value || '',
      'price b': columns.priceBs[colIdx]?.value || '',
      'model': '',
      'qty': ''
    };
    
    if (item['part no.'] || item['ss part no']) {
      items.push(item);
    }
  }
  
  return items;
}

/**
 * Main function
 */
function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 FIXING ALL FIELDS (COMPLETE RE-EXTRACTION)');
  console.log('='.repeat(60) + '\n');
  
  const { pdfText, allLines } = loadData();
  const allItems = [];
  
  console.log('🔍 Processing lines...\n');
  
  for (let i = 0; i < allLines.length; i++) {
    const line = allLines[i];
    const columns = extractColumnsFromLine(line);
    
    if (columns) {
      const items = createItemsFromColumns(columns);
      allItems.push(...items);
    }
    
    if ((i + 1) % 100 === 0) {
      console.log(`   ⏳ Processed ${i + 1}/${allLines.length} lines, extracted ${allItems.length} items...`);
    }
  }
  
  // Remove duplicates
  const uniqueItems = [];
  const seen = new Set();
  
  for (const item of allItems) {
    const key = `${item['part no.']}_${item['ss part no']}`;
    if (!seen.has(key) && (item['part no.'] || item['ss part no'])) {
      seen.add(key);
      uniqueItems.push(item);
    }
  }
  
  console.log(`\n   ✅ Extracted ${uniqueItems.length} unique items\n`);
  
  // Save
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
    console.log(`     Part No: "${item['part no.']}"`);
    console.log(`     SS Part No: "${item['ss part no']}"`);
    console.log(`     Origin: "${item['origin']}"`);
    console.log(`     Description: "${item['decc']}"`);
    console.log(`     Brand: "${item['brand']}"`);
    console.log(`     Cost: "${item['cost']}"`);
    console.log(`     Price A: "${item['price a']}"`);
    console.log(`     Location: "${item['loc']}"`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ COMPLETE');
  console.log('='.repeat(60) + '\n');
}

main();

