/**
 * Randomly verify 50 items from JSON against PDF to check accuracy
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
  return jsonData.items;
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
 * Find item in PDF text and extract context
 */
function findItemInPDF(item, pdfText) {
  const partNo = item['part no.'] || '';
  const ssPartNo = item['ss part no'] || '';
  
  if (!partNo && !ssPartNo) {
    return { found: false, reason: 'No part number' };
  }
  
  // Search for part number in PDF
  const searchTerm = partNo || ssPartNo;
  const index = pdfText.indexOf(searchTerm);
  
  if (index === -1) {
    return { found: false, reason: 'Part number not found in PDF' };
  }
  
  // Get context around the part number (500 chars before and after)
  const contextStart = Math.max(0, index - 500);
  const contextEnd = Math.min(pdfText.length, index + 500);
  const context = pdfText.substring(contextStart, contextEnd);
  
  return { found: true, context, index };
}

/**
 * Verify item data against PDF context
 */
function verifyItem(item, pdfContext) {
  const verification = {
    partNo: item['part no.'],
    ssPartNo: item['ss part no'],
    fields: {},
    accuracy: 0,
    totalFields: 0,
    verifiedFields: 0
  };
  
  const fieldsToCheck = [
    { key: 'part no.', required: true },
    { key: 'ss part no', required: false },
    { key: 'origin', required: false },
    { key: 'decc', required: false },
    { key: 'application grade', required: false },
    { key: 'main', required: false },
    { key: 'sub', required: false },
    { key: 'size', required: false },
    { key: 'brand', required: false },
    { key: 'cost', required: false },
    { key: 'mkt', required: false },
    { key: 'price a', required: false },
    { key: 'price b', required: false },
    { key: 'model', required: false },
    { key: 'qty', required: false }
  ];
  
  for (const field of fieldsToCheck) {
    const value = item[field.key] || '';
    verification.totalFields++;
    
    if (!value && !field.required) {
      verification.fields[field.key] = { status: 'empty', value: '' };
      continue;
    }
    
    if (!value && field.required) {
      verification.fields[field.key] = { status: 'missing', value: '' };
      continue;
    }
    
    // Check if value appears in PDF context
    const valueInPDF = pdfContext.includes(value);
    
    // For some fields, do partial matching
    let verified = false;
    if (field.key === 'decc') {
      // Description might be partial, check for key words
      const words = value.split(/\s+/).filter(w => w.length > 3);
      verified = words.length > 0 && words.some(w => pdfContext.includes(w));
    } else if (field.key === 'part no.' || field.key === 'ss part no') {
      // Part numbers should match exactly
      verified = pdfContext.includes(value);
    } else if (field.key === 'origin') {
      // Origin codes should match
      verified = pdfContext.toUpperCase().includes(value.toUpperCase());
    } else if (field.key === 'cost' || field.key === 'mkt' || field.key === 'price a' || field.key === 'price b') {
      // Prices - check for numeric value
      const numValue = value.replace(/,/g, '');
      verified = pdfContext.includes(numValue) || pdfContext.includes(value);
    } else {
      // Other fields - check if value appears
      verified = pdfContext.includes(value) || pdfContext.toUpperCase().includes(value.toUpperCase());
    }
    
    if (verified) {
      verification.verifiedFields++;
      verification.fields[field.key] = { status: 'verified', value };
    } else {
      verification.fields[field.key] = { status: 'not_found', value };
    }
  }
  
  verification.accuracy = verification.totalFields > 0 
    ? (verification.verifiedFields / verification.totalFields * 100).toFixed(1)
    : 0;
  
  return verification;
}

/**
 * Main verification function
 */
