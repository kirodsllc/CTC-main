# Settings & System Administration Documentation

## Overview

The Settings module provides comprehensive system administration capabilities including user management, role-based access control, approval workflows, activity logging, backup/restore, company configuration, and third-party integrations.

## File Structure

```
src/
├── pages/
│   └── Settings.tsx                            # Main settings page with tab navigation
└── components/
    └── settings/
        ├── UsersManagementTab.tsx              # User account management
        ├── RolesPermissionsTab.tsx             # Role and permission management
        ├── ApprovalFlowsTab.tsx                # Workflow approval configuration
        ├── ActivityLogsTab.tsx                 # System activity audit logs
        ├── BackupRestoreTab.tsx                # Database backup and restore
        ├── CompanyProfileTab.tsx               # Company info and system settings
        ├── StoreManagementTab.tsx              # Store, rack, and shelf management
        └── WhatsAppSettingsTab.tsx             # WhatsApp API integration
```

## Module Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                     Settings Page (Settings.tsx)                             │
├──────────┬──────────┬──────────┬──────────┬──────────┬──────────┬───────────┤
│  Users   │  Roles & │ Approval │ Activity │ Backup & │ Company  │ WhatsApp  │
│ Manage   │  Perms   │  Flows   │   Logs   │ Restore  │ Profile  │           │
└──────────┴──────────┴──────────┴──────────┴──────────┴──────────┴───────────┘
```

---

## 1. Settings Page (`src/pages/Settings.tsx`)

### Purpose
Central administration hub providing access to all system configuration options.

### State Management
```typescript
type SettingsTab = "users" | "roles" | "approvals" | "logs" | "backup" | "company" | "whatsapp";
const [activeTab, setActiveTab] = useState<SettingsTab>("users");
```

### Tab Configuration

| Tab ID | Label | Icon | Component |
|--------|-------|------|-----------|
| `users` | Users Management | `Users` | `UsersManagementTab` |
| `roles` | Roles & Permissions | `Shield` | `RolesPermissionsTab` |
| `approvals` | Approval Flows | `GitBranch` | `ApprovalFlowsTab` |
| `logs` | Activity Logs | `FileText` | `ActivityLogsTab` |
| `backup` | Backup & Restore | `Database` | `BackupRestoreTab` |
| `company` | Company Profile | `Building2` | `CompanyProfileTab` |
| `whatsapp` | WhatsApp | `MessageCircle` | `WhatsAppSettingsTab` |

---

## 2. Users Management (`src/components/settings/UsersManagementTab.tsx`)

### Purpose
Manage system users with CRUD operations, role assignment, and status tracking.

### Data Structure

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  role: string;              // Admin, Manager, Staff, Accountant, Viewer
  status: "active" | "inactive";
  lastLogin: string;
  createdAt: string;
}
```

### State Variables

| State | Type | Description |
|-------|------|-------------|
| `users` | `User[]` | List of all users |
| `searchQuery` | `string` | Search filter |
| `roleFilter` | `string` | Filter by role |
| `statusFilter` | `string` | Filter by status |
| `isDialogOpen` | `boolean` | Add/Edit dialog visibility |
| `editingUser` | `User | null` | User being edited |
| `formData` | `object` | Form data for create/edit |

### Statistics Cards

| Stat | Description | Color |
|------|-------------|-------|
| Total Users | Count of all users | Blue gradient |
| Active Users | Users with status = active | Green gradient |
| Admins | Users with role = Admin | Purple gradient |
| Inactive | Users with status = inactive | Red gradient |

### Button Functions

| Button | Function | Description |
|--------|----------|-------------|
| **Add User** | `setIsDialogOpen(true)` | Opens create user dialog |
| **Export CSV** | `handleExportCSV()` | Exports users to CSV file |
| **Edit** | `handleEdit(user)` | Opens edit dialog with user data |
| **Delete** | `handleDelete(id)` | Removes user from system |

### Available Roles

| Role | Badge Color | Description |
|------|-------------|-------------|
| Admin | Violet | Full system access |
| Manager | Blue | Department management |
| Staff | Emerald | Standard operations |
| Accountant | Orange | Financial operations |
| Viewer | Gray | Read-only access |

### Table Columns

