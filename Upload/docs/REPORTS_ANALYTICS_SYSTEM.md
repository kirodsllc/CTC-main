# Reports & Analytics System Documentation

## Overview

The Reports & Analytics System provides comprehensive business intelligence, reporting, and data visualization capabilities. It organizes reports into five main categories: Overview, Sales Reports, Inventory Reports, Financial Reports, and Analytics.

---

## Module Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        REPORTS & ANALYTICS SYSTEM                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────────┤
│  │                           CATEGORY NAVIGATION                                │
│  ├────────────┬────────────┬────────────┬────────────┬────────────────────────┤│
│  │  Overview  │   Sales    │ Inventory  │ Financial  │      Analytics         ││
│  │  (Primary) │  Reports   │  Reports   │  Reports   │      (Insights)        ││
│  └────────────┴────────────┴────────────┴────────────┴────────────────────────┘│
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────────┤
│  │                              SUB-TABS                                        │
│  ├──────────────────────────────────────────────────────────────────────────────┤
│  │  Overview:    Real-Time Dashboard | Sales Report                            │
│  │  Sales:       Periodic Sales | Sales by Type | Target vs Achievement        │
│  │  Inventory:   Stock Movement | Brand Wise                                   │
│  │  Financial:   Purchases | Purchase Comparison | Import Cost | Expenses      │
│  │  Analytics:   Customer Analysis | Customer Aging | Supplier Performance     │
│  └──────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Main Container Component

### ReportsAnalytics.tsx

**Location:** `src/components/reports/ReportsAnalytics.tsx`

**Purpose:** Central navigation hub managing all report categories and sub-tabs.

#### Category Configuration
| Category | Label | Color | Description |
|----------|-------|-------|-------------|
| overview | Overview | bg-primary | Dashboard and sales overview |
| sales | Sales Reports | bg-success | Sales analysis reports |
| inventory | Inventory Reports | bg-info | Stock and inventory reports |
| financial | Financial Reports | bg-chart-purple | Purchase and expense reports |
| analytics | Analytics | bg-warning | Customer and supplier insights |

#### Button Functions
| Button | Function | Action |
|--------|----------|--------|
| Category Button | `handleCategoryChange(category)` | Switches category and resets to first sub-tab |
| Hide/Show Categories | `setShowCategories()` | Toggles category visibility |
| Sub-Tab Button | `setActiveSubTab(tab.id)` | Switches to selected report |

---

## Overview Reports

### 1. RealTimeDashboard.tsx

**Location:** `src/components/reports/RealTimeDashboard.tsx`

**Purpose:** Live business metrics with auto-refresh capability.

#### Data Structures
```typescript
interface MetricCard {
  title: string;
  value: string;
  change: string;
  changeType: "up" | "down";
  color: string;
}

interface TopSellingItem {
  rank: number;
  name: string;
  units: number;
  value: number;
}

interface ActivityItem {
  id: string;
  type: "invoice" | "payment" | "order" | "stock";
  title: string;
  subtitle: string;
  amount: number;
  time: string;
}
```

#### Metrics Displayed
| Metric | Description | Color |
|--------|-------------|-------|
| Today's Sales | Daily sales amount | text-primary |
| Today's Orders | Order count | text-foreground |
| Today's Purchases | Purchase amount | text-primary |
| Pending Orders | Unfulfilled orders | text-foreground |
| Low Stock Items | Items below threshold | text-foreground |
| Today's Profit | Daily profit | text-success |

#### Button Functions
| Button | Function | Action |
|--------|----------|--------|
| Live Toggle | `setIsLive()` | Enables/disables auto-refresh (30s) |
| Refresh | `handleRefresh()` | Manual data refresh |
| View All | Link | View all recent activity |

#### Features
- **Auto-Refresh**: Updates every 30 seconds when live mode is enabled
- **Hourly Sales Chart**: Bar chart showing sales by hour
- **Top Selling Items**: Ranked list with sales values
- **Recent Activity Feed**: Real-time transaction updates

---

### 2. SalesReportTab.tsx

**Location:** `src/components/reports/SalesReportTab.tsx`

**Purpose:** View and analyze all sales transactions.

