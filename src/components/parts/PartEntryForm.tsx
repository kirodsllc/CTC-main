import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Image as ImageIcon, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Part } from "./PartsList";

interface ModelQuantity {
  id: string;
  model: string;
  qty: number;
}

interface PartFormData {
  masterPartNo: string;
  partNo: string;
  brand: string;
  description: string;
  category: string;
  subCategory: string;
  application: string;
  hsCode: string;
  uom: string;
  weight: string;
  reOrderLevel: string;
  cost: string;
  priceA: string;
  priceB: string;
  priceM: string;
  origin: string;
  grade: string;
  status: string;
  smc: string;
  size: string;
  remarks: string;
}

const initialFormData: PartFormData = {
  masterPartNo: "",
  partNo: "",
  brand: "",
  description: "",
  category: "",
  subCategory: "",
  application: "",
  hsCode: "",
  uom: "NOS",
  weight: "",
  reOrderLevel: "0",
  cost: "0.00",
  priceA: "0.00",
  priceB: "0.00",
  priceM: "0.00",
  origin: "",
  grade: "B",
  status: "A",
  smc: "",
  size: "",
  remarks: "",
};

interface PartEntryFormProps {
  onSave: (part: PartFormData & { modelQuantities: ModelQuantity[] }) => void;
  selectedPart?: Part | null;
  onClearSelection?: () => void;
}

