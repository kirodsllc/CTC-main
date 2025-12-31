# Fix: Part Deletion Foreign Key Constraint Error

## Problem
When attempting to delete a part, the system was throwing a foreign key constraint violation error:
```
Foreign key constraint violated: `foreign key`
Error code: P2003
```

## Root Cause
The `Part` model has multiple relationships with other tables:
1. **KitItem** - Uses `onDelete: Restrict` (prevents deletion if part is in a kit)
2. **PriceHistory** - No cascade delete specified (nullable relation)
3. Other relationships have `onDelete: Cascade` (automatically deleted)

The delete route was attempting to delete the part without checking for these constraints first.

## Solution
Updated the delete route in `backend/src/routes/parts.ts` to:

1. **Check if part exists** before attempting deletion
2. **Check for KitItems** - Since KitItem has `onDelete: Restrict`, we check if the part is used in any kits and provide a detailed error message listing which kits use it
3. **Manually delete PriceHistory** - Since PriceHistory doesn't have cascade delete, we manually delete these records before deleting the part
4. **Better error handling** - Catch foreign key constraint errors and provide user-friendly error messages
5. **Inform about cascade deletions** - Return information about related records that will be automatically deleted

## Changes Made

### File: `backend/src/routes/parts.ts`

**Before:**
```typescript
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.part.delete({ where: { id } });
    res.json({ message: 'Part deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting part:', error);
    res.status(500).json({ error: error.message });
  }
});
```

**After:**
- Checks if part exists
- Checks for KitItems and provides detailed error if found
- Manually deletes PriceHistory records
- Provides information about cascade-deleted records
- Better error handling for foreign key constraints

## Error Messages

### When Part is Used in Kits:
```json
{
  "error": "Cannot delete part because it is used in 2 kit(s)",
  "details": "This part is used in the following kits: Test Kit 1, Test Kit 2. Please remove this part from all kits before deleting it.",
  "kitCount": 2
}
```

### When Other Foreign Key Constraints Exist:
```json
{
  "error": "Cannot delete part due to foreign key constraints",
  "details": "This part is referenced by other records in the system. Please remove all references before deleting.",
  "code": "P2003"
}
```

### Successful Deletion:
```json
{
  "message": "Part deleted successfully",
  "deletedRelatedRecords": {
    "stockMovements": 5,
    "purchaseOrderItems": 2,
    "directPurchaseOrderItems": 1,
    "adjustmentItems": 0,
    "transferItems": 0,
    "verificationItems": 0,
    "priceHistory": 3
  }
}
```

## Related Records That Are Cascade Deleted
When a part is deleted, the following records are automatically deleted (via cascade):
- Models
- StockMovements
- PurchaseOrderItems
- DirectPurchaseOrderItems
- AdjustmentItems
- TransferItems
- StockVerificationItems

## Related Records That Must Be Removed First
- **KitItems** - Part must be removed from all kits before deletion

## Testing
To test the fix:
1. Try deleting a part that is not used in any kits - should succeed
2. Try deleting a part that is used in a kit - should return error with kit names
3. Verify that related records are properly cascade deleted

## Status
✅ **FIXED** - Part deletion now properly handles foreign key constraints

