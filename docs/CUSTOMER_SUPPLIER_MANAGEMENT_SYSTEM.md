# Customer & Supplier Management System Documentation

## Overview

The Customer & Supplier Management module provides comprehensive master data management for business partners. This module serves as the foundation for sales (customer data) and purchasing (supplier data) operations, enabling centralized management of business relationships.

## File Structure

```
src/
├── pages/
│   └── Manage.tsx                              # Main management page with tab navigation
└── components/
    └── manage/
        ├── CustomerManagement.tsx              # Customer master data management
        └── SupplierManagement.tsx              # Supplier master data management
```

## Module Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Manage Page (Manage.tsx)                 │
├──────────────────────────┬──────────────────────────────────┤
│    Suppliers Tab         │        Customers Tab              │
│  SupplierManagement.tsx  │    CustomerManagement.tsx         │
└──────────────────────────┴──────────────────────────────────┘
```

---

## 1. Manage Page (`src/pages/Manage.tsx`)

### Purpose
Main entry point for managing business partners with tab-based navigation between Suppliers and Customers.

### State Management
```typescript
type ManageTab = "suppliers" | "customers";
const [activeTab, setActiveTab] = useState<ManageTab>("suppliers");
```

### Tab Navigation
| Tab | Icon | Component |
|-----|------|-----------|
| Suppliers | `Truck` | `SupplierManagement` |
| Customers | `Users` | `CustomerManagement` |

---

## 2. Customer Management (`src/components/manage/CustomerManagement.tsx`)

### Purpose
Comprehensive customer master data management with CRUD operations, filtering, and pagination.

### Data Structure

```typescript
interface Customer {
  id: string;              // Unique identifier
  name: string;            // Customer name (required)
  address: string;         // Physical address
  email: string;           // Email address
  cnic: string;            // National ID/CNIC number
  contactNo: string;       // Phone number
  openingBalance: number;  // Initial balance (Rs)
  creditLimit: number;     // Maximum credit allowed (Rs)
  status: "active" | "inactive";  // Account status
}
```

### State Variables

| State | Type | Description |
|-------|------|-------------|
| `customers` | `Customer[]` | List of all customers |
| `searchTerm` | `string` | Current search query |
| `statusFilter` | `string` | Filter by status (all/active/inactive) |
| `searchByField` | `string` | Field to search (name/email/cnic/contact) |
| `selectedIds` | `string[]` | Selected customer IDs for bulk operations |
| `isDialogOpen` | `boolean` | Add/Edit dialog visibility |
| `formData` | `Omit<Customer, "id">` | Form data for create/edit |
| `editingId` | `string | null` | ID of customer being edited |
| `currentPage` | `number` | Current pagination page |
| `rowsPerPage` | `number` | Rows per page (10/25/50) |

### Button Functions

| Button | Function | Description |
|--------|----------|-------------|
| **Add New** | `handleOpenDialog()` | Opens dialog with empty form |
| **Search** | Filter trigger | Filters customers based on criteria |
| **Edit** | `handleOpenDialog(customer)` | Opens dialog with customer data |
| **Delete** | `handleDelete(id)` | Removes customer from list |
| **Status Toggle** | `handleStatusChange(id, status)` | Changes customer active/inactive status |
| **Save** | `handleSubmit()` | Saves new or updated customer |

### Filter Options

| Filter | Options | Description |
|--------|---------|-------------|
| **Status** | All, Active, Inactive | Filter by account status |
| **Search By** | Name, Email, CNIC, Contact | Field to search within |

### Table Columns

| Column | Field | Format |
|--------|-------|--------|
| Checkbox | Selection | Multi-select |
| Sr. No | Index | Auto-generated |
| Name | `name` | Text |
| Address | `address` | Text (truncated) |
| Email | `email` | Link style |
| CNIC | `cnic` | Text |
| Contact No | `contactNo` | Text |
| Opening Balance | `openingBalance` | Rs X.XX |
| Credit Limit | `creditLimit` | Rs X.XX |
| Status | `status` | Dropdown (Active/Inactive) |
| Actions | - | Edit, Delete links |

### Validation Rules

| Field | Validation |
|-------|------------|
| `name` | Required |
| `email` | Optional |
| `openingBalance` | Numeric, default 0 |
| `creditLimit` | Numeric, default 0 |

---

## 3. Supplier Management (`src/components/manage/SupplierManagement.tsx`)

### Purpose
Comprehensive supplier master data management with extended company details, contact information, and payment terms.

### Data Structure

```typescript
interface Supplier {
  id: string;              // Unique identifier
  code: string;            // Supplier code (required) - e.g., "SUP-001"
  name: string;            // Contact person name
  companyName: string;     // Company name (required)
  address: string;         // Street address
  city: string;            // City
  state: string;           // State/Province
  country: string;         // Country
  zipCode: string;         // Postal code
  email: string;           // Email address
  phone: string;           // Phone number
  cnic: string;            // National ID
  contactPerson: string;   // Primary contact
  taxId: string;           // Tax identification number
  paymentTerms: string;    // Payment terms (e.g., "Net 30")
  status: "active" | "inactive";  // Supplier status
  notes: string;           // Additional notes
}
```

### State Variables

| State | Type | Description |
|-------|------|-------------|
| `activeTab` | `"suppliers" | "manage"` | Current view (list/form) |
| `suppliers` | `Supplier[]` | List of all suppliers |
| `searchTerm` | `string` | Current search query |
| `statusFilter` | `string` | Filter by status |
| `fieldFilter` | `string` | Field to filter |
| `selectedIds` | `string[]` | Selected supplier IDs |
| `formData` | `Omit<Supplier, "id">` | Form data |
| `editingId` | `string | null` | ID of supplier being edited |
| `currentPage` | `number` | Current pagination page |
| `statusConfirmOpen` | `boolean` | Status change confirmation dialog |
| `supplierToToggle` | `Supplier | null` | Supplier for status toggle |

### Button Functions

| Button | Function | Description |
|--------|----------|-------------|
| **New Supplier** | Tab switch to "manage" | Opens empty supplier form |
| **Search** | Filter trigger | Applies search filters |
| **Edit** | `handleEdit(supplier)` | Opens form with supplier data |
| **Delete** | `handleDelete(id)` | Removes supplier |
| **Status Badge** | `handleToggleStatusClick(supplier)` | Opens status confirmation |
| **Save** | `handleSubmit()` | Saves supplier (create/update) |
| **Cancel** | `handleCancelForm()` | Returns to supplier list |

### Filter Options

| Filter | Options | Description |
|--------|---------|-------------|
| **Active/Inactive** | All, Active, Inactive | Status filter |
| **All Fields** | All Fields, Name, Email, Phone | Search field selector |

### Table Columns

| Column | Field | Format |
|--------|-------|--------|
| Checkbox | Selection | Multi-select |
| SR. NO | Index | Auto-generated |
| NAME | `name` | Text (or "-") |
| COMPANY NAME | `companyName` | Text (bold) |
| ADDRESS | `address` | Text (truncated) |
| EMAIL | `email` | Link style |
| CNIC | `cnic` | Text (or "-") |
| CONTACT NO | `phone` | Text |
| STATUS | `status` | Clickable Badge |
| ACTIONS | - | Edit, Delete, More icons |

### Form Fields (Grouped)

**Basic Information:**
| Field | Type | Required |
|-------|------|----------|
| Supplier Code | Input | Yes |
| Company Name | Input | Yes |
| Contact Person Name | Input | No |
| CNIC No | Input | No |

**Contact Information:**
| Field | Type | Required |
|-------|------|----------|
| Email | Input | No |
| Phone | Input | No |

**Address:**
| Field | Type | Required |
|-------|------|----------|
| Address | Textarea | No |
| City | Input | No |
| State | Input | No |
| Country | Input | No |
| Zip Code | Input | No |

**Business Details:**
| Field | Type | Required |
|-------|------|----------|
| Tax ID | Input | No |
| Payment Terms | Select | No |
| Status | Select | Yes (default: Active) |
| Notes | Textarea | No |

### Payment Terms Options
- Net 15
- Net 30
- Net 45
- Net 60
- Immediate
- Custom

### Status Confirmation Dialog
When toggling supplier status, a confirmation dialog appears:
- Title: "Confirm Status Change"
- Description: "Are you sure you want to [activate/deactivate] {companyName}?"
- Actions: Cancel, Confirm

---

## Inter-Module Relationships

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CUSTOMER RELATIONSHIPS                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  CustomerManagement ──────┬──────► SalesInvoice.tsx                         │
│                          │        (Customer selection, billing)             │
│                          │                                                  │
│                          ├──────► SalesQuotation.tsx                        │
│                          │        (Customer quotes)                         │
│                          │                                                  │
│                          ├──────► CustomerPriceStructures.tsx               │
│                          │        (Customer-specific pricing)               │
│                          │                                                  │
│                          ├──────► DistributorAging.tsx                      │
│                          │        (Accounts receivable aging)               │
│                          │                                                  │
│                          ├──────► ReceivableReminders.tsx                   │
│                          │        (Payment reminders)                       │
│                          │                                                  │
│                          ├──────► CustomerAnalysisTab.tsx                   │
│                          │        (Customer sales reports)                  │
│                          │                                                  │
│                          └──────► CustomerAgingTab.tsx                      │
│                                  (Customer aging reports)                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         SUPPLIER RELATIONSHIPS                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  SupplierManagement ──────┬──────► PurchaseOrder.tsx                        │
│                          │        (Supplier selection, ordering)            │
│                          │                                                  │
│                          ├──────► DirectPurchaseOrder.tsx                   │
│                          │        (Direct purchases)                        │
│                          │                                                  │
│                          ├──────► ImportExpensesTab.tsx                     │
│                          │        (Import supplier expenses)                │
│                          │                                                  │
│                          ├──────► PurchasesReportTab.tsx                    │
│                          │        (Purchase reports by supplier)            │
│                          │                                                  │
│                          ├──────► SupplierPerformanceTab.tsx                │
│                          │        (Supplier metrics analysis)               │
│                          │                                                  │
│                          └──────► PurchaseComparisonTab.tsx                 │
│                                  (Supplier comparison reports)              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagrams

### Customer Creation Flow
```
┌──────────┐    ┌──────────────┐    ┌─────────────┐    ┌──────────────┐
│ Add New  │───►│ Open Dialog  │───►│ Fill Form   │───►│ Validation   │
│  Button  │    │ (Empty)      │    │ - Name      │    │ - Name req.  │
└──────────┘    └──────────────┘    │ - Contact   │    └──────┬───────┘
                                    │ - Credit    │           │
                                    └─────────────┘           ▼
                                                    ┌──────────────────┐
                                    ┌───────────────│  handleSubmit()  │
                                    │               └──────────────────┘
                                    ▼
                          ┌──────────────────┐
                          │ Add to customers │
                          │ array + Toast    │
                          └──────────────────┘