| Column | Field | Description |
|--------|-------|-------------|
| USER | `name`, Avatar | User name with avatar initials |
| EMAIL | `email` | Email address |
| ROLE | `role` | Role badge with color |
| STATUS | `status` | Active/Inactive indicator |
| LAST LOGIN | `lastLogin` | Last login timestamp |
| ACTIONS | - | Edit, Delete buttons |

### Form Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Name | Input | Yes | User's full name |
| Email | Input | Yes | Email address |
| Role | Select | Yes | Role assignment |
| Status | Select | Yes | Active/Inactive |

---

## 3. Roles & Permissions (`src/components/settings/RolesPermissionsTab.tsx`)

### Purpose
Define roles and assign granular permissions for access control.

### Data Structure

```typescript
interface Role {
  id: string;
  name: string;
  type: string;           // "Custom" for user-created roles
  description: string;
  usersCount: number;
  permissions: string[];
}
```

### Available Permissions

```typescript
const allPermissions = [
  // User permissions
  "users.view", "users.create", "users.edit", "users.delete",
  
  // Inventory permissions
  "inventory.view", "inventory.create", "inventory.edit", "inventory.delete",
  
  // Sales permissions
  "sales.view", "sales.create", "sales.edit", "sales.delete",
  
  // Reports permissions
  "reports.view", "reports.export",
  
  // Settings permissions
  "settings.view", "settings.edit",
];
```

### State Variables

| State | Type | Description |
|-------|------|-------------|
| `roles` | `Role[]` | List of all roles |
| `isDialogOpen` | `boolean` | Create/Edit dialog visibility |
| `editingRole` | `Role | null` | Role being edited |
| `formData` | `object` | Form data with name, description, permissions |

### Button Functions

| Button | Function | Description |
|--------|----------|-------------|
| **Create Role** | `setIsDialogOpen(true)` | Opens create role dialog |
| **Export CSV** | `handleExportCSV()` | Exports roles to CSV |
| **Edit** | `handleEdit(role)` | Opens edit dialog |
| **Delete** | `handleDelete(id)` | Removes role |

### Role Card Display

Each role is displayed as a card showing:
- Role icon with color badge
- Role name and type
- Description
- User count (with `Users` icon)
- Permission count (with `Key` icon)

### Form Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Role Name | Input | Yes | Name of the role |
| Description | Textarea | No | Role description |
| Permissions | Checkbox Grid | No | Permission assignments |

---

## 4. Approval Flows (`src/components/settings/ApprovalFlowsTab.tsx`)

### Purpose
Configure multi-step approval workflows for business processes.

### Data Structures

```typescript
interface ApprovalStep {
  role: string;          // manager, accountant, admin
  action: string;        // review, approve
}

interface ApprovalFlow {
  id: string;
  name: string;
  status: "active" | "inactive";
  description: string;
  steps: ApprovalStep[];
  module: string;        // Purchase Orders, Sales, Inventory, etc.
  trigger: string;       // On Create, On Update, On Delete
  condition: string;     // e.g., "amount > 50000"
}

interface PendingApproval {
  id: string;
  type: string;
  reference: string;
  requestedBy: string;
  date: string;
  amount?: number;
}
```

### Sub-Tabs

| Tab | Description |
|-----|-------------|
| **Approval Flows** | List and manage approval workflows |
| **Pending Approvals** | View items awaiting approval |

### Available Modules

- Purchase Orders
- Sales
- Inventory
- Customers
- Expenses

### Trigger Types

- On Create
- On Update
- On Delete

### Approval Step Roles

| Role | Description |
|------|-------------|
| Manager | Department manager |
| Accountant | Financial reviewer |
| Admin | System administrator |

### Step Actions

| Action | Description |
|--------|-------------|
| Review | Review and pass to next step |
| Approve | Final approval action |

### Button Functions

| Button | Function | Description |
|--------|----------|-------------|
| **Create Flow** | Opens dialog | Create new approval workflow |
| **Add Step** | `addStep()` | Add approval step to flow |
| **Remove** | `removeStep(index)` | Remove step from flow |
| **Review** | - | Review pending approval |
| **Approve** | - | Approve pending item |

---

## 5. Activity Logs (`src/components/settings/ActivityLogsTab.tsx`)

