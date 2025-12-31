# Voucher Management System Documentation

> **⚠️ NOTICE: DO NOT CHANGE THE LOGIC AND FRONT UI**
> 
> This document describes the current implementation. Any modifications should maintain existing functionality and user interface design.

---

## Table of Contents

1. [Module Overview](#module-overview)
2. [Architecture & Component Structure](#architecture--component-structure)
3. [Complete Voucher Workflow Diagram](#complete-voucher-workflow-diagram)
4. [Voucher Types](#voucher-types)
   - [Payment Voucher (PV)](#1-payment-voucher-pv)
   - [Receipt Voucher (RV)](#2-receipt-voucher-rv)
   - [Journal Voucher (JV)](#3-journal-voucher-jv)
   - [Contra Voucher (CV)](#4-contra-voucher-cv)
5. [View Vouchers Tab](#view-vouchers-tab)
6. [Print System](#print-system)
7. [Inter-Module Relationships](#inter-module-relationships)
8. [Button Functions Reference](#button-functions-reference)
9. [State Management](#state-management)
10. [Validation Rules](#validation-rules)
11. [Database Schema (Future)](#database-schema-future)

---

## Module Overview

The Voucher Management System is a comprehensive accounting module for recording and managing financial transactions through standardized voucher entries. It follows double-entry bookkeeping principles where every transaction must have equal debits and credits.

### Key Features
- **Four Voucher Types**: Payment, Receipt, Journal, and Contra vouchers
- **Double-Entry Accounting**: Automatic debit/credit balancing validation
- **Dynamic Account Management**: Add new accounts and subgroups on-the-fly
- **Voucher Number Auto-Generation**: Sequential numbering with type prefixes
- **Status Workflow**: Draft → Posted (Approved) → Printed
- **Comprehensive Filtering**: Filter by type, date range, account, and search
- **Print-Ready Documents**: Formatted voucher print layouts

### File Location
```
src/pages/Vouchers.tsx                       # Main Vouchers page
src/components/vouchers/
├── VoucherManagement.tsx                    # Main management component
├── PaymentVoucherForm.tsx                   # Payment voucher form
├── ReceiptVoucherForm.tsx                   # Receipt voucher form
├── JournalVoucherForm.tsx                   # Journal voucher form
├── ContraVoucherForm.tsx                    # Contra voucher form
├── ViewVouchersTab.tsx                      # View and manage vouchers
├── VoucherPrintView.tsx                     # Print layout component
└── NewVoucherTab.tsx                        # New voucher tab wrapper
```

---

## Architecture & Component Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Vouchers.tsx (Page)                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      VoucherManagement.tsx                           │   │
│  │  ┌───────────────────────────────────────────────────────────────┐  │   │
│  │  │                   Main Tab Navigation                          │  │   │
│  │  │              [New Voucher]  [View Vouchers]                    │  │   │
│  │  └───────────────────────────────────────────────────────────────┘  │   │
│  │                              │                                       │   │
│  │  ┌───────────────────────────┴───────────────────────────┐          │   │
│  │  │                                                       │          │   │
│  │  ▼ (New Voucher)                                        ▼          │   │
│  │  ┌─────────────────────────────────────┐  ┌──────────────────────┐ │   │
│  │  │        Voucher Type Tabs            │  │  ViewVouchersTab     │ │   │
│  │  │ [Payment][Receipt][Journal][Contra] │  │  - Filters           │ │   │
│  │  │           │                         │  │  - Table View        │ │   │
│  │  │           ▼                         │  │  - Edit/Delete       │ │   │
│  │  │  ┌─────────────────────────────┐   │  │  - Print             │ │   │
│  │  │  │ PaymentVoucherForm.tsx      │   │  └──────────────────────┘ │   │
│  │  │  │ ReceiptVoucherForm.tsx      │   │                           │   │
│  │  │  │ JournalVoucherForm.tsx      │   │                           │   │
│  │  │  │ ContraVoucherForm.tsx       │   │                           │   │
│  │  │  └─────────────────────────────┘   │                           │   │
│  │  └─────────────────────────────────────┘                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Data Structures

```typescript
// Main Voucher Interface
interface Voucher {
  id: string;
  voucherNumber: string;           // Format: PV2881, RV1019, JV4633, CV100
  type: "receipt" | "payment" | "journal" | "contra";
  date: string;
  narration: string;
  cashBankAccount: string;
  chequeNumber?: string;
  chequeDate?: string;
  entries: VoucherEntry[];
  totalDebit: number;
  totalCredit: number;
  status: "draft" | "posted" | "cancelled";
  createdAt: string;
}

// Individual Entry in a Voucher
interface VoucherEntry {
  id: string;
  account: string;
  description: string;
  debit: number;
  credit: number;
}

// Account Structure
interface Account {
  value: string;                   // Unique identifier (slug)
  label: string;                   // Display name
}
```

### Voucher Number Counters

```typescript
const voucherCounters = {
  receipt: 1019,      // RV prefix → RV1019, RV1020...
  payment: 2881,      // PV prefix → PV2881, PV2882...
  journal: 4633,      // JV prefix → JV4633, JV4634...
  contra: 100,        // CV prefix → CV100, CV101...
};
```

---

## Complete Voucher Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              VOUCHER MANAGEMENT WORKFLOW                                 │
└─────────────────────────────────────────────────────────────────────────────────────────┘

                                 ┌──────────────────┐
                                 │   USER ACTION    │
                                 │ (New Transaction)│
                                 └────────┬─────────┘
                                          │
                          ┌───────────────┼───────────────┐
                          │               │               │
                          ▼               ▼               ▼
                    ┌─────────┐     ┌─────────┐     ┌─────────┐
                    │ Payment │     │ Receipt │     │ Journal │
                    │  (PV)   │     │  (RV)   │     │  (JV)   │
                    └────┬────┘     └────┬────┘     └────┬────┘
                         │               │               │
                         │     ┌─────────┴─────────┐     │
                         │     │                   │     │
                         └─────┤   SELECT TYPE     ├─────┘
                               │                   │
                               └─────────┬─────────┘
                                         │
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ VOUCHER CREATION FORM                                                                    │
│ ┌─────────────────────────────────────────────────────────────────────────────────────┐ │
│ │  HEADER SECTION                                                                      │ │
│ │  • Name / Paid To / Received From                                                   │ │
│ │  • Date (Auto-filled)                                                               │ │
│ │  • Voucher Number (Auto-generated)                                                  │ │
│ │  • Dr/Cr Account Selection                                                          │ │
│ └─────────────────────────────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────────────────────────────┐ │
│ │  ENTRIES SECTION                                                                     │ │
│ │  • Account Selection (Searchable)                                                   │ │
│ │  • Description                                                                       │ │
│ │  • Debit Amount                                                                      │ │
│ │  • Credit Amount                                                                     │ │
│ │  • [+ Add Dr] [+ Add Cr] Buttons                                                    │ │
│ └─────────────────────────────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────────────────────────────┐ │
│ │  TOTALS SECTION                                                                      │ │
│ │  • Total Debit (Auto-calculated)                                                    │ │
│ │  • Total Credit (Auto-calculated)                                                   │ │
│ │  • Balance Check: Total Dr MUST equal Total Cr                                      │ │
│ └─────────────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                         │
                                         │ [Save]
                                         ▼
                               ┌──────────────────┐
                               │   VALIDATION     │
                               │                  │
                               │ • Required fields│
                               │ • Dr = Cr check  │
                               │ • Amount > 0     │
                               └────────┬─────────┘
                                        │
                         ┌──────────────┴──────────────┐
                         │ Pass                        │ Fail
                         ▼                             ▼
              ┌──────────────────┐          ┌──────────────────┐
              │  CREATE VOUCHER  │          │   SHOW ERROR     │
              │                  │          │   Toast Message  │
              │ • Generate No.   │          │   Return to Form │
              │ • Status: Draft  │          └──────────────────┘
              │ • Add to List    │
              └────────┬─────────┘
                       │
                       ▼
              ┌──────────────────┐
              │  VIEW VOUCHERS   │
              │      TAB         │
              └────────┬─────────┘
                       │
         ┌─────────────┼─────────────┬─────────────┐
         │             │             │             │
         ▼             ▼             ▼             ▼
    ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐
    │  EDIT   │   │ DELETE  │   │ APPROVE │   │  PRINT  │
    │         │   │         │   │         │   │         │
    │(Draft   │   │(Draft   │   │Draft→   │   │Generate │
    │ only)   │   │ only)   │   │ Posted  │   │Document │
    └─────────┘   └─────────┘   └─────────┘   └─────────┘
```

---

## Voucher Types

### 1. Payment Voucher (PV)

**Purpose**: Record payments made by the business (cash outflows).

**File**: `src/components/vouchers/PaymentVoucherForm.tsx`

**Accounting Logic**:
- **Credit (Cr)**: Cash/Bank account (source of payment)
- **Debit (Dr)**: Expense/Asset/Liability accounts (where money goes)

#### Data Structure

```typescript
interface PaymentVoucherEntry {
  id: string;
  accountDr: string;           // Account to debit
  description: string;
  drAmount: number;            // Debit amount
}

interface PaymentVoucherData {
  type: "payment";
  paidTo: string;              // Payee name
  date: string;
  crAccount: string;           // Cash/Bank account to credit
  entries: PaymentVoucherEntry[];
  totalAmount: number;
}
```

#### Form Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  💳 PAYMENT VOUCHER (PV)                                                │
│                                                                         │
│  ┌──────────────────────────────────────────────┐  ┌─────────────────┐ │
│  │ Paid To                                      │  │ Date            │ │
│  │ [Enter payee name                          ] │  │ [29/12/2025   ] │ │
│  └──────────────────────────────────────────────┘  └─────────────────┘ │
│                                                                         │
│  Cr Account                                                             │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │ [Select... ▼]  (Cash in Hand / Bank Account)                       ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  ┌──────────────────┬────────────────────────────┬──────────┬────────┐ │
│  │ Account Dr       │ Description                │ Dr       │ Action │ │
│  ├──────────────────┼────────────────────────────┼──────────┼────────┤ │
│  │ [Select...    ▼] │ [                        ] │ [amount] │ [✕]    │ │
│  │ [Select...    ▼] │ [                        ] │ [amount] │ [✕]    │ │
│  └──────────────────┴────────────────────────────┴──────────┴────────┘ │
│                                                                         │
│  [+ Add]                                                                │
│                                                                         │
│                                      Total Amount: [________]           │
│                                                                         │
│                                                   [💾 Save] [⋮]        │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Button Functions

| Button | Function | Action |
|--------|----------|--------|
| **+ Add New Subgroup** | `onAddSubgroup()` | Opens dialog to create new account subgroup |
| **+ Add New Account** | `onAddAccount()` | Opens dialog to create new account |
| **+ Add** | `addEntry()` | Adds new debit entry row |
| **✕ (Remove)** | `removeEntry(id)` | Removes entry row (disabled if only 1 row) |
| **Save** | `handleSave()` | Validates and saves voucher |

#### Validation Rules

```typescript
// Payment Voucher Validation
if (!paidTo) → "Please enter 'Paid To' field"
if (!crAccount) → "Please select Cr Account"
if (entries.some(e => !e.accountDr)) → "Please select Account Dr for all entries"
if (totalAmount === 0) → "Please enter at least one amount"
```

#### Example Transaction

**Paying rent of Rs. 25,000 via bank:**
```
Cr: Cash at Bank - HBL     Rs. 25,000
Dr: Rent Expense           Rs. 25,000
```

---

### 2. Receipt Voucher (RV)

**Purpose**: Record receipts received by the business (cash inflows).

**File**: `src/components/vouchers/ReceiptVoucherForm.tsx`

**Accounting Logic**:
- **Debit (Dr)**: Cash/Bank account (where money comes in)
- **Credit (Cr)**: Income/Asset/Liability accounts (source of receipt)

#### Data Structure

```typescript
interface ReceiptVoucherEntry {
  id: string;
  accountCr: string;           // Account to credit
  description: string;
  crAmount: number;            // Credit amount
}

interface ReceiptVoucherData {
  type: "receipt";
  receivedFrom: string;        // Payer name
  voucherNo: string;           // Auto-generated
  date: string;
  drAccount: string;           // Cash/Bank account to debit
  entries: ReceiptVoucherEntry[];
  totalAmount: number;
}
```

#### Form Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  🧾 RECEIPT VOUCHER (RV)                                                │
│                                                                         │
│  ┌──────────────────────────┐ ┌──────────────────┐ ┌─────────────────┐ │
│  │ Received from            │ │ voucher_no       │ │ Date            │ │
│  │ [Enter payer name      ] │ │ [RV-0001       ] │ │ [29/12/2025   ] │ │
│  └──────────────────────────┘ └──────────────────┘ └─────────────────┘ │
│                                                                         │
│  Dr Account                                                             │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │ [Select... ▼]  (Cash in Hand / Bank Account)                       ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  ┌──────────────────┬────────────────────────────┬──────────┬────────┐ │
│  │ Account Cr       │ Description                │ Cr       │ Action │ │
│  ├──────────────────┼────────────────────────────┼──────────┼────────┤ │
│  │ [Select...    ▼] │ [                        ] │ [amount] │ [✕]    │ │
│  └──────────────────┴────────────────────────────┴──────────┴────────┘ │
│                                                                         │
│  [+ Add]                                                                │
│                                                                         │
│                                      Total Amount: [________]           │
│                                                                         │
│                                                   [💾 Save] [⋮]        │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Button Functions

| Button | Function | Action |
|--------|----------|--------|
| **+ Add New Subgroup** | `onAddSubgroup()` | Opens dialog to create new account subgroup |
| **+ Add New Account** | `onAddAccount()` | Opens dialog to create new account |
| **+ Add** | `addEntry()` | Adds new credit entry row |
| **✕ (Remove)** | `removeEntry(id)` | Removes entry row (disabled if only 1 row) |
| **Save** | `handleSave()` | Validates and saves voucher |

#### Validation Rules

```typescript
// Receipt Voucher Validation
if (!receivedFrom) → "Please enter 'Received From' field"
if (!drAccount) → "Please select Dr Account"
if (entries.some(e => !e.accountCr)) → "Please select Account Cr for all entries"
if (totalAmount === 0) → "Please enter at least one amount"
```

#### Example Transaction

**Receiving payment of Rs. 50,000 from customer:**
```
Dr: Cash in Hand             Rs. 50,000
Cr: Accounts Receivable      Rs. 50,000
```

---

### 3. Journal Voucher (JV)

**Purpose**: Record non-cash transactions, adjustments, and corrections.

**File**: `src/components/vouchers/JournalVoucherForm.tsx`

**Accounting Logic**:
- **Multiple Debits** and **Multiple Credits** allowed
- Total Debits MUST equal Total Credits

#### Data Structure

```typescript
interface JournalEntry {
  id: string;
  account: string;
  description: string;
  drAmount: number;
  crAmount: number;
  type: "dr" | "cr";
}

interface JournalVoucherData {
  type: "journal";
  name: string;                // Transaction description
  date: string;
  drEntries: JournalEntry[];   // Debit side entries
  crEntries: JournalEntry[];   // Credit side entries
  totalDr: number;
  totalCr: number;
}
```

#### Form Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  📄 JOURNAL VOUCHER (JV)                                                │
│                                                                         │
│  ┌────────────────────────────────────────────────┐  ┌────────────────┐│
│  │ Name                                           │  │ Date           ││
│  │ [Enter transaction description               ] │  │ [29/12/2025  ] ││
│  └────────────────────────────────────────────────┘  └────────────────┘│
│                                                                         │
│  ┌────────────────┬─────────────────────┬──────────┬──────────┬──────┐ │
│  │ Account Dr/Cr  │ Description         │ Dr       │ Cr       │ Act  │ │
│  ├────────────────┼─────────────────────┼──────────┼──────────┼──────┤ │
│  │ [Select...  ▼] │ [                 ] │ [amount] │ [0     ] │ [✕]  │ │  ← Dr Entry
│  │ [Select...  ▼] │ [                 ] │ [0     ] │ [amount] │ [✕]  │ │  ← Cr Entry
│  └────────────────┴─────────────────────┴──────────┴──────────┴──────┘ │
│                                                                         │
│                    Total Amount:         [______]   [______]            │
│                                                                         │
│                                          [+ Add Dr] [+ Add Cr]          │
│                                                                         │
│                                                   [💾 Save] [⋮]        │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Button Functions

| Button | Function | Action |
|--------|----------|--------|
| **+ Add New Subgroup** | `onAddSubgroup()` | Opens dialog to create new account subgroup |
| **+ Add New Account** | `onAddAccount()` | Opens dialog to create new account |
| **+ Add Dr** | `addDrEntry()` | Adds new debit entry row |
| **+ Add Cr** | `addCrEntry()` | Adds new credit entry row |
| **✕ (Remove Dr)** | `removeDrEntry(id)` | Removes Dr entry (disabled if only 1) |
| **✕ (Remove Cr)** | `removeCrEntry(id)` | Removes Cr entry (disabled if only 1) |
| **Save** | `handleSave()` | Validates balancing and saves |

#### Validation Rules

```typescript
// Journal Voucher Validation
if (!name) → "Please enter Name field"
if (drEntries.some(e => !e.account) || crEntries.some(e => !e.account)) 
  → "Please select Account for all entries"
if (totalDr === 0 && totalCr === 0) → "Please enter at least one amount"
if (totalDr !== totalCr) → "Total Dr must equal Total Cr"  // CRITICAL
```

#### Example Transaction

**Depreciation entry of Rs. 10,000:**
```
Dr: Depreciation Expense     Rs. 10,000
Cr: Accumulated Depreciation Rs. 10,000
```

---

### 4. Contra Voucher (CV)

**Purpose**: Record transfers between cash and bank accounts (no external party involved).

**File**: `src/components/vouchers/ContraVoucherForm.tsx`

**Accounting Logic**:
- Used for cash deposits to bank or cash withdrawals from bank
- Both accounts involved must be cash/bank accounts
- Total Debits MUST equal Total Credits

#### Data Structure

```typescript
interface ContraEntry {
  id: string;
  account: string;
  description: string;
  drAmount: number;
  crAmount: number;
  type: "dr" | "cr";
}

interface ContraVoucherData {
  type: "contra";
  name: string;                // Transaction description
  date: string;
  drEntries: ContraEntry[];    // Debit side entries
  crEntries: ContraEntry[];    // Credit side entries
  totalDr: number;
  totalCr: number;
}
```

#### Form Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  🔄 CONTRA VOUCHER (CV)                                                 │
│                                                                         │
│  ┌────────────────────────────────────────────────┐  ┌────────────────┐│
│  │ Name                                           │  │ Date           ││
│  │ [Enter transaction description               ] │  │ [29/12/2025  ] ││
│  └────────────────────────────────────────────────┘  └────────────────┘│
│                                                                         │
│  ┌────────────────┬─────────────────────┬──────────┬──────────┬──────┐ │
│  │ Account Dr/Cr  │ Description         │ Dr       │ Cr       │ Act  │ │
│  ├────────────────┼─────────────────────┼──────────┼──────────┼──────┤ │
│  │ [Select...  ▼] │ [                 ] │ [amount] │ [0     ] │ [✕]  │ │
│  │ [Select...  ▼] │ [                 ] │ [0     ] │ [amount] │ [✕]  │ │
│  └────────────────┴─────────────────────┴──────────┴──────────┴──────┘ │
│                                                                         │
│                    Total Amount:         [______]   [______]            │
│                                                                         │
│                                          [+ Add Dr] [+ Add Cr]          │
│                                                                         │
│                                                   [💾 Save] [⋮]        │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Button Functions

| Button | Function | Action |
|--------|----------|--------|
| **+ Add New Subgroup** | `onAddSubgroup()` | Opens dialog to create new account subgroup |
| **+ Add New Account** | `onAddAccount()` | Opens dialog to create new account |
| **+ Add Dr** | `addDrEntry()` | Adds new debit entry row |
| **+ Add Cr** | `addCrEntry()` | Adds new credit entry row |
| **✕ (Remove)** | `removeDrEntry(id)` / `removeCrEntry(id)` | Removes entry |
| **Save** | `handleSave()` | Validates balancing and saves |

#### Validation Rules

```typescript
// Contra Voucher Validation (Same as Journal)
if (!name) → "Please enter Name field"
if (drEntries.some(e => !e.account) || crEntries.some(e => !e.account)) 
  → "Please select Account for all entries"
if (totalDr === 0 && totalCr === 0) → "Please enter at least one amount"
if (totalDr !== totalCr) → "Total Dr must equal Total Cr"  // CRITICAL
```

#### Example Transaction

**Cash deposit of Rs. 100,000 to bank:**
```
Dr: Cash at Bank - HBL       Rs. 100,000
Cr: Cash in Hand             Rs. 100,000
```

---

## View Vouchers Tab

**Purpose**: View, filter, edit, delete, approve, and print vouchers.

**File**: `src/components/vouchers/ViewVouchersTab.tsx`

### Filter Options

```
┌─────────────────────────────────────────────────────────────────────────┐
│  FILTERS                                                                 │
├─────────────────────────────────────────────────────────────────────────┤
│  Row 1: [Type ▼] [Category ▼] [Post Dated ▼] [From Date] [To Date]     │
│  Row 2: [Main Group ▼] [Sub Group ▼] [Account ▼]                        │
│  Row 3: [Search By ▼] [Search Query...                      ] [Search] │
└─────────────────────────────────────────────────────────────────────────┘
```

| Filter | Options | Description |
|--------|---------|-------------|
| **Type** | All, Payment, Receipt, Journal, Contra | Filter by voucher type |
| **Category** | Default, Expense, Income | Filter by transaction category |
| **Post Dated** | Default, Yes, No | Filter post-dated entries |
| **From/To Date** | Date pickers | Date range filter |
| **Main Group** | Assets, Liabilities, Equity, Revenue, Expenses | Account main group |
| **Sub Group** | Current Assets, Fixed Assets, etc. | Account sub group |
| **Account** | All accounts | Specific account filter |
| **Search By** | Voucher No, Voucher Name, Amount | Search field selection |

### Voucher Table

```
┌──────┬─────────┬──────────────┬─────────────────────┬─────────────┬───────────┬───────────┬─────────┐
│  ☐   │ Sr No   │ Voucher no   │ Voucher Name        │ Date        │ Amount    │ Status    │ Actions │
├──────┼─────────┼──────────────┼─────────────────────┼─────────────┼───────────┼───────────┼─────────┤
│  ☐   │ 1       │ PV2881       │ Rent Payment        │ 29/12/2025  │ 25,000    │ ⏱ Pending │ [⋮]     │
│  ☐   │ 2       │ RV1019       │ Customer Receipt    │ 28/12/2025  │ 50,000    │ ✓ Approved│ [⋮]     │
└──────┴─────────┴──────────────┴─────────────────────┴─────────────┴───────────┴───────────┴─────────┘
```

### Status Badges

| Status | Badge | Icon | Color |
|--------|-------|------|-------|
| `draft` | Pending | ⏱ Clock | Amber |
| `posted` | Approved | ✓ CheckCircle | Green |
| `cancelled` | Cancelled | ✕ X | Red |

### Action Menu

```
┌─────────────────────┐
│ ⋮ Actions           │
├─────────────────────┤
│ ✏️  Edit            │  ← Only for draft vouchers
│ 🗑️  Delete          │  ← Only for draft vouchers
│ ✓  Approve          │  ← Only for draft vouchers
│ 🖨️  Print           │  ← Always available
└─────────────────────┘
```

### Button Functions

| Button | Function | Condition | Action |
|--------|----------|-----------|--------|
| **Edit** | `handleEdit(voucher)` | Draft only | Opens edit dialog |
| **Delete** | `handleDelete(voucher)` | Draft only | Deletes voucher |
| **Approve** | `handleApprove(voucher)` | Draft only | Changes status to "posted" |
| **Print** | `setPrintingVoucher(voucher)` | Always | Opens print preview |
| **Select All** | `handleSelectAll(checked)` | Always | Selects all visible vouchers |
| **Search** | Filters list | Always | Applies search query |

### Edit Dialog

```
┌─────────────────────────────────────────────────────────────────────────┐
│  EDIT VOUCHER - PV2881                                                   │
├─────────────────────────────────────────────────────────────────────────┤
│  Narration: [Payment for office rent                                  ] │
│  Date:      [29/12/2025]                                                │
│                                                                         │
│  ┌────────────────┬─────────────────────┬──────────┬──────────┬──────┐ │
│  │ Account        │ Description         │ Debit    │ Credit   │ Act  │ │
│  ├────────────────┼─────────────────────┼──────────┼──────────┼──────┤ │
│  │ [Select...  ▼] │ [                 ] │ [25000 ] │ [0     ] │ [✕]  │ │
│  │ [Select...  ▼] │ [                 ] │ [0     ] │ [25000 ] │ [✕]  │ │
│  └────────────────┴─────────────────────┴──────────┴──────────┴──────┘ │
│                                                                         │
│                                          [+ Add Dr] [+ Add Cr]          │
│                                                                         │
│                        Total: Dr [25,000]  Cr [25,000] ← Must match    │
│                                                                         │
│                                         [Cancel] [Save Changes]         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Edit Validation

```typescript
// Cannot edit approved vouchers
if (voucher.status === "posted") {
  toast({ title: "Cannot Edit", description: "Approved vouchers cannot be edited." });
  return;
}

// Debit must equal Credit
if (totalDebit !== totalCredit) {
  toast({ title: "Validation Error", description: "Total Debit must equal Total Credit" });
  return;
}
```

---

## Print System

**File**: `src/components/vouchers/VoucherPrintView.tsx`

### Print Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          YOUR COMPANY NAME                               │
│              123 Business Street, City, Country                          │
│        Phone: +92-XXX-XXXXXXX | Email: info@company.com                 │
├─────────────────────────────────────────────────────────────────────────┤
│                    ┌──────────────────────────┐                          │
│                    │   PAYMENT VOUCHER        │                          │
│                    └──────────────────────────┘                          │
├─────────────────────────────────────────────────────────────────────────┤
│  Voucher No: PV2881                          Date: 29/12/2025           │
│  Account: Cash at Bank - HBL                 Status: Draft              │
│  Cheque No: 123456 (if applicable)                                      │
├─────────────────────────────────────────────────────────────────────────┤
│  Narration: Payment for office rent for December 2025                   │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────┬────────────────────┬────────────────┬───────────┬───────────┐│
│  │ S.No │ Account            │ Description    │ Debit (Rs)│ Credit(Rs)││
│  ├──────┼────────────────────┼────────────────┼───────────┼───────────┤│
│  │ 1    │ Rent Expense       │ Dec 2025 rent  │ 25,000.00 │ -         ││
│  │ 2    │ Cash at Bank - HBL │ Bank payment   │ -         │ 25,000.00 ││
│  ├──────┴────────────────────┴────────────────┼───────────┼───────────┤│
│  │                                     Total: │ 25,000.00 │ 25,000.00 ││
│  └────────────────────────────────────────────┴───────────┴───────────┘│
├─────────────────────────────────────────────────────────────────────────┤
│  Amount in Words: Twenty Five Thousand Rupees Only                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  _______________       _______________       _______________            │
│    Prepared By           Checked By           Approved By               │
├─────────────────────────────────────────────────────────────────────────┤
│  This is a computer generated document. Printed on: 29/12/2025 10:30   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Number to Words Function

The system includes a helper function to convert numbers to words in Pakistani format:

```typescript
function numberToWords(num: number): string {
  // Supports:
  // - Crore (10,000,000)
  // - Lakh (100,000)
  // - Thousand (1,000)
  // - Hundred (100)
  // - Standard ones and tens
}

// Examples:
// 25000 → "Twenty Five Thousand"
// 1500000 → "Fifteen Lakh"
// 10000000 → "One Crore"
```

---

## Inter-Module Relationships

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           MODULE RELATIONSHIP DIAGRAM                                    │
└─────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              ACCOUNTING MODULE                                           │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │                         Chart of Accounts                                         │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │  │
│  │  │ Main Groups │──│ Sub Groups  │──│  Accounts   │──│ Account Balances        │  │  │
│  │  │ (Assets,    │  │ (Current,   │  │ (Cash, Bank,│  │ (Debit/Credit totals)   │  │  │
│  │  │  Liabilities│  │  Fixed,     │  │  Expense,   │  │                         │  │  │
│  │  │  Equity...) │  │  etc.)      │  │  Revenue..) │  │                         │  │  │
│  │  └─────────────┘  └─────────────┘  └──────┬──────┘  └─────────────────────────┘  │  │
│  └───────────────────────────────────────────┼──────────────────────────────────────┘  │
│                                              │                                          │
│                                              │ Uses Accounts                            │
│                                              ▼                                          │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │                         VOUCHER MANAGEMENT                                        │  │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐  │  │
│  │  │ Payment (PV)   │  │ Receipt (RV)   │  │ Journal (JV)   │  │ Contra (CV)    │  │  │
│  │  │                │  │                │  │                │  │                │  │  │
│  │  │ Cash Outflow   │  │ Cash Inflow    │  │ Adjustments    │  │ Bank ↔ Cash    │  │  │
│  │  └────────┬───────┘  └────────┬───────┘  └────────┬───────┘  └────────┬───────┘  │  │
│  │           │                   │                   │                   │          │  │
│  │           └───────────────────┴───────────────────┴───────────────────┘          │  │
│  │                                       │                                          │  │
│  │                                       │ Creates Entries                          │  │
│  │                                       ▼                                          │  │
│  │           ┌───────────────────────────────────────────────────────────┐          │  │
│  │           │                    VOUCHER ENTRIES                        │          │  │
│  │           │  • Each entry has Account, Description, Debit, Credit     │          │  │
│  │           │  • Total Debit must equal Total Credit                    │          │  │
│  │           └───────────────────────────────────────────────────────────┘          │  │
│  └──────────────────────────────────────────────────────────────────────────────────┘  │
│                                              │                                          │
│                                              │ Updates                                  │
│                                              ▼                                          │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │                         FINANCIAL REPORTS                                         │  │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐  │  │
│  │  │ General Ledger │  │ Trial Balance  │  │ Income         │  │ Balance Sheet  │  │  │
│  │  │                │  │                │  │ Statement      │  │                │  │  │
│  │  │ Account-wise   │  │ Dr/Cr Summary  │  │ Revenue -      │  │ Assets =       │  │  │
│  │  │ transactions   │  │ for all accts  │  │ Expenses       │  │ Liab + Equity  │  │  │
│  │  └────────────────┘  └────────────────┘  └────────────────┘  └────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────────────┘

                                              │
                                              │ Linked To
                                              ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              SALES MODULE                                                │
│                                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │ Sales Invoice ──────────▶ Accounts Receivable ──────────▶ Receipt Voucher (RV) │   │
│  │                           (When customer pays)                                   │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                              │
                                              │ Linked To
                                              ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              EXPENSES MODULE                                             │
│                                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │ Expense Entry ──────────▶ Accounts Payable ──────────▶ Payment Voucher (PV)     │   │
│  │                           (When paying supplier)                                 │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Button Functions Reference

### Quick Reference Table

| Component | Button | Handler Function | Key Action |
|-----------|--------|------------------|------------|
| **VoucherManagement** | New Voucher Tab | `setMainTab("new")` | Switch to new voucher |
| | View Vouchers Tab | `setMainTab("view")` | Switch to view list |
| | Add Subgroup | `handleAddSubgroup()` | Open subgroup dialog |
| | Add Account | `handleAddAccount()` | Open account dialog |
| | Save Subgroup | `handleSaveSubgroup()` | Create new subgroup |
| | Save Account | `handleSaveAccount()` | Create new account |
| **PaymentVoucherForm** | + Add | `addEntry()` | Add debit entry row |
| | Remove (✕) | `removeEntry(id)` | Remove entry row |
| | Save | `handleSave()` | Validate & save voucher |
| **ReceiptVoucherForm** | + Add | `addEntry()` | Add credit entry row |
| | Remove (✕) | `removeEntry(id)` | Remove entry row |
| | Save | `handleSave()` | Validate & save voucher |
| **JournalVoucherForm** | + Add Dr | `addDrEntry()` | Add debit entry |
| | + Add Cr | `addCrEntry()` | Add credit entry |
| | Remove Dr (✕) | `removeDrEntry(id)` | Remove Dr entry |
| | Remove Cr (✕) | `removeCrEntry(id)` | Remove Cr entry |
| | Save | `handleSave()` | Validate balancing & save |
| **ContraVoucherForm** | + Add Dr | `addDrEntry()` | Add debit entry |
| | + Add Cr | `addCrEntry()` | Add credit entry |
| | Remove (✕) | `removeDrEntry/removeCrEntry` | Remove entry |
| | Save | `handleSave()` | Validate balancing & save |
| **ViewVouchersTab** | Search | Updates filters | Apply search filters |
| | Edit | `handleEdit(voucher)` | Open edit dialog (draft only) |
| | Delete | `handleDelete(voucher)` | Delete voucher (draft only) |
| | Approve | `handleApprove(voucher)` | Post voucher (draft only) |
| | Print | `setPrintingVoucher(voucher)` | Open print preview |
| | Select All | `handleSelectAll(checked)` | Toggle all selections |
| | Save Changes (Edit) | `handleSaveEdit()` | Save edited voucher |

---

## State Management

### VoucherManagement State

```typescript
// Main tab state
const [mainTab, setMainTab] = useState<"new" | "view">("view");
const [activeTab, setActiveTab] = useState<VoucherTab>("payment");

// Vouchers data
const [vouchers, setVouchers] = useState<Voucher[]>([]);

// Accounts list (dynamically updated)
const [accountsList, setAccountsList] = useState(initialAccounts);

// Voucher number counters
const [voucherCounters, setVoucherCounters] = useState({
  receipt: 1019,
  payment: 2881,
  journal: 4633,
  contra: 100,
});

// Dialog states
const [showSubgroupDialog, setShowSubgroupDialog] = useState(false);
const [showAccountDialog, setShowAccountDialog] = useState(false);
const [newSubgroupName, setNewSubgroupName] = useState("");
const [newAccountName, setNewAccountName] = useState("");
```

### Voucher Form State Pattern

Each voucher form follows this pattern:

```typescript
// Header fields
const [name/paidTo/receivedFrom, setName] = useState("");
const [date, setDate] = useState(currentDate);

// Main account (Dr or Cr depending on type)
const [mainAccount, setMainAccount] = useState("");

// Entry rows
const [entries, setEntries] = useState<Entry[]>([defaultEntry]);

// Calculated total
const totalAmount = entries.reduce((sum, e) => sum + e.amount, 0);
```

---

## Validation Rules

### Universal Validation

All vouchers must pass these checks:

| Rule | Error Message | Applies To |
|------|---------------|------------|
| Required name/payee/payer | "Please enter '[Field]' field" | All types |
| Main account selected | "Please select [Dr/Cr] Account" | PV, RV |
| All entries have accounts | "Please select Account [Dr/Cr] for all entries" | All types |
| Amount > 0 | "Please enter at least one amount" | All types |
| Debit = Credit | "Total Dr must equal Total Cr" | JV, CV |

### Type-Specific Validation

| Voucher Type | Specific Rule |
|--------------|---------------|
| Payment (PV) | Cr Account (Cash/Bank) required |
| Receipt (RV) | Dr Account (Cash/Bank) required |
| Journal (JV) | Multiple Dr and Cr, must balance |
| Contra (CV) | Cash/Bank accounts only, must balance |

---

## Default Accounts

```typescript
const initialAccounts = [
  // Cash & Bank
  { value: "cash-in-hand", label: "Cash in Hand" },
  { value: "cash-at-bank-hbl", label: "Cash at Bank - HBL" },
  { value: "cash-at-bank-mcb", label: "Cash at Bank - MCB" },
  { value: "cash-at-bank-ubl", label: "Cash at Bank - UBL" },
  { value: "petty-cash", label: "Petty Cash" },
  
  // Revenue & Expenses
  { value: "sales-revenue", label: "Sales Revenue" },
  { value: "purchase-account", label: "Purchase Account" },
  { value: "salary-expense", label: "Salary Expense" },
  { value: "rent-expense", label: "Rent Expense" },
  { value: "utility-expense", label: "Utility Expense" },
  { value: "office-supplies", label: "Office Supplies" },
  
  // Assets & Liabilities
  { value: "accounts-receivable", label: "Accounts Receivable" },
  { value: "accounts-payable", label: "Accounts Payable" },
  { value: "furniture-fixtures", label: "Furniture & Fixtures" },
  { value: "equipment", label: "Equipment" },
  
  // Capital
  { value: "capital-account", label: "Capital Account" },
  { value: "drawings", label: "Drawings" },
  
  // Other
  { value: "interest-income", label: "Interest Income" },
  { value: "interest-expense", label: "Interest Expense" },
];
```

---

## Database Schema (Future)

```sql
-- Vouchers Table
CREATE TABLE vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_number VARCHAR(20) UNIQUE NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('receipt', 'payment', 'journal', 'contra')),
  date DATE NOT NULL,
  narration TEXT,
  cash_bank_account VARCHAR(100),
  cheque_number VARCHAR(50),
  cheque_date DATE,
  total_debit DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_credit DECIMAL(15,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'cancelled')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  
  CONSTRAINT check_balanced CHECK (total_debit = total_credit)
);

-- Voucher Entries Table
CREATE TABLE voucher_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id UUID REFERENCES vouchers(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id),
  account_name VARCHAR(255) NOT NULL,
  description TEXT,
  debit DECIMAL(15,2) NOT NULL DEFAULT 0,
  credit DECIMAL(15,2) NOT NULL DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Accounts Table
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) UNIQUE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  main_group VARCHAR(50) NOT NULL CHECK (main_group IN ('assets', 'liabilities', 'equity', 'revenue', 'expenses')),
  sub_group VARCHAR(100),
  account_type VARCHAR(50),
  is_cash_bank BOOLEAN DEFAULT FALSE,
  opening_balance DECIMAL(15,2) DEFAULT 0,
  current_balance DECIMAL(15,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Account Subgroups Table
CREATE TABLE account_subgroups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  main_group VARCHAR(50) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Voucher Number Sequence
CREATE SEQUENCE voucher_receipt_seq START WITH 1019;
CREATE SEQUENCE voucher_payment_seq START WITH 2881;
CREATE SEQUENCE voucher_journal_seq START WITH 4633;
CREATE SEQUENCE voucher_contra_seq START WITH 100;

-- Function to generate voucher number
CREATE OR REPLACE FUNCTION generate_voucher_number(voucher_type VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
  prefix VARCHAR(2);
  next_val INTEGER;
BEGIN
  CASE voucher_type
    WHEN 'receipt' THEN 
      prefix := 'RV';
      next_val := nextval('voucher_receipt_seq');
    WHEN 'payment' THEN 
      prefix := 'PV';
      next_val := nextval('voucher_payment_seq');
    WHEN 'journal' THEN 
      prefix := 'JV';
      next_val := nextval('voucher_journal_seq');
    WHEN 'contra' THEN 
      prefix := 'CV';
      next_val := nextval('voucher_contra_seq');
  END CASE;
  
  RETURN prefix || next_val::VARCHAR;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate voucher number
CREATE OR REPLACE FUNCTION set_voucher_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.voucher_number IS NULL THEN
    NEW.voucher_number := generate_voucher_number(NEW.type);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_voucher_number
BEFORE INSERT ON vouchers
FOR EACH ROW
EXECUTE FUNCTION set_voucher_number();

-- Index for common queries
CREATE INDEX idx_vouchers_type ON vouchers(type);
CREATE INDEX idx_vouchers_date ON vouchers(date);
CREATE INDEX idx_vouchers_status ON vouchers(status);
CREATE INDEX idx_voucher_entries_account ON voucher_entries(account_id);
```

---

## Notification System

### Toast Notifications

| Event | Type | Title | Description |
|-------|------|-------|-------------|
| Voucher created | Success | "Success" | "Voucher {no} created successfully" |
| Voucher saved | Success | "Success" | "{Type} Voucher saved successfully" |
| Voucher updated | Success | "Success" | "Voucher updated successfully" |
| Voucher deleted | Success | "Success" | "Voucher deleted successfully" |
| Voucher approved | Success | "Success" | "Voucher approved successfully" |
| Subgroup added | Success | "Success" | "Subgroup '{name}' added successfully" |
| Account added | Success | "Success" | "Account '{name}' added successfully" |
| Validation failed | Destructive | "Error" | Specific validation message |
| Cannot edit | Destructive | "Cannot Edit" | "Approved vouchers cannot be edited" |
| Cannot delete | Destructive | "Cannot Delete" | "Approved vouchers cannot be deleted" |

---

## Summary

The Voucher Management System provides a complete solution for recording financial transactions:

1. **Payment Voucher (PV)** - Record all cash outflows
2. **Receipt Voucher (RV)** - Record all cash inflows
3. **Journal Voucher (JV)** - Record adjustments and non-cash transactions
4. **Contra Voucher (CV)** - Record transfers between cash/bank accounts

Key principles followed:
- **Double-Entry Bookkeeping**: Every transaction must balance (Dr = Cr)
- **Audit Trail**: Status workflow from Draft → Posted
- **Print-Ready**: Formatted documents with amount in words
- **Dynamic Accounts**: Add new accounts on-the-fly

---

> **⚠️ REMINDER: DO NOT CHANGE THE LOGIC AND FRONT UI**
> 
> Any modifications should maintain the existing functionality and user interface design as documented above.
