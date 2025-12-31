/**
 * Fix remaining origins with more aggressive strategies
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
 * Find origin with very aggressive search
 */
function findOriginAggressive(item, pdfText, allLines) {
  const partNo = item['part no.'] || '';
  const ssPartNo = item['ss part no'] || '';
  
  if (!partNo && !ssPartNo) return '';
  
  const originPattern = /\b(PRC|USA|ITAL|TURK|IND|KOR|UK|CHN|AFR|TAIW|JAP|GER|SAM|JPN|CHINA|INDIA|JAPAN|KOREA|ITALY|TURKEY)\b/gi;
  
  // Strategy 1: Find all occurrences of part numbers
  const searchTerms = [partNo, ssPartNo].filter(t => t && t.length >= 4);
  
  for (const searchTerm of searchTerms) {
    // Find all lines containing this part number
    const matchingLineIndices = [];
    for (let i = 0; i < allLines.length; i++) {
      if (allLines[i].includes(searchTerm) && allLines[i].length > 30) {
        matchingLineIndices.push(i);
      }
    }
    
    if (matchingLineIndices.length === 0) continue;
    
    // For each matching line, extract origins
    for (const lineIdx of matchingLineIndices) {
      const line = allLines[lineIdx];
      
      // Get extended context
      const contextStart = Math.max(0, lineIdx - 10);
      const contextEnd = Math.min(allLines.length, lineIdx + 10);
      const contextLines = allLines.slice(contextStart, contextEnd);
      const contextText = contextLines.join(' ');
      
      // Find part number position in line
      const partNoPos = line.indexOf(searchTerm);
      if (partNoPos === -1) continue;
      
      // Extract all origins from the line
      const origins = [];
      let match;
      const originRegex = new RegExp(originPattern.source, 'gi');
      while ((match = originRegex.exec(line)) !== null) {
        origins.push({ value: match[1].toUpperCase(), index: match.index });
      }
      
      if (origins.length > 0) {
        // Find origin closest to part number
        let closestOrigin = '';
        let closestDistance = Infinity;
        
        for (const origin of origins) {
          const distance = Math.abs(origin.index - partNoPos);
          // Prefer origins that appear after the part number
          if (origin.index > partNoPos && distance < 2000 && distance < closestDistance) {
            closestDistance = distance;
            closestOrigin = origin.value;
          }
        }
        
        // If no origin after part number, use closest one
        if (!closestOrigin && origins.length > 0) {
          for (const origin of origins) {
            const distance = Math.abs(origin.index - partNoPos);
            if (distance < 2000 && distance < closestDistance) {
              closestDistance = distance;
              closestOrigin = origin.value;
            }
          }
        }
        
        if (closestOrigin) {
          return closestOrigin;
        }
        
        // Fallback: use first origin in line
        if (origins.length > 0) {
          return origins[0].value;
        }
      }
      
      // Strategy: Look in context text
      const contextOrigins = [];
      const contextOriginRegex = new RegExp(originPattern.source, 'gi');
      while ((match = contextOriginRegex.exec(contextText)) !== null) {
        contextOrigins.push({ value: match[1].toUpperCase(), index: match.index });
      }
      
      if (contextOrigins.length > 0) {
        const searchTermPos = contextText.indexOf(searchTerm);
        if (searchTermPos >= 0) {
          let closestOrigin = '';
          let closestDistance = Infinity;
          
          for (const origin of contextOrigins) {
            const distance = Math.abs(origin.index - searchTermPos);
            if (distance < 2500 && distance < closestDistance) {
              closestDistance = distance;
              closestOrigin = origin.value;
            }
          }
          
          if (closestOrigin) {
            return closestOrigin;
          }
        }
        
        // Use most frequent origin in context
        const originCounts = {};
        contextOrigins.forEach(o => {
          originCounts[o.value] = (originCounts[o.value] || 0) + 1;
        });
        
        const sorted = Object.entries(originCounts).sort((a, b) => b[1] - a[1]);
        if (sorted.length > 0 && sorted[0][1] >= 1) {
          return sorted[0][0];
        }
      }
    }
  }
  
  // Strategy 2: Global search in PDF
  for (const searchTerm of searchTerms) {
    const globalIndex = pdfText.indexOf(searchTerm);
    if (globalIndex >= 0) {
      const globalContextStart = Math.max(0, globalIndex - 3000);
      const globalContextEnd = Math.min(pdfText.length, globalIndex + 3000);
      const globalContext = pdfText.substring(globalContextStart, globalContextEnd);
      
      const globalOrigins = [];
      const globalOriginRegex = new RegExp(originPattern.source, 'gi');
      while ((match = globalOriginRegex.exec(globalContext)) !== null) {
        globalOrigins.push({ value: match[1].toUpperCase(), index: match.index });
      }
      
      if (globalOrigins.length > 0) {
        const relativePartNoPos = globalIndex - globalContextStart;
        
        let closestOrigin = '';
        let closestDistance = Infinity;
        
        for (const origin of globalOrigins) {
          const distance = Math.abs(origin.index - relativePartNoPos);
          if (distance < 2500 && distance < closestDistance) {
            closestDistance = distance;
            closestOrigin = origin.value;
          }
        }
        
        if (closestOrigin) {
          return closestOrigin;
        }
        
        // Use most frequent
        const originCounts = {};
        globalOrigins.forEach(o => {
          originCounts[o.value] = (originCounts[o.value] || 0) + 1;
        });
        
        const sorted = Object.entries(originCounts).sort((a, b) => b[1] - a[1]);
        if (sorted.length > 0) {
          return sorted[0][0];
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
  console.log('🚀 FIXING REMAINING ORIGINS (AGGRESSIVE)');
  console.log('='.repeat(60) + '\n');
  
  const { jsonData, pdfText, allLines } = loadData();
  const items = jsonData.items;
  
  let fixedCount = 0;
  let unchangedCount = 0;
  let emptyCount = 0;
  let alreadyHasOrigin = 0;
  
  console.log('🔍 Processing items...\n');
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const oldOrigin = item.origin || '';
    
    // Skip if already has a valid origin
    if (oldOrigin && oldOrigin.length > 0 && oldOrigin !== '-' && 
        oldOrigin.match(/^(PRC|USA|ITAL|TURK|IND|KOR|UK|CHN|AFR|TAIW|JAP|GER|SAM|JPN|CHINA|INDIA|JAPAN|KOREA|ITALY|TURKEY)$/i)) {
      alreadyHasOrigin++;
      if ((i + 1) % 1000 === 0) {
        process.stdout.write(`   ⏳ Processed ${i + 1}/${items.length} (${fixedCount} fixed, ${alreadyHasOrigin} already have origin)...\r`);
      }
      continue;
    }
    
    // Try to find origin
    const newOrigin = findOriginAggressive(item, pdfText, allLines);
    
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
    
    if ((i + 1) % 1000 === 0) {
      process.stdout.write(`   ⏳ Processed ${i + 1}/${items.length} (${fixedCount} fixed, ${alreadyHasOrigin} already have origin)...\r`);
    }
  }
  
  console.log(`\n   ✅ Processed ${items.length} items`);
  console.log(`   📊 Fixed: ${fixedCount}`);
  console.log(`   📊 Already had origin: ${alreadyHasOrigin}`);
  console.log(`   📊 Unchanged: ${unchangedCount}`);
  console.log(`   📊 Empty: ${emptyCount}\n`);
  
  // Save
  console.log('💾 Saving updated JSON...');
  const jsonString = JSON.stringify(jsonData, null, 2);
  fs.writeFileSync(JSON_PATH, jsonString, 'utf-8');
  
  const fileSize = fs.statSync(JSON_PATH).size;
  console.log(`   ✅ Saved: ${JSON_PATH}`);
  console.log(`   💾 File Size: ${(fileSize / 1024).toFixed(2)} KB\n`);
  
  console.log('='.repeat(60));
  console.log('✅ COMPLETE');
  console.log('='.repeat(60) + '\n');
}

main();

