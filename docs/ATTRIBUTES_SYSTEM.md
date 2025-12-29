# Attributes Management System Documentation

> ⚠️ **IMPORTANT NOTICE**: Do NOT change the logic or front-end UI of this system. This document is for reference only.

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Data Flow from Part Entry](#data-flow-from-part-entry)
4. [Categories Management](#categories-management)
5. [Subcategories Management](#subcategories-management)
6. [Brands Management](#brands-management)
7. [Notification System](#notification-system)
8. [Hierarchical Relationships](#hierarchical-relationships)
9. [Button Functions](#button-functions)
10. [Current Logic Explanation](#current-logic-explanation)

---

## System Overview

The Attributes System manages three core entities that organize inventory items:
- **Categories**: Main classification groups for parts
- **Subcategories**: Secondary classification linked to parent categories
- **Brands**: Manufacturer/brand identification for parts

All attributes can be created from two places:
1. **Part Entry Form**: When saving a new part, new categories, subcategories, and brands are automatically added
2. **Attributes Page**: Direct management interface for CRUD operations

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           ATTRIBUTES MANAGEMENT SYSTEM                          │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
            ┌───────────────────────────┼───────────────────────────┐
            │                           │                           │
            ▼                           ▼                           ▼
    ┌───────────────┐          ┌───────────────┐          ┌───────────────┐
    │   CATEGORIES  │          │ SUBCATEGORIES │          │    BRANDS     │
    │               │          │               │          │               │
    │  • id         │          │  • id         │          │  • id         │
    │  • name       │◄─────────│  • categoryId │          │  • name       │
    │  • status     │ Parent   │  • name       │          │  • status     │
    │  • subCount   │ Link     │  • status     │          │  • createdAt  │
    └───────────────┘          └───────────────┘          └───────────────┘
            │                           │                           │
            └───────────────────────────┼───────────────────────────┘
                                        │
                                        ▼
                            ┌───────────────────────┐
                            │     PART ENTRY FORM   │
                            │                       │
                            │  Auto-creates new:    │
                            │  • Category           │
                            │  • Subcategory        │
                            │  • Brand              │
                            └───────────────────────┘
```

---

## Data Flow from Part Entry

When a user saves a part from the Part Entry Form, the following data flow occurs:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        PART ENTRY SAVE DATA FLOW                                │
└─────────────────────────────────────────────────────────────────────────────────┘

User Enters Part Data
        │
        ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  Part Entry Form Fields                                                      │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│  │ Category    │ │ Subcategory │ │ Application │ │   Brand     │            │
│  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └──────┬──────┘            │
└─────────┼───────────────┼───────────────┼───────────────┼────────────────────┘
          │               │               │               │
          ▼               ▼               ▼               ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         VALIDATION & SAVE PROCESS                               │
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │ Step 1: Check if Category exists in database                             │  │
│  │         IF NOT EXISTS → Create new Category → Show Notification          │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                        │                                        │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │ Step 2: Check if Subcategory exists under that Category                  │  │
│  │         IF NOT EXISTS → Create new Subcategory → Show Notification       │  │
│  │         Link to parent Category                                          │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                        │                                        │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │ Step 3: Check if Brand exists in database                                │  │
│  │         IF NOT EXISTS → Create new Brand → Show Notification             │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                        │                                        │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │ Step 4: Save Part with all references                                    │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Categories Management

### Data Structure
```typescript
interface Category {
  id: string;           // Unique identifier
  name: string;         // Category name (e.g., "Engine Parts")
  status: "Active" | "Inactive";  // Category status
  subcategoryCount: number;       // Count of linked subcategories
}
```

### Category Operations

| Operation | Description | Validation Rules |
|-----------|-------------|------------------|
| **Add** | Create new category | Name is required |
| **Edit** | Update category name/status | Name is required |
| **Delete** | Remove category | Cannot delete if has subcategories |
| **Toggle Status** | Switch Active/Inactive | Cannot deactivate if has active subcategories |

### Category Creation Logic
```
User types Category name in Part Entry Form
        │
        ▼
┌───────────────────────────────────────┐
│  Check: Does category already exist?  │
└───────────────────────────────────────┘
        │
   ┌────┴────┐
   │         │
  YES        NO
   │         │
   ▼         ▼
┌─────┐  ┌─────────────────────────────────┐
│Use  │  │ Create New Category:            │
│Exist│  │ • Generate unique ID            │
│ing  │  │ • Set name from input           │
│     │  │ • Set status = "Active"         │
│     │  │ • Set subcategoryCount = 0      │
│     │  │ • Show notification:            │
│     │  │   "New category added"          │
└─────┘  └─────────────────────────────────┘
```

---

## Subcategories Management

### Data Structure
```typescript
interface Subcategory {
  id: string;           // Unique identifier
  name: string;         // Subcategory name
  categoryId: string;   // Parent category reference
  categoryName: string; // Parent category name (for display)
  status: "Active" | "Inactive";
}
```

### Subcategory Operations

| Operation | Description | Validation Rules |
|-----------|-------------|------------------|
| **Add** | Create new subcategory | Name and parent category required |
| **Edit** | Update subcategory details | Name and parent category required |
| **Delete** | Remove subcategory | Cannot delete if has associated parts |
| **Toggle Status** | Switch Active/Inactive | Cannot deactivate if has parts using it |

### Subcategory-Category Relationship
```
                    ┌─────────────────────┐
                    │      CATEGORY       │
                    │  (e.g., "Filters")  │
                    └─────────┬───────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
       ┌────────────┐  ┌────────────┐  ┌────────────┐
       │  SUBCATEGORY │  │  SUBCATEGORY │  │  SUBCATEGORY │
       │ "Oil Filter" │  │ "Air Filter" │  │ "Fuel Filter"│
       └────────────┘  └────────────┘  └────────────┘

ONE CATEGORY → MULTIPLE SUBCATEGORIES
```

### Subcategory Creation from Part Entry
```
User enters Subcategory in Part Entry Form
        │
        ▼
┌───────────────────────────────────────────────────────┐
│  Prerequisite: Category must be selected/entered      │
│  (Subcategory field is disabled until category set)   │
└───────────────────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────────────┐
│  Check: Does subcategory exist under this category?   │
└───────────────────────────────────────────────────────┘
        │
   ┌────┴────┐
   │         │
  YES        NO
   │         │
   ▼         ▼
┌─────┐  ┌─────────────────────────────────────────────┐
│Use  │  │ Create New Subcategory:                     │
│Exist│  │ • Generate unique ID                        │
│ing  │  │ • Set name from input                       │
│     │  │ • Link to parent category (categoryId)      │
│     │  │ • Store parent category name                │
│     │  │ • Set status = "Active"                     │
│     │  │ • Increment parent category subcategoryCount│
│     │  │ • Show notification:                        │
│     │  │   "New subcategory added against [Category]"│
└─────┘  └─────────────────────────────────────────────┘
```

---

## Brands Management

### Data Structure
```typescript
interface Brand {
  id: string;           // Unique identifier
  name: string;         // Brand name (e.g., "BOSCH", "DENSO")
  status: "Active" | "Inactive";
  createdAt: string;    // Creation date
}
```

### Brand Operations

| Operation | Description | Validation Rules |
|-----------|-------------|------------------|
| **Add** | Create new brand | Name is required |
| **Edit** | Update brand name/status | Name is required |
| **Delete** | Remove brand | Allowed (no dependency check currently) |
| **Toggle Status** | Switch Active/Inactive | Allowed anytime |

### Brand Creation from Part Entry
```
User enters Brand in Part Entry Form
        │
        ▼
┌───────────────────────────────────────┐
│  Check: Does brand already exist?     │
└───────────────────────────────────────┘
        │
   ┌────┴────┐
   │         │
  YES        NO
   │         │
   ▼         ▼
┌─────┐  ┌─────────────────────────────────┐
│Use  │  │ Create New Brand:               │
│Exist│  │ • Generate unique ID            │
│ing  │  │ • Set name from input           │
│     │  │ • Set status = "Active"         │
│     │  │ • Set createdAt = current date  │
│     │  │ • Show notification:            │
│     │  │   "New brand added"             │
└─────┘  └─────────────────────────────────┘
```

---

## Notification System

Notifications appear in the **top-right corner** of the screen when attributes are created or modified.

### Notification Triggers

| Event | Notification Message | Location |
|-------|---------------------|----------|
| New Category Added | "New category added" | Top Right Toast |
| Category Updated | "Category updated successfully" | Top Right Toast |
| Category Deleted | "Category deleted successfully" | Top Right Toast |
| Category Status Changed | "Category [Name] is now [Status]" | Top Right Toast |
| New Subcategory Added | "New subcategory added against [Category]" | Top Right Toast |
| Subcategory Updated | "Subcategory updated successfully" | Top Right Toast |
| Subcategory Deleted | "Subcategory deleted successfully" | Top Right Toast |
| New Brand Added | "New brand added" | Top Right Toast |
| Brand Updated | "Brand updated successfully" | Top Right Toast |
| Brand Deleted | "Brand deleted successfully" | Top Right Toast |

### Error Notifications

| Error Condition | Message |
|-----------------|---------|
| Category name empty | "Category name is required" |
| Subcategory name/category empty | "Subcategory name and category are required" |
| Delete category with subcategories | "This category has subcategories. Please delete all subcategories first" |
| Deactivate category with active subs | "This category has [N] active subcategories. Please deactivate all subcategories first" |
| Delete subcategory with parts | "Subcategory has parts associated with it. Please remove or reassign the parts first" |

---

## Hierarchical Relationships

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        COMPLETE HIERARCHY STRUCTURE                             │
└─────────────────────────────────────────────────────────────────────────────────┘

LEVEL 1: CATEGORY (Main Classification)
         │
         ├── Engine Parts
         │       │
         │       ├── [LEVEL 2: SUBCATEGORY]
         │       │       ├── Pistons
         │       │       ├── Gaskets
         │       │       └── Valves
         │       │
         │       └── [Parts using these subcategories]
         │
         ├── Filters
         │       │
         │       ├── [LEVEL 2: SUBCATEGORY]
         │       │       ├── Oil Filter
         │       │       ├── Air Filter
         │       │       └── Fuel Filter
         │       │
         │       └── [Parts using these subcategories]
         │
         └── Electrical
                 │
                 ├── [LEVEL 2: SUBCATEGORY]
                 │       ├── Alternators
                 │       ├── Starters
                 │       └── Sensors
                 │
                 └── [Parts using these subcategories]

INDEPENDENT: BRANDS
         │
         ├── BOSCH
         ├── DENSO
         ├── NGK
         └── MANN
         
(Brands are NOT hierarchically linked to Categories/Subcategories)
```

---

## Button Functions

### Categories Section

| Button | Location | Function |
|--------|----------|----------|
| **Add New** | Header area | Opens dialog to add new category |
| **Edit** | Each category row | Opens dialog to edit category name/status |
| **Delete** | Each category row | Opens confirmation dialog; deletes if no subcategories |
| **Status Dropdown** | Each category row | Toggles Active/Inactive status |
| **Filter Dropdown** | Filter area | Filters list by selected category |
| **Search Input** | Filter area | Searches categories by name |

### Subcategories Section

| Button | Location | Function |
|--------|----------|----------|
| **Add New** | Header area | Opens dialog to add new subcategory (requires category selection) |
| **Edit** | Each subcategory row | Opens dialog to edit subcategory details |
| **Delete** | Each subcategory row | Opens confirmation dialog; deletes if no parts assigned |
| **Status Dropdown** | Each subcategory row | Toggles Active/Inactive status |
| **Category Filter** | Filter area | Filters by parent category |
| **Search Input** | Filter area | Searches subcategories by name |

### Brands Section

| Button | Location | Function |
|--------|----------|----------|
| **Add New** | Header area | Opens dialog to add new brand |
| **Edit** | Each brand row | Opens dialog to edit brand name/status |
| **Delete** | Each brand row | Opens confirmation dialog and deletes |
| **Status Dropdown** | Each brand row | Toggles Active/Inactive status |
| **Filter Dropdown** | Filter area | Filters list by selected brand |
| **Search Input** | Filter area | Searches brands by name |

---

## Current Logic Explanation

### State Management
The Attributes Page uses React's `useState` for local state management:

```typescript
// Main data states
const [categories, setCategories] = useState<Category[]>([]);
const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
const [brands, setBrands] = useState<Brand[]>([]);

// Filter/search states
const [categorySearch, setCategorySearch] = useState("");
const [categoryFilter, setCategoryFilter] = useState("all");
// ... similar for subcategories and brands

// Dialog control states
const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
// ... etc
```

### Filtering Logic (useMemo)
```typescript
const filteredCategories = useMemo(() => {
  return categories.filter((cat) => {
    const matchesSearch = cat.name.toLowerCase().includes(categorySearch.toLowerCase());
    const matchesFilter = categoryFilter === "all" || cat.id === categoryFilter;
    return matchesSearch && matchesFilter;
  });
}, [categories, categorySearch, categoryFilter]);
```

### Cascade Validation Rules

1. **Category Deletion**:
   - Check if any subcategory has `categoryId` matching the category
   - If yes, show error and prevent deletion

2. **Category Deactivation**:
   - Check if any subcategory with matching `categoryId` has `status === "Active"`
   - If yes, show error and prevent status change

3. **Subcategory Deletion**:
   - Check if any part has `subcategoryId` matching the subcategory
   - If yes, show error and prevent deletion

4. **Subcategory Deactivation**:
   - Check if any part is using this subcategory
   - If yes, show error and prevent status change

---

## Database Schema (Future Implementation)

```sql
-- Categories Table
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL UNIQUE,
  status VARCHAR(20) DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Subcategories Table
CREATE TABLE subcategories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  category_id UUID REFERENCES categories(id),
  status VARCHAR(20) DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(name, category_id)
);

-- Brands Table
CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL UNIQUE,
  status VARCHAR(20) DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_subcategories_category ON subcategories(category_id);
```

---

> ⚠️ **REMINDER**: This document describes the current system logic. Do NOT modify the frontend UI or business logic based on this documentation.