```

### Supplier Status Toggle Flow
```
┌────────────┐    ┌─────────────────┐    ┌────────────────┐    ┌─────────────┐
│ Click      │───►│ handleToggle    │───►│ Show Confirm   │───►│ User        │
│ Badge      │    │ StatusClick()   │    │ Dialog         │    │ Confirms    │
└────────────┘    └─────────────────┘    └────────────────┘    └──────┬──────┘
                                                                      │
                                                                      ▼
                                                          ┌───────────────────┐
                                                          │ handleToggle      │
                                                          │ StatusConfirm()   │
                                                          └─────────┬─────────┘
                                                                    │
                                    ┌───────────────────────────────┘
                                    ▼
                          ┌──────────────────────────┐
                          │ Update supplier status   │
                          │ Active ↔ Inactive        │
                          │ Show success toast       │
                          └──────────────────────────┘
```

### Sales Invoice Customer Selection Flow
```
┌────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│ New Invoice    │───►│ Select Customer  │───►│ Load Customer Data  │
│                │    │ Type             │    │ - Name              │
└────────────────┘    │ (Registered/     │    │ - Credit Limit      │
                      │  Walking)        │    │ - Outstanding       │
                      └──────────────────┘    └─────────────────────┘
                              │
                              ▼
                      ┌──────────────────┐
                      │ Filter customers │
                      │ by type from     │
                      │ CustomerManagement│
                      └──────────────────┘
