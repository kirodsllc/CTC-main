// Test script to verify the import backup endpoint works
const testImportBackup = async () => {
  try {
    const testBackupData = {
      name: 'Test Import Backup',
      type: 'full',
      tables: 'All Tables',
      size: '100 MB',
      status: 'completed',
      createdAt: new Date().toISOString(),
      createdBy: 'Test User',
      version: '1.0',
    };

    console.log('\n📥 Testing import backup endpoint...\n');
    console.log('Backup data:', JSON.stringify(testBackupData, null, 2));

    const response = await fetch('http://localhost:3001/api/backups/import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testBackupData),
    });

    const result = await response.json();

    if (response.ok) {
      console.log('\n✅ Import endpoint is working!');
      console.log('Response:', JSON.stringify(result, null, 2));
    } else {
      console.log('\n❌ Import endpoint failed!');
      console.log(`   Status: ${response.status}`);
      console.log(`   Error: ${result.error || 'Unknown error'}`);
    }
  } catch (error: any) {
    console.error('\n❌ Error testing import endpoint:', error.message);
    console.log('\n💡 Make sure the backend server is running on port 3001');
    console.log('   Run: cd backend && npm run dev');
  }
};

testImportBackup();

