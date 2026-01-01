import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, MoreVertical, Eye, Download, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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

interface MainGroup {
  id: string;
  code: string;
  name: string;
  type?: string;
  displayOrder?: number;
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export const MainGroupsTab = () => {
  const [mainGroups, setMainGroups] = useState<MainGroup[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [pageSize, setPageSize] = useState("10");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<MainGroup | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<MainGroup | null>(null);
  
  // Form data
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    type: "Asset",
    displayOrder: 0,
  });

  useEffect(() => {
    fetchMainGroups();
  }, []);

  const fetchMainGroups = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/accounting/main-groups`);
      if (response.ok) {
        const data = await response.json();
        setMainGroups(data);
      } else {
        toast.error("Failed to load main groups");
      }
    } catch (error) {
      console.error("Error fetching main groups:", error);
      toast.error("Error loading main groups");
    } finally {
      setLoading(false);
    }
  };

  // Pagination
  const totalPages = Math.ceil(mainGroups.length / parseInt(pageSize)) || 1;
  const paginatedGroups = mainGroups.slice(
    (currentPage - 1) * parseInt(pageSize),
    currentPage * parseInt(pageSize)
  );

  // Reset to page 1 when page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(paginatedGroups.map((g) => g.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedItems([...selectedItems, id]);
    } else {
      setSelectedItems(selectedItems.filter((item) => item !== id));
    }
  };

  const handleViewChartOfAccounts = async () => {
    try {
      toast.success("Fetching all main groups...");
      
      // Fetch all main groups (no pagination)
      const response = await fetch(`${API_URL}/api/accounting/main-groups`);
      if (!response.ok) {
        throw new Error("Failed to fetch main groups");
      }
      
      const allMainGroups = await response.json();
      
      // Generate HTML for chart of accounts
      const chartHTML = `
      <html>
        <head>
          <title>Chart of Accounts</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { text-align: center; color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f4f4f4; }
          </style>
        </head>
        <body>
          <h1>Chart of Accounts</h1>
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Main Group Name</th>
                <th>Type</th>
              </tr>
            </thead>
            <tbody>
              ${allMainGroups.map((g: any) => `
                <tr>
                  <td>${g.code}</td>
                  <td>${g.name}</td>
                  <td>${g.type || ""}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(chartHTML);
        printWindow.document.close();
        printWindow.print();
      }
      toast.success(`${allMainGroups.length} main groups ready for printing`);
    } catch (error) {
      console.error("Error viewing chart of accounts:", error);
      toast.error("Failed to prepare chart of accounts");
    }
  };

  const handleSavePdf = async () => {
    try {
      toast.success("Fetching all main groups for export...");
      
      // Fetch all main groups (no pagination)
      const response = await fetch(`${API_URL}/api/accounting/main-groups`);
      if (!response.ok) {
        throw new Error("Failed to fetch main groups");
      }
      
      const allMainGroups = await response.json();
      
      // Generate CSV export
      const csvContent = [
        ["Code", "Main Group Name", "Type", "Display Order"].join(","),
        ...allMainGroups.map((g: any) => [g.code, g.name, g.type || "", g.displayOrder || 0].join(","))
      ].join("\n");
      
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `chart_of_accounts_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(`${allMainGroups.length} main groups exported successfully!`);
    } catch (error) {
      console.error("Error exporting main groups:", error);
      toast.error("Failed to export main groups");
    }
  };

  const resetForm = () => {
    // Auto-calculate display order based on existing groups
    const maxDisplayOrder = mainGroups.length > 0 
      ? Math.max(...mainGroups.map(g => g.displayOrder || 0), 0) 
      : 0;
    
    setFormData({
      code: "",
      name: "",
      type: "Asset",
      displayOrder: maxDisplayOrder + 1,
    });
  };

