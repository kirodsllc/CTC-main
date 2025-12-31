# Pricing & Costing Management System Documentation

## Overview

The Pricing & Costing Management module provides comprehensive tools for managing product costs, pricing levels, profit margins, and tracking price changes over time. It enables businesses to maintain profitability through strategic pricing decisions and historical analysis.

## Module Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Pricing & Costing Management                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐  ┌────────────────┐  ┌──────────────┐  ┌───────────────┐   │
│  │  Dashboard  │  │ Price Updating │  │ Profitability│  │ Price History │   │
│  │             │  │                │  │              │  │               │   │
│  │ • Stats     │  │ • Individual   │  │ • Analysis   │  │ • Audit Trail │   │
│  │ • Charts    │  │ • Group Level  │  │ • Category   │  │ • Filters     │   │
│  │ • Alerts    │  │ • Bulk %       │  │ • Items      │  │ • Export      │   │
│  └─────────────┘  └────────────────┘  └──────────────┘  └───────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                         Dialogs                                         │ │
│  │  • Landed Cost Calculator  • Set Margins  • Bulk % Adjustment           │ │
│  │  • Item Price History                                                    │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Tab Components

### 1. Dashboard Tab

Provides an overview of pricing health and profitability metrics.

#### Summary Cards

| Card | Description | Color |
|------|-------------|-------|
| Total Stock Value | Sum of (PriceA × Quantity) for all items | `primary` |
| Potential Profit | Stock Value - Total Cost | `success` |
| Average Margin | Mean margin % across priced items | `warning` |
| Margin Alerts | Count of items below 10% margin | `destructive` |

#### Dashboard Components

1. **Margin Distribution Chart**
   - Low Margin (<10%): `destructive` color
   - Normal Margin (10-50%): `success` color
   - High Margin (>50%): `info` color
   - No Price Set: `muted-foreground` color

2. **Cost vs Revenue Analysis**
   - Total Cost display
   - Total Revenue display
   - Profit calculation

3. **Low Margin Alerts Table**
   - Lists items with margin below 10%
   - Columns: Part No, Description, Cost, Price, Margin, Status

---

### 2. Price Updating Tab

Enables individual and bulk price modifications.

#### Update Modes

| Mode | Description |
|------|-------------|
| Individual | Edit prices one item at a time in the table |
| Group Level | Apply changes by Category or Brand |

#### Features

1. **Stats Cards**
   - Total Items count
   - Selected items count
   - Modified items count
   - Categories count

2. **Individual Price Editor Table**
   - Checkbox selection (individual + select all)
   - Search by Part No or Description
   - Filter by Category
   - Filter by Brand
   - Inline editing for: New Cost, New Price A, New Price B, New Price M
   - Visual highlight for modified rows

3. **Bulk Percentage Adjustment**
   - Percentage value input
   - Adjustment type: Increase / Decrease
   - Apply to: Cost, Price A, Price B, Price M (checkboxes)

---

### 3. Profitability Tab

Analyzes profit margins at item and category levels.

#### Summary Metrics

| Metric | Description |
|--------|-------------|
| Total Revenue | Sum of all item revenues |
| Total Cost | Sum of all item costs |
| Net Profit | Revenue - Cost |
| Average Margin | Mean margin percentage |

#### Analysis Components

1. **Category Profitability**
   - Breakdown by product category
   - Revenue, Cost, Profit per category
   - Margin percentage per category

2. **Item-Level Analysis**
   - Individual item profitability
   - Margin calculations
   - Performance indicators

---

### 4. Price History Tab

Tracks all price changes with audit trail capabilities.

#### Summary Cards

| Card | Description | Color |
|------|-------------|-------|
| Total Changes | Count of all price updates | default |
| Individual Updates | Single-item price changes | `primary` |
| Bulk Updates | Multiple items updated together | `success` |
| Margin Updates | Margin-based adjustments | `warning` |

#### History Table Columns

| Column | Description |
|--------|-------------|
| Date & Time | When the change occurred |
| Part No | Item identifier |
| Description | Item name |
| Updated By | User who made the change |
| Reason | Justification for the update |
| Type | individual / bulk / margin |
| Changes | Before/after values |
| Actions | View item history button |

#### Filter Options

- Search by Part No, User, or Reason
- Filter by Update Type: All, Individual, Bulk, Margin

---

## Data Structures

### PriceItem Interface

