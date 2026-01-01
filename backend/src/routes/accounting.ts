import express, { Request, Response } from 'express';
import prisma from '../config/database';

const router = express.Router();

// ========== Helper Functions for Accounting Calculations ==========

/**
 * Determines if an account type has a normal DEBIT balance
 * Assets and Expenses have normal DEBIT balances
 */
function isDebitNormal(accountType: string): boolean {
  const type = accountType.toLowerCase();
  return type === 'asset' || type === 'expense' || type === 'cost';
}

/**
 * Calculates account balance based on account type and transactions
 * For DEBIT normal accounts: balance = openingBalance + debits - credits
 * For CREDIT normal accounts: balance = openingBalance + credits - debits
 */
function calculateAccountBalance(
  openingBalance: number,
  totalDebit: number,
  totalCredit: number,
  accountType: string
): number {
  if (isDebitNormal(accountType)) {
    // Assets and Expenses: increase with debit, decrease with credit
    return openingBalance + totalDebit - totalCredit;
  } else {
    // Liabilities, Equity, Revenue: increase with credit, decrease with debit
    return openingBalance + totalCredit - totalDebit;
  }
}

/**
 * Calculates the balance change for posting journal entries
 * For DEBIT normal: balanceChange = debit - credit
 * For CREDIT normal: balanceChange = credit - debit
 */
function calculateBalanceChange(
  debit: number,
  credit: number,
  accountType: string
): number {
  if (isDebitNormal(accountType)) {
    return debit - credit;
  } else {
    return credit - debit;
  }
}

/**
 * Gets trial balance amounts (debit and credit columns)
 * For DEBIT normal accounts: positive balance = debit, negative = credit
 * For CREDIT normal accounts: positive balance = credit, negative = debit
 */
function getTrialBalanceAmounts(
  balance: number,
  accountType: string
): { debit: number; credit: number } {
  if (isDebitNormal(accountType)) {
    return {
      debit: balance > 0 ? balance : 0,
      credit: balance < 0 ? Math.abs(balance) : 0,
    };
  } else {
    return {
      debit: balance < 0 ? Math.abs(balance) : 0,
      credit: balance > 0 ? balance : 0,
    };
  }
}

