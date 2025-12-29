# Inventory Management System Documentation

> ⚠️ **IMPORTANT NOTICE**: Do NOT change the logic or front-end UI of this system. This document is for reference only.

## Table of Contents
1. [System Overview](#system-overview)
2. [Module Architecture](#module-architecture)
3. [Inventory Dashboard](#inventory-dashboard)
4. [Stock In/Out](#stock-inout)
5. [Stock Transfer](#stock-transfer)
6. [Stock Verification](#stock-verification)
7. [Adjust Item](#adjust-item)
8. [Stock Balance & Valuation](#stock-balance--valuation)
9. [Multi-Dimensional Reporting](#multi-dimensional-reporting)
10. [Stock Analysis](#stock-analysis)
11. [Price Control](#price-control)
12. [Purchase Order](#purchase-order)
13. [Direct Purchase Order](#direct-purchase-order)
14. [Racks & Shelves](#racks--shelves)
15. [Button Functions Summary](#button-functions-summary)
16. [Notification System](#notification-system)

---

## System Overview

The Inventory Management System provides comprehensive control over inventory operations including:
- **Real-time Monitoring**: Dashboard with key metrics and charts
- **Stock Movements**: Track all stock in/out transactions
- **Transfers**: Move stock between locations
- **Verification**: Physical stock counting and reconciliation
- **Adjustments**: Correct stock discrepancies
- **Valuation**: Calculate inventory worth using various methods
- **Analysis**: Identify fast/slow/dead moving stock
- **Purchasing**: Manage purchase orders and direct purchases
- **Organization**: Manage racks and shelves for storage

---

## Module Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        INVENTORY MANAGEMENT SYSTEM                              │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                              INVENTORY DASHBOARD                                │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐        │
│  │ Total     │ │ Total     │ │ Total     │ │ Low       │ │ Out of    │        │
│  │ Parts     │ │ Value     │ │ Qty       │ │ Stock     │ │ Stock     │        │
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘ └───────────┘        │
│                                                                                 │
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐             │
│  │ Charts & Analytics         │  │ Top Items & Trends          │             │
│  └─────────────────────────────┘  └─────────────────────────────┘             │
└─────────────────────────────────────────────────────────────────────────────────┘
                                      │
            ┌─────────────────────────┼─────────────────────────┐
            │                         │                         │
            ▼                         ▼                         ▼
┌─────────────────────┐   ┌─────────────────────┐   ┌─────────────────────┐
│   STOCK MOVEMENTS   │   │   STOCK CONTROL     │   │    PURCHASING       │
│                     │   │                     │   │                     │
│ • Stock In/Out      │   │ • Verification      │   │ • Purchase Order    │
│ • Stock Transfer    │   │ • Adjust Item       │   │ • Direct PO         │
│                     │   │ • Balance/Valuation │   │                     │
└─────────────────────┘   └─────────────────────┘   └─────────────────────┘
            │                         │                         │
            ▼                         ▼                         ▼
┌─────────────────────┐   ┌─────────────────────┐   ┌─────────────────────┐
│   REPORTING         │   │   PRICE CONTROL     │   │    ORGANIZATION     │
│                     │   │                     │   │                     │
│ • Multi-Dimensional │   │ • Price Adjustment  │   │ • Racks & Shelves   │
│ • Stock Analysis    │   │ • Margin Control    │   │ • Store Management  │
└─────────────────────┘   └─────────────────────┘   └─────────────────────┘
```

---

## Inventory Dashboard

### Overview
Central hub displaying real-time inventory metrics, charts, and key performance indicators.

### Data Structure
```typescript
const statsData = {
  totalParts: number;      // Total number of parts
  activeParts: number;     // Active parts count
  totalValue: number;      // Total inventory value
  totalQty: number;        // Total quantity in stock
  categories: number;      // Number of categories
  lowStock: number;        // Items below reorder level
  outOfStock: number;      // Items with zero quantity
};
```

### Dashboard Components

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              DASHBOARD LAYOUT                                   │
└─────────────────────────────────────────────────────────────────────────────────┘

Row 1: Stat Cards (6 cards)
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ Total    │ │ Total    │ │ Total    │ │Categories│ │ Low      │ │ Out of   │
│ Parts    │ │ Value    │ │ Qty      │ │          │ │ Stock*   │ │ Stock*   │
└──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘
                                                    * Clickable - opens dialog

Row 2: Charts
┌────────────────────────────────────┐ ┌────────────────────────────────────┐
│ Inventory Value by Category        │ │ Parts Distribution (Pie Chart)    │
│ (Horizontal Bar Chart)             │ │                                    │
└────────────────────────────────────┘ └────────────────────────────────────┘

Row 3: Trend Charts
┌────────────────────────────────────┐ ┌────────────────────────────────────┐
│ Stock Movement Trends              │ │ Top Brands by Value               │
│ (Line Chart - 6 months)            │ │ (Bar Chart)                       │
└────────────────────────────────────┘ └────────────────────────────────────┘

Row 4: Tables
┌────────────────────────────────────┐ ┌────────────────────────────────────┐
│ Top 10 Items by Value              │ │ Top 10 Items by Quantity          │
└────────────────────────────────────┘ └────────────────────────────────────┘

Row 5: Additional Info
┌────────────────────────────────────┐ ┌────────────────────────────────────┐
│ Stock Distribution by Store        │ │ Recent Adjustments               │
└────────────────────────────────────┘ └────────────────────────────────────┘
```

### Features
| Feature | Description |
|---------|-------------|
| **Auto-Refresh** | Dashboard refreshes every 5 minutes automatically |
| **Manual Refresh** | Click "Refresh Data" button for immediate update |
| **Low Stock Dialog** | Click card to view items below reorder level |
| **Out of Stock Dialog** | Click card to view items with zero quantity |

### Button Functions
| Button | Action |
|--------|--------|
| **Refresh Data** | Manually refresh all dashboard data |
| **Low Stock Card** | Opens dialog with low stock items list |
| **Out of Stock Card** | Opens dialog with out of stock items list |

---

## Stock In/Out

### Overview
Track and monitor all stock movements including receipts (in) and issues (out).

### Data Structure
```typescript
interface StockItem {
  id: string;
  srNo: number;
  oemPartNo: string;
  name: string;
  brand: string;
  model: string;
  uom: string;
  qty: number;
  type: "in" | "out";    // Movement type
  store: string;
  rack: string;
  shelf: string;
}
```

### Workflow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         STOCK IN/OUT WORKFLOW                                   │
└─────────────────────────────────────────────────────────────────────────────────┘

Step 1: User applies filters
        │
        ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│  Filter Options:                                                              │
│  • Category (Dropdown with search)                                            │
│  • Sub Category (Dropdown with search)                                        │
│  • Item (Dropdown with search)                                                │
│  • From Date (Date picker)                                                    │
│  • To Date (Date picker)                                                      │
└───────────────────────────────────────────────────────────────────────────────┘
        │
        ▼
Step 2: Click "Search" button
        │
        ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│  Results Table displayed with:                                                │
│  • Sr. No, OEM/Part No, Name, Brand, Model, UOM                              │
│  • Qty (green for +IN, red for -OUT)                                         │
│  • Store, Rack, Shelf location                                                │
└───────────────────────────────────────────────────────────────────────────────┘
        │
        ▼
Step 3: Export or print results
```

### Display Logic
```typescript
// Quantity display with color coding
<TableCell className={cn(
  "text-sm font-semibold text-center",
  stockItem.type === "in" ? "text-green-600" : "text-red-600"
)}>
  {stockItem.type === "in" ? `+${stockItem.qty}` : `-${stockItem.qty}`}
</TableCell>
```

### Button Functions
| Button | Action |
|--------|--------|
| **Search** | Apply filters and search records |
| **Print Report** | Generate printable report |
| **Print Excel** | Export to Excel format |
| **Select All (Checkbox)** | Select all visible items |
| **Pagination** | Navigate through pages (First/Prev/Next/Last) |

---

## Stock Transfer

### Overview
Transfer stock between stores, racks, and shelves with full tracking.

### Data Structures
```typescript
interface TransferItem {
  id: string;
  partId: string;
  partName: string;
  availableQty: number;
  transferQty: number;
  fromStore: string;
  fromRack: string;
  fromShelf: string;
  toStore: string;
  toRack: string;
  toShelf: string;
}

interface Transfer {
  id: string;
  transferNumber: string;      // Auto-generated: STR-YYMM-XXX
  date: string;
  status: "Draft" | "Pending" | "In Transit" | "Completed" | "Cancelled";
  notes: string;
  items: TransferItem[];
  total: number;
}
```

### Transfer Number Generation
```typescript
const generateTransferNumber = () => {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
  return `STR-${year}${month}-${random}`;  // e.g., STR-2412-045
};
```

### Workflow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         STOCK TRANSFER WORKFLOW                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

Step 1: Click "+ Transfer" button
        │
        ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│  Transfer Form Opens with:                                                    │
│  • Transfer Number (auto-generated, read-only)                                │
│  • Transfer Date (required)                                                   │
│  • Status (Draft/Pending/In Transit/Completed/Cancelled)                     │
│  • Notes (optional)                                                           │
└───────────────────────────────────────────────────────────────────────────────┘
        │
        ▼
Step 2: Add items to transfer
        │
        ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│  For each item:                                                               │
│  • Select Part (shows available qty)                                          │
│  • Enter Transfer Qty (max = available)                                       │
│  • FROM Location: Store → Rack → Shelf                                        │
│  • TO Location: Store → Rack → Shelf                                          │
│  Note: TO Store dropdown excludes FROM Store                                  │
└───────────────────────────────────────────────────────────────────────────────┘
        │
        ▼
Step 3: Save transfer
        │
        ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│  System Actions:                                                              │
│  • Calculate total transferred quantity                                       │
│  • Save transfer record                                                       │
│  • Return to list view                                                        │
└───────────────────────────────────────────────────────────────────────────────┘
```

### Status Colors
```typescript
const statusColors = {
  Draft: "bg-gray-100 text-gray-600",
  Pending: "bg-yellow-100 text-yellow-600",
  "In Transit": "bg-blue-100 text-blue-600",
  Completed: "bg-green-100 text-green-600",
  Cancelled: "bg-red-100 text-red-600",
};
```

### Button Functions
| Button | Action |
|--------|--------|
| **+ Transfer** | Open create transfer form |
| **Add Item** | Add item row to transfer |
| **Remove (Trash icon)** | Remove item from transfer |
| **Create/Update Transfer** | Save the transfer |
| **Cancel** | Discard and return to list |
| **View (Eye icon)** | View transfer details |
| **Edit (Pencil icon)** | Edit existing transfer |
| **Delete (Trash icon)** | Delete transfer record |

---

## Stock Verification

### Overview
Physical stock counting and reconciliation with system records.

### Data Structures
```typescript
interface VerificationItem {
  id: string;
  partNo: string;
  description: string;
  location: string;
  systemQty: number;          // Qty in system
  physicalQty: number | null; // Counted qty
  variance: number | null;    // physicalQty - systemQty
  status: "Pending" | "Verified" | "Discrepancy";
  remarks: string;
}

interface VerificationSession {
  id: string;
  name: string;
  startDate: string;
  status: "Active" | "Completed" | "Cancelled";
  totalItems: number;
  verifiedItems: number;
  discrepancies: number;
}
```

### Workflow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                       STOCK VERIFICATION WORKFLOW                               │
└─────────────────────────────────────────────────────────────────────────────────┘

Step 1: Start New Verification Session
        │
        ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│  New Session Dialog:                                                          │
│  • Session Name (required)                                                    │
│  • Notes (optional)                                                           │
│  All items reset to "Pending" status                                          │
└───────────────────────────────────────────────────────────────────────────────┘
        │
        ▼
Step 2: Count physical stock
        │
        ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│  For each item in the table:                                                  │
│  • Enter physical count in "COUNT" column                                     │
│  • Variance auto-calculated: physicalQty - systemQty                          │
│  • Status auto-updated:                                                       │
│    - Pending: No count entered                                                │
│    - Verified: variance = 0                                                   │
│    - Discrepancy: variance ≠ 0                                               │
│  • Add remarks if needed                                                      │
└───────────────────────────────────────────────────────────────────────────────┘
        │
        ▼
Step 3: Complete or Cancel session
```

### Status Auto-Calculation
```typescript
const handleCountChange = (id: string, value: string) => {
  const numValue = value === "" ? null : parseInt(value);
  setItems((prev) =>
    prev.map((item) => {
      if (item.id === id) {
        const variance = numValue !== null ? numValue - item.systemQty : null;
        return {
          ...item,
          physicalQty: numValue,
          variance,
          status: numValue === null 
            ? "Pending" 
            : variance === 0 
              ? "Verified" 
              : "Discrepancy",
        };
      }
      return item;
    })
  );
};
```

### Summary Cards
| Card | Description |
|------|-------------|
| **Total Items** | Total items to verify |
| **Pending** | Items not yet counted (blue) |
| **Verified** | Items with matching count (green) |
| **Discrepancies** | Items with variance (red) |

### Button Functions
| Button | Action |
|--------|--------|
| **Start New Verification** | Opens new session dialog |
| **Export CSV** | Download verification data as CSV |
| **Print** | Print verification report |
| **Complete** | Mark session as completed |
| **Cancel** | Cancel active session |
| **Reset (Filters)** | Clear all search/filter criteria |

---

## Adjust Item

### Overview
Make inventory adjustments to correct stock discrepancies, add or remove inventory.

### Data Structures
```typescript
interface AdjustmentItem {
  id: string;
  itemId: string;
  itemName: string;
  qtyInStock: number;
  quantity: number;          // Adjustment qty
  lastPurchaseRate: number;
  rate: number;
  total: number;             // quantity × rate
}

interface AdjustmentRecord {
  id: string;
  date: string;
  subject: string;
  store: string;
  addInventory: boolean;     // true = add, false = subtract
  items: AdjustmentItem[];
  notes: string;
  totalAmount: number;
}
```

### Workflow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        ADJUST ITEM WORKFLOW                                     │
└─────────────────────────────────────────────────────────────────────────────────┘

Step 1: Click "+ Adjust" button
        │
        ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│  Adjustment Form:                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │ Toggle: Add Inventory (ON) / Subtract Inventory (OFF)                   │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│  • Date (auto-set to today)                                                   │
│  • Subject (optional description)                                             │
│  • Store (required dropdown)                                                  │
│  • Category filter (optional)                                                 │
│  • Sub Category filter (optional)                                             │
│  • Notes (optional)                                                           │
└───────────────────────────────────────────────────────────────────────────────┘
        │
        ▼
Step 2: Add adjustment items
        │
        ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│  Items Table:                                                                 │
│  • Select Item (populates Qty in Stock, Last Purchase Rate)                   │
│  • Enter Quantity                                                             │
│  • Enter Rate                                                                 │
│  • Total auto-calculated (Quantity × Rate)                                    │
└───────────────────────────────────────────────────────────────────────────────┘
        │
        ▼
Step 3: Save adjustment
```

### Validation Rules
```typescript
const handleSave = () => {
  if (!store) {
    toast({ title: "Validation Error", description: "Please select a store" });
    return;
  }

  const hasValidItems = adjustmentItems.some(item => item.quantity > 0 && item.rate > 0);
  if (!hasValidItems) {
    toast({ title: "Validation Error", description: "Please add at least one item with quantity and rate" });
    return;
  }
  // Save logic...
};
```

### Button Functions
| Button | Action |
|--------|--------|
| **+ Adjust** | Open adjustment form |
| **Add Item** | Add new item row |
| **Remove** | Remove item from adjustment |
| **Save** | Save the adjustment record |
| **Reset** | Clear all form fields |
| **Cancel** | Return to list without saving |
| **View** | View adjustment details |
| **Edit** | Edit existing adjustment |
| **Delete** | Delete adjustment record |

---

## Stock Balance & Valuation

### Overview
View inventory stock levels and calculate valuation using different methods.

### Data Structure
```typescript
interface StockItem {
  id: number;
  partNo: string;
  description: string;
  category: string;
  uom: string;
  quantity: number;
  cost: number;
  value: number;        // quantity × cost
  store: string;
  location: string;
}
```

### Valuation Methods
| Method | Description |
|--------|-------------|
| **Average Cost** | Uses weighted average of all purchases |
| **FIFO** | First In, First Out costing |
| **LIFO** | Last In, First Out costing |
| **Standard Cost** | Uses predetermined standard costs |

### Stats Calculations
```typescript
const stats = useMemo(() => {
  const totalItems = filteredData.length;
  const totalQuantity = filteredData.reduce((sum, item) => sum + item.quantity, 0);
  const totalValue = filteredData.reduce((sum, item) => sum + item.value, 0);
  const avgUnitCost = totalQuantity > 0 ? totalValue / totalQuantity : 0;
  return { totalItems, totalQuantity, totalValue, avgUnitCost };
}, [filteredData]);
```

### Features
| Feature | Description |
|---------|-------------|
| **Value by Category Chart** | Horizontal bar chart showing value per category |
| **Stock by Store Chart** | Shows quantity distribution across stores |
| **Detailed Table** | All items with quantity, cost, value, location |
| **Filters** | Search, Category, Store, Valuation Method |

### Button Functions
| Button | Action |
|--------|--------|
| **Export CSV** | Download stock data as CSV |
| **Print PDF** | Generate printable PDF report |

---

## Multi-Dimensional Reporting

### Overview
Analyze inventory data across multiple dimensions (Category, Brand, Store, Location, UOM).

### Configuration Options
```typescript
const dimensions = ["Category", "Brand", "Store", "Location", "UOM"];

// User can select up to 3 dimensions:
// - Primary Dimension (required)
// - Secondary Dimension (optional)
// - Tertiary Dimension (optional)
```

### Report Structure
```typescript
interface ReportRow {
  id: string;
  dimension: string;       // Value of the dimension (e.g., "Engine Parts")
  items: number;           // Count of items
  quantity: number;        // Total quantity
  value: number;           // Total value
  percentOfTotal: number;  // Percentage of total value
  avgCost: number;         // Average cost per unit
}
```

### Features
| Feature | Description |
|---------|-------------|
| **Dimension Selection** | Choose up to 3 dimensions to analyze |
| **Category Filter** | Filter by specific category |
| **Brand Filter** | Filter by specific brand |
| **Sorting** | Sort by Value, Quantity, Items, Avg Cost, or Name |
| **Direction Toggle** | Ascending or Descending order |

### Button Functions
| Button | Action |
|--------|--------|
| **Generate Report** | Apply dimensions and generate report |
| **Export CSV** | Download report as CSV |
| **Print PDF** | Generate printable PDF |
| **Sort Direction** | Toggle asc/desc sorting |

---

## Stock Analysis

### Overview
Classify and analyze stock movement patterns (Fast, Normal, Slow, Dead stock).

### Classification Logic
```typescript
type Classification = "Fast" | "Normal" | "Slow" | "Dead";

const classifyItem = (item: StockItem): Classification => {
  if (item.daysIdle >= deadStockDays || item.turnover === 0) return "Dead";
  if (item.daysIdle >= slowMovingDays) return "Slow";
  if (item.daysIdle <= fastMovingDays && item.turnover >= 5) return "Fast";
  return "Normal";
};
```

### Configuration Parameters
| Parameter | Default | Description |
|-----------|---------|-------------|
| **Fast Moving** | ≤30 days | Items with activity within these days |
| **Slow Moving** | ≥90 days | Items idle for these many days |
| **Dead Stock** | ≥180 days | Items with no movement |
| **Analysis Period** | 6 months | Period for turnover calculation |

### Summary Cards (Color-Coded)
| Card | Color | Description |
|------|-------|-------------|
| **Fast Moving** | Green | High turnover items |
| **Normal Moving** | Yellow | Average turnover items |
| **Slow Moving** | Orange | Low turnover items |
| **Dead Stock** | Red | No movement items |

### Workflow
```
User configures analysis parameters
        │
        ▼
System classifies all items
        │
        ▼
Display summary cards with counts and values
        │
        ▼
User can filter by classification tab (All/Fast/Normal/Slow/Dead)
        │
        ▼
Export or print report
```

### Button Functions
| Button | Action |
|--------|--------|
| **Export CSV** | Download analysis as CSV |
| **Print PDF** | Generate printable report |
| **Classification Tabs** | Filter items by classification |

---

## Price Control

### Overview
Manage product pricing, costs, and profit margins.

### Data Structure
```typescript
interface PriceItem {
  id: string;
  partNo: string;
  description: string;
  category: string;
  currentCost: number;
  currentPrice: number;
  margin: number;           // ((price - cost) / price) × 100
  lastUpdated: string;
  priceHistory: { date: string; price: number }[];
}
```

### Margin Calculation
```typescript
const margin = ((price - cost) / price) * 100;
```

### Margin Color Coding
```typescript
// Badge colors based on margin percentage
margin >= 35%  → Green (Healthy)
margin >= 30%  → Blue (Acceptable)
margin < 30%   → Orange (Low)
```

### Inline Editing
```
Click Edit icon on row
        │
        ▼
Cost and Price fields become editable
        │
        ▼
Enter new values
        │
        ▼
Click ✓ to save or ✗ to cancel
        │
        ▼
Margin auto-recalculates
Price history updated
```

### Summary Cards
| Card | Description |
|------|-------------|
| **Total Items** | Count of all priced items |
| **Avg. Margin** | Average margin percentage |
| **Updated Today** | Items updated today |
| **Low Margin (<30%)** | Items with margin below 30% |

### Button Functions
| Button | Action |
|--------|--------|
| **Export Prices** | Download price list |
| **Edit (Pencil)** | Start inline editing |
| **Save (Check)** | Save price changes |
| **Cancel (X)** | Cancel editing |

---

## Purchase Order

### Overview
Create and manage purchase orders from suppliers with full item tracking.

### Data Structures
```typescript
interface PurchaseOrderItem {
  id: string;
  partNo: string;
  description: string;
  brand: string;
  uom: string;
  quantity: number;
  receivedQty: number;
  purchasePrice: number;
  salePrice: number;
  cost: number;
  amount: number;
  remarks: string;
}

interface PurchaseOrder {
  id: string;
  poNo: string;              // Auto-generated
  supplier: string;
  store: string;
  requestDate: string;
  receiveDate: string | null;
  grandTotal: number;
  remarks: string;
  status: "Draft" | "Pending" | "Received" | "Cancelled";
  items: PurchaseOrderItem[];
}
```

### PO Number Format
```
PO-YYYY-XXX
Example: PO-2024-001
```

### Workflow
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                       PURCHASE ORDER WORKFLOW                                   │
└─────────────────────────────────────────────────────────────────────────────────┘

Create PO                    Submit                     Receive
   │                           │                           │
   ▼                           ▼                           ▼
┌─────────┐              ┌─────────┐              ┌─────────┐
│ Draft   │──────────────│ Pending │──────────────│Received │
└─────────┘              └─────────┘              └─────────┘
     │                        │
     │                        ▼
     │                  ┌─────────┐
     └──────────────────│Cancelled│
                        └─────────┘
```

### Features
| Feature | Description |
|---------|-------------|
| **Supplier Selection** | Choose from supplier list |
| **Store Assignment** | Assign receiving store |
| **Multi-Item Support** | Add multiple items per PO |
| **Expense Tracking** | Add freight, customs, etc. |
| **Print Options** | Customizable column selection |
| **Rack/Shelf Assignment** | Assign storage location |

### Button Functions
| Button | Action |
|--------|--------|
| **+ New Order** | Create new purchase order |
| **Add Item** | Add item to PO |
| **Remove Item** | Remove item from PO |
| **Save** | Save purchase order |
| **View** | View PO details with print options |
| **Edit** | Edit existing PO |
| **Delete** | Delete PO (with confirmation) |
| **Receive** | Mark PO as received |
| **Print** | Print with selected columns |
| **Generate PDF** | Create PDF document |

---

## Direct Purchase Order

### Overview
Quick purchase entry for direct/cash purchases without prior PO.

### Data Structure
```typescript
interface DirectPurchaseOrder {
  id: string;
  dpoNo: string;           // Auto-generated: DPO-YYYY-XXX
  store: string;
  requestDate: string;
  description: string;
  grandTotal: number;
  status: "Draft" | "Completed" | "Cancelled";
  items: DirectPurchaseOrderItem[];
  account: string;         // Payment account
}
```

### Key Differences from Regular PO
| Aspect | Regular PO | Direct PO |
|--------|------------|-----------|
| **Supplier** | Required | Optional |
| **Payment Account** | Not tracked | Required |
| **Default Status** | Draft | Completed |
| **Use Case** | Planned purchases | Cash/immediate purchases |

### Button Functions
| Button | Action |
|--------|--------|
| **+ New DPO** | Create direct purchase |
| **Add Item** | Add item to DPO |
| **Add Expense** | Add associated expense |
| **Add Rack** | Create new rack |
| **Add Shelf** | Create new shelf |
| **Save** | Save and complete DPO |
| **Back** | Return to list |

---

## Racks & Shelves

### Overview
Manage storage locations (racks and shelves) for inventory organization.

### Data Structures
```typescript
interface Rack {
  id: string;
  codeNo: string;          // e.g., "RACK-A01"
  store: string;
  description: string;
  status: "Active" | "Inactive";
  shelfCount: number;
}

interface Shelf {
  id: string;
  shelfNo: string;         // e.g., "SHELF-01"
  rackId: string;          // Parent rack
  rackCode: string;
  store: string;
  description: string;
  status: "Active" | "Inactive";
}
```

### Hierarchy
```
Store
  └── Rack (multiple per store)
        └── Shelf (multiple per rack)
```

### Layout
```
┌────────────────────────────────┐  ┌────────────────────────────────┐
│         RACKS LIST             │  │        SHELVES LIST            │
│                                │  │                                │
│  + Add New Rack                │  │  + Add New Shelf               │
│                                │  │                                │
│  ┌─────────────────────────┐  │  │  ┌─────────────────────────┐   │
│  │ RACK-A01                │  │  │  │ SHELF-01                │   │
│  │ Store: Main Warehouse   │  │  │  │ Rack: RACK-A01          │   │
│  │ 3 shelves    [Active]   │  │  │  │ Store: Main Warehouse   │   │
│  │         [Edit] [Delete] │  │  │  │ [Active] [Edit] [Delete]│   │
│  └─────────────────────────┘  │  │  └─────────────────────────┘   │
└────────────────────────────────┘  └────────────────────────────────┘
```

### Cascade Delete Logic
```typescript
// When deleting a rack, all associated shelves are also deleted
const confirmDeleteRack = (rack: Rack) => {
  setShelves((prev) => prev.filter((s) => s.rackId !== rack.id));
  setRacks((prev) => prev.filter((r) => r.id !== rack.id));
};
```

### Button Functions
| Button | Action |
|--------|--------|
| **Add New Rack** | Open rack creation form |
| **Add New Shelf** | Open shelf creation form |
| **Edit** | Edit rack/shelf details |
| **Delete** | Delete with confirmation |
| **Create/Update** | Save changes |
| **Cancel** | Discard changes |

---

## Button Functions Summary

### Common Buttons Across Modules

| Button | Icon | Action | Location |
|--------|------|--------|----------|
| **Search** | 🔍 | Apply filters | Filter sections |
| **Export CSV** | 📄 | Download as CSV | Headers |
| **Print/PDF** | 🖨️ | Generate printable | Headers |
| **Refresh** | 🔄 | Refresh data | Headers |
| **Add/New** | ➕ | Create new record | Headers |
| **Edit** | ✏️ | Edit record | Row actions |
| **Delete** | 🗑️ | Delete record | Row actions |
| **View** | 👁️ | View details | Row actions |
| **Save** | ✓ | Save changes | Forms |
| **Cancel** | ✗ | Cancel/close | Forms |
| **Reset** | ↩️ | Reset form/filters | Forms |

### Pagination Controls
| Button | Action |
|--------|--------|
| **First** | Go to first page |
| **Prev** | Go to previous page |
| **Next** | Go to next page |
| **Last** | Go to last page |
| **Items per page** | Change page size (10/25/50/100) |

---

## Notification System

### Success Notifications
| Action | Message |
|--------|---------|
| Transfer Created | "Transfer created successfully" |
| Transfer Updated | "Transfer updated successfully" |
| Verification Complete | "Verification session completed" |
| Adjustment Saved | "Adjustment created/updated successfully" |
| Rack Created | "Rack created successfully" |
| Shelf Created | "Shelf created successfully" |
| PO Created | "Purchase order created successfully" |
| Price Updated | Price and margin saved |
| Data Refreshed | "Dashboard data has been updated" |

### Error Notifications
| Condition | Message |
|-----------|---------|
| Missing required field | "Please select/enter [field name]" |
| No items added | "Please add at least one item" |
| Invalid data | "Please enter valid [data type]" |

### Info Notifications
| Event | Message |
|-------|---------|
| Export Started | "CSV file is being generated..." |
| Print Started | "PDF is being generated..." |
| Report Generated | "Report generated with [dimensions]" |

---

## Database Schema (Future Implementation)

```sql
-- Stock Movements Table
CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  part_id UUID NOT NULL REFERENCES parts(id),
  type VARCHAR(10) NOT NULL CHECK (type IN ('in', 'out')),
  quantity INTEGER NOT NULL,
  store_id UUID REFERENCES stores(id),
  rack_id UUID REFERENCES racks(id),
  shelf_id UUID REFERENCES shelves(id),
  reference_type VARCHAR(50),  -- 'purchase', 'sale', 'transfer', 'adjustment'
  reference_id UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Transfers Table
CREATE TABLE transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transfer_number VARCHAR(50) UNIQUE NOT NULL,
  date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'Draft',
  notes TEXT,
  total_qty INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Transfer Items Table
CREATE TABLE transfer_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transfer_id UUID NOT NULL REFERENCES transfers(id) ON DELETE CASCADE,
  part_id UUID NOT NULL REFERENCES parts(id),
  from_store_id UUID REFERENCES stores(id),
  from_rack_id UUID REFERENCES racks(id),
  from_shelf_id UUID REFERENCES shelves(id),
  to_store_id UUID REFERENCES stores(id),
  to_rack_id UUID REFERENCES racks(id),
  to_shelf_id UUID REFERENCES shelves(id),
  quantity INTEGER NOT NULL
);

-- Adjustments Table
CREATE TABLE adjustments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  subject VARCHAR(255),
  store_id UUID REFERENCES stores(id),
  add_inventory BOOLEAN DEFAULT true,
  notes TEXT,
  total_amount DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Racks Table
CREATE TABLE racks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code_no VARCHAR(50) UNIQUE NOT NULL,
  store_id UUID REFERENCES stores(id),
  description TEXT,
  status VARCHAR(20) DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Shelves Table
CREATE TABLE shelves (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shelf_no VARCHAR(50) NOT NULL,
  rack_id UUID NOT NULL REFERENCES racks(id) ON DELETE CASCADE,
  description TEXT,
  status VARCHAR(20) DEFAULT 'Active',
  UNIQUE(rack_id, shelf_no)
);

-- Indexes
CREATE INDEX idx_movements_part ON stock_movements(part_id);
CREATE INDEX idx_movements_date ON stock_movements(created_at);
CREATE INDEX idx_transfers_status ON transfers(status);
CREATE INDEX idx_shelves_rack ON shelves(rack_id);
```

---

> ⚠️ **REMINDER**: This document describes the current system logic. Do NOT modify the frontend UI or business logic based on this documentation.