#### Data Structure
```typescript
interface SalesRecord {
  id: string;
  date: string;
  invoiceNo: string;
  customer: string;
  items: number;
  amount: number;
  status: "paid" | "pending" | "partial";
}
```

#### Summary Statistics
| Metric | Calculation | Color |
|--------|-------------|-------|
| Total Sales | Sum of all amounts | bg-primary/5 |
| Total Invoices | Count of records | bg-info/5 |
| Pending Payment | Sum where status ≠ paid | bg-destructive/5 |
| Profit | Total sales × 22% | bg-success/5 |

#### Button Functions
| Button | Function | Action |
|--------|----------|--------|
| Generate Report | `handleGenerateReport()` | Loads sales data |
| Export | `handleExport()` | Exports to Excel |

#### Filters
- **From Date** - Start date for report
- **To Date** - End date for report
- **Customer** - Filter by customer

---

## Sales Reports

### 3. PeriodicSalesTab.tsx

**Location:** `src/components/reports/PeriodicSalesTab.tsx`

**Purpose:** View sales performance by daily, monthly, or yearly periods.

#### Data Structure
```typescript
interface PeriodData {
  period: string;
  grossSales: number;
  orders: number;
  returns: number;
  netSales: number;
  profit: number;
  margin: number;
  avgOrder: number;
}
```

#### Period Types
| Period | Description |
|--------|-------------|
| Daily | Day-by-day breakdown |
| Monthly | Month-by-month analysis |
| Yearly | Year-over-year comparison |

#### Summary Statistics
| Metric | Description | Trend Indicator |
|--------|-------------|-----------------|
| Total Sales | Gross sales amount | +12.5% vs prev |
| Total Orders | Number of orders | +8.2% vs prev |
| Returns | Return amounts | -3.1% vs prev |
| Total Profit | Net profit | +15.3% vs prev |
| Avg Margin | Average margin % | +0.5% vs prev |
| Avg Order | Average order value | +4.2% vs prev |

#### Button Functions
| Button | Function | Action |
|--------|----------|--------|
| Daily/Monthly/Yearly | `setPeriodType()` | Switches period view |
| Generate | Generate report | Loads period data |
| Export | `handleExport()` | Exports report |

---

### 4. SalesByTypeTab.tsx

**Location:** `src/components/reports/SalesByTypeTab.tsx`

**Purpose:** Analyze sales by different transaction types.

#### Data Structure
```typescript
interface SalesTypeData {
  type: string;
  transactions: number;
  totalAmount: number;
  avgTransaction: number;
  profit: number;
  percentage: number;
}
```

#### Sales Types
| Type | Description | Color |
|------|-------------|-------|
| Cash Sales | Cash transactions | bg-primary/5 |
| Credit Sales | Credit transactions | bg-info/5 |
| Online Sales | E-commerce sales | bg-destructive/5 |
| Wholesale | Bulk sales | bg-warning/5 |
| Retail | Individual sales | bg-success/5 |

#### Button Functions
| Button | Function | Action |
|--------|----------|--------|
| Generate Report | `handleGenerateReport()` | Loads sales type data |
| Export | `handleExport()` | Exports report |

---

### 5. TargetAchievementTab.tsx

**Location:** `src/components/reports/TargetAchievementTab.tsx`

**Purpose:** Track performance against set targets.

#### Data Structure
```typescript
interface TargetData {
  category: string;
  target: number;
  achieved: number;
  percentage: number;
  status: "exceeded" | "on-track" | "behind";
}
```

#### Status Indicators
| Status | Color | Description |
|--------|-------|-------------|
| exceeded | text-success | Target exceeded |
| on-track | text-info | On track to meet target |
| behind | text-destructive | Below target |

#### Progress Colors
| Percentage | Color |
|------------|-------|
| ≥ 100% | bg-success |
| ≥ 80% | bg-info |
| ≥ 60% | bg-warning |
| < 60% | bg-destructive |

#### Button Functions
| Button | Function | Action |
|--------|----------|--------|
| Period Select | `setPeriod()` | Weekly/Monthly/Quarterly/Yearly |
| Month Select | `setMonth()` | Select specific month |
| Apply | Apply filters | Updates report |
| Export | `handleExport()` | Exports report |

---

## Inventory Reports

### 6. StockMovementTab.tsx

**Location:** `src/components/reports/StockMovementTab.tsx`

