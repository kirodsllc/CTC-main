import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/suppliers - Get all suppliers with filters and pagination
router.get('/', async (req, res) => {
  try {
    const {
      search,
      fieldFilter,
      status,
      page = '1',
      limit = '10',
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = {};

    // Status filter
    if (status && status !== 'all') {
      where.status = status;
    }

    // Search filter
    if (search) {
      const searchTerm = (search as string).toLowerCase();
      if (fieldFilter && fieldFilter !== 'all') {
        switch (fieldFilter) {
          case 'name':
            where.OR = [
              { name: { contains: searchTerm } },
              { companyName: { contains: searchTerm } },
            ];
            break;
          case 'email':
            where.email = { contains: searchTerm };
            break;
          case 'phone':
            where.phone = { contains: search as string };
            break;
        }
      } else {
        where.OR = [
          { companyName: { contains: searchTerm } },
          { email: { contains: searchTerm } },
          { code: { contains: searchTerm } },
          { phone: { contains: search as string } },
        ];
      }
    }

    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.supplier.count({ where }),
    ]);

    res.json({
      data: suppliers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/suppliers/:id - Get single supplier
router.get('/:id', async (req, res) => {
  try {
    const supplier = await prisma.supplier.findUnique({
      where: { id: req.params.id },
    });

    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    res.json({ data: supplier });
  } catch (error: any) {
    console.error('Error fetching supplier:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/suppliers - Create new supplier
router.post('/', async (req, res) => {
  try {
    const {
      code,
      name,
      companyName,
      address,
      city,
      state,
      country,
      zipCode,
      email,
      phone,
      cnic,
      contactPerson,
      taxId,
      paymentTerms,
      status,
      notes,
    } = req.body;

    if (!code || !companyName) {
      return res.status(400).json({ error: 'Supplier Code and Company Name are required' });
    }

    const supplier = await prisma.supplier.create({
      data: {
        code,
        name: name || null,
        companyName,
        address: address || null,
        city: city || null,
        state: state || null,
        country: country || null,
        zipCode: zipCode || null,
        email: email || null,
        phone: phone || null,
        cnic: cnic || null,
        contactPerson: contactPerson || null,
        taxId: taxId || null,
        paymentTerms: paymentTerms || null,
        status: status || 'active',
        notes: notes || null,
      },
    });

    res.status(201).json({ data: supplier });
  } catch (error: any) {
    console.error('Error creating supplier:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Supplier code already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/suppliers/:id - Update supplier
router.put('/:id', async (req, res) => {
  try {
    const {
      code,
      name,
      companyName,
      address,
      city,
      state,
      country,
      zipCode,
      email,
      phone,
      cnic,
      contactPerson,
      taxId,
      paymentTerms,
      status,
      notes,
    } = req.body;

    if (!companyName) {
      return res.status(400).json({ error: 'Company Name is required' });
    }

    const updateData: any = {};
    if (code !== undefined) updateData.code = code;
    if (name !== undefined) updateData.name = name || null;
    if (companyName !== undefined) updateData.companyName = companyName;
    if (address !== undefined) updateData.address = address || null;
    if (city !== undefined) updateData.city = city || null;
    if (state !== undefined) updateData.state = state || null;
    if (country !== undefined) updateData.country = country || null;
    if (zipCode !== undefined) updateData.zipCode = zipCode || null;
    if (email !== undefined) updateData.email = email || null;
    if (phone !== undefined) updateData.phone = phone || null;
    if (cnic !== undefined) updateData.cnic = cnic || null;
    if (contactPerson !== undefined) updateData.contactPerson = contactPerson || null;
    if (taxId !== undefined) updateData.taxId = taxId || null;
    if (paymentTerms !== undefined) updateData.paymentTerms = paymentTerms || null;
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes || null;

    const supplier = await prisma.supplier.update({
      where: { id: req.params.id },
      data: updateData,
    });

    res.json({ data: supplier });
  } catch (error: any) {
    console.error('Error updating supplier:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Supplier not found' });
    }
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Supplier code already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/suppliers/:id - Delete supplier
router.delete('/:id', async (req, res) => {
  try {
    await prisma.supplier.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'Supplier deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting supplier:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Supplier not found' });
    }
    res.status(500).json({ error: error.message });
  }
});

export default router;

