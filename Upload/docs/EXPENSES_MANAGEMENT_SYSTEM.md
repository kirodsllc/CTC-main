# Expenses Management System Documentation

## Overview

The Expenses Management System provides comprehensive functionality for tracking, categorizing, and managing all business expenses. It includes expense type configuration, expense posting, operational expenses, import expenses, and detailed reporting capabilities.

---

## Module Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        EXPENSES MANAGEMENT SYSTEM                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────────────────┐│
│  │  Expense Types   │  │   Post Expense   │  │   Operational Expenses      ││
│  │  (Configuration) │  │   (Recording)    │  │   (Day-to-Day)              ││
│  └────────┬─────────┘  └────────┬─────────┘  └──────────────┬──────────────┘│
│           │                     │                           │               │
│           │                     │                           │               │
│           ▼                     ▼                           ▼               │
│  ┌──────────────────────────────────────────────────────────────────────────┤
│  │                      EXPENSE DATA STORE                                  │
│  └──────────────────────────────────────────────────────────────────────────┤
│                                    │                                        │
│                                    ▼                                        │
│  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────────────────┐│
│  │  Import Expenses │  │  Expenses Report │  │   Budget Tracking           ││
│  │  (Import-Related)│  │  (Analytics)     │  │   (Usage Monitoring)        ││
│  └──────────────────┘  └──────────────────┘  └─────────────────────────────┘│
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Main Components

### 1. ExpenseManagement.tsx (Main Container)

**Location:** `src/components/expenses/ExpenseManagement.tsx`

**Purpose:** Central container managing all expense-related tabs and statistics.

#### Stats Cards Display
| Card | Value | Description | Icon |
|------|-------|-------------|------|
| Total Expenses | Rs 0 | This month's total | DollarSign |
| Operational Expenses | Rs 0 | Transaction count | Building2 |
| Expense Types | 0 | Active types count | Tag |

#### Tab Navigation
- **Expense Types** - Configure expense categories
- **Post Expense** - Record new expenses
- **Operational Expenses** - Day-to-day business expenses

---

## Tab Components

### 2. ExpenseTypesTab.tsx

**Location:** `src/components/expenses/ExpenseTypesTab.tsx`

**Purpose:** Manage expense type definitions with budgets and categories.

#### Data Structure
```typescript
interface ExpenseType {
  id: string;
  code: string;           // Auto-generated: EXP-001, EXP-002
  name: string;
  description: string;
  category: string;       // Import, Operational, Administrative, Marketing, Finance
  budget: number;
  spent: number;
  status: "Active" | "Inactive";
}
```

#### Categories
| Category | Badge Color | Description |
|----------|-------------|-------------|
| Import | Violet | Import-related expenses |
| Operational | Emerald | Day-to-day operations |
| Administrative | Blue | Admin & office expenses |
| Marketing | Pink | Marketing & advertising |
| Finance | Amber | Financial charges |

#### Button Functions

| Button | Function | Action |
|--------|----------|--------|
| `Add Expense Type` | `handleAddNew()` | Opens dialog with empty form |
| `Edit` | `handleEdit(type)` | Opens dialog with pre-filled data |
| `Add/Update` | `handleSave()` | Validates and saves expense type |
| `Cancel` | Dialog close | Closes dialog without saving |

#### Filters
- **Search** - Filter by name or code
- **Category** - Filter by expense category
- **Status** - Filter by Active/Inactive

#### Usage Tracking
- Progress bar shows budget utilization percentage
- Color coding: Green (<50%), Yellow (50-80%), Amber (>80%)

---

### 3. PostExpenseTab.tsx

**Location:** `src/components/expenses/PostExpenseTab.tsx`

**Purpose:** Record new expense transactions with attachments.

#### Predefined Expense Types
| ID | Name |
|----|------|
| 1 | Customs & Duties |
| 2 | Freight & Shipping |
| 3 | Clearing Agent Fees |
| 4 | Employee Salaries |
| 5 | Office Rent |
| 6 | Utilities |
| 7 | Office Supplies |
| 8 | Communication |
| 9 | Marketing & Advertising |
| 10 | Bank Charges |
| 11 | Interest Expense |
| 12 | Vehicle Maintenance |

#### Payment Modes
- Cash
- Bank Transfer
- Cheque
- Credit Card
- Online Payment

