import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Users, Plus, Pencil, Trash2, MoreVertical, Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface Subgroup {
  id: string;
  mainGroup: string;
  code: string;
  name: string;
  isActive: boolean;
  canDelete: boolean;
}

const mainGroupOptions = [
  "Current Assets",
  "Long Term Assets",
  "Current Liabilities",
  "Long Term Liabilities",
  "Capital",
  "Drawings",
  "Revenues",
  "Expenses",
  "Cost",
];

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export const SubgroupsTab = () => {
  const [subgroups, setSubgroups] = useState<Subgroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [filterMainGroup, setFilterMainGroup] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("active");
  const [pageSize, setPageSize] = useState("10");
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingSubgroup, setEditingSubgroup] = useState<Subgroup | null>(null);
  const [formData, setFormData] = useState({ mainGroup: "", name: "" });

  useEffect(() => {
    fetchSubgroups();
    fetchMainGroups();
  }, []);

  const fetchMainGroups = async () => {
    // Main groups are already defined in the component
  };

  const fetchSubgroups = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/accounting/subgroups`);
      if (response.ok) {
        const data = await response.json();
        // Transform API data to match component interface
        const transformed = data.map((sg: any) => ({
          id: sg.id,
          mainGroup: sg.mainGroup?.name || sg.mainGroupId,
          code: sg.code,
          name: sg.name,
          isActive: sg.isActive,
          canDelete: sg.canDelete,
        }));
        setSubgroups(transformed);
      } else {
        toast.error("Failed to load subgroups");
      }
    } catch (error) {
      console.error("Error fetching subgroups:", error);
      toast.error("Error loading subgroups");
    } finally {
      setLoading(false);
    }
  };

  const filteredSubgroups = subgroups.filter((sg) => {
    const matchesGroup = filterMainGroup === "all" || sg.mainGroup === filterMainGroup;
    const matchesStatus = filterStatus === "all" || (filterStatus === "active" ? sg.isActive : !sg.isActive);
    return matchesGroup && matchesStatus;
  });

  const totalPages = Math.ceil(filteredSubgroups.length / parseInt(pageSize));
  const paginatedSubgroups = filteredSubgroups.slice(
    (currentPage - 1) * parseInt(pageSize),
    currentPage * parseInt(pageSize)
  );

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(paginatedSubgroups.map((g) => g.id));
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

  const handleAddSubgroup = async () => {
    if (!formData.mainGroup || !formData.name) {
      toast.error("Please fill all required fields");
      return;
    }
    try {
      // Find main group ID
      const mainGroupsResponse = await fetch(`${API_URL}/api/accounting/main-groups`);
      const mainGroups = await mainGroupsResponse.json();
      const mainGroup = mainGroups.find((mg: any) => mg.name === formData.mainGroup);
      
      if (!mainGroup) {
        toast.error("Main group not found");
        return;
      }

      // Generate code
      const existingCodes = subgroups.map(s => parseInt(s.code.replace(/\D/g, ''))).filter(c => !isNaN(c));
      const nextCode = existingCodes.length > 0 ? Math.max(...existingCodes) + 1 : 101;
      const code = `${nextCode}-${formData.name}`;

      const response = await fetch(`${API_URL}/api/accounting/subgroups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mainGroupId: mainGroup.id,
          code,
          name: formData.name,
          isActive: true,
          canDelete: true,
        }),
      });

      if (response.ok) {
        await fetchSubgroups();
        setIsAddDialogOpen(false);
        setFormData({ mainGroup: "", name: "" });
        toast.success("Subgroup added successfully!");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to add subgroup");
      }
    } catch (error) {
      console.error("Error adding subgroup:", error);
      toast.error("Error adding subgroup");
    }
  };

  const handleEditSubgroup = (subgroup: Subgroup) => {
    setEditingSubgroup(subgroup);
    setFormData({ mainGroup: subgroup.mainGroup, name: subgroup.name });
    setIsEditDialogOpen(true);
  };

  const handleUpdateSubgroup = async () => {
    if (!editingSubgroup) return;
    try {
      const mainGroupsResponse = await fetch(`${API_URL}/api/accounting/main-groups`);
      const mainGroups = await mainGroupsResponse.json();
      const mainGroup = mainGroups.find((mg: any) => mg.name === formData.mainGroup);
      
      if (!mainGroup) {
        toast.error("Main group not found");
        return;
      }

      const response = await fetch(`${API_URL}/api/accounting/subgroups/${editingSubgroup.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mainGroupId: mainGroup.id,
          name: formData.name,
          isActive: editingSubgroup.isActive,
        }),
      });

      if (response.ok) {
        await fetchSubgroups();
        setIsEditDialogOpen(false);
        setEditingSubgroup(null);
        setFormData({ mainGroup: "", name: "" });
        toast.success("Subgroup updated successfully!");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to update subgroup");
      }
    } catch (error) {
      console.error("Error updating subgroup:", error);
      toast.error("Error updating subgroup");
    }
  };

  const handleDeleteSubgroup = async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/api/accounting/subgroups/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchSubgroups();
        toast.success("Subgroup deleted successfully!");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to delete subgroup");
      }
    } catch (error) {
      console.error("Error deleting subgroup:", error);
      toast.error("Error deleting subgroup");
    }
  };

  const handleReset = () => {
    setFormData({ mainGroup: "", name: "" });
  };

  const handleExportCSV = () => {
    const csvContent = [
      ["Main Group", "Code", "Sub Group", "Status"].join(","),
      ...filteredSubgroups.map(sg => [
        sg.mainGroup,
        sg.code,
        sg.name,
        sg.isActive ? "Active" : "Inactive"
      ].join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `subgroups_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Subgroups exported to CSV successfully!");
  };

  const handlePrintList = () => {
    const printHTML = `
      <html>
        <head>
          <title>Subgroups List</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { text-align: center; color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f4f4f4; }
            @media print { button { display: none; } }
          </style>
        </head>
        <body>
          <h1>Subgroups List</h1>
          <table>
            <thead>
              <tr>
                <th>Main Group</th>
                <th>Code</th>
                <th>Sub Group</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${filteredSubgroups.map(sg => `
                <tr>
                  <td>${sg.mainGroup}</td>
                  <td>${sg.code}</td>
                  <td>${sg.name}</td>
                  <td>${sg.isActive ? "Active" : "Inactive"}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <button onclick="window.print()">Print</button>
        </body>
      </html>
    `;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printHTML);
      printWindow.document.close();
      printWindow.print();
    }
    toast.success("Subgroups list opened for printing");
  };

  return (
    <>
      <Card className="border-border/50 shadow-sm transition-all duration-300 hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-destructive" />
            <CardTitle className="text-lg font-semibold">Subgroups</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setIsAddDialogOpen(true)}
              variant="outline"
              size="sm"
              className="transition-all duration-200 hover:scale-105"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add New Subgroup
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-card border-border z-50">
                <DropdownMenuItem onClick={handleExportCSV} className="cursor-pointer">
                  Export to CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handlePrintList} className="cursor-pointer">
                  Print List
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Main Group</Label>
              <Select value={filterMainGroup} onValueChange={setFilterMainGroup}>
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent className="bg-card border-border z-50">
                  <SelectItem value="all">All Groups</SelectItem>
                  {mainGroupOptions.map((group) => (
                    <SelectItem key={group} value={group}>
                      {group}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border z-50">
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="p-3 text-left w-12">
                    <Checkbox
                      checked={selectedItems.length === paginatedSubgroups.length && paginatedSubgroups.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                  <th className="p-3 text-left w-12"></th>
                  <th className="p-3 text-left font-medium text-primary underline cursor-pointer hover:text-primary/80 transition-colors">
                    Main Group
                  </th>
                  <th className="p-3 text-left font-medium text-primary underline cursor-pointer hover:text-primary/80 transition-colors">
                    Code
                  </th>
                  <th className="p-3 text-left font-medium text-primary underline cursor-pointer hover:text-primary/80 transition-colors">
                    Sub Group
                  </th>
                  <th className="p-3 text-left font-medium text-primary underline cursor-pointer hover:text-primary/80 transition-colors">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedSubgroups.map((subgroup, index) => (
                  <tr
                    key={subgroup.id}
                    className={`border-b border-border/50 transition-colors duration-200 hover:bg-muted/30 ${
                      index % 2 === 0 ? "bg-muted/10" : ""
                    }`}
                  >
                    <td className="p-3">
                      <Checkbox
                        checked={selectedItems.includes(subgroup.id)}
                        onCheckedChange={(checked) =>
                          handleSelectItem(subgroup.id, checked as boolean)
                        }
                      />
                    </td>
                    <td className="p-3">
                      <div className="w-3 h-3 rounded-full bg-success"></div>
                    </td>
                    <td className="p-3 text-primary font-medium">{subgroup.mainGroup}</td>
                    <td className="p-3 font-medium">{subgroup.code}</td>
                    <td className="p-3 text-primary font-medium">{subgroup.name}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditSubgroup(subgroup)}
                          className="text-primary hover:text-primary/80 transition-colors"
                        >
                          <Pencil className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        {subgroup.canDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteSubgroup(subgroup.id)}
                            className="text-destructive hover:text-destructive/80 transition-colors"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-4">
            <p className="text-sm text-muted-foreground">
              Showing <span className="text-primary">1</span> to{" "}
              <span className="text-primary">{Math.min(parseInt(pageSize), filteredSubgroups.length)}</span> of{" "}
              <span className="text-primary">{filteredSubgroups.length}</span> items
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
                {Array.from({ length: Math.min(totalPages, 3) }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className="transition-all duration-200"
                  >
                    {page}
                  </Button>
                ))}
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
      </Card>

      {/* Add Subgroup Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Subgroup</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Main Group</Label>
              <Select
                value={formData.mainGroup}
                onValueChange={(value) => setFormData({ ...formData, mainGroup: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent className="bg-card border-border z-50">
                  {mainGroupOptions.map((group) => (
                    <SelectItem key={group} value={group}>
                      {group}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Account Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter subgroup name"
              />
            </div>
          </div>
          <DialogFooter className="flex justify-between sm:justify-between">
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
            <div className="flex gap-2">
              <Button onClick={handleAddSubgroup}>
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
            </div>
          </DialogFooter>
          <Button
            variant="link"
            onClick={() => setIsAddDialogOpen(false)}
            className="text-primary absolute bottom-4 right-4"
          >
            Close
          </Button>
        </DialogContent>
      </Dialog>

      {/* Edit Subgroup Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Subgroup</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Main Group</Label>
              <Select
                value={formData.mainGroup}
                onValueChange={(value) => setFormData({ ...formData, mainGroup: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent className="bg-card border-border z-50">
                  {mainGroupOptions.map((group) => (
                    <SelectItem key={group} value={group}>
                      {group}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Account Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter subgroup name"
              />
            </div>
          </div>
          <DialogFooter className="flex justify-between sm:justify-between">
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
            <Button onClick={handleUpdateSubgroup}>
              <Save className="h-4 w-4 mr-1" />
              Update
            </Button>
          </DialogFooter>
          <Button
            variant="link"
            onClick={() => setIsEditDialogOpen(false)}
            className="text-primary absolute bottom-4 right-4"
          >
            Close
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
};
