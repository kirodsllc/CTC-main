import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testUsersAPI() {
  try {
    console.log('Testing Users API...\n');

    // Test 1: Count users
    console.log('1. Testing user.count()...');
    const count = await prisma.user.count();
    console.log(`   ✅ User count: ${count}\n`);

    // Test 2: Find all users
    console.log('2. Testing user.findMany()...');
    const users = await prisma.user.findMany({
      take: 10,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        lastLogin: true,
        createdAt: true,
      },
    });
    console.log(`   ✅ Found ${users.length} users\n`);

    // Test 3: Create a test user
    console.log('3. Testing user.create()...');
    const testUser = await prisma.user.create({
      data: {
        name: 'Test User',
        email: `test-${Date.now()}@example.com`,
        role: 'Staff',
        status: 'active',
        password: 'hashed_password_here',
        lastLogin: '-',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
      },
    });
    console.log(`   ✅ Created user:`, testUser);
    console.log(`   ✅ User ID: ${testUser.id}\n`);

    // Test 4: Delete test user
    console.log('4. Testing user.delete()...');
    await prisma.user.delete({
      where: { id: testUser.id },
    });
    console.log(`   ✅ Deleted test user\n`);

    console.log('✅ All tests passed! The User table is working correctly.');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testUsersAPI();