```typescript
interface PriceItem {
  id: string;
  partNo: string;
  description: string;
  category: string;
  brand: string;
  cost: number;           // Current cost
  newCost: number;        // Pending new cost
  priceA: number;         // Current Price Level A
  newPriceA: number;      // Pending Price A
  priceB: number;         // Current Price Level B
  newPriceB: number;      // Pending Price B
  priceM: number;         // Current Price Level M (MRP)
  newPriceM: number;      // Pending Price M
  quantity: number;       // Stock quantity
  selected: boolean;      // UI selection state
  modified: boolean;      // Has pending changes
}
```

### PriceLevel Interface

```typescript
interface PriceLevel {
  id: string;
  name: string;           // Level name (e.g., "Retail", "Wholesale")
  description: string;
  markup: number;         // Markup percentage from cost
  customerType: string;   // Associated customer type
  itemCount: number;      // Items using this level
}
```

### LandedCostEntry Interface

```typescript
interface LandedCostEntry {
  id: string;
  poNumber: string;       // Purchase Order reference
  date: string;
  supplier: string;
  itemCount: number;
  invoiceValue: number;   // Base invoice amount
  freight: number;        // Shipping costs
  customs: number;        // Import duties
  insurance: number;      // Insurance charges
  handling: number;       // Handling fees
  totalLanded: number;    // Calculated total
  status: "pending" | "calculated" | "applied";
}
```

### PriceHistoryEntry Interface

```typescript
interface PriceHistoryEntry {
  id: string;
  itemId: string;         // Reference to PriceItem
  partNo: string;
  description: string;
  date: string;           // YYYY-MM-DD
  time: string;           // HH:MM:SS
  updatedBy: string;      // User name
  reason: string;         // Update justification
  updateType: "individual" | "bulk" | "margin";
  changes: {
    field: string;        // e.g., "priceA", "cost"
    oldValue: number;
    newValue: number;
  }[];
}
```

### BulkPercentage State

```typescript
interface BulkPercentageState {
  percentage: number;
  adjustmentType: "increase" | "decrease";
  applyToCost: boolean;
  applyToPriceA: boolean;
  applyToPriceB: boolean;
  applyToPriceM: boolean;
}
```

### MarginSettings State

```typescript
interface MarginSettings {
  minMargin: number;      // Minimum acceptable margin %
  targetMargin: number;   // Target margin %
  maxMargin: number;      // Maximum margin threshold
  applyTo: string;        // "all" or specific category
}
```

---

## Calculations

### Margin Calculation

```typescript
// Individual item margin
const margin = cost > 0 ? ((priceA - cost) / cost) * 100 : 0;

// Average margin across items
const avgMargin = itemsWithPrice.length > 0 
  ? itemsWithPrice.reduce((sum, item) => {
      const margin = item.cost > 0 
        ? ((item.priceA - item.cost) / item.cost) * 100 
        : 0;
      return sum + margin;
    }, 0) / itemsWithPrice.length
  : 0;
```

### Stock Value Calculations

```typescript
// Total stock value
const totalStockValue = items.reduce(
  (sum, item) => sum + (item.priceA * item.quantity), 0
);

// Total cost
const totalCost = items.reduce(
  (sum, item) => sum + (item.cost * item.quantity), 0
);

// Potential profit
const potentialProfit = totalStockValue - totalCost;

// Profit margin percentage
const profitMargin = totalCost > 0 
  ? ((potentialProfit / totalCost) * 100) 
  : 0;
```

### Margin Classification

```typescript
// Low margin items (< 10%)
const lowMarginItems = items.filter(item => {
  if (item.cost === 0 || item.priceA === 0) return false;
  const margin = ((item.priceA - item.cost) / item.cost) * 100;
  return margin < 10;
});

// Normal margin items (10-50%)
const normalMarginItems = items.filter(item => {
  if (item.cost === 0 || item.priceA === 0) return false;
  const margin = ((item.priceA - item.cost) / item.cost) * 100;
  return margin >= 10 && margin <= 50;
});

// High margin items (> 50%)
const highMarginItems = items.filter(item => {
  if (item.cost === 0 || item.priceA === 0) return false;
  const margin = ((item.priceA - item.cost) / item.cost) * 100;
  return margin > 50;
});
```

### Bulk Percentage Adjustment

```typescript
const multiplier = adjustmentType === "increase" 
  ? 1 + (percentage / 100)
  : 1 - (percentage / 100);

// Apply to selected items
items.map(item => {
  if (!item.selected) return item;
  return {
    ...item,
    newCost: applyToCost 
      ? Math.round(item.cost * multiplier * 100) / 100 
      : item.newCost,
    newPriceA: applyToPriceA 
      ? Math.round(item.priceA * multiplier * 100) / 100 
      : item.newPriceA,
    // ... similar for B and M
    modified: true,
  };
});
```