**Purpose:** Identify fast, slow, and dead stock items.

#### Data Structure
```typescript
interface StockItem {
  id: string;
  partNumber: string;
  name: string;
  brand: string;
  category: string;
  stock: number;
  avgMonthly: number;
  lastSale: string;
  stockValue: number;
  turnover: number;
  status: "fast" | "slow" | "dead";
  recommendation: string;
}
```

#### Movement Status
| Status | Badge Color | Icon | Description |
|--------|-------------|------|-------------|
| fast | bg-success/10 | TrendingUp | High turnover items |
| slow | bg-warning/10 | Minus | Low turnover items |
| dead | bg-destructive/10 | TrendingDown | No movement items |

#### Summary Metrics
| Metric | Description | Icon |
|--------|-------------|------|
| Total Stock Value | Sum of all stock values | Info |
| Dead Stock Value | Value of dead stock | AlertTriangle |
| Avg Turnover Ratio | Average turnover per year | RefreshCw |
| Items Needing Action | Slow + dead stock count | Bell |

#### Button Functions
| Button | Function | Action |
|--------|----------|--------|
| All Items | `setFilter("all")` | Show all items |
| Fast Moving | `setFilter("fast")` | Filter fast moving |
| Slow Moving | `setFilter("slow")` | Filter slow moving |
| Dead Stock | `setFilter("dead")` | Filter dead stock |
| Apply Filters | `handleApplyFilters()` | Apply category/brand/period |
| Print | `handlePrint()` | Print report |
| Export | `handleExport()` | Export report |

#### Visualizations
- **Pie Chart**: Stock distribution by movement status
- **Data Table**: Detailed item information with recommendations

---

### 7. BrandWiseTab.tsx

**Location:** `src/components/reports/BrandWiseTab.tsx`

**Purpose:** Analyze sales, purchases, and performance by brand.

#### Data Structure
```typescript
interface BrandData {
  brand: string;
  avgSale: number;
  products: number;
  totalSales: number;
  purchases: number;
  profit: number;
  margin: number;
  trend: "rising" | "falling" | "stable";
}
```

#### Trend Indicators
| Trend | Icon | Color | Description |
|-------|------|-------|-------------|
| rising | TrendingUp | text-success | Increasing performance |
| falling | TrendingDown | text-destructive | Declining performance |
| stable | Minus | text-muted-foreground | No significant change |

#### View Modes
- **Table View**: Detailed tabular data
- **Chart View**: Visual representation

#### Button Functions
| Button | Function | Action |
|--------|----------|--------|
| Table/Chart Toggle | `setViewMode()` | Switch view mode |
| Generate Report | `handleGenerateReport()` | Load brand data |
| Export | `handleExport()` | Export report |

---

## Financial Reports

### 8. PurchasesReportTab.tsx

**Location:** `src/components/reports/PurchasesReportTab.tsx`

**Purpose:** View and analyze all purchase transactions.

#### Data Structure
```typescript
interface PurchaseRecord {
  id: string;
  date: string;
  poNumber: string;
  supplier: string;
  items: number;
  amount: number;
  status: "completed" | "pending" | "partial";
}
```

#### Summary Statistics
| Metric | Calculation | Color |
|--------|-------------|-------|
| Total Purchases | Sum of amounts | bg-primary/5 |
| Total Orders | Count of records | bg-info/5 |
| Pending | Count of pending | bg-warning/5 |
| Completed | Count of completed | bg-success/5 |

#### Button Functions
| Button | Function | Action |
|--------|----------|--------|
| Generate Report | `handleGenerateReport()` | Load purchase data |
| Export | `handleExport()` | Export report |

---

### 9. PurchaseComparisonTab.tsx

**Location:** `src/components/reports/PurchaseComparisonTab.tsx`

**Purpose:** Compare purchase data across different periods.

#### Data Structure
```typescript
interface ComparisonData {
  supplier: string;
  currentPeriod: number;
  previousPeriod: number;
  change: number;
  items: number;
  avgDelivery: number;
}
```

#### Summary Statistics
| Metric | Description |
|--------|-------------|
| Current Period Total | Total for selected period |
| Previous Period Total | Total for comparison period |
| Change | Percentage change |
| Total Items | Number of items purchased |

