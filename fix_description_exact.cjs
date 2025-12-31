/**
 * Extract descriptions EXACTLY as they appear in PDF - match column by column
 */

const fs = require('fs');
const path = require('path');

const JSON_PATH = path.join(__dirname, 'CTC Item Lists.json');
const TEXT_PATH = path.join(__dirname, 'pdf_extracted_text.txt');

function loadData() {
  console.log('📄 Loading data...');
  const jsonData = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'));
  const pdfText = fs.readFileSync(TEXT_PATH, 'utf-8');
  const allLines = pdfText.split(/\n|\r/).map(l => l.trim()).filter(l => l.length > 10);
  console.log(`   ✅ Loaded ${jsonData.items.length} items\n`);
  return { jsonData, pdfText, allLines };
}

/**
 * Extract descriptions in exact order from PDF line
 */
function extractDescriptionsInOrder(line) {
  // Find where descriptions start - after brands section
  // Look for "SEAL-O-RING" or similar technical terms
  let descStartIdx = line.search(/\bSEAL-O-RING\b/i);
  
  if (descStartIdx === -1) {
    // Try other patterns to find description section
    descStartIdx = line.search(/\b([A-Z][A-Za-z]+-[A-Z][A-Za-z]+)\b/);
  }
  
  if (descStartIdx === -1) {
    // Try to find by looking for technical terms
    const techPatterns = [
      /\bRING METAL, RETAINING\b/i,
      /\bLINER CYLINDER\b/i,
      /\b([A-Z][A-Za-z]{5,}(?:\s+[A-Z][A-Za-z]{5,}){1,2})\b/
    ];
    
    for (const pattern of techPatterns) {
      const match = line.match(pattern);
      if (match) {
        descStartIdx = line.indexOf(match[0]);
        break;
      }
    }
  }
  
  if (descStartIdx === -1) return [];
  
  return extractFromPosition(line, descStartIdx);
}

/**
 * Extract descriptions from a specific position in line - EXACT sequence matching
 */
function extractFromPosition(line, startPos) {
  const descSection = line.substring(startPos, startPos + 600);
  const descriptions = [];
  
  // Parse EXACTLY as they appear: "SEAL-O-RING SEAL-O-RING SEAL-O-RING RING METAL, RETAINING RING METAL, RETAINING LINER CYLINDER..."
  // Extract in the exact order they appear
  
  let pos = 0;
  const section = descSection;
  
  // Process character by character to extract complete descriptions
  while (pos < section.length && descriptions.length < 15) {
    // Skip whitespace
    while (pos < section.length && /\s/.test(section[pos])) pos++;
    if (pos >= section.length) break;
    
    // Pattern 1: Hyphenated term (SEAL-O-RING)
    // Match: SEAL-O-RING, BEARING-CONE, etc.
    // Use a simpler pattern that definitely works
    const hyphenMatch = section.substring(pos).match(/^([A-Z][A-Za-z]*-[A-Z][A-Za-z]*(?:-[A-Z][A-Za-z]*)?)/);
    if (hyphenMatch && hyphenMatch[1].length >= 5 && hyphenMatch[1].length <= 30) {
      // Check if followed by space, end, or number (end of description)
      const nextChar = section[pos + hyphenMatch[0].length];
      if (!nextChar || /\s/.test(nextChar) || /[0-9]/.test(nextChar)) {
        descriptions.push(hyphenMatch[1]);
        pos += hyphenMatch[0].length;
        continue;
      }
    }
    
    // Pattern 2: Multi-word with comma (RING METAL, RETAINING)
    const commaMatch = section.substring(pos).match(/^([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+),\s+[A-Z][A-Za-z]+)\b/);
    if (commaMatch) {
      descriptions.push(commaMatch[1]);
      pos += commaMatch[0].length;
      continue;
    }
    
    // Pattern 3: Two-word description (LINER CYLINDER)
    const twoWordMatch = section.substring(pos).match(/^([A-Z][A-Za-z]{4,}(?:\s+[A-Z][A-Za-z]{4,}))\b/);
    if (twoWordMatch) {
      const desc = twoWordMatch[1];
      // Filter out brands, origins
      if (!desc.match(/^(PRC|USA|ITAL|TURK|IND|KOR|UK|CHN|AFR|TAIW|JAP|GER|SAM|JPN|CAT|R|WG|ITR|MAH|CTC|VAR|FP|KMP|NTN|FAG|TIMKEN|SKF)\s/i)) {
        // Check if it's a technical term
        const techTerms = ['SEAL', 'RING', 'BEARING', 'GASKET', 'FILTER', 'PUMP', 'CYLINDER', 'GEAR', 'SHAFT', 'BOLT', 'NUT', 'WASHER', 'PIN', 'LINER', 'VALVE', 'PISTON', 'BLOCK', 'METAL', 'RETAINING', 'LOCK', 'DOWEL', 'SNAP', 'BALL'];
        const descUpper = desc.toUpperCase();
        if (techTerms.some(term => descUpper.includes(term))) {
          descriptions.push(desc);
          pos += twoWordMatch[0].length;
          continue;
        }
      }
    }
    
    // If no pattern matches, skip one character
    pos++;
    
    // Stop if we hit numbers or prices (end of description section)
    if (section[pos] && /[\d,.]/.test(section.substring(pos, pos + 10))) {
      break;
    }
  }
  
  return descriptions;
}

