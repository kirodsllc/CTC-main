import { useState, useMemo, useRef, useEffect } from "react";
import { Search, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface Item {
  id: string;
  masterPartNo: string;
  partNo: string;
  brand: string;
  description: string;
  category: string;
  subCategory: string;
  application: string;
  status: string;
  images: string[];
}

interface Model {
  id: string;
  name: string;
  qtyUsed: number;
  partId: string;
}

interface ModelsPageProps {
  items: Item[];
}

export const ModelsPage = ({ items }: ModelsPageProps) => {
  const [masterPartSearch, setMasterPartSearch] = useState("");
  const [selectedMasterPart, setSelectedMasterPart] = useState<string | null>(null);
  const [partNoSearch, setPartNoSearch] = useState("");
  const [selectedPart, setSelectedPart] = useState<Item | null>(null);
  const [showMasterDropdown, setShowMasterDropdown] = useState(false);
  const [showPartDropdown, setShowPartDropdown] = useState(false);
  
  // Models state
  const [models, setModels] = useState<Model[]>([]);
  
  // Inline editing states
  const [editingModelId, setEditingModelId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editQty, setEditQty] = useState("");
  
  // Add new model inline state
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newModelName, setNewModelName] = useState("");
  const [newModelQty, setNewModelQty] = useState("");
  
  // Delete state
  const [deleteModelOpen, setDeleteModelOpen] = useState(false);
  const [modelToDelete, setModelToDelete] = useState<Model | null>(null);

  const masterDropdownRef = useRef<HTMLDivElement>(null);
  const partDropdownRef = useRef<HTMLDivElement>(null);

  // Get unique master part numbers
  const masterPartNumbers = useMemo(() => {
    const uniqueMasters = [...new Set(items.map((item) => item.masterPartNo))].filter(Boolean);
    if (masterPartSearch) {
      return uniqueMasters.filter((master) =>
        master.toLowerCase().includes(masterPartSearch.toLowerCase())
      );
    }
    return uniqueMasters;
  }, [items, masterPartSearch]);

  // Filter parts based on search and selected master part
  const filteredParts = useMemo(() => {
    let filtered = items;
    if (selectedMasterPart) {
      filtered = filtered.filter((item) => item.masterPartNo === selectedMasterPart);
    }
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

  // Get models for selected part
  const partModels = useMemo(() => {
    if (!selectedPart) return [];
    return models.filter((model) => model.partId === selectedPart.id);
  }, [models, selectedPart]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (masterDropdownRef.current && !masterDropdownRef.current.contains(event.target as Node)) {
        setShowMasterDropdown(false);
      }
      if (partDropdownRef.current && !partDropdownRef.current.contains(event.target as Node)) {
        setShowPartDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectMasterPart = (master: string) => {
    setSelectedMasterPart(master);
    setMasterPartSearch(master);
    setShowMasterDropdown(false);
    // Reset part selection when master changes
    setSelectedPart(null);
    setPartNoSearch("");
  };

  const handleSelectPart = (part: Item) => {
    setSelectedPart(part);
    setPartNoSearch(part.partNo);
    setShowPartDropdown(false);
  };

  // Inline Add Model
  const handleStartAddModel = () => {
    setIsAddingNew(true);
    setNewModelName("");
    setNewModelQty("1");
  };

  const handleSaveNewModel = () => {
    if (!selectedPart || !newModelName.trim()) return;
    
    const newModel: Model = {
      id: Date.now().toString(),
      name: newModelName.trim(),
      qtyUsed: parseInt(newModelQty) || 1,
      partId: selectedPart.id,
    };
    
    setModels((prev) => [...prev, newModel]);
    setNewModelName("");
    setNewModelQty("");
    setIsAddingNew(false);
    toast({ title: "Model added successfully" });
  };

  const handleCancelAddModel = () => {
    setIsAddingNew(false);
    setNewModelName("");
    setNewModelQty("");
  };

  // Inline Edit Model
  const handleStartEdit = (model: Model) => {
    setEditingModelId(model.id);
    setEditName(model.name);
    setEditQty(model.qtyUsed.toString());
  };

  const handleSaveEdit = () => {
    if (!editingModelId || !editName.trim()) return;
    
    setModels((prev) =>
      prev.map((m) =>
        m.id === editingModelId
          ? { ...m, name: editName.trim(), qtyUsed: parseInt(editQty) || 1 }
          : m
      )
    );
    setEditingModelId(null);
    setEditName("");
    setEditQty("");
    toast({ title: "Model updated successfully" });
  };

  const handleCancelEdit = () => {
    setEditingModelId(null);
    setEditName("");
    setEditQty("");
  };

  // Delete Model
  const handleDeleteModel = () => {
    if (!modelToDelete) return;
    setModels((prev) => prev.filter((m) => m.id !== modelToDelete.id));
    setModelToDelete(null);
    setDeleteModelOpen(false);
    toast({ title: "Model deleted successfully" });
  };

  const openDeleteModel = (model: Model) => {
    setModelToDelete(model);
    setDeleteModelOpen(true);
  };

  const handleRefresh = () => {
    // Cancel any unsaved new entry
    if (isAddingNew) {
      setIsAddingNew(false);
      setNewModelName("");
      setNewModelQty("");
    }
    // Cancel any editing
    if (editingModelId) {
      setEditingModelId(null);
      setEditName("");
      setEditQty("");
    }
    toast({ title: "Data refreshed" });
  };

  return (
    <div className="h-full flex flex-col overflow-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <div className="w-1 h-8 bg-primary rounded-full" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Models Management</h1>
            <p className="text-sm text-muted-foreground">
              Select a part to view its models and quantity used
            </p>
          </div>
        </div>
      </div>

      {/* Model Selection Card */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-1 h-6 bg-primary rounded-full" />
          <h2 className="text-lg font-semibold text-foreground">Model Selection</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Master Part Number Field */}
          <div ref={masterDropdownRef} className="relative">
            <label className="block text-sm font-medium text-foreground mb-2">
              Master Part Number
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search master part number..."
                value={masterPartSearch}
                onChange={(e) => {
                  setMasterPartSearch(e.target.value);
                  setShowMasterDropdown(true);
                  if (e.target.value !== selectedMasterPart) {
                    setSelectedMasterPart(null);
                  }
                }}
                onFocus={() => setShowMasterDropdown(true)}
                className={cn(
                  "pl-10 h-10",
                  showMasterDropdown && "ring-2 ring-primary border-primary"
                )}
              />
            </div>
            {selectedMasterPart && (
              <p className="text-xs text-muted-foreground mt-2">
                Only parts with this master part number will be shown
              </p>
            )}

            {/* Master Part Dropdown */}
            {showMasterDropdown && (
              <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-60 overflow-auto">
                {masterPartNumbers.length > 0 ? (
                  masterPartNumbers.map((master) => (
                    <button
                      key={master}
                      onClick={() => handleSelectMasterPart(master)}
                      className={cn(
                        "w-full text-left px-4 py-3 text-sm hover:bg-muted transition-colors border-b border-border last:border-b-0",
                        selectedMasterPart === master && "bg-muted"
                      )}
                    >
                      {master}
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-sm text-muted-foreground">
                    No master part numbers found
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Part No Field */}
          <div ref={partDropdownRef} className="relative">
            <label className="block text-sm font-medium text-foreground mb-2">
              Part No <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by part number, description, or brand..."
                value={partNoSearch}
                onChange={(e) => {
                  setPartNoSearch(e.target.value);
                  setShowPartDropdown(true);
                  if (e.target.value !== selectedPart?.partNo) {
                    setSelectedPart(null);
                  }
                }}
                onFocus={() => setShowPartDropdown(true)}
                className={cn(
                  "pl-10 h-10",
                  showPartDropdown && "ring-2 ring-primary border-primary"
                )}
              />
            </div>

            {/* Part Dropdown */}
            {showPartDropdown && (
              <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-80 overflow-auto">
                {filteredParts.length > 0 ? (
                  filteredParts.map((part) => (
                    <button
                      key={part.id}
                      onClick={() => handleSelectPart(part)}
                      className={cn(
                        "w-full text-left px-4 py-3 hover:bg-muted transition-colors border-b border-border last:border-b-0",
                        selectedPart?.id === part.id && "bg-muted"
                      )}
                    >
                      <p className="font-medium text-foreground text-sm">{part.partNo}</p>
                      <p className="text-sm text-muted-foreground">{part.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Brand: {part.brand} &nbsp;&nbsp; Master: {part.masterPartNo}
                      </p>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-sm text-muted-foreground">
                    No parts found
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Models Table */}
      {selectedPart && (
        <div className="mt-6 bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-6 bg-primary rounded-full" />
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Models for {selectedPart.partNo}
                </h2>
                <p className="text-sm text-muted-foreground">{selectedPart.description}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="gap-1.5" onClick={handleStartAddModel} disabled={isAddingNew}>
                <Plus className="w-4 h-4" />
                Add Model
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleRefresh}>
                <RefreshCw className="w-4 h-4" />
                Refresh
              </Button>
            </div>
          </div>

          <div className="border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Model</TableHead>
                  <TableHead className="font-semibold text-center w-40">Qty. Used</TableHead>
                  <TableHead className="font-semibold text-center w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Add New Model Row */}
                {isAddingNew && (
                  <TableRow>
                    <TableCell>
                      <Input
                        placeholder="Enter model name..."
                        value={newModelName}
                        onChange={(e) => setNewModelName(e.target.value)}
                        className="h-9"
                        autoFocus
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        placeholder="1"
                        value={newModelQty}
                        onChange={(e) => setNewModelQty(e.target.value)}
                        className="h-9 text-center"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
                        <Button size="sm" className="h-7 px-3 text-xs" onClick={handleSaveNewModel}>
                          Save
                        </Button>
                        <Button variant="outline" size="sm" className="h-7 px-3 text-xs" onClick={handleCancelAddModel}>
                          Cancel
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}

                {/* Existing Models */}
                {partModels.length > 0 ? (
                  partModels.map((model) => (
                    <TableRow key={model.id}>
                      <TableCell>
                        {editingModelId === model.id ? (
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="h-9"
                            autoFocus
                          />
                        ) : (
                          <span 
                            className="font-medium cursor-pointer hover:text-primary transition-colors"
                            onClick={() => handleStartEdit(model)}
                          >
                            {model.name}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingModelId === model.id ? (
                          <Input
                            type="number"
                            value={editQty}
                            onChange={(e) => setEditQty(e.target.value)}
                            className="h-9 text-center"
                          />
                        ) : (
                          <span className="flex justify-center">{model.qtyUsed}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          {editingModelId === model.id ? (
                            <>
                              <Button size="sm" className="h-7 px-3 text-xs" onClick={handleSaveEdit}>
                                Save
                              </Button>
                              <Button variant="outline" size="sm" className="h-7 px-3 text-xs" onClick={handleCancelEdit}>
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <button
                              onClick={() => openDeleteModel(model)}
                              className="p-1.5 text-destructive hover:bg-destructive/10 rounded transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : !isAddingNew ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                      No models found for this part. Click "Add Model" to create one.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
          
          {/* Reset Button */}
          <div className="flex justify-center mt-4">
            <Button 
              variant="outline" 
              size="sm" 
              className="px-6"
              onClick={handleRefresh}
            >
              Reset
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={deleteModelOpen} onOpenChange={setDeleteModelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Model</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{modelToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteModel}
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