  const handleOpenAddDialog = () => {
    // Calculate next display order before opening dialog
    const maxDisplayOrder = mainGroups.length > 0 
      ? Math.max(...mainGroups.map(g => g.displayOrder || 0), 0) 
      : 0;
    
    setFormData({
      code: "",
      name: "",
      type: "Asset",
      displayOrder: maxDisplayOrder + 1,
    });
    setIsAddDialogOpen(true);
  };

  const handleOpenEditDialog = (group: MainGroup) => {
    setEditingGroup(group);
    setFormData({
      code: group.code,
      name: group.name,
      type: group.type || "Asset",
      displayOrder: group.displayOrder || 0,
    });
    setIsEditDialogOpen(true);
  };

  const handleOpenDeleteDialog = (group: MainGroup) => {
    setDeletingGroup(group);
    setIsDeleteDialogOpen(true);
  };

  const handleAddGroup = async () => {
    if (!formData.code || !formData.name.trim()) {
      toast.error("Please fill all required fields (Code and Name)");
      return;
    }

    // Validate code is not empty
    if (formData.code.trim() === "") {
      toast.error("Code is required");
      return;
    }

    // Validate name is not empty
    if (formData.name.trim() === "") {
      toast.error("Main Group Name is required");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/accounting/main-groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: formData.code.trim(),
          name: formData.name.trim(),
          type: formData.type || "Asset",
          displayOrder: formData.displayOrder || 0,
        }),
      });

      if (response.ok) {
        const newGroup = await response.json();
        toast.success(`Main group "${newGroup.name}" added successfully!`);
        await fetchMainGroups();
        setIsAddDialogOpen(false);
        resetForm();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to add main group");
      }
    } catch (error: any) {
      console.error("Error adding main group:", error);
      toast.error(error.message || "Error adding main group. Please try again.");
    }
  };

  const handleUpdateGroup = async () => {
    if (!editingGroup) return;
    if (!formData.code || !formData.name) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/accounting/main-groups/${editingGroup.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: formData.code.trim(),
          name: formData.name.trim(),
          type: formData.type,
          displayOrder: formData.displayOrder || 0,
        }),
      });

      if (response.ok) {
        await fetchMainGroups();
        setIsEditDialogOpen(false);
        setEditingGroup(null);
        resetForm();
        toast.success("Main group updated successfully!");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to update main group");
      }
    } catch (error: any) {
      console.error("Error updating main group:", error);
      toast.error(error.message || "Error updating main group");
    }
  };

  const handleDeleteGroup = async () => {
    if (!deletingGroup) return;

    try {
      const response = await fetch(`${API_URL}/api/accounting/main-groups/${deletingGroup.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchMainGroups();
        setIsDeleteDialogOpen(false);
        setDeletingGroup(null);
        toast.success("Main group deleted successfully!");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to delete main group");
      }
    } catch (error: any) {
      console.error("Error deleting main group:", error);
      toast.error(error.message || "Error deleting main group");
    }
  };

  return (
    <Card className="border-border/50 shadow-sm transition-all duration-300 hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-destructive" />
          <CardTitle className="text-lg font-semibold">Main Groups</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleOpenAddDialog}
            variant="outline"
            size="sm"
            className="transition-all duration-200 hover:scale-105"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add New Group
          </Button>
          <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="bg-primary text-primary-foreground hover:bg-primary/90">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-card border-border z-50">
            <DropdownMenuItem onClick={handleViewChartOfAccounts} className="cursor-pointer">
              <Eye className="h-4 w-4 mr-2" />
              View Chart of Accounts
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSavePdf} className="cursor-pointer">
              <Download className="h-4 w-4 mr-2" />
              Save pdf Chart of Accounts
            </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="p-3 text-left w-12">
                  <Checkbox
                    checked={paginatedGroups.length > 0 && selectedItems.length === paginatedGroups.length && paginatedGroups.every(g => selectedItems.includes(g.id))}
                    onCheckedChange={handleSelectAll}
                  />
                </th>
                <th className="p-3 text-left font-medium text-primary underline cursor-pointer hover:text-primary/80 transition-colors">
                  Code
                </th>
                <th className="p-3 text-left font-medium text-primary underline cursor-pointer hover:text-primary/80 transition-colors">
                  Main Group Name
                </th>
                <th className="p-3 text-left font-medium text-primary underline cursor-pointer hover:text-primary/80 transition-colors">
                  Type
                </th>
                <th className="p-3 text-left font-medium text-primary underline cursor-pointer hover:text-primary/80 transition-colors">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    Loading main groups...
                  </td>
                </tr>
              ) : paginatedGroups.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    No main groups found. Click "Add New Group" to create one.
                  </td>
                </tr>
              ) : (
                paginatedGroups.map((group, index) => (
                <tr
                  key={group.id}
                  className={`border-b border-border/50 transition-colors duration-200 hover:bg-muted/30 ${
                    index % 2 === 0 ? "bg-muted/10" : ""
                  }`}
                >
                  <td className="p-3">
                    <Checkbox
                      checked={selectedItems.includes(group.id)}
                      onCheckedChange={(checked) =>
                        handleSelectItem(group.id, checked as boolean)
                      }
                    />
                  </td>
                  <td className="p-3 text-primary font-medium">{group.code}</td>
                  <td className="p-3 text-primary font-medium">{group.name}</td>
                  <td className="p-3 text-muted-foreground">{group.type || "N/A"}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEditDialog(group)}
                        className="text-primary hover:text-primary/80 transition-colors"
                      >
                        <Pencil className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDeleteDialog(group)}
                        className="text-destructive hover:text-destructive/80 transition-colors"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-4">
          <p className="text-sm text-muted-foreground">
            Showing <span className="text-primary">{mainGroups.length > 0 ? (currentPage - 1) * parseInt(pageSize) + 1 : 0}</span> to{" "}
            <span className="text-primary">{Math.min(currentPage * parseInt(pageSize), mainGroups.length)}</span> of{" "}
            <span className="text-primary">{mainGroups.length}</span> items
          </p>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(1)}
                className="transition-all duration-200"
              >
                {"<<"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
                className="transition-all duration-200"
              >
                {"<"}
              </Button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
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
                    onClick={() => setCurrentPage(pageNum)}
                    className="transition-all duration-200"
                  >
                    {pageNum}
                  </Button>
                );
              })}
              {totalPages > 5 && <span className="px-2">...</span>}
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
                className="transition-all duration-200"
              >
                {">"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(totalPages)}
                className="transition-all duration-200"
              >
                {">>"}
              </Button>
            </div>
            <Select value={pageSize} onValueChange={setPageSize}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border z-50">
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Main Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="code">Code *</Label>
              <Input
                id="code"
                placeholder="e.g., 100, 200"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Main Group Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Current Assets"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Asset">Asset</SelectItem>
                  <SelectItem value="Liability">Liability</SelectItem>
                  <SelectItem value="Equity">Equity</SelectItem>
                  <SelectItem value="Revenue">Revenue</SelectItem>
                  <SelectItem value="Expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="displayOrder">Display Order</Label>
              <Input
                id="displayOrder"
                type="number"
                min="0"
                value={formData.displayOrder}
                onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsAddDialogOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleAddGroup} className="bg-primary text-primary-foreground hover:bg-primary/90">
              Add Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Main Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-code">Code *</Label>
              <Input
                id="edit-code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-name">Main Group Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-type">Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Asset">Asset</SelectItem>
                  <SelectItem value="Liability">Liability</SelectItem>
                  <SelectItem value="Equity">Equity</SelectItem>
                  <SelectItem value="Revenue">Revenue</SelectItem>
                  <SelectItem value="Expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-displayOrder">Display Order</Label>
              <Input
                id="edit-displayOrder"
                type="number"
                min="0"
                value={formData.displayOrder}
                onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditDialogOpen(false); setEditingGroup(null); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleUpdateGroup}>Update Group</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the main group "{deletingGroup?.name}". This action cannot be undone.
              If this group has subgroups or accounts, they will also be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setIsDeleteDialogOpen(false); setDeletingGroup(null); }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteGroup}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
