# InventoryERP System Documentation

## Welcome, Developer! 👋

This documentation provides a comprehensive guide to the InventoryERP system - a full-featured inventory management, sales, and accounting application built with React, TypeScript, and Tailwind CSS.

---

## Table of Contents

1. [Quick Start Guide](#quick-start-guide)
2. [System Overview](#system-overview)
3. [Architecture](#architecture)
4. [Module Documentation](#module-documentation)
5. [Technology Stack](#technology-stack)
6. [Project Structure](#project-structure)
7. [Development Workflow](#development-workflow)
8. [Common Patterns](#common-patterns)
9. [Styling Guide](#styling-guide)
10. [State Management](#state-management)

---

## Quick Start Guide

### Where to Begin

If you're new to this codebase, follow this recommended path:

```
1. Read this README (you're here!)
      ↓
2. Explore the Dashboard
   └── docs/DASHBOARD_SYSTEM.md
      ↓
3. Understand Core Modules
   ├── docs/PARTS_MANAGEMENT_SYSTEM.md (Products/Items)
   ├── docs/INVENTORY_MANAGEMENT_SYSTEM.md (Stock Control)
   └── docs/SALES_INVOICING_SYSTEM.md (Transactions)
      ↓
4. Learn Financial Modules
   ├── docs/ACCOUNTING_FINANCIAL_SYSTEM.md
   ├── docs/VOUCHER_MANAGEMENT_SYSTEM.md
   └── docs/EXPENSES_MANAGEMENT_SYSTEM.md
      ↓
5. Review Supporting Modules
   ├── docs/CUSTOMER_SUPPLIER_MANAGEMENT_SYSTEM.md
   ├── docs/PRICING_COSTING_MANAGEMENT_SYSTEM.md
   └── docs/REPORTS_ANALYTICS_SYSTEM.md
      ↓
6. Understand Configuration
   └── docs/SETTINGS_SYSTEM_ADMINISTRATION.md
```

### First Steps

1. **Run the Application**
   ```bash
   npm install
   npm run dev
   ```

2. **Explore the UI**
   - Open http://localhost:5173
   - Navigate using the sidebar
   - Try the global search (Ctrl+K)

3. **Understand the Codebase**
   - Pages are in `src/pages/`
   - Components are in `src/components/`
   - Shared UI is in `src/components/ui/`

---

## System Overview

### What is InventoryERP?

InventoryERP is a comprehensive business management system designed for:

- **Inventory Management**: Track stock levels, transfers, and adjustments
- **Sales & Distribution**: Create invoices, quotations, and manage customers
- **Purchasing**: Manage suppliers, purchase orders, and costs
- **Accounting**: Double-entry bookkeeping with full financial reporting
- **Reporting**: Real-time analytics and business intelligence

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              INVENTORYERP SYSTEM                                     │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐ │
│  │                              PRESENTATION LAYER                                  │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │ │
│  │  │   Dashboard  │  │   Sidebar    │  │   Header     │  │   Global Search      │ │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────────────────────────┘ │
│                                         │                                            │
│  ┌──────────────────────────────────────┼──────────────────────────────────────────┐ │
│  │                              FEATURE MODULES                                     │ │
│  │                                                                                  │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │ │
│  │  │   Parts &   │  │  Inventory  │  │   Sales &   │  │  Purchasing │             │ │
│  │  │    Kits     │  │  Management │  │  Invoicing  │  │   & Costs   │             │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘             │ │
│  │                                                                                  │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │ │
│  │  │  Accounting │  │  Vouchers   │  │  Expenses   │  │   Reports   │             │ │
│  │  │  & Finance  │  │             │  │             │  │  Analytics  │             │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘             │ │
│  │                                                                                  │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │ │
│  │  │  Customer   │  │  Supplier   │  │  Pricing &  │  │  Settings & │             │ │
│  │  │  Management │  │  Management │  │   Costing   │  │    Admin    │             │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘             │ │
│  └──────────────────────────────────────────────────────────────────────────────────┘ │
│                                         │                                            │
│  ┌──────────────────────────────────────┼──────────────────────────────────────────┐ │
│  │                              SHARED SERVICES                                     │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │ │
│  │  │    Hooks     │  │   Context    │  │   Utilities  │  │   UI Components      │ │ │
│  │  │  (Custom)    │  │  (State)     │  │   (Helpers)  │  │   (shadcn/ui)        │ │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────────────┘ │ │
│  └──────────────────────────────────────────────────────────────────────────────────┘ │
│                                         │                                            │
│  ┌──────────────────────────────────────┼──────────────────────────────────────────┐ │
│  │                              DATA LAYER                                          │ │
│  │  ┌──────────────────────────────────────────────────────────────────────────────┐ │ │
│  │  │                        Local Storage (Current)                               │ │ │
│  │  │                   ─────────────────────────────────                          │ │ │
│  │  │                   Future: Supabase / Lovable Cloud                           │ │ │
│  │  └──────────────────────────────────────────────────────────────────────────────┘ │ │
│  └──────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Module Documentation

### Core Modules

| Module | Documentation | Description | Key Files |
|--------|---------------|-------------|-----------|
| **Dashboard** | [DASHBOARD_SYSTEM.md](./DASHBOARD_SYSTEM.md) | Main hub with stats, charts, quick actions | `src/pages/Index.tsx`, `src/components/dashboard/*` |
| **Parts & Kits** | [PARTS_MANAGEMENT_SYSTEM.md](./PARTS_MANAGEMENT_SYSTEM.md) | Product catalog, kits assembly | `src/pages/Parts.tsx`, `src/components/parts/*` |
| **Inventory** | [INVENTORY_MANAGEMENT_SYSTEM.md](./INVENTORY_MANAGEMENT_SYSTEM.md) | Stock control, transfers, verification | `src/pages/Inventory.tsx`, `src/components/inventory/*` |
| **Sales** | [SALES_INVOICING_SYSTEM.md](./SALES_INVOICING_SYSTEM.md) | Invoices, quotations, returns | `src/pages/Sales.tsx`, `src/components/sales/*` |

### Financial Modules

| Module | Documentation | Description | Key Files |
|--------|---------------|-------------|-----------|
| **Accounting** | [ACCOUNTING_FINANCIAL_SYSTEM.md](./ACCOUNTING_FINANCIAL_SYSTEM.md) | Chart of Accounts, Journal, Ledger | `src/pages/Accounting.tsx`, `src/components/accounting/*` |
| **Vouchers** | [VOUCHER_MANAGEMENT_SYSTEM.md](./VOUCHER_MANAGEMENT_SYSTEM.md) | Payment, Receipt, Journal vouchers | `src/pages/Vouchers.tsx`, `src/components/vouchers/*` |
| **Expenses** | [EXPENSES_MANAGEMENT_SYSTEM.md](./EXPENSES_MANAGEMENT_SYSTEM.md) | Expense tracking, categorization | `src/pages/Expenses.tsx`, `src/components/expenses/*` |
| **Pricing** | [PRICING_COSTING_MANAGEMENT_SYSTEM.md](./PRICING_COSTING_MANAGEMENT_SYSTEM.md) | Cost management, margins | `src/pages/PricingCosting.tsx`, `src/components/inventory/PricingCosting.tsx` |

### Supporting Modules

| Module | Documentation | Description | Key Files |
|--------|---------------|-------------|-----------|
| **Customers & Suppliers** | [CUSTOMER_SUPPLIER_MANAGEMENT_SYSTEM.md](./CUSTOMER_SUPPLIER_MANAGEMENT_SYSTEM.md) | CRM, vendor management | `src/pages/Manage.tsx`, `src/components/manage/*` |
| **Reports** | [REPORTS_ANALYTICS_SYSTEM.md](./REPORTS_ANALYTICS_SYSTEM.md) | Analytics, dashboards | `src/pages/Reports.tsx`, `src/components/reports/*` |
| **Settings** | [SETTINGS_SYSTEM_ADMINISTRATION.md](./SETTINGS_SYSTEM_ADMINISTRATION.md) | Users, roles, company config | `src/pages/Settings.tsx`, `src/components/settings/*` |

### Reference Modules

| Module | Documentation | Description |
|--------|---------------|-------------|
| **Models** | [MODELS_SYSTEM.md](./MODELS_SYSTEM.md) | Model/Make/Category/Brand management |
| **Attributes** | [ATTRIBUTES_SYSTEM.md](./ATTRIBUTES_SYSTEM.md) | Product attributes and variants |
| **Kits** | [KITS_MANAGEMENT_SYSTEM.md](./KITS_MANAGEMENT_SYSTEM.md) | Kit assembly and BOM |

---

## Technology Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.3.1 | UI Framework |
| TypeScript | Latest | Type Safety |
| Vite | Latest | Build Tool |
| React Router | 6.30.1 | Routing |
| Tailwind CSS | Latest | Styling |
| shadcn/ui | Latest | UI Components |

### UI Libraries

| Library | Purpose |
|---------|---------|
| `lucide-react` | Icons |
| `recharts` | Charts and graphs |
| `react-hook-form` | Form management |
| `zod` | Schema validation |
| `date-fns` | Date utilities |
| `sonner` | Toast notifications |

### State Management

| Tool | Purpose |
|------|---------|
| React Context | Global state (notifications) |
| useState | Local component state |
| Local Storage | Data persistence |

---

## Project Structure

```
src/
├── components/
│   ├── dashboard/          # Dashboard components
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   ├── StatCard.tsx
│   │   ├── InventoryChart.tsx
│   │   ├── OrderStatusChart.tsx
│   │   ├── QuickActions.tsx
│   │   ├── RecentActivity.tsx
│   │   ├── InventoryDistribution.tsx
│   │   └── GlobalSearch.tsx
│   │
│   ├── inventory/          # Inventory module
│   │   ├── InventoryDashboard.tsx
│   │   ├── StockBalance.tsx
│   │   ├── StockTransfer.tsx
│   │   ├── StockVerification.tsx
│   │   ├── AdjustItem.tsx
│   │   ├── PurchaseOrder.tsx
│   │   ├── PricingCosting.tsx
│   │   └── ...
│   │
│   ├── sales/              # Sales module
│   │   ├── SalesInvoice.tsx
│   │   ├── SalesQuotation.tsx
│   │   ├── SalesReturns.tsx
│   │   ├── DeliveryChallan.tsx
│   │   └── ...
│   │
│   ├── accounting/         # Accounting module
│   │   ├── ChartOfAccounts.tsx
│   │   ├── JournalEntriesTab.tsx
│   │   ├── GeneralLedgerTab.tsx
│   │   ├── TrialBalanceTab.tsx
│   │   ├── IncomeStatementTab.tsx
│   │   ├── BalanceSheetTab.tsx
│   │   └── ...
│   │
│   ├── vouchers/           # Voucher module
│   ├── expenses/           # Expenses module
│   ├── parts/              # Parts module
│   ├── manage/             # Customer/Supplier
│   ├── reports/            # Reports module
│   ├── settings/           # Settings module
│   ├── financial/          # Financial statements
│   ├── notifications/      # Notification system
│   ├── chatbot/            # AI chatbot
│   │
│   └── ui/                 # shadcn/ui components
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       ├── table.tsx
│       └── ... (50+ components)
│
├── pages/                  # Route pages
│   ├── Index.tsx           # Dashboard (/)
│   ├── Parts.tsx           # Parts (/parts)
│   ├── Inventory.tsx       # Inventory (/inventory)
│   ├── Sales.tsx           # Sales (/sales)
│   ├── Accounting.tsx      # Accounting (/accounting)
│   ├── Vouchers.tsx        # Vouchers (/vouchers)
│   ├── Expenses.tsx        # Expenses (/expenses)
│   ├── Manage.tsx          # CRM (/manage)
│   ├── Reports.tsx         # Reports (/reports)
│   ├── Settings.tsx        # Settings (/settings)
│   ├── PricingCosting.tsx  # Pricing (/pricing-costing)
│   ├── FinancialStatements.tsx
│   └── NotFound.tsx
│
├── hooks/                  # Custom hooks
│   ├── useInventoryData.ts
│   ├── useAppNotifications.ts
│   ├── use-toast.ts
│   └── use-mobile.tsx
│
├── contexts/               # React contexts
│   └── NotificationContext.tsx
│
├── lib/                    # Utilities
│   └── utils.ts
│
├── types/                  # TypeScript types
│   └── invoice.ts
│
├── App.tsx                 # Root component & routing
├── main.tsx                # Entry point
└── index.css               # Global styles & design tokens

docs/                       # Documentation
├── README.md               # This file (Index)
├── DASHBOARD_SYSTEM.md
├── PARTS_MANAGEMENT_SYSTEM.md
├── INVENTORY_MANAGEMENT_SYSTEM.md
├── SALES_INVOICING_SYSTEM.md
├── ACCOUNTING_FINANCIAL_SYSTEM.md
├── VOUCHER_MANAGEMENT_SYSTEM.md
├── EXPENSES_MANAGEMENT_SYSTEM.md
├── PRICING_COSTING_MANAGEMENT_SYSTEM.md
├── CUSTOMER_SUPPLIER_MANAGEMENT_SYSTEM.md
├── REPORTS_ANALYTICS_SYSTEM.md
├── SETTINGS_SYSTEM_ADMINISTRATION.md
├── MODELS_SYSTEM.md
├── ATTRIBUTES_SYSTEM.md
└── KITS_MANAGEMENT_SYSTEM.md
```

---

## Development Workflow

### Adding a New Feature

```
1. Identify the module
      ↓
2. Read the module documentation
      ↓
3. Create/modify components in src/components/[module]/
      ↓
4. Update the page in src/pages/
      ↓
5. Add routes if needed in App.tsx
      ↓
6. Update documentation
```

### Creating a New Page

```typescript
// 1. Create the page component
// src/pages/NewPage.tsx
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";

const NewPage = () => {
  return (
    <div className="h-screen flex bg-background overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden ml-16">
        <Header />
        <main className="flex-1 p-4 overflow-auto">
          {/* Your content here */}
        </main>
      </div>
    </div>
  );
};

export default NewPage;

// 2. Add route in App.tsx
<Route path="/new-page" element={<NewPage />} />

// 3. Add to Sidebar navigation
// src/components/dashboard/Sidebar.tsx
{ Icon: YourIcon, path: "/new-page", label: "New Page" }
```

### Creating a New Component

```typescript
// src/components/[module]/NewComponent.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface NewComponentProps {
  title: string;
  onAction: () => void;
}

export const NewComponent = ({ title, onAction }: NewComponentProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={onAction}>Action</Button>
      </CardContent>
    </Card>
  );
};
```

---

## Common Patterns

### 1. Tab-Based Pages

Most modules use tabs for sub-navigation:

```typescript
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const [activeTab, setActiveTab] = useState("tab1");

<Tabs value={activeTab} onValueChange={setActiveTab}>
  <TabsList>
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">Content 1</TabsContent>
  <TabsContent value="tab2">Content 2</TabsContent>
</Tabs>
```

### 2. Data Tables

Standard table pattern with filtering and pagination:

```typescript
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Filter state
const [searchTerm, setSearchTerm] = useState("");
const [filterStatus, setFilterStatus] = useState("all");

// Filter logic
const filteredItems = items.filter(item => {
  const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
  const matchesStatus = filterStatus === "all" || item.status === filterStatus;
  return matchesSearch && matchesStatus;
});

// Pagination
const [currentPage, setCurrentPage] = useState(1);
const itemsPerPage = 10;
const paginatedItems = filteredItems.slice(
  (currentPage - 1) * itemsPerPage,
  currentPage * itemsPerPage
);
```

### 3. Form Dialogs

Standard dialog pattern for CRUD operations:

```typescript
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const [showDialog, setShowDialog] = useState(false);
const [formData, setFormData] = useState({ name: "", value: "" });

<Dialog open={showDialog} onOpenChange={setShowDialog}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Add Item</DialogTitle>
    </DialogHeader>
    <div className="space-y-4">
      <Input 
        value={formData.name}
        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
      />
    </div>
    <DialogFooter>
      <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
      <Button onClick={handleSave}>Save</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### 4. Toast Notifications

```typescript
import { toast } from "@/hooks/use-toast";

// Success
toast({
  title: "Success",
  description: "Item saved successfully.",
});

// Error
toast({
  title: "Error",
  description: "Failed to save item.",
  variant: "destructive",
});
```

### 5. Export Functionality

```typescript
const handleExport = () => {
  const headers = ["Column1", "Column2", "Column3"];
  const csvContent = [
    headers.join(","),
    ...data.map(row => [row.col1, row.col2, row.col3].join(","))
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "export.csv";
  link.click();
  URL.revokeObjectURL(url);
};
```

---

## Styling Guide

### Design Tokens

All colors should use design tokens from `index.css`:

```css
/* DO NOT USE */
text-white, bg-blue-500, text-gray-600

/* USE INSTEAD */
text-foreground, bg-primary, text-muted-foreground
```

### Common Token Mappings

| Semantic Token | Purpose |
|----------------|---------|
| `bg-background` | Page background |
| `bg-card` | Card backgrounds |
| `text-foreground` | Primary text |
| `text-muted-foreground` | Secondary text |
| `bg-primary` | Primary actions |
| `text-primary` | Primary color text |
| `bg-destructive` | Error/delete actions |
| `border-border` | Borders |

### Chart Colors

| Token | Usage |
|-------|-------|
| `bg-chart-orange` | Primary data |
| `bg-chart-blue` | Secondary data |
| `bg-chart-green` | Success/positive |
| `bg-chart-yellow` | Warning/pending |
| `bg-chart-purple` | Tertiary data |

### Responsive Classes

```typescript
// Mobile first approach
className="grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
className="hidden md:block"
className="flex-col lg:flex-row"
```

---

## State Management

### Local Storage Pattern

```typescript
// hooks/useInventoryData.ts

// Storage keys
const STORAGE_KEYS = {
  PARTS: 'inventory_parts',
  KITS: 'inventory_kits',
  SUPPLIERS: 'inventory_suppliers',
  CATEGORIES: 'inventory_categories',
};

// Load from storage
const loadFromStorage = <T>(key: string, fallback: T): T => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
};

// Save to storage
const saveToStorage = <T>(key: string, data: T): void => {
  localStorage.setItem(key, JSON.stringify(data));
};
```

### Context Pattern

```typescript
// contexts/NotificationContext.tsx

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  markAsRead: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};
```

---

## Key Concepts

### 1. Double-Entry Accounting

Every financial transaction affects at least two accounts:
- **Debits** increase assets/expenses
- **Credits** increase liabilities/equity/revenue
- Total Debits must equal Total Credits

See: [ACCOUNTING_FINANCIAL_SYSTEM.md](./ACCOUNTING_FINANCIAL_SYSTEM.md)

### 2. Kit Assembly (BOM)

Kits are composed of multiple parts with quantities:
- Kit = Component 1 (qty) + Component 2 (qty) + ...
- Stock is tracked at component level

See: [KITS_MANAGEMENT_SYSTEM.md](./KITS_MANAGEMENT_SYSTEM.md)

### 3. Stock Movement Flow

```
Purchase Order → Stock In → Inventory
Inventory → Sales Invoice → Stock Out
Inventory → Transfer → Another Location
Inventory → Adjustment → Reconciliation
```

See: [INVENTORY_MANAGEMENT_SYSTEM.md](./INVENTORY_MANAGEMENT_SYSTEM.md)

### 4. Price Levels

Multiple price tiers for different customer types:
- Price A (Retail)
- Price B (Wholesale)
- Price M (MRP)

See: [PRICING_COSTING_MANAGEMENT_SYSTEM.md](./PRICING_COSTING_MANAGEMENT_SYSTEM.md)

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Component not updating | Check useState dependency arrays |
| Styles not applying | Verify using design tokens, not direct colors |
| Route not working | Check App.tsx route configuration |
| Data not persisting | Verify localStorage operations |

### Debug Tools

1. **React DevTools** - Component inspection
2. **Browser Console** - Error logging
3. **Network Tab** - API calls (future)
4. **Local Storage Inspector** - Data verification

---

## Future Enhancements

### Planned Backend Integration

The system is designed for easy Lovable Cloud integration:

```typescript
// Current: Local Storage
const data = loadFromStorage('parts', []);

// Future: Supabase
const { data } = await supabase.from('parts').select('*');
```

### Database Schema Ready

Each module documentation includes a "Future Database Schema" section with SQL definitions ready for implementation.

---

## Contributing

### Documentation Updates

When modifying a module:
1. Update the corresponding `.md` file in `docs/`
2. Update version history
3. Add new data structures/functions
4. Update related module links

### Code Standards

- Use TypeScript interfaces for all props
- Follow existing component patterns
- Use design tokens for all styling
- Add JSDoc comments for complex functions

---

## Quick Reference Links

### Most Used Files

| Purpose | File |
|---------|------|
| Routing | `src/App.tsx` |
| Main Layout | `src/pages/Index.tsx` |
| Navigation | `src/components/dashboard/Sidebar.tsx` |
| Design Tokens | `src/index.css` |
| UI Components | `src/components/ui/*` |

### External Resources

| Resource | URL |
|----------|-----|
| React Docs | https://react.dev |
| Tailwind CSS | https://tailwindcss.com |
| shadcn/ui | https://ui.shadcn.com |
| Lucide Icons | https://lucide.dev |
| Recharts | https://recharts.org |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-29 | Initial documentation index |

---

**Happy Coding! 🚀**

For questions or issues, refer to the specific module documentation or explore the codebase directly.