#### Form Fields
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Date | Date | Yes | Transaction date |
| Expense Type | Select | Yes* | Category selection |
| Amount | Number | Yes* | Expense amount |
| Paid To | Text | Yes* | Payee name |
| Payment Mode | Select | No | Payment method |
| Reference Number | Text | No | Receipt/Invoice number |
| Description | Textarea | No | Expense details |
| Attachments | File | No | Supporting documents |

#### Button Functions

| Button | Function | Action |
|--------|----------|--------|
| `Post Expense` | `handleSubmit()` | Validates and posts expense, shows toast |
| `Cancel` | `handleCancel()` | Clears form and attachments |
| `X (Attachment)` | `removeAttachment(index)` | Removes selected attachment |

---

### 4. OperationalExpensesTab.tsx

**Location:** `src/components/expenses/OperationalExpensesTab.tsx`

**Purpose:** Track day-to-day business operational expenses.

#### Data Structure
```typescript
interface OperationalExpense {
  id: string;
  date: string;
  voucherNo: string;      // Auto-generated: EV-2025-XXX
  expenseType: string;
  description: string;
  paidTo: string;
  amount: number;
  status: "Posted" | "Pending" | "Approved";
}
```

#### Operational Expense Types
- Employee Salaries
- Office Rent
- Utilities
- Vehicle Maintenance
- Office Supplies
- Communication
- Marketing & Advertising
- Bank Charges
- Interest Expense

#### Button Functions

| Button | Function | Action |
|--------|----------|--------|
| `New Operational Expense` | `handleAddNew()` | Opens add expense dialog |
| `View` | `handleView(expense)` | Opens expense details dialog |
| `Add Expense` | `handleSave()` | Validates and saves new expense |
| `Cancel` | Dialog close | Closes dialog |
| `Close` | Dialog close | Closes view dialog |

#### Status Badges
| Status | Color | Meaning |
|--------|-------|---------|
| Posted | Emerald | Expense recorded |
| Pending | Amber | Awaiting approval |
| Approved | Blue | Approved for payment |

---

### 5. ImportExpensesTab.tsx

**Location:** `src/components/expenses/ImportExpensesTab.tsx`

**Purpose:** Manage import-related expense transactions.

#### Data Structure
```typescript
interface ImportExpense {
  id: string;
  date: string;
  voucherNo: string;      // Auto-generated: IE-2025-XXX
  expenseType: string;
  description: string;
  supplier: string;
  amount: number;
  status: "Posted" | "Pending" | "Approved";
}
```

#### Import Expense Types
- Customs & Duties
- Freight & Shipping
- Clearing Agent Fees

#### Button Functions

| Button | Function | Action |
|--------|----------|--------|
| `New Import Expense` | `handleAddNew()` | Opens add import expense dialog |
| `View` | `handleView(expense)` | Opens expense details dialog |
| `Add Expense` | `handleSave()` | Validates and saves import expense |
| `Cancel` | Dialog close | Closes dialog |
| `Close` | Dialog close | Closes view dialog |

---

### 6. ExpensesReportTab.tsx

**Location:** `src/components/reports/ExpensesReportTab.tsx`

**Purpose:** Generate and analyze expense reports with filters.

#### Data Structure
```typescript
interface ExpenseRecord {
  id: string;
  date: string;
  reference: string;
  category: string;
  description: string;
  amount: number;
  status: "paid" | "pending" | "approved";
}
```

#### Report Categories
- Utilities
- Rent
- Salaries
- Transport
- Maintenance

#### Summary Statistics
| Metric | Calculation | Description |
|--------|-------------|-------------|
| Total Expenses | Sum of all amounts | All-time total |
| This Month | Sum of current month | Monthly expenses |
| Pending | Sum of pending status | Outstanding amounts |
| Categories | Unique category count | Number of categories |

#### Button Functions

| Button | Function | Action |
|--------|----------|--------|
| `Generate Report` | `handleGenerateReport()` | Loads and displays expense data |
| `Export` | `handleExport()` | Exports report to file |

---

## Workflow Diagrams

### Expense Type Creation Workflow

<presentation-mermaid>
flowchart TD
    A[Start] --> B[Click 'Add Expense Type']
    B --> C[Dialog Opens]
    C --> D[Enter Name]
    D --> E[Enter Description]
    E --> F[Select Category]
    F --> G[Enter Budget]
    G --> H[Set Status]
    H --> I{Valid Data?}
    I -->|No| J[Show Error Toast]
    J --> D
    I -->|Yes| K[Generate Code EXP-XXX]
    K --> L[Save Expense Type]
    L --> M[Show Success Toast]
    M --> N[Close Dialog]
    N --> O[Update Table]
    O --> P[End]
