# Dashboard System Documentation

## Overview

The Dashboard module serves as the central hub of the InventoryERP application, providing real-time statistics, interactive charts, quick actions, and activity monitoring. It offers an at-a-glance view of inventory health, order status, and system activity.

---

## Module Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              DASHBOARD SYSTEM                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │                              HEADER                                        │ │
│  │  ┌──────────────┐  ┌───────────────┐  ┌────────────────┐  ┌─────────────┐  │ │
│  │  │    Logo &    │  │  User Avatars │  │ Global Search  │  │Notifications│  │ │
│  │  │   Branding   │  │     Group     │  │   (Ctrl+K)     │  │    Bell     │  │ │
│  │  └──────────────┘  └───────────────┘  └────────────────┘  └─────────────┘  │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
│  ┌─────────────┐  ┌─────────────────────────────────────────────────────────┐   │
│  │             │  │                    MAIN CONTENT                         │   │
│  │   SIDEBAR   │  │                                                         │   │
│  │             │  │  ┌─────────────────────────────────────────────────┐    │   │
│  │  • Home     │  │  │              STAT CARDS ROW                     │    │   │
│  │  • Parts    │  │  │  [Parts] [Categories] [Kits] [Suppliers]        │    │   │
│  │  • Inventory│  │  └─────────────────────────────────────────────────┘    │   │
│  │  • Pricing  │  │                                                         │   │
│  │  • Sales    │  │  ┌────────────────────────┐  ┌─────────────────────┐    │   │
│  │  • Expenses │  │  │   Inventory Chart      │  │  Order Status       │    │   │
│  │  • Account  │  │  │   (Area Chart)         │  │  (Donut Chart)      │    │   │
│  │  • Finance  │  │  └────────────────────────┘  └─────────────────────┘    │   │
│  │  • Manage   │  │                                                         │   │
│  │  • Vouchers │  │  ┌────────────────────────┐  ┌─────────────────────┐    │   │
│  │  • Reports  │  │  │   Quick Actions        │  │  Recent Activity    │    │   │
│  │  • Settings │  │  │   (Action Buttons)     │  │  (Activity Feed)    │    │   │
│  │             │  │  └────────────────────────┘  └─────────────────────┘    │   │
│  │             │  │                                                         │   │
│  │             │  │  ┌─────────────────────────────────────────────────┐    │   │
│  │             │  │  │           Inventory Distribution                │    │   │
│  │             │  │  │           (Progress Bars)                       │    │   │
│  │             │  │  └─────────────────────────────────────────────────┘    │   │
│  └─────────────┘  └─────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. Index.tsx (Main Dashboard Page)

**Location:** `src/pages/Index.tsx`

**Purpose:** Main dashboard page that assembles all dashboard components.

#### Layout Structure
```tsx
<div className="min-h-screen flex bg-background">
  <Sidebar />
  <div className="flex-1 flex flex-col ml-16">
    <Header />
    <main className="flex-1 p-6 overflow-auto">
      {/* Welcome Section */}
      {/* Stat Cards Grid */}
      {/* Charts Row */}
      {/* Quick Actions & Activity Row */}
      {/* Inventory Distribution */}
    </main>
  </div>
</div>
```

#### Grid Layouts

| Section | Grid Configuration | Description |
|---------|-------------------|-------------|
| Stat Cards | `grid-cols-1 md:grid-cols-2 lg:grid-cols-4` | 4 responsive stat cards |
| Charts Row | `grid-cols-1 lg:grid-cols-3` | Inventory (2 cols) + Orders (1 col) |
| Actions Row | `grid-cols-1 lg:grid-cols-3` | Quick Actions (2 cols) + Activity (1 col) |
| Distribution | Full width | Single distribution component |

---

### 2. Header.tsx

**Location:** `src/components/dashboard/Header.tsx`

**Purpose:** Top navigation bar with branding, search, and user controls.

#### Component Structure

