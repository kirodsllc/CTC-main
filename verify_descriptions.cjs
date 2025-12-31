const fs = require('fs');
const data = JSON.parse(fs.readFileSync('CTC Item Lists.json', 'utf-8'));
const items = data.items;
const testParts = ['1258274', '0328970', '328970', '0353360', '353360', '037WN29'];

console.log('Verifying specific items from PDF:');
console.log('Expected:');
console.log('  1258274 -> SEAL-O-RING');
console.log('  0328970 -> SEAL-O-RING');
console.log('  328970 -> SEAL-O-RING');
console.log('  0353360 -> RING METAL, RETAINING');
console.log('  353360 -> RING METAL, RETAINING');
console.log('  037WN29 -> LINER CYLINDER');
console.log('\nActual:');

testParts.forEach(pn => {
  const item = items.find(i => i['part no.'] === pn || i['ss part no'] === pn);
  if (item) {
    const match = (item.decc || '').toUpperCase().includes('SEAL-O-RING') || 
                  (item.decc || '').toUpperCase().includes('RING METAL') ||
                  (item.decc || '').toUpperCase().includes('LINER CYLINDER');
    const icon = match ? '✅' : '❌';
    console.log(`  ${icon} Part: ${pn} -> Desc: "${item.decc || 'N/A'}"`);
  } else {
    console.log(`  ❌ Part: ${pn} -> NOT FOUND`);
  }
});

