# 🗑️ Clear Demo Data & Use Real Activity Logs

## Problem
The Activity Logs page is showing demo/seed data instead of real activity logs from actual system usage.

## Solution

### Step 1: Clear Demo Data

Run this script to delete all demo activity logs:

```bash
cd backend
npx tsx scripts/clear-demo-activity-logs.ts
```

This will delete all existing activity logs. After this, only real activities will be logged.

### Step 2: Activity Logging Utility

I've created an activity logging utility at `backend/src/utils/activityLogger.ts` that you can use throughout your application.

**Usage Example:**

```typescript
import { logActivity, getClientIp } from '../utils/activityLogger';

// Log when a user is created
await logActivity({
  user: 'Admin User',
  userRole: 'Admin',
  action: 'Created User',
  actionType: 'create',
  module: 'Users',
  description: `Created new user: ${userName}`,
  ipAddress: getClientIp(req),
  status: 'success',
  details: { userId: newUser.id, email: newUser.email }
});
```

### Step 3: Add Logging to Your Routes

Add activity logging to key operations in your routes:

**Example: User Management (`backend/src/routes/users.ts`)**

```typescript
// After creating a user
await logActivity({
  user: currentUser.name,
  userRole: currentUser.role,
  action: 'Created User',
  actionType: 'create',
  module: 'Users',
  description: `Created new user: ${name}`,
  ipAddress: getClientIp(req),
  status: 'success',
  details: { userId: user.id, email: user.email }
});

// After updating a user
await logActivity({
  user: currentUser.name,
  userRole: currentUser.role,
  action: 'Updated User',
  actionType: 'update',
  module: 'Users',
  description: `Updated user: ${name}`,
  ipAddress: getClientIp(req),
  status: 'success',
  details: { userId: user.id }
});

// After deleting a user
await logActivity({
  user: currentUser.name,
  userRole: currentUser.role,
  action: 'Deleted User',
  actionType: 'delete',
  module: 'Users',
  description: `Deleted user: ${deletedUser.name}`,
  ipAddress: getClientIp(req),
  status: 'success',
  details: { userId: id }
});
```

**Example: Backup Operations (`backend/src/routes/backups.ts`)**

```typescript
// After creating a backup
await logActivity({
  user: 'Admin User',
  userRole: 'Admin',
  action: 'System Backup',
  actionType: 'backup',
  module: 'Backup',
  description: `Created backup: ${backup.name}`,
  ipAddress: getClientIp(req),
  status: 'success',
  details: { backupId: backup.id, type: backup.type }
});
```

### Step 4: Where to Add Logging

Add activity logging to these key operations:

1. **User Management** (`backend/src/routes/users.ts`)
   - Create user
   - Update user
   - Delete user
   - Change user status

2. **Backup & Restore** (`backend/src/routes/backups.ts`)
   - Create backup
   - Restore backup
   - Delete backup
   - Import backup

3. **Parts Management** (`backend/src/routes/parts.ts`)
   - Create part
   - Update part
   - Delete part

4. **Sales** (`backend/src/routes/sales.ts`)
   - Create invoice
   - Update invoice
   - Delete invoice

5. **Inventory** (`backend/src/routes/inventory.ts`)
   - Stock adjustments
   - Stock transfers
   - Stock verification

6. **Authentication** (when you implement it)
   - User login
   - Failed login attempts
   - User logout

### Step 5: Test Real Logging

After adding logging to your routes:

1. **Clear demo data:**
   ```bash
   cd backend
   npx tsx scripts/clear-demo-activity-logs.ts
   ```

2. **Perform some actions in your app:**
   - Create a user
   - Update a user
   - Create a backup
   - etc.

3. **Check Activity Logs page:**
   - You should now see real activity logs from your actions!

## Available Action Types

- `login` - User login
- `create` - Creating records
- `update` - Updating records
- `delete` - Deleting records
- `export` - Exporting data
- `approve` - Approving requests
- `login_failed` - Failed login attempts
- `backup` - Backup operations
- `restore` - Restore operations

## Available Modules

- `Auth` - Authentication
- `Users` - User management
- `Inventory` - Inventory management
- `Sales` - Sales operations
- `Purchase` - Purchase operations
- `Reports` - Reports
- `Backup` - Backup operations
- `Accounting` - Accounting operations

## Status Types

- `success` - Successful operation
- `warning` - Warning (e.g., low stock)
- `error` - Error (e.g., failed login)

## Quick Start

1. **Clear demo data:**
   ```bash
   cd backend
   npx tsx scripts/clear-demo-activity-logs.ts
   ```

2. **Restart your backend server**

3. **Start using your app** - Activity logs will be created automatically as you add logging to your routes

4. **View Activity Logs** - Go to System Administration → Activity Logs to see real logs!

## Note

The activity logging utility is non-blocking - if logging fails, it won't break your application. It just logs errors to the console.

