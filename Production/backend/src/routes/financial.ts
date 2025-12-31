import { Router, Request, Response } from 'express';
import prisma from '../config/database';

const router = Router();

// Helper function to format date
const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

// Get General Journal Entries
router.get('/general-journal', async (req: Request, res: Response) => {
  try {
    const { search_by, search, from_date, to_date, page = '1', limit = '10' } = req.query;
    
    // Query journal entries from database
    const where: any = {};
    
    // Date filter
    if (from_date || to_date) {
      where.journalEntry = {
        ...(from_date && { entryDate: { gte: new Date(from_date as string) } }),
        ...(to_date && { entryDate: { lte: new Date(to_date as string) } }),
      };
    }
    
    // Search filter
    if (search && search_by) {
      const searchValue = search as string;
      if (search_by === 'voucher') {
        where.journalEntry = {
          ...where.journalEntry,
          entryNo: { contains: searchValue, mode: 'insensitive' },
        };
      } else if (search_by === 'account') {
        where.account = {
          OR: [
            { code: { contains: searchValue, mode: 'insensitive' } },
            { name: { contains: searchValue, mode: 'insensitive' } },
          ],
        };
      } else if (search_by === 'description') {
        where.OR = [
          { description: { contains: searchValue, mode: 'insensitive' } },
          { journalEntry: { description: { contains: searchValue, mode: 'insensitive' } } },
        ];
      }
    }
    
    // Get journal lines with related data
    const journalLines = await prisma.journalLine.findMany({
      where,
      include: {
        journalEntry: true,
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
      orderBy: [
        { journalEntry: { entryDate: 'desc' } },
        { lineOrder: 'asc' },
      ],
    });
    
    // Transform to match frontend format
    const entries = journalLines.map((line, index) => ({
      id: index + 1,
      tId: line.journalEntryId,
      voucherNo: line.journalEntry.entryNo,
      date: formatDate(line.journalEntry.entryDate),
      account: `${line.account.code}-${line.account.name}`,
      description: line.description || line.journalEntry.description || '',
      debit: line.debit,
      credit: line.credit,
    }));
    
    // Apply client-side filters (for search that wasn't handled in query)
    let filteredEntries = entries;
    if (search && search_by === 'description') {
      const searchLower = (search as string).toLowerCase();
      filteredEntries = filteredEntries.filter(e => 
        e.description.toLowerCase().includes(searchLower)
      );
    }
    
    // Pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedEntries = filteredEntries.slice(startIndex, endIndex);

    res.json({
      data: paginatedEntries,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: filteredEntries.length,
        totalPages: Math.ceil(filteredEntries.length / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching general journal:', error);
    res.status(500).json({ error: 'Failed to fetch general journal entries' });
  }
});

// Get Trial Balance
router.get('/trial-balance', async (req: Request, res: Response) => {
  try {
    const { from_date, to_date } = req.query;
    
    // Query accounts from database
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
              ...(from_date && { entryDate: { gte: new Date(from_date as string) } }),
              ...(to_date && { entryDate: { lte: new Date(to_date as string) } }),
            },
          },
        },
      },
      orderBy: [
        { subgroup: { mainGroup: { displayOrder: 'asc' } } },
        { subgroup: { code: 'asc' } },
        { code: 'asc' },
      ],
    });
    
    // Calculate trial balance
    const trialBalance: any[] = [];
    
    // Group by main group, subgroup, and account
    const mainGroups = new Map();
    
    accounts.forEach(account => {
      const mainGroup = account.subgroup.mainGroup;
      const subgroup = account.subgroup;
      
      // Calculate totals from journal lines
      const totalDebit = account.journalLines.reduce((sum, line) => sum + (line.debit || 0), 0);
      const totalCredit = account.journalLines.reduce((sum, line) => sum + (line.credit || 0), 0);
      
      // Add main group if not exists
      if (!mainGroups.has(mainGroup.id)) {
        mainGroups.set(mainGroup.id, {
          code: mainGroup.code,
          name: mainGroup.name,
          debit: 0,
          credit: 0,
          isSubgroup: true,
          level: 0,
        });
      }
      
      // Add subgroup entry
      trialBalance.push({
        code: subgroup.code,
        name: subgroup.name,
        debit: totalDebit,
        credit: totalCredit,
        isSubgroup: true,
        level: 0,
      });
      
      // Add account entry
      trialBalance.push({
        code: account.code,
        name: account.name,
        debit: totalDebit,
        credit: totalCredit,
        isSubgroup: false,
        level: 1,
      });
      
      // Update main group totals
      const mainGroupEntry = mainGroups.get(mainGroup.id);
      mainGroupEntry.debit += totalDebit;
      mainGroupEntry.credit += totalCredit;
    });
    
    // Add main group entries at the beginning
    const mainGroupEntries = Array.from(mainGroups.values());
    trialBalance.unshift(...mainGroupEntries);
    
    res.json({ data: trialBalance });
  } catch (error) {
    console.error('Error fetching trial balance:', error);
    res.status(500).json({ error: 'Failed to fetch trial balance' });
  }
});

