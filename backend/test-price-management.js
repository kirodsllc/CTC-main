// Test script for Price Management functionality
// Using built-in fetch (Node 18+)

const API_BASE = 'http://localhost:3001/api';

async function testPriceManagement() {
  console.log('🧪 Testing Price Management API...\n');

  try {
    // Test 1: Get parts for price management
    console.log('1. Testing GET /parts/price-management');
    const partsRes = await fetch(`${API_BASE}/parts/price-management?limit=5`);
    const partsData = await partsRes.json();
    console.log(`   ✅ Found ${partsData.data?.length || 0} parts`);
    if (partsData.data && partsData.data.length > 0) {
      console.log(`   Sample part: ${partsData.data[0].partNo} - ${partsData.data[0].description}`);
      console.log(`   Cost: ${partsData.data[0].cost}, PriceA: ${partsData.data[0].priceA}, Qty: ${partsData.data[0].qty}`);
    }

    // Test 2: Get price history
    console.log('\n2. Testing GET /parts/price-history');
    const historyRes = await fetch(`${API_BASE}/parts/price-history?limit=5`);
    const historyData = await historyRes.json();
    console.log(`   ✅ Found ${historyData.data?.length || 0} history records`);

    // Test 3: Update individual part prices (if we have a part)
    if (partsData.data && partsData.data.length > 0) {
      const testPart = partsData.data[0];
      console.log(`\n3. Testing PUT /parts/${testPart.id}/prices`);
      const updateRes = await fetch(`${API_BASE}/parts/${testPart.id}/prices`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cost: testPart.cost + 10,
          reason: 'Test price update',
          updated_by: 'Test User',
        }),
      });
      const updateData = await updateRes.json();
      if (updateRes.ok) {
        console.log(`   ✅ Updated part prices successfully`);
        console.log(`   New cost: ${updateData.cost}`);
      } else {
        console.log(`   ❌ Error: ${updateData.error}`);
      }

      // Test 4: Bulk update prices
      console.log(`\n4. Testing POST /parts/bulk-update-prices`);
      const bulkRes = await fetch(`${API_BASE}/parts/bulk-update-prices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          part_ids: [testPart.id],
          price_field: 'priceA',
          update_type: 'percentage',
          update_value: 5,
          reason: 'Test bulk update - 5% increase',
          updated_by: 'Test User',
        }),
      });
      const bulkData = await bulkRes.json();
      if (bulkRes.ok) {
        console.log(`   ✅ Bulk update successful`);
        console.log(`   Updated ${bulkData.updated_count} parts`);
      } else {
        console.log(`   ❌ Error: ${bulkData.error}`);
      }

      // Test 5: Verify price history was created
      console.log('\n5. Verifying price history');
      const verifyHistoryRes = await fetch(`${API_BASE}/parts/price-history?limit=10`);
      const verifyHistoryData = await verifyHistoryRes.json();
      console.log(`   ✅ Found ${verifyHistoryData.data?.length || 0} history records`);
      if (verifyHistoryData.data && verifyHistoryData.data.length > 0) {
        console.log(`   Latest update: ${verifyHistoryData.data[0].reason}`);
        console.log(`   Updated by: ${verifyHistoryData.data[0].updatedBy}`);
      }
    }

    console.log('\n✅ All tests completed!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Make sure the backend server is running on http://localhost:3001');
  }
}

testPriceManagement();

