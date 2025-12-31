// Test stock-analysis endpoint
const http = require('http');

function testEndpoint() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/inventory/stock-analysis?fast_moving_days=30&slow_moving_days=90&dead_stock_days=180&analysis_period=6',
      method: 'GET',
      timeout: 5000,
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const json = JSON.parse(data);
            console.log(`✅ SUCCESS! Status: ${res.statusCode}`);
            console.log(`Found ${json.data?.length || 0} items`);
            if (json.data && json.data.length > 0) {
              console.log(`Sample item: ${json.data[0].partNo} - ${json.data[0].classification}`);
            }
            resolve({ success: true, data: json });
          } catch (e) {
            console.log(`❌ JSON Parse Error: ${e.message}`);
            console.log(`Response: ${data.substring(0, 200)}`);
            reject(new Error('Invalid JSON'));
          }
        } else {
          console.log(`❌ ERROR! Status: ${res.statusCode}`);
          console.log(`Response: ${data.substring(0, 500)}`);
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    });

    req.on('error', (error) => {
      if (error.code === 'ECONNREFUSED') {
        console.log('❌ Connection refused - Server is not running on port 3001');
        console.log('Please start the server with: cd backend && npm run dev');
      } else {
        console.log(`❌ Request error: ${error.message}`);
      }
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      console.log('❌ Request timeout');
      reject(new Error('Timeout'));
    });

    req.end();
  });
}

// Test health endpoint first
function testHealth() {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path: '/health',
      method: 'GET',
      timeout: 3000,
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ Server is running');
          resolve(true);
        } else {
          console.log(`⚠️  Health check returned: ${res.statusCode}`);
          resolve(false);
        }
      });
    });

    req.on('error', () => {
      console.log('❌ Server is not running');
      reject(new Error('Server not running'));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });

    req.end();
  });
}

// Run tests
async function runTests() {
  console.log('Testing backend endpoints...\n');
  
  try {
    await testHealth();
    console.log('');
    await testEndpoint();
    process.exit(0);
  } catch (error) {
    console.log(`\n❌ Test failed: ${error.message}`);
    process.exit(1);
  }
}

runTests();

