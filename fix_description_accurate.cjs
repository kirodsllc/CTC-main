/**
 * Accurately extract descriptions from PDF - match exact column structure
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
 * Find accurate description by matching column position
 */
function findAccurateDescription(item, allLines) {
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
  
  // Find part number position in line
  const partNoIndex = targetLine.indexOf(searchTerm);
  if (partNoIndex === -1) return '';
  
  // Find column index of this part number
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
  
  // If in first half, it's Part No column; if in second half, it's SS Part No column
  const firstHalfCount = Math.floor(partNos.length / 2);
  const isPartNoColumn = columnIndex < firstHalfCount;
  const relativeColumnIndex = isPartNoColumn ? columnIndex : columnIndex - firstHalfCount;
  
  // Looking at the PDF structure, descriptions appear in the same line as part numbers
  // They're in a specific section after part numbers and SS part numbers
  // From the image: "SEAL-O-RING", "RING METAL, RETAINING", "LINER CYLINDER"
  
  // The structure in line 2 shows:
  // Part Nos -> SS Part Nos -> Descriptions (CAT R WG CAT ITR MAH...) -> then "SEAL-O-RING SEAL-O-RING SEAL-O-RING RING METAL, RETAINING..."
  
  // Find "Desc." header row to locate description section
  let descHeaderIdx = -1;
  for (let i = Math.max(0, targetLineIdx - 20); i < targetLineIdx; i++) {
    if (allLines[i].match(/Desc\.\s+Desc\./i)) {
      descHeaderIdx = i;
      break;
    }
  }
  
  // Descriptions are in the SAME line as part numbers, just in a different section
  // Look for the description section in the target line itself
  // After part numbers and SS part numbers, there's a section with descriptions
  
  // Find where descriptions start in the line
  // They usually appear after all part numbers (both Part No and SS Part No columns)
  // Looking at the structure: descriptions are words like "SEAL-O-RING", "RING METAL, RETAINING"
  
  // Looking at the PDF structure from line 2:
  // Part Nos -> SS Part Nos -> Brands -> Descriptions section
  // The descriptions section starts with "SEAL-O-RING SEAL-O-RING SEAL-O-RING RING METAL, RETAINING..."
  
  // Find where the description section starts in the line
  // It's after part numbers, SS part numbers, and brands
  // Look for the pattern: technical terms like "SEAL-O-RING", "RING METAL, RETAINING", etc.
  
  // Strategy: Find the section that contains descriptions by looking for technical terms
  // Descriptions are usually: "SEAL-O-RING", "RING METAL, RETAINING", "LINER CYLINDER", etc.
  
  // Extract all potential descriptions with better pattern matching
  // Pattern 1: Hyphenated technical terms (SEAL-O-RING, etc.)
  const hyphenatedPattern = /\b([A-Z][A-Za-z]+(?:-[A-Z][A-Za-z]+(?:-[A-Z][A-Za-z]+)?)+)\b/g;
  // Pattern 2: Multi-word with comma (RING METAL, RETAINING)
  const commaPattern = /\b([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){1,2},\s+[A-Z][A-Za-z]+)\b/g;
  // Pattern 3: Multi-word descriptions (LINER CYLINDER, PIN DOWEL, etc.)
  const multiWordPattern = /\b([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){1,3})\b/g;
  // Pattern 4: Single technical terms
  const singleTermPattern = /\b([A-Z][A-Za-z]{5,})\b/g;
  
  const allDescs = [];
  const techTerms = ['SEAL', 'RING', 'BEARING', 'GASKET', 'FILTER', 'PUMP', 'CYLINDER', 'GEAR', 'SHAFT', 'BOLT', 'NUT', 'WASHER', 'PIN', 'LINER', 'VALVE', 'PISTON', 'BLOCK', 'METAL', 'RETAINING', 'LOCK', 'DOWEL', 'SNAP', 'BALL', 'OIL', 'AIR', 'FUEL', 'HYDRAULIC', 'TRANSMISSION', 'ENGINE', 'CONVERTER', 'CONVERTOR'];
  
  // Try hyphenated first (most specific)
  let descMatch;
  while ((descMatch = hyphenatedPattern.exec(targetLine)) !== null) {
    let desc = descMatch[1].trim();
    if (desc.length >= 5 && desc.length <= 50) {
      const descUpper = desc.toUpperCase();
      if (techTerms.some(term => descUpper.includes(term)) && 
          !desc.match(/^(PRC|USA|ITAL|TURK|IND|KOR|UK|CHN|AFR|TAIW|JAP|GER|SAM|JPN|CAT|R|WG|ITR|MAH|CTC|VAR|FP|KMP|NTN|FAG|TIMKEN|SKF)$/i)) {
        allDescs.push({ value: desc, index: descMatch.index, priority: 1 });
      }
    }
  }
  
  // Try comma pattern
  while ((descMatch = commaPattern.exec(targetLine)) !== null) {
    let desc = descMatch[1].trim();
    if (desc.length >= 8 && desc.length <= 50) {
      const descUpper = desc.toUpperCase();
      if (techTerms.some(term => descUpper.includes(term))) {
        allDescs.push({ value: desc, index: descMatch.index, priority: 2 });
      }
    }
  }
  
  // Try multi-word
  while ((descMatch = multiWordPattern.exec(targetLine)) !== null) {
    let desc = descMatch[1].trim();
    if (desc.length >= 5 && desc.length <= 50) {
      const descUpper = desc.toUpperCase();
      // Filter out brands, origins, headers
      if (desc.match(/^(PRC|USA|ITAL|TURK|IND|KOR|UK|CHN|AFR|TAIW|JAP|GER|SAM|JPN|CAT|R|WG|ITR|MAH|CTC|VAR|FP|KMP|NTN|FAG|TIMKEN|SKF|CATERPILLER|KOMATSU|CUMMINS|HYUNDAI|KOBELCO|HITACHI|VOLVO|JCB|CASE|DEERE|Part|SS|No|Desc|Appl|Main|Sub|Brand|Loc|Cost|Price|Mkt|Origin|Grade|Ord|Lvl|Wheight|Size|Remarks|Models|Cons|Qty|Page|of|PARTS|LIST)$/i)) continue;
      if (techTerms.some(term => descUpper.includes(term))) {
        // Check if not duplicate
        const isDuplicate = allDescs.some(d => d.value === desc);
        if (!isDuplicate) {
          allDescs.push({ value: desc, index: descMatch.index, priority: 3 });
        }
      }
    }
  }
  
  // Sort by index to maintain column order, then by priority
  allDescs.sort((a, b) => {
    if (a.index !== b.index) return a.index - b.index;
    return a.priority - b.priority;
  });
  
  // The descriptions appear in a specific section after brands
  // From the PDF: "SEAL-O-RING SEAL-O-RING SEAL-O-RING RING METAL, RETAINING RING METAL, RETAINING LINER CYLINDER..."
  // These are in the exact same column order as part numbers
  
  // Find where the description section starts (after brands like "CAT R WG CAT ITR MAH...")
  // Look for the first occurrence of a technical description term
  let descSectionStart = -1;
  for (let i = 0; i < allDescs.length; i++) {
    const descUpper = allDescs[i].value.toUpperCase();
    if (descUpper.includes('SEAL-O-RING') || descUpper.includes('RING METAL') || descUpper.includes('LINER CYLINDER')) {
      descSectionStart = allDescs[i].index;
      break;
    }
  }
  
  // If we found the description section, extract descriptions in order
  if (descSectionStart >= 0 && relativeColumnIndex >= 0) {
    // Filter descriptions that are in the description section (after the start)
    const descSectionDescs = allDescs.filter(d => d.index >= descSectionStart);
    
    if (descSectionDescs.length > 0 && relativeColumnIndex < descSectionDescs.length) {
      let desc = descSectionDescs[relativeColumnIndex].value;
      
      // Clean up - remove extra words that might have been captured
      desc = desc.replace(/\s{2,}/g, ' ').trim();
      
      // Remove duplicate words at the start (like "RING RING METAL" -> "RING METAL")
      const words = desc.split(/\s+/);
      const cleanedWords = [];
      let lastWord = '';
      for (const word of words) {
        if (word !== lastWord) {
          cleanedWords.push(word);
          lastWord = word;
        }
      }
      desc = cleanedWords.join(' ');
      
      if (desc.length >= 3 && desc.length <= 200) {
        return desc.substring(0, 200).trim();
      }
    }
  }
  
  if (allDescs.length > 0 && relativeColumnIndex >= 0) {
    // Try to match by column position
    if (relativeColumnIndex < allDescs.length) {
      let desc = allDescs[relativeColumnIndex].value;
      desc = desc.replace(/\s{2,}/g, ' ').trim();
      
      // Remove duplicate words
      const words = desc.split(/\s+/);
      const cleanedWords = [];
      let lastWord = '';
      for (const word of words) {
        if (word !== lastWord) {
          cleanedWords.push(word);
          lastWord = word;
        }
      }
      desc = cleanedWords.join(' ');
      
      if (desc.length >= 3 && desc.length <= 200) {
        return desc.substring(0, 200).trim();
      }
    }
    
    // If column index doesn't match, find description closest to part number position
    if (partNoIndex >= 0) {
      let closestDesc = '';
      let closestDistance = Infinity;
      
      for (const descItem of allDescs) {
        const distance = Math.abs(descItem.index - partNoIndex);
        // Prefer descriptions that appear after the part number
        if (descItem.index > partNoIndex && distance < 1500 && distance < closestDistance) {
          closestDistance = distance;
          closestDesc = descItem.value;
        }
      }
      
      if (closestDesc) {
        // Clean up
        const words = closestDesc.split(/\s+/);
        const cleanedWords = [];
        let lastWord = '';
        for (const word of words) {
          if (word !== lastWord) {
            cleanedWords.push(word);
            lastWord = word;
          }
        }
        return cleanedWords.join(' ').substring(0, 200).trim();
      }
    }
    
    // Fallback: use description at relative column position (modulo)
    if (allDescs.length > 0) {
      const idx = relativeColumnIndex % allDescs.length;
      if (allDescs[idx]) {
        let desc = allDescs[idx].value;
        // Clean up duplicate words
        const words = desc.split(/\s+/);
        const cleanedWords = [];
        let lastWord = '';
        for (const word of words) {
          if (word !== lastWord) {
            cleanedWords.push(word);
            lastWord = word;
          }
        }
        return cleanedWords.join(' ').substring(0, 200).trim();
      }
    }
  }
  
  // Fallback: Look in the same line for description patterns after part numbers
  // partNoIndex already defined above
  if (partNoIndex >= 0) {
    // Look for text after part numbers that looks like a description
    // Descriptions usually appear after all part numbers and SS part numbers
    // They're usually 2-10 words, starting with uppercase
    
    // Find where part numbers end (approximately)
    const partNoEnd = partNoIndex + searchTerm.length;
    const afterPartNos = targetLine.substring(partNoEnd);
    
    // Look for description patterns - sequences of words
    const descPattern = /\b([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){1,15})\b/g;
    const descMatches = [...afterPartNos.matchAll(descPattern)];
    
    if (descMatches.length > 0) {
      // Try to match by column position
      if (relativeColumnIndex >= 0 && relativeColumnIndex < descMatches.length && descMatches[relativeColumnIndex]) {
        let desc = descMatches[relativeColumnIndex][1];
        
        // Clean up
        desc = desc.replace(/\b([0-9]{4,15}|[0-9]{3,5}-[0-9]{3,5})\b/g, '');
        desc = desc.replace(/\b\d{1,3}(?:,\d{3})*(?:\.\d+)?\b/g, '');
        desc = desc.replace(/\b(PRC|USA|ITAL|TURK|IND|KOR|UK|CHN|AFR|TAIW|JAP|GER|SAM|JPN)\b/gi, '');
        desc = desc.replace(/\s{2,}/g, ' ').trim();
        
        if (desc.length >= 3 && desc.length <= 200 && desc.match(/\b[A-Za-z]{3,}\b/)) {
          return desc.substring(0, 200).trim();
        }
      }
      
      // Use first match if column doesn't match
      if (descMatches.length > 0 && descMatches[0]) {
        let desc = descMatches[0][1];
        desc = desc.replace(/\b([0-9]{4,15}|[0-9]{3,5}-[0-9]{3,5})\b/g, '');
        desc = desc.replace(/\b\d{1,3}(?:,\d{3})*(?:\.\d+)?\b/g, '');
        desc = desc.replace(/\b(PRC|USA|ITAL|TURK|IND|KOR|UK|CHN|AFR|TAIW|JAP|GER|SAM|JPN)\b/gi, '');
        desc = desc.replace(/\s{2,}/g, ' ').trim();
        
        if (desc.length >= 3 && desc.length <= 200 && desc.match(/\b[A-Za-z]{3,}\b/)) {
          return desc.substring(0, 200).trim();
        }
      }
    }
  }
  
  return '';
}

/**
 * Main function
 */
function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 FIXING DESCRIPTIONS (ACCURATE EXTRACTION)');
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
    
    // Get accurate description
    const newDesc = findAccurateDescription(item, allLines);
    
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
  
  // Show samples
  console.log('📋 Sample descriptions:');
  for (let i = 0; i < 10; i++) {
    const idx = Math.floor(Math.random() * items.length);
    const item = items[idx];
    console.log(`   Part: ${item['part no.']} -> Desc: ${(item.decc || 'N/A').substring(0, 60)}`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ COMPLETE');
  console.log('='.repeat(60) + '\n');
}

main();