```

### Purchase Order Supplier Selection Flow
```
┌────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│ New PO         │───►│ Select Supplier  │───►│ Load Supplier Data  │
│                │    │ from dropdown    │    │ - Company Name      │
└────────────────┘    └──────────────────┘    │ - Payment Terms     │
                              │               │ - Contact Info      │
                              ▼               └─────────────────────┘
                      ┌──────────────────┐
                      │ Supplier data    │
                      │ from             │
                      │ SupplierManagement│
                      └──────────────────┘
```

---

## Common UI Patterns

### Filter Card
```tsx
<Card>
  <CardContent className="p-4">
    <div className="flex flex-wrap gap-3 items-end">
      {/* Status Filter */}
      {/* Search By Field */}
      {/* Search Input */}
      {/* Search Button */}
    </div>
  </CardContent>
</Card>
```

### Data Table with Selection
```tsx
<Table>
  <TableHeader>
    <TableRow className="bg-muted/30">
      <TableHead><Checkbox /></TableHead>
      {/* Column Headers */}
    </TableRow>
  </TableHeader>
  <TableBody>
    {paginatedItems.map((item) => (
      <TableRow>
        <TableCell><Checkbox /></TableCell>
        {/* Data Cells */}
      </TableRow>
    ))}
  </TableBody>
