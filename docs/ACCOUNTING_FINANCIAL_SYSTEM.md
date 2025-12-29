# Accounting & Financial Statements System Documentation

## Overview

The Accounting & Financial Statements System provides comprehensive double-entry bookkeeping functionality including Chart of Accounts management, Journal Entries, General Ledger, Trial Balance, and Financial Statements (Income Statement and Balance Sheet). The system follows standard accounting principles and provides real-time financial reporting.

---

## Module Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      ACCOUNTING & FINANCIAL SYSTEM                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │                         CHART OF ACCOUNTS                                  │ │
│  ├────────────┬────────────────┬─────────────────────────────────────────────┤ │
│  │ Main Groups │   Subgroups    │              Accounts                       │ │
│  │ (Level 1)   │   (Level 2)    │              (Level 3)                      │ │
│  └────────────┴────────────────┴─────────────────────────────────────────────┘ │
│                                    │                                            │
│                                    ▼                                            │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │                         TRANSACTION LAYER                                  │ │
│  ├─────────────────────────────────┬──────────────────────────────────────────┤ │
│  │       Journal Entries           │          General Ledger                  │ │
│  │       (Record)                  │          (Account History)               │ │
│  └─────────────────────────────────┴──────────────────────────────────────────┘ │
│                                    │                                            │
│                                    ▼                                            │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │                         FINANCIAL REPORTS                                  │ │
│  ├────────────┬────────────────┬────────────────┬─────────────────────────────┤ │
│  │   Trial    │    Income      │    Balance     │       Daily                 │ │
│  │   Balance  │    Statement   │    Sheet       │       Closing               │ │
│  └────────────┴────────────────┴────────────────┴─────────────────────────────┘ │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Main Container Component

### ChartOfAccounts.tsx

**Location:** `src/components/accounting/ChartOfAccounts.tsx`

**Purpose:** Central navigation hub managing all accounting tabs.

#### Tab Navigation
| Tab | Component | Description |
|-----|-----------|-------------|
| Main Groups | MainGroupsTab | Top-level account categories |
| Subgroups | SubgroupsTab | Second-level account groups |
| Accounts | AccountsTab | Individual accounts |
| Journal Entries | JournalEntriesTab | Transaction recording |
| General Ledger | GeneralLedgerTab | Account transaction history |
| Trial Balance | TrialBalanceTab | Debit/Credit verification |
| Income Statement | IncomeStatementTab | Profit & Loss report |
| Balance Sheet | BalanceSheetTab | Financial position |
| Daily Closing | DailyClosingTab | End-of-day reports |

---

## Chart of Accounts Components

### 1. MainGroupsTab.tsx

**Location:** `src/components/accounting/MainGroupsTab.tsx`

**Purpose:** Manage top-level account categories.

#### Data Structure
```typescript
interface MainGroup {
  id: string;
  code: string;
  name: string;
}
```

#### Main Group Categories
| Code | Name | Type |
|------|------|------|
| 1 | Current Assets | Asset |
| 2 | Long Term Assets | Asset |
| 3 | Current Liabilities | Liability |
| 4 | Long Term Liabilities | Liability |
| 5 | Capital | Equity |
| 6 | Drawings | Equity |
| 7 | Revenues | Revenue |
| 8 | Expenses | Expense |
| 9 | Cost | Cost |

#### Button Functions
| Button | Function | Action |
|--------|----------|--------|
| View Chart of Accounts | `handleViewChartOfAccounts()` | Displays full chart |
| Save PDF Chart of Accounts | `handleSavePdf()` | Exports chart to PDF |
| Select All | `handleSelectAll()` | Selects all items |

---

### 2. SubgroupsTab.tsx

**Location:** `src/components/accounting/SubgroupsTab.tsx`

**Purpose:** Manage second-level account groups under main groups.

#### Data Structure
```typescript
interface Subgroup {
  id: string;
  mainGroup: string;
  code: string;
  name: string;
  isActive: boolean;
  canDelete: boolean;
}
```

#### Subgroup Mapping
| Main Group | Subgroups |
|------------|-----------|
| Current Assets | 101-Inventory, 102-Cash, 103-Bank, 104-Sales Customer Receivables, 108-BANK ACCOUNT |
| Long Term Assets | 206-SHOP INVESTMENT |
| Current Liabilities | 301-Purchase Orders Payables, 302-Purchase Expenses Payables, 303-Salaries |
| Long Term Liabilities | 304-Other Payables |
| Capital | 501-Owner's Equity |
| Drawings | 601-Owner Drawings |
| Revenues | 701-Sales Revenue |
| Expenses | 801-Operating Expenses |
| Cost | 901-Cost of Goods Sold |

#### Button Functions
| Button | Function | Action |
|--------|----------|--------|
| Add New Subgroup | `handleAddSubgroup()` | Opens add dialog |
| Edit | `handleEditSubgroup(subgroup)` | Opens edit dialog |
| Delete | `handleDeleteSubgroup(id)` | Removes subgroup |
| Save | `handleAddSubgroup()` / `handleUpdateSubgroup()` | Saves changes |
| Reset | `handleReset()` | Clears form |

