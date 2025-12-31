/**
 * Accurately extract and fix description (decc) field in JSON from PDF
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
 * Find description for a specific item by analyzing columnar structure
 */
function findDescriptionForItem(item, pdfText, allLines) {
  const partNo = item['part no.'] || '';
  const ssPartNo = item['ss part no'] || '';
  const searchTerm = partNo || ssPartNo;
  
  if (!searchTerm) return '';
  
  // Find ALL lines containing this part number
  const matchingLines = [];
  for (let i = 0; i < allLines.length; i++) {
    if (allLines[i].includes(searchTerm) && allLines[i].length > 50) {
      matchingLines.push({ line: allLines[i], idx: i });
    }
  }
  
  if (matchingLines.length === 0) {
    // Try variations
    const searchVariations = [
      searchTerm,
      searchTerm.replace(/-/g, ''),
      searchTerm.substring(0, Math.max(4, searchTerm.length - 2))
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
  
  // Try all matching lines
  for (const matchInfo of matchingLines) {
    const targetLine = matchInfo.line;
    const targetLineIdx = matchInfo.idx;
    
    // Find part number position in line
    const partNoIndex = targetLine.indexOf(searchTerm);
    if (partNoIndex === -1) continue;
    
    // Get context
    const contextStart = Math.max(0, targetLineIdx - 5);
    const contextEnd = Math.min(allLines.length, targetLineIdx + 5);
    const contextLines = allLines.slice(contextStart, contextEnd);
    const contextText = contextLines.join(' ');
    
    // Strategy 1: Extract description from the same line
    // Descriptions usually appear after part numbers and SS part numbers
    // They're text sequences that don't look like part numbers or prices
    
    // Find all part numbers in the line to understand structure
    const partNoPattern = /\b([0-9]{4,7}|[0-9]{5}-[0-9]{5}|[0-9]{3}-[0-9]{2}-[0-9]{5}|[A-Z0-9\-]{4,20})\b/g;
    const allPartNos = [];
    let match;
    while ((match = partNoPattern.exec(targetLine)) !== null) {
      const partNoValue = match[1];
      if (!partNoValue.includes('.') && 
          !partNoValue.match(/^\d{1,3}$/) && 
          partNoValue.length >= 4) {
        allPartNos.push({ value: partNoValue, index: match.index });
      }
    }
    
    // Find column index
    let columnIndex = -1;
    for (let i = 0; i < allPartNos.length; i++) {
      if (allPartNos[i].value === searchTerm) {
        columnIndex = i;
        break;
      }
    }
    
    // Descriptions appear after part numbers and SS part numbers
    // They're usually separated by multiple spaces or appear in a text section
    
    // Strategy: Look for text after part numbers that looks like descriptions
    // Descriptions are usually: uppercase words, mixed case, contain common words
    
    // Find the section after part numbers (usually after SS part numbers too)
    // Look for text patterns that are descriptions
    
    // Extract text after the part number position
    const afterPartNo = targetLine.substring(partNoIndex + searchTerm.length);
    
    // Look for description patterns
    // Descriptions usually start with uppercase letters and contain words
    const descPatterns = [
      // Pattern: Uppercase word followed by more text
      /\b([A-Z][A-Za-z\s\(\)0-9\-\/]{15,200})\b/g,
      // Pattern: Mixed case description
      /\b([A-Z][a-z]+(?:\s+[A-Za-z]+){3,30})\b/g,
      // Pattern: All caps words (common in descriptions)
      /\b([A-Z]{2,}(?:\s+[A-Z]{2,}){2,20})\b/g
    ];
    
    for (const pattern of descPatterns) {
      const matches = [...afterPartNo.matchAll(pattern)];
      if (matches.length > 0) {
        // Try to find the description that corresponds to our column
        // Descriptions are usually in the same order as part numbers
        
        let bestDesc = '';
        let bestScore = 0;
        
        for (const descMatch of matches) {
          let desc = descMatch[1].trim();
          
          // Clean up - remove part numbers, prices, and other non-description text
          desc = desc.replace(/\b([0-9]{4,15}|[0-9]{3,5}-[0-9]{3,5})\b/g, '');
          desc = desc.replace(/\b\d{1,3}(?:,\d{3})*(?:\.\d+)?\b/g, '');
          desc = desc.replace(/\b(PRC|USA|ITAL|TURK|IND|KOR|UK|CHN|AFR|TAIW|JAP|GER|SAM|JPN)\b/gi, '');
          desc = desc.replace(/\b(Part No\.|SS Part No|Desc\.|Appl\.|Main|Sub|Brand|Loc\.|Cost\.|Price A|Price B|Mkt\.Price|Origin|Grade|Ord\.Lvl\.|Wheight|Size|Remarks|Models|Cons\.Qty)\b/gi, '');
          desc = desc.replace(/\s{2,}/g, ' ').trim();
          
          // Score the description quality
          let score = 0;
          if (desc.length >= 10 && desc.length <= 300) score += 10;
          if (desc.match(/[A-Za-z]{4,}/)) score += 5; // Has meaningful words
          if (desc.match(/\b(BEARING|SEAL|RING|GASKET|FILTER|PUMP|CYLINDER|GEAR|SHAFT|BOLT|NUT|WASHER|PIN|LINER|VALVE|PISTON|BLOCK|GROUP|SYSTEM|ASSEMBLY|ASSY)\b/i)) score += 10; // Has technical terms
          if (!desc.match(/^\d+$/) && !desc.match(/^[A-Z]{1,3}$/)) score += 5; // Not just numbers or short codes
          
          if (score > bestScore) {
            bestScore = score;
            bestDesc = desc;
          }
        }
        
        if (bestDesc && bestDesc.length >= 10) {
          // Limit description length
          return bestDesc.substring(0, 250).trim();
        }
      }
    }
    
    // Strategy 2: Look in context for description patterns
    // Sometimes descriptions span multiple lines or appear in header sections
    
    // Look for "Desc." headers followed by descriptions
    const descHeaderPattern = /Desc\.\s+Desc\./gi;
    let descHeaderIndex = -1;
    
    for (let i = Math.max(0, targetLineIdx - 10); i < targetLineIdx; i++) {
      if (allLines[i].match(descHeaderPattern)) {
        descHeaderIndex = i;
        break;
      }
    }
    
    if (descHeaderIndex >= 0) {
      // Find descriptions in the line after the header
      const descLine = allLines[descHeaderIndex + 1] || '';
      if (descLine.length > 20) {
        // Split by multiple spaces to get column values
        const descColumns = descLine.split(/\s{3,}/).map(d => d.trim()).filter(d => d.length > 5);
        
        if (descColumns.length > 0 && columnIndex >= 0) {
          // Try to match by column index
          if (columnIndex < descColumns.length) {
            let desc = descColumns[columnIndex];
            // Clean up
            desc = desc.replace(/\b([0-9]{4,15}|[0-9]{3,5}-[0-9]{3,5})\b/g, '');
            desc = desc.replace(/\b\d{1,3}(?:,\d{3})*(?:\.\d+)?\b/g, '');
            desc = desc.replace(/\s{2,}/g, ' ').trim();
            
            if (desc.length >= 10 && desc.length <= 300) {
              return desc.substring(0, 250).trim();
            }
          }
        }
      }
    }
    
    // Strategy 3: Extract from context text using pattern matching
    const contextDescPatterns = [
      new RegExp(`${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+([A-Z][A-Za-z\\s\\(\\)0-9\\-\\/]{15,200})`, 'i'),
      new RegExp(`([A-Z][A-Za-z]+(?:\\s+[A-Za-z]+){5,50})`, 'g')
    ];
    
    for (const pattern of contextDescPatterns) {
      const matches = [...contextText.matchAll(pattern)];
      if (matches.length > 0) {
        for (const descMatch of matches) {
          let desc = descMatch[1].trim();
          
          // Clean up
          desc = desc.replace(/\b([0-9]{4,15}|[0-9]{3,5}-[0-9]{3,5})\b/g, '');
          desc = desc.replace(/\b\d{1,3}(?:,\d{3})*(?:\.\d+)?\b/g, '');
          desc = desc.replace(/\b(PRC|USA|ITAL|TURK|IND|KOR|UK|CHN|AFR|TAIW|JAP|GER|SAM|JPN)\b/gi, '');
          desc = desc.replace(/\s{2,}/g, ' ').trim();
          
          if (desc.length >= 10 && desc.length <= 300) {
            // Check if it looks like a description
            if (desc.match(/[A-Za-z]{4,}/) && !desc.match(/^[A-Z]{1,3}$/)) {
              return desc.substring(0, 250).trim();
            }
          }
        }
      }
    }
  }
  
  return '';
}

/**
 * Fix descriptions in JSON
 */
function fixDescriptions(jsonData, pdfText) {
  console.log('\n' + '='.repeat(60));
  console.log('🔍 FIXING DESCRIPTION FIELD');
  console.log('='.repeat(60) + '\n');
  
  const allLines = pdfText.split(/\n|\r/).map(l => l.trim()).filter(l => l.length > 10);
  const items = jsonData.items;
  
  let fixedCount = 0;
  let unchangedCount = 0;
  let emptyCount = 0;
  let improvedCount = 0;
  
  console.log(`   Processing ${items.length} items...\n`);
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const oldDesc = item.decc || '';
    
    // Try to find accurate description
    const newDesc = findDescriptionForItem(item, pdfText, allLines);
    
    if (newDesc) {
      // Clean up the new description
      let cleanedDesc = newDesc
        .replace(/\s{2,}/g, ' ')
        .replace(/^\s+|\s+$/g, '')
        .substring(0, 250)
        .trim();
      
      if (cleanedDesc.length >= 10) {
        // Check if it's better than the old one
        if (cleanedDesc !== oldDesc) {
          // Check if new description is more meaningful
          const oldScore = oldDesc.length > 0 ? (oldDesc.match(/[A-Za-z]{4,}/g) || []).length : 0;
          const newScore = (cleanedDesc.match(/[A-Za-z]{4,}/g) || []).length;
          
          if (newScore > oldScore || oldDesc.length < 10) {
            item.decc = cleanedDesc;
            fixedCount++;
            if (oldDesc.length > 0) improvedCount++;
          } else {
            unchangedCount++;
          }
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
    } else {
      if (!oldDesc) {
        emptyCount++;
      } else {
        unchangedCount++;
      }
    }
    
    if ((i + 1) % 500 === 0) {
      process.stdout.write(`   ⏳ Processed ${i + 1}/${items.length} items (${fixedCount} fixed, ${improvedCount} improved)...\r`);
    }
  }
  
  console.log(`\n   ✅ Processed ${items.length} items`);
  console.log(`   📊 Fixed: ${fixedCount}`);
  console.log(`   📊 Improved: ${improvedCount}`);
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
  console.log('🚀 FIXING DESCRIPTION FIELD IN JSON');
  console.log('='.repeat(60));
  
  try {
    // Load data
    const jsonData = loadJSON();
    const pdfText = loadPDFText();
    
    // Fix descriptions
    const updatedData = fixDescriptions(jsonData, pdfText);
    
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