// Get Balance Sheet
router.get('/balance-sheet', async (req: Request, res: Response) => {
  try {
    const { as_of_date } = req.query;
    
    // Query accounts by type
    const assetAccounts = await prisma.account.findMany({
      where: {
        subgroup: {
          mainGroup: {
            type: { in: ['asset', 'Asset', 'ASSET'] },
          },
        },
      },
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
              ...(as_of_date && { entryDate: { lte: new Date(as_of_date as string) } }),
            },
          },
        },
      },
    });
    
    const liabilityAccounts = await prisma.account.findMany({
      where: {
        subgroup: {
          mainGroup: {
            type: { in: ['liability', 'Liability', 'LIABILITY'] },
          },
        },
      },
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
              ...(as_of_date && { entryDate: { lte: new Date(as_of_date as string) } }),
            },
          },
        },
      },
    });
    
    const equityAccounts = await prisma.account.findMany({
      where: {
        subgroup: {
          mainGroup: {
            type: { in: ['equity', 'Equity', 'EQUITY'] },
          },
        },
      },
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
              ...(as_of_date && { entryDate: { lte: new Date(as_of_date as string) } }),
            },
          },
        },
      },
    });
    
    // Calculate balances
    const calculateBalance = (account: any) => {
      const totalDebit = account.journalLines.reduce((sum: number, line: any) => sum + (line.debit || 0), 0);
      const totalCredit = account.journalLines.reduce((sum: number, line: any) => sum + (line.credit || 0), 0);
      return account.openingBalance + totalDebit - totalCredit;
    };
    
    const assets = assetAccounts.map(acc => ({
      code: acc.code,
      name: acc.name,
      balance: calculateBalance(acc),
      isSubgroup: false,
      level: 1,
    }));
    
    const liabilities = liabilityAccounts.map(acc => ({
      code: acc.code,
      name: acc.name,
      balance: calculateBalance(acc),
      isSubgroup: false,
      level: 1,
    }));
    
    const ownerEquity = equityAccounts.reduce((sum, acc) => sum + calculateBalance(acc), 0);

    res.json({ 
      data: {
        assets,
        liabilities,
        ownerEquity
      }
    });
  } catch (error) {
    console.error('Error fetching balance sheet:', error);
    res.status(500).json({ error: 'Failed to fetch balance sheet' });
  }
});

// Get Income Statement
router.get('/income-statement', async (req: Request, res: Response) => {
  try {
    const { from_date, to_date } = req.query;
    
    // Query revenue accounts
    const revenueAccounts = await prisma.account.findMany({
      where: {
        subgroup: {
          mainGroup: {
            type: { in: ['revenue', 'Revenue', 'REVENUE'] },
          },
        },
      },
      include: {
        journalLines: {
          where: {
            journalEntry: {
              status: 'posted',
              ...(from_date && { entryDate: { gte: new Date(from_date as string) } }),
              ...(to_date && { entryDate: { lte: new Date(to_date as string) } }),
            },
          },
        },
      },
    });
    
    // Query cost accounts
    const costAccounts = await prisma.account.findMany({
      where: {
        subgroup: {
          mainGroup: {
            type: { in: ['cost', 'Cost', 'COST', 'cogs', 'COGS'] },
          },
        },
      },
      include: {
        journalLines: {
          where: {
            journalEntry: {
              status: 'posted',
              ...(from_date && { entryDate: { gte: new Date(from_date as string) } }),
              ...(to_date && { entryDate: { lte: new Date(to_date as string) } }),
            },
          },
        },
      },
    });
    
    // Query expense accounts
    const expenseAccounts = await prisma.account.findMany({
      where: {
        subgroup: {
          mainGroup: {
            type: { in: ['expense', 'Expense', 'EXPENSE'] },
          },
        },
      },
      include: {
        journalLines: {
          where: {
            journalEntry: {
              status: 'posted',
              ...(from_date && { entryDate: { gte: new Date(from_date as string) } }),
              ...(to_date && { entryDate: { lte: new Date(to_date as string) } }),
            },
          },
        },
      },
    });
    
    // Calculate amounts
    const calculateAmount = (account: any) => {
      const totalDebit = account.journalLines.reduce((sum: number, line: any) => sum + (line.debit || 0), 0);
      const totalCredit = account.journalLines.reduce((sum: number, line: any) => sum + (line.credit || 0), 0);
      return totalCredit - totalDebit; // Revenue/Cost/Expense: credit - debit
    };
    
    const revenue = revenueAccounts.map(acc => ({
      code: acc.code,
      name: acc.name,
      amount: calculateAmount(acc),
      level: 0,
    }));
    
    const cost = costAccounts.map(acc => ({
      code: acc.code,
      name: acc.name,
      amount: calculateAmount(acc),
      level: 0,
    }));
    
    const expenses = expenseAccounts.map(acc => ({
      code: acc.code,
      name: acc.name,
      amount: calculateAmount(acc),
      level: 0,
    }));

    res.json({ 
      data: {
        revenue,
        cost,
        expenses
      }
    });
  } catch (error) {
    console.error('Error fetching income statement:', error);
    res.status(500).json({ error: 'Failed to fetch income statement' });
  }
});