#### Visualizations
- **Bar Chart**: Side-by-side period comparison by supplier
- **Comparison Table**: Detailed supplier-level data

#### Button Functions
| Button | Function | Action |
|--------|----------|--------|
| Current Period | `setPeriod1()` | Select current period |
| Compare With | `setPeriod2()` | Select comparison period |
| Compare | Compare periods | Generate comparison |
| Export | `handleExport()` | Export report |

---

### 10. ImportCostSummaryTab.tsx

**Location:** `src/components/reports/ImportCostSummaryTab.tsx`

**Purpose:** Analyze landed costs and import expenses.

#### Data Structure
```typescript
interface ImportRecord {
  id: string;
  date: string;
  lcNumber: string;
  supplier: string;
  country: string;
  fobValue: number;
  freight: number;
  insurance: number;
  duties: number;
  totalCost: number;
  items: number;
}
```

#### Summary Statistics
| Metric | Icon | Description |
|--------|------|-------------|
| Total FOB Value | Package | Free on Board value |
| Total Freight | Truck | Shipping costs |
| Total Duties | DollarSign | Customs duties |
| Total Landed Cost | DollarSign | Total cost including all |
| Avg Landing % | Percent | Average landing percentage |

#### Button Functions
| Button | Function | Action |
|--------|----------|--------|
| Generate Report | `handleGenerateReport()` | Load import data |
| Export | `handleExport()` | Export report |

---

### 11. ExpensesReportTab.tsx

**Location:** `src/components/reports/ExpensesReportTab.tsx`

**Purpose:** Track and analyze all business expenses.

*(See EXPENSES_MANAGEMENT_SYSTEM.md for detailed documentation)*

---

## Analytics Reports

### 12. CustomerAnalysisTab.tsx

**Location:** `src/components/reports/CustomerAnalysisTab.tsx`

**Purpose:** Analyze sales and transactions by customer.

#### Data Structure
```typescript
interface CustomerData {
  id: string;
  customer: string;
  contact: string;
  totalOrders: number;
  totalSales: number;
  balanceDue: number;
  lastOrder: string;
}
```

#### Summary Statistics
| Metric | Calculation | Color |
|--------|-------------|-------|
| Total Customers | Count of customers | bg-primary/5 |
| Total Sales | Sum of sales | bg-info/5 |
| Receivables | Sum of balance due | bg-destructive/5 |
| Top Customer | Highest sales customer | bg-success/5 |

#### Button Functions
| Button | Function | Action |
|--------|----------|--------|
| Generate Report | `handleGenerateReport()` | Load customer data |
| Export | `handleExport()` | Export report |

---

### 13. CustomerAgingTab.tsx

**Location:** `src/components/reports/CustomerAgingTab.tsx`

**Purpose:** Analyze receivables by aging period.

#### Data Structure
```typescript
interface AgingData {
  id: string;
  customer: string;
  type: "customer" | "distributor";
  current: number;
  days30: number;
  days60: number;
  days90: number;
  over90: number;
  total: number;
}
```

#### Aging Buckets
| Bucket | Color | Description |
|--------|-------|-------------|
| Current (0-30) | bg-success/5 | Current receivables |
| 30-60 Days | bg-info/5 | 30-60 days overdue |
| 60-90 Days | bg-warning/5 | 60-90 days overdue |
| 90+ Days | bg-destructive/5 | Over 90 days overdue |

#### Status Badges
| Status | Condition | Color |
|--------|-----------|-------|
| Critical | over90 > 0 | bg-destructive/10 |
| High Risk | days90 > 0 | bg-warning/10 |
| Monitor | days60 > 0 | bg-info/10 |
| Mild | days30 > 0 | bg-muted |
| Current | All current | bg-success/10 |

#### Button Functions
| Button | Function | Action |
|--------|----------|--------|
| Customer Type | `setCustomerType()` | Filter by type |
| Sort By | `setSortBy()` | Sort by total/90+ days/name |
| Send Reminder | `handleSendReminder()` | Send payment reminder |
| Export | `handleExport()` | Export report |

---

### 14. SupplierPerformanceTab.tsx

**Location:** `src/components/reports/SupplierPerformanceTab.tsx`

**Purpose:** Evaluate supplier quality, delivery, and reliability.

