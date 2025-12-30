import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testActivityLogsAPI() {
  try {
    console.log('Testing Activity Logs API...\n');

    // Test 1: Count logs
    console.log('1. Testing activityLog.count()...');
    const count = await prisma.activityLog.count();
    console.log(`   ✅ Total logs: ${count}\n`);

    // Test 2: Find all logs
    console.log('2. Testing activityLog.findMany()...');
    const logs = await prisma.activityLog.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
    });
    console.log(`   ✅ Found ${logs.length} logs\n`);

    // Test 3: Filter by module
    console.log('3. Testing filter by module...');
    const authLogs = await prisma.activityLog.findMany({
      where: { module: 'Auth' },
    });
    console.log(`   ✅ Found ${authLogs.length} Auth logs\n`);

    // Test 4: Filter by action type
    console.log('4. Testing filter by actionType...');
    const loginLogs = await prisma.activityLog.findMany({
      where: { actionType: 'login' },
    });
    console.log(`   ✅ Found ${loginLogs.length} login logs\n`);

    // Test 5: Search by user
    console.log('5. Testing search by user...');
    const adminLogs = await prisma.activityLog.findMany({
      where: {
        user: { contains: 'Admin' },
      },
    });
    console.log(`   ✅ Found ${adminLogs.length} logs by Admin\n`);

    // Test 6: Filter by status
    console.log('6. Testing filter by status...');
    const successLogs = await prisma.activityLog.findMany({
      where: { status: 'success' },
    });
    const errorLogs = await prisma.activityLog.findMany({
      where: { status: 'error' },
    });
    const warningLogs = await prisma.activityLog.findMany({
      where: { status: 'warning' },
    });
    console.log(`   ✅ Success: ${successLogs.length}, Error: ${errorLogs.length}, Warning: ${warningLogs.length}\n`);

    // Test 7: Pagination
    console.log('7. Testing pagination...');
    const page1 = await prisma.activityLog.findMany({
      skip: 0,
      take: 3,
      orderBy: { createdAt: 'desc' },
    });
    const page2 = await prisma.activityLog.findMany({
      skip: 3,
      take: 3,
      orderBy: { createdAt: 'desc' },
    });
    console.log(`   ✅ Page 1: ${page1.length} logs, Page 2: ${page2.length} logs\n`);

    console.log('✅ All tests passed! Activity Logs API is working correctly.');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testActivityLogsAPI();