#### Filters
- **Main Group** - Filter by parent group
- **Status** - Filter by Active/Inactive

---

### 3. AccountsTab.tsx

**Location:** `src/components/accounting/AccountsTab.tsx`

**Purpose:** Manage individual accounts within subgroups.

#### Data Structure
```typescript
interface Account {
  id: string;
  group: string;         // e.g., "1-Current Assets"
  subGroup: string;      // e.g., "102-Cash"
  code: string;          // Account code
  name: string;          // Account name
  status: "Active" | "Inactive";
  canDelete: boolean;
}
```

#### Account Types
Two types of accounts can be created:
1. **Regular Account** - Standard accounting account
2. **Person's Account** - Customer/Supplier individual accounts

#### Button Functions
| Button | Function | Action |
|--------|----------|--------|
| Add New Account | Opens account dialog | Creates standard account |
| Add New Person's Account | Opens person dialog | Creates individual account |
| Edit | `handleEditAccount(account)` | Opens edit dialog |
| Delete | `handleDeleteAccount(id)` | Removes account |
| Export to CSV | Dropdown action | Exports data |
| Print List | Dropdown action | Prints account list |
| View Details | Dropdown action | Shows account details |
| View Transactions | Dropdown action | Shows account transactions |

#### Filters
- **Main Group** - Filter by top-level group
- **Sub Group** - Filter by subgroup
- **Status** - Filter by Active/Inactive

---

## Transaction Components

### 4. JournalEntriesTab.tsx

**Location:** `src/components/accounting/JournalEntriesTab.tsx`

**Purpose:** Record double-entry journal transactions.

#### Data Structures
```typescript
interface JournalLine {
  id: string;
  accountCode: string;
  accountName: string;
  description: string;
  debit: number;
  credit: number;
}

interface JournalEntry {
  id: string;
  entryNo: string;        // Auto-generated: JV-2024-XXX
  date: string;
  reference: string;
  description: string;
  lines: JournalLine[];
  totalDebit: number;
  totalCredit: number;
  status: "draft" | "posted" | "reversed";
  createdBy: string;
  createdAt: string;
}
```

#### Available Accounts
| Code | Name |
|------|------|
| 1001 | Cash in Hand |
| 1002 | Bank Account |
| 1100 | Accounts Receivable |
| 1200 | Inventory |
| 2001 | Accounts Payable |
| 3001 | Owner's Equity |
| 4001 | Sales Revenue |
| 5001 | Cost of Goods Sold |
| 6001 | Salaries Expense |
| 6002 | Rent Expense |
| 6003 | Utilities Expense |

#### Status Badges
| Status | Badge | Description |
|--------|-------|-------------|
| posted | Success (Green) | Entry recorded in ledger |
| draft | Secondary (Gray) | Pending approval |
| reversed | Destructive (Red) | Entry reversed |

#### Button Functions
| Button | Function | Action |
|--------|----------|--------|
| New Entry | Opens create dialog | Start new journal entry |
| Add Line | `addJournalLine()` | Add transaction line |
| Remove Line | `removeJournalLine(id)` | Remove transaction line |
| Create Entry | `handleCreateEntry()` | Save as draft (validates balance) |
| Post | `postEntry(entryId)` | Post to General Ledger |
| View | Opens view dialog | View entry details |

#### Validation Rules
- **Balance Check**: Total Debit must equal Total Credit
- **Minimum Lines**: At least 2 lines required
- **Account Required**: Each line must have an account selected

---

### 5. GeneralLedgerTab.tsx

**Location:** `src/components/accounting/GeneralLedgerTab.tsx`

**Purpose:** View transaction history for each account with running balances.

#### Data Structures
```typescript
interface LedgerTransaction {
  id: string;
  date: string;
  journalNo: string;
  reference: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

interface LedgerAccount {
  code: string;
  name: string;
  type: "asset" | "liability" | "equity" | "revenue" | "expense";
  openingBalance: number;
  currentBalance: number;
  transactions: LedgerTransaction[];
}
```

#### Account Type Colors
| Type | Color |
|------|-------|
| Asset | bg-info/10 text-info |
| Liability | bg-warning/10 text-warning |
| Equity | bg-chart-purple/10 text-chart-purple |
| Revenue | bg-success/10 text-success |
| Expense | bg-destructive/10 text-destructive |

#### Summary Cards
| Card | Description |
|------|-------------|
| Total Assets | Sum of all asset account balances |
| Total Liabilities | Sum of all liability account balances |
| Total Equity | Sum of all equity account balances |
| Total Revenue | Sum of all revenue account balances |
| Total Expenses | Sum of all expense account balances |

