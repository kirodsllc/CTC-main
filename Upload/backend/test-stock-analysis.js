// Test script for stock-analysis endpoint
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/inventory/stock-analysis?fast_moving_days=30&slow_moving_days=90&dead_stock_days=180&analysis_period=6',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
  },
};

console.log('Testing stock-analysis endpoint...');
console.log(`URL: http://${options.hostname}:${options.port}${options.path}\n`);

const req = http.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);
  
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    if (res.statusCode === 200) {
      try {
        const json = JSON.parse(data);
        console.log('\n✅ Success! Response:');
        console.log(`Total items: ${json.data?.length || 0}`);
        if (json.data && json.data.length > 0) {
          console.log(`First item:`, JSON.stringify(json.data[0], null, 2));
        }
      } catch (e) {
        console.log('\n❌ Error parsing JSON:', e.message);
        console.log('Raw response:', data.substring(0, 200));
      }
    } else {
      console.log('\n❌ Error! Response:');
      console.log(data);
    }
  });
});

req.on('error', (error) => {
  console.error('\n❌ Request failed:', error.message);
  console.log('\nMake sure the backend server is running on port 3001');
  console.log('Start it with: cd backend && npm run dev');
});

req.end();