```tsx
interface HeaderElements {
  logo: {
    icon: Package;
    brandName: "InventoryERP";
  };
  userAvatars: {
    displayed: 3;
    overflow: "+10";
  };
  search: {
    icon: Search;
    trigger: "click" | "Ctrl+K";
  };
  notifications: NotificationBell;
  userProfile: {
    avatar: string;
    email: string;
  };
}
```

#### Features

| Feature | Description | Action |
|---------|-------------|--------|
| Logo | Brand icon and name | Navigate to home |
| User Avatars | Team member indicators | Visual display |
| Search Button | Opens global search | Opens GlobalSearch dialog |
| Notification Bell | Shows notifications | Opens notification panel |
| User Profile | Current user avatar | Display only |

---

### 3. Sidebar.tsx

**Location:** `src/components/dashboard/Sidebar.tsx`

**Purpose:** Fixed navigation sidebar with icon-based menu items.

#### Menu Items

| Icon | Path | Label | Module |
|------|------|-------|--------|
| `Home` | `/` | Dashboard | Main |
| `Package` | `/parts` | Parts | Parts Management |
| `Boxes` | `/inventory` | Inventory Management | Inventory |
| `Calculator` | `/pricing-costing` | Pricing & Costing | Pricing |
| `DollarSign` | `/sales` | Sales & Distribution | Sales |
| `Receipt` | `/expenses` | Expenses | Expenses |
| `BookOpen` | `/accounting` | Accounting | Accounting |
| `ClipboardList` | `/financial-statements` | Financial Statements | Finance |
| `Settings2` | `/manage` | Manage | CRM |
| `Tag` | `/vouchers` | Vouchers | Vouchers |
| `BarChart3` | `/reports` | Reports | Reports |
| `Settings` | `/settings` | Settings | Admin |

#### Styling

```tsx
// Active state
"bg-primary text-primary-foreground shadow-md shadow-primary/25"

// Inactive state
"text-muted-foreground hover:text-foreground hover:bg-muted/50"
```

#### Sidebar Item Component

```tsx
interface SidebarItemProps {
  Icon: LucideIcon;
  label: string;
  active?: boolean;
  onClick?: () => void;
}
```

---

### 4. StatCard.tsx

**Location:** `src/components/dashboard/StatCard.tsx`

**Purpose:** Reusable statistics display card with progress indicator.

#### Props Interface

```typescript
interface StatCardProps {
  icon: React.ReactNode;         // Lucide icon component
  value: number;                  // Main statistic value
  label: string;                  // Description text
  change: string;                 // Percentage change badge
  progressColor: "orange" | "blue" | "green" | "yellow";
  iconBgColor: string;            // Background color for icon
}
```

#### Color Mappings

| Color | Progress Bar | Background |
|-------|--------------|------------|
| orange | `bg-chart-orange` | `bg-chart-orange/20` |
| blue | `bg-chart-blue` | `bg-chart-blue/20` |
| green | `bg-chart-green` | `bg-chart-green/20` |
| yellow | `bg-chart-yellow` | `bg-chart-yellow/20` |

#### Dashboard Stat Cards

| Card | Icon | Color | Data Source |
|------|------|-------|-------------|
| Total Parts | `Package` | Orange | `partsCount` |
| Categories | `Tag` | Blue | `categoriesCount` |
| Active Kits | `ShoppingBag` | Yellow | `kitsCount` |
| Suppliers | `Building2` | Green | `suppliersCount` |

#### Progress Bar Calculation

```typescript
// Progress width based on value (max 100%)
style={{ width: `${Math.min(value * 2.5, 100)}%` }}
```

---

### 5. InventoryChart.tsx

**Location:** `src/components/dashboard/InventoryChart.tsx`

**Purpose:** Area chart showing inventory movement over time.

#### Chart Configuration

