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

    // Helper function to check if string looks like a UUID
    const isUUID = (str: string) => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return uuidRegex.test(str);
    };

    // Validate and handle category (auto-create if not found)
    let validatedCategoryId = null;
    if (category_id && String(category_id).trim() !== '') {
      try {
        const categoryIdStr = String(category_id).trim();
        let category = null;
        
        if (isUUID(categoryIdStr)) {
          category = await prisma.category.findUnique({
            where: { id: categoryIdStr },
          });
          console.log(`[POST] Category lookup by ID: ${category ? 'found' : 'not found'}`);
        }
        
        if (!category) {
          category = await prisma.category.findUnique({
            where: { name: categoryIdStr },
          });
          console.log(`[POST] Category lookup by name: ${category ? 'found' : 'not found'}`);
        }
        
        // If not found, auto-create it
        if (!category) {
          console.log(`[POST] Attempting to auto-create category: "${categoryIdStr}"`);
          try {
            category = await prisma.category.create({
              data: {
                name: categoryIdStr,
                status: 'active',
              },
            });
            console.log(`[POST] Category auto-created: ${category.name} (ID: ${category.id})`);
          } catch (createError: any) {
            console.error(`[POST] Error auto-creating category: ${createError.message}`);
            // If creation fails (e.g., unique constraint), try to find it again
            category = await prisma.category.findUnique({
              where: { name: categoryIdStr },
            });
            if (category) {
              console.log(`[POST] Category found after creation attempt: ${category.name}`);
            }
          }
        }
        
        if (category) {
          validatedCategoryId = category.id;
          console.log(`[POST] Category validated: ${category.name} (ID: ${validatedCategoryId})`);
        }
      } catch (error: any) {
        console.error('Error validating category:', error);
        validatedCategoryId = null;
      }
    }

    // Validate and handle subcategory
    let validatedSubcategoryId = null;
    if (subcategory_id && String(subcategory_id).trim() !== '') {
      try {
        const subcategoryIdStr = String(subcategory_id).trim();
        let subcategory = null;
        
        if (isUUID(subcategoryIdStr)) {
          subcategory = await prisma.subcategory.findUnique({
            where: { id: subcategoryIdStr },
            include: { category: true },
          });
        }
        
        if (!subcategory) {
          subcategory = await prisma.subcategory.findFirst({
            where: { name: subcategoryIdStr },
            include: { category: true },
          });
        }
        
        // If still not found and we have a category, auto-create it
        if (!subcategory && validatedCategoryId) {
          try {
            subcategory = await prisma.subcategory.create({
              data: {
                name: subcategoryIdStr,
                categoryId: validatedCategoryId,
                status: 'active',
              },
              include: { category: true },
            });
            console.log(`Subcategory auto-created: ${subcategory.name} (ID: ${subcategory.id})`);
          } catch (createError: any) {
            // If creation fails (e.g., unique constraint), try to find it again
            subcategory = await prisma.subcategory.findFirst({
              where: { 
                name: subcategoryIdStr,
                categoryId: validatedCategoryId 
              },
              include: { category: true },
            });
            if (subcategory) {
              console.log(`Subcategory found after creation attempt: ${subcategory.name}`);
            } else {
              console.error('Error auto-creating subcategory:', createError);
            }
          }
        }
        
        if (subcategory) {
          validatedSubcategoryId = subcategory.id;
          // Auto-set category if not already set
          if (!validatedCategoryId) {
            validatedCategoryId = subcategory.categoryId;
          }
          console.log(`Subcategory validated: ${subcategory.name} (ID: ${validatedSubcategoryId})`);
        } else {
          console.log(`Subcategory not found and cannot be created (no category): ${subcategoryIdStr}`);
        }
      } catch (error: any) {
        console.error('Error validating subcategory:', error);
        validatedSubcategoryId = null;
      }
    }

    // Validate and handle application (with auto-creation if name provided and subcategory exists)
    let validatedApplicationId = null;
    if (application_id && String(application_id).trim() !== '') {
      try {
        const applicationIdStr = String(application_id).trim();
        let application = null;
        
        if (isUUID(applicationIdStr)) {
          // Try to find by ID
          application = await prisma.application.findUnique({
            where: { id: applicationIdStr },
            include: { subcategory: { include: { category: true } } },
          });
        }
        
        // If not found by ID, try to find by name
        if (!application) {
          if (validatedSubcategoryId) {
            // Try within the validated subcategory
            application = await prisma.application.findFirst({
              where: { 
                name: applicationIdStr,
                subcategoryId: validatedSubcategoryId 
              },
              include: { subcategory: { include: { category: true } } },
            });
          }
          
          // If still not found, try any subcategory
          if (!application) {
            application = await prisma.application.findFirst({
              where: { name: applicationIdStr },
              include: { subcategory: { include: { category: true } } },
            });
          }
        }
        
        // If still not found and we have a subcategory, auto-create it
        if (!application && validatedSubcategoryId) {
          try {
            application = await prisma.application.create({
              data: {
                name: applicationIdStr,
                subcategoryId: validatedSubcategoryId,
                status: 'active',
              },
              include: { subcategory: { include: { category: true } } },
            });
            console.log(`Application auto-created: ${application.name} (ID: ${application.id})`);
          } catch (createError: any) {
            // If creation fails (e.g., unique constraint), try to find it again
            application = await prisma.application.findFirst({
              where: { 
                name: applicationIdStr,
                subcategoryId: validatedSubcategoryId 
              },
              include: { subcategory: { include: { category: true } } },
            });
            if (application) {
              console.log(`Application found after creation attempt: ${application.name}`);
            } else {
              console.error('Error auto-creating application:', createError);
            }
          }
        }
        
        if (application) {
          validatedApplicationId = application.id;
          // Auto-set subcategory and category if not already set
          if (!validatedSubcategoryId) {
            validatedSubcategoryId = application.subcategoryId;
            if (application.subcategory?.categoryId) {
              validatedCategoryId = application.subcategory.categoryId;
            }
          }
          console.log(`Application validated: ${application.name} (ID: ${validatedApplicationId})`);
        } else {
          console.log(`Application not found and cannot be created (no subcategory): ${applicationIdStr}`);
        }
      } catch (error: any) {
        console.error('Error validating application:', error);
        validatedApplicationId = null;
      }
    }

    // Create part with models
    const part = await prisma.part.create({
      data: {
        masterPartId,
        partNo: part_no,
        brandId,
        description: description || null,
        categoryId: validatedCategoryId || null,
        subcategoryId: validatedSubcategoryId || null,
        applicationId: validatedApplicationId || null,
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

    // Helper function to check if string looks like a UUID
    const isUUID = (str: string) => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return uuidRegex.test(str);
    };

    // Validate category exists if provided (auto-create if not found)
    let validatedCategoryId = null;
    if (category_id && String(category_id).trim() !== '') {
      try {
        const categoryIdStr = String(category_id).trim();
        let category = null;
        
        if (isUUID(categoryIdStr)) {
          // Try to find by ID
          category = await prisma.category.findUnique({
            where: { id: categoryIdStr },
          });
          console.log(`[PUT] Category lookup by ID: ${category ? 'found' : 'not found'}`);
        } else {
          // Try to find by name
          category = await prisma.category.findUnique({
            where: { name: categoryIdStr },
          });
          console.log(`[PUT] Category lookup by name: ${category ? 'found' : 'not found'}`);
        }
        
        // If not found, auto-create it
        if (!category) {
          console.log(`[PUT] Attempting to auto-create category: "${categoryIdStr}"`);
          try {
            category = await prisma.category.create({
              data: {
                name: categoryIdStr,
                status: 'active',
              },
            });
            console.log(`[PUT] Category auto-created: ${category.name} (ID: ${category.id})`);
          } catch (createError: any) {
            console.error(`[PUT] Error auto-creating category: ${createError.message}`);
            // If creation fails (e.g., unique constraint), try to find it again
            category = await prisma.category.findUnique({
              where: { name: categoryIdStr },
            });
            if (category) {
              console.log(`[PUT] Category found after creation attempt: ${category.name}`);
            }
          }
        }
        
        if (category) {
          validatedCategoryId = category.id;
          console.log(`[PUT] Category validated: ${category.name} (ID: ${validatedCategoryId})`);
        }
      } catch (error: any) {
        console.error('Error validating category:', error);
        validatedCategoryId = null;
      }
    }

    // Validate subcategory exists
    let validatedSubcategoryId = null;
    if (subcategory_id && String(subcategory_id).trim() !== '') {
      try {
        const subcategoryIdStr = String(subcategory_id).trim();
        console.log(`[PUT] Validating subcategory: "${subcategoryIdStr}" (isUUID: ${isUUID(subcategoryIdStr)}, validatedCategoryId: ${validatedCategoryId})`);
        let subcategory = null;
        
        if (isUUID(subcategoryIdStr)) {
          // Try to find by ID
          subcategory = await prisma.subcategory.findUnique({
            where: { id: subcategoryIdStr },
            include: { category: true },
          });
          console.log(`[PUT] Subcategory lookup by ID: ${subcategory ? 'found' : 'not found'}`);
        }
        
        // If not found by ID, try to find by name
        if (!subcategory) {
          if (validatedCategoryId) {
            // Try within the validated category
            subcategory = await prisma.subcategory.findFirst({
              where: { 
                name: subcategoryIdStr,
                categoryId: validatedCategoryId 
              },
              include: { category: true },
            });
            console.log(`[PUT] Subcategory lookup by name in category: ${subcategory ? 'found' : 'not found'}`);
          }
          
          // If still not found, try any category
          if (!subcategory) {
            subcategory = await prisma.subcategory.findFirst({
              where: { name: subcategoryIdStr },
              include: { category: true },
            });
            console.log(`[PUT] Subcategory lookup by name (any category): ${subcategory ? 'found' : 'not found'}`);
          }
        }
        
        // If still not found and we have a category, auto-create it
        if (!subcategory && validatedCategoryId) {
          console.log(`[PUT] Attempting to auto-create subcategory: "${subcategoryIdStr}" in category: ${validatedCategoryId}`);
          try {
            subcategory = await prisma.subcategory.create({
              data: {
                name: subcategoryIdStr,
                categoryId: validatedCategoryId,
                status: 'active',
              },
              include: { category: true },
            });
            console.log(`[PUT] Subcategory auto-created: ${subcategory.name} (ID: ${subcategory.id})`);
          } catch (createError: any) {
            console.error(`[PUT] Error auto-creating subcategory: ${createError.message}`);
            // If creation fails (e.g., unique constraint), try to find it again
            subcategory = await prisma.subcategory.findFirst({
              where: { 
                name: subcategoryIdStr,
                categoryId: validatedCategoryId 
              },
              include: { category: true },
            });
            if (subcategory) {
              console.log(`[PUT] Subcategory found after creation attempt: ${subcategory.name}`);
            } else {
              console.error(`[PUT] Subcategory still not found after creation attempt`);
            }
          }
        } else if (!subcategory) {
          console.log(`[PUT] Subcategory not found and cannot be created (no category): ${subcategoryIdStr}`);
        }
        
        if (subcategory) {
          validatedSubcategoryId = subcategory.id;
          // Auto-set category if not already set
          if (!validatedCategoryId) {
            validatedCategoryId = subcategory.categoryId;
          }
          console.log(`[PUT] Subcategory validated: ${subcategory.name} (ID: ${validatedSubcategoryId})`);
        }
      } catch (error: any) {
        console.error('Error validating subcategory:', error);
        validatedSubcategoryId = null;
      }
    }

    // Validate application exists
    let validatedApplicationId = null;
    if (application_id && String(application_id).trim() !== '') {
      try {
        const applicationIdStr = String(application_id).trim();
        console.log(`[PUT] Validating application: "${applicationIdStr}" (isUUID: ${isUUID(applicationIdStr)}, validatedSubcategoryId: ${validatedSubcategoryId})`);
        let application = null;
        
        if (isUUID(applicationIdStr)) {
          // Try to find by ID
          application = await prisma.application.findUnique({
            where: { id: applicationIdStr },
            include: { subcategory: { include: { category: true } } },
          });
          console.log(`[PUT] Application lookup by ID: ${application ? 'found' : 'not found'}`);
        }
        
        // If not found by ID, try to find by name
        if (!application) {
          if (validatedSubcategoryId) {
            // Try within the validated subcategory
            application = await prisma.application.findFirst({
              where: { 
                name: applicationIdStr,
                subcategoryId: validatedSubcategoryId 
              },
              include: { subcategory: { include: { category: true } } },
            });
            console.log(`[PUT] Application lookup by name in subcategory: ${application ? 'found' : 'not found'}`);
          }
          
          // If still not found, try any subcategory
          if (!application) {
            application = await prisma.application.findFirst({
              where: { name: applicationIdStr },
              include: { subcategory: { include: { category: true } } },
            });
            console.log(`[PUT] Application lookup by name (any subcategory): ${application ? 'found' : 'not found'}`);
          }
        }
        
        // If still not found and we have a subcategory, auto-create it
        if (!application && validatedSubcategoryId) {
          console.log(`[PUT] Attempting to auto-create application: "${applicationIdStr}" in subcategory: ${validatedSubcategoryId}`);
          try {
            application = await prisma.application.create({
              data: {
                name: applicationIdStr,
                subcategoryId: validatedSubcategoryId,
                status: 'active',
              },
              include: { subcategory: { include: { category: true } } },
            });
            console.log(`[PUT] Application auto-created: ${application.name} (ID: ${application.id})`);
          } catch (createError: any) {
            console.error(`[PUT] Error auto-creating application: ${createError.message}`);
            // If creation fails (e.g., unique constraint), try to find it again
            application = await prisma.application.findFirst({
              where: { 
                name: applicationIdStr,
                subcategoryId: validatedSubcategoryId 
              },
              include: { subcategory: { include: { category: true } } },
            });
            if (application) {
              console.log(`[PUT] Application found after creation attempt: ${application.name}`);
            } else {
              console.error(`[PUT] Application still not found after creation attempt`);
            }
          }
        } else if (!application) {
          console.log(`[PUT] Application not found and cannot be created (no subcategory): ${applicationIdStr}`);
        }
        
        if (application) {
          validatedApplicationId = application.id;
          // Auto-set subcategory and category if not already set
          if (!validatedSubcategoryId) {
            validatedSubcategoryId = application.subcategoryId;
            if (application.subcategory?.categoryId) {
              validatedCategoryId = application.subcategory.categoryId;
            }
          }
          console.log(`[PUT] Application validated: ${application.name} (ID: ${validatedApplicationId})`);
        }
      } catch (error: any) {
        console.error('Error validating application:', error);
        validatedApplicationId = null;
      }
    }

    // Ensure foreign key relationships are valid
    // If subcategory is set, category must also be set and match
    if (validatedSubcategoryId && !validatedCategoryId) {
      // Get category from subcategory
      try {
        const subcategory = await prisma.subcategory.findUnique({
          where: { id: validatedSubcategoryId },
        });
        if (subcategory) {
          validatedCategoryId = subcategory.categoryId;
        } else {
          // Subcategory doesn't exist, clear it
          validatedSubcategoryId = null;
        }
      } catch (error) {
        validatedSubcategoryId = null;
      }
    }
    
    // If application is set, subcategory and category must also be set and match
    if (validatedApplicationId) {
      if (!validatedSubcategoryId) {
        // Get subcategory from application
        try {
          const application = await prisma.application.findUnique({
            where: { id: validatedApplicationId },
            include: { subcategory: true },
          });
          if (application) {
            validatedSubcategoryId = application.subcategoryId;
            if (application.subcategory) {
              validatedCategoryId = application.subcategory.categoryId;
            }
          } else {
            // Application doesn't exist, clear it
            validatedApplicationId = null;
          }
        } catch (error) {
          validatedApplicationId = null;
        }
      } else {
        // Verify application belongs to subcategory
        try {
          const application = await prisma.application.findUnique({
            where: { id: validatedApplicationId },
          });
          if (application && application.subcategoryId !== validatedSubcategoryId) {
            // Application doesn't belong to subcategory, clear it
            validatedApplicationId = null;
          }
        } catch (error) {
          validatedApplicationId = null;
        }
      }
    }

    // Delete existing models and create new ones
    if (models && Array.isArray(models)) {
      await prisma.model.deleteMany({
        where: { partId: id },
      });
    }

    // Build update data object
    const updateData: any = {
      masterPartId,
      partNo: part_no,
      brandId,
      description: description || null,
      categoryId: validatedCategoryId,
      subcategoryId: validatedSubcategoryId,
      applicationId: validatedApplicationId,
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
      status: status || 'active',
    };

    // Handle images - explicitly set to null if provided as null/empty string, otherwise keep existing if not provided
    if ('image_p1' in req.body) {
      updateData.imageP1 = (image_p1 && image_p1.trim() !== '') ? image_p1 : null;
    }
    if ('image_p2' in req.body) {
      updateData.imageP2 = (image_p2 && image_p2.trim() !== '') ? image_p2 : null;
    }

    // Handle models
    if (models && Array.isArray(models)) {
      updateData.models = {
        create: models.map((m: any) => ({
          name: m.name,
          qtyUsed: m.qty_used || m.qtyUsed || 1,
        })),
      };
    }

    // Update part
    const part = await prisma.part.update({
      where: { id },
      data: updateData,
      include: {
        masterPart: true,
        brand: true,
        category: true,
        subcategory: true,
        application: true,
        models: true,
      },
    });

    // Debug log to verify application is included
    console.log(`Part updated - Application: ${part.application?.name || 'null'}, Application ID: ${part.applicationId || 'null'}`);

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
    res.status(500).json({ error: error.message });
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
