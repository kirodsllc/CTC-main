// Add test suppliers for testing
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const dbPath = path.resolve(__dirname, '..', 'prisma', 'dev.db');
process.env.DATABASE_URL = `file:${dbPath}`;

const prisma = new PrismaClient();

async function addTestSuppliers() {
  try {
    console.log('🔄 Adding test suppliers...');
    
    const suppliers = [
      {
        code: 'SUP-001',
        companyName: 'ABC Suppliers Ltd',
        name: 'John Smith',
        email: 'john@abc.com',
        phone: '1234567890',
        address: '123 Main Street',
        city: 'Karachi',
        state: 'Sindh',
        country: 'Pakistan',
        status: 'active',
      },
      {
        code: 'SUP-002',
        companyName: 'XYZ Trading Co',
        name: 'Jane Doe',
        email: 'jane@xyz.com',
        phone: '0987654321',
        address: '456 Park Avenue',
        city: 'Lahore',
        state: 'Punjab',
        country: 'Pakistan',
        status: 'active',
      },
      {
        code: 'SUP-003',
        companyName: 'Global Imports',
        name: 'Bob Wilson',
        email: 'bob@global.com',
        phone: '5555555555',
        address: '789 Business Road',
        city: 'Islamabad',
        state: 'ICT',
        country: 'Pakistan',
        status: 'inactive',
      },
      {
        code: 'SUP-004',
        companyName: 'Tech Parts Inc',
        name: 'Alice Johnson',
        email: 'alice@techparts.com',
        phone: '1112223333',
        address: '321 Tech Boulevard',
        city: 'Karachi',
        state: 'Sindh',
        country: 'Pakistan',
        cnic: '12345-1234567-1',
        contactPerson: 'Alice Johnson',
        paymentTerms: 'Net 30',
        status: 'active',
      },
      {
        code: 'SUP-005',
        companyName: 'Auto Components Co',
        name: 'Mike Brown',
        email: 'mike@autocomp.com',
        phone: '4445556666',
        address: '654 Auto Street',
        city: 'Lahore',
        state: 'Punjab',
        country: 'Pakistan',
        status: 'active',
      },
    ];

    let created = 0;
    let skipped = 0;

    for (const supplier of suppliers) {
      try {
        await prisma.supplier.create({ data: supplier });
        created++;
        console.log(`   ✅ Created: ${supplier.companyName} (${supplier.code})`);
      } catch (error) {
        if (error.code === 'P2002') {
          skipped++;
          console.log(`   ℹ️  Already exists: ${supplier.companyName} (${supplier.code})`);
        } else {
          console.error(`   ❌ Error creating ${supplier.companyName}:`, error.message);
        }
      }
    }

    console.log(`\n✅ Done! Created: ${created}, Skipped: ${skipped}`);
    
    // Verify count
    const count = await prisma.supplier.count();
    console.log(`   Total suppliers in database: ${count}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

addTestSuppliers();