function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🔍 VERIFYING JSON ACCURACY AGAINST PDF');
  console.log('='.repeat(60) + '\n');
  
  // Load data
  const items = loadJSON();
  const pdfText = loadPDFText();
  
  // Randomly select 50 items
  console.log('🎲 Randomly selecting 50 items for verification...\n');
  const selectedItems = [];
  const usedIndices = new Set();
  
  while (selectedItems.length < 50 && selectedItems.length < items.length) {
    const randomIndex = Math.floor(Math.random() * items.length);
    if (!usedIndices.has(randomIndex)) {
      usedIndices.add(randomIndex);
      selectedItems.push({ item: items[randomIndex], index: randomIndex });
    }
  }
  
  console.log(`   ✅ Selected ${selectedItems.length} items\n`);
  
  // Verify each item
  const results = [];
  let foundCount = 0;
  let notFoundCount = 0;
  
  console.log('🔍 Verifying items...\n');
  
  for (let i = 0; i < selectedItems.length; i++) {
    const { item, index } = selectedItems[i];
    const partNo = item['part no.'] || item['ss part no'] || 'N/A';
    
    process.stdout.write(`   [${i + 1}/50] Verifying item ${index + 1} (Part No: ${partNo})... `);
    
    const searchResult = findItemInPDF(item, pdfText);
    
    if (!searchResult.found) {
      console.log(`❌ NOT FOUND (${searchResult.reason})`);
      notFoundCount++;
      results.push({
        index: index + 1,
        partNo,
        found: false,
        reason: searchResult.reason,
        verification: null
      });
      continue;
    }
    
    const verification = verifyItem(item, searchResult.context);
    foundCount++;
    
    const accuracy = parseFloat(verification.accuracy);
    if (accuracy >= 80) {
      console.log(`✅ FOUND (${accuracy}% accurate)`);
    } else if (accuracy >= 50) {
      console.log(`⚠️  FOUND (${accuracy}% accurate)`);
    } else {
      console.log(`❌ FOUND (${accuracy}% accurate - LOW)`);
    }
    
    results.push({
      index: index + 1,
      partNo,
      found: true,
      verification
    });
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 VERIFICATION SUMMARY');
  console.log('='.repeat(60) + '\n');
  
  console.log(`   Total Items Verified: ${results.length}`);
  console.log(`   Found in PDF: ${foundCount} (${(foundCount / results.length * 100).toFixed(1)}%)`);
  console.log(`   Not Found: ${notFoundCount} (${(notFoundCount / results.length * 100).toFixed(1)}%)\n`);
  
  // Calculate average accuracy
  const foundResults = results.filter(r => r.found && r.verification);
  if (foundResults.length > 0) {
    const avgAccuracy = foundResults.reduce((sum, r) => sum + parseFloat(r.verification.accuracy), 0) / foundResults.length;
    console.log(`   Average Accuracy: ${avgAccuracy.toFixed(1)}%\n`);
  }
  
  // Show detailed results for first 10 items
  console.log('📋 DETAILED RESULTS (First 10 items):\n');
  for (let i = 0; i < Math.min(10, results.length); i++) {
    const result = results[i];
    console.log(`   Item ${result.index} (Part No: ${result.partNo}):`);
    
    if (!result.found) {
      console.log(`      ❌ ${result.reason}\n`);
      continue;
    }
    
    const v = result.verification;
    console.log(`      ✅ Found in PDF`);
    console.log(`      Accuracy: ${v.accuracy}% (${v.verifiedFields}/${v.totalFields} fields verified)`);
    
    // Show field status
    const fieldStatus = Object.entries(v.fields)
      .filter(([key, status]) => status.status !== 'empty')
      .map(([key, status]) => {
        const icon = status.status === 'verified' ? '✅' : status.status === 'not_found' ? '❌' : '⚠️';
        return `         ${icon} ${key}: ${status.value || '(empty)'}`;
      });
    
    if (fieldStatus.length > 0) {
      console.log(`      Fields:`);
      fieldStatus.slice(0, 5).forEach(s => console.log(s));
      if (fieldStatus.length > 5) {
        console.log(`         ... and ${fieldStatus.length - 5} more fields`);
      }
    }
    console.log('');
  }
  
  // Accuracy distribution
  const accuracyRanges = {
    '90-100%': 0,
    '80-89%': 0,
    '70-79%': 0,
    '50-69%': 0,
    '0-49%': 0
  };
  
  foundResults.forEach(r => {
    const acc = parseFloat(r.verification.accuracy);
    if (acc >= 90) accuracyRanges['90-100%']++;
    else if (acc >= 80) accuracyRanges['80-89%']++;
    else if (acc >= 70) accuracyRanges['70-79%']++;
    else if (acc >= 50) accuracyRanges['50-69%']++;
    else accuracyRanges['0-49%']++;
  });
  
  console.log('📊 ACCURACY DISTRIBUTION:\n');
  Object.entries(accuracyRanges).forEach(([range, count]) => {
    const bar = '█'.repeat(Math.floor(count / foundResults.length * 50));
    console.log(`   ${range.padEnd(10)}: ${count.toString().padStart(3)} ${bar}`);
  });
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ VERIFICATION COMPLETE');
  console.log('='.repeat(60) + '\n');
}

// Run
main();