#### Data Structure
```typescript
interface SupplierData {
  id: string;
  supplier: string;
  totalOrders: number;
  totalValue: number;
  onTimeDelivery: number;
  qualityRating: number;
  avgDeliveryDays: number;
  defectRate: number;
  trend: "up" | "down" | "stable";
}
```

#### Performance Metrics
| Metric | Icon | Description |
|--------|------|-------------|
| Total Suppliers | Package | Number of suppliers |
| Avg On-Time | CheckCircle | Average on-time delivery % |
| Avg Quality | Star | Average quality rating (1-5) |
| Total Purchases | Clock | Total purchase value |

#### Delivery Performance Badges
| Percentage | Color | Status |
|------------|-------|--------|
| ≥ 95% | bg-success/10 | Excellent |
| ≥ 85% | bg-info/10 | Good |
| ≥ 75% | bg-warning/10 | Fair |
| < 75% | bg-destructive/10 | Poor |

#### Button Functions
| Button | Function | Action |
|--------|----------|--------|
| Generate Report | `handleGenerateReport()` | Load supplier data |
| Export | `handleExport()` | Export report |

---

## Workflow Diagrams

### Report Generation Workflow

<presentation-mermaid>
flowchart TD
    A[Start] --> B[Select Category]
    B --> C[Select Sub-Tab Report]
    C --> D[Set Filters]
    D --> E[Click Generate Report]
    E --> F{Validate Filters}
    F -->|Invalid| G[Show Error]
    G --> D
    F -->|Valid| H[Fetch Data]
    H --> I[Calculate Summary Statistics]
    I --> J[Render Charts/Visualizations]
    J --> K[Populate Data Table]
    K --> L{Export Needed?}
    L -->|Yes| M[Click Export]
    M --> N[Download File]
    N --> O[End]
    L -->|No| O
</presentation-mermaid>

### Real-Time Dashboard Data Flow

<presentation-mermaid>
flowchart LR
    subgraph DataSources
        A[Sales Transactions]
        B[Purchase Orders]
        C[Inventory Updates]
        D[Payment Records]
    end
    
    subgraph Processing
        E[Aggregate Metrics]
        F[Calculate Changes]
        G[Identify Top Items]
        H[Build Activity Feed]
    end
    
    subgraph Display
        I[Metric Cards]
        J[Hourly Chart]
        K[Top Selling List]
        L[Activity Feed]
    end
    
    A --> E
    B --> E
    C --> E
    D --> E
    E --> F
    F --> I
    A --> G
    G --> K
    A --> J
    A --> H
    D --> H
    H --> L
</presentation-mermaid>

### Aging Analysis Workflow

<presentation-mermaid>
flowchart TD
    A[Start] --> B[Select Customer Type]
    B --> C[Select Sort Order]
    C --> D[Load Aging Data]
    D --> E[Calculate Aging Buckets]
    E --> F[Assign Risk Status]
    F --> G[Display Summary Cards]
    G --> H[Render Aging Table]
    H --> I{Send Reminder?}
    I -->|Yes| J[Select Customer]
    J --> K[Send Payment Reminder]
    K --> L[Show Success Toast]
    L --> H
    I -->|No| M{Export?}
    M -->|Yes| N[Export Report]
    N --> O[End]
    M -->|No| O
</presentation-mermaid>

---

## Inter-Module Relationships

