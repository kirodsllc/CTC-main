import { useState } from "react";
import { Search, Download, Printer, Plus, Upload, CheckCircle, Edit, Trash2, ChevronDown, Image, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { CompactPartForm } from "./CompactPartForm";
import { KitsList, Kit } from "./KitsList";

export interface Item {
  id: string;
  masterPartNo: string;
  partNo: string;
  brand: string;
  description: string;
  category: string;
  subCategory: string;
  application: string;
  status: "Active" | "Inactive";
  images: string[];
}

interface ItemsListViewProps {
  items: Item[];
  onEdit?: (item: Item) => void;
  onDelete?: (item: Item) => void;
  onAddNew?: () => void;
  onStatusChange?: (item: Item, newStatus: "Active" | "Inactive") => void;
  showForm?: boolean;
  onCancelForm?: () => void;
  onSavePart?: (partData: any, isEdit: boolean, editItemId?: string) => void;
  editItem?: Item | null;
  kits?: Kit[];
  onDeleteKit?: (kit: Kit) => void;
  onUpdateKit?: (kit: Kit) => void;
}

type ListTab = "parts-list" | "kits-list";

export const ItemsListView = ({ items, onEdit, onDelete, onAddNew, onStatusChange, showForm = false, onCancelForm, onSavePart, editItem, kits = [], onDeleteKit, onUpdateKit }: ItemsListViewProps) => {
  const { toast } = useToast();
  const [listTab, setListTab] = useState<ListTab>("parts-list");
  const [searchQuery, setSearchQuery] = useState("");
  const [masterPartNoFilter, setMasterPartNoFilter] = useState("");
  const [partNoFilter, setPartNoFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [descriptionFilter, setDescriptionFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [subCategoryFilter, setSubCategoryFilter] = useState("all");
  const [applicationFilter, setApplicationFilter] = useState("all");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null);

  const categories = [...new Set(items.map(item => item.category).filter(Boolean))];
  const subCategories = [...new Set(items.map(item => item.subCategory).filter(Boolean))];
  const applications = [...new Set(items.map(item => item.application).filter(Boolean))];

  const filteredItems = items.filter(item => {
    const matchesSearch = searchQuery === "" || 
      Object.values(item).some(val => 
        String(val).toLowerCase().includes(searchQuery.toLowerCase())
      );
    const matchesMasterPartNo = masterPartNoFilter === "" || 
      item.masterPartNo.toLowerCase().includes(masterPartNoFilter.toLowerCase());
    const matchesPartNo = partNoFilter === "" || 
      item.partNo.toLowerCase().includes(partNoFilter.toLowerCase());
    const matchesBrand = brandFilter === "" || 
      item.brand.toLowerCase().includes(brandFilter.toLowerCase());
    const matchesDescription = descriptionFilter === "" || 
      item.description.toLowerCase().includes(descriptionFilter.toLowerCase());
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    const matchesSubCategory = subCategoryFilter === "all" || item.subCategory === subCategoryFilter;
    const matchesApplication = applicationFilter === "all" || item.application === applicationFilter;

    return matchesSearch && matchesMasterPartNo && matchesPartNo && matchesBrand && 
           matchesDescription && matchesCategory && matchesSubCategory && matchesApplication;
  });

  const handleSelectAll = () => {
    if (selectedItems.length === filteredItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredItems.map(item => item.id));
    }
  };

  const handleSelectItem = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleDownloadCSV = () => {
    const headers = ["Master Part No", "Part No", "Brand", "Description", "Category", "Sub Category", "Application", "Status"];
    const csvData = filteredItems.map(item => [
      item.masterPartNo, item.partNo, item.brand, item.description,
      item.category, item.subCategory, item.application, item.status
    ]);
    const csvContent = [headers.join(","), ...csvData.map(row => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "parts-list.csv";
    a.click();
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDeleteConfirm = () => {
    if (itemToDelete) {
      // Check if item is used in any kit (foreign key constraint simulation)
      const itemUsedInKits = kits.filter(kit => 
        kit.items?.some(item => item.id === itemToDelete.id || item.partNo === itemToDelete.partNo)
      );
      
      if (itemUsedInKits.length > 0) {
        toast({
          title: "Cannot Delete Item",
          description: `There is entry against "${itemToDelete.partNo}". So it cannot be deleted.`,
          variant: "destructive",
        });
        setItemToDelete(null);
        setDeleteConfirmOpen(false);
        return;
      }
      
      onDelete?.(itemToDelete);
      toast({
        title: "Part Deleted",
        description: `${itemToDelete.partNo} has been deleted successfully`,
      });
      setItemToDelete(null);
      setDeleteConfirmOpen(false);
    }
  };

  const handleDownloadSelectedCSV = () => {
    const selectedData = items.filter(item => selectedItems.includes(item.id));
    const headers = ["Master Part No", "Part No", "Brand", "Description", "Category", "Sub Category", "Application", "Status"];
    const csvData = selectedData.map(item => [
      item.masterPartNo, item.partNo, item.brand, item.description,
      item.category, item.subCategory, item.application, item.status
    ]);
    const csvContent = [headers.join(","), ...csvData.map(row => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "selected-parts.csv";
    a.click();
    toast({
      title: "CSV Downloaded",
      description: `${selectedData.length} parts exported successfully`,
    });
  };

  const handlePrintSelected = () => {
    const selectedData = items.filter(item => selectedItems.includes(item.id));
    const printContent = `
      <html>
        <head>
          <title>Selected Parts List</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #333; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
            th { background-color: #f4f4f4; font-weight: bold; }
            tr:nth-child(even) { background-color: #fafafa; }
          </style>
        </head>
        <body>
          <h1>Parts List (${selectedData.length} items)</h1>
          <table>
            <thead>
              <tr>
                <th>Master Part No</th>
                <th>Part No</th>
                <th>Brand</th>
                <th>Description</th>
                <th>Category</th>
                <th>Sub Category</th>
                <th>Application</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${selectedData.map(item => `
                <tr>
                  <td>${item.masterPartNo}</td>
                  <td>${item.partNo}</td>
                  <td>${item.brand}</td>
                  <td>${item.description}</td>
                  <td>${item.category || '-'}</td>
                  <td>${item.subCategory || '-'}</td>
                  <td>${item.application || '-'}</td>
                  <td>${item.status}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
    toast({
      title: "Print Ready",
      description: `Printing ${selectedData.length} parts`,
    });
  };

  // Show compact form when showForm is true
  if (showForm) {
    return (
      <CompactPartForm
        onSave={(partData, isEdit, editItemId) => {
          onSavePart?.(partData, isEdit, editItemId || editItem?.id);
          onCancelForm?.();
        }}
        onCancel={() => onCancelForm?.()}
        editItem={editItem}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2">
          <div className="w-1 h-12 bg-primary rounded-full" />
          <div>
            <h1 className="text-xl font-bold text-foreground">Parts & Kits List</h1>
            <p className="text-xs text-muted-foreground">Search, filter, and manage all inventory parts and kits</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <Upload className="w-3.5 h-3.5" />
            Import XLSX
          </Button>
          <Button size="sm" className="gap-1.5 text-xs" onClick={onAddNew}>
            <Plus className="w-3.5 h-3.5" />
            New Part
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setListTab("parts-list")}
          className={cn(
            "flex-1 py-2.5 text-xs font-medium transition-all relative text-center",
            listTab === "parts-list"
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Parts List
          {listTab === "parts-list" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
          )}
        </button>
        <button
          onClick={() => setListTab("kits-list")}
          className={cn(
            "flex-1 py-2.5 text-xs font-medium transition-all relative text-center",
            listTab === "kits-list"
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Kits List
          {listTab === "kits-list" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
          )}
        </button>
      </div>

      {listTab === "parts-list" && (
        <>
          {/* Search & Filters Card */}
          <Card className="border-border">
            <CardHeader className="pb-3 pt-4 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Search & Filters</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7" onClick={handleSelectAll}>
                    <CheckCircle className="w-3 h-3" />
                    {selectedItems.length === filteredItems.length && filteredItems.length > 0 ? "Deselect All" : "Select All"}
                  </Button>
                  {selectedItems.length > 0 && (
                    <>
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7" onClick={handleDownloadSelectedCSV}>
                        <Download className="w-3 h-3" />
                        Download CSV ({selectedItems.length})
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7" onClick={handlePrintSelected}>
                        <Printer className="w-3 h-3" />
                        Print ({selectedItems.length})
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              {/* Quick Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Quick search across all fields..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-8 text-xs"
                />
              </div>

              {/* Filter Fields */}
              <div className="grid grid-cols-7 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Master Part No</label>
                  <Input
                    placeholder="Type to search or enter new"
                    value={masterPartNoFilter}
                    onChange={(e) => setMasterPartNoFilter(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Part No</label>
                  <Input
                    placeholder="Type to search or enter new"
                    value={partNoFilter}
                    onChange={(e) => setPartNoFilter(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Brand</label>
                  <Input
                    placeholder="Type to search or enter new"
                    value={brandFilter}
                    onChange={(e) => setBrandFilter(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Description</label>
                  <Input
                    placeholder="Filter by Description..."
                    value={descriptionFilter}
                    onChange={(e) => setDescriptionFilter(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Category</label>
                  <SearchableSelect
                    options={[{ value: "all", label: "All Categories" }, ...categories.map(cat => ({ value: cat, label: cat }))]}
                    value={categoryFilter}
                    onValueChange={setCategoryFilter}
                    placeholder="All Categories"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Sub Category</label>
                  <SearchableSelect
                    options={[{ value: "all", label: "All Sub Categories" }, ...subCategories.map(sub => ({ value: sub, label: sub }))]}
                    value={subCategoryFilter}
                    onValueChange={setSubCategoryFilter}
                    placeholder="All Sub Categories"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Application</label>
                  <SearchableSelect
                    options={[{ value: "all", label: "All Applications" }, ...applications.map(app => ({ value: app, label: app }))]}
                    value={applicationFilter}
                    onValueChange={setApplicationFilter}
                    placeholder="All Applications"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Parts List Card */}
          <Card className="border-border">
            <CardHeader className="pb-2 pt-3 px-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">Parts List</CardTitle>
                  <p className="text-xs text-muted-foreground">{filteredItems.length} parts found</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="w-10 pl-4">
                        <Checkbox 
                          checked={selectedItems.length === filteredItems.length && filteredItems.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead className="text-xs font-medium">Master Part No</TableHead>
                      <TableHead className="text-xs font-medium">Part No</TableHead>
                      <TableHead className="text-xs font-medium">Brand</TableHead>
                      <TableHead className="text-xs font-medium">Description</TableHead>
                      <TableHead className="text-xs font-medium">Category</TableHead>
                      <TableHead className="text-xs font-medium">Sub Category</TableHead>
                      <TableHead className="text-xs font-medium">Application</TableHead>
                      <TableHead className="text-xs font-medium">Status</TableHead>
                      <TableHead className="text-xs font-medium">Images</TableHead>
                      <TableHead className="text-xs font-medium pr-4">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((item) => (
                      <TableRow key={item.id} className="hover:bg-muted/20">
                        <TableCell className="pl-4">
                          <Checkbox
                            checked={selectedItems.includes(item.id)}
                            onCheckedChange={() => handleSelectItem(item.id)}
                          />
                        </TableCell>
                        <TableCell className="text-xs font-medium">{item.masterPartNo}</TableCell>
                        <TableCell className="text-xs font-semibold">{item.partNo}</TableCell>
                        <TableCell className="text-xs">{item.brand}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">{item.description}</TableCell>
                        <TableCell className="text-xs">{item.category || "-"}</TableCell>
                        <TableCell className="text-xs">{item.subCategory || "-"}</TableCell>
                        <TableCell className="text-xs">{item.application || "-"}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="flex items-center gap-1 cursor-pointer focus:outline-none">
                                <Badge 
                                  variant="outline" 
                                  className={cn(
                                    "text-[10px] px-1.5 py-0 cursor-pointer",
                                    item.status === "Active" 
                                      ? "border-success text-success bg-success/10" 
                                      : "border-destructive text-destructive bg-destructive/10"
                                  )}
                                >
                                  {item.status}
                                  <ChevronDown className="w-2.5 h-2.5 ml-0.5" />
                                </Badge>
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="bg-popover border border-border shadow-lg z-50">
                              {item.status === "Active" ? (
                                <DropdownMenuItem 
                                  onClick={() => {
                                    onStatusChange?.(item, "Inactive");
                                    toast({
                                      title: "Status Updated",
                                      description: `${item.partNo} has been set to Inactive`,
                                    });
                                  }}
                                  className="text-xs cursor-pointer"
                                >
                                  <span className="w-2 h-2 rounded-full bg-destructive mr-2" />
                                  Set Inactive
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem 
                                  onClick={() => {
                                    onStatusChange?.(item, "Active");
                                    toast({
                                      title: "Status Updated",
                                      description: `${item.partNo} has been set to Active`,
                                    });
                                  }}
                                  className="text-xs cursor-pointer"
                                >
                                  <span className="w-2 h-2 rounded-full bg-success mr-2" />
                                  Set Active
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                        <TableCell>
                          {item.images.length > 0 ? (
                            <button 
                              onClick={() => {
                                setSelectedImages(item.images);
                                setCurrentImageIndex(0);
                                setImageModalOpen(true);
                              }}
                              className="flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity"
                            >
                              <div className="relative">
                                <img 
                                  src={item.images[0]} 
                                  alt="Product" 
                                  className="w-8 h-8 rounded object-cover border border-border"
                                />
                                {item.images.length > 1 && (
                                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-medium">
                                    +{item.images.length - 1}
                                  </span>
                                )}
                              </div>
                            </button>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="pr-4">
                          <div className="flex items-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6"
                              onClick={() => onEdit?.(item)}
                            >
                              <Edit className="w-3 h-3 text-primary" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6"
                              onClick={() => {
                                setItemToDelete(item);
                                setDeleteConfirmOpen(true);
                              }}
                            >
                              <Trash2 className="w-3 h-3 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredItems.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={11} className="h-24 text-center text-xs text-muted-foreground">
                          No parts found matching your filters.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
            </CardContent>
          </Card>
        </>
      )}

      {listTab === "kits-list" && (
        <div>
          <KitsList kits={kits} onDelete={onDeleteKit} onUpdateKit={onUpdateKit} />
        </div>
      )}

      {/* Image Modal */}
      <Dialog open={imageModalOpen} onOpenChange={setImageModalOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden bg-background border-border">
          <VisuallyHidden>
            <DialogTitle>Product Image</DialogTitle>
          </VisuallyHidden>
          <div className="relative">
            {selectedImages.length > 0 && (
              <img 
                src={selectedImages[currentImageIndex]} 
                alt="Product" 
                className="w-full h-auto max-h-[70vh] object-contain"
              />
            )}
            {selectedImages.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {selectedImages.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={cn(
                      "w-2 h-2 rounded-full transition-all",
                      currentImageIndex === index 
                        ? "bg-primary w-4" 
                        : "bg-muted-foreground/50 hover:bg-muted-foreground"
                    )}
                  />
                ))}
              </div>
            )}
          </div>
          {selectedImages.length > 1 && (
            <div className="p-3 border-t border-border flex gap-2 overflow-x-auto">
              {selectedImages.map((img, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={cn(
                    "flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all",
                    currentImageIndex === index 
                      ? "border-primary" 
                      : "border-transparent hover:border-muted-foreground/50"
                  )}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete Part</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete <span className="font-semibold text-foreground">{itemToDelete?.partNo}</span>? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs h-8">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs h-8"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
