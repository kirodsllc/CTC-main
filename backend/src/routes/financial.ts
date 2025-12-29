import { Router, Request, Response } from 'express';

const router = Router();

// Helper function to format date
const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

// Get General Journal Entries
router.get('/general-journal', async (req: Request, res: Response) => {
  try {
    const { search_by, search, from_date, to_date, page = '1', limit = '10' } = req.query;
    
    // Mock data - in production, this would query the database
    const mockEntries = [
      {
        id: 1,
        tId: 1,
        voucherNo: 'JV-001',
        date: '2025-12-15',
        account: '101001-Inventory',
        description: 'Purchase of goods',
        debit: 50000,
        credit: 0
      },
      {
        id: 2,
        tId: 1,
        voucherNo: 'JV-001',
        date: '2025-12-15',
        account: '301158-sakhawat',
        description: 'Purchase of goods',
        debit: 0,
        credit: 50000
      },
      {
        id: 3,
        tId: 2,
        voucherNo: 'PV-100',
        date: '2025-12-16',
        account: '301158-sakhawat',
        description: 'Payment to supplier',
        debit: 30000,
        credit: 0
      },
      {
        id: 4,
        tId: 2,
        voucherNo: 'PV-100',
        date: '2025-12-16',
        account: '102008-cash',
        description: 'Payment to supplier',
        debit: 0,
        credit: 30000
      },
      {
        id: 5,
        tId: 3,
        voucherNo: 'RV-200',
        date: '2025-12-17',
        account: '102008-cash',
        description: 'Receipt from customer',
        debit: 75000,
        credit: 0
      },
      {
        id: 6,
        tId: 3,
        voucherNo: 'RV-200',
        date: '2025-12-17',
        account: '104042-ammar',
        description: 'Receipt from customer',
        debit: 0,
        credit: 75000
      }
    ];

    let filteredEntries = [...mockEntries];

    // Apply filters
    if (from_date) {
      filteredEntries = filteredEntries.filter(e => e.date >= from_date as string);
    }
    if (to_date) {
      filteredEntries = filteredEntries.filter(e => e.date <= to_date as string);
    }
    if (search && search_by) {
      const searchLower = (search as string).toLowerCase();
      filteredEntries = filteredEntries.filter(e => {
        if (search_by === 'voucher') {
          return e.voucherNo.toLowerCase().includes(searchLower);
        } else if (search_by === 'account') {
          return e.account.toLowerCase().includes(searchLower);
        } else if (search_by === 'description') {
          return e.description.toLowerCase().includes(searchLower);
        }
        return true;
      });
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
    
    // Mock data
    const mockTrialBalance = [
      { code: '101', name: 'Inventory', debit: 50000, credit: 0, isSubgroup: true, level: 0 },
      { code: '101001', name: 'Inventory', debit: 50000, credit: 0, isSubgroup: false, level: 1 },
      { code: '102', name: 'Cash', debit: 45000, credit: 0, isSubgroup: true, level: 0 },
      { code: '102008', name: 'cash', debit: 45000, credit: 0, isSubgroup: false, level: 1 },
      { code: '103', name: 'Bank', debit: 0, credit: 0, isSubgroup: true, level: 0 },
      { code: '103015', name: 'JAZCASH', debit: 0, credit: 0, isSubgroup: false, level: 1 },
      { code: '104', name: 'Sales Customer Receivables', debit: 0, credit: 25000, isSubgroup: true, level: 0 },
      { code: '104042', name: 'ammar', debit: 0, credit: 25000, isSubgroup: false, level: 1 },
      { code: '301', name: 'Purchase Orders Payables', debit: 0, credit: 30000, isSubgroup: true, level: 0 },
      { code: '301158', name: 'sakhawat', debit: 0, credit: 30000, isSubgroup: false, level: 1 },
      { code: '501', name: 'Owner Equity', debit: 0, credit: 40000, isSubgroup: true, level: 0 },
      { code: '501003', name: 'OWNER CAPITAL', debit: 0, credit: 40000, isSubgroup: false, level: 1 }
    ];

    res.json({ data: mockTrialBalance });
  } catch (error) {
    console.error('Error fetching trial balance:', error);
    res.status(500).json({ error: 'Failed to fetch trial balance' });
  }
});

// Get Balance Sheet
router.get('/balance-sheet', async (req: Request, res: Response) => {
  try {
    const { as_of_date } = req.query;
    
    // Mock data
    const assets = [
      { code: '101', name: 'Inventory', balance: 50000, isSubgroup: true, level: 0 },
      { code: '101001', name: 'Inventory', balance: 50000, isSubgroup: false, level: 1 },
      { code: '102', name: 'Cash', balance: 45000, isSubgroup: true, level: 0 },
      { code: '102008', name: 'cash', balance: 45000, isSubgroup: false, level: 1 },
      { code: '103', name: 'Bank', balance: 0, isSubgroup: true, level: 0 },
      { code: '103015', name: 'JAZCASH', balance: 0, isSubgroup: false, level: 1 }
    ];

    const liabilities = [
      { code: '301', name: 'Purchase Orders Payables', balance: 30000, isSubgroup: true, level: 0 },
      { code: '301158', name: 'sakhawat', balance: 30000, isSubgroup: false, level: 1 },
      { code: '104', name: 'Sales Customer Receivables', balance: -25000, isSubgroup: true, level: 0 },
      { code: '104042', name: 'ammar', balance: -25000, isSubgroup: false, level: 1 }
    ];

    res.json({ 
      data: {
        assets,
        liabilities,
        ownerEquity: 40000
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
    
    // Mock data
    const revenueAccounts = [
      { code: '701001', name: 'Goods Sold', amount: 100000, level: 0 },
      { code: '701002', name: 'Goods Sold (Discounts)', amount: -5000, level: 0 }
    ];

    const costAccounts = [
      { code: '901001', name: 'Cost Inventory', amount: 60000, level: 0 },
      { code: '901002', name: 'Cost Inventory (Discounts)', amount: -2000, level: 0 }
    ];

    const expenseAccounts = [
      { code: '801002', name: 'Purchase Tax Expense', amount: 5000, level: 0 },
      { code: '801014', name: 'Dispose Inventory', amount: 3000, level: 0 }
    ];

    res.json({ 
      data: {
        revenue: revenueAccounts,
        cost: costAccounts,
        expenses: expenseAccounts
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
    
    // Mock data
    const mockLedgerEntries = [
      {
        id: 1,
        tId: null,
        voucherNo: '-',
        timeStamp: '-',
        description: 'Opening Balance',
        debit: null,
        credit: null,
        balance: 0
      },
      {
        id: 2,
        tId: 1,
        voucherNo: 'JV-001',
        timeStamp: '2025-12-15 10:30:00',
        description: 'Purchase of goods',
        debit: 50000,
        credit: null,
        balance: 50000
      },
      {
        id: 3,
        tId: 2,
        voucherNo: 'PV-100',
        timeStamp: '2025-12-16 14:20:00',
        description: 'Payment to supplier',
        debit: null,
        credit: 30000,
        balance: 20000
      }
    ];

    let filteredEntries = [...mockLedgerEntries];

    // Apply filters
    if (from_date) {
      filteredEntries = filteredEntries.filter(e => {
        if (e.timeStamp === '-') return true;
        return e.timeStamp >= from_date as string;
      });
    }
    if (to_date) {
      filteredEntries = filteredEntries.filter(e => {
        if (e.timeStamp === '-') return true;
        return e.timeStamp <= to_date as string;
      });
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
    console.error('Error fetching ledgers:', error);
    res.status(500).json({ error: 'Failed to fetch ledger entries' });
  }
});

// Get Account Groups (for dropdowns)
router.get('/account-groups', async (req: Request, res: Response) => {
  try {
    const mainGroups = [
      { id: '1', name: '1-Current Assets' },
      { id: '2', name: '2-Long Term Assets' },
      { id: '3', name: '3-Current Liabilities' },
      { id: '4', name: '4-Long Term Liabilities' },
      { id: '5', name: '5-Equity' },
      { id: '7', name: '7-Revenue' },
      { id: '8', name: '8-Expenses' },
      { id: '9', name: '9-Cost of Goods Sold' }
    ];

    const subGroups = [
      { id: '101', name: '101-Inventory', mainGroup: '1' },
      { id: '102', name: '102-Cash', mainGroup: '1' },
      { id: '103', name: '103-Bank', mainGroup: '1' },
      { id: '104', name: '104-Sales Customer Receivables', mainGroup: '1' },
      { id: '301', name: '301-Purchase Orders Payables', mainGroup: '3' },
      { id: '302', name: '302-Purchase expenses Payables', mainGroup: '3' },
      { id: '501', name: '501-Owner Equity', mainGroup: '5' }
    ];

    const accounts = [
      { id: '101001', name: '101001-Inventory', subGroup: '101' },
      { id: '102008', name: '102008-cash', subGroup: '102' },
      { id: '103015', name: '103015-JAZCASH', subGroup: '103' },
      { id: '104042', name: '104042-ammar', subGroup: '104' },
      { id: '301158', name: '301158-sakhawat', subGroup: '301' },
      { id: '302006', name: '302006-SHIPPING ACCOUNT', subGroup: '302' },
      { id: '501003', name: '501003-OWNER CAPITAL', subGroup: '501' }
    ];

    res.json({
      data: {
        mainGroups,
        subGroups,
        accounts
      }
    });
  } catch (error) {
    console.error('Error fetching account groups:', error);
    res.status(500).json({ error: 'Failed to fetch account groups' });
  }
});

export default router;

