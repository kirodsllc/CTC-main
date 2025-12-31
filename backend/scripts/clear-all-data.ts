import prisma from '../src/config/database';

async function clearAllData() {
  try {
    console.log('🗑️  Starting to clear all data...');

    // Delete in order to respect foreign key constraints
    // Start with child tables and work up to parent tables

    console.log('Deleting KitItems...');
    await prisma.kitItem.deleteMany({});
    console.log('✅ KitItems deleted');

    console.log('Deleting Kits...');
    await prisma.kit.deleteMany({});
    console.log('✅ Kits deleted');

    console.log('Deleting PriceHistory...');
    await prisma.priceHistory.deleteMany({});
    console.log('✅ PriceHistory deleted');

    console.log('Deleting StockVerificationItems...');
    await prisma.stockVerificationItem.deleteMany({});
    console.log('✅ StockVerificationItems deleted');

    console.log('Deleting StockVerifications...');
    await prisma.stockVerification.deleteMany({});
    console.log('✅ StockVerifications deleted');

    console.log('Deleting TransferItems...');
    await prisma.transferItem.deleteMany({});
    console.log('✅ TransferItems deleted');

    console.log('Deleting Transfers...');
    await prisma.transfer.deleteMany({});
    console.log('✅ Transfers deleted');

    console.log('Deleting AdjustmentItems...');
    await prisma.adjustmentItem.deleteMany({});
    console.log('✅ AdjustmentItems deleted');

    console.log('Deleting Adjustments...');
    await prisma.adjustment.deleteMany({});
    console.log('✅ Adjustments deleted');

    console.log('Deleting DirectPurchaseOrderItems...');
    await prisma.directPurchaseOrderItem.deleteMany({});
    console.log('✅ DirectPurchaseOrderItems deleted');

    console.log('Deleting DirectPurchaseOrderExpenses...');
    await prisma.directPurchaseOrderExpense.deleteMany({});
    console.log('✅ DirectPurchaseOrderExpenses deleted');

    console.log('Deleting DirectPurchaseOrders...');
    await prisma.directPurchaseOrder.deleteMany({});
    console.log('✅ DirectPurchaseOrders deleted');

    console.log('Deleting PurchaseOrderItems...');
    await prisma.purchaseOrderItem.deleteMany({});
    console.log('✅ PurchaseOrderItems deleted');

    console.log('Deleting PurchaseOrders...');
    await prisma.purchaseOrder.deleteMany({});
    console.log('✅ PurchaseOrders deleted');

    console.log('Deleting StockMovements...');
    await prisma.stockMovement.deleteMany({});
    console.log('✅ StockMovements deleted');

    console.log('Deleting Models...');
    await prisma.model.deleteMany({});
    console.log('✅ Models deleted');

    console.log('Deleting Parts...');
    await prisma.part.deleteMany({});
    console.log('✅ Parts deleted');

    console.log('Deleting Shelves...');
    await prisma.shelf.deleteMany({});
    console.log('✅ Shelves deleted');

    console.log('Deleting Racks...');
    await prisma.rack.deleteMany({});
    console.log('✅ Racks deleted');

    console.log('Deleting Stores...');
    await prisma.store.deleteMany({});
    console.log('✅ Stores deleted');

    console.log('Deleting Applications...');
    await prisma.application.deleteMany({});
    console.log('✅ Applications deleted');

    console.log('Deleting Subcategories...');
    await prisma.subcategory.deleteMany({});
    console.log('✅ Subcategories deleted');

    console.log('Deleting Categories...');
    await prisma.category.deleteMany({});
    console.log('✅ Categories deleted');

    console.log('Deleting Brands...');
    await prisma.brand.deleteMany({});
    console.log('✅ Brands deleted');

    console.log('Deleting MasterParts...');
    await prisma.masterPart.deleteMany({});
    console.log('✅ MasterParts deleted');

    // Delete financial/accounting data in correct order (children first)
    console.log('Deleting VoucherEntries...');
    try {
      await prisma.voucherEntry.deleteMany({});
      console.log('✅ VoucherEntries deleted');
    } catch (error: any) {
      if (error.code === 'P2021') {
        console.log('⚠️  VoucherEntry table does not exist, skipping...');
      } else {
        throw error;
      }
    }

    console.log('Deleting Vouchers...');
    try {
      await prisma.voucher.deleteMany({});
      console.log('✅ Vouchers deleted');
    } catch (error: any) {
      if (error.code === 'P2021') {
        console.log('⚠️  Voucher table does not exist, skipping...');
      } else {
        throw error;
      }
    }

    console.log('Deleting JournalLines...');
    await prisma.journalLine.deleteMany({});
    console.log('✅ JournalLines deleted');

    console.log('Deleting JournalEntries...');
    await prisma.journalEntry.deleteMany({});
    console.log('✅ JournalEntries deleted');

    console.log('Deleting Accounts...');
    await prisma.account.deleteMany({});
    console.log('✅ Accounts deleted');

    console.log('Deleting Subgroups...');
    await prisma.subgroup.deleteMany({});
    console.log('✅ Subgroups deleted');

    console.log('Deleting MainGroups...');
    await prisma.mainGroup.deleteMany({});
    console.log('✅ MainGroups deleted');

    console.log('Deleting PostedExpenses...');
    await prisma.postedExpense.deleteMany({});
    console.log('✅ PostedExpenses deleted');

    console.log('Deleting OperationalExpenses...');
    await prisma.operationalExpense.deleteMany({});
    console.log('✅ OperationalExpenses deleted');

    console.log('Deleting ExpenseTypes...');
    await prisma.expenseType.deleteMany({});
    console.log('✅ ExpenseTypes deleted');

    console.log('Deleting Customers...');
    await prisma.customer.deleteMany({});
    console.log('✅ Customers deleted');

    console.log('Deleting Suppliers...');
    await prisma.supplier.deleteMany({});
    console.log('✅ Suppliers deleted');

    console.log('Deleting ActivityLogs...');
    await prisma.activityLog.deleteMany({});
    console.log('✅ ActivityLogs deleted');

    console.log('Deleting ApprovalFlows...');
    await prisma.approvalFlow.deleteMany({});
    console.log('✅ ApprovalFlows deleted');

    console.log('Deleting Roles...');
    await prisma.role.deleteMany({});
    console.log('✅ Roles deleted');

    console.log('Deleting Users (except system admin if exists)...');
    // Keep at least one admin user if needed, or delete all
    await prisma.user.deleteMany({});
    console.log('✅ Users deleted');

    console.log('Deleting Backups...');
    try {
      await prisma.backup.deleteMany({});
      console.log('✅ Backups deleted');
    } catch (error: any) {
      if (error.code === 'P2021') {
        console.log('⚠️  Backup table does not exist, skipping...');
      } else {
        throw error;
      }
    }

    console.log('Deleting BackupSchedules...');
    try {
      await prisma.backupSchedule.deleteMany({});
      console.log('✅ BackupSchedules deleted');
    } catch (error: any) {
      if (error.code === 'P2021') {
        console.log('⚠️  BackupSchedule table does not exist, skipping...');
      } else {
        throw error;
      }
    }

    console.log('\n✅ All data cleared successfully!');
    console.log('Database is now empty and ready for fresh data.');
  } catch (error: any) {
    console.error('❌ Error clearing data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the clear function
clearAllData()
  .then(() => {
    console.log('\n🎉 Data clearing completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Data clearing failed:', error);
    process.exit(1);
  });
