// Direct test of the price-management endpoint
const API_BASE = 'http://localhost:3001/api';

async function test() {
  try {
    console.log('Testing /parts/price-management...');
    const res = await fetch(`${API_BASE}/parts/price-management`);
    console.log('Status:', res.status);
    console.log('Status Text:', res.statusText);
    const text = await res.text();
    console.log('Response:', text.substring(0, 200));
    
    if (res.status === 404) {
      console.log('\n❌ Route not found. Server may need restart.');
    } else {
      console.log('\n✅ Route is accessible!');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

test();