### Purpose
Audit trail of all system activities for security and compliance.

### Data Structure

```typescript
interface ActivityLog {
  id: string;
  timestamp: string;
  user: string;
  userRole: string;
  action: string;
  actionType: "login" | "create" | "update" | "delete" | "export" | "approve" | "login_failed";
  module: string;
  description: string;
  ipAddress: string;
  status: "success" | "warning" | "error";
  details?: Record<string, string>;
}
```

### Statistics Cards

| Stat | Description | Color |
|------|-------------|-------|
| Total Activities | All logged activities | Blue gradient |
| Successful | Success status count | Green gradient |
| Warnings | Warning status count | Amber gradient |
| Errors | Error status count | Red gradient |

### Action Types with Icons

| Action Type | Icon | Color |
|-------------|------|-------|
| login | `LogIn` | Blue |
| create | `Plus` | Emerald |
| update | `Edit` | Amber |
| delete | `Trash2` | Red |
| export | `Download` | Purple |
| approve | `CheckCircle` | Emerald |
| login_failed | `XCircle` | Red |

### Filter Options

| Filter | Options |
|--------|---------|
| **Search** | User name, description |
| **Module** | All, Auth, Sales, Inventory, Users, Reports, Purchase |
| **Action** | All, Login, Create, Update, Delete, Export, Approve |

### Table Columns

| Column | Field | Description |
|--------|-------|-------------|
| TIMESTAMP | `timestamp` | Activity timestamp with clock icon |
| USER | `user`, `userRole` | User avatar and role |
| ACTION | `actionType` | Action badge with icon |
| MODULE | `module` | Module badge |
| DESCRIPTION | `description` | Activity description |
| IP ADDRESS | `ipAddress` | Client IP |
| STATUS | `status` | Success/Warning/Error badge |
| DETAILS | - | View details button |

### Button Functions

| Button | Function | Description |
|--------|----------|-------------|
| **Export CSV** | `handleExport()` | Export logs to CSV file |
| **View** | `setSelectedLog(log)` | View activity details |

---

## 6. Backup & Restore (`src/components/settings/BackupRestoreTab.tsx`)

### Purpose
Database backup management with scheduling and restore capabilities.

### Data Structures

```typescript
interface Backup {
  id: string;
  name: string;
  tables: string;
  type: "full" | "incremental";
  size: string;
  status: "completed" | "failed" | "in_progress";
  createdAt: string;
  createdBy: string;
}

interface Schedule {
  id: string;
  name: string;
  frequency: string;
  tables: string[];
  time: string;
  status: "active" | "inactive";
  lastRun: string;
  nextRun: string;
}
```

### Available Tables for Backup

```typescript
const allTables = [
  "parts", "inventory", "sales", "customers", 
  "suppliers", "expenses", "users", "settings"
];
```

### Statistics Cards

| Stat | Description | Color |
|------|-------------|-------|
| Total Backups | Count of all backups | Blue gradient |
| Successful | Completed backups | Green gradient |
| Storage Used | Total storage consumed | Purple gradient |
| Active Schedules | Running backup schedules | Orange gradient |

### Sub-Tabs

| Tab | Description |
|-----|-------------|
| **Backups** | List and create backups |
| **Schedules** | Manage backup schedules |
| **Restore** | Restore from backup |

### Backup Types

| Type | Description | Badge Color |
|------|-------------|-------------|
| Full | Complete database backup | Blue |
| Incremental | Selected tables only | Purple |

### Backup Status

| Status | Description | Badge Color |
|--------|-------------|-------------|
| completed | Backup finished successfully | Emerald |
| failed | Backup failed | Red |
| in_progress | Backup running | Amber |

### Button Functions

| Button | Function | Description |
|--------|----------|-------------|
| **Create Backup** | `handleCreateBackup()` | Start new backup |
| **Export CSV** | `handleExportCSV()` | Export backup list |
| **Restore** | `handleRestore(backup)` | Restore from backup |
| **Delete** | `handleDelete(id)` | Remove backup |
| **Download** | - | Download backup file |

---

## 7. Company Profile (`src/components/settings/CompanyProfileTab.tsx`)

