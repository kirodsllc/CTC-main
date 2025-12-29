# Kits Management System Documentation

> ⚠️ **IMPORTANT NOTICE**: Do NOT change the logic or front-end UI of this system. This document is for reference only.

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Data Structures](#data-structures)
4. [Kit Creation Workflow](#kit-creation-workflow)
5. [Kit Editing Workflow](#kit-editing-workflow)
6. [Kit Deletion Logic](#kit-deletion-logic)
7. [Items List Integration](#items-list-integration)
8. [Button Functions](#button-functions)
9. [Notification System](#notification-system)
10. [Current Logic Explanation](#current-logic-explanation)
11. [Foreign Key Constraints](#foreign-key-constraints)

---

## System Overview

The Kits Management System allows users to:
- Create bundled products (kits) from multiple individual parts
- Set custom pricing for kits independent of component costs
- Track total cost vs. selling price for margin analysis
- Edit and update existing kits
- Delete kits with proper confirmation

A **Kit** is a collection of parts sold together as a single unit, such as a "Brake Service Kit" containing brake pads, rotors, and fluid.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           KITS MANAGEMENT SYSTEM                                │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                              CREATE KIT FORM                                    │
│                                                                                 │
│   ┌─────────────────────────────────────────────────────────────────────────┐  │
│   │  Kit Details Section                                                    │  │
│   │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │  │
│   │  │ Kit Number   │ │ Kit Name     │ │ Selling Price│ │ Status       │   │  │
│   │  │ (Required)   │ │ (Required)   │ │ (Optional)   │ │ (Dropdown)   │   │  │
│   │  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘   │  │
│   │                                                                         │  │
│   │  ┌─────────────────────────────────────────────────────────────────┐   │  │
│   │  │ Description (Optional)                                           │   │  │
│   │  └─────────────────────────────────────────────────────────────────┘   │  │
│   └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│   ┌─────────────────────────────────────────────────────────────────────────┐  │
│   │  Kit Items Section                                                      │  │
│   │  ┌───────────────────────────────────────────────────────────────────┐  │  │
│   │  │ Item 1: [Part Dropdown] [Quantity Input] [Remove Button]         │  │  │
│   │  │ Item 2: [Part Dropdown] [Quantity Input] [Remove Button]         │  │  │
│   │  │ Item N: [Part Dropdown] [Quantity Input] [Remove Button]         │  │  │
│   │  └───────────────────────────────────────────────────────────────────┘  │  │
│   │                                                                         │  │
│   │  [+ Add Item Button]                                                    │  │
│   └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│   [Create Kit Button]                                                          │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              KITS LIST                                          │
│                                                                                 │
│   ┌─────────────────────────────────────────────────────────────────────────┐  │
│   │  Kit Card                                                               │  │
│   │  ┌─────────────────────────────────────────────────────────────────┐   │  │
│   │  │ Kit Name           [Badge: KIT-001]                             │   │  │
│   │  │ Items: 5    Total Cost: Rs 1,200.00    Price: Rs 1,500.00      │   │  │
│   │  │                                              [Edit] [Delete]    │   │  │
│   │  └─────────────────────────────────────────────────────────────────┘   │  │
│   └─────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Structures

### Kit Interface
```typescript
interface Kit {
  id: string;           // Unique identifier
  name: string;         // Kit display name
  badge?: string;       // Kit number (e.g., "KIT-001")
  itemsCount: number;   // Number of parts in kit
  totalCost: number;    // Sum of all component costs
  price: number;        // Selling price
  items?: KitItem[];    // Array of kit components
}
```

### Kit Item Interface
```typescript
interface KitItem {
  id: string;           // Unique item identifier
  partNo: string;       // Part number reference
  partName: string;     // Part display name
  quantity: number;     // Quantity of this part in kit
  cost: number;         // Cost per unit
}
```

### Kit Form Data Interface
```typescript
interface KitFormData {
  kitNumber: string;    // Kit identifier (e.g., "KIT-001")
  kitName: string;      // Kit display name
  sellingPrice: string; // Selling price as string
  status: string;       // "Active" | "Inactive" | "Draft"
  description: string;  // Optional description
}
```

---

## Kit Creation Workflow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         KIT CREATION WORKFLOW                                   │
└─────────────────────────────────────────────────────────────────────────────────┘

Step 1: User clicks "Create Kit" tab in Parts page
        │
        ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│  Create Kit Form displayed with:                                              │
│  • Kit Number (default: "KIT-001")                                           │
│  • Kit Name (empty, required)                                                 │
│  • Selling Price (default: "0.00")                                           │
│  • Status (default: "Active")                                                 │
│  • Description (empty, optional)                                              │
│  • Kit Items section (empty)                                                  │
└───────────────────────────────────────────────────────────────────────────────┘
        │
        ▼
Step 2: User enters Kit details
        │
        ▼
Step 3: User adds items to kit
        │
        ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│  Add Item Process:                                                            │
│  1. Click "Add Item" button                                                   │
│  2. New item row appears at TOP of list                                       │
│  3. Select part from dropdown                                                 │
│  4. Enter quantity (minimum: 1)                                               │
│  5. Cost auto-populates from part data                                        │
│  6. Repeat for additional items                                               │
└───────────────────────────────────────────────────────────────────────────────┘
        │
        ▼
Step 4: User clicks "Create Kit" button
        │
        ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│  Validation:                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  • Kit Number: Required (cannot be empty)                              │  │
│  │  • Kit Name: Required (cannot be empty)                                │  │
│  │  • If validation fails: Show error toast                               │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│  Save Process (if validation passes):                                         │
│  1. Filter out items without partNo (incomplete items)                        │
│  2. Create Kit object with all data                                           │
│  3. Add to kits array                                                         │
│  4. Reset form to initial state                                               │
│  5. Clear kit items                                                           │
│  6. Show success toast: "Kit created successfully"                            │
└───────────────────────────────────────────────────────────────────────────────┘
```

### Adding Items to Kit

```
User clicks "Add Item" button
        │
        ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│  New Item Created:                                                            │
│  {                                                                            │
│    id: Date.now().toString(),  // Unique ID                                   │
│    partNo: "",                  // Empty, to be selected                      │
│    partName: "",                // Empty, populated on selection              │
│    quantity: 1,                 // Default quantity                           │
│    cost: 0                      // Populated on selection                     │
│  }                                                                            │
└───────────────────────────────────────────────────────────────────────────────┘
        │
        ▼
Item added to BEGINNING of kitItems array (newest first)
        │
        ▼
User selects part from dropdown
        │
        ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│  Part Selection Handler:                                                      │
│  1. Find selected part from availableParts                                    │
│  2. Update item with:                                                         │
│     - partNo: selectedPart.partNo                                            │
│     - partName: selectedPart.name                                            │
│     - cost: selectedPart.cost                                                │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## Kit Editing Workflow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         KIT EDITING WORKFLOW                                    │
└─────────────────────────────────────────────────────────────────────────────────┘

Step 1: User clicks "Edit" button on kit card in Kits List
        │
        ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│  KitsList Component:                                                          │
│  • Sets editingKit state to selected kit                                      │
│  • Renders EditKitForm instead of kit cards                                   │
└───────────────────────────────────────────────────────────────────────────────┘
        │
        ▼
Step 2: Edit Kit Form displayed with pre-populated data
        │
        ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│  Form Pre-population:                                                         │
│  • Kit Number: kit.badge                                                      │
│  • Kit Name: kit.name                                                         │
│  • Selling Price: kit.price.toString()                                        │
│  • Status: "Active" (default)                                                 │
│  • Kit Items: Empty array (items need to be re-added)                         │
└───────────────────────────────────────────────────────────────────────────────┘
        │
        ▼
Step 3: User modifies kit details and/or items
        │
        ▼
Step 4: User clicks "Update Kit" button
        │
        ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│  Update Process:                                                              │
│  1. Validate Kit Number and Kit Name                                          │
│  2. Create updated Kit object:                                                │
│     {                                                                         │
│       ...originalKit,                                                         │
│       name: formData.kitName,                                                 │
│       badge: formData.kitNumber,                                              │
│       price: parseFloat(formData.sellingPrice) || 0,                          │
│       itemsCount: validItems.length,                                          │
│       totalCost: sum(items.cost * items.quantity)                             │
│     }                                                                         │
│  3. Call onSave callback with updated kit                                     │
│  4. Show toast: "Kit updated successfully"                                    │
└───────────────────────────────────────────────────────────────────────────────┘
        │
        ▼
Step 5: KitsList receives updated kit and exits edit mode
```

---

## Kit Deletion Logic

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         KIT DELETION WORKFLOW                                   │
└─────────────────────────────────────────────────────────────────────────────────┘

User clicks "Delete" button (from Kits List or Edit Form)
        │
        ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│  Confirmation Dialog Appears:                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │  "Delete Kit"                                                           │  │
│  │                                                                         │  │
│  │  Are you sure you want to delete "[Kit Name]"?                          │  │
│  │  This action cannot be undone.                                          │  │
│  │                                                                         │  │
│  │                                  [Cancel]  [Delete]                     │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────────┘
        │
        ├──── User clicks "Cancel" ──► Dialog closes, no action
        │
        ▼
User clicks "Delete"
        │
        ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│  Deletion Process:                                                            │
│  1. Call onDelete callback with kit                                           │
│  2. Remove kit from kits array                                                │
│  3. Close confirmation dialog                                                 │
│  4. Reset kitToDelete state                                                   │
│  5. Exit edit mode (if in edit form)                                          │
│  6. Show toast: "[Kit Name] has been deleted successfully"                    │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## Items List Integration

### Tab Navigation

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         ITEMS LIST VIEW TABS                                    │
└─────────────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────────────┐
│  ┌─────────────────────────┐  ┌─────────────────────────┐                    │
│  │      Parts List         │  │       Kits List         │                    │
│  │  (Shows all parts)      │  │   (Shows all kits)      │                    │
│  └─────────────────────────┘  └─────────────────────────┘                    │
│           ▲                            ▲                                      │
│           │                            │                                      │
│     listTab = "parts-list"       listTab = "kits-list"                       │
└───────────────────────────────────────────────────────────────────────────────┘
```

### Parts List and Kits Relationship

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    PARTS-KITS FOREIGN KEY RELATIONSHIP                          │
└─────────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────┐
                    │        PART         │
                    │                     │
                    │  id: "part-001"     │
                    │  partNo: "P-001"    │
                    │  name: "Oil Filter" │
                    └──────────┬──────────┘
                               │
                               │ REFERENCED BY
                               │
           ┌───────────────────┼───────────────────┐
           │                   │                   │
           ▼                   ▼                   ▼
    ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
    │   KIT 1     │     │   KIT 2     │     │   KIT 3     │
    │             │     │             │     │             │
    │ items: [    │     │ items: [    │     │ items: [    │
    │  P-001 (2)  │     │  P-001 (1)  │     │  P-003 (1)  │
    │  P-002 (1)  │     │  P-004 (3)  │     │  P-005 (2)  │
    │ ]           │     │ ]           │     │ ]           │
    └─────────────┘     └─────────────┘     └─────────────┘

CONSTRAINT: A part CANNOT be deleted if it is used in any kit
```

### Part Deletion Constraint Check

```typescript
// When attempting to delete a part from Items List
const handleDeleteConfirm = () => {
  if (itemToDelete) {
    // Check if item is used in any kit (foreign key constraint simulation)
    const itemUsedInKits = kits.filter(kit => 
      kit.items?.some(item => 
        item.id === itemToDelete.id || item.partNo === itemToDelete.partNo
      )
    );
    
    if (itemUsedInKits.length > 0) {
      toast({
        title: "Cannot Delete Item",
        description: `There is entry against "${itemToDelete.partNo}". So it cannot be deleted.`,
        variant: "destructive",
      });
      return; // Prevent deletion
    }
    
    // Proceed with deletion if not used in any kit
    onDelete?.(itemToDelete);
  }
};
```

---

## Button Functions

### Create Kit Form

| Button | Location | Function | Validation |
|--------|----------|----------|------------|
| **Add Item** | Kit Items section | Adds new empty item row at top | None |
| **Remove** | Each item row | Removes item from kit | None |
| **Create Kit** | Form footer | Saves kit to database | Kit Number & Name required |

### Kits List

| Button | Location | Function |
|--------|----------|----------|
| **Edit** | Each kit card | Opens EditKitForm with kit data |
| **Delete** | Each kit card | Opens delete confirmation dialog |
| **Search** | Header area | Filters kits by name or badge |

### Edit Kit Form

| Button | Location | Function | Validation |
|--------|----------|----------|------------|
| **Add Item** | Kit Items section | Adds new empty item row | None |
| **Remove** | Each item row | Removes item from kit | None |
| **Update Kit** | Form footer | Saves changes to kit | Kit Number & Name required |
| **Delete** | Form footer | Opens delete confirmation | None |
| **Cancel** | Form footer | Returns to Kits List without saving | None |

---

## Notification System

### Success Notifications

| Event | Toast Message | Location |
|-------|---------------|----------|
| Kit Created | "Kit created successfully" | Top Right |
| Kit Updated | "Kit updated successfully" | Top Right |
| Kit Deleted | "[Kit Name] has been deleted successfully" | Top Right |

### Error Notifications

| Condition | Toast Message | Variant |
|-----------|---------------|---------|
| Kit Number empty | "Kit Number and Kit Name are required" | destructive |
| Kit Name empty | "Kit Number and Kit Name are required" | destructive |
| Delete part used in kit | "There is entry against [PartNo]. So it cannot be deleted." | destructive |

---

## Current Logic Explanation

### State Management in KitsList

```typescript
// Kits List state management
const [searchQuery, setSearchQuery] = useState("");          // Search filter
const [editingKit, setEditingKit] = useState<Kit | null>(null);  // Currently editing kit
const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);  // Delete dialog visibility
const [kitToDelete, setKitToDelete] = useState<Kit | null>(null);   // Kit pending deletion
```

### State Management in CreateKitForm

```typescript
// Form data state
const [formData, setFormData] = useState<KitFormData>(initialFormData);

// Kit items state (array of parts in the kit)
const [kitItems, setKitItems] = useState<KitItem[]>([]);
```

### Filtering Logic

```typescript
// Filter kits by search query (name or badge)
const filteredKits = useMemo(() => {
  return kits.filter(
    (kit) =>
      kit.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      kit.badge?.toLowerCase().includes(searchQuery.toLowerCase())
  );
}, [kits, searchQuery]);
```

### Total Cost Calculation

```typescript
// Calculate total cost of kit when updating
const totalCost = kitItems.reduce(
  (sum, item) => sum + (item.cost * item.quantity), 
  0
);
```

### Conditional Rendering

```typescript
// KitsList conditionally renders EditKitForm or list
if (editingKit) {
  return (
    <EditKitForm
      kit={editingKit}
      onSave={handleSaveKit}
      onDelete={(kit) => {
        setKitToDelete(kit);
        setDeleteConfirmOpen(true);
      }}
      onCancel={handleCancelEdit}
    />
  );
}

// Otherwise render the kits list...
```

---

## Component Relationships

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         COMPONENT HIERARCHY                                     │
└─────────────────────────────────────────────────────────────────────────────────┘

Parts Page (Parent)
    │
    ├── Left Panel (Tab-based)
    │       ├── Part Entry Tab ──► PartEntryForm
    │       └── Create Kit Tab ──► CreateKitForm
    │                                    │
    │                                    ├── Kit Details Section
    │                                    └── Kit Items Section
    │                                            └── Item Row (multiple)
    │
    └── Right Panel (Tab-based)
            ├── Parts List Tab ──► PartsList
            └── Kits List Tab ──► KitsList
                                      │
                                      ├── Kit Cards (list view)
                                      └── EditKitForm (when editing)
                                              │
                                              ├── Kit Details Section
                                              └── Kit Items Section

ItemsListView (Alternative View)
    │
    ├── Parts List Tab ──► Parts Table
    │                          └── Delete constraint check against kits
    │
    └── Kits List Tab ──► KitsList (embedded)
```

---

## Database Schema (Future Implementation)

```sql
-- Kits Table
CREATE TABLE kits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  badge VARCHAR(50),                    -- Kit number (e.g., KIT-001)
  selling_price DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'Active',
  description TEXT,
  total_cost DECIMAL(10,2) DEFAULT 0,   -- Calculated field
  items_count INTEGER DEFAULT 0,         -- Calculated field
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Kit Items (Junction Table)
CREATE TABLE kit_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kit_id UUID NOT NULL REFERENCES kits(id) ON DELETE CASCADE,
  part_id UUID NOT NULL REFERENCES parts(id) ON DELETE RESTRICT,
  part_no VARCHAR(100) NOT NULL,
  part_name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  cost_per_unit DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT fk_kit FOREIGN KEY (kit_id) REFERENCES kits(id),
  CONSTRAINT fk_part FOREIGN KEY (part_id) REFERENCES parts(id)
);

-- Indexes for performance
CREATE INDEX idx_kit_items_kit ON kit_items(kit_id);
CREATE INDEX idx_kit_items_part ON kit_items(part_id);

-- Trigger to update kit totals when items change
CREATE OR REPLACE FUNCTION update_kit_totals()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE kits SET
    items_count = (SELECT COUNT(*) FROM kit_items WHERE kit_id = COALESCE(NEW.kit_id, OLD.kit_id)),
    total_cost = (SELECT COALESCE(SUM(cost_per_unit * quantity), 0) FROM kit_items WHERE kit_id = COALESCE(NEW.kit_id, OLD.kit_id)),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.kit_id, OLD.kit_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER kit_items_update_trigger
AFTER INSERT OR UPDATE OR DELETE ON kit_items
FOR EACH ROW EXECUTE FUNCTION update_kit_totals();
```

---

## Profit Margin Display (Future Enhancement)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         KIT PROFIT MARGIN CALCULATION                           │
└─────────────────────────────────────────────────────────────────────────────────┘

Example Kit:
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Kit: "Brake Service Kit"                                                       │
│                                                                                 │
│  Items:                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ Part           │ Qty │ Unit Cost │ Line Total                          │   │
│  ├─────────────────────────────────────────────────────────────────────────┤   │
│  │ Brake Pads     │  2  │ Rs 600    │ Rs 1,200                            │   │
│  │ Brake Rotors   │  2  │ Rs 1,500  │ Rs 3,000                            │   │
│  │ Brake Fluid    │  1  │ Rs 250    │ Rs 250                              │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  Total Cost:    Rs 4,450.00                                                    │
│  Selling Price: Rs 5,500.00                                                    │
│  ─────────────────────────                                                     │
│  Profit Margin: Rs 1,050.00 (23.6%)                                            │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

> ⚠️ **REMINDER**: This document describes the current system logic. Do NOT modify the frontend UI or business logic based on this documentation.