#### Button Functions
| Button | Function | Action |
|--------|----------|--------|
| Expand All | `expandAll()` | Shows all account transactions |
| Collapse All | `collapseAll()` | Hides all transactions |
| Export | Export function | Export ledger data |
| Account Row | `toggleAccount(code)` | Toggle account expansion |

#### Filters
- **Search** - Search by account code or name
- **Type** - Filter by account type
- **Date From/To** - Filter by date range

---

## Financial Reports Components

### 6. TrialBalanceTab.tsx

**Location:** `src/components/accounting/TrialBalanceTab.tsx`

**Purpose:** Verify that total debits equal total credits across all accounts.

#### Data Structure
```typescript
interface TrialBalanceRow {
  accountCode: string;
  accountName: string;
  accountType: string;
  debit: number;
  credit: number;
}
```

#### Summary Statistics
| Metric | Description | Color |
|--------|-------------|-------|
| Total Debits | Sum of all debit balances | Blue |
| Total Credits | Sum of all credit balances | Green |
| Status | Balanced/Unbalanced | Emerald/Red |
| Difference | Absolute difference | Purple |

#### Account Type Colors
| Type | Color |
|------|-------|
| Asset | bg-blue-500/10 text-blue-600 |
| Liability | bg-red-500/10 text-red-600 |
| Equity | bg-purple-500/10 text-purple-600 |
| Revenue | bg-green-500/10 text-green-600 |
| Expense | bg-orange-500/10 text-orange-600 |

#### Button Functions
| Button | Function | Action |
|--------|----------|--------|
| Period Select | `setPeriod()` | Select reporting period |
| Filter Type | `setFilterType()` | Filter by account type |
| Print | Print function | Print trial balance |
| Export | Export function | Export to file |

---

### 7. IncomeStatementTab.tsx

**Location:** `src/components/accounting/IncomeStatementTab.tsx`

**Purpose:** Display Profit & Loss statement showing revenues, expenses, and net income.

#### Data Structure
```typescript
interface IncomeCategory {
  name: string;
  items: { name: string; amount: number }[];
}
```

#### Revenue Categories
- Operating Revenue (Sales, Service Revenue)
- Other Income (Interest, Miscellaneous)

#### Expense Categories
- Cost of Goods Sold (Purchases, Freight)
- Operating Expenses (Salaries, Rent, Utilities, etc.)
- Financial Expenses (Bank Charges, Interest)

#### Summary Statistics
| Metric | Description | Color |
|--------|-------------|-------|
| Total Revenue | Sum of all revenues | Green |
| Total Expenses | Sum of all expenses | Red |
| Net Income | Revenue - Expenses | Emerald/Orange |
| Profit Margin | (Net Income / Revenue) × 100 | Purple |

#### Key Calculations
| Metric | Formula |
|--------|---------|
| Gross Profit | Operating Revenue - COGS |
| Operating Income | Gross Profit - Operating Expenses |
| Net Income | Total Revenue - Total Expenses |
| Profit Margin | (Net Income / Total Revenue) × 100% |

#### Button Functions
| Button | Function | Action |
|--------|----------|--------|
| Period Select | `setPeriod()` | Select reporting period |
| Toggle Revenue | `toggleRevenue(name)` | Expand/collapse category |
| Toggle Expense | `toggleExpense(name)` | Expand/collapse category |
| Print | Print function | Print income statement |
| Export | Export function | Export to file |

---

### 8. BalanceSheetTab.tsx

**Location:** `src/components/accounting/BalanceSheetTab.tsx`

**Purpose:** Display Statement of Financial Position showing assets, liabilities, and equity.

#### Data Structure
```typescript
interface BalanceCategory {
  name: string;
  items: { name: string; amount: number }[];
}
```

#### Assets Categories
- Current Assets (Cash, Inventory, Receivables)
- Non-Current Assets (Equipment, Vehicles)
- Intangible Assets (Goodwill)

#### Liabilities Categories
- Current Liabilities (Payables, Short-term Loans)
- Long-term Liabilities (Long-term Loans)

#### Equity Categories
- Owner's Equity (Capital, Retained Earnings)

#### Summary Statistics
| Metric | Description | Color |
|--------|-------------|-------|
| Total Assets | Sum of all assets | Blue |
| Total Liabilities | Sum of all liabilities | Red |
| Total Equity | Sum of all equity | Green |
| Current Ratio | Current Assets / Current Liabilities | Emerald/Orange |

#### Balance Check
- **Balanced**: Assets = Liabilities + Equity (Green indicator)
- **Unbalanced**: Shows difference amount (Red indicator)

#### Button Functions
| Button | Function | Action |
|--------|----------|--------|
| Period Select | `setPeriod()` | Select reporting period |
| Toggle Section | `toggleSection(name, type)` | Expand/collapse category |
| Print | Print function | Print balance sheet |
| Export | Export function | Export to file |

---

### 9. DailyClosingTab.tsx

**Location:** `src/components/accounting/DailyClosingTab.tsx`