### Purpose
Configure company information, system preferences, invoice settings, and notifications.

### Data Structures

```typescript
interface CompanyInfo {
  name: string;
  legalName: string;
  email: string;
  phone: string;
  fax: string;
  website: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  taxId: string;
  registrationNo: string;
}

interface SystemSettings {
  dateFormat: string;      // DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD
  timeFormat: string;      // 12h, 24h
  currency: string;        // PKR, USD, EUR, GBP
  timezone: string;        // Asia/Karachi, UTC, etc.
  language: string;        // English, Urdu
  fiscalYearStart: string; // January, April, July
}

interface InvoiceSettings {
  prefix: string;          // e.g., "INV-"
  startingNumber: number;  // e.g., 1001
  footer: string;
  termsConditions: string;
  showLogo: boolean;
  showTaxBreakdown: boolean;
}

interface NotificationSettings {
  emailNotifications: boolean;
  lowStockAlerts: boolean;
  orderUpdates: boolean;
  paymentReminders: boolean;
  dailyReports: boolean;
  weeklyReports: boolean;
}
```

### Sub-Tabs

| Tab | Icon | Description |
|-----|------|-------------|
| **Company Info** | `Building2` | Basic company details |
| **System Settings** | `Settings` | Regional preferences |
| **Invoice Settings** | `FileText` | Invoice configuration |
| **Notifications** | `Bell` | Alert preferences |

### Company Info Fields

| Field | Required | Description |
|-------|----------|-------------|
| Company Name | Yes | Display name |
| Legal Name | No | Registered legal name |
| Email Address | Yes | Primary email |
| Phone Number | Yes | Contact phone |
| Fax Number | No | Fax number |
| Website | No | Company website |
| Address | Yes | Street address |
| City | Yes | City |
| State/Province | No | State or province |
| Country | No | Country |
| Postal Code | No | ZIP/Postal code |
| Tax ID / NTN | No | Tax identification |
| Registration No. | No | Business registration |

### System Settings Options

| Setting | Options |
|---------|---------|
| Date Format | DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD |
| Time Format | 12 Hour, 24 Hour |
| Currency | PKR, USD, EUR, GBP |
| Timezone | Asia/Karachi, UTC, America/New_York |
| Language | English, Urdu |
| Fiscal Year Start | January, April, July |

### Invoice Settings

| Setting | Type | Description |
|---------|------|-------------|
| Invoice Prefix | Input | Prefix for invoice numbers |
| Starting Number | Number | First invoice number |
| Invoice Footer | Input | Footer text on invoices |
| Terms & Conditions | Textarea | Payment terms |
| Show Company Logo | Switch | Display logo on invoices |
| Show Tax Breakdown | Switch | Itemize tax details |

### Notification Toggles

| Notification | Default | Description |
|--------------|---------|-------------|
| Email Notifications | On | Receive email alerts |
| Low Stock Alerts | On | Notify when stock is low |
| Order Updates | On | Sales order notifications |
| Payment Reminders | On | Payment due reminders |
| Daily Reports | Off | Daily summary emails |
| Weekly Reports | On | Weekly summary emails |

---

## 8. Store Management (`src/components/settings/StoreManagementTab.tsx`)

### Purpose
Hierarchical management of stores, racks, and shelves for inventory organization.

### Data Structures

```typescript
interface StoreData {
  id: string;
  name: string;
  type: string;           // Main Store, Warehouse, Branch, Outlet
  status: "active" | "inactive";
  description?: string;
}

interface RackData {
  id: string;
  codeNo: string;         // e.g., "RACK-001"
  storeId: string;
  description: string;
  status: "active" | "inactive";
  shelves: ShelfData[];
}

interface ShelfData {
  id: string;
  shelfNo: string;        // e.g., "SHELF-A1"
  rackId: string;
  description: string;
  status: "active" | "inactive";
}
```

### Hierarchy Structure

```
Store
├── Rack 1
│   ├── Shelf A
│   ├── Shelf B
│   └── Shelf C
├── Rack 2
│   ├── Shelf A
│   └── Shelf B
└── Rack 3
    └── Shelf A
```

### Store Types

- Main Store
- Warehouse
- Branch
- Outlet

### State Variables