```typescript
// Time range options
type TimeRange = "Week" | "Month" | "Year";

// Default data structure
const data = [
  { month: "Jan", value: 0 },
  { month: "Feb", value: 0 },
  // ... 12 months
];
```

#### Recharts Components Used

| Component | Purpose |
|-----------|---------|
| `AreaChart` | Main chart container |
| `Area` | Filled area visualization |
| `XAxis` | Month labels |
| `YAxis` | Value scale |
| `CartesianGrid` | Background grid |
| `Tooltip` | Hover information |
| `ResponsiveContainer` | Responsive sizing |

#### Chart Styling

```typescript
// Gradient fill
<linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
  <stop offset="5%" stopColor="hsl(24, 95%, 53%)" stopOpacity={0.2} />
  <stop offset="95%" stopColor="hsl(24, 95%, 53%)" stopOpacity={0} />
</linearGradient>

// Area configuration
<Area
  type="monotone"
  dataKey="value"
  stroke="hsl(24, 95%, 53%)"
  strokeWidth={2}
  fill="url(#colorValue)"
/>
```

#### Time Range Toggle

```tsx
<div className="flex bg-muted rounded-lg p-1">
  {["Week", "Month", "Year"].map((range) => (
    <button
      onClick={() => setSelectedRange(range)}
      className={cn(
        "px-4 py-1.5 text-sm font-medium rounded-md",
        selectedRange === range
          ? "bg-card text-primary shadow-sm border border-primary"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {range}
    </button>
  ))}
</div>
```

---

### 6. OrderStatusChart.tsx

**Location:** `src/components/dashboard/OrderStatusChart.tsx`

**Purpose:** Donut chart displaying purchase order status distribution.

#### Data Structure

```typescript
const data = [
  { name: "Draft", value: 0, color: "hsl(215, 16%, 75%)" },
  { name: "Pending", value: 0, color: "hsl(45, 93%, 47%)" },
  { name: "Approved", value: 0, color: "hsl(24, 95%, 53%)" },
  { name: "Received", value: 0, color: "hsl(142, 71%, 45%)" },
];
```

#### Status Colors

| Status | HSL Color | Description |
|--------|-----------|-------------|
| Draft | `hsl(215, 16%, 75%)` | Gray |
| Pending | `hsl(45, 93%, 47%)` | Yellow |
| Approved | `hsl(24, 95%, 53%)` | Orange |
| Received | `hsl(142, 71%, 45%)` | Green |

#### Chart Configuration

```typescript
<PieChart>
  <Pie
    data={data}
    cx="50%"
    cy="50%"
    innerRadius={55}
    outerRadius={80}
    paddingAngle={2}
    dataKey="value"
    strokeWidth={0}
  >
    {data.map((entry, index) => (
      <Cell key={`cell-${index}`} fill={entry.color} />
    ))}
  </Pie>
</PieChart>
```

#### Center Total Display

```tsx
<div className="absolute inset-0 flex flex-col items-center justify-center">
  <span className="text-3xl font-bold text-foreground">{total}</span>
  <span className="text-muted-foreground text-sm">Total</span>
</div>
```

---

### 7. QuickActions.tsx

**Location:** `src/components/dashboard/QuickActions.tsx`

**Purpose:** Grid of action buttons for common tasks with notification integration.

#### Quick Action Item Props

```typescript
interface QuickActionItemProps {
  icon: React.ReactNode;
  iconBgColor: string;
  title: string;
  description: string;
  badge?: string;
  onClick?: () => void;
}
```

#### Available Actions

| Action | Icon | Path | Badge | Notification |
|--------|------|------|-------|--------------|
| Add New Part | `Plus` | `/parts` | - | `notifyPartCreated` |
| Create Purchase Order | `FileText` | `/inventory` | New | `notifyPurchaseOrderCreated` |
| Manage Kits | `Package` | `/parts` | - | - |
| Sales & Invoices | `DollarSign` | `/sales` | - | `notifyInvoiceCreated` |
| View Suppliers | `Building2` | `/manage` | - | - |
| View Reports | `BarChart3` | `/reports` | - | - |
| Test Notifications | `Bell` | - | Demo | Random notification |

