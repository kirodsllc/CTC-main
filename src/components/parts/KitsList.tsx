import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EditKitForm } from "./EditKitForm";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";

export interface KitItem {
  id: string;
  partNo: string;
  partName: string;
  quantity: number;
  cost: number;
}

export interface Kit {
  id: string;
  name: string;
  badge?: string;
  itemsCount: number;
  totalCost: number;
  price: number;
  items?: KitItem[];
}

const initialKits: Kit[] = [];

interface KitsListProps {
  kits?: Kit[];
  onEdit?: (kit: Kit) => void;
  onBreakKit?: (kit: Kit) => void;
  onDelete?: (kit: Kit) => void;
  onUpdateKit?: (kit: Kit) => void;
}

export const KitsList = ({
  kits = initialKits,
  onEdit,
  onBreakKit,
  onDelete,
  onUpdateKit,
}: KitsListProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingKit, setEditingKit] = useState<Kit | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [kitToDelete, setKitToDelete] = useState<Kit | null>(null);

  const filteredKits = useMemo(() => {
    return kits.filter(
      (kit) =>
        kit.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        kit.badge?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [kits, searchQuery]);

  const formatCurrency = (value: number) => {
    return `Rs ${value.toFixed(2)}`;
  };

  const handleEditClick = (kit: Kit) => {
    setEditingKit(kit);
    onEdit?.(kit);
  };

  const handleDeleteClick = (kit: Kit) => {
    setKitToDelete(kit);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (kitToDelete) {
      onDelete?.(kitToDelete);
      toast({
        title: "Kit Deleted",
        description: `"${kitToDelete.name}" has been deleted successfully.`,
      });
    }
    setDeleteConfirmOpen(false);
    setKitToDelete(null);
    setEditingKit(null);
  };

  const handleSaveKit = (updatedKit: Kit) => {
    onUpdateKit?.(updatedKit);
    setEditingKit(null);
  };

  const handleCancelEdit = () => {
    setEditingKit(null);
  };

  // Show edit form when a kit is being edited
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

  return (
    <div className="bg-card rounded-xl border border-border flex flex-col">
      <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">All Kits</h3>
          <p className="text-xs text-muted-foreground">{filteredKits.length} kit{filteredKits.length !== 1 ? 's' : ''} found</p>
        </div>
        <Input
          placeholder="Search kits..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:w-48 h-8 text-sm"
        />
      </div>

      <div className="p-4">
        {filteredKits.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
            No kits found
          </div>
        ) : (
          <div className="space-y-3">
            {filteredKits.map((kit) => (
              <div
                key={kit.id}
                className="border border-border rounded-lg p-3 hover:shadow-sm transition-shadow bg-background"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-semibold text-foreground text-sm">{kit.name}</span>
                      {kit.badge && (
                        <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded">
                          {kit.badge}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <span>
                        <strong className="text-foreground">Items:</strong> {kit.itemsCount}
                      </span>
                      <span>
                        <strong className="text-foreground">Total Cost:</strong>{" "}
                        {formatCurrency(kit.totalCost)}
                      </span>
                      <span>
                        <strong className="text-foreground">Price:</strong>{" "}
                        {formatCurrency(kit.price)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs px-3"
                      onClick={() => handleEditClick(kit)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs px-3 text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => handleDeleteClick(kit)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Kit</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{kitToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
