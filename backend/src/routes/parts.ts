import express, { Request, Response } from 'express';
import prisma from '../config/database';

const router = express.Router();

// Get all parts with filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      search,
      category_id,
      subcategory_id,
      brand_id,
      status,
      master_part_no,
      page = '1',
      limit = '50',
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = {};

    if (search) {
      const searchLower = (search as string).toLowerCase();
      where.OR = [
        { partNo: { contains: search as string } },
        { description: { contains: search as string } },
        { brand: { name: { contains: search as string } } },
      ];
    }

    if (category_id) {
      where.categoryId = category_id as string;
    }

    if (subcategory_id) {
      where.subcategoryId = subcategory_id as string;
    }

    if (brand_id) {
      where.brandId = brand_id as string;
    }

    if (status) {
      where.status = status as string;
    }

    if (master_part_no) {
      where.masterPart = {
        masterPartNo: master_part_no as string,
      };
    }

    // Get parts with relations
    const [parts, total] = await Promise.all([
      prisma.part.findMany({
        where,
        include: {
          masterPart: true,
          brand: true,
          category: true,
          subcategory: true,
          application: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limitNum,
      }),
      prisma.part.count({ where }),
    ]);

    // Transform data for response
    const transformedParts = parts.map((part) => ({
      id: part.id,
      master_part_no: part.masterPart?.masterPartNo || null,
      part_no: part.partNo,
      brand_name: part.brand?.name || null,
      category_name: part.category?.name || null,
      subcategory_name: part.subcategory?.name || null,
      application_name: part.application?.name || null,
      description: part.description,
      hs_code: part.hsCode,
      weight: part.weight,
      reorder_level: part.reorderLevel,
      uom: part.uom,
      cost: part.cost,
      price_a: part.priceA,
      price_b: part.priceB,
      price_m: part.priceM,
      smc: part.smc,
      size: part.size,
      image_p1: part.imageP1,
      image_p2: part.imageP2,
      status: part.status,
      created_at: part.createdAt,
      updated_at: part.updatedAt,
    }));

    res.json({
      data: transformedParts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error('Error fetching parts:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get parts for price management (with stock quantities) - MUST BE BEFORE /:id routes to avoid route conflicts
router.get('/price-management', async (req: Request, res: Response) => {
  try {
    const { search, category, page = '1', limit = '1000' } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = { status: 'active' };

    if (search) {
      const searchLower = (search as string).toLowerCase();
      where.OR = [
        { partNo: { contains: search as string } },
        { description: { contains: search as string } },
      ];
    }

    if (category && category !== 'all') {
      const categoryRecord = await prisma.category.findFirst({
        where: { name: { contains: category as string,  } },
      });
      if (categoryRecord) {
        where.categoryId = categoryRecord.id;
      }
    }

    // Get all parts
    const parts = await prisma.part.findMany({
      where,
      include: {
        category: true,
        brand: true,
      },
      orderBy: { partNo: 'asc' },
    });

    // Get stock movements to calculate quantities
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

    // Calculate stock by part
    const stockByPart: Record<string, number> = {};
    for (const movement of movements) {
      if (!stockByPart[movement.partId]) {
        stockByPart[movement.partId] = 0;
      }
      if (movement.type === 'in') {
        stockByPart[movement.partId] += movement.quantity;
      } else {
        stockByPart[movement.partId] -= movement.quantity;
      }
    }

    // Build result
    const result = parts.map(part => {
      const qty = Math.max(0, stockByPart[part.id] || 0);
      return {
        id: part.id,
        partNo: part.partNo,
        description: part.description || '',
        category: part.category?.name || 'Uncategorized',
        brand: part.brand?.name || 'Unknown',
        qty: qty,
        cost: part.cost || 0,
        priceA: part.priceA || 0,
        priceB: part.priceB || 0,
        priceM: part.priceM || 0,
      };
    });

    // Apply search filter (if not already applied in query)
    let filteredResult = result;
    if (search) {
      const searchLower = (search as string).toLowerCase();
      filteredResult = filteredResult.filter(item =>
        item.partNo.toLowerCase().includes(searchLower) ||
        item.description.toLowerCase().includes(searchLower)
      );
    }

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
    console.error('Error fetching parts for price management:', error);
    res.status(500).json({ error: error.message });
  }
});

// Bulk update prices - MUST BE BEFORE /:id routes
router.post('/bulk-update-prices', async (req: Request, res: Response) => {
  try {
    const {
      part_ids,
      price_field, // 'cost', 'priceA', 'priceB', 'all'
      update_type, // 'percentage', 'fixed'
      update_value,
      reason,
      updated_by,
    } = req.body;

    if (!part_ids || !Array.isArray(part_ids) || part_ids.length === 0) {
      return res.status(400).json({ error: 'part_ids array is required' });
    }

    if (!price_field || !update_type || update_value === undefined) {
      return res.status(400).json({ error: 'price_field, update_type, and update_value are required' });
    }

    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'reason is required' });
    }

    // Get all parts to update
    const parts = await prisma.part.findMany({
      where: {
        id: { in: part_ids },
      },
    });

    if (parts.length === 0) {
      return res.status(404).json({ error: 'No parts found' });
    }

    const updateValue = parseFloat(update_value);
    if (isNaN(updateValue)) {
      return res.status(400).json({ error: 'update_value must be a valid number' });
    }

    // Update parts and create history records
    const updatedParts = [];
    const historyRecords = [];

    for (const part of parts) {
      const updates: any = {};
      const historyData: any = {
        partId: part.id,
        partNo: part.partNo,
        description: part.description,
        priceField: price_field,
        updateType: update_type,
        updateValue: updateValue,
        itemsUpdated: part_ids.length,
        reason: reason,
        updatedBy: updated_by || 'System',
      };

      const applyUpdate = (currentPrice: number) => {
        if (update_type === 'percentage') {
          return Math.round((currentPrice * (1 + updateValue / 100)) * 100) / 100;
        } else {
          return Math.round((currentPrice + updateValue) * 100) / 100;
        }
      };

      if (price_field === 'cost' || price_field === 'all') {
        const oldCost = part.cost || 0;
        const newCost = applyUpdate(oldCost);
        updates.cost = newCost;
        if (price_field === 'cost') {
          historyData.oldValue = oldCost;
          historyData.newValue = newCost;
        }
      }

      if (price_field === 'priceA' || price_field === 'all') {
        const oldPriceA = part.priceA || 0;
        const newPriceA = applyUpdate(oldPriceA);
        updates.priceA = newPriceA;
        if (price_field === 'priceA') {
          historyData.oldValue = oldPriceA;
          historyData.newValue = newPriceA;
        }
      }

      if (price_field === 'priceB' || price_field === 'all') {
        const oldPriceB = part.priceB || 0;
        const newPriceB = applyUpdate(oldPriceB);
        updates.priceB = newPriceB;
        if (price_field === 'priceB') {
          historyData.oldValue = oldPriceB;
          historyData.newValue = newPriceB;
        }
      }

      // Update part
      const updatedPart = await prisma.part.update({
        where: { id: part.id },
        data: updates,
      });

      updatedParts.push(updatedPart);

      // Create history record
      await prisma.priceHistory.create({
        data: historyData,
      });
    }

    res.json({
      message: `Successfully updated ${updatedParts.length} parts`,
      updated_count: updatedParts.length,
    });
  } catch (error: any) {
    console.error('Error bulk updating prices:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get price update history - MUST BE BEFORE /:id routes
router.get('/price-history', async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '50' } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const [history, total] = await Promise.all([
      prisma.priceHistory.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          part: {
            select: {
              partNo: true,
              description: true,
            },
          },
        },
      }),
      prisma.priceHistory.count(),
    ]);

    const result = history.map(h => ({
      id: h.id,
      date: h.createdAt.toISOString(),
      itemsUpdated: h.itemsUpdated,
      priceField: h.priceField,
      updateType: h.updateType === 'percentage' ? 'Percentage (%)' : h.updateType === 'fixed' ? 'Fixed Amount' : h.updateType,
      value: h.updateValue || h.newValue || 0,
      reason: h.reason,
      updatedBy: h.updatedBy || 'System',
    }));

    res.json({
      data: result,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error('Error fetching price history:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single part by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const part = await prisma.part.findUnique({
      where: { id },
      include: {
        masterPart: true,
        brand: true,
        category: true,
        subcategory: true,
        application: true,
        models: true,
      },
    });

    if (!part) {
      return res.status(404).json({ error: 'Part not found' });
    }

    res.json({
      id: part.id,
      master_part_no: part.masterPart?.masterPartNo || null,
      part_no: part.partNo,
      brand_name: part.brand?.name || null,
      category_name: part.category?.name || null,
      subcategory_name: part.subcategory?.name || null,
      application_name: part.application?.name || null,
      description: part.description,
      hs_code: part.hsCode,
      weight: part.weight,
      reorder_level: part.reorderLevel,
      uom: part.uom,
      cost: part.cost,
      price_a: part.priceA,
      price_b: part.priceB,
      price_m: part.priceM,
      smc: part.smc,
      size: part.size,
      image_p1: part.imageP1,
      image_p2: part.imageP2,
      status: part.status,
      models: part.models.map((m) => ({
        id: m.id,
        name: m.name,
        qty_used: m.qtyUsed,
      })),
      created_at: part.createdAt,
      updated_at: part.updatedAt,
    });
  } catch (error: any) {
    console.error('Error fetching part:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new part
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      master_part_no,
      part_no,
      brand_name,
      description,
      category_id,
      subcategory_id,
      application_id,
      hs_code,
      weight,
      reorder_level,
      uom,
      cost,
      price_a,
      price_b,
      price_m,
      smc,
      size,
      image_p1,
      image_p2,
      status,
      models,
    } = req.body;

    // Handle master part
    let masterPartId = null;
    if (master_part_no) {
      const masterPart = await prisma.masterPart.upsert({
        where: { masterPartNo: master_part_no },
        update: {},
        create: { masterPartNo: master_part_no },
      });
      masterPartId = masterPart.id;
    }

    // Handle brand
    let brandId = null;
    if (brand_name) {
      const brand = await prisma.brand.upsert({
        where: { name: brand_name },
        update: {},
        create: { name: brand_name },
      });
      brandId = brand.id;
    }

    // Create part with models
    const part = await prisma.part.create({
      data: {
        masterPartId,
        partNo: part_no,
        brandId,
        description: description || null,
        categoryId: category_id || null,
        subcategoryId: subcategory_id || null,
        applicationId: application_id || null,
        hsCode: hs_code || null,
        weight: weight ? parseFloat(weight) : null,
        reorderLevel: reorder_level ? parseInt(reorder_level) : 0,
        uom: uom || 'pcs',
        cost: cost ? parseFloat(cost) : null,
        priceA: price_a ? parseFloat(price_a) : null,
        priceB: price_b ? parseFloat(price_b) : null,
        priceM: price_m ? parseFloat(price_m) : null,
        smc: smc || null,
        size: size || null,
        imageP1: image_p1 || null,
        imageP2: image_p2 || null,
        status: status || 'active',
        models: models && Array.isArray(models)
          ? {
              create: models.map((m: any) => ({
                name: m.name,
                qtyUsed: m.qty_used || m.qtyUsed || 1,
              })),
            }
          : undefined,
      },
      include: {
        masterPart: true,
        brand: true,
        category: true,
        subcategory: true,
        application: true,
        models: true,
      },
    });

    res.status(201).json({
      id: part.id,
      master_part_no: part.masterPart?.masterPartNo || null,
      part_no: part.partNo,
      brand_name: part.brand?.name || null,
      category_name: part.category?.name || null,
      subcategory_name: part.subcategory?.name || null,
      application_name: part.application?.name || null,
      description: part.description,
      hs_code: part.hsCode,
      weight: part.weight,
      reorder_level: part.reorderLevel,
      uom: part.uom,
      cost: part.cost,
      price_a: part.priceA,
      price_b: part.priceB,
      price_m: part.priceM,
      smc: part.smc,
      size: part.size,
      image_p1: part.imageP1,
      image_p2: part.imageP2,
      status: part.status,
      models: part.models.map((m) => ({
        id: m.id,
        name: m.name,
        qty_used: m.qtyUsed,
      })),
      created_at: part.createdAt,
      updated_at: part.updatedAt,
    });
  } catch (error: any) {
    console.error('Error creating part:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update part
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      master_part_no,
      part_no,
      brand_name,
      description,
      category_id,
      subcategory_id,
      application_id,
      hs_code,
      weight,
      reorder_level,
      uom,
      cost,
      price_a,
      price_b,
      price_m,
      smc,
      size,
      image_p1,
      image_p2,
      status,
      models,
    } = req.body;

    // Handle master part
    let masterPartId = null;
    if (master_part_no) {
      const masterPart = await prisma.masterPart.upsert({
        where: { masterPartNo: master_part_no },
        update: {},
        create: { masterPartNo: master_part_no },
      });
      masterPartId = masterPart.id;
    }

    // Handle brand
    let brandId = null;
    if (brand_name) {
      const brand = await prisma.brand.upsert({
        where: { name: brand_name },
        update: {},
        create: { name: brand_name },
      });
      brandId = brand.id;
    }

    // Delete existing models and create new ones
    if (models && Array.isArray(models)) {
      await prisma.model.deleteMany({
        where: { partId: id },
      });
    }

    // Update part
    const part = await prisma.part.update({
      where: { id },
      data: {
        masterPartId,
        partNo: part_no,
        brandId,
        description: description || null,
        categoryId: category_id || null,
        subcategoryId: subcategory_id || null,
        applicationId: application_id || null,
        hsCode: hs_code || null,
        weight: weight ? parseFloat(weight) : null,
        reorderLevel: reorder_level ? parseInt(reorder_level) : 0,
        uom: uom || 'pcs',
        cost: cost ? parseFloat(cost) : null,
        priceA: price_a ? parseFloat(price_a) : null,
        priceB: price_b ? parseFloat(price_b) : null,
        priceM: price_m ? parseFloat(price_m) : null,
        smc: smc || null,
        size: size || null,
        imageP1: image_p1 || null,
        imageP2: image_p2 || null,
        status: status || 'active',
        models: models && Array.isArray(models)
          ? {
              create: models.map((m: any) => ({
                name: m.name,
                qtyUsed: m.qty_used || m.qtyUsed || 1,
              })),
            }
          : undefined,
      },
      include: {
        masterPart: true,
        brand: true,
        category: true,
        subcategory: true,
        application: true,
        models: true,
      },
    });

    res.json({
      id: part.id,
      master_part_no: part.masterPart?.masterPartNo || null,
      part_no: part.partNo,
      brand_name: part.brand?.name || null,
      category_name: part.category?.name || null,
      subcategory_name: part.subcategory?.name || null,
      application_name: part.application?.name || null,
      description: part.description,
      hs_code: part.hsCode,
      weight: part.weight,
      reorder_level: part.reorderLevel,
      uom: part.uom,
      cost: part.cost,
      price_a: part.priceA,
      price_b: part.priceB,
      price_m: part.priceM,
      smc: part.smc,
      size: part.size,
      image_p1: part.imageP1,
      image_p2: part.imageP2,
      status: part.status,
      models: part.models.map((m) => ({
        id: m.id,
        name: m.name,
        qty_used: m.qtyUsed,
      })),
      created_at: part.createdAt,
      updated_at: part.updatedAt,
    });
  } catch (error: any) {
    console.error('Error updating part:', error);
  }
});