**Purpose:** Generate daily closing and brand-wise sales reports.

#### Daily Closing Report
| Field | Type | Description |
|-------|------|-------------|
| Date | Date | Closing date |
| Account | Select | Cash/Bank account |

#### Available Accounts
- JAZCASH
- EASYPAISA
- BANK ALFALAH
- HBL
- CASH

#### Brand Wise Sales Report
| Field | Type | Description |
|-------|------|-------------|
| Shop | Select | Store location |
| Sale Type | Select | Customer type |
| Customer Name | Text | Customer filter |
| Brand | Select | Product brand |
| From/To Date | Date | Date range |

#### Button Functions
| Button | Function | Action |
|--------|----------|--------|
| View PDF | `handleViewClosingPDF()` | Generate daily closing PDF |
| Generate PDF | `handleGenerateBrandPDF()` | Generate brand-wise PDF |

---

## Workflow Diagrams

### Chart of Accounts Hierarchy

<presentation-mermaid>
flowchart TD
    subgraph MainGroups[Main Groups Level 1]
        MG1[Current Assets]
        MG2[Long Term Assets]
        MG3[Current Liabilities]
        MG4[Long Term Liabilities]
        MG5[Capital]
        MG6[Revenues]
        MG7[Expenses]
    end
    
    subgraph Subgroups[Subgroups Level 2]
        SG1[101-Inventory]
        SG2[102-Cash]
        SG3[103-Bank]
        SG4[301-Payables]
        SG5[501-Equity]
        SG6[701-Sales Revenue]
        SG7[801-Operating Expenses]
    end
    
    subgraph Accounts[Accounts Level 3]
        A1[Cash in Hand]
        A2[Bank Account]
        A3[Accounts Receivable]
        A4[Accounts Payable]
        A5[Sales Revenue]
        A6[Rent Expense]
    end
    
    MG1 --> SG1
    MG1 --> SG2
    MG1 --> SG3
    MG3 --> SG4
    MG5 --> SG5
    MG6 --> SG6
    MG7 --> SG7
    
    SG2 --> A1
    SG3 --> A2
    SG4 --> A4
    SG6 --> A5
    SG7 --> A6
</presentation-mermaid>

### Journal Entry Creation Workflow

<presentation-mermaid>
flowchart TD
    A[Start] --> B[Click New Entry]
    B --> C[Enter Date, Reference, Description]
    C --> D[Add Journal Lines]
    D --> E{Minimum 2 Lines?}
    E -->|No| D
    E -->|Yes| F[Enter Accounts, Debits, Credits]
    F --> G{Debits = Credits?}
    G -->|No| H[Show Unbalanced Warning]
    H --> F
    G -->|Yes| I[Click Create Entry]
    I --> J[Save as Draft]
    J --> K{Post Entry?}
    K -->|Yes| L[Click Post]
    L --> M[Update General Ledger]
    M --> N[Entry Status: Posted]
    K -->|No| O[Entry Status: Draft]
    N --> P[End]
    O --> P
</presentation-mermaid>

### Financial Reporting Data Flow

<presentation-mermaid>
flowchart LR
    subgraph Transactions
        T1[Journal Entries]
        T2[Vouchers]
        T3[Sales Invoices]
        T4[Purchase Orders]
        T5[Expenses]
    end
    
    subgraph Ledger
        GL[General Ledger]
    end
    
    subgraph Reports
        TB[Trial Balance]
        IS[Income Statement]
        BS[Balance Sheet]
    end
    
    T1 --> GL
    T2 --> GL
    T3 --> GL
    T4 --> GL
    T5 --> GL
    
    GL --> TB
    TB --> IS
    TB --> BS
</presentation-mermaid>

### Trial Balance Verification Workflow

<presentation-mermaid>
flowchart TD
    A[Start] --> B[Select Period]
    B --> C[Load Account Balances]
    C --> D[Calculate Total Debits]
    D --> E[Calculate Total Credits]
    E --> F{Debits = Credits?}
    F -->|Yes| G[Display Balanced Status]
    G --> H[Show Green Indicator]
    F -->|No| I[Display Unbalanced Status]
    I --> J[Calculate Difference]
    J --> K[Show Red Indicator]
    H --> L[Generate Report]
    K --> M[Investigate Discrepancy]
    M --> L
    L --> N[End]
</presentation-mermaid>

---

## Inter-Module Relationships