export const PartEntryForm = ({ onSave, selectedPart, onClearSelection }: PartEntryFormProps) => {
  const [formData, setFormData] = useState<PartFormData>(initialFormData);
  const [modelQuantities, setModelQuantities] = useState<ModelQuantity[]>([
    { id: "1", model: "", qty: 0 },
  ]);
  const [imageP1, setImageP1] = useState<string | null>(null);
  const [imageP2, setImageP2] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const prevSelectedPartId = useRef<string | null>(null);
  const fileInputP1Ref = useRef<HTMLInputElement>(null);
  const fileInputP2Ref = useRef<HTMLInputElement>(null);

  // Populate form when a part is selected (only on new selection, not re-renders)
  useEffect(() => {
    if (selectedPart && selectedPart.id !== prevSelectedPartId.current) {
      // Fetch full part data including images
      const loadPartData = async () => {
        try {
          const { apiClient } = await import("@/lib/api");
          const response = await apiClient.getPart(selectedPart.id);
          // Handle both response.data and direct response
          const part = response.data || response;
          if (part && part.id) {
            setFormData({
              ...initialFormData,
              masterPartNo: part.master_part_no || "",
              partNo: part.part_no || selectedPart.partNo,
              brand: part.brand_name || selectedPart.brand || "",
              uom: part.uom || selectedPart.uom || "NOS",
              cost: part.cost?.toString() || selectedPart.cost?.toString() || "0.00",
              priceA: part.price_a?.toString() || selectedPart.price?.toString() || "0.00",
              priceB: part.price_b?.toString() || "0.00",
              priceM: part.price_m?.toString() || "0.00",
              description: part.description || "",
              category: part.category_name || "",
              subCategory: part.subcategory_name || "",
              application: part.application_name || "",
              hsCode: part.hs_code || "",
              weight: part.weight?.toString() || "",
              reOrderLevel: part.reorder_level?.toString() || "0",
              smc: part.smc || "",
              size: part.size || "",
              status: part.status === "active" ? "A" : "N",
              origin: part.origin || "",
              grade: part.grade || "B",
              remarks: part.remarks || "",
            });
            // Load images from the part
            setImageP1(part.image_p1 || null);
            setImageP2(part.image_p2 || null);
            // Load models from the database
            if (part.models && Array.isArray(part.models) && part.models.length > 0) {
              setModelQuantities(
                part.models.map((m: any, index: number) => ({
                  id: m.id || `model-${index}`,
                  model: m.name || "",
                  qty: m.qty_used || m.qtyUsed || 0,
                }))
              );
            } else {
              // If no models, set default empty model
              setModelQuantities([{ id: "1", model: "", qty: 0 }]);
            }
            setIsEditing(true);
            prevSelectedPartId.current = selectedPart.id;
            toast({
              title: "Part Selected",
              description: `Loaded details for part "${part.part_no || selectedPart.partNo}"`,
            });
          } else {
            throw new Error("Invalid part data received");
          }
        } catch (error) {
          console.error("Error loading part data:", error);
          toast({
            title: "Error",
            description: "Failed to load part details. Please try again.",
            variant: "destructive",
          });
          // Fallback to basic data if API call fails
          setFormData({
            ...initialFormData,
            partNo: selectedPart.partNo,
            brand: selectedPart.brand || "",
            uom: selectedPart.uom || "NOS",
            cost: selectedPart.cost?.toString() || "0.00",
            priceA: selectedPart.price?.toString() || "0.00",
          });
          setImageP1(null);
          setImageP2(null);
          setModelQuantities([{ id: "1", model: "", qty: 0 }]);
          setIsEditing(true);
          prevSelectedPartId.current = selectedPart.id;
        }
      };
      loadPartData();
    } else if (!selectedPart) {
      prevSelectedPartId.current = null;
      setImageP1(null);
      setImageP2(null);
      setIsEditing(false);
    }
  }, [selectedPart]);

  const handleInputChange = (field: keyof PartFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddModel = () => {
    setModelQuantities((prev) => [
      ...prev,
      { id: Date.now().toString(), model: "", qty: 0 },
    ]);
  };

  const handleRemoveModel = (id: string) => {
    setModelQuantities((prev) => prev.filter((m) => m.id !== id));
  };

  const handleModelChange = (id: string, field: "model" | "qty", value: string | number) => {
    setModelQuantities((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  };

  const handleSave = () => {
    if (!formData.partNo.trim()) {
      toast({
        title: "Validation Error",
        description: "Part No/SSP# is required",
        variant: "destructive",
      });
      return;
    }
    onSave({ ...formData, modelQuantities, imageP1, imageP2 });
    setFormData(initialFormData);
    setModelQuantities([{ id: "1", model: "", qty: 0 }]);
    setImageP1(null);
    setImageP2(null);
    setIsEditing(false);
    toast({
      title: "Success",
      description: "Part saved successfully",
    });
  };

  const handleReset = () => {
    setFormData(initialFormData);
    setModelQuantities([{ id: "1", model: "", qty: 0 }]);
    setImageP1(null);
    setImageP2(null);
    setIsEditing(false);
    onClearSelection?.();
    toast({
      title: "Form Reset",
      description: "All fields have been reset to default values",
    });
  };

  const handleImageUpload = (
    event: React.ChangeEvent<HTMLInputElement>,
    setImage: React.Dispatch<React.SetStateAction<string | null>>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex gap-3 h-full">
      {/* Left Panel - Part Form */}
      <div className="flex-1 bg-card rounded-lg border border-border overflow-auto">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-0.5 h-8 bg-primary rounded-full" />
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  {isEditing ? "Edit Part" : "Create New Part"}
                </h2>
                <p className="text-muted-foreground text-xs">
                  {isEditing ? "Update existing part details" : "Add a new inventory part"}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="h-7 text-xs px-3" onClick={handleReset}>
              New
            </Button>
          </div>

          {/* Part Information Section */}
          <div className="mb-4">
            <div className="flex items-center gap-1.5 mb-3">
              <span className="text-primary text-xs">•</span>
              <span className="text-xs font-medium text-foreground">PART INFORMATION</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Master Part #</label>
                <Input
                  placeholder="Type to search or press"
                  value={formData.masterPartNo}
                  onChange={(e) => handleInputChange("masterPartNo", e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  Part No/SSP# <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="Select master part num"
                  value={formData.partNo}
                  onChange={(e) => handleInputChange("partNo", e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Brand</label>
                <Input
                  placeholder="Enter Part No/SSP# first"
                  value={formData.brand}
                  onChange={(e) => handleInputChange("brand", e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="mb-3">
              <label className="block text-xs text-muted-foreground mb-1">Description</label>
              <Textarea
                placeholder="Enter part description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                rows={2}
                className="text-xs min-h-[60px]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Category</label>
                <Input
                  placeholder="Type to search or press"
                  value={formData.category}
                  onChange={(e) => handleInputChange("category", e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Sub Category</label>
                <Input
                  placeholder="Select category first"
                  value={formData.subCategory}
                  onChange={(e) => handleInputChange("subCategory", e.target.value)}
                  disabled={!formData.category}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Application</label>
                <Input
                  placeholder="Please select a sub-cate"
                  value={formData.application}
                  onChange={(e) => handleInputChange("application", e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">HS Code</label>
                <Input
                  placeholder="Enter HS code"
                  value={formData.hsCode}
                  onChange={(e) => handleInputChange("hsCode", e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">UOM (A-Z)</label>
                <Select value={formData.uom} onValueChange={(v) => handleInputChange("uom", v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select UOM" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NOS" className="text-xs">NOS</SelectItem>
                    <SelectItem value="SET" className="text-xs">SET</SelectItem>
                    <SelectItem value="KG" className="text-xs">KG</SelectItem>
                    <SelectItem value="LTR" className="text-xs">LTR</SelectItem>
                    <SelectItem value="MTR" className="text-xs">MTR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Weight (Kg)</label>
                <Input
                  type="number"
                  placeholder=""
                  value={formData.weight}
                  onChange={(e) => handleInputChange("weight", e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Re-Order Level</label>
                <Input
                  type="number"
                  value={formData.reOrderLevel}
                  onChange={(e) => handleInputChange("reOrderLevel", e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Cost</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.cost}
                  onChange={(e) => handleInputChange("cost", e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Price-A</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.priceA}
                  onChange={(e) => handleInputChange("priceA", e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Price-B</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.priceB}
                  onChange={(e) => handleInputChange("priceB", e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Price-M</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.priceM}
                  onChange={(e) => handleInputChange("priceM", e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Origin</label>
                <Select value={formData.origin} onValueChange={(v) => handleInputChange("origin", v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select Origin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PRC" className="text-xs">PRC</SelectItem>
                    <SelectItem value="ITAL" className="text-xs">ITAL</SelectItem>
                    <SelectItem value="USA" className="text-xs">USA</SelectItem>
                    <SelectItem value="TURK" className="text-xs">TURK</SelectItem>
                    <SelectItem value="IND" className="text-xs">IND</SelectItem>
                    <SelectItem value="UK" className="text-xs">UK</SelectItem>
                    <SelectItem value="CHN" className="text-xs">CHN</SelectItem>
                    <SelectItem value="SAM" className="text-xs">SAM</SelectItem>
                    <SelectItem value="TAIW" className="text-xs">TAIW</SelectItem>
                    <SelectItem value="KOR" className="text-xs">KOR</SelectItem>
                    <SelectItem value="GER" className="text-xs">GER</SelectItem>
                    <SelectItem value="JAP" className="text-xs">JAP</SelectItem>
                    <SelectItem value="AFR" className="text-xs">AFR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Grade (A/B/C/D)</label>
                <Select value={formData.grade} onValueChange={(v) => handleInputChange("grade", v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select Grade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A" className="text-xs">A</SelectItem>
                    <SelectItem value="B" className="text-xs">B</SelectItem>
                    <SelectItem value="C" className="text-xs">C</SelectItem>
                    <SelectItem value="D" className="text-xs">D</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Status (A/N)</label>
                <Select value={formData.status} onValueChange={(v) => handleInputChange("status", v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A" className="text-xs">A</SelectItem>
                    <SelectItem value="N" className="text-xs">N</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">SMC</label>
                <Input
                  placeholder="Enter SMC"
                  value={formData.smc}
                  onChange={(e) => handleInputChange("smc", e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Size</label>
                <Input
                  placeholder="LxHxW"
                  value={formData.size}
                  onChange={(e) => handleInputChange("size", e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {/* Image Upload Section */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Image P1</label>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputP1Ref}
                  className="hidden"
                  onChange={(e) => handleImageUpload(e, setImageP1)}
                />
                <div 
                  className="relative border border-dashed border-border rounded p-2 flex flex-col items-center justify-center hover:border-primary transition-colors cursor-pointer h-16 overflow-hidden"
                  onClick={() => !imageP1 && fileInputP1Ref.current?.click()}
                >
                  {imageP1 ? (
                    <>
                      <img src={imageP1} alt="P1" className="w-full h-full object-cover rounded" />
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setImageP1(null); }}
                        className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full w-4 h-4 flex items-center justify-center hover:bg-destructive/80"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-4 h-4 text-muted-foreground mb-0.5" />
                      <span className="text-[9px] text-muted-foreground">Upload P1</span>
                    </>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Image P2</label>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputP2Ref}
                  className="hidden"
                  onChange={(e) => handleImageUpload(e, setImageP2)}
                />
                <div 
                  className="relative border border-dashed border-border rounded p-2 flex flex-col items-center justify-center hover:border-primary transition-colors cursor-pointer h-16 overflow-hidden"
                  onClick={() => !imageP2 && fileInputP2Ref.current?.click()}
                >
                  {imageP2 ? (
                    <>
                      <img src={imageP2} alt="P2" className="w-full h-full object-cover rounded" />
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setImageP2(null); }}
                        className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full w-4 h-4 flex items-center justify-center hover:bg-destructive/80"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-4 h-4 text-muted-foreground mb-0.5" />
                      <span className="text-[9px] text-muted-foreground">Upload P2</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs text-muted-foreground mb-1">Remarks</label>
              <Textarea
                placeholder="Enter any additional remarks or notes..."
                value={formData.remarks}
                onChange={(e) => handleInputChange("remarks", e.target.value)}
                rows={2}
                className="text-xs min-h-[50px]"
              />
            </div>

            <div className="flex gap-3">
              <Button className="flex-1 gap-1.5 h-8 text-xs" onClick={handleSave}>
                <Plus className="w-3.5 h-3.5" />
                {isEditing ? "Update Part" : "Save Part"}
              </Button>
              <Button variant="outline" className="h-8 text-xs px-4" onClick={handleReset}>
                Reset
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Model and Quantity */}
      <div className="w-56 bg-card rounded-lg border border-border p-3">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-1.5">
              <div className="w-0.5 h-5 bg-primary rounded-full" />
              <span className="text-xs font-medium text-foreground">Model and its</span>
            </div>
            <span className="text-xs font-medium text-foreground ml-2">Quantity used</span>
            <p className="text-[10px] text-muted-foreground ml-2">View part model associations</p>
          </div>
          <Button variant="outline" size="sm" className="h-6 text-xs px-2" onClick={handleAddModel}>
            Add More
          </Button>
        </div>

        <div className="border-t border-border pt-3">
          <div className="grid grid-cols-3 gap-1.5 mb-2 text-xs text-muted-foreground">
            <span>Model</span>
            <span>Qty. Used</span>
            <span>Action</span>
          </div>

          {modelQuantities.map((mq) => (
            <div key={mq.id} className="grid grid-cols-3 gap-1.5 mb-1.5 items-center">
              <Input
                placeholder="Enter mc"
                value={mq.model}
                onChange={(e) => handleModelChange(mq.id, "model", e.target.value)}
                className="h-7 text-xs"
              />
              <Input
                type="number"
                value={mq.qty || ""}
                onChange={(e) => handleModelChange(mq.id, "qty", parseInt(e.target.value) || 0)}
                className="h-7 text-xs"
              />
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => handleRemoveModel(mq.id)}
              >
                ✕
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