### Landed Cost Calculation

```typescript
const totalLandedCost = 
  invoiceValue + freight + customs + insurance + handling;
```

---

## Button Functions

### Dashboard Tab

| Button | Icon | Action |
|--------|------|--------|
| (Cards are clickable) | - | Navigate to relevant filtered view |

### Price Updating Tab

| Button | Icon | Action |
|--------|------|--------|
| Bulk % Adjust | `Percent` | Open bulk percentage dialog |
| Individual | - | Switch to individual edit mode |
| Group Level | - | Switch to group edit mode |
| Reset | - | Reset all changes to original |
| Apply Changes | - | Save all modified prices |

### Price History Tab

| Button | Icon | Action |
|--------|------|--------|
| Export History | `Download` | Download CSV of price history |
| View (row action) | `Eye` | View item-specific history |

---

## Dialog Components

### 1. Landed Cost Dialog

**Purpose:** Calculate total landed cost including all import expenses

**Fields:**
- PO Number (text)
- Supplier (text)
- Invoice Value (number)
- Freight (number)
- Customs (number)
- Insurance (number)
- Handling (number)

**Actions:**
- Cancel: Close without saving
- Calculate & Save: Process and store

### 2. Set Margins Dialog

**Purpose:** Apply target margin across items or categories

**Fields:**
- Target Margin % (number)
- Apply To (select): All Items / Specific Category

**Actions:**
- Cancel: Close without applying
- Apply Margins: Apply to selected scope

### 3. Bulk Percentage Dialog

**Purpose:** Adjust prices by percentage for selected items

**Fields:**
- Percentage (number, 0-100)
- Adjustment Type (select): Increase / Decrease
- Apply checkboxes: Cost, Price A, Price B, Price M

**Actions:**
- Cancel: Close without applying
- Apply Adjustment: Apply to selected items

### 4. Item History Dialog

**Purpose:** View price change history for a specific item

**Display:**
- Item details (Part No, Description)
- Timeline of changes
- Before/after values
- User and reason for each change

---

## Validation Rules

### Price Update Validation

1. **Reason Required**
   ```typescript
   if (!updateReason.trim()) {
     toast({
       title: "Reason Required",
       description: "Please provide a reason for the price update.",
       variant: "destructive",
     });
     return;
   }
   ```

2. **Changes Exist**
   ```typescript
   if (modifiedCount === 0) {
     toast({
       title: "No Changes",
       description: "There are no changes to apply.",
       variant: "destructive",
     });
     return;
   }
   ```

### Bulk Adjustment Validation

1. **Items Selected**
   ```typescript
   if (selectedItems.length === 0) {
     toast({
       title: "No Items Selected",
       description: "Please select items to apply the percentage adjustment.",
       variant: "destructive",
     });
     return;
   }
   ```

2. **Valid Percentage**
   ```typescript
   if (bulkPercentage.percentage === 0) {
     toast({
       title: "Invalid Percentage",
       description: "Please enter a percentage value greater than 0.",
       variant: "destructive",
     });
     return;
   }
   ```

---

## Export Functionality

### Pricing Report Export

```typescript
const handleExport = () => {
  const headers = [
    "Part No", "Description", "Category", 
    "Cost", "Price A", "Price B", "Price M", "Margin %"
  ];
  
  const csvContent = [
    headers.join(","),
    ...items.map(item => {
      const margin = item.cost > 0 
        ? ((item.priceA - item.cost) / item.cost * 100).toFixed(2) 
        : "0";
      return [
        item.partNo, 
        item.description, 
        item.category, 
        item.cost, 
        item.priceA, 
        item.priceB, 
        item.priceM, 
        margin
      ].join(",");
    })
  ].join("\n");

  // Download as pricing_report.csv
};
```

### Price History Export

```typescript
const headers = [
  "Date", "Time", "Part No", "Description", 
  "Updated By", "Reason", "Type", "Changes"
];

const csvContent = [
  headers.join(","),
  ...priceHistory.map(entry => [
    entry.date,
    entry.time,
    entry.partNo,
    `"${entry.description}"`,
    entry.updatedBy,
    `"${entry.reason}"`,
    entry.updateType,
    `"${entry.changes.map(c => 
      `${c.field}: ${c.oldValue} → ${c.newValue}`
    ).join('; ')}"`
  ].join(","))
].join("\n");