// Get Ledgers
router.get('/ledgers', async (req: Request, res: Response) => {
  try {
    const { main_group, sub_group, account, from_date, to_date, page = '1', limit = '10' } = req.query;
    
    // Build where clause for account filter
    const accountWhere: any = {};
    if (main_group) {
      accountWhere.subgroup = {
        mainGroup: { code: main_group as string },
      };
    }
    if (sub_group) {
      accountWhere.subgroup = {
        ...accountWhere.subgroup,
        code: sub_group as string,
      };
    }
    if (account) {
      accountWhere.code = account as string;
    }
    
    // Get accounts
    const accounts = await prisma.account.findMany({
      where: accountWhere,
      include: {
        journalLines: {
          where: {
            journalEntry: {
              status: 'posted',
              ...(from_date && { entryDate: { gte: new Date(from_date as string) } }),
              ...(to_date && { entryDate: { lte: new Date(to_date as string) } }),
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
    
    // Transform to ledger entries format
    const ledgerEntries: any[] = [];
    
    accounts.forEach(acc => {
      // Add opening balance entry
      ledgerEntries.push({
        id: `opening-${acc.id}`,
        tId: null,
        voucherNo: '-',
        timeStamp: '-',
        description: 'Opening Balance',
        debit: acc.openingBalance > 0 ? acc.openingBalance : null,
        credit: acc.openingBalance < 0 ? Math.abs(acc.openingBalance) : null,
        balance: acc.openingBalance,
      });
      
      // Add journal line entries
      let runningBalance = acc.openingBalance;
      acc.journalLines.forEach((line, index) => {
        runningBalance += (line.debit || 0) - (line.credit || 0);
        ledgerEntries.push({
          id: `line-${line.id}`,
          tId: line.journalEntryId,
          voucherNo: line.journalEntry.entryNo,
          timeStamp: line.journalEntry.entryDate.toISOString().replace('T', ' ').substring(0, 19),
          description: line.description || line.journalEntry.description || '',
          debit: line.debit > 0 ? line.debit : null,
          credit: line.credit > 0 ? line.credit : null,
          balance: runningBalance,
        });
      });
    });
    
    // Pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedEntries = ledgerEntries.slice(startIndex, endIndex);

    res.json({
      data: paginatedEntries,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: ledgerEntries.length,
        totalPages: Math.ceil(ledgerEntries.length / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching ledgers:', error);
    res.status(500).json({ error: 'Failed to fetch ledger entries' });
  }
});

// Get Account Groups (for dropdowns)
router.get('/account-groups', async (req: Request, res: Response) => {
  try {
    // Query from database
    const mainGroups = await prisma.mainGroup.findMany({
      orderBy: { displayOrder: 'asc' },
    });
    
    const subGroups = await prisma.subgroup.findMany({
      include: { mainGroup: true },
      orderBy: { code: 'asc' },
    });
    
    const accounts = await prisma.account.findMany({
      include: { subgroup: true },
      orderBy: { code: 'asc' },
    });

    res.json({
      data: {
        mainGroups: mainGroups.map(mg => ({
          id: mg.id,
          name: `${mg.code}-${mg.name}`,
        })),
        subGroups: subGroups.map(sg => ({
          id: sg.id,
          name: `${sg.code}-${sg.name}`,
          mainGroup: sg.mainGroup.code,
        })),
        accounts: accounts.map(acc => ({
          id: acc.id,
          name: `${acc.code}-${acc.name}`,
          subGroup: acc.subgroup.code,
        })),
      }
    });
  } catch (error) {
    console.error('Error fetching account groups:', error);
    res.status(500).json({ error: 'Failed to fetch account groups' });
  }
});

export default router;

