// Test purchase orders endpoints
const http = require('http');

function testEndpoint(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 5000,
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('Testing Purchase Orders Endpoints...\n');
  
  try {
    // Test 1: Get purchase orders
    console.log('1. Testing GET /api/inventory/purchase-orders');
    const getResponse = await testEndpoint('GET', '/api/inventory/purchase-orders');
    console.log(`   Status: ${getResponse.status}`);
    if (getResponse.status === 200) {
      const data = getResponse.data.data || getResponse.data;
      console.log(`   ✅ Found ${Array.isArray(data) ? data.length : 0} purchase orders`);
    } else {
      console.log(`   ❌ Error: ${getResponse.data.error || getResponse.data}`);
    }
    console.log('');
    
    // Test 2: Create purchase order (if we have parts)
    console.log('2. Testing POST /api/inventory/purchase-orders');
    // First get a part
    const partsResponse = await testEndpoint('GET', '/api/parts?limit=1');
    let partId = null;
    if (partsResponse.status === 200) {
      const parts = partsResponse.data.data || partsResponse.data;
      if (Array.isArray(parts) && parts.length > 0) {
        partId = parts[0].id;
      }
    }
    
    if (partId) {
      const createData = {
        po_number: `PO-TEST-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        notes: 'Test purchase order',
        items: [{
          part_id: partId,
          quantity: 10,
          unit_cost: 100,
          total_cost: 1000,
          received_qty: 0,
        }],
      };
      
      const createResponse = await testEndpoint('POST', '/api/inventory/purchase-orders', createData);
      console.log(`   Status: ${createResponse.status}`);
      if (createResponse.status === 201) {
        console.log(`   ✅ Purchase order created: ${createResponse.data.po_number}`);
        const createdId = createResponse.data.id;
        
        // Test 3: Get single purchase order
        console.log('\n3. Testing GET /api/inventory/purchase-orders/:id');
        const getOneResponse = await testEndpoint('GET', `/api/inventory/purchase-orders/${createdId}`);
        console.log(`   Status: ${getOneResponse.status}`);
        if (getOneResponse.status === 200) {
          console.log(`   ✅ Purchase order retrieved: ${getOneResponse.data.po_number}`);
        }
        
        // Test 4: Update purchase order
        console.log('\n4. Testing PUT /api/inventory/purchase-orders/:id');
        const updateData = {
          status: 'Pending',
          notes: 'Updated test purchase order',
        };
        const updateResponse = await testEndpoint('PUT', `/api/inventory/purchase-orders/${createdId}`, updateData);
        console.log(`   Status: ${updateResponse.status}`);
        if (updateResponse.status === 200) {
          console.log(`   ✅ Purchase order updated`);
        }
        
        // Test 5: Delete purchase order
        console.log('\n5. Testing DELETE /api/inventory/purchase-orders/:id');
        const deleteResponse = await testEndpoint('DELETE', `/api/inventory/purchase-orders/${createdId}`);
        console.log(`   Status: ${deleteResponse.status}`);
        if (deleteResponse.status === 200) {
          console.log(`   ✅ Purchase order deleted`);
        }
      } else {
        console.log(`   ❌ Error: ${createResponse.data.error || createResponse.data}`);
      }
    } else {
      console.log('   ⚠️  No parts available to create test purchase order');
    }
    
    console.log('\n✅ All tests completed!');
    process.exit(0);
  } catch (error) {
    console.log(`\n❌ Test failed: ${error.message}`);
    if (error.code === 'ECONNREFUSED') {
      console.log('   Server is not running on port 3001');
    }
    process.exit(1);
  }
}

runTests();

