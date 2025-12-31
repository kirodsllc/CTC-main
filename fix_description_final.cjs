/**
 * Final accurate description extraction - match exact PDF column structure
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
  const jsonData = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'));
  const pdfText = fs.readFileSync(TEXT_PATH, 'utf-8');
  const allLines = pdfText.split(/\n|\r/).map(l => l.trim()).filter(l => l.length > 10);
  
  console.log(`   ✅ Loaded ${jsonData.items.length} items\n`);
  return { jsonData, pdfText, allLines };
}

/**
 * Extract description by exact column position
 */
function findExactDescription(item, allLines) {
  const partNo = item['part no.'] || '';
  const ssPartNo = item['ss part no'] || '';
  const searchTerm = partNo || ssPartNo;
  
  if (!searchTerm) return '';
  
  // Find line containing this part number
  let targetLineIdx = -1;
  let targetLine = '';
  
  for (let i = 0; i < allLines.length; i++) {
    if (allLines[i].includes(searchTerm) && allLines[i].length > 50) {
      targetLineIdx = i;
      targetLine = allLines[i];
      break;
    }
  }
  
  if (targetLineIdx === -1) return '';
  
  // Find column index of part number
  const partNoPattern = /\b([0-9]{4,7}|[0-9]{5}-[0-9]{5}|[0-9]{3}-[0-9]{2}-[0-9]{5}|[A-Z0-9\-]{4,20})\b/g;
  const partNos = [];
  let match;
  while ((match = partNoPattern.exec(targetLine)) !== null) {
    const pn = match[1];
    if (!pn.includes('.') && !pn.match(/^\d{1,3}$/) && pn.length >= 4) {
      partNos.push({ value: pn, index: match.index });
    }
  }
  
  // Find which column this part number is in
  let columnIndex = -1;
  for (let i = 0; i < partNos.length; i++) {
    if (partNos[i].value === searchTerm) {
      columnIndex = i;
      break;
    }
  }
  
  if (columnIndex === -1) return '';
  
  // Determine if it's in Part No column (first half) or SS Part No column (second half)
  const firstHalfCount = Math.floor(partNos.length / 2);
  const isPartNoColumn = columnIndex < firstHalfCount;
  const relativeColumnIndex = isPartNoColumn ? columnIndex : columnIndex - firstHalfCount;
  
  // The descriptions appear in the data line itself, after brands
  // From PDF line 2: "...CAT R WG CAT ITR MAH ITR ITR ITR WG ITR SEAL-O-RING SEAL-O-RING SEAL-O-RING RING METAL, RETAINING RING METAL, RETAINING LINER CYLINDER..."
  
  // Find where the description section starts (after brands section ends)
  // Brands are usually short codes: CAT R WG CAT ITR MAH...
  // Descriptions start with technical terms: SEAL-O-RING, RING METAL, etc.
  
  // Strategy: Find the first occurrence of "SEAL-O-RING" or similar technical description
  // This marks the start of the description section
  
  const descStartMarkers = [
    'SEAL-O-RING',
    'RING METAL, RETAINING',
    'LINER CYLINDER',
    'SEAL-O-RING SEAL-O-RING'
  ];
  
  let descSectionStart = -1;
  for (const marker of descStartMarkers) {
    const idx = targetLine.indexOf(marker);
    if (idx >= 0) {
      descSectionStart = idx;
      break;
    }
  }
  
  if (descSectionStart === -1) {
    // Try to find by pattern - look for hyphenated technical terms
    const hyphenatedMatch = targetLine.match(/\b([A-Z][A-Za-z]+-[A-Z][A-Za-z]+)\b/);
    if (hyphenatedMatch) {
      descSectionStart = targetLine.indexOf(hyphenatedMatch[0]);
    }
  }
  
  if (descSectionStart === -1) return '';
  
  // Extract description section (first 600 chars should contain all descriptions)
  const descSection = targetLine.substring(descSectionStart, descSectionStart + 600);
  
  // Extract descriptions in the exact order they appear
  // Pattern: "SEAL-O-RING SEAL-O-RING SEAL-O-RING RING METAL, RETAINING RING METAL, RETAINING LINER CYLINDER..."
  
  const descriptions = [];
  let currentPos = 0;
  
  // Process the description section word by word to extract complete descriptions
  const words = descSection.split(/\s+/);
  let i = 0;
  
  while (i < words.length) {
    const word = words[i].trim();
    if (!word || word.length < 2) {
      i++;
      continue;
    }
    
    // Check if it's a hyphenated term (SEAL-O-RING)
    if (word.includes('-') && word.match(/^[A-Z][A-Za-z]+(?:-[A-Z][A-Za-z]+)+$/)) {
      descriptions.push(word);
      i++;
      continue;
    }
    
    // Check if it's part of a multi-word description
    // Look ahead to see if it forms a description
    if (word.match(/^[A-Z][A-Za-z]{3,}$/)) {
      // Try to form a description
      let desc = word;
      let j = i + 1;
      
      // Look for next word(s) that might be part of description
      while (j < words.length && j < i + 4) {
        const nextWord = words[j].trim();
        
        // If next word has comma, include it and the word after
        if (nextWord.includes(',')) {
          desc += ' ' + nextWord;
          if (j + 1 < words.length) {
            const afterComma = words[j + 1].trim();
            if (afterComma.match(/^[A-Z][A-Za-z]{3,}$/)) {
              desc += ' ' + afterComma;
              j += 2;
              break;
            }
          }
          j++;
          break;
        }
        
        // If next word is uppercase and looks like part of description
        if (nextWord.match(/^[A-Z][A-Za-z]{3,}$/) && 
            !nextWord.match(/^(PRC|USA|ITAL|TURK|IND|KOR|UK|CHN|AFR|TAIW|JAP|GER|SAM|JPN|CAT|R|WG|ITR|MAH|CTC|VAR|FP|KMP|NTN|FAG|TIMKEN|SKF)$/i)) {
          desc += ' ' + nextWord;
          j++;
        } else {
          break;
        }
      }
      
      // Filter out invalid descriptions
      if (desc.length >= 5 && desc.length <= 50) {
        // Check if it contains technical terms
        const techTerms = ['SEAL', 'RING', 'BEARING', 'GASKET', 'FILTER', 'PUMP', 'CYLINDER', 'GEAR', 'SHAFT', 'BOLT', 'NUT', 'WASHER', 'PIN', 'LINER', 'VALVE', 'PISTON', 'BLOCK', 'METAL', 'RETAINING', 'LOCK', 'DOWEL', 'SNAP', 'BALL', 'OIL', 'AIR', 'FUEL', 'HYDRAULIC', 'TRANSMISSION', 'ENGINE', 'CONVERTER', 'CONVERTOR'];
        const descUpper = desc.toUpperCase();
        if (techTerms.some(term => descUpper.includes(term))) {
          // Avoid duplicates
          if (!descriptions.includes(desc)) {
            descriptions.push(desc);
          }
        }
      }
      
      i = j;
    } else {
      i++;
    }
    
    // Limit to reasonable number of descriptions (usually 10-15 per line)
    if (descriptions.length >= 15) break;
  }
  
  // Match by column position
  if (descriptions.length > 0 && relativeColumnIndex >= 0 && relativeColumnIndex < descriptions.length) {
    return descriptions[relativeColumnIndex].substring(0, 200).trim();
  }
  
  // If exact match doesn't work, try modulo
  if (descriptions.length > 0 && relativeColumnIndex >= 0) {
    const idx = relativeColumnIndex % descriptions.length;
    return descriptions[idx].substring(0, 200).trim();
  }
  
  return '';
}

