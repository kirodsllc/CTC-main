import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Package, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Kit } from "./KitsList";

interface KitItem {
  id: string;
  partNo: string;
  partName: string;
  quantity: number;
  cost: number;
}

interface KitFormData {
  kitNumber: string;
  kitName: string;
  sellingPrice: string;
  status: string;
  description: string;
}

interface EditKitFormProps {
  kit: Kit;
  onSave: (kit: Kit) => void;
  onDelete: (kit: Kit) => void;
  onCancel: () => void;
}

// Sample parts list for selection
const availableParts = [
  { id: "1", partNo: "P-001", name: "Engine Oil Filter", cost: 150.00 },
  { id: "2", partNo: "P-002", name: "Air Filter", cost: 250.00 },
  { id: "3", partNo: "P-003", name: "Brake Pad Set", cost: 1200.00 },
  { id: "4", partNo: "P-004", name: "Spark Plug", cost: 80.00 },
  { id: "5", partNo: "P-005", name: "Timing Belt", cost: 450.00 },
  { id: "6", partNo: "P-006", name: "Fuel Filter", cost: 180.00 },
  { id: "7", partNo: "P-007", name: "Coolant", cost: 300.00 },
];

export const EditKitForm = ({ kit, onSave, onDelete, onCancel }: EditKitFormProps) => {
  const [formData, setFormData] = useState<KitFormData>({
    kitNumber: kit.badge || "",
    kitName: kit.name,
    sellingPrice: kit.price.toString(),
    status: "Active",
    description: "",
  });
  const [kitItems, setKitItems] = useState<KitItem[]>([]);

  useEffect(() => {
    setFormData({
      kitNumber: kit.badge || "",
      kitName: kit.name,
      sellingPrice: kit.price.toString(),
      status: "Active",
      description: "",
    });
  }, [kit]);

  const handleInputChange = (field: keyof KitFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddNewItem = () => {
    const newItem: KitItem = {
      id: Date.now().toString(),
      partNo: "",
      partName: "",
      quantity: 1,
      cost: 0,
    };
    // Add new item at the beginning
    setKitItems((prev) => [newItem, ...prev]);
  };

  const handlePartSelect = (itemId: string, partId: string) => {
    const selectedPart = availableParts.find((p) => p.id === partId);
    if (selectedPart) {
      setKitItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? { ...item, partNo: selectedPart.partNo, partName: selectedPart.name, cost: selectedPart.cost }
            : item
        )
      );
    }
  };

  const handleQuantityChange = (itemId: string, quantity: number) => {
    setKitItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, quantity: Math.max(1, quantity) } : item
      )
    );
  };

  const handleRemoveItem = (id: string) => {
    setKitItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSave = () => {
    if (!formData.kitNumber.trim() || !formData.kitName.trim()) {
      toast({
        title: "Validation Error",
        description: "Kit Number and Kit Name are required",
        variant: "destructive",
      });
      return;
    }
    
    const updatedKit: Kit = {
      ...kit,
      name: formData.kitName,
      badge: formData.kitNumber,
      price: parseFloat(formData.sellingPrice) || 0,
      itemsCount: kitItems.filter(item => item.partNo).length,
      totalCost: kitItems.reduce((sum, item) => sum + (item.cost * item.quantity), 0),
    };
    
    onSave(updatedKit);
    toast({
      title: "Success",
      description: "Kit updated successfully",
    });
  };

  return (
    <div className="bg-card rounded-xl border border-border p-4 md:p-6 h-full flex flex-col">
      <h2 className="text-lg font-semibold text-foreground mb-4">Edit Kit</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div>
          <label className="block text-xs text-muted-foreground mb-1.5">
            Kit Number <span className="text-destructive">*</span>
          </label>
          <Input
            placeholder="KIT-001"
            value={formData.kitNumber}
            onChange={(e) => handleInputChange("kitNumber", e.target.value)}
            className="h-9 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1.5">
            Kit Name <span className="text-destructive">*</span>
          </label>
          <Input
            placeholder="Enter kit name"
            value={formData.kitName}
            onChange={(e) => handleInputChange("kitName", e.target.value)}
            className="h-9 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1.5">Selling Price</label>
          <Input
            type="number"
            step="0.01"
            placeholder="0.00"
            value={formData.sellingPrice}
            onChange={(e) => handleInputChange("sellingPrice", e.target.value)}
            className="h-9 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1.5">Status</label>
          <Select value={formData.status} onValueChange={(v) => handleInputChange("status", v)}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Select Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
              <SelectItem value="Draft">Draft</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-xs text-muted-foreground mb-1.5">Description</label>
        <Textarea
          placeholder="Enter description"
          value={formData.description}
          onChange={(e) => handleInputChange("description", e.target.value)}
          rows={2}
          className="text-sm resize-none"
        />
      </div>

      {/* Kit Items Section */}
      <div className="border-t border-border pt-3 flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-foreground">Kit Items ({kitItems.filter(item => item.partNo).length})</span>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-1 text-primary border-primary h-8 text-xs" 
            onClick={handleAddNewItem}
          >
            <Plus className="w-3.5 h-3.5" />
            Add Item
          </Button>
        </div>

        <div className="flex-1 overflow-auto min-h-0">
          {kitItems.length === 0 ? (
            <div className="border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center h-full min-h-[150px]">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <Package className="w-6 h-6 text-primary" />
              </div>
              <p className="font-medium text-foreground text-sm">No items added yet</p>
              <p className="text-xs text-muted-foreground">Click "Add Item" to start building your kit</p>
            </div>
          ) : (
            <div className="space-y-3">
              {kitItems.map((item, index) => (
                <div key={item.id} className="border border-border rounded-lg p-4 bg-background">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
                        <span className="text-primary-foreground text-xs font-medium">{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">Item {index + 1}</p>
                        <p className="text-xs text-muted-foreground">Select part and quantity</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 text-xs gap-1"
                      onClick={() => handleRemoveItem(item.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remove
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1.5">
                        Part <span className="text-destructive">*</span>
                      </label>
                      <Select 
                        value={availableParts.find(p => p.partNo === item.partNo)?.id || ""} 
                        onValueChange={(v) => handlePartSelect(item.id, v)}
                      >
                        <SelectTrigger className="h-9 text-sm w-full">
                          <SelectValue placeholder="Select part" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover">
                          {availableParts.map((part) => (
                            <SelectItem key={part.id} value={part.id}>
                              {part.partNo} - {part.name} (Rs {part.cost.toFixed(2)})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-32">
                      <label className="block text-xs text-muted-foreground mb-1.5">
                        Quantity <span className="text-destructive">*</span>
                      </label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 1)}
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-2 mt-4 pt-4 border-t border-border">
        <Button className="flex-1" onClick={handleSave}>
          Update Kit
        </Button>
        <Button 
          variant="outline" 
          className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
          onClick={() => onDelete(kit)}
        >
          Delete
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
};
