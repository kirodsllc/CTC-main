/**
 * Accurately extract and fix origin field in JSON from PDF
 */

const fs = require('fs');
const path = require('path');

const JSON_PATH = path.join(__dirname, 'CTC Item Lists.json');
const TEXT_PATH = path.join(__dirname, 'pdf_extracted_text.txt');

/**
 * Load JSON data
 */
function loadJSON() {
  console.log('📄 Loading JSON file...');
  const jsonData = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'));
  console.log(`   ✅ Loaded ${jsonData.items.length} items\n`);
  return jsonData;
}

/**
 * Load PDF text
 */
function loadPDFText() {
  console.log('📄 Loading PDF extracted text...');
  const text = fs.readFileSync(TEXT_PATH, 'utf-8');
  console.log(`   ✅ Loaded ${text.length} characters\n`);
  return text;
}

/**
 * Find origin for a specific item by analyzing columnar structure
 * Enhanced version with multiple strategies
 */
function findOriginForItem(item, pdfText, allLines) {
  const partNo = item['part no.'] || '';
  const ssPartNo = item['ss part no'] || '';
  const searchTerm = partNo || ssPartNo;
  
  if (!searchTerm) return '';
  
  // Find ALL lines containing this part number (might appear multiple times)
  const matchingLines = [];
  for (let i = 0; i < allLines.length; i++) {
    if (allLines[i].includes(searchTerm) && allLines[i].length > 50) {
      matchingLines.push({ line: allLines[i], idx: i });
    }
  }
  
  if (matchingLines.length === 0) {
    // Strategy: Try searching with partial match or variations
    const searchVariations = [
      searchTerm,
      searchTerm.replace(/-/g, ''),
      searchTerm.substring(0, Math.max(4, searchTerm.length - 2)),
      searchTerm.substring(Math.max(0, searchTerm.length - 6))
    ];
    
    for (const variant of searchVariations) {
      if (variant.length < 4) continue;
      for (let i = 0; i < allLines.length; i++) {
        if (allLines[i].includes(variant) && allLines[i].length > 50) {
          matchingLines.push({ line: allLines[i], idx: i });
          break;
        }
      }
      if (matchingLines.length > 0) break;
    }
  }
  
  if (matchingLines.length === 0) return '';
  
  // Try all matching lines, not just the first one
  for (const matchInfo of matchingLines) {
    const targetLine = matchInfo.line;
    const targetLineIdx = matchInfo.idx;
  
  // Find all part numbers in this line to determine column structure
  const partNoPattern = /\b([0-9]{4,7}|[0-9]{5}-[0-9]{5}|[0-9]{3}-[0-9]{2}-[0-9]{5}|[A-Z0-9\-]{4,20})\b/g;
  const allPartNos = [];
  let match;
  while ((match = partNoPattern.exec(targetLine)) !== null) {
    const partNoValue = match[1];
    // Filter valid part numbers
    if (!partNoValue.includes('.') && 
        !partNoValue.match(/^\d{1,3}$/) && 
        partNoValue.length >= 4) {
      allPartNos.push({ value: partNoValue, index: match.index });
    }
  }
  
  // Find which column index our part number is at
  let columnIndex = -1;
  for (let i = 0; i < allPartNos.length; i++) {
    if (allPartNos[i].value === searchTerm) {
      columnIndex = i;
      break;
    }
  }
  
  // If not found in first group, it might be in SS Part No group
  // In that case, column index would be the position in SS Part No group
  if (columnIndex === -1) {
    // Look for it in the second half of part numbers (SS Part No section)
    const secondHalf = allPartNos.slice(Math.floor(allPartNos.length / 2));
    for (let i = 0; i < secondHalf.length; i++) {
      if (secondHalf[i].value === searchTerm) {
        columnIndex = i; // Position in SS Part No group
        break;
      }
    }
  }
  
  // Get context lines
  const contextStart = Math.max(0, targetLineIdx - 5);
  const contextEnd = Math.min(allLines.length, targetLineIdx + 5);
  const contextLines = allLines.slice(contextStart, contextEnd);
  const contextText = contextLines.join(' ');
  
  // Find all origin codes in the target line and context
  const originPattern = /\b(PRC|USA|ITAL|TURK|IND|KOR|UK|CHN|AFR|TAIW|JAP|GER|SAM|JPN|CHINA|INDIA|JAPAN|KOREA|ITALY|TURKEY)\b/gi;
  
  // Strategy: Find origin section in the line
  // Origins usually appear after descriptions and before prices/grades
  // They're often grouped together: "PRC PRC PRC ITAL PRC ITAL PRC -"
  
  const allOrigins = [];
  let originMatch;
  const originRegex = new RegExp(originPattern.source, 'gi');
  while ((originMatch = originRegex.exec(targetLine)) !== null) {
    allOrigins.push({ value: originMatch[1].toUpperCase(), index: originMatch.index });
  }
  
  if (allOrigins.length > 0) {
    // Origins are usually in a sequence corresponding to column positions
    // Try to match by column index
    if (columnIndex >= 0 && columnIndex < allOrigins.length) {
      return allOrigins[columnIndex].value;
    }
    
    // If column index doesn't match directly, try to find pattern
    // Origins might be grouped, so find the one closest to our part number position
    const partNoPos = targetLine.indexOf(searchTerm);
    if (partNoPos >= 0) {
      // Find origin closest to part number (within reasonable distance)
      let closestOrigin = '';
      let closestDistance = Infinity;
      
      for (const origin of allOrigins) {
        const distance = Math.abs(origin.index - partNoPos);
        // Origins usually appear after part numbers, so prefer ones after
        if (origin.index > partNoPos && distance < 800 && distance < closestDistance) {
          closestDistance = distance;
          closestOrigin = origin.value;
        }
      }
      
      if (closestOrigin) {
        return closestOrigin;
      }
      
      // Fallback: use origin at same relative position
      if (allOrigins.length > 0) {
        const relativeIndex = Math.min(Math.max(0, columnIndex) % allOrigins.length, allOrigins.length - 1);
        if (allOrigins[relativeIndex]) {
          return allOrigins[relativeIndex].value;
        }
        // Ultimate fallback: first origin
        return allOrigins[0].value;
      }
    }
  }
  
  // Strategy 2: Look in context for origins near this part number
  const contextOrigins = [];
  const contextOriginRegex = new RegExp(originPattern.source, 'gi');
  while ((originMatch = contextOriginRegex.exec(contextText)) !== null) {
    contextOrigins.push({ value: originMatch[1].toUpperCase(), index: originMatch.index });
  }
  
  if (contextOrigins.length > 0) {
    const partNoPos = contextText.indexOf(searchTerm);
    if (partNoPos >= 0) {
      // Find closest origin
      let closestOrigin = '';
      let closestDistance = Infinity;
      
      for (const origin of contextOrigins) {
        const distance = Math.abs(origin.index - partNoPos);
        if (distance < 1500 && distance < closestDistance) {
          closestDistance = distance;
          closestOrigin = origin.value;
        }
      }
      
      if (closestOrigin) {
        return closestOrigin;
      }
    }
  }
  
  // Strategy 3: Look in wider context (more lines)
  const wideContextStart = Math.max(0, targetLineIdx - 15);
  const wideContextEnd = Math.min(allLines.length, targetLineIdx + 15);
  const wideContextLines = allLines.slice(wideContextStart, wideContextEnd);
  const wideContextText = wideContextLines.join(' ');
  
  const wideContextOrigins = [];
  const wideOriginRegex = new RegExp(originPattern.source, 'gi');
  while ((originMatch = wideOriginRegex.exec(wideContextText)) !== null) {
    wideContextOrigins.push({ value: originMatch[1].toUpperCase(), index: originMatch.index });
  }
  
  if (wideContextOrigins.length > 0) {
    const partNoPos = wideContextText.indexOf(searchTerm);
    if (partNoPos >= 0) {
      // Find origin closest to part number
      let closestOrigin = '';
      let closestDistance = Infinity;
      
      for (const origin of wideContextOrigins) {
        const distance = Math.abs(origin.index - partNoPos);
        if (distance < 2000 && distance < closestDistance) {
          closestDistance = distance;
          closestOrigin = origin.value;
        }
      }
      
      if (closestOrigin) {
        return closestOrigin;
      }
    }
    
    // If no close match, use most frequent origin in wide context
    const originCounts = {};
    wideContextOrigins.forEach(o => {
      originCounts[o.value] = (originCounts[o.value] || 0) + 1;
    });
    
    const sortedOrigins = Object.entries(originCounts)
      .sort((a, b) => b[1] - a[1]);
    
    if (sortedOrigins.length > 0 && sortedOrigins[0][1] > 0) {
      return sortedOrigins[0][0];
    }
  }
  
  // Strategy 4: Look for origin patterns in the entire PDF near this part number
  const partNoGlobalIndex = pdfText.indexOf(searchTerm);
  if (partNoGlobalIndex >= 0) {
    const globalContextStart = Math.max(0, partNoGlobalIndex - 2000);
    const globalContextEnd = Math.min(pdfText.length, partNoGlobalIndex + 2000);
    const globalContext = pdfText.substring(globalContextStart, globalContextEnd);
    
    const globalOrigins = [];
    const globalOriginRegex = new RegExp(originPattern.source, 'gi');
    while ((originMatch = globalOriginRegex.exec(globalContext)) !== null) {
      globalOrigins.push({ value: originMatch[1].toUpperCase(), index: originMatch.index });
    }
    
    if (globalOrigins.length > 0) {
      const relativePartNoPos = partNoGlobalIndex - globalContextStart;
      
      // Find closest origin
      let closestOrigin = '';
      let closestDistance = Infinity;
      
      for (const origin of globalOrigins) {
        const distance = Math.abs(origin.index - relativePartNoPos);
        if (distance < 1500 && distance < closestDistance) {
          closestDistance = distance;
          closestOrigin = origin.value;
        }
      }
      
      if (closestOrigin) {
        return closestOrigin;
      }
      
      // Fallback: most common origin in global context
      const globalOriginCounts = {};
      globalOrigins.forEach(o => {
        globalOriginCounts[o.value] = (globalOriginCounts[o.value] || 0) + 1;
      });
      
      const sortedGlobalOrigins = Object.entries(globalOriginCounts)
        .sort((a, b) => b[1] - a[1]);
      
      if (sortedGlobalOrigins.length > 0) {
        return sortedGlobalOrigins[0][0];
      }
    }
  }
  
  return '';
  }
  
  // If we tried all matching lines and found nothing, return empty
  return '';
}

