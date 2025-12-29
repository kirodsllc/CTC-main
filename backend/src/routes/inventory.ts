import express, { Request, Response } from 'express';
import prisma from '../config/database';

const router = express.Router();

// Get inventory dashboard stats
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const [
      totalParts,
      activeParts,
      totalValue,
      categoriesCount,
    ] = await Promise.all([
      prisma.part.count(),
      prisma.part.count({ where: { status: 'active' } }),
      prisma.part.aggregate({
        _sum: {
          cost: true,
        },
        where: {
          status: 'active',
        },
      }),
      prisma.category.count({ where: { status: 'active' } }),
    ]);

    // Get total quantity from stock movements
    const totalQtyResult = await prisma.stockMovement.aggregate({
      _sum: {
        quantity: true,
      },
    });

    // Calculate stock levels from movements
    const allMovements = await prisma.stockMovement.findMany({
      select: {
        partId: true,
        quantity: true,
        type: true,
      },
    });

    // Group movements by part
    const stockByPart: Record<string, { in: number; out: number }> = {};
    for (const movement of allMovements) {
      if (!stockByPart[movement.partId]) {
        stockByPart[movement.partId] = { in: 0, out: 0 };
      }
      if (movement.type === 'in') {
        stockByPart[movement.partId].in += movement.quantity;
      } else {
        stockByPart[movement.partId].out += movement.quantity;
      }
    }

    // Calculate low stock and out of stock
    const parts = await prisma.part.findMany({
      where: { status: 'active' },
      select: {
        id: true,
        reorderLevel: true,
      },
    });

    let lowStockCount = 0;
    let outOfStockCount = 0;

    for (const part of parts) {
      const stock = stockByPart[part.id] || { in: 0, out: 0 };
      const currentStock = stock.in - stock.out;

      if (currentStock <= 0) {
        outOfStockCount++;
      } else if (part.reorderLevel > 0 && currentStock <= part.reorderLevel) {
        lowStockCount++;
      }
    }

    // Get chart data: Category Value Distribution
    const partsWithCategories = await prisma.part.findMany({
      where: { status: 'active' },
      include: {
        category: true,
      },
    });

    // Get all stock movements for these parts
    const partIds = partsWithCategories.map(p => p.id);
    const allPartMovements = partIds.length > 0 ? await prisma.stockMovement.findMany({
      where: {
        partId: { in: partIds },
      },
      select: {
        partId: true,
        quantity: true,
        type: true,
      },
    }) : [];

    // Group movements by part
    const movementsByPart: Record<string, { in: number; out: number }> = {};
    for (const movement of allPartMovements) {
      if (!movementsByPart[movement.partId]) {
        movementsByPart[movement.partId] = { in: 0, out: 0 };
      }
      if (movement.type === 'in') {
        movementsByPart[movement.partId].in += movement.quantity;
      } else {
        movementsByPart[movement.partId].out += movement.quantity;
      }
    }

    // Calculate category values
    const categoryValueMap: Record<string, number> = {};
    const categoryCountMap: Record<string, number> = {};
    
    for (const part of partsWithCategories) {
      const stock = movementsByPart[part.id] || { in: 0, out: 0 };
      const currentStock = stock.in - stock.out;
      // Use cost if available, otherwise use 0 (will show value as 0)
      const value = (part.cost || 0) * Math.max(0, currentStock);
      
      const catName = part.category ? part.category.name : 'Uncategorized';
      categoryValueMap[catName] = (categoryValueMap[catName] || 0) + value;
      categoryCountMap[catName] = (categoryCountMap[catName] || 0) + 1;
    }

    const categoryValueData = Object.entries(categoryValueMap)
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value);

    // Generate consistent colors for categories
    const categoryColors = [
      'hsl(0, 70%, 50%)',    // Red
      'hsl(30, 70%, 50%)',   // Orange
      'hsl(60, 70%, 50%)',   // Yellow
      'hsl(120, 70%, 50%)',  // Green
      'hsl(180, 70%, 50%)',  // Cyan
      'hsl(240, 70%, 50%)',  // Blue
      'hsl(270, 70%, 50%)',  // Purple
      'hsl(300, 70%, 50%)',  // Magenta
    ];

    const categoryDistribution = Object.entries(categoryCountMap)
      .map(([name, count], index) => ({
        name,
        value: count,
        color: categoryColors[index % categoryColors.length],
      }))
      .sort((a, b) => b.value - a.value);

    // Get brand values
    const partsWithBrands = await prisma.part.findMany({
      where: { status: 'active' },
      include: {
        brand: true,
      },
    });

    const brandValueMap: Record<string, number> = {};
    for (const part of partsWithBrands) {
      const stock = movementsByPart[part.id] || { in: 0, out: 0 };
      const currentStock = stock.in - stock.out;
      const value = (part.cost || 0) * currentStock;
      
      if (part.brand) {
        brandValueMap[part.brand.name] = (brandValueMap[part.brand.name] || 0) + value;
      } else {
        // Handle parts without brand
        const brandName = 'No Brand';
        brandValueMap[brandName] = (brandValueMap[brandName] || 0) + value;
      }
    }

    const topBrandsByValue = Object.entries(brandValueMap)
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    // Get stock movement trends (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const movementsLast6Months = await prisma.stockMovement.findMany({
      where: {
        createdAt: {
          gte: sixMonthsAgo,
        },
      },
      select: {
        quantity: true,
        type: true,
        createdAt: true,
      },
    });

    // Group by month
    const monthlyData: Record<string, { in: number; out: number }> = {};
    for (const movement of movementsLast6Months) {
      const monthKey = new Date(movement.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { in: 0, out: 0 };
      }
      if (movement.type === 'in') {
        monthlyData[monthKey].in += movement.quantity;
      } else {
        monthlyData[monthKey].out += movement.quantity;
      }
    }

    // Generate last 6 months
    const stockMovementData = [];
    let balance = 0;
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      const monthData = monthlyData[monthKey] || { in: 0, out: 0 };
      balance += monthData.in - monthData.out;
      stockMovementData.push({
        month: monthKey,
        balance,
        stockIn: monthData.in,
        stockOut: monthData.out,
      });
    }

    res.json({
      totalParts,
      activeParts,
      totalValue: totalValue._sum.cost || 0,
      totalQty: totalQtyResult._sum.quantity || 0,
      categoriesCount,
      lowStock: lowStockCount,
      outOfStock: outOfStockCount,
      charts: {
        categoryValueData,
        categoryDistribution,
        topBrandsByValue,
        stockMovementData,
      },
    });
  } catch (error: any) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get stock movements
