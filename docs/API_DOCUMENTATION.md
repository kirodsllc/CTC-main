# API Documentation

## Overview

This document provides a comprehensive reference for all data structures, interfaces, types, helper functions, hooks, and context providers used throughout the InventoryERP system.

---

## Table of Contents

1. [Type Definitions](#type-definitions)
2. [Interfaces](#interfaces)
3. [Context Providers](#context-providers)
4. [Custom Hooks](#custom-hooks)
5. [Utility Functions](#utility-functions)
6. [Storage Helpers](#storage-helpers)
7. [Notification Functions](#notification-functions)
8. [Common Patterns](#common-patterns)

---

## Type Definitions

### Invoice Types

**Location:** `src/types/invoice.ts`

```typescript
// Customer classification
export type CustomerType = "walking" | "registered";

// Stock availability status
export type StockStatus = "available" | "reserved" | "out";

// Invoice lifecycle status
export type InvoiceStatus = 
  | "draft"              // Initial state, not finalized
  | "pending"            // Awaiting processing
  | "partially_delivered"// Some items delivered
  | "fully_delivered"    // All items delivered
  | "on_hold"            // Temporarily suspended
  | "cancelled";         // Cancelled invoice

// Payment tracking status
export type PaymentStatus = "unpaid" | "partial" | "paid";

// Item quality grade
export type ItemGrade = "A" | "B" | "C" | "D";
```

### Discount Types

```typescript
// Used across invoicing and pricing
export type DiscountType = "percent" | "fixed";
```

### Notification Types

**Location:** `src/contexts/NotificationContext.tsx`

```typescript
// Notification severity levels
export type NotificationType = "info" | "success" | "warning" | "error";

// Browser push notification permission
export type PushPermission = "default" | "granted" | "denied" | "unsupported";
```

### Supplier Status

**Location:** `src/hooks/useInventoryData.ts`

```typescript
// Supplier active status
export type SupplierStatus = "active" | "inactive";
```

### Voucher Types

```typescript
// Voucher classification
export type VoucherType = "payment" | "receipt" | "journal" | "contra";

// Voucher status
export type VoucherStatus = "draft" | "posted" | "reversed";
```

### Journal Entry Status

```typescript
// Journal entry lifecycle
export type JournalStatus = "draft" | "posted" | "reversed";
```

### Purchase Order Status

```typescript
// PO lifecycle status
export type POStatus = "draft" | "pending" | "approved" | "received" | "cancelled";
```

### Account Types

```typescript
// Chart of accounts classification
export type AccountType = "asset" | "liability" | "equity" | "revenue" | "expense" | "cost";
```

---

## Interfaces

### Core Inventory Interfaces

**Location:** `src/hooks/useInventoryData.ts`

#### Part

```typescript
export interface Part {
  id: string;          // Unique identifier
  partNo: string;      // Part number/SKU
  brand: string;       // Brand name
  uom: string;         // Unit of measure
  cost: number | null; // Cost price
  price: number | null;// Selling price
  stock: number;       // Current stock quantity
}
```

#### Kit

```typescript
export interface Kit {
  id: string;          // Unique identifier
  name: string;        // Kit name
  badge?: string;      // Optional badge text
  itemsCount: number;  // Number of components
  totalCost: number;   // Sum of component costs
  price: number;       // Kit selling price
}
```

#### Supplier

```typescript
export interface Supplier {
  id: string;                       // Unique identifier
  code: string;                     // Supplier code
  companyName: string;              // Company name
  status: "active" | "inactive";    // Active status
}
```

#### Category

```typescript
export interface Category {
  id: string;          // Unique identifier
  name: string;        // Category name
  count?: number;      // Optional item count
}
```

---

### Invoice System Interfaces

**Location:** `src/types/invoice.ts`

#### Customer

```typescript
export interface Customer {
  id: string;
  name: string;
  type: CustomerType;       // "walking" | "registered"
  phone?: string;
  address?: string;
  balance?: number;         // Outstanding balance
}
```

#### ItemBrand

```typescript
export interface ItemBrand {
  id: string;
  name: string;
}
```

#### ItemCategory

```typescript
export interface ItemCategory {
  id: string;
  name: string;
}
```

#### MachineModel

```typescript
export interface MachineModel {
  id: string;
  name: string;
  requiredQty?: number;     // Required quantity for this model
}
```

#### PartItem

```typescript
export interface PartItem {
  id: string;
  partNo: string;
  description: string;
  price: number;
  stockQty: number;
  reservedQty: number;
  availableQty: number;     // stockQty - reservedQty
  grade: ItemGrade;
  category: string;
  brands: ItemBrand[];
  lastSaleQty?: number;
  lastSalePrice?: number;
  lastSaleDate?: string;
  machineModels?: MachineModel[];
}
```

#### InvoiceItem

```typescript
export interface InvoiceItem {
  id: string;
  partId: string;
  partNo: string;
  description: string;
  orderedQty: number;
  deliveredQty: number;
  pendingQty: number;       // orderedQty - deliveredQty
  unitPrice: number;
  discount: number;
  discountType: "percent" | "fixed";
  lineTotal: number;
  grade: ItemGrade;
  brand?: string;
  machineModel?: string;
  machineRequiredQty?: number;
}
```

#### DeliveryLogEntry

```typescript
export interface DeliveryLogEntry {
  id: string;
  deliveryDate: string;
  challanNo: string;
  items: {
    partId: string;
    partNo: string;
    quantity: number;
  }[];
  deliveredBy?: string;
  remarks?: string;
}
```

#### Invoice

```typescript
export interface Invoice {
  id: string;
  invoiceNo: string;
  invoiceDate: string;
  customerType: CustomerType;
  customerId: string;
  customerName: string;
  salesPerson: string;
  items: InvoiceItem[];
  subtotal: number;
  overallDiscount: number;
  overallDiscountType: "percent" | "fixed";
  tax: number;
  grandTotal: number;
  paidAmount: number;
  status: InvoiceStatus;
  paymentStatus: PaymentStatus;
  deliveryLog: DeliveryLogEntry[];
  holdReason?: string;
  holdSince?: string;
  createdAt: string;
  updatedAt: string;
}
```

#### StockReservation

```typescript
export interface StockReservation {
  invoiceId: string;
  partId: string;
  reservedQty: number;
  reservedAt: string;
}
```

---

### Notification Interface

**Location:** `src/contexts/NotificationContext.tsx`

```typescript
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  timestamp: Date;
  read: boolean;
  action?: {
    label: string;
    path?: string;          // Navigation path
    onClick?: () => void;   // Custom click handler
  };
  module?: string;          // Source module identifier
}
```

---

### Pricing Interfaces

```typescript
// Price item for bulk updates
interface PriceItem {
  id: string;
  partNo: string;
  description: string;
  category: string;
  brand: string;
  cost: number;
  newCost: number;
  priceA: number;
  newPriceA: number;
  priceB: number;
  newPriceB: number;
  priceM: number;
  newPriceM: number;
  quantity: number;
  selected: boolean;
  modified: boolean;
}

// Price level definition
interface PriceLevel {
  id: string;
  name: string;
  description: string;
  markup: number;
  customerType: string;
  itemCount: number;
}

// Landed cost entry
interface LandedCostEntry {
  id: string;
  poNumber: string;
  date: string;
  supplier: string;
  itemCount: number;
  invoiceValue: number;
  freight: number;
  customs: number;
  insurance: number;
  handling: number;
  totalLanded: number;
  status: "pending" | "calculated" | "applied";
}

// Price history record
interface PriceHistoryEntry {
  id: string;
  itemId: string;
  partNo: string;
  description: string;
  date: string;
  time: string;
  updatedBy: string;
  reason: string;
  updateType: "individual" | "bulk" | "margin";
  changes: {
    field: string;
    oldValue: number;
    newValue: number;
  }[];
}
```

---

### Accounting Interfaces

```typescript
// Main account group (Level 1)
interface MainGroup {
  id: string;
  code: string;
  name: string;
}

// Subgroup (Level 2)
interface Subgroup {
  id: string;
  mainGroup: string;
  code: string;
  name: string;
  isActive: boolean;
  canDelete: boolean;
}

// Account (Level 3)
interface Account {
  id: string;
  group: string;
  subGroup: string;
  code: string;
  name: string;
  status: "Active" | "Inactive";
  canDelete: boolean;
}

// Journal entry line
interface JournalLine {
  id: string;
  accountCode: string;
  accountName: string;
  description: string;
  debit: number;
  credit: number;
}

// Complete journal entry
interface JournalEntry {
  id: string;
  entryNo: string;
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

// General ledger transaction
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

// Ledger account with transactions
interface LedgerAccount {
  code: string;
  name: string;
  type: "asset" | "liability" | "equity" | "revenue" | "expense";
  openingBalance: number;
  currentBalance: number;
  transactions: LedgerTransaction[];
}

// Trial balance row
interface TrialBalanceRow {
  accountCode: string;
  accountName: string;
  accountType: string;
  debit: number;
  credit: number;
}
```

---

### Voucher Interfaces

```typescript
// Voucher entry line
interface VoucherLine {
  id: string;
  accountCode: string;
  accountName: string;
  description: string;
  debit: number;
  credit: number;
}

// Complete voucher
interface Voucher {
  id: string;
  voucherNo: string;
  voucherType: "payment" | "receipt" | "journal" | "contra";
  date: string;
  reference: string;
  description: string;
  lines: VoucherLine[];
  totalAmount: number;
  status: "draft" | "posted" | "reversed";
  createdBy: string;
  createdAt: string;
}
```

---

### Settings Interfaces

```typescript
// User account
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "Active" | "Inactive";
  lastLogin: string;
}

// Role definition
interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  userCount: number;
}

// Permission definition
interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

// Company profile
interface CompanyProfile {
  name: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  taxId: string;
  logo?: string;
}

// Store/location
interface Store {
  id: string;
  code: string;
  name: string;
  address: string;
  phone: string;
  manager: string;
  status: "Active" | "Inactive";
}

// Approval flow
interface ApprovalFlow {
  id: string;
  name: string;
  module: string;
  trigger: string;
  steps: {
    stepNumber: number;
    role: string;
    action: string;
    condition?: string;
  }[];
  isActive: boolean;
}

// Activity log entry
interface ActivityLog {
  id: string;
  timestamp: string;
  user: string;
  actionType: string;
  module: string;
  description: string;
  ipAddress: string;
  status: "Success" | "Failed";
}

// Backup record
interface Backup {
  id: string;
  date: string;
  time: string;
  type: "full" | "incremental";
  size: string;
  status: "completed" | "failed" | "in_progress";
  createdBy: string;
}
```

---

### Dashboard Interfaces

```typescript
// Stat card props
interface StatCardProps {
  icon: React.ReactNode;
  value: number;
  label: string;
  change: string;
  progressColor: "orange" | "blue" | "green" | "yellow";
  iconBgColor: string;
}

// Quick action item
interface QuickActionItemProps {
  icon: React.ReactNode;
  iconBgColor: string;
  title: string;
  description: string;
  badge?: string;
  onClick?: () => void;
}

// Distribution item
interface DistributionItem {
  label: string;
  value: number;
  color: string;
  path: string;
}

// Search result
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

---

## Context Providers

### NotificationContext

**Location:** `src/contexts/NotificationContext.tsx`

#### Context Type

```typescript
interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  soundEnabled: boolean;
  toggleSound: () => void;
  pushEnabled: boolean;
  pushPermission: PushPermission;
  requestPushPermission: () => Promise<boolean>;
  togglePush: () => void;
}
```

#### Usage

```typescript
import { useNotifications } from '@/contexts/NotificationContext';

const MyComponent = () => {
  const { 
    notifications, 
    unreadCount, 
    addNotification, 
    markAsRead 
  } = useNotifications();

  const handleClick = () => {
    addNotification({
      title: 'Action Complete',
      message: 'Your action was successful.',
      type: 'success',
      module: 'myModule',
    });
  };

  return (
    <div>
      <span>Unread: {unreadCount}</span>
      {notifications.map(n => (
        <div key={n.id} onClick={() => markAsRead(n.id)}>
          {n.title}
        </div>
      ))}
    </div>
  );
};
```

#### Provider Setup

```typescript
// In App.tsx or main layout
import { NotificationProvider } from '@/contexts/NotificationContext';

const App = () => (
  <NotificationProvider>
    <RouterProvider router={router} />
  </NotificationProvider>
);
```

---

### InventoryDataContext

**Location:** `src/hooks/useInventoryData.ts`

#### Context Type

```typescript
export interface InventoryDataContextType {
  // Data
  parts: Part[];
  kits: Kit[];
  suppliers: Supplier[];
  categories: Category[];
  
  // Parts CRUD
  addPart: (part: Part) => void;
  updatePart: (part: Part) => void;
  deletePart: (id: string) => void;
  
  // Kits CRUD
  addKit: (kit: Kit) => void;
  updateKit: (kit: Kit) => void;
  deleteKit: (id: string) => void;
  
  // Suppliers CRUD
  addSupplier: (supplier: Supplier) => void;
  updateSupplier: (supplier: Supplier) => void;
  deleteSupplier: (id: string) => void;
  
  // Categories CRUD
  addCategory: (category: Category) => void;
  updateCategory: (category: Category) => void;
  deleteCategory: (id: string) => void;
}
```

---

## Custom Hooks

### useInventoryData

**Location:** `src/hooks/useInventoryData.ts`

```typescript
import { useInventoryData } from '@/hooks/useInventoryData';

const MyComponent = () => {
  const { parts, addPart, updatePart, deletePart } = useInventoryData();

  const handleAdd = () => {
    addPart({
      id: crypto.randomUUID(),
      partNo: 'NEW-001',
      brand: 'Generic',
      uom: 'pcs',
      cost: 10,
      price: 15,
      stock: 100,
    });
  };

  return <div>{parts.length} parts</div>;
};
```

### useInventoryStats

**Location:** `src/hooks/useInventoryData.ts`

Returns summary counts without requiring provider.

```typescript
import { useInventoryStats } from '@/hooks/useInventoryData';

const DashboardStats = () => {
  const { 
    partsCount, 
    kitsCount, 
    suppliersCount, 
    categoriesCount 
  } = useInventoryStats();

  return (
    <div>
      <span>Parts: {partsCount}</span>
      <span>Kits: {kitsCount}</span>
      <span>Suppliers: {suppliersCount}</span>
      <span>Categories: {categoriesCount}</span>
    </div>
  );
};
```

### useAppNotifications

**Location:** `src/hooks/useAppNotifications.ts`

Pre-configured notification functions for each module.

```typescript
import { useAppNotifications } from '@/hooks/useAppNotifications';

const MyComponent = () => {
  const {
    // Parts
    notifyPartCreated,
    notifyPartUpdated,
    notifyKitCreated,
    
    // Sales
    notifyInvoiceCreated,
    notifyQuotationSent,
    notifyDeliveryDispatched,
    notifyPaymentReceived,
    
    // Inventory
    notifyStockLow,
    notifyStockTransferred,
    notifyStockAdjusted,
    notifyPurchaseOrderCreated,
    
    // Vouchers
    notifyVoucherCreated,
    
    // Expenses
    notifyExpenseAdded,
    notifyExpenseApproved,
    
    // Customers/Suppliers
    notifyCustomerAdded,
    notifySupplierAdded,
    
    // Settings
    notifyUserCreated,
    notifySettingsSaved,
    notifyBackupCreated,
    
    // Accounting
    notifyJournalEntryCreated,
    notifyAccountCreated,
    
    // General
    notifyError,
    notifySuccess,
    notifyWarning,
    notifyInfo,
  } = useAppNotifications();

  const handleSave = () => {
    notifyPartCreated('Widget Pro X');
  };

  return <button onClick={handleSave}>Save</button>;
};
```

### useToast

**Location:** `src/hooks/use-toast.ts`

Toast notification system (UI-level).

```typescript
import { useToast, toast } from '@/hooks/use-toast';

// Using the hook
const MyComponent = () => {
  const { toast } = useToast();

  const handleClick = () => {
    toast({
      title: 'Success',
      description: 'Your changes have been saved.',
    });
  };

  return <button onClick={handleClick}>Save</button>;
};

// Using the standalone function
const handleGlobalAction = () => {
  toast({
    title: 'Error',
    description: 'Something went wrong.',
    variant: 'destructive',
  });
};
```

### useMobile

**Location:** `src/hooks/use-mobile.tsx`

Responsive breakpoint detection.

```typescript
import { useMobile } from '@/hooks/use-mobile';

const ResponsiveComponent = () => {
  const isMobile = useMobile();

  return (
    <div className={isMobile ? 'flex-col' : 'flex-row'}>
      {isMobile ? 'Mobile View' : 'Desktop View'}
    </div>
  );
};
```

---

## Utility Functions

### cn (Class Name Merger)

**Location:** `src/lib/utils.ts`

Merges Tailwind CSS classes with proper handling of conflicts.

```typescript
import { cn } from '@/lib/utils';

// Basic usage
<div className={cn('p-4 bg-blue-500', 'bg-red-500')} />
// Result: 'p-4 bg-red-500' (red wins)

// Conditional classes
<div className={cn(
  'base-class',
  isActive && 'active-class',
  isDisabled ? 'opacity-50' : 'opacity-100'
)} />

// With arrays
<div className={cn([
  'flex',
  'items-center',
  variant === 'primary' && 'bg-primary',
])} />
```

### formatCurrency

Common pattern used across modules.

```typescript
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-PK', { 
    style: 'currency', 
    currency: 'PKR', 
    minimumFractionDigits: 2 
  }).format(value).replace('PKR', 'Rs');
};

// Usage
formatCurrency(1234.56); // "Rs 1,234.56"
```

### formatDate

Common date formatting pattern.

```typescript
import { format, formatDistanceToNow } from 'date-fns';

// Absolute date
format(new Date(), 'yyyy-MM-dd');        // "2025-12-29"
format(new Date(), 'dd/MM/yyyy');        // "29/12/2025"
format(new Date(), 'MMM dd, yyyy');      // "Dec 29, 2025"

// Relative time
formatDistanceToNow(date, { addSuffix: true }); // "5 minutes ago"
formatDistanceToNow(date, { addSuffix: false }); // "5 minutes"
```

### generateId

ID generation pattern.

```typescript
// Using crypto API (recommended)
const id = crypto.randomUUID();
// Result: "550e8400-e29b-41d4-a716-446655440000"

// Using timestamp + random
const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
// Result: "1703847600000-abc123xyz"

// For document numbers
const generateNumber = (prefix: string): string => {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}-${year}-${random}`;
};
// generateNumber('INV'); // "INV-2025-0042"
```

---

## Storage Helpers

**Location:** `src/hooks/useInventoryData.ts`

### Storage Keys

```typescript
const STORAGE_KEYS = {
  parts: 'inventory-parts',
  kits: 'inventory-kits',
  suppliers: 'inventory-suppliers',
  categories: 'inventory-categories',
};
```

### loadFromStorage

```typescript
const loadFromStorage = <T>(key: string, fallback: T): T => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
};

// Usage
const parts = loadFromStorage<Part[]>(STORAGE_KEYS.parts, []);
```

### saveToStorage

```typescript
const saveToStorage = <T>(key: string, data: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
};

// Usage
saveToStorage(STORAGE_KEYS.parts, parts);
```

### Storage Event Dispatch

```typescript
// Notify other components of storage changes
const dispatchStorageUpdate = () => {
  window.dispatchEvent(new Event('inventory-updated'));
};

// Listen for storage changes
useEffect(() => {
  const handleStorageChange = () => {
    // Reload data from storage
  };

  window.addEventListener('storage', handleStorageChange);
  window.addEventListener('inventory-updated', handleStorageChange);

  return () => {
    window.removeEventListener('storage', handleStorageChange);
    window.removeEventListener('inventory-updated', handleStorageChange);
  };
}, []);
```

---

## Notification Functions

### Browser Push Notifications

**Location:** `src/contexts/NotificationContext.tsx`

```typescript
// Check if push is supported
const isPushSupported = (): boolean => {
  return 'Notification' in window;
};

// Get current permission
const getPushPermission = (): PushPermission => {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission as PushPermission;
};

// Show browser notification
const showPushNotification = (title: string, options?: NotificationOptions) => {
  if (!isPushSupported() || Notification.permission !== 'granted') return;
  
  const notification = new Notification(title, {
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    ...options,
  });

  notification.onclick = () => {
    window.focus();
    notification.close();
  };

  setTimeout(() => notification.close(), 5000);
};
```

### Audio Notification

```typescript
const playNotificationSound = () => {
  const audioContext = new AudioContext();
  
  const oscillator1 = audioContext.createOscillator();
  const oscillator2 = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator1.connect(gainNode);
  oscillator2.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator1.frequency.setValueAtTime(880, audioContext.currentTime);
  oscillator2.frequency.setValueAtTime(1108.73, audioContext.currentTime);
  
  gainNode.gain.setValueAtTime(0, audioContext.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.05);
  gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.4);
  
  oscillator1.start();
  oscillator2.start();
  oscillator1.stop(audioContext.currentTime + 0.4);
  oscillator2.stop(audioContext.currentTime + 0.4);
};
```

---

## Common Patterns

### Pagination

```typescript
const [currentPage, setCurrentPage] = useState(1);
const itemsPerPage = 10;

const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
const startIndex = (currentPage - 1) * itemsPerPage;
const paginatedItems = filteredItems.slice(startIndex, startIndex + itemsPerPage);

// Navigation
const goToPage = (page: number) => {
  setCurrentPage(Math.max(1, Math.min(page, totalPages)));
};
```

### Filtering

```typescript
const [searchTerm, setSearchTerm] = useState('');
const [filterStatus, setFilterStatus] = useState('all');

const filteredItems = items.filter(item => {
  const matchesSearch = 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.code.toLowerCase().includes(searchTerm.toLowerCase());
  const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
  return matchesSearch && matchesStatus;
});
```

### Selection

```typescript
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

const handleSelect = (id: string) => {
  setSelectedIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    return next;
  });
};

const handleSelectAll = () => {
  if (selectedIds.size === items.length) {
    setSelectedIds(new Set());
  } else {
    setSelectedIds(new Set(items.map(item => item.id)));
  }
};

const isSelected = (id: string) => selectedIds.has(id);
const selectedCount = selectedIds.size;
```

### CSV Export

```typescript
const exportToCSV = (data: any[], filename: string, headers: string[]) => {
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(h => {
        const value = row[h.toLowerCase().replace(/ /g, '')];
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};
```

### Debounce

```typescript
import { useState, useEffect } from 'react';

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Usage
const [searchTerm, setSearchTerm] = useState('');
const debouncedSearch = useDebounce(searchTerm, 300);
```

### Form State

```typescript
const [formData, setFormData] = useState({
  name: '',
  email: '',
  phone: '',
});

const handleChange = (field: keyof typeof formData) => (
  e: React.ChangeEvent<HTMLInputElement>
) => {
  setFormData(prev => ({ ...prev, [field]: e.target.value }));
};

const handleReset = () => {
  setFormData({ name: '', email: '', phone: '' });
};

// Usage in JSX
<Input 
  value={formData.name}
  onChange={handleChange('name')}
/>
```

---

## Related Documentation

- [README (Index)](./README.md) - System overview and getting started
- [Dashboard System](./DASHBOARD_SYSTEM.md) - Dashboard components
- [Parts Management](./PARTS_MANAGEMENT_SYSTEM.md) - Parts and kits
- [Inventory Management](./INVENTORY_MANAGEMENT_SYSTEM.md) - Stock control
- [Sales & Invoicing](./SALES_INVOICING_SYSTEM.md) - Sales transactions
- [Accounting & Finance](./ACCOUNTING_FINANCIAL_SYSTEM.md) - Accounting system
- [Settings & Admin](./SETTINGS_SYSTEM_ADMINISTRATION.md) - System configuration

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-29 | Initial API documentation |
