import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Image as ImageIcon, X, Save } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Item } from "./ItemsListView";
import { apiClient } from "@/lib/api";

interface PartFormData {
  masterPartNo: string;
  partNo: string;
  brand: string;
  description: string;
  category: string;
  categoryId: string;
  subCategory: string;
  subCategoryId: string;
  application: string;
  applicationId: string;
  hsCode: string;
  uom: string;
  weight: string;
  reOrderLevel: string;
  cost: string;
  priceA: string;
  priceB: string;
  priceM: string;
  rackNo: string;
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
  categoryId: "",
  subCategory: "",
  subCategoryId: "",
  application: "",
  applicationId: "",
  hsCode: "",
  uom: "NOS",
  weight: "",
  reOrderLevel: "0",
  cost: "0.00",
  priceA: "0.00",
  priceB: "0.00",
  priceM: "0.00",
  rackNo: "",
  origin: "",
  grade: "B",
  status: "A",
  smc: "",
  size: "",
  remarks: "",
};

interface CompactPartFormProps {
  onSave: (part: PartFormData & { imageP1?: string | null; imageP2?: string | null }, isEdit: boolean, editItemId?: string) => void;
  onCancel: () => void;
  editItem?: Item | null;
}

export const CompactPartForm = ({ onSave, onCancel, editItem }: CompactPartFormProps) => {
  const [formData, setFormData] = useState<PartFormData>(initialFormData);
  const [imageP1, setImageP1] = useState<string | null>(null);
  const [imageP2, setImageP2] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isEditing = !!editItem;

  // Dropdown data
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [subcategories, setSubcategories] = useState<{ id: string; name: string; categoryId: string }[]>([]);
  const [applications, setApplications] = useState<{ id: string; name: string; subcategoryId: string }[]>([]);
  const [brands, setBrands] = useState<{ id: string; name: string }[]>([]);
  const [masterParts, setMasterParts] = useState<string[]>([]);
  const [categorySearch, setCategorySearch] = useState("");
  const [subcategorySearch, setSubcategorySearch] = useState("");
  const [applicationSearch, setApplicationSearch] = useState("");
  const [brandSearch, setBrandSearch] = useState("");
  const [masterPartSearch, setMasterPartSearch] = useState("");

  const fileInputP1Ref = useRef<HTMLInputElement>(null);
  const fileInputP2Ref = useRef<HTMLInputElement>(null);

  // Fetch dropdown data
  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const [catsRes, brandsRes, masterPartsRes] = await Promise.all([
          apiClient.getCategories(),
          apiClient.getBrands(),
          apiClient.getMasterParts(),
        ]);

        if (catsRes.data) setCategories(Array.isArray(catsRes.data) ? catsRes.data : []);
        if (brandsRes.data) setBrands(Array.isArray(brandsRes.data) ? brandsRes.data : []);
        if (masterPartsRes.data) setMasterParts(Array.isArray(masterPartsRes.data) ? masterPartsRes.data : []);
      } catch (error) {
        console.error("Error fetching dropdown data:", error);
      }
    };

    fetchDropdownData();
  }, []);

  // Fetch subcategories when category changes
  useEffect(() => {
    if (formData.categoryId) {
      const fetchSubcategories = async () => {
        try {
          const res = await apiClient.getSubcategories(formData.categoryId);
          if (res.data) {
            setSubcategories(Array.isArray(res.data) ? res.data : []);
          }
        } catch (error) {
          console.error("Error fetching subcategories:", error);
        }
      };
      fetchSubcategories();
    } else {
      setSubcategories([]);
      setFormData(prev => ({ ...prev, subCategory: "", subCategoryId: "", application: "", applicationId: "" }));
    }
  }, [formData.categoryId]);

  // Fetch applications when subcategory changes
  useEffect(() => {
    if (formData.subCategoryId) {
      const fetchApplications = async () => {
        try {
          const res = await apiClient.getApplications(formData.subCategoryId);
          if (res.data) {
            setApplications(Array.isArray(res.data) ? res.data : []);
          }
        } catch (error) {
          console.error("Error fetching applications:", error);
        }
      };
      fetchApplications();
    } else {
      setApplications([]);
      setFormData(prev => ({ ...prev, application: "", applicationId: "" }));
    }
  }, [formData.subCategoryId]);

  // Load full part data when editing
  useEffect(() => {
    const loadPartData = async () => {
      if (editItem?.id) {
        setLoading(true);
        try {
          const response = await apiClient.getPart(editItem.id);
          if (response.data) {
            const part = response.data;
            setFormData({
              masterPartNo: part.master_part_no || "",
              partNo: part.part_no || "",
              brand: part.brand_name || "",
              description: part.description || "",
              category: part.category_name || "",
              categoryId: part.category_id || "",
              subCategory: part.subcategory_name || "",
              subCategoryId: part.subcategory_id || "",
              application: part.application_name || "",
              applicationId: part.application_id || "",
              hsCode: part.hs_code || "",
              uom: part.uom || "NOS",
              weight: part.weight?.toString() || "",
              reOrderLevel: part.reorder_level?.toString() || "0",
              cost: part.cost?.toString() || "0.00",
              priceA: part.price_a?.toString() || "0.00",
              priceB: part.price_b?.toString() || "0.00",
              priceM: part.price_m?.toString() || "0.00",
              rackNo: "",
              origin: "",
              grade: "B",
              status: part.status === "active" ? "A" : "N",
              smc: part.smc || "",
              size: part.size || "",
              remarks: "",
            });
            setImageP1(part.image_p1 || null);
            setImageP2(part.image_p2 || null);
          }
        } catch (error: any) {
          console.error("Error loading part data:", error);
          toast({
            title: "Error",
            description: "Failed to load part details",
            variant: "destructive",
          });
        } finally {
          setLoading(false);
        }
      } else {
        setFormData(initialFormData);
        setImageP1(null);
        setImageP2(null);
      }
    };

    loadPartData();
  }, [editItem?.id]);

  const handleInputChange = (field: keyof PartFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCategorySelect = (categoryId: string, categoryName: string) => {
    setFormData(prev => ({
      ...prev,
      category: categoryName,
      categoryId: categoryId,
      subCategory: "",
      subCategoryId: "",
      application: "",
      applicationId: "",
    }));
    setCategorySearch("");
  };

  const handleSubcategorySelect = (subcategoryId: string, subcategoryName: string) => {
    setFormData(prev => ({
      ...prev,
      subCategory: subcategoryName,
      subCategoryId: subcategoryId,
      application: "",
      applicationId: "",
    }));
    setSubcategorySearch("");
  };

  const handleApplicationSelect = (applicationId: string, applicationName: string) => {
    setFormData(prev => ({
      ...prev,
      application: applicationName,
      applicationId: applicationId,
    }));
    setApplicationSearch("");
  };

  const handleBrandSelect = (brandName: string) => {
    setFormData(prev => ({ ...prev, brand: brandName }));
    setBrandSearch("");
  };

  const handleMasterPartSelect = (masterPart: string) => {
    setFormData(prev => ({ ...prev, masterPartNo: masterPart }));
    setMasterPartSearch("");
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>, setImage: React.Dispatch<React.SetStateAction<string | null>>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "Image size must be less than 5MB",
          variant: "destructive",
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
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
    onSave(
      { 
        ...formData, 
        imageP1, 
        imageP2 
      }, 
      isEditing, 
      editItem?.id
    );
  };

  const handleReset = () => {
    if (editItem?.id) {
      // Reload original data
      const loadPartData = async () => {
        setLoading(true);
        try {
          const response = await apiClient.getPart(editItem.id);
          if (response.data) {
            const part = response.data;
            setFormData({
              masterPartNo: part.master_part_no || "",
              partNo: part.part_no || "",
              brand: part.brand_name || "",
              description: part.description || "",
              category: part.category_name || "",
              categoryId: part.category_id || "",
              subCategory: part.subcategory_name || "",
              subCategoryId: part.subcategory_id || "",
              application: part.application_name || "",
              applicationId: part.application_id || "",
              hsCode: part.hs_code || "",
              uom: part.uom || "NOS",
              weight: part.weight?.toString() || "",
              reOrderLevel: part.reorder_level?.toString() || "0",
              cost: part.cost?.toString() || "0.00",
              priceA: part.price_a?.toString() || "0.00",
              priceB: part.price_b?.toString() || "0.00",
              priceM: part.price_m?.toString() || "0.00",
              rackNo: "",
              origin: "",
              grade: "B",
              status: part.status === "active" ? "A" : "N",
              smc: part.smc || "",
              size: part.size || "",
              remarks: "",
            });
            setImageP1(part.image_p1 || null);
            setImageP2(part.image_p2 || null);
          }
        } catch (error) {
          console.error("Error loading part data:", error);
        } finally {
          setLoading(false);
        }
      };
      loadPartData();
    } else {
      setFormData(initialFormData);
      setImageP1(null);
      setImageP2(null);
    }
  };

  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(categorySearch.toLowerCase())
  );
  const filteredSubcategories = subcategories.filter(sub =>
    sub.name.toLowerCase().includes(subcategorySearch.toLowerCase())
  );
  const filteredApplications = applications.filter(app =>
    app.name.toLowerCase().includes(applicationSearch.toLowerCase())
  );
  const filteredBrands = brands.filter(b =>
    b.name.toLowerCase().includes(brandSearch.toLowerCase())
  );
  const filteredMasterParts = masterParts.filter(mp =>
    mp.toLowerCase().includes(masterPartSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading part data...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-card rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-0.5 h-6 bg-primary rounded-full" />
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              {isEditing ? "Update Part" : "Create New Part"}
            </h2>
            <p className="text-muted-foreground text-[10px]">
              {isEditing ? `Editing: ${formData.partNo || editItem?.partNo}` : "Add a new inventory part"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isEditing && (
            <Button variant="outline" size="sm" className="h-7 text-xs px-3" onClick={handleReset}>
              New
            </Button>
          )}
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Scrollable Form Content */}
      <div className="flex-1 overflow-auto p-4">
        {/* Part Information Section */}
        <div className="flex items-center gap-1.5 mb-3">
          <span className="text-primary text-xs">•</span>
          <span className="text-[10px] font-medium text-foreground uppercase tracking-wide">PART INFORMATION</span>
        </div>

        {/* Row 1: Master Part, Part No, Brand */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-2">
          <div>
            <label className="block text-[10px] text-muted-foreground mb-0.5">Master Part #</label>
            <div className="relative">
              <Input
                placeholder="Type to search or press Enter to add new"
                value={masterPartSearch || formData.masterPartNo}
                onChange={(e) => {
                  setMasterPartSearch(e.target.value);
                  if (!e.target.value) {
                    setFormData(prev => ({ ...prev, masterPartNo: "" }));
                  }
                }}
                onFocus={() => setMasterPartSearch(formData.masterPartNo)}
                className="h-7 text-xs"
              />
              {masterPartSearch && filteredMasterParts.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-40 overflow-auto">
                  {filteredMasterParts.map((mp) => (
                    <div
                      key={mp}
                      className="px-2 py-1.5 text-xs hover:bg-muted cursor-pointer"
                      onClick={() => handleMasterPartSelect(mp)}
                    >
                      {mp}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="block text-[10px] text-muted-foreground mb-0.5">
              Part No/SSP# <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="Enter part number"
              value={formData.partNo}
              onChange={(e) => handleInputChange("partNo", e.target.value)}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <label className="block text-[10px] text-muted-foreground mb-0.5">Brand</label>
            <div className="relative">
              <Input
                placeholder="Type to search or enter new"
                value={brandSearch || formData.brand}
                onChange={(e) => {
                  setBrandSearch(e.target.value);
                  if (!e.target.value) {
                    setFormData(prev => ({ ...prev, brand: "" }));
                  }
                }}
                onFocus={() => setBrandSearch(formData.brand)}
                className="h-7 text-xs"
              />
              {brandSearch && filteredBrands.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-40 overflow-auto">
                  {filteredBrands.map((b) => (
                    <div
                      key={b.id}
                      className="px-2 py-1.5 text-xs hover:bg-muted cursor-pointer"
                      onClick={() => handleBrandSelect(b.name)}
                    >
                      {b.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="mb-2">
          <label className="block text-[10px] text-muted-foreground mb-0.5">Description</label>
          <Textarea
            placeholder="Enter part description"
            value={formData.description}
            onChange={(e) => handleInputChange("description", e.target.value)}
            rows={2}
            className="text-xs min-h-[50px] resize-none"
          />
        </div>

        {/* Row 2: Category, Sub Category, Application */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-2">
          <div>
            <label className="block text-[10px] text-muted-foreground mb-0.5">Category</label>
            <div className="relative">
              <Input
                placeholder="Type to search or press Enter to add new"
                value={categorySearch || formData.category}
                onChange={(e) => {
                  setCategorySearch(e.target.value);
                  if (!e.target.value) {
                    setFormData(prev => ({ ...prev, category: "", categoryId: "" }));
                  }
                }}
                onFocus={() => setCategorySearch(formData.category)}
                className="h-7 text-xs"
              />
              {categorySearch && filteredCategories.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-40 overflow-auto">
                  {filteredCategories.map((cat) => (
                    <div
                      key={cat.id}
                      className="px-2 py-1.5 text-xs hover:bg-muted cursor-pointer"
                      onClick={() => handleCategorySelect(cat.id, cat.name)}
                    >
                      {cat.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="block text-[10px] text-muted-foreground mb-0.5">Sub Category</label>
            <div className="relative">
              <Input
                placeholder="Select category first"
                value={subcategorySearch || formData.subCategory}
                onChange={(e) => {
                  setSubcategorySearch(e.target.value);
                  if (!e.target.value) {
                    setFormData(prev => ({ ...prev, subCategory: "", subCategoryId: "" }));
                  }
                }}
                onFocus={() => setSubcategorySearch(formData.subCategory)}
                disabled={!formData.categoryId}
                className="h-7 text-xs"
              />
              {subcategorySearch && filteredSubcategories.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-40 overflow-auto">
                  {filteredSubcategories.map((sub) => (
                    <div
                      key={sub.id}
                      className="px-2 py-1.5 text-xs hover:bg-muted cursor-pointer"
                      onClick={() => handleSubcategorySelect(sub.id, sub.name)}
                    >
                      {sub.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="block text-[10px] text-muted-foreground mb-0.5">Application</label>
            <div className="relative">
              <Input
                placeholder="Please select a sub-category first"
                value={applicationSearch || formData.application}
                onChange={(e) => {
                  setApplicationSearch(e.target.value);
                  if (!e.target.value) {
                    setFormData(prev => ({ ...prev, application: "", applicationId: "" }));
                  }
                }}
                onFocus={() => setApplicationSearch(formData.application)}
                disabled={!formData.subCategoryId}
                className="h-7 text-xs"
              />
              {applicationSearch && filteredApplications.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-40 overflow-auto">
                  {filteredApplications.map((app) => (
                    <div
                      key={app.id}
                      className="px-2 py-1.5 text-xs hover:bg-muted cursor-pointer"
                      onClick={() => handleApplicationSelect(app.id, app.name)}
                    >
                      {app.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Row 3: HS Code, UOM, Weight */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-2">
          <div>
            <label className="block text-[10px] text-muted-foreground mb-0.5">HS Code</label>
            <Input
              placeholder="Enter HS code"
              value={formData.hsCode}
              onChange={(e) => handleInputChange("hsCode", e.target.value)}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <label className="block text-[10px] text-muted-foreground mb-0.5">UOM (A-Z)</label>
            <Select value={formData.uom} onValueChange={(v) => handleInputChange("uom", v)}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue placeholder="Select UOM" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NOS" className="text-xs">NOS</SelectItem>
                <SelectItem value="SET" className="text-xs">SET</SelectItem>
                <SelectItem value="KG" className="text-xs">KG</SelectItem>
                <SelectItem value="LTR" className="text-xs">LTR</SelectItem>
                <SelectItem value="MTR" className="text-xs">MTR</SelectItem>
                <SelectItem value="PCS" className="text-xs">PCS</SelectItem>
                <SelectItem value="BOX" className="text-xs">BOX</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-[10px] text-muted-foreground mb-0.5">Weight (Kg)</label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.weight}
              onChange={(e) => handleInputChange("weight", e.target.value)}
              className="h-7 text-xs"
            />
          </div>
        </div>

        {/* Row 4: Re-Order Level, Cost */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
          <div>
            <label className="block text-[10px] text-muted-foreground mb-0.5">Re-Order Level</label>
            <Input
              type="number"
              value={formData.reOrderLevel}
              onChange={(e) => handleInputChange("reOrderLevel", e.target.value)}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <label className="block text-[10px] text-muted-foreground mb-0.5">Cost</label>
            <Input
              type="number"
              step="0.01"
              value={formData.cost}
              onChange={(e) => handleInputChange("cost", e.target.value)}
              className="h-7 text-xs"
            />
          </div>
        </div>

        {/* Row 5: Price-A, Price-B, Price-M */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-2">
          <div>
            <label className="block text-[10px] text-muted-foreground mb-0.5">Price-A</label>
            <Input
              type="number"
              step="0.01"
              value={formData.priceA}
              onChange={(e) => handleInputChange("priceA", e.target.value)}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <label className="block text-[10px] text-muted-foreground mb-0.5">Price-B</label>
            <Input
              type="number"
              step="0.01"
              value={formData.priceB}
              onChange={(e) => handleInputChange("priceB", e.target.value)}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <label className="block text-[10px] text-muted-foreground mb-0.5">Price-M</label>
            <Input
              type="number"
              step="0.01"
              value={formData.priceM}
              onChange={(e) => handleInputChange("priceM", e.target.value)}
              className="h-7 text-xs"
            />
          </div>
        </div>

        {/* Row 6: Origin, Grade */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
          <div>
            <label className="block text-[10px] text-muted-foreground mb-0.5">Origin</label>
            <Select value={formData.origin} onValueChange={(v) => handleInputChange("origin", v)}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue placeholder="Select Origin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="local" className="text-xs">Local</SelectItem>
                <SelectItem value="import" className="text-xs">Import</SelectItem>
                <SelectItem value="china" className="text-xs">China</SelectItem>
                <SelectItem value="japan" className="text-xs">Japan</SelectItem>
                <SelectItem value="germany" className="text-xs">Germany</SelectItem>
                <SelectItem value="usa" className="text-xs">USA</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-[10px] text-muted-foreground mb-0.5">Grade (A/B/C/D)</label>
            <Select value={formData.grade} onValueChange={(v) => handleInputChange("grade", v)}>
              <SelectTrigger className="h-7 text-xs">
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

        {/* Row 7: Status, SMC, Size */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-2">
          <div>
            <label className="block text-[10px] text-muted-foreground mb-0.5">Status (A/N)</label>
            <Select value={formData.status} onValueChange={(v) => handleInputChange("status", v)}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue placeholder="Select Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A" className="text-xs">Active (A)</SelectItem>
                <SelectItem value="N" className="text-xs">Inactive (N)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-[10px] text-muted-foreground mb-0.5">SMC</label>
            <Input
              placeholder="Enter SMC"
              value={formData.smc}
              onChange={(e) => handleInputChange("smc", e.target.value)}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <label className="block text-[10px] text-muted-foreground mb-0.5">Size</label>
            <Input
              placeholder="LxHxW"
              value={formData.size}
              onChange={(e) => handleInputChange("size", e.target.value)}
              className="h-7 text-xs"
            />
          </div>
        </div>

        {/* Image Upload Section */}
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div>
            <label className="block text-[10px] text-muted-foreground mb-0.5">Image P1</label>
            {imageP1 ? (
              <div className="relative border border-border rounded p-1 h-16">
                <img 
                  src={imageP1} 
                  alt="Image P1" 
                  className="w-full h-full object-cover rounded"
                />
                <Button 
                  variant="destructive" 
                  size="sm" 
                  className="absolute top-1 right-1 h-4 w-4 p-0"
                  onClick={() => setImageP1(null)}
                >
                  <X className="w-2.5 h-2.5" />
                </Button>
              </div>
            ) : (
              <div 
                className="border border-dashed border-border rounded p-1 flex flex-col items-center justify-center hover:border-primary transition-colors cursor-pointer h-16"
                onClick={() => fileInputP1Ref.current?.click()}
              >
                <ImageIcon className="w-3 h-3 text-muted-foreground mb-0.5" />
                <span className="text-[8px] text-muted-foreground">Upload P1</span>
                <input
                  ref={fileInputP1Ref}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageUpload(e, setImageP1)}
                />
              </div>
            )}
          </div>
          <div>
            <label className="block text-[10px] text-muted-foreground mb-0.5">Image P2</label>
            {imageP2 ? (
              <div className="relative border border-border rounded p-1 h-16">
                <img 
                  src={imageP2} 
                  alt="Image P2" 
                  className="w-full h-full object-cover rounded"
                />
                <Button 
                  variant="destructive" 
                  size="sm" 
                  className="absolute top-1 right-1 h-4 w-4 p-0"
                  onClick={() => setImageP2(null)}
                >
                  <X className="w-2.5 h-2.5" />
                </Button>
              </div>
            ) : (
              <div 
                className="border border-dashed border-border rounded p-1 flex flex-col items-center justify-center hover:border-primary transition-colors cursor-pointer h-16"
                onClick={() => fileInputP2Ref.current?.click()}
              >
                <ImageIcon className="w-3 h-3 text-muted-foreground mb-0.5" />
                <span className="text-[8px] text-muted-foreground">Upload P2</span>
                <input
                  ref={fileInputP2Ref}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageUpload(e, setImageP2)}
                />
              </div>
            )}
          </div>
        </div>

        {/* Remarks */}
        <div className="mb-3">
          <label className="block text-[10px] text-muted-foreground mb-0.5">Remarks</label>
          <Textarea
            placeholder="Enter any additional remarks or notes..."
            value={formData.remarks}
            onChange={(e) => handleInputChange("remarks", e.target.value)}
            rows={2}
            className="text-xs min-h-[40px] resize-none"
          />
        </div>
      </div>

      {/* Fixed Save Button */}
      <div className="p-4 border-t border-border bg-card">
        <div className="flex justify-center gap-2">
          <Button className="gap-1.5 h-8 text-xs px-6" onClick={handleSave}>
            {isEditing ? <Save className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {isEditing ? "Update Part" : "Save Part"}
          </Button>
          {isEditing && (
            <Button 
              variant="outline" 
              className="h-8 text-xs px-4" 
              onClick={handleReset}
            >
              Reset
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
