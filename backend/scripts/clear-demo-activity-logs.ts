import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearDemoActivityLogs() {
  try {
    console.log('Clearing demo activity logs...\n');

    // Delete all activity logs
    const deleted = await prisma.activityLog.deleteMany({});
    
    console.log(`✅ Deleted ${deleted.count} activity logs`);
    console.log('\n🎉 Demo data cleared! Real activity logs will be created as users interact with the system.');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

clearDemoActivityLogs();