### Accounting Module Connections

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              ACCOUNTING SYSTEM                                │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│   ACCOUNTING MODULE                       RELATED MODULES                     │
│   ┌─────────────────┐                                                        │
│   │  Chart of       │          ┌──────────────────────────────────────┐      │
│   │  Accounts       │◀────────▶│  Voucher Management                  │      │
│   │                 │          │  - Payment vouchers create entries   │      │
│   └────────┬────────┘          │  - Receipt vouchers create entries   │      │
│            │                   │  - Journal vouchers create entries   │      │
│            ▼                   └──────────────────────────────────────┘      │
│   ┌─────────────────┐                                                        │
│   │  Journal        │          ┌──────────────────────────────────────┐      │
│   │  Entries        │◀────────▶│  Sales & Invoicing                   │      │
│   │                 │          │  - Invoices create revenue entries   │      │
│   └────────┬────────┘          │  - Returns create adjustment entries │      │
│            │                   └──────────────────────────────────────┘      │
│            ▼                                                                  │
│   ┌─────────────────┐          ┌──────────────────────────────────────┐      │
│   │  General        │◀────────▶│  Inventory Management                │      │
│   │  Ledger         │          │  - Stock adjustments affect inventory│      │
│   │                 │          │  - Purchases affect payables         │      │
│   └────────┬────────┘          └──────────────────────────────────────┘      │
│            │                                                                  │
│            ▼                                                                  │
│   ┌─────────────────┐          ┌──────────────────────────────────────┐      │
│   │  Trial          │◀────────▶│  Expenses Management                 │      │
│   │  Balance        │          │  - Posted expenses create entries    │      │
│   │                 │          │  - Expense types map to accounts     │      │
│   └────────┬────────┘          └──────────────────────────────────────┘      │
│            │                                                                  │
│            ▼                                                                  │
│   ┌─────────────────┐          ┌──────────────────────────────────────┐      │
│   │  Financial      │─────────▶│  Reports & Analytics                 │      │
│   │  Statements     │          │  - Income Statement feeds reports    │      │
│   │                 │          │  - Balance Sheet for analysis        │      │
│   └─────────────────┘          └──────────────────────────────────────┘      │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Double-Entry Accounting Flow

<presentation-mermaid>
flowchart TB
    subgraph Transactions
        T1[Sales Invoice Created]
        T2[Payment Received]
        T3[Purchase Made]
        T4[Expense Posted]
    end
    
    subgraph JournalEntries
        JE1[Dr: Receivables<br>Cr: Sales Revenue]
        JE2[Dr: Cash/Bank<br>Cr: Receivables]
        JE3[Dr: Inventory<br>Cr: Payables]
        JE4[Dr: Expense Account<br>Cr: Cash/Bank]
    end
    
    subgraph Ledgers
        L1[Receivables Ledger]
        L2[Sales Ledger]
        L3[Cash Ledger]
        L4[Payables Ledger]
        L5[Inventory Ledger]
        L6[Expense Ledger]
    end
    
    T1 --> JE1
    T2 --> JE2
    T3 --> JE3
    T4 --> JE4
    
    JE1 --> L1
    JE1 --> L2
    JE2 --> L3
    JE2 --> L1
    JE3 --> L5
    JE3 --> L4
    JE4 --> L6
    JE4 --> L3
</presentation-mermaid>

---

## Validation Rules

### Journal Entry Validation
| Rule | Condition | Error Message |
|------|-----------|---------------|
| Balance Check | totalDebit ≠ totalCredit | "Entry Not Balanced: Total debits must equal total credits" |
| Minimum Lines | lines.length < 2 | Implicitly enforced (cannot remove below 2) |
| Account Required | line.accountCode empty | Entry won't create without accounts |

### Account Validation
| Rule | Field | Error Message |
|------|-------|---------------|
| Main Group Required | mainGroup | "Please fill all required fields" |
| Sub Group Required | subGroup | "Please fill all required fields" |
| Name Required | name | "Please fill all required fields" |

### Financial Statement Validation
| Statement | Check | Indicator |
|-----------|-------|-----------|
| Trial Balance | Debits = Credits | Balanced (Green) / Unbalanced (Red) |
| Balance Sheet | Assets = Liabilities + Equity | Balanced (Green) / Unbalanced (Red) |

---

## Account Code Structure

### Numbering Convention
| Range | Type | Examples |
|-------|------|----------|
| 1XXX | Assets | 1001-Cash, 1002-Bank, 1100-Receivables |
| 2XXX | Liabilities | 2001-Payables |
| 3XXX | Equity | 3001-Owner's Equity |
| 4XXX | Revenue | 4001-Sales Revenue |
| 5XXX | Cost | 5001-Cost of Goods Sold |
| 6XXX | Expenses | 6001-Salaries, 6002-Rent, 6003-Utilities |

---

## Future Database Schema

### Tables Structure