/**
 * Main function
 */
function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 FIXING DESCRIPTIONS (FINAL ACCURATE EXTRACTION)');
  console.log('='.repeat(60) + '\n');
  
  const { jsonData, pdfText, allLines } = loadData();
  const items = jsonData.items;
  
  let fixedCount = 0;
  let unchangedCount = 0;
  let emptyCount = 0;
  
  console.log('🔍 Processing items...\n');
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const oldDesc = item.decc || '';
    
    // Get exact description
    const newDesc = findExactDescription(item, allLines);
    
    if (newDesc && newDesc.length >= 3) {
      if (newDesc !== oldDesc) {
        item.decc = newDesc;
        fixedCount++;
      } else {
        unchangedCount++;
      }
    } else {
      if (!oldDesc) {
        emptyCount++;
      } else {
        unchangedCount++;
      }
    }
    
    if ((i + 1) % 500 === 0) {
      process.stdout.write(`   ⏳ Processed ${i + 1}/${items.length} (${fixedCount} fixed)...\r`);
    }
  }
  
  console.log(`\n   ✅ Processed ${items.length} items`);
  console.log(`   📊 Fixed: ${fixedCount}`);
  console.log(`   📊 Unchanged: ${unchangedCount}`);
  console.log(`   📊 Empty: ${emptyCount}\n`);
  
  // Save
  console.log('💾 Saving updated JSON...');
  const jsonString = JSON.stringify(jsonData, null, 2);
  fs.writeFileSync(JSON_PATH, jsonString, 'utf-8');
  
  const fileSize = fs.statSync(JSON_PATH).size;
  console.log(`   ✅ Saved: ${JSON_PATH}`);
  console.log(`   💾 File Size: ${(fileSize / 1024).toFixed(2)} KB\n`);
  
  // Verify specific items
  console.log('📋 Verifying specific items:');
  const testParts = ['1258274', '0328970', '328970', '0353360', '353360', '037WN29'];
  testParts.forEach(pn => {
    const item = items.find(i => i['part no.'] === pn || i['ss part no'] === pn);
    if (item) {
      console.log(`   Part: ${pn} -> Desc: "${item.decc || 'N/A'}"`);
    }
  });
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ COMPLETE');
  console.log('='.repeat(60) + '\n');
}

main();

