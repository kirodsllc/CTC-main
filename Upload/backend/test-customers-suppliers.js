// Test script for Customers and Suppliers API
const http = require('http');

const API_BASE = 'http://localhost:3001/api';

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const options = {
      hostname: url.hostname,
      port: url.port || 3001,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing Customers & Suppliers API\n');
  console.log('='.repeat(50));

  try {
    // Test 1: Get Customers
    console.log('\n1. Testing GET /api/customers...');
    const customersRes = await makeRequest('GET', '/customers');
    console.log(`   Status: ${customersRes.status}`);
    if (customersRes.data.data) {
      console.log(`   ✅ Found ${customersRes.data.data.length} customers`);
    } else if (customersRes.data.error) {
      console.log(`   ❌ Error: ${customersRes.data.error}`);
    }

    // Test 2: Create Customer
    console.log('\n2. Testing POST /api/customers...');
    const newCustomer = {
      name: 'Test Customer',
      email: 'test@example.com',
      contactNo: '1234567890',
      status: 'active',
    };
    const createCustomerRes = await makeRequest('POST', '/customers', newCustomer);
    console.log(`   Status: ${createCustomerRes.status}`);
    if (createCustomerRes.data.data) {
      console.log(`   ✅ Customer created: ${createCustomerRes.data.data.name} (ID: ${createCustomerRes.data.data.id})`);
    } else if (createCustomerRes.data.error) {
      console.log(`   ❌ Error: ${createCustomerRes.data.error}`);
    }

    // Test 3: Get Suppliers
    console.log('\n3. Testing GET /api/suppliers...');
    const suppliersRes = await makeRequest('GET', '/suppliers');
    console.log(`   Status: ${suppliersRes.status}`);
    if (suppliersRes.data.data) {
      console.log(`   ✅ Found ${suppliersRes.data.data.length} suppliers`);
    } else if (suppliersRes.data.error) {
      console.log(`   ❌ Error: ${suppliersRes.data.error}`);
    }

    // Test 4: Create Supplier
    console.log('\n4. Testing POST /api/suppliers...');
    const newSupplier = {
      code: 'SUP-001',
      companyName: 'Test Supplier Co',
      email: 'supplier@example.com',
      phone: '9876543210',
      status: 'active',
    };
    const createSupplierRes = await makeRequest('POST', '/suppliers', newSupplier);
    console.log(`   Status: ${createSupplierRes.status}`);
    if (createSupplierRes.data.data) {
      console.log(`   ✅ Supplier created: ${createSupplierRes.data.data.companyName} (Code: ${createSupplierRes.data.data.code})`);
    } else if (createSupplierRes.data.error) {
      console.log(`   ❌ Error: ${createSupplierRes.data.error}`);
    }

    // Test 5: Verify data
    console.log('\n5. Verifying data...');
    const customersCheck = await makeRequest('GET', '/customers');
    const suppliersCheck = await makeRequest('GET', '/suppliers');
    
    const customerCount = customersCheck.data.data?.length || 0;
    const supplierCount = suppliersCheck.data.data?.length || 0;
    
    console.log(`   Customers in database: ${customerCount}`);
    console.log(`   Suppliers in database: ${supplierCount}`);
    
    if (customerCount > 0 && supplierCount > 0) {
      console.log('\n✅ All tests passed! Customers & Suppliers API is working correctly.');
    } else {
      console.log('\n⚠️  Some tests may have failed. Check the output above.');
    }

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    console.log('\nMake sure the backend server is running on port 3001');
  }

  console.log('\n' + '='.repeat(50));
}

// Wait a bit for server to be ready, then run tests
setTimeout(() => {
  runTests().then(() => process.exit(0)).catch(() => process.exit(1));
}, 2000);