### Reports Module Connections

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         REPORTS & ANALYTICS                                   │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│   REPORTS MODULE                          DATA SOURCE MODULES                 │
│   ┌─────────────────┐                                                        │
│   │  Real-Time      │◀────────────────┐                                      │
│   │  Dashboard      │                 │                                      │
│   └────────┬────────┘                 │                                      │
│            │                          │                                      │
│            ▼                          │                                      │
│   ┌─────────────────┐         ┌───────┴────────────────────────────────┐    │
│   │  Sales Reports  │◀───────▶│  Sales & Invoicing Module               │    │
│   │  - Sales Report │         │  - Invoices → Sales data               │    │
│   │  - Periodic     │         │  - Returns → Returns data              │    │
│   │  - By Type      │         │  - Quotations → Conversion rates       │    │
│   │  - Target       │         └────────────────────────────────────────┘    │
│   └────────┬────────┘                                                        │
│            │                                                                  │
│            ▼                                                                  │
│   ┌─────────────────┐         ┌────────────────────────────────────────┐    │
│   │  Inventory      │◀───────▶│  Inventory Management Module            │    │
│   │  Reports        │         │  - Stock → Movement data               │    │
│   │  - Stock Move   │         │  - Items → Brand/category data         │    │
│   │  - Brand Wise   │         │  - Turnover calculations               │    │
│   └────────┬────────┘         └────────────────────────────────────────┘    │
│            │                                                                  │
│            ▼                                                                  │
│   ┌─────────────────┐         ┌────────────────────────────────────────┐    │
│   │  Financial      │◀───────▶│  Purchase & Expense Modules             │    │
│   │  Reports        │         │  - PO → Purchase data                  │    │
│   │  - Purchases    │         │  - DPO → Import costs                  │    │
│   │  - Comparison   │         │  - Expenses → Expense data             │    │
│   │  - Import Cost  │         └────────────────────────────────────────┘    │
│   │  - Expenses     │                                                        │
│   └────────┬────────┘                                                        │
│            │                                                                  │
│            ▼                                                                  │
│   ┌─────────────────┐         ┌────────────────────────────────────────┐    │
│   │  Analytics      │◀───────▶│  Customer & Supplier Management         │    │
│   │  Reports        │         │  - Customers → Transaction history     │    │
│   │  - Customer     │         │  - Distributors → Aging data           │    │
│   │  - Aging        │         │  - Suppliers → Performance metrics     │    │
│   │  - Supplier     │         └────────────────────────────────────────┘    │
│   └─────────────────┘                                                        │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow Between Modules

<presentation-mermaid>
flowchart TB
    subgraph SourceModules
        SM1[Sales & Invoicing]
        SM2[Inventory Management]
        SM3[Purchase Orders]
        SM4[Expenses Management]
        SM5[Customer Management]
        SM6[Supplier Management]
    end
    
    subgraph ReportsAnalytics
        RA1[Overview Reports]
        RA2[Sales Reports]
        RA3[Inventory Reports]
        RA4[Financial Reports]
        RA5[Analytics Reports]
    end
    
    subgraph Outputs
        O1[Summary Statistics]
        O2[Charts & Graphs]
        O3[Data Tables]
        O4[Export Files]
    end
    
    SM1 --> RA1
    SM1 --> RA2
    SM2 --> RA1
    SM2 --> RA3
    SM3 --> RA4
    SM4 --> RA4
    SM5 --> RA5
    SM6 --> RA5
    
    RA1 --> O1
    RA2 --> O1
    RA3 --> O1
    RA4 --> O1
    RA5 --> O1
    
    RA1 --> O2
    RA2 --> O2
    RA3 --> O2
    RA4 --> O2
    RA5 --> O2
    
    RA1 --> O3
    RA2 --> O3
    RA3 --> O3
    RA4 --> O3
    RA5 --> O3
    
    O3 --> O4
</presentation-mermaid>

---

## Report Comparison Matrix

| Report | Date Filter | Category Filter | Entity Filter | Chart | Export |
|--------|-------------|-----------------|---------------|-------|--------|
| Real-Time Dashboard | No | No | No | Bar | No |
| Sales Report | Yes | No | Customer | No | Yes |
| Periodic Sales | No | No | No | Bar | Yes |
| Sales by Type | Yes | Type | No | No | Yes |
| Target Achievement | No | Period | Month | Progress | Yes |
| Stock Movement | No | Category | Brand | Pie | Yes |
| Brand Wise | Yes | No | Brand | No | Yes |
| Purchases Report | Yes | No | Supplier | No | Yes |
| Purchase Comparison | No | No | Period | Bar | Yes |
| Import Cost | Yes | No | Country | No | Yes |
| Expenses Report | Yes | Category | No | No | Yes |
| Customer Analysis | Yes | No | Customer | No | Yes |
| Customer Aging | No | Type | Sort | No | Yes |
| Supplier Performance | Yes | No | Supplier | Progress | Yes |

---

## Common UI Patterns

### Summary Cards
All reports use consistent summary card patterns:
- Colored backgrounds based on semantic meaning
- Icon + label + value structure
- Trend indicators where applicable