#### Notification Integration

```typescript
const { 
  notifyPartCreated, 
  notifyInvoiceCreated, 
  notifyPurchaseOrderCreated,
  notifyStockLow,
  notifyPaymentReceived,
} = useAppNotifications();
```

#### Demo Notification Function

```typescript
const demoNotifications = [
  () => notifyStockLow('Widget Pro X', 5),
  () => notifyPaymentReceived(2500.00, 'ABC Corp'),
  () => notifyInvoiceCreated('INV-' + Math.floor(Math.random() * 10000), 750.00),
  () => notifyPartCreated('Sample Part #' + Math.floor(Math.random() * 100)),
  () => notifyPurchaseOrderCreated('PO-' + Math.floor(Math.random() * 10000), 'Global Supplies'),
];
```

---

### 8. RecentActivity.tsx

**Location:** `src/components/dashboard/RecentActivity.tsx`

**Purpose:** Activity feed showing recent system notifications and events.

#### Icon Mapping Logic

```typescript
const getActivityIcon = (notification: Notification) => {
  const title = notification.title.toLowerCase();

  if (title.includes('purchase order')) 
    return { icon: <FileText />, bg: "bg-chart-orange/10" };
  if (title.includes('part') || title.includes('stock')) 
    return { icon: <Package />, bg: "bg-chart-purple/10" };
  if (title.includes('complete') || title.includes('received')) 
    return { icon: <Check />, bg: "bg-success/10" };
  if (type === 'warning' || title.includes('low stock')) 
    return { icon: <AlertTriangle />, bg: "bg-warning/10" };
  if (title.includes('payment') || title.includes('invoice')) 
    return { icon: <DollarSign />, bg: "bg-info/10" };
  
  return { icon: <Bell />, bg: "bg-primary/10" };
};
```

#### Activity Display

| Field | Description |
|-------|-------------|
| Icon | Color-coded activity type icon |
| Title | Activity name |
| Message | Activity description |
| Time | Relative time (e.g., "5 min ago") |
| Unread Indicator | Blue dot for unread items |

#### Time Formatting

```typescript
import { formatDistanceToNow } from "date-fns";

const timeAgo = formatDistanceToNow(activity.timestamp, { addSuffix: false });
// Result: "5 min", "2 hours", "3 days"
```

#### Click Handler

```typescript
const handleActivityClick = (activity: any) => {
  if (activity.id && !activity.id.startsWith('default-')) {
    markAsRead(activity.id);
  }
  if (activity.action?.path) {
    navigate(activity.action.path);
  }
};
```

---

### 9. InventoryDistribution.tsx

**Location:** `src/components/dashboard/InventoryDistribution.tsx`

**Purpose:** Horizontal progress bars showing inventory distribution by type.

#### Data Structure

```typescript
interface DistributionItem {
  label: string;
  value: number;
  color: string;
  path: string;
}

const items: DistributionItem[] = [
  { label: "Parts", value: partsCount, color: "bg-chart-orange", path: "/parts" },
  { label: "Categories", value: categoriesCount, color: "bg-chart-blue", path: "/inventory" },
  { label: "Kits", value: kitsCount, color: "bg-info", path: "/parts" },
  { label: "Suppliers", value: suppliersCount, color: "bg-chart-green", path: "/manage" },
];
```

#### Progress Bar Calculation

```typescript
// Calculate max value for relative sizing
const maxValue = Math.max(partsCount, categoriesCount, kitsCount, suppliersCount, 1);

// Progress width (minimum 2% for visibility)
style={{ width: `${Math.max((item.value / maxValue) * 100, 2)}%` }}
```

#### Data Source Hook

```typescript
const { partsCount, categoriesCount, kitsCount, suppliersCount } = useInventoryStats();
```