// ========== Main Groups ==========
router.get('/main-groups', async (req: Request, res: Response) => {
  try {
    const groups = await prisma.mainGroup.findMany({
      orderBy: { displayOrder: 'asc' },
    });
    res.json(groups);
  } catch (error: any) {
    console.error('Error fetching main groups:', error);
    res.status(500).json({ 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
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

router.put('/main-groups/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { code, name, type, displayOrder } = req.body;
    const group = await prisma.mainGroup.update({
      where: { id },
      data: { code, name, type, displayOrder },
    });
    res.json(group);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/main-groups/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.mainGroup.delete({
      where: { id },
    });
    res.json({ success: true });
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
      include: {
        lines: {
          include: {
            account: {
              include: {
                subgroup: {
                  include: {
                    mainGroup: true,
                  },
                },
              },
            },
          },
        },
      },
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
            account: {
              include: {
                subgroup: {
                  include: {
                    mainGroup: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    
    // Update account balances using proper accounting logic
    for (const line of entry.lines) {
      const accountType = line.account.subgroup.mainGroup.type;
      const balanceChange = calculateBalanceChange(
        line.debit,
        line.credit,
        accountType
      );
      
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

// ========== General Journal ==========
router.get('/general-journal', async (req: Request, res: Response) => {
  try {
    const { search_by, search, from_date, to_date, page = '1', limit = '10' } = req.query;
    
    // Build where clause for journal entries
    const where: any = {
      status: 'posted', // Only show posted entries
    };
    
    // Date range filter
    if (from_date || to_date) {
      where.entryDate = {};
      if (from_date) {
        where.entryDate.gte = new Date(from_date as string);
      }
      if (to_date) {
        where.entryDate.lte = new Date(to_date as string);
      }
    }
    
    // Search filter (SQLite doesn't support case-insensitive mode, so we'll filter in memory)
    let searchFilter: any = null;
    if (search) {
      const searchStr = (search as string).toLowerCase();
      searchFilter = { searchStr, search_by };
    }
    
    // Get all journal entries with lines
    const entries = await prisma.journalEntry.findMany({
      where,
      include: {
        lines: {
          include: {
            account: {
              include: {
                subgroup: {
                  include: {
                    mainGroup: true,
                  },
                },
              },
            },
          },
          orderBy: { lineOrder: 'asc' },
        },
      },
      orderBy: [
        { entryDate: 'desc' },
        { entryNo: 'desc' },
      ],
    });
    
    // Flatten entries into individual lines for general journal view
    let journalLines: any[] = [];
    let tId = 1;
    
    entries.forEach((entry) => {
      entry.lines.forEach((line) => {
        const accountName = `${line.account.code} - ${line.account.name}`;
        const description = line.description || entry.description || '';
        
        // Apply search filter if provided
        if (searchFilter) {
          const { searchStr, search_by } = searchFilter;
          if (search_by === 'voucher') {
            if (!entry.entryNo.toLowerCase().includes(searchStr)) return;
          } else if (search_by === 'account') {
            if (!line.account.code.toLowerCase().includes(searchStr) && 
                !line.account.name.toLowerCase().includes(searchStr)) return;
          } else if (search_by === 'description') {
            if (!description.toLowerCase().includes(searchStr) && 
                !entry.description?.toLowerCase().includes(searchStr)) return;
          } else {
            // General search
            if (!entry.entryNo.toLowerCase().includes(searchStr) &&
                !(entry.reference?.toLowerCase().includes(searchStr)) &&
                !description.toLowerCase().includes(searchStr) &&
                !accountName.toLowerCase().includes(searchStr)) return;
          }
        }
        
        journalLines.push({
          id: `${entry.id}-${line.id}`,
          tId: tId++,
          voucherNo: entry.entryNo,
          date: entry.entryDate.toISOString().split('T')[0],
          account: accountName,
          description: description,
          debit: line.debit,
          credit: line.credit,
          entryId: entry.id,
          lineId: line.id,
        });
      });
    });
    
    // Pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedLines = journalLines.slice(startIndex, endIndex);
    
    res.json({
      data: paginatedLines,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: journalLines.length,
        totalPages: Math.ceil(journalLines.length / limitNum),
      },
    });
  } catch (error: any) {
    console.error('Error fetching general journal:', error);
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
          code: { contains: accountCode as string },
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
    
    // Calculate running balances using proper accounting logic
    const ledgerAccounts = accounts.map((account) => {
      const accountType = account.subgroup?.mainGroup?.type || '';
      let runningBalance = account.openingBalance;
      
      const transactions = (account.journalLines || []).map((line: any) => {
        const balanceChange = calculateBalanceChange(
          line.debit,
          line.credit,
          accountType
        );
        runningBalance += balanceChange;
        
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
        type: accountType,
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
    const { period, type, from_date, to_date } = req.query;
    
    // Build date filter if provided
    let dateFilter: any = {};
    if (from_date || to_date) {
      dateFilter.entryDate = {};
      if (from_date) {
        dateFilter.entryDate.gte = new Date(from_date as string);
      }
      if (to_date) {
        dateFilter.entryDate.lte = new Date(to_date as string);
      }
    }
    
    const accounts = await prisma.account.findMany({
      include: {
        subgroup: {
          include: { mainGroup: true },
        },
        journalLines: {
          where: {
            journalEntry: {
              status: 'posted',
              ...dateFilter,
            },
          },
        },
      },
      orderBy: [
        {
          subgroup: {
            mainGroup: {
              displayOrder: 'asc',
            },
          },
        },
        {
          code: 'asc',
        },
      ],
    });
    
    // Group accounts by main group and subgroup
    const groupedData: any[] = [];
    let currentMainGroup: any = null;
    let currentSubgroup: any = null;
    
    accounts.forEach((account) => {
      const accountType = account.subgroup.mainGroup.type;
      const totalDebit = account.journalLines.reduce((sum, line) => sum + line.debit, 0);
      const totalCredit = account.journalLines.reduce((sum, line) => sum + line.credit, 0);
      
      // Calculate balance using proper accounting logic
      const balance = calculateAccountBalance(
        account.openingBalance,
        totalDebit,
        totalCredit,
        accountType
      );
      
      // Get trial balance amounts (debit/credit columns)
      const { debit, credit } = getTrialBalanceAmounts(balance, accountType);
      
      // Filter by type if specified
      if (type && type !== 'all') {
        if (accountType.toLowerCase() !== (type as string).toLowerCase()) {
          return;
        }
      }
      
      const mainGroupCode = account.subgroup.mainGroup.code;
      const mainGroupName = account.subgroup.mainGroup.name;
      const subgroupCode = account.subgroup.code;
      const subgroupName = account.subgroup.name;
      
      // Add main group header if changed
      if (!currentMainGroup || currentMainGroup.code !== mainGroupCode) {
        currentMainGroup = { code: mainGroupCode, name: mainGroupName };
        groupedData.push({
          type: 'mainGroup',
          code: mainGroupCode,
          name: `${mainGroupCode}-${mainGroupName}`,
          debit: 0,
          credit: 0,
        });
      }
      
      // Add subgroup header if changed
      if (!currentSubgroup || currentSubgroup.code !== subgroupCode) {
        currentSubgroup = { code: subgroupCode, name: subgroupName };
        groupedData.push({
          type: 'subgroup',
          code: subgroupCode,
          name: `${subgroupCode}-${subgroupName}`,
          debit: 0,
          credit: 0,
        });
      }
      
      // Add account (include all accounts, even with zero balances)
      groupedData.push({
        type: 'account',
        accountCode: account.code,
        accountName: `${account.code}-${account.name}`,
        accountType: accountType,
        debit,
        credit,
      });
    });
    
    res.json(groupedData);
  } catch (error: any) {
    console.error('Error fetching trial balance:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== Financial Statements ==========
router.get('/income-statement', async (req: Request, res: Response) => {
  try {
    const { period, from_date, to_date } = req.query;
    
    // Build date filter if provided
    let dateFilter: any = {};
    if (from_date || to_date) {
      dateFilter.entryDate = {};
      if (from_date) {
        dateFilter.entryDate.gte = new Date(from_date as string);
      }
      if (to_date) {
        dateFilter.entryDate.lte = new Date(to_date as string);
      }
    }
    
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
              ...dateFilter,
            },
          },
        },
      },
      orderBy: {
        code: 'asc',
      },
    });
    
    // Separate cost accounts from expense accounts
    const costAccounts = await prisma.account.findMany({
      where: {
        subgroup: {
          mainGroup: {
            type: { in: ['cost'] },
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
              ...dateFilter,
            },
          },
        },
      },
      orderBy: {
        code: 'asc',
      },
    });
    
    const expenseAccounts = await prisma.account.findMany({
      where: {
        subgroup: {
          mainGroup: {
            type: { in: ['expense'] },
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
              ...dateFilter,
            },
          },
        },
      },
      orderBy: {
        code: 'asc',
      },
    });
    
    // Group by subgroup
    const revenueCategories: any[] = [];
    const costCategories: any[] = [];
    const expenseCategories: any[] = [];
    
    // Process revenues (Revenue accounts: normal balance is CREDIT)
    // Revenue = openingBalance + credits - debits
    const revenueBySubgroup: Record<string, any[]> = {};
    revenueAccounts.forEach((account) => {
      const subGroupName = account.subgroup.name;
      if (!revenueBySubgroup[subGroupName]) {
        revenueBySubgroup[subGroupName] = [];
      }
      const totalDebit = account.journalLines.reduce((sum, line) => sum + line.debit, 0);
      const totalCredit = account.journalLines.reduce((sum, line) => sum + line.credit, 0);
      
      // Revenue balance: openingBalance + credits - debits
      const revenueAmount = calculateAccountBalance(
        account.openingBalance,
        totalDebit,
        totalCredit,
        'revenue'
      );
      
      revenueBySubgroup[subGroupName].push({
        name: `${account.code}-${account.name}`,
        amount: revenueAmount > 0 ? revenueAmount : 0,
      });
    });
    
    Object.entries(revenueBySubgroup).forEach(([name, items]) => {
      revenueCategories.push({ name, items });
    });
    
    // Process costs (Cost accounts: normal balance is DEBIT)
    // Cost = openingBalance + debits - credits
    const costBySubgroup: Record<string, any[]> = {};
    costAccounts.forEach((account) => {
      const subGroupName = account.subgroup.name;
      if (!costBySubgroup[subGroupName]) {
        costBySubgroup[subGroupName] = [];
      }
      const totalDebit = account.journalLines.reduce((sum, line) => sum + line.debit, 0);
      const totalCredit = account.journalLines.reduce((sum, line) => sum + line.credit, 0);
      
      // Cost balance: openingBalance + debits - credits
      const costAmount = calculateAccountBalance(
        account.openingBalance,
        totalDebit,
        totalCredit,
        'cost'
      );
      
      costBySubgroup[subGroupName].push({
        name: `${account.code}-${account.name}`,
        amount: costAmount > 0 ? costAmount : 0,
      });
    });
    
    Object.entries(costBySubgroup).forEach(([name, items]) => {
      costCategories.push({ name, items });
    });
    
    // Process expenses (Expense accounts: normal balance is DEBIT)
    // Expense = openingBalance + debits - credits
    const expenseBySubgroup: Record<string, any[]> = {};
    expenseAccounts.forEach((account) => {
      const subGroupName = account.subgroup.name;
      if (!expenseBySubgroup[subGroupName]) {
        expenseBySubgroup[subGroupName] = [];
      }
      const totalDebit = account.journalLines.reduce((sum, line) => sum + line.debit, 0);
      const totalCredit = account.journalLines.reduce((sum, line) => sum + line.credit, 0);
      
      // Expense balance: openingBalance + debits - credits
      const expenseAmount = calculateAccountBalance(
        account.openingBalance,
        totalDebit,
        totalCredit,
        'expense'
      );
      
      expenseBySubgroup[subGroupName].push({
        name: `${account.code}-${account.name}`,
        amount: expenseAmount > 0 ? expenseAmount : 0,
      });
    });
    
    Object.entries(expenseBySubgroup).forEach(([name, items]) => {
      expenseCategories.push({ name, items });
    });
    
    res.json({ 
      revenue: revenueCategories, 
      cost: costCategories,
      expenses: expenseCategories 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========== Recalculate All Account Balances ==========
router.post('/recalculate-balances', async (req: Request, res: Response) => {
  try {
    const accounts = await prisma.account.findMany({
      include: {
        subgroup: {
          include: {
            mainGroup: true,
          },
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

    // Recalculate all account balances from scratch
    for (const account of accounts) {
      const accountType = account.subgroup.mainGroup.type;
      const totalDebit = account.journalLines.reduce((sum, line) => sum + line.debit, 0);
      const totalCredit = account.journalLines.reduce((sum, line) => sum + line.credit, 0);
      
      const calculatedBalance = calculateAccountBalance(
        account.openingBalance,
        totalDebit,
        totalCredit,
        accountType
      );

      await prisma.account.update({
        where: { id: account.id },
        data: {
          currentBalance: calculatedBalance,
        },
      });
    }

    res.json({ 
      success: true, 
      message: `Recalculated balances for ${accounts.length} accounts` 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/balance-sheet', async (req: Request, res: Response) => {
  try {
    const { period, as_of_date } = req.query;
    
    // Build date filter if provided
    let dateFilter: any = {};
    if (as_of_date) {
      dateFilter.entryDate = { lte: new Date(as_of_date as string) };
    }
    
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
              ...dateFilter,
            },
          },
        },
      },
      orderBy: {
        code: 'asc',
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
              ...dateFilter,
            },
          },
        },
      },
      orderBy: {
        code: 'asc',
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
              ...dateFilter,
            },
          },
        },
      },
      orderBy: {
        code: 'asc',
      },
    });
    
    // Group by subgroup with proper balance calculations
    const processAccounts = (accounts: any[], accountType: string) => {
      const bySubgroup: Record<string, any[]> = {};
      
      accounts.forEach((account) => {
        const subgroupName = account.subgroup.name;
        const mainGroupName = account.subgroup.mainGroup.name;
        
        // Use subgroup name as category, or main group if subgroup is not meaningful
        const categoryName = subgroupName || mainGroupName;
        
        if (!bySubgroup[categoryName]) {
          bySubgroup[categoryName] = [];
        }
        
        const totalDebit = account.journalLines.reduce((sum: number, line: any) => sum + line.debit, 0);
        const totalCredit = account.journalLines.reduce((sum: number, line: any) => sum + line.credit, 0);
        
        // Calculate balance using proper accounting logic
        const balance = calculateAccountBalance(
          account.openingBalance,
          totalDebit,
          totalCredit,
          accountType
        );
        
        // For balance sheet:
        // - Assets: show positive balance (debit normal)
        // - Liabilities/Equity: show positive balance (credit normal, but we show as positive)
        const displayAmount = accountType === 'asset' 
          ? (balance > 0 ? balance : 0)  // Assets should be positive
          : (balance < 0 ? Math.abs(balance) : balance);  // Liabilities/Equity shown as positive
        
        // Format account name with code: "code-name"
        const accountDisplayName = `${account.code}-${account.name}`;
        
        // Include all accounts, even with zero balances
        bySubgroup[categoryName].push({
          name: accountDisplayName,
          amount: displayAmount,
        });
      });
      
      // Convert to array format expected by frontend, sorted by category name
      return Object.entries(bySubgroup)
        .map(([name, items]) => ({ 
          name, 
          items: items.sort((a, b) => a.name.localeCompare(b.name))
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    };
    
    res.json({
      assets: processAccounts(assetAccounts, 'asset'),
      liabilities: processAccounts(liabilityAccounts, 'liability'),
      equity: processAccounts(equityAccounts, 'equity'),
    });
  } catch (error: any) {
    console.error('Error fetching balance sheet:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;


