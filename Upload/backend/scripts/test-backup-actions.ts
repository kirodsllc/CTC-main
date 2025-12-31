import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testBackupActions() {
  try {
    console.log('Testing Backup Actions...\n');

    // Test 1: Create a test backup
    console.log('1. Creating test backup...');
    const backup = await prisma.backup.create({
      data: {
        name: 'Test Backup Actions',
        tables: 'All Tables',
        type: 'full',
        size: '75 MB',
        status: 'completed',
        createdAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
        createdBy: 'Test User',
      },
    });
    console.log(`   ✅ Created backup: ${backup.name} (ID: ${backup.id})\n`);

    // Test 2: Get backup
    console.log('2. Getting backup...');
    const retrieved = await prisma.backup.findUnique({
      where: { id: backup.id },
    });
    console.log(`   ✅ Retrieved backup: ${retrieved?.name}\n`);

    // Test 3: Update backup
    console.log('3. Updating backup...');
    const updated = await prisma.backup.update({
      where: { id: backup.id },
      data: { size: '80 MB' },
    });
    console.log(`   ✅ Updated backup size: ${updated.size}\n`);

    // Test 4: Delete backup
    console.log('4. Deleting backup...');
    await prisma.backup.delete({
      where: { id: backup.id },
    });
    console.log(`   ✅ Deleted backup\n`);

    console.log('✅ All backup actions work correctly!');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testBackupActions();

