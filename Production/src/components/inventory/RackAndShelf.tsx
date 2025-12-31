import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Search, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Types
interface Rack {
  id: string;
  codeNo: string;
  store: string;
  storeId?: string;
  description: string;
  status: "Active" | "Inactive";
  shelfCount: number;
}

interface Shelf {
  id: string;
  shelfNo: string;
  rackId: string;
  rackCode: string;
  store: string;
  description: string;
  status: "Active" | "Inactive";
}

interface Store {
  id: string;
  name: string;
}

type FormMode = "list" | "create-rack" | "edit-rack" | "create-shelf" | "edit-shelf";

export const RackAndShelf = () => {
  // Data state
  const [racks, setRacks] = useState<Rack[]>([]);
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [rackStoreId, setRackStoreId] = useState("");

  // Search state
  const [rackSearch, setRackSearch] = useState("");
  const [shelfSearch, setShelfSearch] = useState("");

  // Form mode
  const [formMode, setFormMode] = useState<FormMode>("list");
  const [selectedRack, setSelectedRack] = useState<Rack | null>(null);
  const [selectedShelf, setSelectedShelf] = useState<Shelf | null>(null);

  // Rack form state
  const [rackCodeNo, setRackCodeNo] = useState("");
  const [rackStore, setRackStore] = useState("");
  const [rackDescription, setRackDescription] = useState("");
  const [rackStatus, setRackStatus] = useState<"Active" | "Inactive">("Active");

  // Load data on mount
  useEffect(() => {
    loadStores();
    loadRacks();
    loadShelves();
  }, []);

  const loadStores = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/inventory/stores`);
      if (response.ok) {
        const data = await response.json();
        setStores(data.map((s: any) => ({ id: s.id, name: s.name })));
      }
    } catch (error) {
      console.error('Error loading stores:', error);
    }
  };

  const loadRacks = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/inventory/racks`);
      if (response.ok) {
        const data = await response.json();
        setRacks(data.map((r: any) => ({
          id: r.id,
          codeNo: r.codeNo,
          store: r.store_name || 'No Store',
          storeId: r.store_id || r.storeId,
          description: r.description || '',
          status: r.status === 'Active' ? 'Active' : 'Inactive',
          shelfCount: r.shelves_count || 0,
        })));
      } else {
        toast.error('Failed to load racks');
      }
    } catch (error) {
      console.error('Error loading racks:', error);
      toast.error('Failed to load racks');
    } finally {
      setLoading(false);
    }
  };

  const loadShelves = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/inventory/shelves`);
      if (response.ok) {
        const data = await response.json();
        setShelves(data.map((s: any) => ({
          id: s.id,
          shelfNo: s.shelfNo,
          rackId: s.rackId,
          rackCode: s.rack_code || '',
          store: s.store_name || 'No Store',
          description: s.description || '',
          status: s.status === 'Active' ? 'Active' : 'Inactive',
        })));
      } else {
        toast.error('Failed to load shelves');
      }
    } catch (error) {
      console.error('Error loading shelves:', error);
      toast.error('Failed to load shelves');
    }
  };

  // Shelf form state
  const [shelfNo, setShelfNo] = useState("");
  const [shelfRackId, setShelfRackId] = useState("");
  const [shelfDescription, setShelfDescription] = useState("");
  const [shelfStatus, setShelfStatus] = useState<"Active" | "Inactive">("Active");

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: "rack" | "shelf"; item: Rack | Shelf } | null>(null);

  // Filtered data
  const filteredRacks = useMemo(() => {
    return racks.filter((rack) =>
      rack.codeNo.toLowerCase().includes(rackSearch.toLowerCase()) ||
      rack.store.toLowerCase().includes(rackSearch.toLowerCase())
    );
  }, [racks, rackSearch]);

  const filteredShelves = useMemo(() => {
    return shelves.filter((shelf) =>
      shelf.shelfNo.toLowerCase().includes(shelfSearch.toLowerCase()) ||
      shelf.rackCode.toLowerCase().includes(shelfSearch.toLowerCase()) ||
      shelf.store.toLowerCase().includes(shelfSearch.toLowerCase())
    );
  }, [shelves, shelfSearch]);

  // Reset forms
  const resetRackForm = () => {
    setRackCodeNo("");
    setRackStore("");
    setRackStoreId("");
    setRackDescription("");
    setRackStatus("Active");
    setSelectedRack(null);
  };

  const resetShelfForm = () => {
    setShelfNo("");
    setShelfRackId("");
    setShelfDescription("");
    setShelfStatus("Active");
    setSelectedShelf(null);
  };

  // Handlers
  const handleCreateRack = () => {
    resetRackForm();
    setFormMode("create-rack");
  };

  const handleEditRack = (rack: Rack) => {
    setSelectedRack(rack);
    setRackCodeNo(rack.codeNo);
    // Use storeId from rack if available, otherwise find by name
    if (rack.storeId) {
      setRackStoreId(rack.storeId);
    } else {
      const store = stores.find(s => s.name === rack.store);
      setRackStoreId(store?.id || '');
    }
    setRackStore(rack.store);
    setRackDescription(rack.description);
    setRackStatus(rack.status);
    setFormMode("edit-rack");
  };

  const handleDeleteRack = (rack: Rack) => {
    setItemToDelete({ type: "rack", item: rack });
    setDeleteDialogOpen(true);
  };

  const confirmDeleteRack = async (rack: Rack) => {
    try {
      const response = await fetch(`${API_BASE_URL}/inventory/racks/${rack.id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        await loadRacks();
        await loadShelves();
        toast.success(`Rack "${rack.codeNo}" deleted`);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete rack');
      }
    } catch (error) {
      console.error('Error deleting rack:', error);
      toast.error('Failed to delete rack');
    }
    setDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  const handleSaveRack = async () => {
    if (!rackCodeNo.trim()) {
      toast.error("Please enter rack code");
      return;
    }
    if (!rackStoreId) {
      toast.error("Please select a store");
      return;
    }

    try {
      if (formMode === "create-rack") {
        const response = await fetch(`${API_BASE_URL}/inventory/racks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            codeNo: rackCodeNo.trim(),
            storeId: rackStoreId,
            description: rackDescription.trim() || null,
            status: rackStatus,
          }),
        });

        if (response.ok) {
          await loadRacks();
          toast.success("Rack created successfully");
          resetRackForm();
          setFormMode("list");
        } else {
          const error = await response.json();
          toast.error(error.error || 'Failed to create rack');
        }
      } else if (formMode === "edit-rack" && selectedRack) {
        const response = await fetch(`${API_BASE_URL}/inventory/racks/${selectedRack.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            codeNo: rackCodeNo.trim(),
            description: rackDescription.trim() || null,
            status: rackStatus,
          }),
        });

        if (response.ok) {
          await loadRacks();
          await loadShelves();
          toast.success("Rack updated successfully");
          resetRackForm();
          setFormMode("list");
        } else {
          const error = await response.json();
          toast.error(error.error || 'Failed to update rack');
        }
      }
    } catch (error) {
      console.error('Error saving rack:', error);
      toast.error('Failed to save rack');
    }
  };

  const handleCreateShelf = () => {
    resetShelfForm();
    setFormMode("create-shelf");
  };

  const handleEditShelf = (shelf: Shelf) => {
    setSelectedShelf(shelf);
    setShelfNo(shelf.shelfNo);
    setShelfRackId(shelf.rackId);
    setShelfDescription(shelf.description);
    setShelfStatus(shelf.status);
    setFormMode("edit-shelf");
  };

  const handleDeleteShelf = (shelf: Shelf) => {
    setItemToDelete({ type: "shelf", item: shelf });
    setDeleteDialogOpen(true);
  };

  const confirmDeleteShelf = async (shelf: Shelf) => {
    try {
      const response = await fetch(`${API_BASE_URL}/inventory/shelves/${shelf.id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        await loadShelves();
        await loadRacks();
        toast.success(`Shelf "${shelf.shelfNo}" deleted`);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete shelf');
      }
    } catch (error) {
      console.error('Error deleting shelf:', error);
      toast.error('Failed to delete shelf');
    }
    setDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  const handleConfirmDelete = () => {
    if (!itemToDelete) return;
    if (itemToDelete.type === "rack") {
      confirmDeleteRack(itemToDelete.item as Rack);
    } else {
      confirmDeleteShelf(itemToDelete.item as Shelf);
    }
  };

  const handleSaveShelf = async () => {
    if (!shelfNo.trim()) {
      toast.error("Please enter shelf number");
      return;
    }
    if (!shelfRackId) {
      toast.error("Please select a rack");
      return;
    }

    const rack = racks.find((r) => r.id === shelfRackId);
    if (!rack) {
      toast.error("Selected rack not found");
      return;
    }

    try {
      if (formMode === "create-shelf") {
        const response = await fetch(`${API_BASE_URL}/inventory/shelves`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shelfNo: shelfNo.trim(),
            rackId: shelfRackId,
            description: shelfDescription.trim() || null,
            status: shelfStatus,
          }),
        });

        if (response.ok) {
          await loadShelves();
          await loadRacks();
          toast.success("Shelf created successfully");
          resetShelfForm();
          setFormMode("list");
        } else {
          const error = await response.json();
          toast.error(error.error || 'Failed to create shelf');
        }
      } else if (formMode === "edit-shelf" && selectedShelf) {
        const response = await fetch(`${API_BASE_URL}/inventory/shelves/${selectedShelf.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shelfNo: shelfNo.trim(),
            description: shelfDescription.trim() || null,
            status: shelfStatus,
          }),
        });

        if (response.ok) {
          await loadShelves();
          await loadRacks();
          toast.success("Shelf updated successfully");
          resetShelfForm();
          setFormMode("list");
        } else {
          const error = await response.json();
          toast.error(error.error || 'Failed to update shelf');
        }
      }
    } catch (error) {
      console.error('Error saving shelf:', error);
      toast.error('Failed to save shelf');
    }
  };

  const handleCancel = () => {
    resetRackForm();
    resetShelfForm();
    setFormMode("list");
  };

  // Render rack form inline
  const renderRackFormInline = () => (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">
          {formMode === "create-rack" ? "Create New Rack" : "Edit Rack"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm">Code No *</Label>
            <Input
              value={rackCodeNo}
              onChange={(e) => setRackCodeNo(e.target.value)}
              placeholder="Enter rack number"
              className="text-sm h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Store *</Label>
            <Select 
              value={rackStoreId} 
              onValueChange={(value) => {
                setRackStoreId(value);
                const store = stores.find(s => s.id === value);
                setRackStore(store?.name || '');
              }}
            >
              <SelectTrigger className="text-sm h-9">
                <SelectValue placeholder="Select Store..." />
              </SelectTrigger>
              <SelectContent>
                {stores.map((store) => (
                  <SelectItem key={store.id} value={store.id}>
                    {store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm">Description</Label>
          <Textarea
            value={rackDescription}
            onChange={(e) => setRackDescription(e.target.value)}
            placeholder="Enter rack description..."
            className="text-sm resize-none"
            rows={2}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm">Status</Label>
          <Select value={rackStatus} onValueChange={(value: "Active" | "Inactive") => setRackStatus(value)}>
            <SelectTrigger className="w-32 text-sm h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Button onClick={handleSaveRack} size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm">
            {formMode === "create-rack" ? "Create" : "Update"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleCancel} className="text-sm">
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  // Render shelf form inline
  const renderShelfFormInline = () => (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">
          {formMode === "create-shelf" ? "Create New Shelf" : "Edit Shelf"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm">Shelf No *</Label>
            <Input
              value={shelfNo}
              onChange={(e) => setShelfNo(e.target.value)}
              placeholder="Enter shelf number"
              className="text-sm h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Rack *</Label>
            <Select 
              value={shelfRackId} 
              onValueChange={setShelfRackId}
              disabled={formMode === "edit-shelf"}
            >
              <SelectTrigger className="text-sm h-9">
                <SelectValue placeholder="Select Rack..." />
              </SelectTrigger>
              <SelectContent>
                {racks.map((rack) => (
                  <SelectItem key={rack.id} value={rack.id}>
                    {rack.codeNo} - {rack.store}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formMode === "edit-shelf" && (
              <p className="text-xs text-muted-foreground mt-1">Rack cannot be changed after creation</p>
            )}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm">Description</Label>
          <Textarea
            value={shelfDescription}
            onChange={(e) => setShelfDescription(e.target.value)}
            placeholder="Enter shelf description..."
            className="text-sm resize-none"
            rows={2}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm">Status</Label>
          <Select value={shelfStatus} onValueChange={(value: "Active" | "Inactive") => setShelfStatus(value)}>
            <SelectTrigger className="w-32 text-sm h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Button onClick={handleSaveShelf} size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm">
            {formMode === "create-shelf" ? "Create" : "Update"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleCancel} className="text-sm">
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  // Render list view
  const renderListView = () => (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Racks & Shelves</h1>
        <p className="text-sm text-muted-foreground">Manage racks and shelves for inventory organization</p>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Racks List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-foreground">Racks List</h2>
              <p className="text-xs text-muted-foreground">Manage storage racks</p>
            </div>
            <Button onClick={handleCreateRack} className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm whitespace-nowrap">
              <Plus className="w-4 h-4 mr-1" />
              Add New Rack
            </Button>
          </div>

          {/* Inline Rack Form */}
          {(formMode === "create-rack" || formMode === "edit-rack") && renderRackFormInline()}

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium">All Racks ({filteredRacks.length})</h3>
                <div className="relative w-48">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={rackSearch}
                    onChange={(e) => setRackSearch(e.target.value)}
                    placeholder="Search racks..."
                    className="pl-8 text-sm h-9"
                  />
                </div>
              </div>

              <div className="space-y-3">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredRacks.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">No racks found</p>
                ) : (
                  filteredRacks.map((rack) => (
                    <div key={rack.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0 space-y-1">
                          <p className="font-medium text-sm truncate">{rack.codeNo}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            Store: {rack.store} · {rack.shelfCount} shelf{rack.shelfCount !== 1 ? "ves" : ""}
                          </p>
                          <Badge
                            variant={rack.status === "Active" ? "default" : "secondary"}
                            className={rack.status === "Active" ? "bg-emerald-500 hover:bg-emerald-600 text-xs" : "text-xs"}
                          >
                            {rack.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button variant="outline" size="sm" onClick={() => handleEditRack(rack)} className="text-xs h-7 px-3">
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteRack(rack)}
                            className="text-xs h-7 px-3 text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Shelves List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-foreground">Shelves List</h2>
              <p className="text-xs text-muted-foreground">Manage shelves inside racks</p>
            </div>
            <Button onClick={handleCreateShelf} className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm whitespace-nowrap">
              <Plus className="w-4 h-4 mr-1" />
              Add New Shelf
            </Button>
          </div>

          {/* Inline Shelf Form */}
          {(formMode === "create-shelf" || formMode === "edit-shelf") && renderShelfFormInline()}

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium">All Shelves ({filteredShelves.length})</h3>
                <div className="relative w-48">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={shelfSearch}
                    onChange={(e) => setShelfSearch(e.target.value)}
                    placeholder="Search shelves..."
                    className="pl-8 text-sm h-9"
                  />
                </div>
              </div>

              <div className="space-y-3">
                {filteredShelves.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">No shelves found</p>
                ) : (
                  filteredShelves.map((shelf) => (
                    <div key={shelf.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0 space-y-1">
                          <p className="font-medium text-sm truncate">{shelf.shelfNo}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            Rack: {shelf.rackCode} · Store: {shelf.store}
                          </p>
                          <Badge
                            variant={shelf.status === "Active" ? "default" : "secondary"}
                            className={shelf.status === "Active" ? "bg-emerald-500 hover:bg-emerald-600 text-xs" : "text-xs"}
                          >
                            {shelf.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button variant="outline" size="sm" onClick={() => handleEditShelf(shelf)} className="text-xs h-7 px-3">
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteShelf(shelf)}
                            className="text-xs h-7 px-3 text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {renderListView()}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
            <AlertDialogDescription>
              {itemToDelete?.type === "rack" ? (
                <>
                  Are you sure you want to delete rack "{(itemToDelete.item as Rack).codeNo}"?
                  This will also delete all shelves associated with this rack.
                </>
              ) : (
                <>
                  Are you sure you want to delete shelf "{(itemToDelete?.item as Shelf)?.shelfNo}"?
                </>
              )}
              <br />
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
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