</presentation-mermaid>

### Post Expense Workflow

<presentation-mermaid>
flowchart TD
    A[Start] --> B[Fill Expense Form]
    B --> C[Select Date]
    C --> D[Select Expense Type]
    D --> E[Enter Amount]
    E --> F[Enter Payee Name]
    F --> G[Select Payment Mode]
    G --> H[Add Reference Number]
    H --> I[Upload Attachments?]
    I -->|Yes| J[Select Files]
    I -->|No| K[Enter Description]
    J --> K
    K --> L[Click 'Post Expense']
    L --> M{Validate Required Fields}
    M -->|Invalid| N[Show Error Toast]
    N --> B
    M -->|Valid| O[Create Expense Record]
    O --> P[Show Success Toast]
    P --> Q[Reset Form]
    Q --> R[End]
</presentation-mermaid>

### Operational Expense Recording Workflow

<presentation-mermaid>
flowchart TD
    A[Start] --> B[Click 'New Operational Expense']
    B --> C[Dialog Opens with Form]
    C --> D[Select Date]
    D --> E[Select Expense Type]
    E --> F[Enter Paid To]
    F --> G[Enter Amount]
    G --> H[Enter Description]
    H --> I[Click 'Add Expense']
    I --> J{Validate Fields}
    J -->|Invalid| K[Show Error Toast]
    K --> D
    J -->|Valid| L[Generate Voucher No EV-2025-XXX]
    L --> M[Set Status: Pending]
    M --> N[Add to Expenses List]
    N --> O[Show Success Toast]
    O --> P[Close Dialog]
    P --> Q[Update Table]
    Q --> R[End]
</presentation-mermaid>

### Import Expense Recording Workflow

<presentation-mermaid>
flowchart TD
    A[Start] --> B[Click 'New Import Expense']
    B --> C[Dialog Opens with Form]
    C --> D[Select Date]
    D --> E[Select Expense Type]
    E --> F[Enter Supplier Name]
    F --> G[Enter Amount]
    G --> H[Enter Description]
    H --> I[Click 'Add Expense']
    I --> J{Validate Fields}
    J -->|Invalid| K[Show Error Toast]
    K --> D
    J -->|Valid| L[Generate Voucher No IE-2025-XXX]
    L --> M[Set Status: Pending]
    M --> N[Add to Import Expenses List]
    N --> O[Show Success Toast]
    O --> P[Close Dialog]
    P --> Q[Update Table]
    Q --> R[End]
</presentation-mermaid>

### Expense Report Generation Workflow

<presentation-mermaid>
flowchart TD
    A[Start] --> B[Select From Date]
    B --> C[Select To Date]
    C --> D[Select Category Filter]
    D --> E[Click 'Generate Report']
    E --> F[Fetch Expense Data]
    F --> G[Calculate Summary Statistics]
    G --> H[Display Summary Cards]
    H --> I[Populate Data Table]
    I --> J{Export Needed?}
    J -->|Yes| K[Click Export]
    K --> L[Download Report File]
    L --> M[End]
    J -->|No| M
</presentation-mermaid>

---

## Inter-Module Relationships

