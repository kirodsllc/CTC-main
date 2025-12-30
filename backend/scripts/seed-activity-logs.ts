import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedActivityLogs() {
  try {
    console.log('Creating sample activity logs...\n');

    const sampleLogs = [
      {
        timestamp: new Date().toISOString(),
        user: 'Admin User',
        userRole: 'Admin',
        action: 'User Login',
        actionType: 'login',
        module: 'Auth',
        description: 'User successfully logged into the system',
        ipAddress: '192.168.1.100',
        status: 'success',
        details: JSON.stringify({ sessionId: 'sess_12345', device: 'Chrome' }),
      },
      {
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        user: 'John Manager',
        userRole: 'Manager',
        action: 'Created Part',
        actionType: 'create',
        module: 'Inventory',
        description: 'Created new part: Engine Oil Filter',
        ipAddress: '192.168.1.101',
        status: 'success',
        details: JSON.stringify({ partId: 'part_001', partNo: 'EOF-001' }),
      },
      {
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        user: 'Sarah Staff',
        userRole: 'Staff',
        action: 'Updated Customer',
        actionType: 'update',
        module: 'Sales',
        description: 'Updated customer information for ABC Company',
        ipAddress: '192.168.1.102',
        status: 'success',
      },
      {
        timestamp: new Date(Date.now() - 10800000).toISOString(),
        user: 'Mike Accountant',
        userRole: 'Accountant',
        action: 'Exported Report',
        actionType: 'export',
        module: 'Reports',
        description: 'Exported monthly sales report to CSV',
        ipAddress: '192.168.1.103',
        status: 'success',
        details: JSON.stringify({ reportType: 'sales', period: '2024-01' }),
      },
      {
        timestamp: new Date(Date.now() - 14400000).toISOString(),
        user: 'Admin User',
        userRole: 'Admin',
        action: 'Deleted User',
        actionType: 'delete',
        module: 'Users',
        description: 'Deleted inactive user account',
        ipAddress: '192.168.1.100',
        status: 'success',
        details: JSON.stringify({ deletedUserId: 'user_456' }),
      },
      {
        timestamp: new Date(Date.now() - 18000000).toISOString(),
        user: 'John Manager',
        userRole: 'Manager',
        action: 'Approved Purchase Order',
        actionType: 'approve',
        module: 'Purchase',
        description: 'Approved purchase order PO-2024-001',
        ipAddress: '192.168.1.101',
        status: 'success',
        details: JSON.stringify({ poNumber: 'PO-2024-001', amount: 50000 }),
      },
      {
        timestamp: new Date(Date.now() - 21600000).toISOString(),
        user: 'Guest User',
        userRole: 'Viewer',
        action: 'Failed Login',
        actionType: 'login_failed',
        module: 'Auth',
        description: 'Failed login attempt with invalid credentials',
        ipAddress: '192.168.1.105',
        status: 'error',
        details: JSON.stringify({ reason: 'Invalid password' }),
      },
      {
        timestamp: new Date(Date.now() - 25200000).toISOString(),
        user: 'Sarah Staff',
        userRole: 'Staff',
        action: 'Low Stock Warning',
        actionType: 'update',
        module: 'Inventory',
        description: 'Stock level below reorder point for part ABC-123',
        ipAddress: '192.168.1.102',
        status: 'warning',
        details: JSON.stringify({ partId: 'part_123', currentStock: 5, reorderLevel: 10 }),
      },
      {
        timestamp: new Date(Date.now() - 28800000).toISOString(),
        user: 'Admin User',
        userRole: 'Admin',
        action: 'System Backup',
        actionType: 'export',
        module: 'Backup',
        description: 'Created full system backup',
        ipAddress: '192.168.1.100',
        status: 'success',
        details: JSON.stringify({ backupId: 'backup_001', size: '250 MB' }),
      },
      {
        timestamp: new Date(Date.now() - 32400000).toISOString(),
        user: 'Mike Accountant',
        userRole: 'Accountant',
        action: 'Updated Journal Entry',
        actionType: 'update',
        module: 'Accounting',
        description: 'Updated journal entry JE-2024-001',
        ipAddress: '192.168.1.103',
        status: 'success',
      },
    ];

    for (const log of sampleLogs) {
      await prisma.activityLog.create({
        data: log,
      });
      console.log(`✅ Created log: ${log.action} by ${log.user}`);
    }

    const count = await prisma.activityLog.count();
    console.log(`\n🎉 Created ${sampleLogs.length} activity logs. Total logs: ${count}`);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('already exists')) {
      console.log('⚠️  Some logs may already exist. This is okay.');
    } else {
      throw error;
    }
  } finally {
    await prisma.$disconnect();
  }
}

seedActivityLogs();