---

### 10. GlobalSearch.tsx

**Location:** `src/components/dashboard/GlobalSearch.tsx`

**Purpose:** Application-wide search dialog with fuzzy matching.

#### Search Result Interface

```typescript
interface SearchResult {
  id: string;
  title: string;
  description: string;
  category: string;
  path: string;
  icon: React.ElementType;
  keywords: string[];
}
```

#### Search Categories

| Category | Example Pages |
|----------|---------------|
| Navigation | Dashboard, Home |
| Inventory | Stock Balance, Transfer, Verification |
| Parts | Parts Management, Kits Assembly |
| Sales | Invoice, Quotation, Returns |
| Manage | Customers, Suppliers |
| Accounting | Chart of Accounts, Journal Entries |
| Financial | Balance Sheet, Trial Balance |
| Reports | Sales Reports, Analytics |
| Expenses | Expense Management |
| Settings | User Management, Company Profile |

#### Fuzzy Search Algorithm

```typescript
const fuzzySearch = (query: string, items: SearchResult[]): SearchResult[] => {
  const searchTerms = query.toLowerCase().split(" ").filter(t => t.length > 0);
  
  const scored = items.map(item => {
    let score = 0;
    for (const term of searchTerms) {
      // Exact title match (highest priority)
      if (titleLower === term) score += 100;
      // Title starts with term
      else if (titleLower.startsWith(term)) score += 50;
      // Title contains term
      else if (titleLower.includes(term)) score += 30;
      // Description contains term
      if (descLower.includes(term)) score += 15;
      // Category contains term
      if (categoryLower.includes(term)) score += 10;
      // Keywords match
      for (const keyword of item.keywords) {
        if (keyword.includes(term)) score += 20;
      }
    }
    return { item, score };
  });
  
  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(s => s.item);
};
```

#### Keyboard Navigation

| Key | Action |
|-----|--------|
| `Ctrl+K` / `Cmd+K` | Open search dialog |
| `↑` / `↓` | Navigate results |
| `Enter` | Select current result |
| `Escape` | Close dialog |

#### Quick Actions (No Search Query)

| Action | Path | Icon Color |
|--------|------|------------|
| New Invoice | `/sales` | Emerald |
| Add Stock | `/inventory` | Blue |
| View Reports | `/reports` | Purple |
| Settings | `/settings` | Orange |

---

## Data Flows

### Dashboard Data Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Local Storage │────▶│ useInventoryStats│────▶│   Stat Cards    │
│   (parts, kits, │     │   Hook          │     │   Component     │
│   suppliers)    │     └─────────────────┘     └─────────────────┘
└─────────────────┘                                      │
                                                         ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ NotificationCtx │────▶│ Recent Activity │────▶│   Activity      │
│   Provider      │     │   Component     │     │   Feed UI       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Navigation Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Sidebar       │     │  Quick Actions  │     │  Global Search  │
│   Click         │     │  Click          │     │  Select         │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │   React Router          │
                    │   navigate(path)        │
                    └─────────────────────────┘
