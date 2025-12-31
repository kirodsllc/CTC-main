// Test script to verify the download endpoint works
const testDownloadEndpoint = async () => {
  try {
    // First, get a backup ID
    const backupsResponse = await fetch('http://localhost:3001/api/backups');
    const backupsData = await backupsResponse.json();
    
    if (!backupsData.data || backupsData.data.length === 0) {
      console.log('❌ No backups found. Please create a backup first.');
      return;
    }
    
    const backup = backupsData.data[0];
    console.log(`\n📦 Testing download for backup: ${backup.name} (ID: ${backup.id})\n`);
    
    // Test the download endpoint
    const downloadResponse = await fetch(`http://localhost:3001/api/backups/${backup.id}/download`);
    
    if (downloadResponse.ok) {
      const contentType = downloadResponse.headers.get('Content-Type');
      const contentDisposition = downloadResponse.headers.get('Content-Disposition');
      
      console.log('✅ Download endpoint is working!');
      console.log(`   Content-Type: ${contentType}`);
      console.log(`   Content-Disposition: ${contentDisposition}`);
      console.log(`   Status: ${downloadResponse.status}`);
      
      const data = await downloadResponse.json();
      console.log(`\n📄 Backup data preview:`);
      console.log(`   Name: ${data.name}`);
      console.log(`   Type: ${data.type}`);
      console.log(`   Size: ${data.size}`);
    } else {
      const error = await downloadResponse.json().catch(() => ({ error: downloadResponse.statusText }));
      console.log(`❌ Download endpoint failed!`);
      console.log(`   Status: ${downloadResponse.status}`);
      console.log(`   Error: ${error.error || error.message || 'Unknown error'}`);
    }
  } catch (error: any) {
    console.error('❌ Error testing download endpoint:', error.message);
    console.log('\n💡 Make sure the backend server is running on port 3001');
    console.log('   Run: cd backend && npm run dev');
  }
};

testDownloadEndpoint();