// Delete part
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.part.delete({
      where: { id },
    });

    res.json({ message: 'Part deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting part:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update individual part prices - MUST BE AFTER /:id routes
router.put('/:id/prices', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { cost, priceA, priceB, reason, updated_by } = req.body;

    const part = await prisma.part.findUnique({
      where: { id },
    });

    if (!part) {
      return res.status(404).json({ error: 'Part not found' });
    }

    const updates: any = {};
    const historyRecords: any[] = [];

    if (cost !== undefined) {
      const oldCost = part.cost || 0;
      const newCost = parseFloat(cost);
      if (!isNaN(newCost)) {
        updates.cost = newCost;
        historyRecords.push({
          partId: part.id,
          partNo: part.partNo,
          description: part.description,
          priceField: 'cost',
          updateType: 'individual',
          oldValue: oldCost,
          newValue: newCost,
          itemsUpdated: 1,
          reason: reason || 'Individual price update',
          updatedBy: updated_by || 'System',
        });
      }
    }

    if (priceA !== undefined) {
      const oldPriceA = part.priceA || 0;
      const newPriceA = parseFloat(priceA);
      if (!isNaN(newPriceA)) {
        updates.priceA = newPriceA;
        historyRecords.push({
          partId: part.id,
          partNo: part.partNo,
          description: part.description,
          priceField: 'priceA',
          updateType: 'individual',
          oldValue: oldPriceA,
          newValue: newPriceA,
          itemsUpdated: 1,
          reason: reason || 'Individual price update',
          updatedBy: updated_by || 'System',
        });
      }
    }

    if (priceB !== undefined) {
      const oldPriceB = part.priceB || 0;
      const newPriceB = parseFloat(priceB);
      if (!isNaN(newPriceB)) {
        updates.priceB = newPriceB;
        historyRecords.push({
          partId: part.id,
          partNo: part.partNo,
          description: part.description,
          priceField: 'priceB',
          updateType: 'individual',
          oldValue: oldPriceB,
          newValue: newPriceB,
          itemsUpdated: 1,
          reason: reason || 'Individual price update',
          updatedBy: updated_by || 'System',
        });
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid price fields to update' });
    }

    // Update part
    const updatedPart = await prisma.part.update({
      where: { id },
      data: updates,
    });

    // Create history records
    for (const historyData of historyRecords) {
      await prisma.priceHistory.create({
        data: historyData,
      });
    }

    res.json({
      id: updatedPart.id,
      part_no: updatedPart.partNo,
      cost: updatedPart.cost,
      price_a: updatedPart.priceA,
      price_b: updatedPart.priceB,
    });
  } catch (error: any) {
    console.error('Error updating part prices:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