// Download as price_history.csv
```

---

## Inter-Module Relationships

### Related Modules

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         Pricing & Costing                                 │
│                              Module                                       │
└─────────────────────────────────┬────────────────────────────────────────┘
                                  │
          ┌───────────────────────┼───────────────────────┐
          │                       │                       │
          ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Inventory    │     │     Sales       │     │   Purchasing    │
│   Management    │     │    Invoicing    │     │     Module      │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ • Part Master   │     │ • Price lookup  │     │ • Cost updates  │
│ • Stock Balance │     │ • Customer      │     │ • Landed cost   │
│ • Item data     │     │   pricing       │     │ • PO costs      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
          │                       │                       │
          ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Customer      │     │    Reports &    │     │   Supplier      │
│   Pricing       │     │   Analytics     │     │  Management     │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ • Price levels  │     │ • Margin reports│     │ • Cost data     │
│ • Customer type │     │ • Profitability │     │ • Invoice value │
│ • Special rates │     │ • Trend analysis│     │ • Import costs  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Data Flow: Price Update to Sales

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Update Price  │────▶│  Price History  │────▶│  Sales Invoice  │
│   (Any method)  │     │  Entry Created  │     │  Uses New Price │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                                              │
        │                                              ▼
        │                                     ┌─────────────────┐
        │                                     │   Customer      │
        │                                     │   Price Level   │
        │                                     │   Applied       │
        │                                     └─────────────────┘
        ▼
┌─────────────────┐
│   Margin        │
│   Recalculated  │
└─────────────────┘
```

### Data Flow: Purchase to Cost Update

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Purchase Order  │────▶│  Landed Cost    │────▶│   Cost Update   │
│   Received      │     │  Calculation    │     │   Applied       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        │                       ▼                       ▼
        │               ┌─────────────────┐     ┌─────────────────┐
        │               │   Add: Freight  │     │   Price Auto-   │
        │               │   Customs, etc  │     │   Adjustment?   │
        │               └─────────────────┘     └─────────────────┘
        ▼
┌─────────────────┐
│   Invoice       │
│   Value         │
└─────────────────┘
```

---

## Notification Messages

### Success Notifications

| Action | Title | Description |
|--------|-------|-------------|
| Apply Changes | "Changes Applied" | "{count} item(s) updated successfully." |
| Export | "Export Complete" | "Pricing report exported successfully." |
| Landed Cost | "Landed Cost Calculated" | "Total landed cost: {amount}" |
| Margins | "Margins Applied" | "Target margin of {%}% applied to {scope}." |
| Bulk Adjust | "Bulk Adjustment Applied" | "{%}% {type} applied to {count} item(s)." |
| Reset | "Changes Reset" | "All price changes have been reset." |
| Export History | "Export Complete" | "Price history exported successfully." |

### Error Notifications

| Condition | Title | Description |
|-----------|-------|-------------|
| No changes | "No Changes" | "There are no changes to apply." |
| No reason | "Reason Required" | "Please provide a reason for the price update." |
| No selection | "No Items Selected" | "Please select items to apply the percentage adjustment." |
| Zero percentage | "Invalid Percentage" | "Please enter a percentage value greater than 0." |

---

## State Management

### Component State Variables

```typescript
// Tab navigation
const [activeTab, setActiveTab] = useState("dashboard");

// Item data
const [items, setItems] = useState<PriceItem[]>(sampleItems);
const [priceHistory, setPriceHistory] = useState<PriceHistoryEntry[]>([]);

// Filters - Price Updating
const [searchTerm, setSearchTerm] = useState("");
const [filterCategory, setFilterCategory] = useState("all");
const [filterBrand, setFilterBrand] = useState("all");
const [priceUpdateMode, setPriceUpdateMode] = useState<"individual" | "group">("individual");

// Filters - History
const [historySearchTerm, setHistorySearchTerm] = useState("");
const [historyFilterType, setHistoryFilterType] = useState<"all" | "individual" | "bulk" | "margin">("all");

// Pagination
const [currentPage, setCurrentPage] = useState(1);
const [historyPage, setHistoryPage] = useState(1);
const itemsPerPage = 10;
const historyPerPage = 10;

// Dialog visibility
const [showNewLandedCost, setShowNewLandedCost] = useState(false);
const [showSetMargins, setShowSetMargins] = useState(false);
const [showBulkPercentage, setShowBulkPercentage] = useState(false);
const [showItemHistory, setShowItemHistory] = useState(false);
const [selectedItemForHistory, setSelectedItemForHistory] = useState<PriceItem | null>(null);