```

### Notification Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Quick Action  │────▶│ useAppNotify    │────▶│ NotificationCtx │
│   Clicked       │     │ Hook            │     │ addNotification │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
         ┌───────────────────────────────────────────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Notification    │────▶│ Recent Activity │────▶│ Activity Feed   │
│ Bell Updates    │     │ Component       │     │ Displays Item   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## Responsive Design

### Breakpoints Used

| Breakpoint | Min Width | Usage |
|------------|-----------|-------|
| Default | 0px | Mobile layout |
| `md` | 768px | Tablet layout |
| `lg` | 1024px | Desktop layout |

### Grid Responsiveness

| Component | Mobile | Tablet | Desktop |
|-----------|--------|--------|---------|
| Stat Cards | 1 col | 2 cols | 4 cols |
| Charts Row | 1 col | 1 col | 3 cols (2+1) |
| Quick Actions | 1 col | 2 cols | 2 cols |
| Distribution | Full | Full | Full |

---

## State Management

### Local State (useState)

| Component | State Variable | Type | Purpose |
|-----------|---------------|------|---------|
| InventoryChart | `selectedRange` | TimeRange | Chart time filter |
| Header | `searchOpen` | boolean | Search dialog visibility |
| GlobalSearch | `query` | string | Search input value |
| GlobalSearch | `results` | SearchResult[] | Filtered results |
| GlobalSearch | `selectedIndex` | number | Keyboard navigation |

### Context State

| Context | Provider | Data |
|---------|----------|------|
| NotificationContext | NotificationProvider | notifications, read status |

### Custom Hooks

| Hook | Source | Purpose |
|------|--------|---------|
| `useInventoryStats` | useInventoryData.ts | Parts, kits, suppliers counts |
| `useAppNotifications` | useAppNotifications.ts | Notification triggers |
| `useNotifications` | NotificationContext | Notification management |

---

## Theming

### Design Token Usage

| Element | Token | Example |
|---------|-------|---------|
| Card Background | `bg-card` | All dashboard cards |
| Card Border | `border-border` | Card borders |
| Primary Color | `text-primary` | Active states, links |
| Muted Text | `text-muted-foreground` | Descriptions |
| Chart Colors | `bg-chart-*` | Progress bars, icons |

### Chart Color Palette

| Token | HSL Value | Usage |
|-------|-----------|-------|
| `chart-orange` | `hsl(24, 95%, 53%)` | Parts, main chart |
| `chart-blue` | `hsl(215, 70%, 50%)` | Categories |
| `chart-green` | `hsl(142, 71%, 45%)` | Suppliers, success |
| `chart-yellow` | `hsl(45, 93%, 47%)` | Kits, pending |
| `chart-purple` | `hsl(280, 70%, 50%)` | Actions |

---

## Performance Considerations

### Optimization Techniques

1. **Responsive Container**
   - Charts use `ResponsiveContainer` for automatic resizing
   - No manual resize event handlers needed

2. **Efficient Filtering**
   - Search results limited to 8 items
   - Debounced search not needed due to local data

3. **Lazy Loading**
   - Components render only when in view
   - No heavy computations on initial load

4. **Memoization Opportunities**
   - Search data is static (could use useMemo)
   - Distribution items recalculate on count changes

---

## Related Files

| File | Purpose |
|------|---------|
| `src/pages/Index.tsx` | Main dashboard page |
| `src/components/dashboard/Header.tsx` | Top navigation bar |
| `src/components/dashboard/Sidebar.tsx` | Side navigation |
| `src/components/dashboard/StatCard.tsx` | Statistics cards |
| `src/components/dashboard/InventoryChart.tsx` | Area chart |
| `src/components/dashboard/OrderStatusChart.tsx` | Donut chart |
| `src/components/dashboard/QuickActions.tsx` | Action buttons |
| `src/components/dashboard/RecentActivity.tsx` | Activity feed |
| `src/components/dashboard/InventoryDistribution.tsx` | Distribution bars |
| `src/components/dashboard/GlobalSearch.tsx` | Search dialog |
| `src/hooks/useInventoryData.ts` | Inventory data hook |
| `src/hooks/useAppNotifications.ts` | Notification hook |
| `src/contexts/NotificationContext.tsx` | Notification provider |

---

## Related Documentation

- [Inventory Management System](./INVENTORY_MANAGEMENT_SYSTEM.md) - Inventory operations
- [Parts Management System](./PARTS_MANAGEMENT_SYSTEM.md) - Parts and kits
- [Reports & Analytics System](./REPORTS_ANALYTICS_SYSTEM.md) - Detailed reports
- [Settings & Administration](./SETTINGS_SYSTEM_ADMINISTRATION.md) - System configuration

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-29 | Initial documentation |