```sql
-- Main Groups Table
CREATE TABLE main_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL, -- asset, liability, equity, revenue, expense, cost
  display_order INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Subgroups Table
CREATE TABLE subgroups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  main_group_id UUID REFERENCES main_groups(id),
  code VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  can_delete BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Accounts Table
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subgroup_id UUID REFERENCES subgroups(id),
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  account_type VARCHAR(20), -- regular, person
  opening_balance DECIMAL(15, 2) DEFAULT 0,
  current_balance DECIMAL(15, 2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'Active',
  can_delete BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Journal Entries Table
CREATE TABLE journal_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_no VARCHAR(50) UNIQUE NOT NULL,
  entry_date DATE NOT NULL,
  reference VARCHAR(100),
  description TEXT,
  total_debit DECIMAL(15, 2) NOT NULL,
  total_credit DECIMAL(15, 2) NOT NULL,
  status VARCHAR(20) DEFAULT 'draft', -- draft, posted, reversed
  created_by VARCHAR(100),
  posted_by VARCHAR(100),
  posted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Journal Lines Table
CREATE TABLE journal_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journal_entry_id UUID REFERENCES journal_entries(id),
  account_id UUID REFERENCES accounts(id),
  description TEXT,
  debit DECIMAL(15, 2) DEFAULT 0,
  credit DECIMAL(15, 2) DEFAULT 0,
  line_order INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- General Ledger View
CREATE VIEW v_general_ledger AS
SELECT 
  a.id as account_id,
  a.code as account_code,
  a.name as account_name,
  mg.type as account_type,
  a.opening_balance,
  jl.debit,
  jl.credit,
  je.entry_date,
  je.entry_no,
  je.reference,
  jl.description,
  SUM(jl.debit - jl.credit) OVER (
    PARTITION BY a.id 
    ORDER BY je.entry_date, je.entry_no
  ) + a.opening_balance as running_balance
FROM accounts a
JOIN subgroups sg ON a.subgroup_id = sg.id
JOIN main_groups mg ON sg.main_group_id = mg.id
LEFT JOIN journal_lines jl ON a.id = jl.account_id
LEFT JOIN journal_entries je ON jl.journal_entry_id = je.id
WHERE je.status = 'posted'
ORDER BY a.code, je.entry_date, je.entry_no;

-- Trial Balance View
CREATE VIEW v_trial_balance AS
SELECT 
  a.code as account_code,
  a.name as account_name,
  mg.type as account_type,
  CASE WHEN SUM(jl.debit - jl.credit) + a.opening_balance > 0 
       THEN SUM(jl.debit - jl.credit) + a.opening_balance 
       ELSE 0 END as debit_balance,
  CASE WHEN SUM(jl.debit - jl.credit) + a.opening_balance < 0 
       THEN ABS(SUM(jl.debit - jl.credit) + a.opening_balance) 
       ELSE 0 END as credit_balance
FROM accounts a
JOIN subgroups sg ON a.subgroup_id = sg.id
JOIN main_groups mg ON sg.main_group_id = mg.id
LEFT JOIN journal_lines jl ON a.id = jl.account_id
LEFT JOIN journal_entries je ON jl.journal_entry_id = je.id
WHERE je.status = 'posted' OR je.id IS NULL
GROUP BY a.id, a.code, a.name, mg.type, a.opening_balance
ORDER BY a.code;
```

---

## Report Types, Filters & Export Functionality

### Available Report Types

| Report | Component | Purpose | Key Metrics |
|--------|-----------|---------|-------------|
| Trial Balance | `TrialBalanceTab.tsx` | Verify debit/credit balance | Total Debits, Total Credits, Difference |
| Income Statement | `IncomeStatementTab.tsx` | Profit & Loss analysis | Revenue, Expenses, Net Income, Margin |
| Balance Sheet | `BalanceSheetTab.tsx` | Financial position | Assets, Liabilities, Equity, Current Ratio |
| General Ledger | `GeneralLedgerTab.tsx` | Account transaction history | Running Balance, Period Totals |
| Daily Closing | `DailyClosingTab.tsx` | End-of-day summary | Cash Position, Daily Totals |
| Brand Wise Sales | `DailyClosingTab.tsx` | Sales by brand | Brand Revenue, Quantities |

---

### Filter Options by Report

#### Trial Balance Filters

| Filter | Type | Options |
|--------|------|---------|
| Period | Select | This Month, Last Month, This Quarter, This Year, Custom |
| Account Type | Select | All, Assets, Liabilities, Equity, Revenue, Expenses |

```typescript
// Filter state
const [period, setPeriod] = useState("this-month");
const [filterType, setFilterType] = useState("all");

// Period options
const periodOptions = [
  { value: "this-month", label: "This Month" },
  { value: "last-month", label: "Last Month" },
  { value: "this-quarter", label: "This Quarter" },
  { value: "this-year", label: "This Year" },
  { value: "custom", label: "Custom Range" }
];
```

#### Income Statement Filters

| Filter | Type | Options |
|--------|------|---------|
| Period | Select | This Month, Last Month, This Quarter, This Year |
| Comparison | Toggle | Show previous period comparison |

```typescript
// Toggle category expansion
const [expandedRevenue, setExpandedRevenue] = useState<string[]>([]);
const [expandedExpenses, setExpandedExpenses] = useState<string[]>([]);

const toggleRevenue = (name: string) => {
  setExpandedRevenue(prev => 
    prev.includes(name) 
      ? prev.filter(n => n !== name) 
      : [...prev, name]
  );
};
```