| State | Type | Description |
|-------|------|-------------|
| `stores` | `StoreData[]` | List of stores |
| `racks` | `RackData[]` | List of all racks |
| `shelves` | `ShelfData[]` | List of all shelves |
| `expandedStores` | `Set<string>` | Expanded store IDs |
| `expandedRacks` | `Set<string>` | Expanded rack IDs |
| `selectedStoreId` | `string` | Store for new rack |
| `selectedRackId` | `string` | Rack for new shelf |

### Button Functions

| Button | Function | Description |
|--------|----------|-------------|
| **Add New Store** | `openNewStoreDialog()` | Create new store |
| **Add Rack** | `openNewRackDialog(storeId)` | Add rack to store |
| **Add Shelf** | `openNewShelfDialog(rackId)` | Add shelf to rack |
| **Edit Store** | `handleEditStore(store)` | Edit store details |
| **Edit Rack** | `handleEditRack(rack)` | Edit rack details |
| **Edit Shelf** | `handleEditShelf(shelf)` | Edit shelf details |
| **Delete Store** | `handleDeleteStore(id)` | Delete store and children |
| **Delete Rack** | `handleDeleteRack(id)` | Delete rack and shelves |
| **Delete Shelf** | `handleDeleteShelf(id)` | Delete shelf |

### Store Form Fields

| Field | Type | Required |
|-------|------|----------|
| Store Name | Input | Yes |
| Store Type | Select | Yes |
| Status | Select | Yes |
| Description | Textarea | No |

### Rack Form Fields

| Field | Type | Required |
|-------|------|----------|
| Rack Code | Input | Yes |
| Description | Textarea | No |
| Status | Select | Yes |

### Shelf Form Fields

| Field | Type | Required |
|-------|------|----------|
| Shelf Number | Input | Yes |
| Description | Textarea | No |
| Status | Select | Yes |

---

## 9. WhatsApp Settings (`src/components/settings/WhatsAppSettingsTab.tsx`)

### Purpose
Configure WhatsApp API integration for messaging functionality.

### State Variables

| State | Type | Description |
|-------|------|-------------|
| `appKey` | `string` | WhatsApp App Key |
| `authKey` | `string` | WhatsApp Auth Key |
| `showAppKey` | `boolean` | Toggle App Key visibility |
| `showAuthKey` | `boolean` | Toggle Auth Key visibility |
| `isSaving` | `boolean` | Save operation in progress |

### Form Fields

| Field | Type | Description |
|-------|------|-------------|
| App Key | Password Input | WhatsApp application identifier |
| Auth Key | Password Input | Authentication key for API |

### Button Functions

| Button | Function | Description |
|--------|----------|-------------|
| **Save Settings** | `handleSave()` | Save API credentials |
| **Show/Hide** | Toggle visibility | Show/hide password fields |

### Integration Status

Displays connection status with visual indicator:
- Green pulsing dot: Connected
- Status message: "WhatsApp API Connected"

---

## Inter-Module Relationships

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SETTINGS RELATIONSHIPS                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  UsersManagementTab ──────┬──────► All Modules                              │
│                          │        (User authentication & authorization)     │
│                          │                                                  │
│  RolesPermissionsTab ────┴──────► All Modules                              │
│                                  (Access control enforcement)              │
│                                                                             │
│  ApprovalFlowsTab ───────────────► Purchase Orders                         │
│                                  ► Sales                                    │
│                                  ► Inventory                                │
│                                  ► Expenses                                 │
│                                                                             │
│  ActivityLogsTab ────────────────► All Modules                              │
│                                  (Audit trail)                              │
│                                                                             │
│  CompanyProfileTab ──────────────► Sales Invoice                            │
│                                  ► Reports                                  │
│                                  ► Print Templates                          │
│                                                                             │
│  StoreManagementTab ─────────────► Inventory                                │
│                                  ► Stock Balance                            │
│                                  ► Purchase Orders                          │
│                                  ► Stock Transfer                           │
│                                                                             │
│  WhatsAppSettingsTab ────────────► ReceivableReminders                      │
│                                  ► Order Notifications                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Security Considerations

### User Management Security