/**
 * Find exact description for item
 */
function findExactDescription(item, allLines) {
  const partNo = item['part no.'] || '';
  const ssPartNo = item['ss part no'] || '';
  const searchTerm = partNo || ssPartNo;
  
  if (!searchTerm) return '';
  
  // Find line
  let targetLine = '';
  for (let i = 0; i < allLines.length; i++) {
    if (allLines[i].includes(searchTerm) && allLines[i].length > 50) {
      targetLine = allLines[i];
      break;
    }
  }
  
  if (!targetLine) return '';
  
  // Find column index
  const partNoPattern = /\b([0-9]{4,7}|[0-9]{5}-[0-9]{5}|[0-9]{3}-[0-9]{2}-[0-9]{5}|[A-Z0-9\-]{4,20})\b/g;
  const partNos = [];
  let match;
  while ((match = partNoPattern.exec(targetLine)) !== null) {
    const pn = match[1];
    if (!pn.includes('.') && !pn.match(/^\d{1,3}$/) && pn.length >= 4) {
      partNos.push(pn);
    }
  }
  
  let columnIndex = -1;
  for (let i = 0; i < partNos.length; i++) {
    if (partNos[i] === searchTerm) {
      columnIndex = i;
      break;
    }
  }
  
  if (columnIndex === -1) return '';
  
  const firstHalfCount = Math.floor(partNos.length / 2);
  const relativeColumnIndex = columnIndex < firstHalfCount ? columnIndex : columnIndex - firstHalfCount;
  
  // Extract descriptions in order
  const descriptions = extractDescriptionsInOrder(targetLine);
  
  if (descriptions.length > 0 && relativeColumnIndex >= 0 && relativeColumnIndex < descriptions.length) {
    return descriptions[relativeColumnIndex].substring(0, 200).trim();
  }
  
  return '';
}

/**
 * Main
 */
function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 FIXING DESCRIPTIONS (EXACT PDF MATCH)');
  console.log('='.repeat(60) + '\n');
  
  const { jsonData, pdfText, allLines } = loadData();
  const items = jsonData.items;
  
  let fixedCount = 0;
  let unchangedCount = 0;
  
  console.log('🔍 Processing items...\n');
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const oldDesc = item.decc || '';
    
    const newDesc = findExactDescription(item, allLines);
    
    if (newDesc && newDesc.length >= 3) {
      if (newDesc !== oldDesc) {
        item.decc = newDesc;
        fixedCount++;
      } else {
        unchangedCount++;
      }
    } else {
      unchangedCount++;
    }
    
    if ((i + 1) % 500 === 0) {
      process.stdout.write(`   ⏳ Processed ${i + 1}/${items.length} (${fixedCount} fixed)...\r`);
    }
  }
  
  console.log(`\n   ✅ Processed ${items.length} items`);
  console.log(`   📊 Fixed: ${fixedCount}`);
  console.log(`   📊 Unchanged: ${unchangedCount}\n`);
  
  // Save
  console.log('💾 Saving...');
  fs.writeFileSync(JSON_PATH, JSON.stringify(jsonData, null, 2), 'utf-8');
  console.log(`   ✅ Saved\n`);
  
  // Verify
  console.log('📋 Verifying specific items:');
  const testParts = ['1258274', '0328970', '328970', '0353360', '353360', '037WN29'];
  testParts.forEach(pn => {
    const item = items.find(i => i['part no.'] === pn || i['ss part no'] === pn);
    if (item) {
      const expected = pn === '1258274' || pn === '0328970' || pn === '328970' ? 'SEAL-O-RING' :
                       pn === '0353360' || pn === '353360' ? 'RING METAL, RETAINING' :
                       pn === '037WN29' ? 'LINER CYLINDER' : '';
      const match = expected && item.decc && item.decc.toUpperCase().includes(expected.toUpperCase().replace(/,/g, '').replace(/\s+/g, ' '));
      console.log(`   ${match ? '✅' : '❌'} Part: ${pn} -> "${item.decc || 'N/A'}" (expected: ${expected})`);
    }
  });
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ COMPLETE');
  console.log('='.repeat(60) + '\n');
}

main();

