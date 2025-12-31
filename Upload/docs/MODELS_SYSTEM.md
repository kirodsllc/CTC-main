# Models Management System Documentation

> ⚠️ **IMPORTANT NOTICE**: Do NOT change the logic or front-end UI of this system. This document is for reference only.

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Data Structures](#data-structures)
4. [Part Selection Flow](#part-selection-flow)
5. [Models Management](#models-management)
6. [Dropdown Logic](#dropdown-logic)
7. [Button Functions](#button-functions)
8. [Current Logic Explanation](#current-logic-explanation)
9. [Integration with Parts System](#integration-with-parts-system)

---

## System Overview

The Models Management System allows users to:
- Associate vehicle/equipment models with specific parts
- Track quantity of each part used per model
- Manage models through inline editing
- Filter parts by Master Part Number

Models are **linked to individual parts** - each part can have multiple models associated with it, and each model specifies how many of that part is used.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           MODELS MANAGEMENT SYSTEM                              │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                              SELECTION LAYER                                    │
│                                                                                 │
│   ┌─────────────────────────────┐    ┌─────────────────────────────┐           │
│   │   MASTER PART NUMBER        │    │      PART NUMBER            │           │
│   │   (Optional Filter)         │───►│   (Required Selection)      │           │
│   │                             │    │                             │           │
│   │   • Search input            │    │   • Search input            │           │
│   │   • Dropdown list           │    │   • Filtered by master      │           │
│   │   • Filters parts list      │    │   • Shows part details      │           │
│   └─────────────────────────────┘    └──────────────┬──────────────┘           │
│                                                      │                          │
└──────────────────────────────────────────────────────┼──────────────────────────┘
                                                       │
                                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              MODELS TABLE                                       │
│                                                                                 │
│   ┌─────────────────────────────────────────────────────────────────────────┐  │
│   │  Model Name          │    Qty. Used    │         Actions                │  │
│   ├─────────────────────────────────────────────────────────────────────────┤  │
│   │  Toyota Corolla 2020 │        2        │   [Delete]                     │  │
│   │  Honda Civic 2019    │        1        │   [Delete]                     │  │
│   │  Nissan Altima 2021  │        4        │   [Delete]                     │  │
│   └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│   [+ Add Model]    [↻ Refresh]                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Structures

### Part Item Structure
```typescript
interface Item {
  id: string;
  masterPartNo: string;    // Groups related parts
  partNo: string;          // Unique part identifier
  brand: string;           // Part brand
  description: string;     // Part description
  category: string;
  subCategory: string;
  application: string;
  status: string;
  images: string[];
}
```

### Model Structure
```typescript
interface Model {
  id: string;        // Unique model identifier
  name: string;      // Model name (e.g., "Toyota Corolla 2020")
  qtyUsed: number;   // Quantity of part used in this model
  partId: string;    // Reference to parent part
}
```

---

## Part Selection Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         PART SELECTION WORKFLOW                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

Step 1: User opens Models Page
        │
        ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│  Display: Empty state with two search fields                                  │
│  • Master Part Number (Optional)                                              │
│  • Part Number (Required)                                                     │
└───────────────────────────────────────────────────────────────────────────────┘
        │
        ▼
Step 2: User can optionally filter by Master Part Number
        │
        ├──────────────────────────────────────────────────────┐
        │                                                      │
        ▼                                                      ▼
┌─────────────────────────────────┐         ┌─────────────────────────────────────┐
│  WITHOUT Master Part Filter     │         │  WITH Master Part Filter            │
│                                 │         │                                     │
│  All parts visible in           │         │  Only parts with matching           │
│  Part Number dropdown           │         │  masterPartNo are shown             │
└─────────────────────────────────┘         └─────────────────────────────────────┘
        │                                                      │
        └──────────────────────────┬───────────────────────────┘
                                   │
                                   ▼
Step 3: User selects a Part from dropdown
        │
        ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│  System Actions:                                                              │
│  • Store selected part in state                                               │
│  • Display part number in search field                                        │
│  • Close dropdown                                                             │
│  • Load models associated with this part                                      │
└───────────────────────────────────────────────────────────────────────────────┘
        │
        ▼
Step 4: Models Table appears with part's models
        │
        ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│  Models Table for "Selected Part"                                             │
│  ┌────────────────────┬──────────────┬────────────┐                          │
│  │ Model              │ Qty. Used    │ Actions    │                          │
│  ├────────────────────┼──────────────┼────────────┤                          │
│  │ (List of models)   │              │            │                          │
│  └────────────────────┴──────────────┴────────────┘                          │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## Models Management

### Adding a New Model

```
User clicks "Add Model" button
        │
        ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│  New row appears at TOP of table with inline inputs:                          │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │  [Input: Model Name]  │  [Input: Qty]  │  [Save] [Cancel]              │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────────┘
        │
        ├─── User fills name and quantity
        │
        ▼
┌─────────────────────────────────────────┐
│  User clicks "Save"                     │
└─────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│  Validation:                                                                  │
│  • Model name must not be empty                                               │
│  • Qty defaults to 1 if empty or invalid                                      │
└───────────────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│  System Actions:                                                              │
│  • Generate unique ID for model                                               │
│  • Link model to selected part (partId)                                       │
│  • Add to models list                                                         │
│  • Show toast: "Model added successfully"                                     │
│  • Clear add form, close inline input                                         │
└───────────────────────────────────────────────────────────────────────────────┘
```

### Editing an Existing Model

```
User clicks on model name (inline edit trigger)
        │
        ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│  Row transforms to edit mode:                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │  [Input: Model Name]  │  [Input: Qty]  │  [Save] [Cancel]              │  │
│  │  (Pre-filled with     │  (Pre-filled)  │                               │  │
│  │   current values)     │                │                               │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────────┘
        │
        ▼
User modifies values and clicks "Save"
        │
        ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│  System Actions:                                                              │
│  • Validate model name not empty                                              │
│  • Update model in state                                                      │
│  • Show toast: "Model updated successfully"                                   │
│  • Exit edit mode                                                             │
└───────────────────────────────────────────────────────────────────────────────┘
```

### Deleting a Model

```
User clicks delete icon (trash) on model row
        │
        ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│  AlertDialog appears:                                                         │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │  "Delete Model"                                                         │  │
│  │                                                                         │  │
│  │  Are you sure you want to delete "[Model Name]"?                        │  │
│  │  This action cannot be undone.                                          │  │
│  │                                                                         │  │
│  │                              [Cancel]  [Delete]                         │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────────┘
        │
        ▼
User confirms deletion
        │
        ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│  System Actions:                                                              │
│  • Remove model from state                                                    │
│  • Close dialog                                                               │
│  • Show toast: "Model deleted successfully"                                   │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## Dropdown Logic

### Master Part Number Dropdown

```typescript
// Get unique master part numbers from items
const masterPartNumbers = useMemo(() => {
  const uniqueMasters = [...new Set(items.map((item) => item.masterPartNo))].filter(Boolean);
  
  // Filter by search input
  if (masterPartSearch) {
    return uniqueMasters.filter((master) =>
      master.toLowerCase().includes(masterPartSearch.toLowerCase())
    );
  }
  return uniqueMasters;
}, [items, masterPartSearch]);
```

**Behavior:**
- Shows all unique master part numbers from items
- Filters as user types in search
- Clicking an option sets it as filter and populates search field
- When selected, only parts with matching masterPartNo appear in Part dropdown

### Part Number Dropdown

```typescript
// Filter parts based on search and selected master part
const filteredParts = useMemo(() => {
  let filtered = items;
  
  // First filter by master part if selected
  if (selectedMasterPart) {
    filtered = filtered.filter((item) => item.masterPartNo === selectedMasterPart);
  }
  
  // Then filter by search text
  if (partNoSearch) {
    filtered = filtered.filter(
      (item) =>
        item.partNo.toLowerCase().includes(partNoSearch.toLowerCase()) ||
        item.description.toLowerCase().includes(partNoSearch.toLowerCase()) ||
        item.brand.toLowerCase().includes(partNoSearch.toLowerCase())
    );
  }
  return filtered;
}, [items, selectedMasterPart, partNoSearch]);
```

**Behavior:**
- Shows all parts (or filtered by master part)
- User can search by: Part Number, Description, or Brand
- Each dropdown item shows: Part No, Description, Brand, and Master Part
- Clicking selects the part and loads its models

### Models Filtering

```typescript
// Get models for selected part only
const partModels = useMemo(() => {
  if (!selectedPart) return [];
  return models.filter((model) => model.partId === selectedPart.id);
}, [models, selectedPart]);
```

**Behavior:**
- Only shows models linked to the currently selected part
- Empty until a part is selected
- Updates immediately when part selection changes

---

## Button Functions

### Header Actions

| Button | Function | State Change |
|--------|----------|--------------|
| **Add Model** | Opens inline add row | `isAddingNew = true` |
| **Refresh** | Cancels any unsaved edits | Clears editing/adding states |

### Inline Add Row

| Button | Function | Validation |
|--------|----------|------------|
| **Save** | Saves new model | Name required |
| **Cancel** | Closes add row without saving | None |

### Inline Edit Row

| Button | Function | Validation |
|--------|----------|------------|
| **Save** | Updates existing model | Name required |
| **Cancel** | Reverts to view mode | None |

### Model Row

| Element | Function |
|---------|----------|
| **Model Name (text)** | Click to edit inline |
| **Delete Icon** | Opens delete confirmation dialog |

### Delete Dialog

| Button | Function |
|--------|----------|
| **Cancel** | Closes dialog, no action |
| **Delete** | Confirms deletion, removes model |

---

## Current Logic Explanation

### State Management

```typescript
// Part selection states
const [masterPartSearch, setMasterPartSearch] = useState("");
const [selectedMasterPart, setSelectedMasterPart] = useState<string | null>(null);
const [partNoSearch, setPartNoSearch] = useState("");
const [selectedPart, setSelectedPart] = useState<Item | null>(null);

// Dropdown visibility
const [showMasterDropdown, setShowMasterDropdown] = useState(false);
const [showPartDropdown, setShowPartDropdown] = useState(false);

// Models data
const [models, setModels] = useState<Model[]>([]);

// Inline editing
const [editingModelId, setEditingModelId] = useState<string | null>(null);
const [editName, setEditName] = useState("");
const [editQty, setEditQty] = useState("");

// Inline adding
const [isAddingNew, setIsAddingNew] = useState(false);
const [newModelName, setNewModelName] = useState("");
const [newModelQty, setNewModelQty] = useState("");

// Delete confirmation
const [deleteModelOpen, setDeleteModelOpen] = useState(false);
const [modelToDelete, setModelToDelete] = useState<Model | null>(null);
```

### Click Outside Handler

```typescript
// Close dropdowns when clicking outside
useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    if (masterDropdownRef.current && 
        !masterDropdownRef.current.contains(event.target as Node)) {
      setShowMasterDropdown(false);
    }
    if (partDropdownRef.current && 
        !partDropdownRef.current.contains(event.target as Node)) {
      setShowPartDropdown(false);
    }
  };

  document.addEventListener("mousedown", handleClickOutside);
  return () => document.removeEventListener("mousedown", handleClickOutside);
}, []);
```

### Selection Handlers

```typescript
// Master Part Selection
const handleSelectMasterPart = (master: string) => {
  setSelectedMasterPart(master);
  setMasterPartSearch(master);        // Populate search field
  setShowMasterDropdown(false);       // Close dropdown
  setSelectedPart(null);              // Reset part selection
  setPartNoSearch("");                // Clear part search
};

// Part Selection
const handleSelectPart = (part: Item) => {
  setSelectedPart(part);
  setPartNoSearch(part.partNo);       // Populate search field
  setShowPartDropdown(false);         // Close dropdown
  // Models table will now show models for this part
};
```

---

## Integration with Parts System

### How Models Link to Parts

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                       PART-MODEL RELATIONSHIP                                   │
└─────────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────┐
                    │        PART         │
                    │                     │
                    │  id: "part-001"     │
                    │  partNo: "ABC-123"  │
                    │  brand: "BOSCH"     │
                    │  description: "..." │
                    └──────────┬──────────┘
                               │
                               │ ONE-TO-MANY
                               │
           ┌───────────────────┼───────────────────┐
           │                   │                   │
           ▼                   ▼                   ▼
    ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
    │   MODEL 1   │     │   MODEL 2   │     │   MODEL 3   │
    │             │     │             │     │             │
    │ name: "..." │     │ name: "..." │     │ name: "..." │
    │ qtyUsed: 2  │     │ qtyUsed: 1  │     │ qtyUsed: 4  │
    │ partId:     │     │ partId:     │     │ partId:     │
    │ "part-001"  │     │ "part-001"  │     │ "part-001"  │
    └─────────────┘     └─────────────┘     └─────────────┘
```

### Data Flow Summary

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         COMPLETE DATA FLOW                                      │
└─────────────────────────────────────────────────────────────────────────────────┘

Part Entry Form                     Models Page
      │                                  │
      │ Creates/Updates Part             │ Receives parts via props
      │                                  │
      ▼                                  ▼
┌──────────────┐               ┌──────────────────────┐
│ Part Saved   │───────────────│ items[] passed       │
│ to Database  │               │ to ModelsPage        │
└──────────────┘               └──────────┬───────────┘
                                          │
                                          ▼
                               ┌──────────────────────┐
                               │ User selects a Part  │
                               └──────────┬───────────┘
                                          │
                                          ▼
                               ┌──────────────────────┐
                               │ Models for that Part │
                               │ displayed in table   │
                               └──────────┬───────────┘
                                          │
                                          ▼
                               ┌──────────────────────┐
                               │ User can Add/Edit/   │
                               │ Delete models        │
                               └──────────────────────┘
```

### When Part is Saved/Updated

1. Part is created/updated in Part Entry Form
2. Part appears in the items list
3. In Models Page, user can find this part
4. User selects the part
5. Can add/modify models for this part
6. Models are stored with reference to part ID

---

## Database Schema (Future Implementation)

```sql
-- Models Table
CREATE TABLE models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  qty_used INTEGER DEFAULT 1,
  part_id UUID NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for faster part-based lookups
CREATE INDEX idx_models_part ON models(part_id);

-- Ensure no duplicate model names per part
CREATE UNIQUE INDEX idx_models_unique_name_per_part ON models(part_id, name);
```

---

## Notification Messages

| Action | Toast Message |
|--------|---------------|
| Model Added | "Model added successfully" |
| Model Updated | "Model updated successfully" |
| Model Deleted | "Model deleted successfully" |
| Refresh Clicked | "Data refreshed" |

---

> ⚠️ **REMINDER**: This document describes the current system logic. Do NOT modify the frontend UI or business logic based on this documentation.