```
┌───────────────────────────────────────────────────────────────┐
│                   SECURITY BEST PRACTICES                     │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  ⚠️  CRITICAL: Roles stored in SEPARATE table                 │
│      NOT on user profile (prevents privilege escalation)     │
│                                                               │
│  ⚠️  NEVER check admin via localStorage/client storage        │
│      Always use server-side validation                       │
│                                                               │
│  ⚠️  Use Security Definer functions for RLS                   │
│      Prevents infinite recursion in policies                 │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### Recommended Role-Based Security Implementation

```sql
-- 1. Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'staff', 'accountant', 'viewer');

-- 2. Separate user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    UNIQUE (user_id, role)
);

-- 3. Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Security definer function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 5. Use in RLS policies
CREATE POLICY "Admins can select all rows"
ON public.some_table
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
```

---

## Future Database Schema

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
```

### User Roles Table
```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, role)
);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
```

### Roles Table (for custom roles)
```sql
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  type VARCHAR(50) DEFAULT 'Custom',
  description TEXT,
  permissions TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Activity Logs Table
```sql
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  user_name VARCHAR(255),
  user_role VARCHAR(50),
  action VARCHAR(50) NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  module VARCHAR(100),
  description TEXT,
  ip_address INET,
  status VARCHAR(20) DEFAULT 'success',
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);
CREATE INDEX idx_activity_logs_module ON activity_logs(module);
```

### Approval Flows Table
```sql
CREATE TABLE approval_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  description TEXT,
  module VARCHAR(100) NOT NULL,
  trigger_type VARCHAR(50) NOT NULL,
  condition TEXT,
  steps JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Backups Table
```sql
CREATE TABLE backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  backup_type VARCHAR(20) NOT NULL CHECK (backup_type IN ('full', 'incremental')),
  tables TEXT[],
  size_bytes BIGINT,
  status VARCHAR(20) DEFAULT 'in_progress',
  file_path TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Company Settings Table
```sql
CREATE TABLE company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name VARCHAR(255),
  legal_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  fax VARCHAR(50),
  website VARCHAR(255),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100),
  postal_code VARCHAR(20),
  tax_id VARCHAR(100),
  registration_no VARCHAR(100),
  logo_url TEXT,
  date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
  time_format VARCHAR(10) DEFAULT '24h',
  currency VARCHAR(10) DEFAULT 'PKR',
  timezone VARCHAR(50) DEFAULT 'Asia/Karachi',
  language VARCHAR(20) DEFAULT 'English',
  fiscal_year_start VARCHAR(20) DEFAULT 'January',
  invoice_prefix VARCHAR(20) DEFAULT 'INV-',
  invoice_starting_number INTEGER DEFAULT 1001,
  invoice_footer TEXT,
  invoice_terms TEXT,
  show_logo_on_invoice BOOLEAN DEFAULT true,
  show_tax_breakdown BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT true,
  low_stock_alerts BOOLEAN DEFAULT true,
  order_updates BOOLEAN DEFAULT true,
  payment_reminders BOOLEAN DEFAULT true,
  daily_reports BOOLEAN DEFAULT false,
  weekly_reports BOOLEAN DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Stores Table
```sql
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Racks Table
```sql
CREATE TABLE racks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_no VARCHAR(50) NOT NULL,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  description TEXT,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_racks_store_id ON racks(store_id);
```

### Shelves Table
```sql
CREATE TABLE shelves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shelf_no VARCHAR(50) NOT NULL,
  rack_id UUID REFERENCES racks(id) ON DELETE CASCADE,
  description TEXT,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_shelves_rack_id ON shelves(rack_id);
```

---

## Related Documentation

| Document | Description |
|----------|-------------|
| [Customer & Supplier Management](./CUSTOMER_SUPPLIER_MANAGEMENT_SYSTEM.md) | Business partner management |
| [Inventory Management System](./INVENTORY_MANAGEMENT_SYSTEM.md) | Store/rack usage in inventory |
| [Sales & Invoicing System](./SALES_INVOICING_SYSTEM.md) | Invoice settings usage |
| [Reports & Analytics System](./REPORTS_ANALYTICS_SYSTEM.md) | Activity log analysis |
| [Accounting & Financial System](./ACCOUNTING_FINANCIAL_SYSTEM.md) | Fiscal year settings |
