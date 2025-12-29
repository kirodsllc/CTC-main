import express, { Request, Response } from 'express';
import prisma from '../config/database';

const router = express.Router();

// ========== Main Groups ==========
router.get('/main-groups', async (req: Request, res: Response) => {
  try {
    const groups = await prisma.mainGroup.findMany({
      orderBy: { displayOrder: 'asc' },
    });
    res.json(groups);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/main-groups', async (req: Request, res: Response) => {
  try {
    const { code, name, type, displayOrder } = req.body;
    const group = await prisma.mainGroup.create({
      data: { code, name, type, displayOrder },
    });
    res.json(group);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========== Subgroups ==========
router.get('/subgroups', async (req: Request, res: Response) => {
  try {
    const { mainGroupId, isActive } = req.query;
    const where: any = {};
    if (mainGroupId) where.mainGroupId = mainGroupId;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    
    const subgroups = await prisma.subgroup.findMany({
      where,
      include: { mainGroup: true },
      orderBy: { code: 'asc' },
    });
    res.json(subgroups);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/subgroups', async (req: Request, res: Response) => {
  try {
    const { mainGroupId, code, name, isActive, canDelete } = req.body;
    const subgroup = await prisma.subgroup.create({
      data: {
        mainGroupId,
        code,
        name,
        isActive: isActive !== undefined ? isActive : true,
        canDelete: canDelete !== undefined ? canDelete : true,
      },
      include: { mainGroup: true },
    });
    res.json(subgroup);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/subgroups/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { mainGroupId, name, isActive } = req.body;
    const subgroup = await prisma.subgroup.update({
      where: { id },
      data: { mainGroupId, name, isActive },
      include: { mainGroup: true },
    });
    res.json(subgroup);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/subgroups/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.subgroup.delete({ where: { id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========== Accounts ==========
router.get('/accounts', async (req: Request, res: Response) => {
  try {
    const { subgroupId, status, mainGroupId } = req.query;
    const where: any = {};
    if (subgroupId) where.subgroupId = subgroupId;
    if (status) where.status = status;
    if (mainGroupId) {
      where.subgroup = { mainGroupId };
    }
    
    const accounts = await prisma.account.findMany({
      where,
      include: {
        subgroup: {
          include: { mainGroup: true },
        },
      },
      orderBy: { code: 'asc' },
    });
    res.json(accounts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/accounts', async (req: Request, res: Response) => {
  try {
    const { subgroupId, code, name, description, accountType, openingBalance, status } = req.body;
    const account = await prisma.account.create({
      data: {
        subgroupId,
        code,
        name,
        description,
        accountType: accountType || 'regular',
        openingBalance: openingBalance || 0,
        currentBalance: openingBalance || 0,
        status: status || 'Active',
      },
      include: {
        subgroup: {
          include: { mainGroup: true },
        },
      },
    });
    res.json(account);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/accounts/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { subgroupId, name, description, status } = req.body;
    const account = await prisma.account.update({
      where: { id },
      data: { subgroupId, name, description, status },
      include: {
        subgroup: {
          include: { mainGroup: true },
        },
      },
    });
    res.json(account);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/accounts/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.account.delete({ where: { id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========== Journal Entries ==========
router.get('/journal-entries', async (req: Request, res: Response) => {
  try {
    const { status, search } = req.query;
    const where: any = {};
    if (status && status !== 'all') where.status = status;
    if (search) {
      where.OR = [
        { entryNo: { contains: search as string, mode: 'insensitive' } },
        { reference: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }
    
    const entries = await prisma.journalEntry.findMany({
      where,
      include: {
        lines: {
          include: {
            account: {
              include: {
                subgroup: {
                  include: { mainGroup: true },
                },
              },
            },
          },
          orderBy: { lineOrder: 'asc' },
        },
      },
      orderBy: { entryDate: 'desc' },
    });
    res.json(entries);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/journal-entries', async (req: Request, res: Response) => {
  try {
    const { entryDate, reference, description, lines, createdBy } = req.body;
    
    const totalDebit = lines.reduce((sum: number, line: any) => sum + (line.debit || 0), 0);
    const totalCredit = lines.reduce((sum: number, line: any) => sum + (line.credit || 0), 0);
    
    if (totalDebit !== totalCredit) {
      return res.status(400).json({ error: 'Total debits must equal total credits' });
    }
    
    // Generate entry number
    const count = await prisma.journalEntry.count();
    const entryNo = `JV-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;
    
    const entry = await prisma.journalEntry.create({
      data: {
        entryNo,
        entryDate: new Date(entryDate),
        reference,
        description,
        totalDebit,
        totalCredit,
        createdBy,
        lines: {
          create: lines.map((line: any, index: number) => ({
            accountId: line.accountId,
            description: line.description,
            debit: line.debit || 0,
            credit: line.credit || 0,
            lineOrder: index,
          })),
        },
      },
      include: {
        lines: {
          include: {
            account: {
              include: {
                subgroup: {
                  include: { mainGroup: true },
                },
              },
            },
          },
        },
      },
    });
    
    res.json(entry);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/journal-entries/:id/post', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { postedBy } = req.body;
    
    const entry = await prisma.journalEntry.findUnique({
      where: { id },
      include: { lines: true },
    });
    
    if (!entry) {
      return res.status(404).json({ error: 'Journal entry not found' });
    }
    
    if (entry.status === 'posted') {
      return res.status(400).json({ error: 'Entry already posted' });
    }
    
    // Update entry status
    const updatedEntry = await prisma.journalEntry.update({
      where: { id },
      data: {
        status: 'posted',
        postedBy,
        postedAt: new Date(),
      },
      include: {
        lines: {
          include: {
            account: true,
          },
        },
      },
    });
    
    // Update account balances
    for (const line of entry.lines) {
      const balanceChange = line.debit - line.credit;
      await prisma.account.update({
        where: { id: line.accountId },
        data: {
          currentBalance: {
            increment: balanceChange,
          },
        },
      });
    }
    
    res.json(updatedEntry);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========== General Ledger ==========
router.get('/general-ledger', async (req: Request, res: Response) => {
  try {
    const { accountCode, type, dateFrom, dateTo } = req.query;
    
    const accounts = await prisma.account.findMany({
      where: {
        ...(accountCode && {
          code: { contains: accountCode as string, mode: 'insensitive' },
        }),
        ...(type && {
          subgroup: {
            mainGroup: { type: type as string },
          },
        }),
      },
      include: {
        subgroup: {
          include: { mainGroup: true },
        },
        journalLines: {
          where: {
            journalEntry: {
              status: 'posted',
              ...(dateFrom && { entryDate: { gte: new Date(dateFrom as string) } }),
              ...(dateTo && { entryDate: { lte: new Date(dateTo as string) } }),
            },
          },
          include: {
            journalEntry: true,
          },
          orderBy: {
            journalEntry: { entryDate: 'asc' },
          },
        },
      },
    });
    
    // Calculate running balances
    const ledgerAccounts = accounts.map((account) => {
      let runningBalance = account.openingBalance;
      const transactions = account.journalLines.map((line) => {
        runningBalance += line.debit - line.credit;
        return {
          id: line.id,
          date: line.journalEntry.entryDate.toISOString().split('T')[0],
          journalNo: line.journalEntry.entryNo,
          reference: line.journalEntry.reference || '',
          description: line.description || line.journalEntry.description || '',
          debit: line.debit,
          credit: line.credit,
          balance: runningBalance,
        };
      });
      
      return {
        code: account.code,
        name: account.name,
        type: account.subgroup.mainGroup.type,
        openingBalance: account.openingBalance,
        currentBalance: runningBalance,
        transactions,
      };
    });
    
    res.json(ledgerAccounts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========== Trial Balance ==========
router.get('/trial-balance', async (req: Request, res: Response) => {
  try {
    const { period, type } = req.query;
    
    const accounts = await prisma.account.findMany({
      include: {
        subgroup: {
          include: { mainGroup: true },
        },
        journalLines: {
          where: {
            journalEntry: {
              status: 'posted',
            },
          },
        },
      },
    });
    
    const trialBalance = accounts.map((account) => {
      const totalDebit = account.journalLines.reduce((sum, line) => sum + line.debit, 0);
      const totalCredit = account.journalLines.reduce((sum, line) => sum + line.credit, 0);
      const balance = account.openingBalance + totalDebit - totalCredit;
      
      return {
        accountCode: account.code,
        accountName: account.name,
        accountType: account.subgroup.mainGroup.type,
        debit: balance > 0 ? balance : 0,
        credit: balance < 0 ? Math.abs(balance) : 0,
      };
    }).filter((row) => {
      if (type && type !== 'all') {
        return row.accountType.toLowerCase() === (type as string).toLowerCase();
      }
      return true;
    });
    
    res.json(trialBalance);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========== Financial Statements ==========
router.get('/income-statement', async (req: Request, res: Response) => {
  try {
    const { period } = req.query;
    
    const revenueAccounts = await prisma.account.findMany({
      where: {
        subgroup: {
          mainGroup: {
            type: { in: ['revenue'] },
          },
        },
      },
      include: {
        subgroup: {
          include: { mainGroup: true },
        },
        journalLines: {
          where: {
            journalEntry: {
              status: 'posted',
            },
          },
        },
      },
    });
    
    const expenseAccounts = await prisma.account.findMany({
      where: {
        subgroup: {
          mainGroup: {
            type: { in: ['expense', 'cost'] },
          },
        },
      },
      include: {
        subgroup: {
          include: { mainGroup: true },
        },
        journalLines: {
          where: {
            journalEntry: {
              status: 'posted',
            },
          },
        },
      },
    });
    
    // Group by subgroup
    const revenueCategories: any[] = [];
    const expenseCategories: any[] = [];
    
    // Process revenues
    const revenueBySubgroup: Record<string, any[]> = {};
    revenueAccounts.forEach((account) => {
      const subGroupName = account.subgroup.name;
      if (!revenueBySubgroup[subGroupName]) {
        revenueBySubgroup[subGroupName] = [];
      }
      const totalCredit = account.journalLines.reduce((sum, line) => sum + line.credit, 0);
      revenueBySubgroup[subGroupName].push({
        name: account.name,
        amount: totalCredit,
      });
    });
    
    Object.entries(revenueBySubgroup).forEach(([name, items]) => {
      revenueCategories.push({ name, items });
    });
    
    // Process expenses
    const expenseBySubgroup: Record<string, any[]> = {};
    expenseAccounts.forEach((account) => {
      const subGroupName = account.subgroup.name;
      if (!expenseBySubgroup[subGroupName]) {
        expenseBySubgroup[subGroupName] = [];
      }
      const totalDebit = account.journalLines.reduce((sum, line) => sum + line.debit, 0);
      expenseBySubgroup[subGroupName].push({
        name: account.name,
        amount: totalDebit,
      });
    });
    
    Object.entries(expenseBySubgroup).forEach(([name, items]) => {
      expenseCategories.push({ name, items });
    });
    
    res.json({ revenue: revenueCategories, expenses: expenseCategories });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/balance-sheet', async (req: Request, res: Response) => {
  try {
    const { period } = req.query;
    
    const assetAccounts = await prisma.account.findMany({
      where: {
        subgroup: {
          mainGroup: {
            type: { in: ['asset'] },
          },
        },
      },
      include: {
        subgroup: {
          include: { mainGroup: true },
        },
        journalLines: {
          where: {
            journalEntry: {
              status: 'posted',
            },
          },
        },
      },
    });
    
    const liabilityAccounts = await prisma.account.findMany({
      where: {
        subgroup: {
          mainGroup: {
            type: { in: ['liability'] },
          },
        },
      },
      include: {
        subgroup: {
          include: { mainGroup: true },
        },
        journalLines: {
          where: {
            journalEntry: {
              status: 'posted',
            },
          },
        },
      },
    });
    
    const equityAccounts = await prisma.account.findMany({
      where: {
        subgroup: {
          mainGroup: {
            type: { in: ['equity'] },
          },
        },
      },
      include: {
        subgroup: {
          include: { mainGroup: true },
        },
        journalLines: {
          where: {
            journalEntry: {
              status: 'posted',
            },
          },
        },
      },
    });
    
    // Group by main group or subgroup
    const processAccounts = (accounts: any[]) => {
      const byCategory: Record<string, any[]> = {};
      accounts.forEach((account) => {
        const categoryName = account.subgroup.mainGroup.name;
        if (!byCategory[categoryName]) {
          byCategory[categoryName] = [];
        }
        const totalDebit = account.journalLines.reduce((sum: number, line: any) => sum + line.debit, 0);
        const totalCredit = account.journalLines.reduce((sum: number, line: any) => sum + line.credit, 0);
        const balance = account.openingBalance + totalDebit - totalCredit;
        byCategory[categoryName].push({
          name: account.name,
          amount: balance,
        });
      });
      return Object.entries(byCategory).map(([name, items]) => ({ name, items }));
    };
    
    res.json({
      assets: processAccounts(assetAccounts),
      liabilities: processAccounts(liabilityAccounts),
      equity: processAccounts(equityAccounts),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