#### Balance Sheet Filters

| Filter | Type | Options |
|--------|------|---------|
| Period | Select | This Month, Last Month, This Quarter, This Year |
| View Mode | Toggle | Detailed / Summary |

```typescript
// Section expansion state
const [expandedAssets, setExpandedAssets] = useState<string[]>([]);
const [expandedLiabilities, setExpandedLiabilities] = useState<string[]>([]);
const [expandedEquity, setExpandedEquity] = useState<string[]>([]);
```

#### General Ledger Filters

| Filter | Type | Description |
|--------|------|-------------|
| Search | Text | Search by account code or name |
| Type | Select | Filter by account type (Asset, Liability, etc.) |
| Date From | Date | Start of date range |
| Date To | Date | End of date range |

```typescript
// Filter state
const [searchTerm, setSearchTerm] = useState("");
const [filterType, setFilterType] = useState("all");
const [dateFrom, setDateFrom] = useState("");
const [dateTo, setDateTo] = useState("");

// Filtered accounts
const filteredAccounts = accounts.filter(account => {
  const matchesSearch = 
    account.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.name.toLowerCase().includes(searchTerm.toLowerCase());
  const matchesType = filterType === "all" || account.type === filterType;
  return matchesSearch && matchesType;
});
```

#### Daily Closing Filters

| Filter | Type | Description |
|--------|------|-------------|
| Date | Date Picker | Closing date |
| Account | Select | Cash/Bank account selection |
| Shop | Select | Store location (Brand Wise) |
| Sale Type | Select | Customer type (Brand Wise) |
| Brand | Select | Product brand (Brand Wise) |
| From/To Date | Date Range | Period selection (Brand Wise) |

#### Journal Entries Filters

| Filter | Type | Options |
|--------|------|---------|
| Status | Select | All, Draft, Posted, Reversed |
| Search | Text | Search by entry number or reference |
| Date Range | Date | From/To date selection |

#### Accounts List Filters

| Filter | Type | Options |
|--------|------|---------|
| Main Group | Select | Current Assets, Long Term Assets, etc. |
| Sub Group | Select | Dynamic based on main group |
| Status | Select | Active, Inactive |
| Search | Text | Search by code or name |

---

### Export Functionality

#### Export Formats

| Report | CSV | PDF | Print |
|--------|-----|-----|-------|
| Trial Balance | ✅ | ✅ | ✅ |
| Income Statement | ✅ | ✅ | ✅ |
| Balance Sheet | ✅ | ✅ | ✅ |
| General Ledger | ✅ | ✅ | ✅ |
| Daily Closing | ❌ | ✅ | ✅ |
| Chart of Accounts | ✅ | ✅ | ✅ |
| Journal Entries | ✅ | ❌ | ✅ |

#### CSV Export Implementation

```typescript
// Generic CSV export function
const handleExportCSV = (data: any[], filename: string, headers: string[]) => {
  const csvContent = [
    headers.join(","),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header.toLowerCase().replace(/ /g, '')];
        // Escape commas and quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(",")
    )
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};
```

#### Trial Balance Export

```typescript
const exportTrialBalance = () => {
  const headers = ["Account Code", "Account Name", "Type", "Debit", "Credit"];
  const data = trialBalanceData.map(row => ({
    accountcode: row.accountCode,
    accountname: row.accountName,
    type: row.accountType,
    debit: row.debit.toFixed(2),
    credit: row.credit.toFixed(2)
  }));
  
  // Add totals row
  data.push({
    accountcode: "",
    accountname: "TOTAL",
    type: "",
    debit: totalDebits.toFixed(2),
    credit: totalCredits.toFixed(2)
  });
  
  handleExportCSV(data, "trial_balance", headers);
};
```

#### Income Statement Export

```typescript
const exportIncomeStatement = () => {
  const rows = [];
  
  // Revenue section
  rows.push({ category: "REVENUE", item: "", amount: "" });
  revenueCategories.forEach(cat => {
    rows.push({ category: cat.name, item: "", amount: "" });
    cat.items.forEach(item => {
      rows.push({ category: "", item: item.name, amount: item.amount.toFixed(2) });
    });
  });
  rows.push({ category: "Total Revenue", item: "", amount: totalRevenue.toFixed(2) });
  
  // Expenses section
  rows.push({ category: "EXPENSES", item: "", amount: "" });
  // ... similar pattern
  
  rows.push({ category: "NET INCOME", item: "", amount: netIncome.toFixed(2) });
  
  handleExportCSV(rows, "income_statement", ["Category", "Item", "Amount"]);
};
```

#### Balance Sheet Export