### Status Badges
Consistent badge colors across reports:
| Status Type | Success | Warning | Destructive | Info |
|-------------|---------|---------|-------------|------|
| Payment | Paid | Partial | Pending | - |
| Order | Completed | Pending | - | Partial |
| Trend | Rising | Stable | Falling | - |
| Risk | Current | Monitor | High Risk | Critical |

### Filter Components
Standard filter structure:
1. Date range (From/To)
2. Entity filter (Customer/Supplier/Brand)
3. Category/Type filter
4. Generate/Apply button

---

## Future Database Schema

### Views for Reporting

```sql
-- Sales Summary View
CREATE VIEW v_sales_summary AS
SELECT 
  DATE_TRUNC('day', created_at) as date,
  COUNT(*) as total_invoices,
  SUM(total_amount) as total_sales,
  SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END) as paid_amount,
  SUM(CASE WHEN status = 'pending' THEN total_amount ELSE 0 END) as pending_amount,
  COUNT(DISTINCT customer_id) as unique_customers
FROM invoices
GROUP BY DATE_TRUNC('day', created_at);

-- Stock Movement View
CREATE VIEW v_stock_movement AS
SELECT 
  p.id,
  p.part_number,
  p.name,
  p.brand,
  p.category,
  p.stock_quantity,
  COALESCE(sm.avg_monthly_sales, 0) as avg_monthly,
  sm.last_sale_date,
  p.stock_quantity * p.cost_price as stock_value,
  CASE 
    WHEN sm.avg_monthly_sales > 10 THEN 'fast'
    WHEN sm.avg_monthly_sales > 2 THEN 'slow'
    ELSE 'dead'
  END as movement_status
FROM parts p
LEFT JOIN (
  SELECT 
    part_id,
    AVG(quantity) as avg_monthly_sales,
    MAX(sale_date) as last_sale_date
  FROM sales_items
  WHERE sale_date >= NOW() - INTERVAL '90 days'
  GROUP BY part_id
) sm ON p.id = sm.part_id;

-- Customer Aging View
CREATE VIEW v_customer_aging AS
SELECT 
  c.id,
  c.name as customer,
  c.type,
  SUM(CASE WHEN CURRENT_DATE - i.due_date <= 30 THEN i.balance_due ELSE 0 END) as current,
  SUM(CASE WHEN CURRENT_DATE - i.due_date BETWEEN 31 AND 60 THEN i.balance_due ELSE 0 END) as days_30,
  SUM(CASE WHEN CURRENT_DATE - i.due_date BETWEEN 61 AND 90 THEN i.balance_due ELSE 0 END) as days_60,
  SUM(CASE WHEN CURRENT_DATE - i.due_date > 90 THEN i.balance_due ELSE 0 END) as over_90,
  SUM(i.balance_due) as total
FROM customers c
LEFT JOIN invoices i ON c.id = i.customer_id AND i.status != 'paid'
GROUP BY c.id, c.name, c.type;

-- Supplier Performance View
CREATE VIEW v_supplier_performance AS
SELECT 
  s.id,
  s.name as supplier,
  COUNT(po.id) as total_orders,
  SUM(po.total_amount) as total_value,
  AVG(CASE WHEN po.delivery_date <= po.expected_date THEN 100 ELSE 0 END) as on_time_delivery,
  AVG(po.quality_rating) as quality_rating,
  AVG(po.delivery_date - po.order_date) as avg_delivery_days,
  AVG(po.defect_count::float / NULLIF(po.item_count, 0) * 100) as defect_rate
FROM suppliers s
LEFT JOIN purchase_orders po ON s.id = po.supplier_id
WHERE po.created_at >= NOW() - INTERVAL '90 days'
GROUP BY s.id, s.name;
```

---

## Related Documentation

- [Sales & Invoicing System](./SALES_INVOICING_SYSTEM.md) - Source data for sales reports
- [Inventory Management System](./INVENTORY_MANAGEMENT_SYSTEM.md) - Source data for inventory reports
- [Expenses Management System](./EXPENSES_MANAGEMENT_SYSTEM.md) - Source data for expense reports
- [Voucher Management System](./VOUCHER_MANAGEMENT_SYSTEM.md) - Financial transaction data

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-29 | Initial documentation |