// Form data
const [updateReason, setUpdateReason] = useState("");
const [bulkPercentage, setBulkPercentage] = useState({...});
const [newLandedCost, setNewLandedCost] = useState({...});
const [marginSettings, setMarginSettings] = useState({...});
```

---

## Currency Formatting

```typescript
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-PK', { 
    style: 'currency', 
    currency: 'PKR', 
    minimumFractionDigits: 2 
  }).format(value).replace('PKR', 'Rs');
};
```

---

## Future Database Schema

```sql
-- Price items table
CREATE TABLE price_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_no VARCHAR(50) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  brand VARCHAR(100),
  cost DECIMAL(12,2) DEFAULT 0,
  price_a DECIMAL(12,2) DEFAULT 0,
  price_b DECIMAL(12,2) DEFAULT 0,
  price_m DECIMAL(12,2) DEFAULT 0,
  quantity INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Price levels/tiers
CREATE TABLE price_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  markup_percentage DECIMAL(5,2) DEFAULT 0,
  customer_type VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Landed costs
CREATE TABLE landed_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number VARCHAR(50) REFERENCES purchase_orders(po_number),
  supplier_id UUID REFERENCES suppliers(id),
  date DATE DEFAULT CURRENT_DATE,
  item_count INTEGER DEFAULT 0,
  invoice_value DECIMAL(12,2) DEFAULT 0,
  freight DECIMAL(12,2) DEFAULT 0,
  customs DECIMAL(12,2) DEFAULT 0,
  insurance DECIMAL(12,2) DEFAULT 0,
  handling DECIMAL(12,2) DEFAULT 0,
  total_landed DECIMAL(12,2) GENERATED ALWAYS AS (
    invoice_value + freight + customs + insurance + handling
  ) STORED,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Price history audit trail
CREATE TABLE price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES price_items(id) ON DELETE CASCADE,
  part_no VARCHAR(50),
  description TEXT,
  updated_by UUID REFERENCES users(id),
  reason TEXT NOT NULL,
  update_type VARCHAR(20) CHECK (update_type IN ('individual', 'bulk', 'margin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Price changes detail
CREATE TABLE price_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  history_id UUID REFERENCES price_history(id) ON DELETE CASCADE,
  field_name VARCHAR(50) NOT NULL,
  old_value DECIMAL(12,2),
  new_value DECIMAL(12,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_price_items_part_no ON price_items(part_no);
CREATE INDEX idx_price_items_category ON price_items(category);
CREATE INDEX idx_price_items_brand ON price_items(brand);
CREATE INDEX idx_price_history_item ON price_history(item_id);
CREATE INDEX idx_price_history_date ON price_history(created_at);
CREATE INDEX idx_price_history_type ON price_history(update_type);
CREATE INDEX idx_landed_costs_po ON landed_costs(po_number);

-- View for price analysis
CREATE VIEW v_price_analysis AS
SELECT 
  pi.*,
  CASE 
    WHEN pi.cost > 0 THEN ((pi.price_a - pi.cost) / pi.cost * 100)
    ELSE 0 
  END AS margin_a,
  CASE 
    WHEN pi.cost > 0 THEN ((pi.price_b - pi.cost) / pi.cost * 100)
    ELSE 0 
  END AS margin_b,
  CASE 
    WHEN pi.cost > 0 THEN ((pi.price_m - pi.cost) / pi.cost * 100)
    ELSE 0 
  END AS margin_m,
  pi.price_a * pi.quantity AS stock_value,
  (pi.price_a - pi.cost) * pi.quantity AS potential_profit
FROM price_items pi;

-- View for history with user names
CREATE VIEW v_price_history_detail AS
SELECT 
  ph.*,
  u.name AS updated_by_name,
  ARRAY_AGG(
    JSON_BUILD_OBJECT(
      'field', pc.field_name,
      'old_value', pc.old_value,
      'new_value', pc.new_value
    )
  ) AS changes
FROM price_history ph
LEFT JOIN users u ON ph.updated_by = u.id
LEFT JOIN price_changes pc ON pc.history_id = ph.id
GROUP BY ph.id, u.name;
```

---

## Related Files

| File | Purpose |
|------|---------|
| `src/pages/PricingCosting.tsx` | Page wrapper component |
| `src/components/inventory/PricingCosting.tsx` | Main module component |
| `src/components/inventory/StockPriceManagement.tsx` | Alternative price management |
| `src/components/sales/CustomerPriceStructures.tsx` | Customer-specific pricing |
| `src/hooks/useInventoryData.ts` | Inventory data context |