</Table>
```

### Pagination Controls
```tsx
<div className="flex items-center justify-between">
  <p>Showing X to Y of Z Records</p>
  <div className="flex items-center gap-2">
    <Select>{/* Rows per page */}</Select>
    <Button>First</Button>
    <Button>Prev</Button>
    <Button>Next</Button>
    <Button>Last</Button>
  </div>
</div>
```

### Status Badge (Toggleable)
```tsx
<Badge
  variant={status === "active" ? "default" : "secondary"}
  className={cn(
    "cursor-pointer transition-colors",
    status === "active"
      ? "bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700"
      : "bg-muted text-muted-foreground hover:bg-green-100 hover:text-green-700"
  )}
>
  • {status === "active" ? "Active" : "Inactive"}
</Badge>
```

---

## Future Database Schema

### Customers Table
```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  address TEXT,
  email VARCHAR(255),
  cnic VARCHAR(20),
  contact_no VARCHAR(20),
  opening_balance DECIMAL(15,2) DEFAULT 0,
  credit_limit DECIMAL(15,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  customer_type VARCHAR(20) DEFAULT 'registered' CHECK (customer_type IN ('registered', 'walking')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_customers_cnic ON customers(cnic);
```

### Suppliers Table
```sql
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255),
  company_name VARCHAR(255) NOT NULL,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100),
  zip_code VARCHAR(20),
  email VARCHAR(255),
  phone VARCHAR(20),
  cnic VARCHAR(20),
  contact_person VARCHAR(255),
  tax_id VARCHAR(50),
  payment_terms VARCHAR(50),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_suppliers_status ON suppliers(status);
CREATE INDEX idx_suppliers_code ON suppliers(code);
CREATE INDEX idx_suppliers_company_name ON suppliers(company_name);
```

### Customer Transactions View
```sql
CREATE VIEW v_customer_transactions AS
SELECT 
  c.id,
  c.name,
  c.credit_limit,
  COALESCE(SUM(i.grand_total), 0) as total_sales,
  COALESCE(SUM(i.paid_amount), 0) as total_received,
  COALESCE(SUM(i.grand_total - i.paid_amount), 0) as outstanding,
  COUNT(i.id) as invoice_count