router.get('/movements', async (req: Request, res: Response) => {
  try {
    const {
      part_id,
      type,
      from_date,
      to_date,
      store_id,
      page = '1',
      limit = '50',
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (part_id) {
      where.partId = part_id as string;
    }

    if (type) {
      where.type = type as string;
    }

    if (store_id) {
      where.storeId = store_id as string;
    }

    if (from_date || to_date) {
      where.createdAt = {};
      if (from_date) {
        where.createdAt.gte = new Date(from_date as string);
      }
      if (to_date) {
        where.createdAt.lte = new Date(to_date as string);
      }
    }

    const [movements, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        include: {
          part: {
            include: {
              brand: true,
              category: true,
            },
          },
          store: true,
          rack: true,
          shelf: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limitNum,
      }),
      prisma.stockMovement.count({ where }),
    ]);

    res.json({
      data: movements.map(m => ({
        id: m.id,
        part_id: m.partId,
        part_no: m.part.partNo,
        part_description: m.part.description,
        brand: m.part.brand?.name || null,
        category: m.part.category?.name || null,
        type: m.type,
        quantity: m.quantity,
        store_id: m.storeId,
        store_name: m.store?.name || null,
        rack_id: m.rackId,
        rack_code: m.rack?.codeNo || null,
        shelf_id: m.shelfId,
        shelf_no: m.shelf?.shelfNo || null,
        reference_type: m.referenceType,
        reference_id: m.referenceId,
        notes: m.notes,
        created_at: m.createdAt,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error('Error fetching stock movements:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create stock movement (Stock In/Out)
router.post('/movements', async (req: Request, res: Response) => {
  try {
    const {
      part_id,
      type,
      quantity,
      store_id,
      rack_id,
      shelf_id,
      reference_type,
      reference_id,
      notes,
    } = req.body;

    if (!part_id || !type || !quantity) {
      return res.status(400).json({ error: 'part_id, type, and quantity are required' });
    }

    if (type !== 'in' && type !== 'out') {
      return res.status(400).json({ error: 'type must be "in" or "out"' });
    }

    const movement = await prisma.stockMovement.create({
      data: {
        partId: part_id,
        type: type,
        quantity: parseInt(quantity),
        storeId: store_id || null,
        rackId: rack_id || null,
        shelfId: shelf_id || null,
        referenceType: reference_type || null,
        referenceId: reference_id || null,
        notes: notes || null,
      },
      include: {
        part: {
          include: {
            brand: true,
          },
        },
        store: true,
      },
    });

    res.status(201).json({
      id: movement.id,
      part_id: movement.partId,
      part_no: movement.part.partNo,
      type: movement.type,
      quantity: movement.quantity,
      created_at: movement.createdAt,
    });
  } catch (error: any) {
    console.error('Error creating stock movement:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get stock balance for a part
router.get('/balance/:partId', async (req: Request, res: Response) => {
  try {
    const { partId } = req.params;

    const movements = await prisma.stockMovement.findMany({
      where: { partId },
    });

    const stockIn = movements
      .filter(m => m.type === 'in')
      .reduce((sum, m) => sum + m.quantity, 0);
    const stockOut = movements
      .filter(m => m.type === 'out')
      .reduce((sum, m) => sum + m.quantity, 0);
    const currentStock = stockIn - stockOut;

    const part = await prisma.part.findUnique({
      where: { id: partId },
      include: {
        brand: true,
        category: true,
      },
    });

    res.json({
      part_id: partId,
      part_no: part?.partNo,
      part_description: part?.description,
      brand: part?.brand?.name || null,
      category: part?.category?.name || null,
      stock_in: stockIn,
      stock_out: stockOut,
      current_stock: currentStock,
      reorder_level: part?.reorderLevel || 0,
      is_low_stock: part?.reorderLevel ? currentStock <= part.reorderLevel : false,
      is_out_of_stock: currentStock <= 0,
    });
  } catch (error: any) {
    console.error('Error fetching stock balance:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all stock balances
router.get('/balances', async (req: Request, res: Response) => {
  try {
    const { search, category_id, low_stock, out_of_stock, page = '1', limit = '50' } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = { status: 'active' };
    if (category_id) {
      where.categoryId = category_id as string;
    }

    const parts = await prisma.part.findMany({
      where,
      include: {
        brand: true,
        category: true,
      },
      skip,
      take: limitNum,
    });

    // Get stock movements for these parts
    const partIds = parts.map(p => p.id);
    const movements = await prisma.stockMovement.findMany({
      where: {
        partId: { in: partIds },
      },
      select: {
        partId: true,
        quantity: true,
        type: true,
      },
    });

    // Group movements by part
    const stockByPart: Record<string, { in: number; out: number }> = {};
    for (const movement of movements) {
      if (!stockByPart[movement.partId]) {
        stockByPart[movement.partId] = { in: 0, out: 0 };
      }
      if (movement.type === 'in') {
        stockByPart[movement.partId].in += movement.quantity;
      } else {
        stockByPart[movement.partId].out += movement.quantity;
      }
    }

    const balances = parts.map(part => {
      const stock = stockByPart[part.id] || { in: 0, out: 0 };
      const currentStock = stock.in - stock.out;

      return {
        part_id: part.id,
        part_no: part.partNo,
        description: part.description,
        brand: part.brand?.name || null,
        category: part.category?.name || null,
        stock_in: stock.in,
        stock_out: stock.out,
        current_stock: currentStock,
        reorder_level: part.reorderLevel,
        is_low_stock: part.reorderLevel ? currentStock <= part.reorderLevel : false,
        is_out_of_stock: currentStock <= 0,
        cost: part.cost,
        value: (part.cost || 0) * currentStock,
      };
    });

    // Apply filters
    let filteredBalances = balances;
    if (low_stock === 'true') {
      filteredBalances = filteredBalances.filter(b => b.is_low_stock && !b.is_out_of_stock);
    }
    if (out_of_stock === 'true') {
      filteredBalances = filteredBalances.filter(b => b.is_out_of_stock);
    }
    if (search) {
      const searchLower = (search as string).toLowerCase();
      filteredBalances = filteredBalances.filter(b =>
        b.part_no.toLowerCase().includes(searchLower) ||
        b.description?.toLowerCase().includes(searchLower) ||
        b.brand?.toLowerCase().includes(searchLower)
      );
    }

    const total = await prisma.part.count({ where });

    res.json({
      data: filteredBalances,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error('Error fetching stock balances:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get stock movement analysis
router.get('/stock-analysis', async (req: Request, res: Response) => {
  try {
    const {
      fast_moving_days = '30',
      slow_moving_days = '90',
      dead_stock_days = '180',
      analysis_period = '6',
      search,
      category,
      classification,
    } = req.query;

    const fastMovingDays = parseInt(fast_moving_days as string);
    const slowMovingDays = parseInt(slow_moving_days as string);
    const deadStockDays = parseInt(dead_stock_days as string);
    const analysisPeriodMonths = parseInt(analysis_period as string);

    // Calculate analysis period start date
    const analysisStartDate = new Date();
    analysisStartDate.setMonth(analysisStartDate.getMonth() - analysisPeriodMonths);

    // Get all active parts
    const where: any = { status: 'active' };
    if (category && category !== 'all' && category !== 'All Categories') {
      const categoryRecord = await prisma.category.findFirst({
        where: { name: { contains: category as string } },
      });
      if (categoryRecord) {
        where.categoryId = categoryRecord.id;
      }
    }

    const parts = await prisma.part.findMany({
      where,
      include: {
        brand: true,
        category: true,
      },
    });

    // Get all stock movements for these parts
    const partIds = parts.map(p => p.id);
    const allMovements = await prisma.stockMovement.findMany({
      where: {
        partId: { in: partIds },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Group movements by part
    const movementsByPart: Record<string, typeof allMovements> = {};
    for (const movement of allMovements) {
      if (!movementsByPart[movement.partId]) {
        movementsByPart[movement.partId] = [];
      }
      movementsByPart[movement.partId].push(movement);
    }

    // Calculate stock levels and analysis metrics
    const stockByPart: Record<string, { in: number; out: number; lastMovementDate: Date | null }> = {};
    for (const part of parts) {
      const movements = movementsByPart[part.id] || [];
      stockByPart[part.id] = {
        in: 0,
        out: 0,
        lastMovementDate: movements.length > 0 ? movements[0].createdAt : null,
      };
      for (const movement of movements) {
        if (movement.type === 'in') {
          stockByPart[part.id].in += movement.quantity;
        } else {
          stockByPart[part.id].out += movement.quantity;
        }
      }
    }

    // Calculate turnover (movements in analysis period)
    const turnoverByPart: Record<string, number> = {};
    for (const part of parts) {
      const movements = movementsByPart[part.id] || [];
      const periodMovements = movements.filter(m => m.createdAt >= analysisStartDate);
      // Calculate total quantity moved (both in and out)
      const totalMoved = periodMovements.reduce((sum, m) => sum + m.quantity, 0);
      // Turnover = total moved / analysis period in months
      turnoverByPart[part.id] = totalMoved / analysisPeriodMonths;
    }

    // Build analysis results
    const results = [];
    const now = new Date();

    for (const part of parts) {
      const stock = stockByPart[part.id] || { in: 0, out: 0, lastMovementDate: null };
      const currentStock = stock.in - stock.out;
      const value = (part.cost || 0) * currentStock;

      // Calculate days idle
      let daysIdle = 0;
      if (stock.lastMovementDate) {
        const diffTime = now.getTime() - stock.lastMovementDate.getTime();
        daysIdle = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      } else {
        // If no movement, consider it very old (e.g., 365 days)
        daysIdle = 365;
      }

      const turnover = turnoverByPart[part.id] || 0;

      // Classify item
      let itemClassification: 'Fast' | 'Normal' | 'Slow' | 'Dead' = 'Normal';
      if (daysIdle >= deadStockDays || turnover === 0) {
        itemClassification = 'Dead';
      } else if (daysIdle >= slowMovingDays) {
        itemClassification = 'Slow';
      } else if (daysIdle <= fastMovingDays && turnover >= 5) {
        itemClassification = 'Fast';
      }

      // Apply classification filter
      if (classification && classification !== 'All' && classification !== 'all') {
        if (itemClassification !== classification) {
          continue;
        }
      }

      // Apply search filter
      if (search) {
        const searchLower = (search as string).toLowerCase();
        const matchesSearch =
          part.partNo.toLowerCase().includes(searchLower) ||
          (part.description || '').toLowerCase().includes(searchLower) ||
          (part.category?.name || '').toLowerCase().includes(searchLower);
        if (!matchesSearch) {
          continue;
        }
      }

      results.push({
        id: part.id,
        partNo: part.partNo,
        description: part.description || '',
        category: part.category?.name || 'Uncategorized',
        quantity: currentStock,
        value: value,
        daysIdle: daysIdle,
        turnover: Math.round(turnover * 10) / 10, // Round to 1 decimal
        classification: itemClassification,
      });
    }

    // Sort by part number
    results.sort((a, b) => a.partNo.localeCompare(b.partNo));

    res.json({
      data: results,
    });
  } catch (error: any) {
    console.error('Error fetching stock analysis:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get stock balance & valuation with store and location details
router.get('/stock-balance-valuation', async (req: Request, res: Response) => {
  try {
    const { search, category, store, page = '1', limit = '1000' } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Get all active parts
    const where: any = { status: 'active' };
    if (category && category !== 'All Categories') {
      const categoryRecord = await prisma.category.findFirst({
        where: { name: { contains: category as string } },
      });
      if (categoryRecord) {
        where.categoryId = categoryRecord.id;
      }
    }

    const parts = await prisma.part.findMany({
      where,
      include: {
        brand: true,
        category: true,
      },
    });

    // Get all stock movements with store, rack, and shelf information
    const partIds = parts.map(p => p.id);
    const movements = await prisma.stockMovement.findMany({
      where: {
        partId: { in: partIds },
      },
      include: {
        store: true,
        rack: true,
        shelf: true,
      },
    });

    // Group movements by part, store, rack, and shelf for accurate location-based tracking
    // Key format: partId_storeId_rackId_shelfId
    const stockByLocation: Record<string, { 
      in: number; 
      out: number; 
      store: any; 
      rack: any; 
      shelf: any;
    }> = {};
    
    for (const movement of movements) {
      // Use consistent keys for null values
      const storeId = movement.storeId || 'no-store';
      const rackId = movement.rackId || 'no-rack';
      const shelfId = movement.shelfId || 'no-shelf';
      const key = `${movement.partId}_${storeId}_${rackId}_${shelfId}`;
      
      if (!stockByLocation[key]) {
        stockByLocation[key] = {
          in: 0,
          out: 0,
          store: movement.store,
          rack: movement.rack,
          shelf: movement.shelf,
        };
      }
      
      // Accumulate quantities correctly
      if (movement.type === 'in') {
        stockByLocation[key].in += movement.quantity;
      } else if (movement.type === 'out') {
        stockByLocation[key].out += movement.quantity;
      }
    }

    // Build result array - one row per part-store-location combination
    const result: any[] = [];
    let itemId = 1;

    for (const part of parts) {
      // Find all locations for this part
      const partLocations = Object.entries(stockByLocation).filter(([key]) => key.startsWith(`${part.id}_`));
      
      if (partLocations.length === 0) {
        // If no movements, include the part with zero stock (only if matches search)
        const matchesSearch = !search || 
          part.partNo.toLowerCase().includes((search as string).toLowerCase()) || 
          (part.description || '').toLowerCase().includes((search as string).toLowerCase());
        
        if (matchesSearch) {
          result.push({
            id: itemId++,
            partNo: part.partNo,
            description: part.description || '',
            category: part.category?.name || 'Uncategorized',
            uom: part.uom || 'pcs',
            quantity: 0,
            cost: part.cost || 0,
            value: 0,
            store: 'No Store',
            location: '-',
          });
        }
      } else {
        // Create an entry for each location
        for (const [key, stockData] of partLocations) {
          const quantity = stockData.in - stockData.out;
          const storeName = stockData.store?.name || 'No Store';
          
          // Apply store filter
          if (store && store !== 'All Stores' && storeName !== store) {
            continue;
          }
          
          // Build location string
          const rackCode = stockData.rack?.codeNo || '';
          const shelfNo = stockData.shelf?.shelfNo || '';
          const location = rackCode && shelfNo 
            ? `${rackCode}/${shelfNo}` 
            : rackCode || shelfNo || '-';
          
          // Include all items (including zero or negative quantity for accurate reporting)
          // Negative quantities indicate data issues but should be shown
          result.push({
            id: itemId++,
            partNo: part.partNo,
            description: part.description || '',
            category: part.category?.name || 'Uncategorized',
            uom: part.uom || 'pcs',
            quantity: quantity,
            cost: part.cost || 0,
            value: (part.cost || 0) * Math.max(0, quantity), // Value should not be negative
            store: storeName,
            location: location,
          });
        }
      }
    }

    // Apply search filter
    let filteredResult = result;
    if (search) {
      const searchLower = (search as string).toLowerCase();
      filteredResult = filteredResult.filter(item =>
        item.partNo.toLowerCase().includes(searchLower) ||
        item.description.toLowerCase().includes(searchLower)
      );
    }

    // Apply category filter (already done in query, but double-check)
    if (category && category !== 'All Categories') {
      filteredResult = filteredResult.filter(item => 
        item.category.toLowerCase().includes((category as string).toLowerCase())
      );
    }

    // Sort by part number
    filteredResult.sort((a, b) => a.partNo.localeCompare(b.partNo));

    // Pagination
    const total = filteredResult.length;
    const paginatedResult = filteredResult.slice(skip, skip + limitNum);

    res.json({
      data: paginatedResult,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error('Error fetching stock balance valuation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get transfers
router.get('/transfers', async (req: Request, res: Response) => {
  try {
    const { status, from_date, to_date, page = '1', limit = '50' } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (status) {
      where.status = status as string;
    }
    if (from_date || to_date) {
      where.date = {};
      if (from_date) {
        where.date.gte = new Date(from_date as string);
      }
      if (to_date) {
        where.date.lte = new Date(to_date as string);
      }
    }

    const [transfers, total] = await Promise.all([
      prisma.transfer.findMany({
        where,
        include: {
          fromStore: true,
          toStore: true,
          items: {
            include: {
              part: {
                include: {
                  brand: true,
                },
              },
            },
          },
        },
        orderBy: {
          date: 'desc',
        },
        skip,
        take: limitNum,
      }),
      prisma.transfer.count({ where }),
    ]);

    res.json({
      data: transfers.map(t => ({
        id: t.id,
        transfer_number: t.transferNumber,
        date: t.date,
        status: t.status,
        notes: t.notes,
        total_qty: t.totalQty,
        from_store: t.fromStore?.name || null,
        to_store: t.toStore?.name || null,
        items_count: t.items.length,
        created_at: t.createdAt,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error('Error fetching transfers:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create transfer
router.post('/transfers', async (req: Request, res: Response) => {
  try {
    const { transfer_number, date, from_store_id, to_store_id, notes, items } = req.body;

    if (!transfer_number || !date || !items || items.length === 0) {
      return res.status(400).json({ error: 'transfer_number, date, and items are required' });
    }

    const totalQty = items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);

    const transfer = await prisma.transfer.create({
      data: {
        transferNumber: transfer_number,
        date: new Date(date),
        fromStoreId: from_store_id || null,
        toStoreId: to_store_id || null,
        notes: notes || null,
        totalQty: totalQty,
        status: 'Draft',
        items: {
          create: items.map((item: any) => ({
            partId: item.part_id,
            fromStoreId: item.from_store_id || null,
            fromRackId: item.from_rack_id || null,
            fromShelfId: item.from_shelf_id || null,
            toStoreId: item.to_store_id || null,
            toRackId: item.to_rack_id || null,
            toShelfId: item.to_shelf_id || null,
            quantity: item.quantity,
          })),
        },
      },
      include: {
        items: {
          include: {
            part: true,
          },
        },
      },
    });

    res.status(201).json({
      id: transfer.id,
      transfer_number: transfer.transferNumber,
      date: transfer.date,
      status: transfer.status,
      total_qty: transfer.totalQty,
      items_count: transfer.items.length,
    });
  } catch (error: any) {
    console.error('Error creating transfer:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single transfer
router.get('/transfers/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const transfer = await prisma.transfer.findUnique({
      where: { id },
      include: {
        fromStore: true,
        toStore: true,
        items: {
          include: {
            part: {
              include: {
                brand: true,
                category: true,
              },
            },
            fromStore: true,
            fromRack: true,
            fromShelf: true,
            toStore: true,
            toRack: true,
            toShelf: true,
          },
        },
      },
    });

    if (!transfer) {
      return res.status(404).json({ error: 'Transfer not found' });
    }

    res.json({
      id: transfer.id,
      transfer_number: transfer.transferNumber,
      date: transfer.date,
      status: transfer.status,
      notes: transfer.notes,
      total_qty: transfer.totalQty,
      from_store_id: transfer.fromStoreId,
      from_store: transfer.fromStore?.name || null,
      to_store_id: transfer.toStoreId,
      to_store: transfer.toStore?.name || null,
      items: transfer.items.map(item => ({
        id: item.id,
        part_id: item.partId,
        part_no: item.part.partNo,
        part_description: item.part.description,
        brand: item.part.brand?.name || '',
        category: item.part.category?.name || '',
        quantity: item.quantity,
        from_store_id: item.fromStoreId,
        from_store: item.fromStore?.name || null,
        from_rack_id: item.fromRackId,
        from_rack: item.fromRack?.codeNo || null,
        from_shelf_id: item.fromShelfId,
        from_shelf: item.fromShelf?.shelfNo || null,
        to_store_id: item.toStoreId,
        to_store: item.toStore?.name || null,
        to_rack_id: item.toRackId,
        to_rack: item.toRack?.codeNo || null,
        to_shelf_id: item.toShelfId,
        to_shelf: item.toShelf?.shelfNo || null,
      })),
      created_at: transfer.createdAt,
    });
  } catch (error: any) {
    console.error('Error fetching transfer:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update transfer
router.put('/transfers/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { transfer_number, date, from_store_id, to_store_id, notes, status, items } = req.body;

    // Check if transfer exists
    const existingTransfer = await prisma.transfer.findUnique({ where: { id } });
    if (!existingTransfer) {
      return res.status(404).json({ error: 'Transfer not found' });
    }

    const totalQty = items ? items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) : existingTransfer.totalQty;

    // Update transfer
    const transfer = await prisma.transfer.update({
      where: { id },
      data: {
        ...(transfer_number && { transferNumber: transfer_number }),
        ...(date && { date: new Date(date) }),
        ...(from_store_id !== undefined && { fromStoreId: from_store_id || null }),
        ...(to_store_id !== undefined && { toStoreId: to_store_id || null }),
        ...(notes !== undefined && { notes: notes || null }),
        ...(status && { status }),
        ...(totalQty !== undefined && { totalQty }),
        ...(items && {
          items: {
            deleteMany: {},
            create: items.map((item: any) => ({
              partId: item.part_id,
              fromStoreId: item.from_store_id || null,
              fromRackId: item.from_rack_id || null,
              fromShelfId: item.from_shelf_id || null,
              toStoreId: item.to_store_id || null,
              toRackId: item.to_rack_id || null,
              toShelfId: item.to_shelf_id || null,
              quantity: item.quantity,
            })),
          },
        }),
      },
      include: {
        items: {
          include: {
            part: true,
          },
        },
      },
    });

    res.json({
      id: transfer.id,
      transfer_number: transfer.transferNumber,
      date: transfer.date,
      status: transfer.status,
      total_qty: transfer.totalQty,
      items_count: transfer.items.length,
    });
  } catch (error: any) {
    console.error('Error updating transfer:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete transfer
router.delete('/transfers/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const transfer = await prisma.transfer.findUnique({ where: { id } });
    if (!transfer) {
      return res.status(404).json({ error: 'Transfer not found' });
    }

    await prisma.transfer.delete({ where: { id } });

    res.json({ message: 'Transfer deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting transfer:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get adjustments
router.get('/adjustments', async (req: Request, res: Response) => {
  try {
    const { from_date, to_date, page = '1', limit = '50' } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (from_date || to_date) {
      where.date = {};
      if (from_date) {
        where.date.gte = new Date(from_date as string);
      }
      if (to_date) {
        where.date.lte = new Date(to_date as string);
      }
    }

    const [adjustments, total] = await Promise.all([
      prisma.adjustment.findMany({
        where,
        include: {
          store: true,
          items: {
            include: {
              part: {
                include: {
                  brand: true,
                },
              },
            },
          },
        },
        orderBy: {
          date: 'desc',
        },
        skip,
        take: limitNum,
      }),
      prisma.adjustment.count({ where }),
    ]);

    res.json({
      data: adjustments.map(a => ({
        id: a.id,
        date: a.date,
        subject: a.subject,
        store_id: a.storeId,
        store_name: a.store?.name || null,
        add_inventory: a.addInventory,
        notes: a.notes,
        total_amount: a.totalAmount,
        items_count: a.items.length,
        created_at: a.createdAt,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error('Error fetching adjustments:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create adjustment
router.post('/adjustments', async (req: Request, res: Response) => {
  try {
    const { date, subject, store_id, add_inventory, notes, items } = req.body;

    if (!date || !items || items.length === 0) {
      return res.status(400).json({ error: 'date and items are required' });
    }

    // Calculate total amount
    const totalAmount = items.reduce((sum: number, item: any) => {
      const cost = item.cost || 0;
      const qty = item.quantity || 0;
      return sum + (cost * qty);
    }, 0);

    const adjustment = await prisma.adjustment.create({
      data: {
        date: new Date(date),
        subject: subject || null,
        storeId: store_id || null,
        addInventory: add_inventory !== false,
        notes: notes || null,
        totalAmount: totalAmount,
        items: {
          create: items.map((item: any) => ({
            partId: item.part_id,
            quantity: item.quantity,
            cost: item.cost || null,
            notes: item.notes || null,
          })),
        },
      },
      include: {
        items: {
          include: {
            part: true,
          },
        },
      },
    });

    // Create stock movements for adjustment
    for (const item of items) {
      await prisma.stockMovement.create({
        data: {
          partId: item.part_id,
          type: add_inventory !== false ? 'in' : 'out',
          quantity: item.quantity,
          storeId: store_id || null,
          referenceType: 'adjustment',
          referenceId: adjustment.id,
          notes: `Adjustment: ${subject || 'Stock adjustment'}`,
        },
      });
    }

    res.status(201).json({
      id: adjustment.id,
      date: adjustment.date,
      subject: adjustment.subject,
      total_amount: adjustment.totalAmount,
      items_count: adjustment.items.length,
    });
  } catch (error: any) {
    console.error('Error creating adjustment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single adjustment
router.get('/adjustments/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const adjustment = await prisma.adjustment.findUnique({
      where: { id },
      include: {
        store: true,
        items: {
          include: {
            part: {
              include: {
                brand: true,
                category: true,
              },
            },
          },
        },
      },
    });

    if (!adjustment) {
      return res.status(404).json({ error: 'Adjustment not found' });
    }

    res.json({
      id: adjustment.id,
      date: adjustment.date,
      subject: adjustment.subject,
      store_id: adjustment.storeId,
      store_name: adjustment.store?.name || null,
      add_inventory: adjustment.addInventory,
      notes: adjustment.notes,
      total_amount: adjustment.totalAmount,
      items: adjustment.items.map(item => ({
        id: item.id,
        part_id: item.partId,
        part_no: item.part.partNo,
        part_description: item.part.description,
        brand: item.part.brand?.name || '',
        category: item.part.category?.name || '',
        quantity: item.quantity,
        cost: item.cost,
        notes: item.notes,
      })),
      created_at: adjustment.createdAt,
    });
  } catch (error: any) {
    console.error('Error fetching adjustment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update adjustment
router.put('/adjustments/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { date, subject, store_id, add_inventory, notes, items } = req.body;

    // Check if adjustment exists
    const existingAdjustment = await prisma.adjustment.findUnique({ where: { id } });
    if (!existingAdjustment) {
      return res.status(404).json({ error: 'Adjustment not found' });
    }

    // Calculate total amount
    const totalAmount = items ? items.reduce((sum: number, item: any) => {
      const cost = item.cost || 0;
      const qty = item.quantity || 0;
      return sum + (cost * qty);
    }, 0) : existingAdjustment.totalAmount;

    // Delete existing stock movements for this adjustment
    await prisma.stockMovement.deleteMany({
      where: {
        referenceType: 'adjustment',
        referenceId: id,
      },
    });

    // Update adjustment
    const adjustment = await prisma.adjustment.update({
      where: { id },
      data: {
        ...(date && { date: new Date(date) }),
        ...(subject !== undefined && { subject: subject || null }),
        ...(store_id !== undefined && { storeId: store_id || null }),
        ...(add_inventory !== undefined && { addInventory: add_inventory }),
        ...(notes !== undefined && { notes: notes || null }),
        ...(totalAmount !== undefined && { totalAmount }),
        ...(items && {
          items: {
            deleteMany: {},
            create: items.map((item: any) => ({
              partId: item.part_id,
              quantity: item.quantity,
              cost: item.cost || null,
              notes: item.notes || null,
            })),
          },
        }),
      },
      include: {
        items: {
          include: {
            part: true,
          },
        },
      },
    });

    // Create new stock movements for adjustment
    if (items) {
      for (const item of items) {
        await prisma.stockMovement.create({
          data: {
            partId: item.part_id,
            type: add_inventory !== false ? 'in' : 'out',
            quantity: item.quantity,
            storeId: store_id || null,
            referenceType: 'adjustment',
            referenceId: adjustment.id,
            notes: `Adjustment: ${subject || 'Stock adjustment'}`,
          },
        });
      }
    }

    res.json({
      id: adjustment.id,
      date: adjustment.date,
      subject: adjustment.subject,
      total_amount: adjustment.totalAmount,
      items_count: adjustment.items.length,
    });
  } catch (error: any) {
    console.error('Error updating adjustment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete adjustment
router.delete('/adjustments/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const adjustment = await prisma.adjustment.findUnique({ where: { id } });
    if (!adjustment) {
      return res.status(404).json({ error: 'Adjustment not found' });
    }

    // Delete associated stock movements
    await prisma.stockMovement.deleteMany({
      where: {
        referenceType: 'adjustment',
        referenceId: id,
      },
    });

    // Delete adjustment (items will be deleted via cascade)
    await prisma.adjustment.delete({ where: { id } });

    res.json({ message: 'Adjustment deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting adjustment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get purchase orders
router.get('/purchase-orders', async (req: Request, res: Response) => {
  try {
    const { status, from_date, to_date, page = '1', limit = '50' } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (status) {
      where.status = status as string;
    }
    if (from_date || to_date) {
      where.date = {};
      if (from_date) {
        where.date.gte = new Date(from_date as string);
      }
      if (to_date) {
        where.date.lte = new Date(to_date as string);
      }
    }

    const [orders, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        include: {
          items: {
            include: {
              part: {
                include: {
                  brand: true,
                  category: true,
                },
              },
            },
          },
        },
        orderBy: {
          date: 'desc',
        },
        skip,
        take: limitNum,
      }),
      prisma.purchaseOrder.count({ where }),
    ]);

    res.json({
      data: orders.map(po => ({
        id: po.id,
        po_number: po.poNumber,
        date: po.date,
        supplier_id: po.supplierId,
        status: po.status,
        expected_date: po.expectedDate,
        notes: po.notes,
        total_amount: po.totalAmount,
        items_count: po.items.length,
        items: po.items.map(item => ({
          id: item.id,
          part_id: item.partId,
          part_no: item.part.partNo,
          part_description: item.part.description,
          brand: item.part.brand?.name || '',
          quantity: item.quantity,
          unit_cost: item.unitCost,
          total_cost: item.totalCost,
          received_qty: item.receivedQty,
          notes: item.notes,
        })),
        created_at: po.createdAt,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error('Error fetching purchase orders:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create purchase order
router.post('/purchase-orders', async (req: Request, res: Response) => {
  try {
    const { po_number, date, supplier_id, expected_date, notes, items } = req.body;

    if (!po_number || !date || !items || items.length === 0) {
      return res.status(400).json({ error: 'po_number, date, and items are required' });
    }

    const totalAmount = items.reduce((sum: number, item: any) => {
      return sum + (item.total_cost || (item.unit_cost * item.quantity));
    }, 0);

    const order = await prisma.purchaseOrder.create({
      data: {
        poNumber: po_number,
        date: new Date(date),
        supplierId: supplier_id || null,
        expectedDate: expected_date ? new Date(expected_date) : null,
        notes: notes || null,
        totalAmount: totalAmount,
        status: 'Draft',
        items: {
          create: items.map((item: any) => ({
            partId: item.part_id,
            quantity: item.quantity,
            unitCost: item.unit_cost,
            totalCost: item.total_cost || (item.unit_cost * item.quantity),
            receivedQty: item.received_qty || 0,
            notes: item.notes || null,
          })),
        },
      },
      include: {
        items: {
          include: {
            part: true,
          },
        },
      },
    });

    res.status(201).json({
      id: order.id,
      po_number: order.poNumber,
      date: order.date,
      status: order.status,
      total_amount: order.totalAmount,
      items_count: order.items.length,
    });
  } catch (error: any) {
    console.error('Error creating purchase order:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single purchase order
router.get('/purchase-orders/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const order = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            part: {
              include: {
                brand: true,
                category: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    res.json({
      id: order.id,
      po_number: order.poNumber,
      date: order.date,
      supplier_id: order.supplierId,
      status: order.status,
      expected_date: order.expectedDate,
      notes: order.notes,
      total_amount: order.totalAmount,
      items: order.items.map(item => ({
        id: item.id,
        part_id: item.partId,
        part_no: item.part.partNo,
        part_description: item.part.description,
        brand: item.part.brand?.name || '',
        quantity: item.quantity,
        unit_cost: item.unitCost,
        total_cost: item.totalCost,
        received_qty: item.receivedQty,
        notes: item.notes,
      })),
      created_at: order.createdAt,
    });
  } catch (error: any) {
    console.error('Error fetching purchase order:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update purchase order
router.put('/purchase-orders/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { po_number, date, supplier_id, expected_date, notes, status, items } = req.body;

    const existingOrder = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!existingOrder) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    const totalAmount = items ? items.reduce((sum: number, item: any) => {
      return sum + (item.total_cost || (item.unit_cost * item.quantity));
    }, 0) : existingOrder.totalAmount;

    const order = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        ...(po_number && { poNumber: po_number }),
        ...(date && { date: new Date(date) }),
        ...(supplier_id !== undefined && { supplierId: supplier_id || null }),
        ...(expected_date && { expectedDate: new Date(expected_date) }),
        ...(notes !== undefined && { notes: notes || null }),
        ...(status && { status }),
        ...(totalAmount !== undefined && { totalAmount }),
        ...(items && {
          items: {
            deleteMany: {},
            create: items.map((item: any) => ({
              partId: item.part_id,
              quantity: item.quantity,
              unitCost: item.unit_cost,
              totalCost: item.total_cost || (item.unit_cost * item.quantity),
              receivedQty: item.received_qty || 0,
              notes: item.notes || null,
            })),
          },
        }),
      },
      include: {
        items: {
          include: {
            part: true,
          },
        },
      },
    });

    res.json({
      id: order.id,
      po_number: order.poNumber,
      date: order.date,
      status: order.status,
      total_amount: order.totalAmount,
      items_count: order.items.length,
    });
  } catch (error: any) {
    console.error('Error updating purchase order:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete purchase order
router.delete('/purchase-orders/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const order = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!order) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    await prisma.purchaseOrder.delete({ where: { id } });

    res.json({ message: 'Purchase order deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting purchase order:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get stores
router.get('/stores', async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const where: any = {};
    if (status && status !== 'all') {
      where.status = status;
    }

    const stores = await prisma.store.findMany({
      where,
      include: {
        racks: {
          include: {
            shelves: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json(stores.map(s => ({
      id: s.id,
      name: s.name,
      type: s.code, // Using code as type for now
      status: s.status,
      description: s.address || s.manager || '',
      code: s.code,
      address: s.address,
      phone: s.phone,
      manager: s.manager,
      racks: s.racks,
    })));
  } catch (error: any) {
    console.error('Error fetching stores:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create store
router.post('/stores', async (req: Request, res: Response) => {
  try {
    const { name, type, status, description } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: 'Name and type are required' });
    }

    // Generate code from name
    const code = name.toUpperCase().replace(/\s+/g, '-').substring(0, 20);

    const store = await prisma.store.create({
      data: {
        code,
        name,
        address: description || null,
        status: status || 'active',
      },
    });

    res.json({
      id: store.id,
      name: store.name,
      type: store.code,
      status: store.status,
      description: store.address || '',
      code: store.code,
    });
  } catch (error: any) {
    console.error('Error creating store:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update store
router.put('/stores/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, type, status, description } = req.body;

    const store = await prisma.store.update({
      where: { id },
      data: {
        name,
        code: type || undefined,
        address: description || null,
        status: status || 'active',
      },
    });

    res.json({
      id: store.id,
      name: store.name,
      type: store.code,
      status: store.status,
      description: store.address || '',
    });
  } catch (error: any) {
    console.error('Error updating store:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete store
router.delete('/stores/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Delete associated racks and shelves (cascade)
    await prisma.store.delete({
      where: { id },
    });

    res.json({ message: 'Store deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting store:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get racks
router.get('/racks', async (req: Request, res: Response) => {
  try {
    const { store_id, status } = req.query;

    const where: any = {};
    if (store_id) {
      where.storeId = store_id as string;
    }
    if (status && status !== 'all') {
      where.status = status;
    }

    const racks = await prisma.rack.findMany({
      where,
      include: {
        store: true,
        shelves: true,
      },
      orderBy: { codeNo: 'asc' },
    });

    res.json(racks.map(r => ({
      id: r.id,
      codeNo: r.codeNo,
      code_no: r.codeNo,
      storeId: r.storeId,
      store_id: r.storeId,
      store_name: r.store?.name || null,
      description: r.description,
      status: r.status,
      shelves: r.shelves.map(s => ({
        id: s.id,
        shelfNo: s.shelfNo,
        rackId: s.rackId,
        description: s.description,
        status: s.status,
      })),
      shelves_count: r.shelves.length,
    })));
  } catch (error: any) {
    console.error('Error fetching racks:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create rack
router.post('/racks', async (req: Request, res: Response) => {
  try {
    const { codeNo, storeId, description, status } = req.body;

    if (!codeNo || !storeId) {
      return res.status(400).json({ error: 'Code and store ID are required' });
    }

    const rack = await prisma.rack.create({
      data: {
        codeNo,
        storeId,
        description: description || null,
        status: status || 'Active',
      },
      include: {
        shelves: true,
      },
    });

    res.json({
      id: rack.id,
      codeNo: rack.codeNo,
      storeId: rack.storeId,
      description: rack.description,
      status: rack.status,
      shelves: rack.shelves,
    });
  } catch (error: any) {
    console.error('Error creating rack:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update rack
router.put('/racks/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { codeNo, description, status } = req.body;

    const rack = await prisma.rack.update({
      where: { id },
      data: {
        codeNo,
        description: description || null,
        status: status || 'Active',
      },
      include: {
        shelves: true,
      },
    });

    res.json({
      id: rack.id,
      codeNo: rack.codeNo,
      storeId: rack.storeId,
      description: rack.description,
      status: rack.status,
      shelves: rack.shelves,
    });
  } catch (error: any) {
    console.error('Error updating rack:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete rack
router.delete('/racks/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.rack.delete({
      where: { id },
    });

    res.json({ message: 'Rack deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting rack:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get shelves
router.get('/shelves', async (req: Request, res: Response) => {
  try {
    const { rack_id, status } = req.query;

    const where: any = {};
    if (rack_id) {
      where.rackId = rack_id as string;
    }
    if (status && status !== 'all') {
      where.status = status;
    }

    const shelves = await prisma.shelf.findMany({
      where,
      include: {
        rack: {
          include: {
            store: true,
          },
        },
      },
      orderBy: { shelfNo: 'asc' },
    });

    res.json(shelves.map(s => ({
      id: s.id,
      shelfNo: s.shelfNo,
      shelf_no: s.shelfNo,
      rackId: s.rackId,
      rack_id: s.rackId,
      rack_code: s.rack.codeNo,
      store_id: s.rack.storeId,
      store_name: s.rack.store?.name || null,
      description: s.description,
      status: s.status,
    })));
  } catch (error: any) {
    console.error('Error fetching shelves:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create shelf
router.post('/shelves', async (req: Request, res: Response) => {
  try {
    const { shelfNo, rackId, description, status } = req.body;

    if (!shelfNo || !rackId) {
      return res.status(400).json({ error: 'Shelf number and rack ID are required' });
    }

    const shelf = await prisma.shelf.create({
      data: {
        shelfNo,
        rackId,
        description: description || null,
        status: status || 'Active',
      },
    });

    res.json({
      id: shelf.id,
      shelfNo: shelf.shelfNo,
      rackId: shelf.rackId,
      description: shelf.description,
      status: shelf.status,
    });
  } catch (error: any) {
    console.error('Error creating shelf:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update shelf
router.put('/shelves/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { shelfNo, description, status } = req.body;

    const shelf = await prisma.shelf.update({
      where: { id },
      data: {
        shelfNo,
        description: description || null,
        status: status || 'Active',
      },
    });

    res.json({
      id: shelf.id,
      shelfNo: shelf.shelfNo,
      rackId: shelf.rackId,
      description: shelf.description,
      status: shelf.status,
    });
  } catch (error: any) {
    console.error('Error updating shelf:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete shelf
router.delete('/shelves/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.shelf.delete({
      where: { id },
    });

    res.json({ message: 'Shelf deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting shelf:', error);
    res.status(500).json({ error: error.message });
  }
});

// Multi-dimensional stock report
router.get('/multi-dimensional-report', async (req: Request, res: Response) => {
  try {
    const {
      primary_dimension,
      secondary_dimension,
      tertiary_dimension,
      category_filter,
      brand_filter,
      sort_by,
      sort_direction = 'desc',
    } = req.query;

    if (!primary_dimension) {
      return res.status(400).json({ error: 'primary_dimension is required' });
    }

    // Build where clause for parts
    const where: any = { status: 'active' };

    // Apply category filter
    if (category_filter && category_filter !== 'All Categories') {
      const categoryRecord = await prisma.category.findFirst({
        where: { name: category_filter as string },
      });
      if (categoryRecord) {
        where.categoryId = categoryRecord.id;
      }
    }

    // Apply brand filter
    if (brand_filter && brand_filter !== 'All Brands') {
      const brandRecord = await prisma.brand.findFirst({
        where: { name: brand_filter as string },
      });
      if (brandRecord) {
        where.brandId = brandRecord.id;
      }
    }

    // Get all parts with related data
    const parts = await prisma.part.findMany({
      where,
      include: {
        brand: true,
        category: true,
        stockMovements: {
          include: {
            store: true,
          },
        },
      },
    });

    // Calculate stock for each part
    const partStockMap: Record<string, {
      quantity: number;
      cost: number;
      value: number;
      category: string;
      brand: string;
      store: string;
      location: string;
      uom: string;
    }> = {};

    for (const part of parts) {
      const stockIn = part.stockMovements
        .filter(m => m.type === 'in')
        .reduce((sum, m) => sum + m.quantity, 0);
      const stockOut = part.stockMovements
        .filter(m => m.type === 'out')
        .reduce((sum, m) => sum + m.quantity, 0);
      const quantity = stockIn - stockOut;

      if (quantity > 0) {
        const cost = part.cost || 0;
        const value = cost * quantity;
        const category = part.category?.name || 'Uncategorized';
        const brand = part.brand?.name || 'No Brand';
        
        // Group by store if needed
        const movementsByStore: Record<string, { in: number; out: number }> = {};
        for (const movement of part.stockMovements) {
          const storeKey = movement.store?.name || 'No Store';
          if (!movementsByStore[storeKey]) {
            movementsByStore[storeKey] = { in: 0, out: 0 };
          }
          if (movement.type === 'in') {
            movementsByStore[storeKey].in += movement.quantity;
          } else {
            movementsByStore[storeKey].out += movement.quantity;
          }
        }

        // If grouping by store, create separate entries
        if (primary_dimension === 'Store' || secondary_dimension === 'Store' || tertiary_dimension === 'Store') {
          for (const [storeName, storeStock] of Object.entries(movementsByStore)) {
            const storeQty = storeStock.in - storeStock.out;
            if (storeQty > 0) {
              const key = `${part.id}_${storeName}`;
              partStockMap[key] = {
                quantity: storeQty,
                cost,
                value: cost * storeQty,
                category,
                brand,
                store: storeName,
                location: '-',
                uom: part.uom || 'pcs',
              };
            }
          }
        } else {
          // Single entry per part
          partStockMap[part.id] = {
            quantity,
            cost,
            value,
            category,
            brand,
            store: 'All Stores',
            location: '-',
            uom: part.uom || 'pcs',
          };
        }
      }
    }

    // Group by dimensions
    const dimensionGroups: Record<string, {
      items: Set<string>;
      quantity: number;
      value: number;
      costs: number[];
    }> = {};

    for (const [partKey, stockData] of Object.entries(partStockMap)) {
      const dimensionKeys: string[] = [];

      // Primary dimension
      if (primary_dimension === 'Category') {
        dimensionKeys.push(stockData.category);
      } else if (primary_dimension === 'Brand') {
        dimensionKeys.push(stockData.brand);
      } else if (primary_dimension === 'Store') {
        dimensionKeys.push(stockData.store);
      } else if (primary_dimension === 'Location') {
        dimensionKeys.push(stockData.location);
      } else if (primary_dimension === 'UOM') {
        dimensionKeys.push(stockData.uom);
      }

      // Secondary dimension
      if (secondary_dimension && secondary_dimension !== 'none') {
        if (secondary_dimension === 'Category') {
          dimensionKeys.push(stockData.category);
        } else if (secondary_dimension === 'Brand') {
          dimensionKeys.push(stockData.brand);
        } else if (secondary_dimension === 'Store') {
          dimensionKeys.push(stockData.store);
        } else if (secondary_dimension === 'Location') {
          dimensionKeys.push(stockData.location);
        } else if (secondary_dimension === 'UOM') {
          dimensionKeys.push(stockData.uom);
        }
      }

      // Tertiary dimension
      if (tertiary_dimension && tertiary_dimension !== 'none') {
        if (tertiary_dimension === 'Category') {
          dimensionKeys.push(stockData.category);
        } else if (tertiary_dimension === 'Brand') {
          dimensionKeys.push(stockData.brand);
        } else if (tertiary_dimension === 'Store') {
          dimensionKeys.push(stockData.store);
        } else if (tertiary_dimension === 'Location') {
          dimensionKeys.push(stockData.location);
        } else if (tertiary_dimension === 'UOM') {
          dimensionKeys.push(stockData.uom);
        }
      }

      const groupKey = dimensionKeys.join('|');
      if (!dimensionGroups[groupKey]) {
        dimensionGroups[groupKey] = {
          items: new Set(),
          quantity: 0,
          value: 0,
          costs: [],
        };
      }

      dimensionGroups[groupKey].items.add(partKey);
      dimensionGroups[groupKey].quantity += stockData.quantity;
      dimensionGroups[groupKey].value += stockData.value;
      dimensionGroups[groupKey].costs.push(stockData.cost);
    }

    // Convert to report rows
    const reportRows = Object.entries(dimensionGroups).map(([key, group]) => {
      const dimensionParts = key.split('|');
      const dimension = dimensionParts.join(' - ') || 'All';
      const items = group.items.size;
      const avgCost = group.costs.length > 0
        ? group.costs.reduce((sum, cost) => sum + cost, 0) / group.costs.length
        : 0;

      return {
        id: key,
        dimension,
        items,
        quantity: group.quantity,
        value: group.value,
        avgCost,
      };
    });

    // Calculate total for percentage calculation
    const totalValue = reportRows.reduce((sum, row) => sum + row.value, 0);
    const totalQuantity = reportRows.reduce((sum, row) => sum + row.quantity, 0);
    const totalItems = reportRows.reduce((sum, row) => sum + row.items, 0);

    // Add percentage of total
    const reportRowsWithPercent = reportRows.map(row => ({
      ...row,
      percentOfTotal: totalValue > 0 ? (row.value / totalValue) * 100 : 0,
    }));

    // Sort
    let sortedRows = [...reportRowsWithPercent];
    if (sort_by) {
      sortedRows.sort((a, b) => {
        let comparison = 0;
        switch (sort_by) {
          case 'Value':
            comparison = a.value - b.value;
            break;
          case 'Quantity':
            comparison = a.quantity - b.quantity;
            break;
          case 'Items':
            comparison = a.items - b.items;
            break;
          case 'Avg Cost':
            comparison = a.avgCost - b.avgCost;
            break;
          case 'Name':
            comparison = a.dimension.localeCompare(b.dimension);
            break;
          default:
            comparison = a.value - b.value;
        }
        return sort_direction === 'desc' ? -comparison : comparison;
      });
    }

    res.json({
      data: sortedRows,
      totals: {
        items: totalItems,
        quantity: totalQuantity,
        value: totalValue,
      },
    });
  } catch (error: any) {
    console.error('Error fetching multi-dimensional report:', error);
    res.status(500).json({ error: error.message });
  }
});

// Stock Verification Routes

// Get all verification sessions
router.get('/verifications', async (req: Request, res: Response) => {
  try {
    const { status, page = '1', limit = '50' } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (status && status !== 'all') {
      where.status = status as string;
    }

    const [verifications, total] = await Promise.all([
      prisma.stockVerification.findMany({
        where,
        include: {
          items: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limitNum,
      }),
      prisma.stockVerification.count({ where }),
    ]);

    res.json({
      data: verifications.map(v => ({
        id: v.id,
        name: v.name,
        notes: v.notes,
        status: v.status,
        startDate: v.startDate,
        completedDate: v.completedDate,
        totalItems: v.items.length,
        verifiedItems: v.items.filter(i => i.status === 'Verified').length,
        discrepancies: v.items.filter(i => i.status === 'Discrepancy').length,
        createdAt: v.createdAt,
        updatedAt: v.updatedAt,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error('Error fetching verifications:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get active verification session
router.get('/verifications/active', async (req: Request, res: Response) => {
  try {
    const verification = await prisma.stockVerification.findFirst({
      where: { status: 'Active' },
      include: {
        items: {
          include: {
            part: {
              include: {
                brand: true,
                category: true,
              },
            },
            store: true,
            rack: true,
            shelf: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!verification) {
      return res.json(null);
    }

    res.json({
      id: verification.id,
      name: verification.name,
      notes: verification.notes,
      status: verification.status,
      startDate: verification.startDate,
      completedDate: verification.completedDate,
      items: verification.items.map(item => {
        const locationParts = [];
        if (item.store?.name) locationParts.push(item.store.name);
        if (item.rack?.codeNo) locationParts.push(item.rack.codeNo);
        if (item.shelf?.shelfNo) locationParts.push(item.shelf.shelfNo);
        const location = locationParts.length > 0 ? locationParts.join(' / ') : 'No Location';
        
        return {
          id: item.id,
          partNo: item.part.partNo,
          description: item.part.description || '',
          location: location,
          systemQty: item.systemQty,
          physicalQty: item.physicalQty,
          variance: item.variance,
          status: item.status,
          remarks: item.remarks || '',
        };
      }),
      totalItems: verification.items.length,
      verifiedItems: verification.items.filter(i => i.status === 'Verified').length,
      discrepancies: verification.items.filter(i => i.status === 'Discrepancy').length,
    });
  } catch (error: any) {
    console.error('Error fetching active verification:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new verification session
router.post('/verifications', async (req: Request, res: Response) => {
  try {
    const { name, notes, store_id, rack_id, shelf_id } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    // Get all active parts
    const parts = await prisma.part.findMany({
      where: { status: 'active' },
    });

    // Get stock movements for all parts, filtered by location if provided
    const partIds = parts.map(p => p.id);
    const whereMovement: any = {
      partId: { in: partIds },
    };
    
    if (store_id) {
      whereMovement.storeId = store_id;
    }
    if (rack_id) {
      whereMovement.rackId = rack_id;
    }
    if (shelf_id) {
      whereMovement.shelfId = shelf_id;
    }

    const movements = await prisma.stockMovement.findMany({
      where: whereMovement,
    });

    // Group movements by part
    const stockByPart: Record<string, { in: number; out: number }> = {};
    for (const movement of movements) {
      if (!stockByPart[movement.partId]) {
        stockByPart[movement.partId] = { in: 0, out: 0 };
      }
      if (movement.type === 'in') {
        stockByPart[movement.partId].in += movement.quantity;
      } else {
        stockByPart[movement.partId].out += movement.quantity;
      }
    }

    // Calculate system quantities for each part and create verification items
    const verificationItems = [];
    for (const part of parts) {
      const stock = stockByPart[part.id] || { in: 0, out: 0 };
      const systemQty = stock.in - stock.out;

      // Include all parts if no location filter, or only those with stock at the location if filtered
      if (systemQty > 0 || (!store_id && !rack_id && !shelf_id)) {
        verificationItems.push({
          partId: part.id,
          storeId: store_id || null,
          rackId: rack_id || null,
          shelfId: shelf_id || null,
          systemQty: systemQty,
          physicalQty: null,
          variance: null,
          status: 'Pending',
          remarks: null,
        });
      }
    }

    const verification = await prisma.stockVerification.create({
      data: {
        name,
        notes: notes || null,
        status: 'Active',
        items: {
          create: verificationItems,
        },
      },
      include: {
        items: true,
      },
    });

    res.status(201).json({
      id: verification.id,
      name: verification.name,
      status: verification.status,
      startDate: verification.startDate,
      totalItems: verification.items.length,
    });
  } catch (error: any) {
    console.error('Error creating verification:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single verification session
router.get('/verifications/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const verification = await prisma.stockVerification.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            part: {
              include: {
                brand: true,
                category: true,
              },
            },
            store: true,
            rack: true,
            shelf: true,
          },
        },
      },
    });

    if (!verification) {
      return res.status(404).json({ error: 'Verification not found' });
    }

    res.json({
      id: verification.id,
      name: verification.name,
      notes: verification.notes,
      status: verification.status,
      startDate: verification.startDate,
      completedDate: verification.completedDate,
      items: verification.items.map(item => {
        const locationParts = [];
        if (item.store?.name) locationParts.push(item.store.name);
        if (item.rack?.codeNo) locationParts.push(item.rack.codeNo);
        if (item.shelf?.shelfNo) locationParts.push(item.shelf.shelfNo);
        const location = locationParts.length > 0 ? locationParts.join(' / ') : 'No Location';
        
        return {
          id: item.id,
          partNo: item.part.partNo,
          description: item.part.description || '',
          location: location,
          systemQty: item.systemQty,
          physicalQty: item.physicalQty,
          variance: item.variance,
          status: item.status,
          remarks: item.remarks || '',
        };
      }),
      totalItems: verification.items.length,
      verifiedItems: verification.items.filter(i => i.status === 'Verified').length,
      discrepancies: verification.items.filter(i => i.status === 'Discrepancy').length,
    });
  } catch (error: any) {
    console.error('Error fetching verification:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update verification item
router.put('/verifications/:id/items/:itemId', async (req: Request, res: Response) => {
  try {
    const { id, itemId } = req.params;
    const { physicalQty, remarks } = req.body;

    // Get the item to calculate variance
    const item = await prisma.stockVerificationItem.findUnique({
      where: { id: itemId },
    });

    if (!item || item.verificationId !== id) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const physicalQtyNum = physicalQty !== null && physicalQty !== undefined ? parseInt(physicalQty) : null;
    const variance = physicalQtyNum !== null ? physicalQtyNum - item.systemQty : null;
    const status = physicalQtyNum === null 
      ? 'Pending' 
      : variance === 0 
        ? 'Verified' 
        : 'Discrepancy';

    const updatedItem = await prisma.stockVerificationItem.update({
      where: { id: itemId },
      data: {
        physicalQty: physicalQtyNum,
        variance,
        status,
        remarks: remarks || null,
      },
    });

    res.json({
      id: updatedItem.id,
      physicalQty: updatedItem.physicalQty,
      variance: updatedItem.variance,
      status: updatedItem.status,
      remarks: updatedItem.remarks,
    });
  } catch (error: any) {
    console.error('Error updating verification item:', error);
    res.status(500).json({ error: error.message });
  }
});

// Complete verification session
router.put('/verifications/:id/complete', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const verification = await prisma.stockVerification.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });

    if (!verification) {
      return res.status(404).json({ error: 'Verification not found' });
    }

    if (verification.status !== 'Active') {
      return res.status(400).json({ error: 'Verification is not active' });
    }

    const updatedVerification = await prisma.stockVerification.update({
      where: { id },
      data: {
        status: 'Completed',
        completedDate: new Date(),
      },
      include: {
        items: true,
      },
    });

    res.json({
      id: updatedVerification.id,
      status: updatedVerification.status,
      completedDate: updatedVerification.completedDate,
      totalItems: updatedVerification.items.length,
      verifiedItems: updatedVerification.items.filter(i => i.status === 'Verified').length,
      discrepancies: updatedVerification.items.filter(i => i.status === 'Discrepancy').length,
    });
  } catch (error: any) {
    console.error('Error completing verification:', error);
    res.status(500).json({ error: error.message });
  }
});

// Cancel verification session
router.put('/verifications/:id/cancel', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const verification = await prisma.stockVerification.findUnique({
      where: { id },
    });

    if (!verification) {
      return res.status(404).json({ error: 'Verification not found' });
    }

    if (verification.status !== 'Active') {
      return res.status(400).json({ error: 'Only active verifications can be cancelled' });
    }

    const updatedVerification = await prisma.stockVerification.update({
      where: { id },
      data: {
        status: 'Cancelled',
      },
    });

    res.json({
      id: updatedVerification.id,
      status: updatedVerification.status,
    });
  } catch (error: any) {
    console.error('Error cancelling verification:', error);
    res.status(500).json({ error: error.message });
  }
});

// Direct Purchase Orders Routes

// Get all direct purchase orders
router.get('/direct-purchase-orders', async (req: Request, res: Response) => {
  try {
    const { status, from_date, to_date, page = '1', limit = '50' } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (status && status !== 'all') {
      where.status = status as string;
    }
    if (from_date || to_date) {
      where.date = {};
      if (from_date) {
        where.date.gte = new Date(from_date as string);
      }
      if (to_date) {
        where.date.lte = new Date(to_date as string);
      }
    }

    const [orders, total] = await Promise.all([
      prisma.directPurchaseOrder.findMany({
        where,
        include: {
          store: true,
          items: {
            include: {
              part: {
                include: {
                  brand: true,
                  category: true,
                },
              },
              rack: true,
              shelf: true,
            },
          },
          expenses: true,
        },
        orderBy: {
          date: 'desc',
        },
        skip,
        take: limitNum,
      }),
      prisma.directPurchaseOrder.count({ where }),
    ]);

    res.json({
      data: orders.map(dpo => ({
        id: dpo.id,
        dpo_no: dpo.dpoNumber,
        date: dpo.date,
        store_id: dpo.storeId,
        store_name: dpo.store?.name || null,
        supplier_id: dpo.supplierId,
        account: dpo.account,
        description: dpo.description,
        status: dpo.status,
        total_amount: dpo.totalAmount,
        items_count: dpo.items.length,
        expenses_count: dpo.expenses.length,
        created_at: dpo.createdAt,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error('Error fetching direct purchase orders:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single direct purchase order
router.get('/direct-purchase-orders/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const order = await prisma.directPurchaseOrder.findUnique({
      where: { id },
      include: {
        store: true,
        items: {
          include: {
            part: {
              include: {
                brand: true,
                category: true,
              },
            },
            rack: true,
            shelf: true,
          },
        },
        expenses: true,
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Direct purchase order not found' });
    }

    res.json({
      id: order.id,
      dpo_no: order.dpoNumber,
      date: order.date,
      store_id: order.storeId,
      store_name: order.store?.name || null,
      supplier_id: order.supplierId,
      account: order.account,
      description: order.description,
      status: order.status,
      total_amount: order.totalAmount,
      items: order.items.map(item => ({
        id: item.id,
        part_id: item.partId,
        part_no: item.part.partNo,
        part_description: item.part.description,
        brand: item.part.brand?.name || '',
        category: item.part.category?.name || '',
        uom: item.part.uom || 'pcs',
        quantity: item.quantity,
        purchase_price: item.purchasePrice,
        sale_price: item.salePrice,
        amount: item.amount,
        rack_id: item.rackId,
        rack_name: item.rack?.codeNo || null,
        shelf_id: item.shelfId,
        shelf_name: item.shelf?.shelfNo || null,
      })),
      expenses: order.expenses.map(expense => ({
        id: expense.id,
        expense_type: expense.expenseType,
        payable_account: expense.payableAccount,
        description: expense.description,
        amount: expense.amount,
      })),
      created_at: order.createdAt,
    });
  } catch (error: any) {
    console.error('Error fetching direct purchase order:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create direct purchase order
router.post('/direct-purchase-orders', async (req: Request, res: Response) => {
  try {
    const { dpo_number, date, store_id, supplier_id, account, description, status, items, expenses } = req.body;

    if (!dpo_number || !date || !items || items.length === 0) {
      return res.status(400).json({ error: 'dpo_number, date, and items are required' });
    }

    // Calculate total amount from items
    const itemsTotal = items.reduce((sum: number, item: any) => {
      return sum + (item.amount || (item.purchase_price * item.quantity));
    }, 0);

    // Calculate total expenses
    const expensesTotal = expenses ? expenses.reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0) : 0;

    const totalAmount = itemsTotal + expensesTotal;

    const order = await prisma.directPurchaseOrder.create({
      data: {
        dpoNumber: dpo_number,
        date: new Date(date),
        storeId: store_id || null,
        supplierId: supplier_id || null,
        account: account || null,
        description: description || null,
        status: status || 'Completed',
        totalAmount: totalAmount,
        items: {
          create: items.map((item: any) => ({
            partId: item.part_id,
            quantity: item.quantity,
            purchasePrice: item.purchase_price,
            salePrice: item.sale_price,
            amount: item.amount || (item.purchase_price * item.quantity),
            rackId: item.rack_id || null,
            shelfId: item.shelf_id || null,
          })),
        },
        expenses: expenses && expenses.length > 0 ? {
          create: expenses.map((exp: any) => ({
            expenseType: exp.expense_type,
            payableAccount: exp.payable_account,
            description: exp.description || null,
            amount: exp.amount,
          })),
        } : undefined,
      },
      include: {
        items: {
          include: {
            part: true,
          },
        },
        expenses: true,
      },
    });

    // Create stock movements for each item
    for (const item of items) {
      await prisma.stockMovement.create({
        data: {
          partId: item.part_id,
          type: 'in',
          quantity: item.quantity,
          storeId: store_id || null,
          rackId: item.rack_id || null,
          shelfId: item.shelf_id || null,
          referenceType: 'direct_purchase',
          referenceId: order.id,
          notes: `Direct Purchase Order: ${dpo_number}`,
        },
      });
    }

    res.status(201).json({
      id: order.id,
      dpo_no: order.dpoNumber,
      date: order.date,
      status: order.status,
      total_amount: order.totalAmount,
      items_count: order.items.length,
    });
  } catch (error: any) {
    console.error('Error creating direct purchase order:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update direct purchase order
router.put('/direct-purchase-orders/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { dpo_number, date, store_id, supplier_id, account, description, status, items, expenses } = req.body;

    const existingOrder = await prisma.directPurchaseOrder.findUnique({ where: { id } });
    if (!existingOrder) {
      return res.status(404).json({ error: 'Direct purchase order not found' });
    }

    // Delete existing stock movements
    await prisma.stockMovement.deleteMany({
      where: {
        referenceType: 'direct_purchase',
        referenceId: id,
      },
    });

    // Calculate totals
    const itemsTotal = items ? items.reduce((sum: number, item: any) => {
      return sum + (item.amount || (item.purchase_price * item.quantity));
    }, 0) : existingOrder.totalAmount;

    const expensesTotal = expenses ? expenses.reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0) : 0;
    const totalAmount = itemsTotal + expensesTotal;

    const order = await prisma.directPurchaseOrder.update({
      where: { id },
      data: {
        ...(dpo_number && { dpoNumber: dpo_number }),
        ...(date && { date: new Date(date) }),
        ...(store_id !== undefined && { storeId: store_id || null }),
        ...(supplier_id !== undefined && { supplierId: supplier_id || null }),
        ...(account !== undefined && { account: account || null }),
        ...(description !== undefined && { description: description || null }),
        ...(status && { status }),
        ...(totalAmount !== undefined && { totalAmount }),
        ...(items && {
          items: {
            deleteMany: {},
            create: items.map((item: any) => ({
              partId: item.part_id,
              quantity: item.quantity,
              purchasePrice: item.purchase_price,
              salePrice: item.sale_price,
              amount: item.amount || (item.purchase_price * item.quantity),
              rackId: item.rack_id || null,
              shelfId: item.shelf_id || null,
            })),
          },
        }),
        ...(expenses && {
          expenses: {
            deleteMany: {},
            create: expenses.map((exp: any) => ({
              expenseType: exp.expense_type,
              payableAccount: exp.payable_account,
              description: exp.description || null,
              amount: exp.amount,
            })),
          },
        }),
      },
      include: {
        items: true,
        expenses: true,
      },
    });

    // Create new stock movements
    if (items) {
      for (const item of items) {
        await prisma.stockMovement.create({
          data: {
            partId: item.part_id,
            type: 'in',
            quantity: item.quantity,
            storeId: store_id || null,
            rackId: item.rack_id || null,
            shelfId: item.shelf_id || null,
            referenceType: 'direct_purchase',
            referenceId: order.id,
            notes: `Direct Purchase Order: ${order.dpoNumber}`,
          },
        });
      }
    }

    res.json({
      id: order.id,
      dpo_no: order.dpoNumber,
      date: order.date,
      status: order.status,
      total_amount: order.totalAmount,
      items_count: order.items.length,
    });
  } catch (error: any) {
    console.error('Error updating direct purchase order:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete direct purchase order
router.delete('/direct-purchase-orders/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const order = await prisma.directPurchaseOrder.findUnique({ where: { id } });
    if (!order) {
      return res.status(404).json({ error: 'Direct purchase order not found' });
    }

    // Delete associated stock movements
    await prisma.stockMovement.deleteMany({
      where: {
        referenceType: 'direct_purchase',
        referenceId: id,
      },
    });

    // Delete order (items and expenses will be deleted via cascade)
    await prisma.directPurchaseOrder.delete({ where: { id } });

    res.json({ message: 'Direct purchase order deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting direct purchase order:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

