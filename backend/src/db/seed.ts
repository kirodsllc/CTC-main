import prisma from '../config/database';

async function seed() {
  try {
    console.log('🌱 Starting database seeding...');

    // Seed Categories
    const categories = [
      { name: 'Engine Parts' },
      { name: 'Brake System' },
      { name: 'Filters' },
      { name: 'Belts' },
      { name: 'Electrical' },
    ];

    for (const cat of categories) {
      await prisma.category.upsert({
        where: { name: cat.name },
        update: {},
        create: { name: cat.name },
      });
    }
    console.log('✅ Categories seeded');

    // Seed Brands
    const brands = [
      { name: 'Toyota' },
      { name: 'Honda' },
      { name: 'Nissan' },
      { name: 'Bosch' },
      { name: 'Brembo' },
      { name: 'Generic' },
    ];

    for (const brand of brands) {
      await prisma.brand.upsert({
        where: { name: brand.name },
        update: {},
        create: { name: brand.name },
      });
    }
    console.log('✅ Brands seeded');

    // Get seeded categories and brands for reference
    const seededCategories = await prisma.category.findMany();
    const seededBrands = await prisma.brand.findMany();

    // Seed Parts with categories, brands, and costs
    const partsData = [
      { partNo: 'ENG-001', description: 'Engine Oil Filter', category: 'Filters', brand: 'Bosch', cost: 500, priceA: 750, reorderLevel: 10 },
      { partNo: 'ENG-002', description: 'Air Filter', category: 'Filters', brand: 'Bosch', cost: 300, priceA: 450, reorderLevel: 15 },
      { partNo: 'ENG-003', description: 'Fuel Filter', category: 'Filters', brand: 'Generic', cost: 250, priceA: 400, reorderLevel: 20 },
      { partNo: 'BRK-001', description: 'Brake Pad Set Front', category: 'Brake System', brand: 'Brembo', cost: 2000, priceA: 3000, reorderLevel: 5 },
      { partNo: 'BRK-002', description: 'Brake Pad Set Rear', category: 'Brake System', brand: 'Brembo', cost: 1500, priceA: 2250, reorderLevel: 5 },
      { partNo: 'BRK-003', description: 'Brake Disc Front', category: 'Brake System', brand: 'Brembo', cost: 3500, priceA: 5000, reorderLevel: 3 },
      { partNo: 'ENG-004', description: 'Timing Belt', category: 'Belts', brand: 'Generic', cost: 1200, priceA: 1800, reorderLevel: 8 },
      { partNo: 'ENG-005', description: 'Serpentine Belt', category: 'Belts', brand: 'Generic', cost: 800, priceA: 1200, reorderLevel: 10 },
      { partNo: 'ENG-006', description: 'Spark Plug Set', category: 'Engine Parts', brand: 'Bosch', cost: 600, priceA: 900, reorderLevel: 12 },
      { partNo: 'ENG-007', description: 'Oil Pump', category: 'Engine Parts', brand: 'Toyota', cost: 5000, priceA: 7500, reorderLevel: 2 },
      { partNo: 'ENG-008', description: 'Water Pump', category: 'Engine Parts', brand: 'Toyota', cost: 4500, priceA: 6500, reorderLevel: 3 },
      { partNo: 'ELC-001', description: 'Alternator', category: 'Electrical', brand: 'Honda', cost: 8000, priceA: 12000, reorderLevel: 2 },
      { partNo: 'ELC-002', description: 'Starter Motor', category: 'Electrical', brand: 'Honda', cost: 6000, priceA: 9000, reorderLevel: 2 },
      { partNo: 'ELC-003', description: 'Battery 12V', category: 'Electrical', brand: 'Generic', cost: 4000, priceA: 6000, reorderLevel: 5 },
      { partNo: 'FIL-004', description: 'Cabin Air Filter', category: 'Filters', brand: 'Bosch', cost: 400, priceA: 600, reorderLevel: 15 },
      { partNo: 'BRK-004', description: 'Brake Fluid', category: 'Brake System', brand: 'Brembo', cost: 500, priceA: 750, reorderLevel: 10 },
      { partNo: 'ENG-009', description: 'Radiator', category: 'Engine Parts', brand: 'Toyota', cost: 6000, priceA: 9000, reorderLevel: 2 },
      { partNo: 'ELC-004', description: 'Headlight Bulb', category: 'Electrical', brand: 'Generic', cost: 200, priceA: 300, reorderLevel: 20 },
    ];

    console.log('📦 Seeding parts...');
    const createdParts = [];
    for (const partData of partsData) {
      const category = seededCategories.find(c => c.name === partData.category);
      const brand = seededBrands.find(b => b.name === partData.brand);

      if (category && brand) {
        const part = await prisma.part.upsert({
          where: { partNo: partData.partNo },
          update: {
            description: partData.description,
            categoryId: category.id,
            brandId: brand.id,
            cost: partData.cost,
            priceA: partData.priceA,
            reorderLevel: partData.reorderLevel,
            status: 'active',
          },
          create: {
            partNo: partData.partNo,
            description: partData.description,
            categoryId: category.id,
            brandId: brand.id,
            cost: partData.cost,
            priceA: partData.priceA,
            reorderLevel: partData.reorderLevel,
            status: 'active',
            uom: 'pcs',
          },
        });
        createdParts.push(part);
      }
    }
    console.log(`✅ ${createdParts.length} parts seeded`);

    // Seed Stores FIRST (before stock movements)
    console.log('🏪 Seeding stores...');
    const storesData = [
      { name: 'Main Store', code: 'MAIN-STORE', address: '123 Main Street, City Center' },
      { name: 'Warehouse A', code: 'WAREHOUSE-A', address: '456 Industrial Road, Industrial Area' },
      { name: 'Branch Office', code: 'BRANCH-01', address: '789 Business Park, Downtown' },
      { name: 'Outlet Store', code: 'OUTLET-01', address: '321 Shopping Mall, Retail District' },
    ];

    const createdStores = [];
    for (const storeData of storesData) {
      const store = await prisma.store.upsert({
        where: { code: storeData.code },
        update: {},
        create: {
          code: storeData.code,
          name: storeData.name,
          address: storeData.address,
          status: 'active',
        },
      });
      createdStores.push(store);
    }
    console.log(`✅ ${createdStores.length} stores seeded`);

    // Seed Racks for each store
    console.log('📦 Seeding racks...');
    const racksData = [
      { codeNo: 'RACK-001', storeCode: 'MAIN-STORE', description: 'Main Rack A' },
      { codeNo: 'RACK-002', storeCode: 'MAIN-STORE', description: 'Main Rack B' },
      { codeNo: 'RACK-003', storeCode: 'WAREHOUSE-A', description: 'Warehouse Rack 1' },
      { codeNo: 'RACK-004', storeCode: 'WAREHOUSE-A', description: 'Warehouse Rack 2' },
      { codeNo: 'RACK-005', storeCode: 'BRANCH-01', description: 'Branch Rack 1' },
      { codeNo: 'RACK-006', storeCode: 'OUTLET-01', description: 'Outlet Rack 1' },
    ];

    const createdRacks = [];
    for (const rackData of racksData) {
      const store = createdStores.find(s => s.code === rackData.storeCode);
      if (store) {
        const rack = await prisma.rack.upsert({
          where: { codeNo: rackData.codeNo },
          update: {},
          create: {
            codeNo: rackData.codeNo,
            storeId: store.id,
            description: rackData.description,
            status: 'Active',
          },
        });
        createdRacks.push(rack);
      }
    }
    console.log(`✅ ${createdRacks.length} racks seeded`);

    // Seed Shelves for each rack
    console.log('📚 Seeding shelves...');
    const shelvesData = [
      { shelfNo: 'SHELF-A1', rackCode: 'RACK-001', description: 'Top Shelf' },
      { shelfNo: 'SHELF-A2', rackCode: 'RACK-001', description: 'Middle Shelf' },
      { shelfNo: 'SHELF-A3', rackCode: 'RACK-001', description: 'Bottom Shelf' },
      { shelfNo: 'SHELF-B1', rackCode: 'RACK-002', description: 'Top Shelf' },
      { shelfNo: 'SHELF-B2', rackCode: 'RACK-002', description: 'Middle Shelf' },
      { shelfNo: 'SHELF-W1', rackCode: 'RACK-003', description: 'Warehouse Shelf 1' },
      { shelfNo: 'SHELF-W2', rackCode: 'RACK-003', description: 'Warehouse Shelf 2' },
      { shelfNo: 'SHELF-BR1', rackCode: 'RACK-005', description: 'Branch Shelf 1' },
    ];

    const createdShelves = [];
    for (const shelfData of shelvesData) {
      const rack = createdRacks.find(r => r.codeNo === shelfData.rackCode);
      if (rack) {
        const shelf = await prisma.shelf.upsert({
          where: {
            rackId_shelfNo: {
              rackId: rack.id,
              shelfNo: shelfData.shelfNo,
            },
          },
          update: {},
          create: {
            shelfNo: shelfData.shelfNo,
            rackId: rack.id,
            description: shelfData.description,
            status: 'Active',
          },
        });
        createdShelves.push(shelf);
      }
    }
    console.log(`✅ ${createdShelves.length} shelves seeded`);

    // Seed Stock Movements (Stock In/Out) to create stock levels
    console.log('📊 Seeding stock movements...');
    
    // Use the created stores, racks, and shelves
    const allStores = createdStores;
    const allRacks = createdRacks;
    const allShelves = createdShelves;
    
    const movements = [];
    const now = new Date();
    
    // Create stock movements for the last 6 months with stores, racks, and shelves
    for (let monthOffset = 5; monthOffset >= 0; monthOffset--) {
      const movementDate = new Date(now);
      movementDate.setMonth(movementDate.getMonth() - monthOffset);
      
      // Stock In movements with locations
      for (let i = 0; i < createdParts.length; i++) {
        const part = createdParts[i];
        const qtyIn = Math.floor(Math.random() * 50) + 10; // 10-60 units
        
        // Assign random store, rack, and shelf
        const store = allStores[Math.floor(Math.random() * allStores.length)];
        const storeRacks = allRacks.filter(r => r.storeId === store.id);
        const rack = storeRacks.length > 0 ? storeRacks[Math.floor(Math.random() * storeRacks.length)] : null;
        const rackShelves = rack ? allShelves.filter(s => s.rackId === rack.id) : [];
        const shelf = rackShelves.length > 0 ? rackShelves[Math.floor(Math.random() * rackShelves.length)] : null;
        
        movements.push({
          partId: part.id,
          type: 'in',
          quantity: qtyIn,
          storeId: store.id,
          rackId: rack?.id || null,
          shelfId: shelf?.id || null,
          createdAt: new Date(movementDate.getTime() + Math.random() * 28 * 24 * 60 * 60 * 1000),
        });
      }
      
      // Stock Out movements (some parts)
      for (let i = 0; i < Math.floor(createdParts.length * 0.7); i++) {
        const part = createdParts[Math.floor(Math.random() * createdParts.length)];
        const qtyOut = Math.floor(Math.random() * 30) + 5; // 5-35 units
        
        const store = allStores[Math.floor(Math.random() * allStores.length)];
        const storeRacks = allRacks.filter(r => r.storeId === store.id);
        const rack = storeRacks.length > 0 ? storeRacks[Math.floor(Math.random() * storeRacks.length)] : null;
        const rackShelves = rack ? allShelves.filter(s => s.rackId === rack.id) : [];
        const shelf = rackShelves.length > 0 ? rackShelves[Math.floor(Math.random() * rackShelves.length)] : null;
        
        movements.push({
          partId: part.id,
          type: 'out',
          quantity: qtyOut,
          storeId: store.id,
          rackId: rack?.id || null,
          shelfId: shelf?.id || null,
          createdAt: new Date(movementDate.getTime() + Math.random() * 28 * 24 * 60 * 60 * 1000),
        });
      }
    }

    // Create varied movement patterns for realistic analysis
    // Fast moving items (recent activity within 30 days)
    const fastMovingParts = createdParts.slice(0, Math.floor(createdParts.length * 0.3));
    for (const part of fastMovingParts) {
      // Multiple movements in last 30 days
      for (let j = 0; j < 3; j++) {
        const daysAgo = Math.random() * 30;
        const qty = Math.floor(Math.random() * 50) + 20;
        const store = allStores[Math.floor(Math.random() * allStores.length)];
        const storeRacks = allRacks.filter(r => r.storeId === store.id);
        const rack = storeRacks.length > 0 ? storeRacks[Math.floor(Math.random() * storeRacks.length)] : null;
        const rackShelves = rack ? allShelves.filter(s => s.rackId === rack.id) : [];
        const shelf = rackShelves.length > 0 ? rackShelves[Math.floor(Math.random() * rackShelves.length)] : null;
        
        await prisma.stockMovement.create({
          data: {
            partId: part.id,
            type: 'in',
            quantity: qty,
            storeId: store.id,
            rackId: rack?.id || null,
            shelfId: shelf?.id || null,
            createdAt: new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000),
          },
        });
      }
      // Some out movements too
      for (let j = 0; j < 2; j++) {
        const daysAgo = Math.random() * 30;
        const qty = Math.floor(Math.random() * 30) + 10;
        const store = allStores[Math.floor(Math.random() * allStores.length)];
        const storeRacks = allRacks.filter(r => r.storeId === store.id);
        const rack = storeRacks.length > 0 ? storeRacks[Math.floor(Math.random() * storeRacks.length)] : null;
        const rackShelves = rack ? allShelves.filter(s => s.rackId === rack.id) : [];
        const shelf = rackShelves.length > 0 ? rackShelves[Math.floor(Math.random() * rackShelves.length)] : null;
        
        await prisma.stockMovement.create({
          data: {
            partId: part.id,
            type: 'out',
            quantity: qty,
            storeId: store.id,
            rackId: rack?.id || null,
            shelfId: shelf?.id || null,
            createdAt: new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000),
          },
        });
      }
    }

    // Normal moving items (activity 30-90 days ago)
    const normalMovingParts = createdParts.slice(Math.floor(createdParts.length * 0.3), Math.floor(createdParts.length * 0.7));
    for (const part of normalMovingParts) {
      const daysAgo = 30 + Math.random() * 60; // 30-90 days ago
      const qty = Math.floor(Math.random() * 40) + 15;
      const store = allStores[Math.floor(Math.random() * allStores.length)];
      const storeRacks = allRacks.filter(r => r.storeId === store.id);
      const rack = storeRacks.length > 0 ? storeRacks[Math.floor(Math.random() * storeRacks.length)] : null;
      const rackShelves = rack ? allShelves.filter(s => s.rackId === rack.id) : [];
      const shelf = rackShelves.length > 0 ? rackShelves[Math.floor(Math.random() * rackShelves.length)] : null;
      
      await prisma.stockMovement.create({
        data: {
          partId: part.id,
          type: 'in',
          quantity: qty,
          storeId: store.id,
          rackId: rack?.id || null,
          shelfId: shelf?.id || null,
          createdAt: new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000),
        },
      });
    }

    // Slow moving items (activity 90-180 days ago)
    const slowMovingParts = createdParts.slice(Math.floor(createdParts.length * 0.7), Math.floor(createdParts.length * 0.9));
    for (const part of slowMovingParts) {
      const daysAgo = 90 + Math.random() * 90; // 90-180 days ago
      const qty = Math.floor(Math.random() * 30) + 10;
      const store = allStores[Math.floor(Math.random() * allStores.length)];
      const storeRacks = allRacks.filter(r => r.storeId === store.id);
      const rack = storeRacks.length > 0 ? storeRacks[Math.floor(Math.random() * storeRacks.length)] : null;
      const rackShelves = rack ? allShelves.filter(s => s.rackId === rack.id) : [];
      const shelf = rackShelves.length > 0 ? rackShelves[Math.floor(Math.random() * rackShelves.length)] : null;
      
      await prisma.stockMovement.create({
        data: {
          partId: part.id,
          type: 'in',
          quantity: qty,
          storeId: store.id,
          rackId: rack?.id || null,
          shelfId: shelf?.id || null,
          createdAt: new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000),
        },
      });
    }

    // Dead stock items (activity more than 180 days ago or no activity)
    const deadStockParts = createdParts.slice(Math.floor(createdParts.length * 0.9));
    for (const part of deadStockParts) {
      // Some have very old movements, some have none
      if (Math.random() > 0.3) {
        const daysAgo = 180 + Math.random() * 180; // 180-360 days ago
        const qty = Math.floor(Math.random() * 20) + 5;
        const store = allStores[Math.floor(Math.random() * allStores.length)];
        const storeRacks = allRacks.filter(r => r.storeId === store.id);
        const rack = storeRacks.length > 0 ? storeRacks[Math.floor(Math.random() * storeRacks.length)] : null;
        const rackShelves = rack ? allShelves.filter(s => s.rackId === rack.id) : [];
        const shelf = rackShelves.length > 0 ? rackShelves[Math.floor(Math.random() * rackShelves.length)] : null;
        
        await prisma.stockMovement.create({
          data: {
            partId: part.id,
            type: 'in',
            quantity: qty,
            storeId: store.id,
            rackId: rack?.id || null,
            shelfId: shelf?.id || null,
            createdAt: new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000),
          },
        });
      }
      // Others have no movements (will show as dead stock)
    }

    // Add historical movements with locations
    for (const movement of movements.slice(0, 100)) {
      await prisma.stockMovement.create({
        data: movement,
      });
    }

    console.log(`✅ Stock movements seeded with store, rack, and shelf locations`);

    // Seed Sample Transfers
    console.log('📦 Seeding sample transfers...');
    const allStoresForTransfer = await prisma.store.findMany();
    const allRacksForTransfer = await prisma.rack.findMany();
    const allShelvesForTransfer = await prisma.shelf.findMany();
    
    if (allStoresForTransfer.length >= 2 && createdParts.length > 0) {
      // Check if transfers already exist
      const transferNum1 = `STR-${String(new Date().getFullYear()).slice(-2)}${String(new Date().getMonth() + 1).padStart(2, '0')}-001`;
      const transferNum2 = `STR-${String(new Date().getFullYear()).slice(-2)}${String(new Date().getMonth() + 1).padStart(2, '0')}-002`;
      
      const existingTransfers = await prisma.transfer.findMany({
        where: {
          transferNumber: {
            in: [transferNum1, transferNum2],
          },
        },
      });

      if (existingTransfers.length === 0) {
        const transferDate1 = new Date(now);
        transferDate1.setDate(transferDate1.getDate() - 5);
        
        const transferDate2 = new Date(now);
        transferDate2.setDate(transferDate2.getDate() - 2);
        
        // Transfer 1
        const transfer1 = await prisma.transfer.create({
        data: {
          transferNumber: transferNum1,
          date: transferDate1,
          status: 'Completed',
          notes: 'Sample transfer from Main Store to Warehouse A',
          fromStoreId: allStoresForTransfer[0].id,
          toStoreId: allStoresForTransfer[1]?.id || allStoresForTransfer[0].id,
          totalQty: 25,
          items: {
            create: [
              {
                partId: createdParts[0].id,
                fromStoreId: allStoresForTransfer[0].id,
                fromRackId: allRacksForTransfer[0]?.id || null,
                fromShelfId: allShelvesForTransfer[0]?.id || null,
                toStoreId: allStoresForTransfer[1]?.id || allStoresForTransfer[0].id,
                toRackId: allRacksForTransfer[1]?.id || null,
                toShelfId: allShelvesForTransfer[1]?.id || null,
                quantity: 15,
              },
              {
                partId: createdParts[1]?.id || createdParts[0].id,
                fromStoreId: allStoresForTransfer[0].id,
                fromRackId: allRacksForTransfer[0]?.id || null,
                fromShelfId: allShelvesForTransfer[0]?.id || null,
                toStoreId: allStoresForTransfer[1]?.id || allStoresForTransfer[0].id,
                toRackId: allRacksForTransfer[2]?.id || null,
                toShelfId: allShelvesForTransfer[2]?.id || null,
                quantity: 10,
              },
            ],
          },
        },
      });
      
      // Transfer 2
      const transfer2 = await prisma.transfer.create({
        data: {
          transferNumber: transferNum2,
          date: transferDate2,
          status: 'Pending',
          notes: 'Pending transfer for review',
          fromStoreId: allStoresForTransfer[1]?.id || allStoresForTransfer[0].id,
          toStoreId: allStoresForTransfer[2]?.id || allStoresForTransfer[0].id,
          totalQty: 30,
          items: {
            create: [
              {
                partId: createdParts[2]?.id || createdParts[0].id,
                fromStoreId: allStoresForTransfer[1]?.id || allStoresForTransfer[0].id,
                fromRackId: allRacksForTransfer[2]?.id || null,
                fromShelfId: allShelvesForTransfer[2]?.id || null,
                toStoreId: allStoresForTransfer[2]?.id || allStoresForTransfer[0].id,
                toRackId: allRacksForTransfer[3]?.id || null,
                toShelfId: allShelvesForTransfer[3]?.id || null,
                quantity: 20,
              },
              {
                partId: createdParts[3]?.id || createdParts[0].id,
                fromStoreId: allStoresForTransfer[1]?.id || allStoresForTransfer[0].id,
                fromRackId: allRacksForTransfer[2]?.id || null,
                fromShelfId: allShelvesForTransfer[2]?.id || null,
                toStoreId: allStoresForTransfer[2]?.id || allStoresForTransfer[0].id,
                toRackId: allRacksForTransfer[4]?.id || null,
                toShelfId: allShelvesForTransfer[4]?.id || null,
                quantity: 10,
              },
            ],
          },
        },
      });
      
        console.log('✅ 2 sample transfers seeded');
      } else {
        console.log('⚠️  Transfers already exist, skipping...');
      }
    } else {
      console.log('⚠️  Skipping transfer seeding - need at least 2 stores and parts');
    }

    // Seed Sample Adjustments
    console.log('📊 Seeding sample adjustments...');
    const allStoresForAdjustment = await prisma.store.findMany();
    
    if (allStoresForAdjustment.length > 0 && createdParts.length > 0) {
      const adjustmentDate1 = new Date(now);
      adjustmentDate1.setDate(adjustmentDate1.getDate() - 5);
      
      const adjustmentDate2 = new Date(now);
      adjustmentDate2.setDate(adjustmentDate2.getDate() - 10);
      
      const adjustmentDate3 = new Date(now);
      adjustmentDate3.setDate(adjustmentDate3.getDate() - 15);

      const store1 = allStoresForAdjustment[0];
      const part1 = createdParts[0];
      const part2 = createdParts[1];
      const part3 = createdParts[2] || createdParts[0];

      // Adjustment 1: Add inventory
      const adjustment1 = await prisma.adjustment.create({
        data: {
          date: adjustmentDate1,
          subject: 'Stock correction after physical count',
          storeId: store1.id,
          addInventory: true,
          notes: 'Found additional stock during inventory audit',
          totalAmount: (part1.cost || 0) * 10 + (part2.cost || 0) * 5,
          items: {
            create: [
              {
                partId: part1.id,
                quantity: 10,
                cost: part1.cost || null,
                notes: 'Additional stock found',
              },
              {
                partId: part2.id,
                quantity: 5,
                cost: part2.cost || null,
                notes: 'Stock correction',
              },
            ],
          },
        },
      });

      // Create stock movements for adjustment 1
      await prisma.stockMovement.createMany({
        data: [
          {
            partId: part1.id,
            type: 'in',
            quantity: 10,
            storeId: store1.id,
            referenceType: 'adjustment',
            referenceId: adjustment1.id,
            notes: 'Adjustment: Stock correction after physical count',
          },
          {
            partId: part2.id,
            type: 'in',
            quantity: 5,
            storeId: store1.id,
            referenceType: 'adjustment',
            referenceId: adjustment1.id,
            notes: 'Adjustment: Stock correction after physical count',
          },
        ],
      });

      // Adjustment 2: Remove inventory
      const adjustment2 = await prisma.adjustment.create({
        data: {
          date: adjustmentDate2,
          subject: 'Damaged items write-off',
          storeId: store1.id,
          addInventory: false,
          notes: 'Removed damaged items from inventory',
          totalAmount: (part1.cost || 0) * 3,
          items: {
            create: [
              {
                partId: part1.id,
                quantity: 3,
                cost: part1.cost || null,
                notes: 'Damaged items',
              },
            ],
          },
        },
      });

      // Create stock movements for adjustment 2
      await prisma.stockMovement.create({
        data: {
          partId: part1.id,
          type: 'out',
          quantity: 3,
          storeId: store1.id,
          referenceType: 'adjustment',
          referenceId: adjustment2.id,
          notes: 'Adjustment: Damaged items write-off',
        },
      });

      // Adjustment 3: Add inventory
      const adjustment3 = await prisma.adjustment.create({
        data: {
          date: adjustmentDate3,
          subject: 'Returned items from customer',
          storeId: store1.id,
          addInventory: true,
          notes: 'Items returned in good condition',
          totalAmount: (part3.cost || 0) * 8,
          items: {
            create: [
              {
                partId: part3.id,
                quantity: 8,
                cost: part3.cost || null,
                notes: 'Returned items',
              },
            ],
          },
        },
      });

      // Create stock movements for adjustment 3
      await prisma.stockMovement.create({
        data: {
          partId: part3.id,
          type: 'in',
          quantity: 8,
          storeId: store1.id,
          referenceType: 'adjustment',
          referenceId: adjustment3.id,
          notes: 'Adjustment: Returned items from customer',
        },
      });

      console.log('✅ 3 sample adjustments seeded');
    } else {
      console.log('⚠️  Skipping adjustment seeding - need at least 1 store and parts');
    }

    console.log('✅ Seeding completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Categories: ${seededCategories.length}`);
    console.log(`   - Brands: ${seededBrands.length}`);
    console.log(`   - Parts: ${createdParts.length}`);
    console.log(`   - Stock Movements: ${movements.length + createdParts.length}`);
    console.log(`   - Stores: ${createdStores.length}`);
    console.log(`   - Racks: ${createdRacks.length}`);
    console.log(`   - Shelves: ${createdShelves.length}`);
    console.log(`   - Transfers: 2`);
    console.log(`   - Adjustments: 3`);

    // Seed Sample Direct Purchase Orders
    console.log('🛒 Seeding sample direct purchase orders...');
    const allStoresForDPO = await prisma.store.findMany();
    
    if (allStoresForDPO.length > 0 && createdParts.length > 0) {
      const dpoDate1 = new Date(now);
      dpoDate1.setDate(dpoDate1.getDate() - 3);
      
      const dpoDate2 = new Date(now);
      dpoDate2.setDate(dpoDate2.getDate() - 7);

      const store1 = allStoresForDPO[0];
      const part1 = createdParts[0];
      const part2 = createdParts[1];
      const part3 = createdParts[2] || createdParts[0];

      // DPO 1
      const dpo1 = await prisma.directPurchaseOrder.create({
        data: {
          dpoNumber: `DPO-${new Date().getFullYear()}-001`,
          date: dpoDate1,
          storeId: store1.id,
          account: 'Cash Account',
          description: 'Direct purchase for urgent stock replenishment',
          status: 'Completed',
          totalAmount: (part1.cost || 0) * 20 + (part2.cost || 0) * 15,
          items: {
            create: [
              {
                partId: part1.id,
                quantity: 20,
                purchasePrice: part1.cost || 0,
                salePrice: part1.priceA || part1.cost || 0,
                amount: (part1.cost || 0) * 20,
              },
              {
                partId: part2.id,
                quantity: 15,
                purchasePrice: part2.cost || 0,
                salePrice: part2.priceA || part2.cost || 0,
                amount: (part2.cost || 0) * 15,
              },
            ],
          },
          expenses: {
            create: [
              {
                expenseType: 'Freight',
                payableAccount: 'Freight Payable',
                description: 'Shipping charges',
                amount: 500,
              },
            ],
          },
        },
      });

      // Create stock movements for DPO 1
      await prisma.stockMovement.createMany({
        data: [
          {
            partId: part1.id,
            type: 'in',
            quantity: 20,
            storeId: store1.id,
            referenceType: 'direct_purchase',
            referenceId: dpo1.id,
            notes: `Direct Purchase Order: ${dpo1.dpoNumber}`,
          },
          {
            partId: part2.id,
            type: 'in',
            quantity: 15,
            storeId: store1.id,
            referenceType: 'direct_purchase',
            referenceId: dpo1.id,
            notes: `Direct Purchase Order: ${dpo1.dpoNumber}`,
          },
        ],
      });

      // DPO 2
      const dpo2 = await prisma.directPurchaseOrder.create({
        data: {
          dpoNumber: `DPO-${new Date().getFullYear()}-002`,
          date: dpoDate2,
          storeId: store1.id,
          account: 'Bank Account',
          description: 'Bulk purchase for seasonal demand',
          status: 'Completed',
          totalAmount: (part3.cost || 0) * 50,
          items: {
            create: [
              {
                partId: part3.id,
                quantity: 50,
                purchasePrice: part3.cost || 0,
                salePrice: part3.priceA || part3.cost || 0,
                amount: (part3.cost || 0) * 50,
              },
            ],
          },
        },
      });

      // Create stock movements for DPO 2
      await prisma.stockMovement.create({
        data: {
          partId: part3.id,
          type: 'in',
          quantity: 50,
          storeId: store1.id,
          referenceType: 'direct_purchase',
          referenceId: dpo2.id,
          notes: `Direct Purchase Order: ${dpo2.dpoNumber}`,
        },
      });

      console.log('✅ 2 sample direct purchase orders seeded');
    } else {
      console.log('⚠️  Skipping DPO seeding - need at least 1 store and parts');
    }

    console.log(`   - Direct Purchase Orders: 2`);

    // Seed Accounting Data
    console.log('💰 Seeding accounting data...');
    
    // Seed Main Groups
    const mainGroupsData = [
      { code: '1', name: 'Current Assets', type: 'asset', displayOrder: 1 },
      { code: '2', name: 'Long Term Assets', type: 'asset', displayOrder: 2 },
      { code: '3', name: 'Current Liabilities', type: 'liability', displayOrder: 3 },
      { code: '4', name: 'Long Term Liabilities', type: 'liability', displayOrder: 4 },
      { code: '5', name: 'Capital', type: 'equity', displayOrder: 5 },
      { code: '6', name: 'Drawings', type: 'equity', displayOrder: 6 },
      { code: '7', name: 'Revenues', type: 'revenue', displayOrder: 7 },
      { code: '8', name: 'Expenses', type: 'expense', displayOrder: 8 },
      { code: '9', name: 'Cost', type: 'cost', displayOrder: 9 },
    ];

    const createdMainGroups = [];
    for (const mgData of mainGroupsData) {
      const mg = await prisma.mainGroup.upsert({
        where: { code: mgData.code },
        update: {},
        create: mgData,
      });
      createdMainGroups.push(mg);
    }
    console.log(`✅ ${createdMainGroups.length} main groups seeded`);

    // Seed Subgroups
    const subgroupsData = [
      { mainGroupCode: '1', code: '101', name: 'Inventory' },
      { mainGroupCode: '1', code: '102', name: 'Cash' },
      { mainGroupCode: '1', code: '103', name: 'Bank' },
      { mainGroupCode: '1', code: '104', name: 'Sales Customer Receivables' },
      { mainGroupCode: '1', code: '108', name: 'BANK ACCOUNT' },
      { mainGroupCode: '2', code: '206', name: 'SHOP INVESTMENT' },
      { mainGroupCode: '3', code: '301', name: 'Purchase Orders Payables' },
      { mainGroupCode: '3', code: '302', name: 'Purchase Expenses Payables' },
      { mainGroupCode: '3', code: '303', name: 'Salaries' },
      { mainGroupCode: '4', code: '304', name: 'Other Payables' },
      { mainGroupCode: '5', code: '501', name: "Owner's Equity" },
      { mainGroupCode: '6', code: '601', name: 'Owner Drawings' },
      { mainGroupCode: '7', code: '701', name: 'Sales Revenue' },
      { mainGroupCode: '8', code: '801', name: 'Operating Expenses' },
      { mainGroupCode: '9', code: '901', name: 'Cost of Goods Sold' },
    ];

    const createdSubgroups = [];
    for (const sgData of subgroupsData) {
      const mainGroup = createdMainGroups.find(mg => mg.code === sgData.mainGroupCode);
      if (mainGroup) {
        const sg = await prisma.subgroup.upsert({
          where: { code: sgData.code },
          update: {},
          create: {
            mainGroupId: mainGroup.id,
            code: sgData.code,
            name: sgData.name,
            isActive: true,
            canDelete: true,
          },
        });
        createdSubgroups.push(sg);
      }
    }
    console.log(`✅ ${createdSubgroups.length} subgroups seeded`);

    // Seed Sample Accounts
    const accountsData = [
      { subgroupCode: '102', code: '102001', name: 'Cash in Hand', openingBalance: 50000 },
      { subgroupCode: '103', code: '103015', name: 'JAZCASH', openingBalance: 25000 },
      { subgroupCode: '103', code: '103016', name: 'EASYPAISA', openingBalance: 15000 },
      { subgroupCode: '103', code: '103017', name: 'BANK ALFALAH', openingBalance: 100000 },
      { subgroupCode: '103', code: '103018', name: 'HBL', openingBalance: 75000 },
      { subgroupCode: '103', code: '103019', name: 'CASH', openingBalance: 30000 },
      { subgroupCode: '104', code: '104001', name: 'Accounts Receivable', openingBalance: 0 },
      { subgroupCode: '301', code: '301001', name: 'Accounts Payable', openingBalance: 0 },
      { subgroupCode: '501', code: '501001', name: "Owner's Capital", openingBalance: 500000 },
      { subgroupCode: '701', code: '701001', name: 'Sales Revenue', openingBalance: 0 },
      { subgroupCode: '801', code: '801001', name: 'Operating Expenses', openingBalance: 0 },
      { subgroupCode: '901', code: '901001', name: 'Cost of Goods Sold', openingBalance: 0 },
    ];

    const createdAccounts = [];
    for (const accData of accountsData) {
      const subgroup = createdSubgroups.find(sg => sg.code === accData.subgroupCode);
      if (subgroup) {
        const acc = await prisma.account.upsert({
          where: { code: accData.code },
          update: {},
          create: {
            subgroupId: subgroup.id,
            code: accData.code,
            name: accData.name,
            openingBalance: accData.openingBalance,
            currentBalance: accData.openingBalance,
            status: 'Active',
            canDelete: true,
          },
        });
        createdAccounts.push(acc);
      }
    }
    console.log(`✅ ${createdAccounts.length} accounts seeded`);

    console.log(`   - Main Groups: ${createdMainGroups.length}`);
    console.log(`   - Subgroups: ${createdSubgroups.length}`);
    console.log(`   - Accounts: ${createdAccounts.length}`);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run seed if called directly
if (require.main === module) {
  seed()
    .then(() => {
      console.log('✅ Seed process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seed process failed:', error);
      process.exit(1);
    });
}

export default seed;