FROM customers c
LEFT JOIN invoices i ON c.id = i.customer_id
GROUP BY c.id, c.name, c.credit_limit;
```

### Supplier Transactions View
```sql
CREATE VIEW v_supplier_transactions AS
SELECT 
  s.id,
  s.company_name,
  s.payment_terms,
  COALESCE(SUM(po.grand_total), 0) as total_purchases,
  COALESCE(SUM(po.paid_amount), 0) as total_paid,
  COALESCE(SUM(po.grand_total - po.paid_amount), 0) as outstanding,
  COUNT(po.id) as order_count
FROM suppliers s
LEFT JOIN purchase_orders po ON s.id = po.supplier_id
GROUP BY s.id, s.company_name, s.payment_terms;
```

---

## Related Documentation

| Document | Description |
|----------|-------------|
| [Sales & Invoicing System](./SALES_INVOICING_SYSTEM.md) | Customer usage in sales transactions |
| [Inventory Management System](./INVENTORY_MANAGEMENT_SYSTEM.md) | Purchase orders and supplier integration |
| [Reports & Analytics System](./REPORTS_ANALYTICS_SYSTEM.md) | Customer/Supplier analysis reports |
| [Accounting & Financial System](./ACCOUNTING_FINANCIAL_SYSTEM.md) | Receivables and payables integration |

---

## Workflow Diagrams

### Complete Customer Lifecycle
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CUSTOMER LIFECYCLE                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐              │
│  │ Create   │───►│ Active   │───►│ Invoice  │───►│ Payment  │              │
│  │ Customer │    │ Customer │    │ Created  │    │ Received │              │
│  └──────────┘    └─────┬────┘    └──────────┘    └─────┬────┘              │
│                        │                               │                    │
│                        ▼                               ▼                    │
│                 ┌──────────────┐              ┌──────────────┐              │
│                 │ Price        │              │ Aging        │              │
│                 │ Structures   │              │ Reports      │              │
│                 └──────────────┘              └──────────────┘              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Complete Supplier Lifecycle
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SUPPLIER LIFECYCLE                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐              │
│  │ Create   │───►│ Active   │───►│ Purchase │───►│ Goods    │              │
│  │ Supplier │    │ Supplier │    │ Order    │    │ Received │              │
│  └──────────┘    └─────┬────┘    └──────────┘    └─────┬────┘              │
│                        │                               │                    │
│                        ▼                               ▼                    │
│                 ┌──────────────┐              ┌──────────────┐              │
│                 │ Performance  │              │ Purchase     │              │
│                 │ Tracking     │              │ Reports      │              │
│                 └──────────────┘              └──────────────┘              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Integration Points Summary

| Component | Uses Customer Data | Uses Supplier Data |
|-----------|-------------------|-------------------|
| SalesInvoice | ✅ Customer selection, billing | ❌ |
| SalesQuotation | ✅ Customer quotes | ❌ |
| PurchaseOrder | ❌ | ✅ Supplier selection |
| DirectPurchaseOrder | ❌ | ✅ Supplier selection |
| CustomerPriceStructures | ✅ Customer-specific pricing | ❌ |
| DistributorAging | ✅ Customer receivables | ❌ |
| ReceivableReminders | ✅ Payment reminders | ❌ |
| CustomerAnalysisTab | ✅ Sales analysis | ❌ |
| CustomerAgingTab | ✅ Aging reports | ❌ |
| SupplierPerformanceTab | ❌ | ✅ Performance metrics |
| PurchasesReportTab | ❌ | ✅ Purchase reports |
| PurchaseComparisonTab | ❌ | ✅ Supplier comparison |
| ImportExpensesTab | ❌ | ✅ Import expenses |