### Expenses Module Connections

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          EXPENSES MANAGEMENT                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐         ┌─────────────────┐         ┌────────────────┐ │
│  │  Expense Types  │────────▶│   Post Expense  │────────▶│  Operational   │ │
│  │  (Categories)   │         │   (Recording)   │         │  Expenses      │ │
│  └────────┬────────┘         └────────┬────────┘         └───────┬────────┘ │
│           │                           │                          │          │
│           │  Provides Types           │  Creates Records         │          │
│           ▼                           ▼                          ▼          │
│  ┌──────────────────────────────────────────────────────────────────────────┤
│  │                         EXPENSE RECORDS                                  │
│  └──────────────────────────────────────────────────────────────────────────┤
│           │                           │                          │          │
│           │                           │                          │          │
│           ▼                           ▼                          ▼          │
│  ┌─────────────────┐         ┌─────────────────┐         ┌────────────────┐ │
│  │  Import         │         │  Expenses       │         │  Budget        │ │
│  │  Expenses       │         │  Report         │         │  Tracking      │ │
│  └─────────────────┘         └─────────────────┘         └────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Cross-Module Integration

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              SYSTEM INTEGRATION                               │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│   EXPENSES MODULE                          RELATED MODULES                    │
│   ┌─────────────────┐                                                        │
│   │                 │          ┌──────────────────────────────────────┐      │
│   │  Expense Types  │◀────────▶│  Voucher Management                  │      │
│   │                 │          │  - Payment Vouchers link to expenses │      │
│   └────────┬────────┘          └──────────────────────────────────────┘      │
│            │                                                                  │
│            ▼                                                                  │
│   ┌─────────────────┐          ┌──────────────────────────────────────┐      │
│   │                 │          │  Accounting Module                    │      │
│   │  Post Expense   │─────────▶│  - Journal entries for expenses      │      │
│   │                 │          │  - GL impact on expense accounts     │      │
│   └────────┬────────┘          └──────────────────────────────────────┘      │
│            │                                                                  │
│            ▼                                                                  │
│   ┌─────────────────┐          ┌──────────────────────────────────────┐      │
│   │  Operational    │          │  Direct Purchase Orders               │      │
│   │  Expenses       │◀────────▶│  - Expenses linked to DPO items      │      │
│   │                 │          │  - Landing cost calculations         │      │
│   └────────┬────────┘          └──────────────────────────────────────┘      │
│            │                                                                  │
│            ▼                                                                  │
│   ┌─────────────────┐          ┌──────────────────────────────────────┐      │
│   │  Import         │          │  Inventory Management                 │      │
│   │  Expenses       │─────────▶│  - Import costs added to item value  │      │
│   │                 │          │  - Cost price adjustments            │      │
│   └────────┬────────┘          └──────────────────────────────────────┘      │
│            │                                                                  │
│            ▼                                                                  │
│   ┌─────────────────┐          ┌──────────────────────────────────────┐      │
│   │  Expenses       │          │  Reports & Analytics                  │      │
│   │  Report         │─────────▶│  - Financial statements              │      │
│   │                 │          │  - Expense analysis reports          │      │
│   └─────────────────┘          └──────────────────────────────────────┘      │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagram

### Expense Recording Data Flow

<presentation-mermaid>
flowchart LR
    subgraph Input
        A[User Input]
        B[File Attachments]
    end
    
    subgraph Processing
        C[Form Validation]
        D[Voucher Generation]
        E[Status Assignment]
    end
    
    subgraph Storage
        F[Expense Records]
        G[Expense Types]
    end
    
    subgraph Output
        H[Table Display]
        I[Statistics Update]
        J[Reports]
    end
    
    A --> C
    B --> C
    C --> D
    D --> E
    E --> F
    G --> C
    F --> H
    F --> I
    F --> J
</presentation-mermaid>

### Budget Tracking Data Flow

<presentation-mermaid>
flowchart TD
    subgraph ExpenseTypes
        A[Budget Allocation]
        B[Category Definition]
    end
    
    subgraph Transactions
        C[Post Expense]
        D[Operational Expense]
        E[Import Expense]
    end
    
    subgraph Tracking
        F[Spent Amount Calculation]
        G[Usage Percentage]
        H[Progress Bar Update]
    end
    
    subgraph Alerts
        I[Under Budget - Green]
        J[Near Limit - Yellow]
        K[Over Budget - Red]
    end
    
    A --> F
    B --> C
    B --> D
    B --> E
    C --> F
    D --> F
    E --> F
    F --> G
    G --> H
    G --> I
    G --> J
    G --> K
</presentation-mermaid>

---

## UI Components

### Table Columns

#### Expense Types Table
| Column | Description | Sortable |
|--------|-------------|----------|
| CODE | Auto-generated code | Yes |
| NAME | Expense type name + description | Yes |
| CATEGORY | Category badge | Yes |
| BUDGET | Budget amount | Yes |
| SPENT | Amount spent | Yes |
| USAGE | Progress bar percentage | Yes |
| STATUS | Active/Inactive badge | Yes |
| ACTIONS | Edit button | No |

#### Operational Expenses Table
| Column | Description | Sortable |
|--------|-------------|----------|
| DATE | Transaction date | Yes |
| VOUCHER NO. | Auto-generated voucher | Yes |
| EXPENSE TYPE | Type + description | Yes |
| PAID TO | Payee name | Yes |
| AMOUNT | Expense amount | Yes |
| STATUS | Status badge | Yes |
| ACTIONS | View button | No |

#### Import Expenses Table
| Column | Description | Sortable |
|--------|-------------|----------|
| DATE | Transaction date | Yes |
| VOUCHER NO. | Auto-generated voucher | Yes |
| EXPENSE TYPE | Type + description | Yes |
| SUPPLIER | Supplier name | Yes |
| AMOUNT | Expense amount | Yes |
| STATUS | Status badge | Yes |
| ACTIONS | View button | No |