/**
 * Fix origins in JSON
 */
function fixOrigins(jsonData, pdfText) {
  console.log('\n' + '='.repeat(60));
  console.log('🔍 FIXING ORIGIN FIELD');
  console.log('='.repeat(60) + '\n');
  
  const allLines = pdfText.split(/\n|\r/).map(l => l.trim()).filter(l => l.length > 10);
  const items = jsonData.items;
  
  let fixedCount = 0;
  let unchangedCount = 0;
  let emptyCount = 0;
  
  console.log(`   Processing ${items.length} items...\n`);
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const oldOrigin = item.origin || '';
    
    // Always try to find accurate origin from PDF (even if one exists)
    let newOrigin = findOriginForItem(item, pdfText, allLines);
    
    // If still no origin found, try alternative search strategies
    if (!newOrigin) {
      // Try searching with SS part no if part no didn't work
      if (ssPartNo && ssPartNo !== partNo) {
        const tempItem = { ...item, 'part no.': ssPartNo };
        newOrigin = findOriginForItem(tempItem, pdfText, allLines);
      }
      
      // Try searching in reverse (SS part no as primary)
      if (!newOrigin && ssPartNo) {
        const tempItem = { ...item, 'part no.': ssPartNo, 'ss part no': partNo };
        newOrigin = findOriginForItem(tempItem, pdfText, allLines);
      }
    }
    
    if (newOrigin) {
      if (newOrigin !== oldOrigin) {
        item.origin = newOrigin;
        fixedCount++;
      } else {
        unchangedCount++;
      }
    } else {
      if (!oldOrigin) {
        emptyCount++;
      } else {
        unchangedCount++;
      }
    }
    
    if ((i + 1) % 500 === 0) {
      process.stdout.write(`   ⏳ Processed ${i + 1}/${items.length} items (${fixedCount} fixed, ${unchangedCount} unchanged)...\r`);
    }
  }
  
  console.log(`\n   ✅ Processed ${items.length} items`);
  console.log(`   📊 Fixed: ${fixedCount}`);
  console.log(`   📊 Unchanged: ${unchangedCount}`);
  console.log(`   📊 Empty: ${emptyCount}\n`);
  
  return jsonData;
}

/**
 * Save updated JSON
 */
function saveJSON(jsonData, jsonPath) {
  console.log('💾 Saving updated JSON...');
  const jsonString = JSON.stringify(jsonData, null, 2);
  fs.writeFileSync(jsonPath, jsonString, 'utf-8');
  
  const fileSize = fs.statSync(jsonPath).size;
  console.log(`   ✅ Saved: ${jsonPath}`);
  console.log(`   💾 File Size: ${(fileSize / 1024).toFixed(2)} KB\n`);
}

/**
 * Main function
 */
function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 FIXING ORIGIN FIELD IN JSON');
  console.log('='.repeat(60));
  
  try {
    // Load data
    const jsonData = loadJSON();
    const pdfText = loadPDFText();
    
    // Fix origins
    const updatedData = fixOrigins(jsonData, pdfText);
    
    // Save updated JSON
    saveJSON(updatedData, JSON_PATH);
    
    console.log('='.repeat(60));
    console.log('✅ COMPLETE');
    console.log('='.repeat(60) + '\n');
    
  } catch (error) {
    console.error(`\n❌ ERROR: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