```typescript
const exportBalanceSheet = () => {
  const rows = [];
  
  // Assets
  rows.push({ section: "ASSETS", category: "", item: "", amount: "" });
  assetCategories.forEach(cat => {
    rows.push({ section: "", category: cat.name, item: "", amount: "" });
    cat.items.forEach(item => {
      rows.push({ section: "", category: "", item: item.name, amount: item.amount.toFixed(2) });
    });
  });
  rows.push({ section: "Total Assets", category: "", item: "", amount: totalAssets.toFixed(2) });
  
  // Liabilities & Equity
  // ... similar pattern
  
  handleExportCSV(rows, "balance_sheet", ["Section", "Category", "Item", "Amount"]);
};
```

#### PDF Export Implementation

```typescript
const handleViewPDF = (reportType: string) => {
  // Generate PDF content
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(`
      <html>
        <head>
          <title>${reportType} Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { text-align: center; color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f4f4f4; }
            .total-row { font-weight: bold; background-color: #f9f9f9; }
            .text-right { text-align: right; }
            @media print {
              button { display: none; }
            }
          </style>
        </head>
        <body>
          ${generateReportHTML(reportType)}
          <button onclick="window.print()">Print</button>
        </body>
      </html>
    `);
    printWindow.document.close();
  }
};
```

#### Print Functionality

```typescript
const handlePrint = () => {
  const printContent = document.getElementById('report-content');
  const printWindow = window.open('', '', 'height=600,width=800');
  
  if (printWindow && printContent) {
    printWindow.document.write('<html><head><title>Print Report</title>');
    printWindow.document.write('<style>/* Print styles */</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write(printContent.innerHTML);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.print();
  }
};
```

---

### Report Summary Statistics

#### Trial Balance Summary

| Statistic | Calculation | Display |
|-----------|-------------|---------|
| Total Debits | Sum of all debit balances | Currency format |
| Total Credits | Sum of all credit balances | Currency format |
| Difference | |Debits - Credits| | Currency format |
| Status | Debits === Credits | "Balanced" / "Unbalanced" |

#### Income Statement Summary

| Statistic | Calculation | Display |
|-----------|-------------|---------|
| Total Revenue | Sum of all revenue items | Currency (Green) |
| Total Expenses | Sum of all expense items | Currency (Red) |
| Net Income | Revenue - Expenses | Currency (Green if +, Red if -) |
| Profit Margin | (Net Income / Revenue) × 100 | Percentage |

#### Balance Sheet Summary

| Statistic | Calculation | Display |
|-----------|-------------|---------|
| Total Assets | Sum of all asset categories | Currency (Blue) |
| Total Liabilities | Sum of all liability categories | Currency (Red) |
| Total Equity | Sum of all equity categories | Currency (Green) |
| Current Ratio | Current Assets / Current Liabilities | Ratio (Green if > 1) |
| Balance Check | Assets = Liabilities + Equity | "Balanced" / "Unbalanced" |

#### General Ledger Summary

| Statistic | Calculation | Display |
|-----------|-------------|---------|
| Total Assets | Sum of asset account balances | Currency |
| Total Liabilities | Sum of liability account balances | Currency |
| Total Equity | Sum of equity account balances | Currency |
| Total Revenue | Sum of revenue account balances | Currency |
| Total Expenses | Sum of expense account balances | Currency |

---

### Date Range Handling

```typescript
// Date range calculation helper
const getDateRange = (period: string): { startDate: Date; endDate: Date } => {
  const now = new Date();
  const endDate = new Date(now);
  let startDate = new Date(now);

  switch (period) {
    case "this-month":
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate.setDate(endDate.getDate() + 1); // Include today
      break;
    case "last-month":
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate.setDate(0); // Last day of previous month
      break;
    case "this-quarter":
      const quarter = Math.floor(now.getMonth() / 3);
      startDate = new Date(now.getFullYear(), quarter * 3, 1);
      break;
    case "this-year":
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      break;
  }

  return { startDate, endDate };
};
```

---

### Notification Messages

#### Export Notifications

| Action | Title | Description |
|--------|-------|-------------|
| CSV Export | "Export Complete" | "Report exported to CSV successfully." |
| PDF Export | "PDF Generated" | "Report PDF has been generated." |
| Print | "Print Ready" | "Report is ready for printing." |

#### Filter Notifications

| Action | Title | Description |
|--------|-------|-------------|
| No Results | "No Data Found" | "No records match the selected filters." |
| Date Invalid | "Invalid Date Range" | "Please select a valid date range." |

---

## Related Documentation

- [Voucher Management System](./VOUCHER_MANAGEMENT_SYSTEM.md) - Payment, Receipt, Journal Vouchers
- [Sales & Invoicing System](./SALES_INVOICING_SYSTEM.md) - Revenue generation
- [Expenses Management System](./EXPENSES_MANAGEMENT_SYSTEM.md) - Expense tracking
- [Reports & Analytics System](./REPORTS_ANALYTICS_SYSTEM.md) - Financial reporting
- [Pricing & Costing System](./PRICING_COSTING_MANAGEMENT_SYSTEM.md) - Cost and margin management

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-29 | Initial documentation |
| 1.1 | 2025-12-29 | Added Report Types, Filters & Export Functionality section |
