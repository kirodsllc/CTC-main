import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/customers - Get all customers with filters and pagination
router.get('/', async (req, res) => {
  try {
    const {
      search,
      searchBy,
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
    if (search && searchBy) {
      const searchTerm = (search as string).toLowerCase();
      switch (searchBy) {
        case 'name':
          where.name = { contains: searchTerm };
          break;
        case 'email':
          where.email = { contains: searchTerm };
          break;
        case 'cnic':
          where.cnic = { contains: search as string };
          break;
        case 'contact':
          where.contactNo = { contains: search as string };
          break;
        default:
          where.OR = [
            { name: { contains: searchTerm } },
            { email: { contains: searchTerm } },
          ];
      }
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.customer.count({ where }),
    ]);

    res.json({
      data: customers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/customers/:id - Get single customer
router.get('/:id', async (req, res) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json({ data: customer });
  } catch (error: any) {
    console.error('Error fetching customer:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/customers - Create new customer
router.post('/', async (req, res) => {
  try {
    const {
      name,
      address,
      email,
      cnic,
      contactNo,
      openingBalance,
      creditLimit,
      status,
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Customer name is required' });
    }

    const customer = await prisma.customer.create({
      data: {
        name,
        address: address || null,
        email: email || null,
        cnic: cnic || null,
        contactNo: contactNo || null,
        openingBalance: openingBalance ? parseFloat(openingBalance) : 0,
        creditLimit: creditLimit ? parseFloat(creditLimit) : 0,
        status: status || 'active',
      },
    });

    res.status(201).json({ data: customer });
  } catch (error: any) {
    console.error('Error creating customer:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/customers/:id - Update customer
router.put('/:id', async (req, res) => {
  try {
    const {
      name,
      address,
      email,
      cnic,
      contactNo,
      openingBalance,
      creditLimit,
      status,
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Customer name is required' });
    }

    const customer = await prisma.customer.update({
      where: { id: req.params.id },
      data: {
        name,
        address: address !== undefined ? address : null,
        email: email !== undefined ? email : null,
        cnic: cnic !== undefined ? cnic : null,
        contactNo: contactNo !== undefined ? contactNo : null,
        openingBalance: openingBalance !== undefined ? parseFloat(openingBalance) : undefined,
        creditLimit: creditLimit !== undefined ? parseFloat(creditLimit) : undefined,
        status: status !== undefined ? status : undefined,
      },
    });

    res.json({ data: customer });
  } catch (error: any) {
    console.error('Error updating customer:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/customers/:id - Delete customer
router.delete('/:id', async (req, res) => {
  try {
    await prisma.customer.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'Customer deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting customer:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.status(500).json({ error: error.message });
  }
});

export default router;

