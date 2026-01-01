import { useState, useRef, useEffect } from "react";
import { Search, Download, Printer, Plus, Upload, CheckCircle, Edit, Trash2, ChevronDown, Image, X, ChevronLeft, ChevronRight, Loader2, FileText, FileSpreadsheet, FileJson } from "lucide-react";
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
  DropdownMenuSeparator,
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

interface SearchFilters {
  search: string;
  master_part_no: string;
  part_no: string;
  brand_name: string;
  description: string;
  category_name: string;
  subcategory_name: string;
  application_name: string;
}

interface ItemsListViewProps {
  items: Item[];
  loading?: boolean;
  currentPage?: number;
  itemsPerPage?: number;
  totalItems?: number;
  searchFilters?: SearchFilters;
  onFiltersChange?: (filters: SearchFilters) => void;
  onPageChange?: (page: number) => void;
  onItemsPerPageChange?: (limit: number) => void;
  onEdit?: (item: Item) => void;
  onDelete?: (item: Item) => void;
  onBulkDelete?: (itemIds: string[]) => Promise<{ success: string[]; failed: string[] }>;
  onItemsUpdate?: (updatedItems: Item[]) => void;
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

export const ItemsListView = ({ 
  items, 
  loading = false,
  currentPage = 1,
  itemsPerPage = 50,
  totalItems = 0,
  searchFilters: externalFilters,
  onFiltersChange,
  onPageChange,
  onItemsPerPageChange,
  onEdit, 
  onDelete,
  onBulkDelete,
  onItemsUpdate,
  onAddNew, 
  onStatusChange, 
  showForm = false, 
  onCancelForm, 
  onSavePart, 
  editItem, 
  kits = [], 
  onDeleteKit, 
  onUpdateKit 
}: ItemsListViewProps) => {
  const { toast } = useToast();
  const [listTab, setListTab] = useState<ListTab>("parts-list");
  const [pageJumpValue, setPageJumpValue] = useState<string>("");
  
  // Use external filters if provided, otherwise use local state
  const [localFilters, setLocalFilters] = useState<SearchFilters>({
    search: '',
    master_part_no: '',
    part_no: '',
    brand_name: '',
    description: '',
    category_name: 'all',
    subcategory_name: 'all',
    application_name: 'all',
  });
  
  // Local state for input values (for immediate UI updates)
  const [localInputValues, setLocalInputValues] = useState<SearchFilters>(
    externalFilters || localFilters
  );
  
  // Sync local input values when external filters change
  useEffect(() => {
    if (externalFilters) {
      setLocalInputValues(externalFilters);
    }
  }, [externalFilters]);
  
  // Clear page jump value when page changes externally
  useEffect(() => {
    setPageJumpValue("");
  }, [currentPage]);
  
  const searchFilters = externalFilters || localFilters;
  const setSearchFilters = onFiltersChange || setLocalFilters;
  
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Debounce timer ref for search
  const searchDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Get unique values for dropdowns from current items
  const categories = [...new Set(items.map(item => item.category).filter(Boolean))];
  const subCategories = [...new Set(items.map(item => item.subCategory).filter(Boolean))];
  const applications = [...new Set(items.map(item => item.application).filter(Boolean))];

  // Since filtering is now server-side, we just use the items as-is
  const filteredItems = items;
  
  // Debounced filter update function
  const updateFilter = (key: keyof SearchFilters, value: string) => {
    // Update local input value immediately for UI responsiveness
    setLocalInputValues(prev => ({ ...prev, [key]: value }));
    
    // Clear existing timer
    if (searchDebounceTimerRef.current) {
      clearTimeout(searchDebounceTimerRef.current);
    }
    
    // Set new timer for debouncing (300ms delay)
    searchDebounceTimerRef.current = setTimeout(() => {
      const newFilters = { ...searchFilters, [key]: value };
      setSearchFilters(newFilters);
    }, 300);
  };
  
  // Immediate update for dropdowns (no debounce needed)
  const updateFilterImmediate = (key: keyof SearchFilters, value: string) => {
    setLocalInputValues(prev => ({ ...prev, [key]: value }));
    setSearchFilters({ ...searchFilters, [key]: value });
  };
  
  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (searchDebounceTimerRef.current) {
        clearTimeout(searchDebounceTimerRef.current);
      }
    };
  }, []);

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

  // Get data to export (selected items or all items)
  const getExportData = () => {
    return selectedItems.length > 0 
      ? items.filter(item => selectedItems.includes(item.id))
      : items;
  };

  // Escape CSV values
  const escapeCSV = (value: any) => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // Export to CSV
  const handleExportCSV = () => {
    const exportData = getExportData();
    const headers = ["ID", "Master Part No", "Part No", "Brand", "Description", "Category", "Sub Category", "Application", "Status", "Images"];
    const csvData = exportData.map(item => [
      item.id,
      escapeCSV(item.masterPartNo),
      escapeCSV(item.partNo),
      escapeCSV(item.brand),
      escapeCSV(item.description),
      escapeCSV(item.category),
      escapeCSV(item.subCategory),
      escapeCSV(item.application),
      escapeCSV(item.status),
      escapeCSV(item.images.join(';'))
    ]);
    const csvContent = [headers.join(","), ...csvData.map(row => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `parts-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: "CSV Exported",
      description: `${exportData.length} parts exported successfully`,
    });
  };

  // Export to Excel (XLSX format using CSV with .xlsx extension)
  const handleExportExcel = () => {
    const exportData = getExportData();
    const headers = ["ID", "Master Part No", "Part No", "Brand", "Description", "Category", "Sub Category", "Application", "Status", "Images"];
    const excelData = exportData.map(item => ({
      "ID": item.id,
      "Master Part No": item.masterPartNo || "",
      "Part No": item.partNo || "",
      "Brand": item.brand || "",
      "Description": item.description || "",
      "Category": item.category || "",
      "Sub Category": item.subCategory || "",
      "Application": item.application || "",
      "Status": item.status || "",
      "Images": item.images.join(';') || ""
    }));

    // Create CSV content (Excel can open CSV)
    const csvContent = [
      headers.join(","),
      ...excelData.map(row => headers.map(h => escapeCSV(row[h as keyof typeof row] || "")).join(","))
    ].join("\n");

    // Add BOM for Excel UTF-8 support
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `parts-export-${new Date().toISOString().split('T')[0]}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: "Excel Exported",
      description: `${exportData.length} parts exported successfully`,
    });
  };

  // Export to JSON
  const handleExportJSON = () => {
    const exportData = getExportData();
    const jsonData = exportData.map(item => ({
      id: item.id,
      masterPartNo: item.masterPartNo || "",
      partNo: item.partNo || "",
      brand: item.brand || "",
      description: item.description || "",
      category: item.category || "",
      subCategory: item.subCategory || "",
      application: item.application || "",
      status: item.status || "",
      images: item.images || []
    }));
    const jsonContent = JSON.stringify(jsonData, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `parts-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: "JSON Exported",
      description: `${exportData.length} parts exported successfully`,
    });
  };

  // Export to TXT
  const handleExportTXT = () => {
    const exportData = getExportData();
    const txtLines = [
      "PARTS EXPORT",
      `Generated: ${new Date().toLocaleString()}`,
      `Total Items: ${exportData.length}`,
      "=".repeat(80),
      ""
    ];

    exportData.forEach((item, index) => {
      txtLines.push(`Item ${index + 1}:`);
      txtLines.push(`  ID: ${item.id}`);
      txtLines.push(`  Master Part No: ${item.masterPartNo || "-"}`);
      txtLines.push(`  Part No: ${item.partNo || "-"}`);
      txtLines.push(`  Brand: ${item.brand || "-"}`);
      txtLines.push(`  Description: ${item.description || "-"}`);
      txtLines.push(`  Category: ${item.category || "-"}`);
      txtLines.push(`  Sub Category: ${item.subCategory || "-"}`);
      txtLines.push(`  Application: ${item.application || "-"}`);
      txtLines.push(`  Status: ${item.status || "-"}`);
      txtLines.push(`  Images: ${item.images.length > 0 ? item.images.join(', ') : "None"}`);
      txtLines.push("");
    });

    const txtContent = txtLines.join("\n");
    const blob = new Blob([txtContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `parts-export-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: "TXT Exported",
      description: `${exportData.length} parts exported successfully`,
    });
  };

  // Export to PDF
  const handleExportPDF = () => {
    const exportData = getExportData();
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Parts Export</title>
          <style>
            @media print {
              @page { margin: 1cm; }
            }
            body { font-family: Arial, sans-serif; padding: 20px; font-size: 10px; }
            h1 { color: #333; margin-bottom: 10px; font-size: 16px; }
            .meta { color: #666; margin-bottom: 20px; font-size: 9px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
            th { background-color: #f4f4f4; font-weight: bold; }
            tr:nth-child(even) { background-color: #fafafa; }
          </style>
        </head>
        <body>
          <h1>Parts Export</h1>
          <div class="meta">Generated: ${new Date().toLocaleString()} | Total Items: ${exportData.length}</div>
          <table>
            <thead>
              <tr>
                <th>Part No</th>
                <th>Master Part No</th>
                <th>Brand</th>
                <th>Description</th>
                <th>Category</th>
                <th>Sub Category</th>
                <th>Application</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${exportData.map(item => `
                <tr>
                  <td>${item.partNo || "-"}</td>
                  <td>${item.masterPartNo || "-"}</td>
                  <td>${item.brand || "-"}</td>
                  <td>${item.description || "-"}</td>
                  <td>${item.category || "-"}</td>
                  <td>${item.subCategory || "-"}</td>
                  <td>${item.application || "-"}</td>
                  <td>${item.status || "-"}</td>
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
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
    toast({
      title: "PDF Export Ready",
      description: `${exportData.length} parts ready for printing/PDF`,
    });
  };

  // Handle Import
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.xlsx,.xls,.json,.txt';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const fileType = file.name.split('.').pop()?.toLowerCase();
        const text = await file.text();

        let importedData: any[] = [];

        if (fileType === 'json') {
          importedData = JSON.parse(text);
        } else if (fileType === 'csv' || fileType === 'xlsx' || fileType === 'xls') {
          const lines = text.split('\n').filter(line => line.trim());
          if (lines.length < 2) {
            throw new Error('Invalid CSV file');
          }
          const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
          importedData = lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
            const obj: any = {};
            headers.forEach((header, index) => {
              obj[header] = values[index] || '';
            });
            return obj;
          });
        } else if (fileType === 'txt') {
          // Simple TXT parsing (basic implementation)
          toast({
            title: "Import Notice",
            description: "TXT import is limited. Please use CSV, Excel, or JSON format for better results.",
            variant: "default",
          });
          return;
        }

        if (importedData.length === 0) {
          throw new Error('No data found in file');
        }

        // Transform imported data to match Item format
        const transformedItems: Item[] = importedData.map((row: any, index: number) => ({
          id: row.id || row.ID || `imported-${Date.now()}-${index}`,
          masterPartNo: row.masterPartNo || row['Master Part No'] || row.master_part_no || "",
          partNo: row.partNo || row['Part No'] || row.part_no || "",
          brand: row.brand || row.Brand || "",
          description: row.description || row.Description || "",
          category: row.category || row.Category || "",
          subCategory: row.subCategory || row['Sub Category'] || row.subcategory || "",
          application: row.application || row.Application || "",
          status: (row.status || row.Status || "Active") as "Active" | "Inactive",
          images: row.images ? (Array.isArray(row.images) ? row.images : row.images.split(';').filter((img: string) => img.trim())) : []
        }));

        // Call import handler if provided, otherwise show success
        toast({
          title: "Import Successful",
          description: `${transformedItems.length} items imported. Please review and save.`,
        });

        // You can add an onImport callback here to handle the imported data
        console.log('Imported items:', transformedItems);

      } catch (error: any) {
        console.error('Import error:', error);
        toast({
          title: "Import Failed",
          description: error.message || "Failed to import file",
          variant: "destructive",
        });
      }
    };
    input.click();
  };

  const handleBulkDeleteConfirm = async () => {
    if (selectedItems.length === 0) return;
    
    setIsDeleting(true);
    const itemsToDelete = items.filter(item => selectedItems.includes(item.id));
    const itemIdsToDelete = [...selectedItems];
    const failedDeletes: string[] = [];
    let successCount = 0;
    
    // Optimistically remove items from UI immediately (smooth UX - no table reload)
    const remainingItems = items.filter(item => !selectedItems.includes(item.id));
    if (onItemsUpdate) {
      onItemsUpdate(remainingItems);
    }
    
    // Clear selection immediately for better UX
    setSelectedItems([]);
    setBulkDeleteConfirmOpen(false);
    
    try {
      // If bulk delete handler is provided, use it (parallel deletion - professional)
      if (onBulkDelete) {
        const result = await onBulkDelete(itemIdsToDelete);
        successCount = result.success.length;
        failedDeletes.push(...result.failed.map(id => {
          const item = items.find(i => i.id === id);
          return item?.partNo || id;
        }));
      } else if (onDelete) {
        // Fallback to individual deletes (parallel, no UI blocking)
        const deletePromises = itemsToDelete.map(async (item) => {
          try {
            // Check if item is used in any kit
            const itemUsedInKits = kits.filter(kit => 
              kit.items?.some(kitItem => kitItem.id === item.id || kitItem.partNo === item.partNo)
            );
            
            if (itemUsedInKits.length > 0) {
              failedDeletes.push(item.partNo);
              return { success: false, partNo: item.partNo };
            }
            
            // Delete in background (parallel - no sequential delays)
            await onDelete(item);
            return { success: true, partNo: item.partNo };
          } catch (error) {
            console.error(`Error deleting item ${item.partNo}:`, error);
            failedDeletes.push(item.partNo);
            return { success: false, partNo: item.partNo };
          }
        });
        
        const results = await Promise.all(deletePromises);
        successCount = results.filter(r => r.success).length;
      }
      
      // Show results
      if (successCount > 0) {
        toast({
          title: "Bulk Delete Complete",
          description: `Successfully deleted ${successCount} item(s)${failedDeletes.length > 0 ? `. ${failedDeletes.length} item(s) could not be deleted.` : ''}`,
        });
      }
      
      if (failedDeletes.length > 0) {
        // If some failed, restore them to the list
        if (onItemsUpdate) {
          const failedItems = itemsToDelete.filter(item => 
            failedDeletes.includes(item.partNo)
          );
          onItemsUpdate([...remainingItems, ...failedItems]);
        }
        toast({
          title: "Some Items Could Not Be Deleted",
          description: `The following items could not be deleted: ${failedDeletes.slice(0, 5).join(', ')}${failedDeletes.length > 5 ? ` and ${failedDeletes.length - 5} more` : ''}. They may be in use.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error in bulk delete:", error);
      // If error occurs, restore items
      if (onItemsUpdate) {
        onItemsUpdate(items); // Restore original items
      }
      toast({
        title: "Error",
        description: "An error occurred during bulk delete. Items have been restored.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <Download className="w-3.5 h-3.5" />
                Export
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleExportPDF} className="cursor-pointer">
                <FileText className="w-4 h-4 mr-2" />
                Export as PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportCSV} className="cursor-pointer">
                <Download className="w-4 h-4 mr-2" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportExcel} className="cursor-pointer">
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Export as Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportTXT} className="cursor-pointer">
                <FileText className="w-4 h-4 mr-2" />
                Export as TXT
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportJSON} className="cursor-pointer">
                <FileJson className="w-4 h-4 mr-2" />
                Export as JSON
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleImport} className="cursor-pointer">
                <Upload className="w-4 h-4 mr-2" />
                Import Data
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        className="gap-1.5 text-xs h-7" 
                        onClick={() => setBulkDeleteConfirmOpen(true)}
                        disabled={isDeleting}
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete ({selectedItems.length})
                      </Button>
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
                  value={localInputValues.search}
                  onChange={(e) => updateFilter('search', e.target.value)}
                  className="pl-9 h-8 text-xs"
                />
              </div>

              {/* Filter Fields */}
              <div className="grid grid-cols-7 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Master Part No</label>
                  <Input
                    placeholder="Type to search or enter new"
                    value={localInputValues.master_part_no}
                    onChange={(e) => updateFilter('master_part_no', e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Part No</label>
                  <Input
                    placeholder="Type to search or enter new"
                    value={localInputValues.part_no}
                    onChange={(e) => updateFilter('part_no', e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Brand</label>
                  <Input
                    placeholder="Type to search or enter new"
                    value={localInputValues.brand_name}
                    onChange={(e) => updateFilter('brand_name', e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Description</label>
                  <Input
                    placeholder="Filter by Description..."
                    value={localInputValues.description}
                    onChange={(e) => updateFilter('description', e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Category</label>
                  <SearchableSelect
                    options={[{ value: "all", label: "All Categories" }, ...categories.map(cat => ({ value: cat, label: cat }))]}
                    value={localInputValues.category_name}
                    onValueChange={(value) => updateFilterImmediate('category_name', value)}
                    placeholder="All Categories"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Sub Category</label>
                  <SearchableSelect
                    options={[{ value: "all", label: "All Sub Categories" }, ...subCategories.map(sub => ({ value: sub, label: sub }))]}
                    value={localInputValues.subcategory_name}
                    onValueChange={(value) => updateFilterImmediate('subcategory_name', value)}
                    placeholder="All Sub Categories"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Application</label>
                  <SearchableSelect
                    options={[{ value: "all", label: "All Applications" }, ...applications.map(app => ({ value: app, label: app }))]}
                    value={localInputValues.application_name}
                    onValueChange={(value) => updateFilterImmediate('application_name', value)}
                    placeholder="All Applications"
                  />
                </div>
              </div>
              
              {/* Clear Filters Button */}
              {(searchFilters.search || searchFilters.master_part_no || searchFilters.part_no || 
                searchFilters.brand_name || searchFilters.description || 
                searchFilters.category_name !== 'all' || searchFilters.subcategory_name !== 'all' || 
                searchFilters.application_name !== 'all') && (
                <div className="flex justify-end pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      const clearedFilters = {
                        search: '',
                        master_part_no: '',
                        part_no: '',
                        brand_name: '',
                        description: '',
                        category_name: 'all',
                        subcategory_name: 'all',
                        application_name: 'all',
                      };
                      setLocalInputValues(clearedFilters);
                      setSearchFilters(clearedFilters);
                    }}
                  >
                    <X className="w-3 h-3 mr-1" />
                    Clear All Filters
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Parts List Card */}
          <Card className="border-border">
            <CardHeader className="pb-2 pt-3 px-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">Parts List</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {loading ? "Loading..." : `${totalItems || filteredItems.length} parts found`}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Loading parts...</p>
                  </div>
                </div>
              ) : (
                <>
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
                        <TableCell className="text-xs">{item.category && item.category.trim() ? item.category : "-"}</TableCell>
                        <TableCell className="text-xs">{item.subCategory && item.subCategory.trim() ? item.subCategory : "-"}</TableCell>
                        <TableCell className="text-xs">{item.application && item.application.trim() ? item.application : "-"}</TableCell>
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
                          {item.images && item.images.length > 0 && item.images.some(img => img && img.trim() !== '') ? (
                            <button 
                              onClick={() => {
                                const validImages = item.images.filter(img => img && img.trim() !== '');
                                setSelectedImages(validImages);
                                setCurrentImageIndex(0);
                                setImageModalOpen(true);
                              }}
                              className="flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity"
                            >
                              <div className="relative">
                                {(() => {
                                  const firstValidImage = item.images.find(img => img && img.trim() !== '');
                                  return firstValidImage ? (
                                    <img 
                                      src={firstValidImage} 
                                      alt="Product" 
                                      className="w-8 h-8 rounded object-cover border border-border"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                      }}
                                    />
                                  ) : null;
                                })()}
                                {item.images.filter(img => img && img.trim() !== '').length > 1 && (
                                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-medium">
                                    +{item.images.filter(img => img && img.trim() !== '').length - 1}
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
                  
                  {/* Pagination Controls */}
                  {totalItems > 0 && onPageChange && (() => {
                    const totalPages = Math.ceil(totalItems / itemsPerPage);
                    const handlePageJump = () => {
                      const pageNum = parseInt(pageJumpValue);
                      if (pageNum >= 1 && pageNum <= totalPages) {
                        onPageChange(pageNum);
                        setPageJumpValue("");
                      } else {
                        toast({
                          title: "Invalid page",
                          description: `Please enter a page number between 1 and ${totalPages}`,
                          variant: "destructive",
                        });
                      }
                    };
                    
                    return (
                      <div className="border-t border-border px-4 py-3 flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => onPageChange(currentPage - 1)}
                            disabled={currentPage <= 1}
                          >
                            <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                            Previous
                          </Button>
                          
                          <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                              let pageNum;
                              
                              if (totalPages <= 5) {
                                pageNum = i + 1;
                              } else if (currentPage <= 3) {
                                pageNum = i + 1;
                              } else if (currentPage >= totalPages - 2) {
                                pageNum = totalPages - 4 + i;
                              } else {
                                pageNum = currentPage - 2 + i;
                              }
                              
                              return (
                                <Button
                                  key={pageNum}
                                  variant={currentPage === pageNum ? "default" : "outline"}
                                  size="sm"
                                  className="h-7 w-7 text-xs p-0"
                                  onClick={() => onPageChange(pageNum)}
                                >
                                  {pageNum}
                                </Button>
                              );
                            })}
                          </div>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => onPageChange(currentPage + 1)}
                            disabled={currentPage >= totalPages}
                          >
                            Next
                            <ChevronRight className="w-3.5 h-3.5 ml-1" />
                          </Button>
                          
                          <div className="flex items-center gap-1.5 ml-3">
                            <span className="text-xs text-muted-foreground">Go to:</span>
                            <Input
                              type="number"
                              min="1"
                              max={totalPages}
                              value={pageJumpValue}
                              onChange={(e) => setPageJumpValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handlePageJump();
                                }
                              }}
                              placeholder="Page"
                              className="h-7 w-16 text-xs text-center"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs px-2"
                              onClick={handlePageJump}
                            >
                              Go
                            </Button>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-muted-foreground">
                            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} parts
                          </span>
                          <span className="text-xs text-muted-foreground">Items per page:</span>
                          <Select
                            value={String(itemsPerPage)}
                            onValueChange={(value) => onItemsPerPageChange?.(Number(value))}
                          >
                            <SelectTrigger className="h-7 w-20 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="25">25</SelectItem>
                              <SelectItem value="50">50</SelectItem>
                              <SelectItem value="100">100</SelectItem>
                              <SelectItem value="200">200</SelectItem>
                              <SelectItem value="500">500</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}
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
            {selectedImages.length > 0 && selectedImages[currentImageIndex] && (
              <img 
                src={selectedImages[currentImageIndex]} 
                alt="Product" 
                className="w-full h-auto max-h-[70vh] object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23ddd" width="400" height="300"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="20" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3EImage not available%3C/text%3E%3C/svg%3E';
                }}
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
                img && img.trim() !== '' && (
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
                    <img 
                      src={img} 
                      alt="" 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="56" height="56"%3E%3Crect fill="%23ddd" width="56" height="56"/%3E%3C/svg%3E';
                      }}
                    />
                  </button>
                )
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={bulkDeleteConfirmOpen} onOpenChange={setBulkDeleteConfirmOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete Multiple Items</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete <span className="font-semibold text-foreground">{selectedItems.length}</span> selected item(s)? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs h-8" disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs h-8"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete All"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