#### Expenses Report Table
| Column | Description | Sortable |
|--------|-------------|----------|
| DATE | Record date | Yes |
| REFERENCE | Reference number | Yes |
| CATEGORY | Category badge | Yes |
| DESCRIPTION | Expense description | No |
| AMOUNT | Expense amount | Yes |
| STATUS | Status badge | Yes |

---

## Validation Rules

### Expense Type Validation
| Field | Rule | Error Message |
|-------|------|---------------|
| Name | Required | "Please fill all required fields" |
| Category | Required | "Please fill all required fields" |
| Budget | Required, Numeric | "Please fill all required fields" |

### Post Expense Validation
| Field | Rule | Error Message |
|-------|------|---------------|
| Expense Type | Required | "Please fill all required fields" |
| Amount | Required, Numeric | "Please fill all required fields" |
| Paid To | Required | "Please fill all required fields" |

### Operational Expense Validation
| Field | Rule | Error Message |
|-------|------|---------------|
| Expense Type | Required | "Please fill all required fields" |
| Paid To | Required | "Please fill all required fields" |
| Amount | Required, Numeric | "Please fill all required fields" |

### Import Expense Validation
| Field | Rule | Error Message |
|-------|------|---------------|
| Expense Type | Required | "Please fill all required fields" |
| Supplier | Required | "Please fill all required fields" |
| Amount | Required, Numeric | "Please fill all required fields" |

---

## Voucher Number Generation

### Format Patterns
| Expense Type | Pattern | Example |
|--------------|---------|---------|
| Expense Type Code | EXP-XXX | EXP-001 |
| Operational Voucher | EV-YYYY-XXX | EV-2025-010 |
| Import Voucher | IE-YYYY-XXX | IE-2025-001 |
| Expense Reference | EXP-YYYY-XXXX | EXP-2024-0245 |

---

## Future Database Schema

### Tables Structure

```sql
-- Expense Types Table
CREATE TABLE expense_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  budget DECIMAL(15, 2) DEFAULT 0,
  spent DECIMAL(15, 2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Posted Expenses Table
CREATE TABLE posted_expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  expense_type_id UUID REFERENCES expense_types(id),
  amount DECIMAL(15, 2) NOT NULL,
  paid_to VARCHAR(100) NOT NULL,
  payment_mode VARCHAR(50) DEFAULT 'Cash',
  reference_number VARCHAR(100),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Expense Attachments Table
CREATE TABLE expense_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expense_id UUID REFERENCES posted_expenses(id),
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  uploaded_at TIMESTAMP DEFAULT NOW()
);

-- Operational Expenses Table
CREATE TABLE operational_expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  voucher_no VARCHAR(50) UNIQUE NOT NULL,
  expense_type VARCHAR(100) NOT NULL,
  description TEXT,
  paid_to VARCHAR(100) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  status VARCHAR(20) DEFAULT 'Pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Import Expenses Table
CREATE TABLE import_expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  voucher_no VARCHAR(50) UNIQUE NOT NULL,
  expense_type VARCHAR(100) NOT NULL,
  description TEXT,
  supplier VARCHAR(100) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  status VARCHAR(20) DEFAULT 'Pending',
  dpo_id UUID REFERENCES direct_purchase_orders(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Expense Reports View
CREATE VIEW expense_summary AS
SELECT 
  et.category,
  et.name as expense_type,
  et.budget,
  COALESCE(SUM(pe.amount), 0) + COALESCE(SUM(oe.amount), 0) + COALESCE(SUM(ie.amount), 0) as total_spent,
  et.budget - (COALESCE(SUM(pe.amount), 0) + COALESCE(SUM(oe.amount), 0) + COALESCE(SUM(ie.amount), 0)) as remaining
FROM expense_types et
LEFT JOIN posted_expenses pe ON pe.expense_type_id = et.id
LEFT JOIN operational_expenses oe ON oe.expense_type = et.name
LEFT JOIN import_expenses ie ON ie.expense_type = et.name
GROUP BY et.id, et.category, et.name, et.budget;
```

---

## Related Documentation

- [Voucher Management System](./VOUCHER_MANAGEMENT_SYSTEM.md) - Payment vouchers for expense payments
- [Inventory Management System](./INVENTORY_MANAGEMENT_SYSTEM.md) - Direct Purchase Orders with expenses
- [Sales & Invoicing System](./SALES_INVOICING_SYSTEM.md) - Revenue tracking for comparison

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-29 | Initial documentation |
