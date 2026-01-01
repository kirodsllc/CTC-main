import { useState, useEffect } from "react";
import { Plus, Search, Edit, Trash2, MoreVertical, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api";

interface Supplier {
  id: string;
  code: string;
  name: string | null;
  companyName: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  zipCode: string | null;
  email: string | null;
  phone: string | null;
  cnic: string | null;
  contactPerson: string | null;
  taxId: string | null;
  paymentTerms: string | null;
  status: "active" | "inactive";
  notes: string | null;
}

const emptySupplier: Omit<Supplier, "id"> = {
  code: "",
  name: "",
  companyName: "",
  address: "",
  city: "",
  state: "",
  country: "",
  zipCode: "",
  email: "",
  phone: "",
  cnic: "",
  contactPerson: "",
  taxId: "",
  paymentTerms: "",
  status: "active",
  notes: "",
};

export const SupplierManagement = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"suppliers" | "manage">("suppliers");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [fieldFilter, setFieldFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [formData, setFormData] = useState<Omit<Supplier, "id">>(emptySupplier);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
  const [supplierToToggle, setSupplierToToggle] = useState<Supplier | null>(null);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const response = await apiClient.getSuppliers({
        search: searchTerm || undefined,
        fieldFilter: fieldFilter !== "all" ? fieldFilter : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        page: currentPage,
        limit: rowsPerPage,
      });

      if (response.error) {
        toast({
          title: "Error",
          description: response.error,
          variant: "destructive",
        });
      } else {
        setSuppliers(response.data || []);
        setTotalRecords(response.pagination?.total || 0);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch suppliers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "suppliers") {
      fetchSuppliers();
    }
  }, [currentPage, rowsPerPage, statusFilter, activeTab]);

  // Reset to page 1 when filters change
  useEffect(() => {
    if (activeTab === "suppliers" && currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [statusFilter, activeTab]);

  const totalPages = Math.ceil(totalRecords / rowsPerPage);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(suppliers.map((s) => s.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    }
  };

  const handleInputChange = (field: keyof Omit<Supplier, "id">, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = async () => {
    if (!formData.code || !formData.companyName) {
      toast({
        title: "Validation Error",
        description: "Supplier Code and Company Name are required.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingId) {
        const response = await apiClient.updateSupplier(editingId, {
          code: formData.code,
          name: formData.name || undefined,
          companyName: formData.companyName,
          address: formData.address || undefined,
          city: formData.city || undefined,
          state: formData.state || undefined,
          country: formData.country || undefined,
          zipCode: formData.zipCode || undefined,
          email: formData.email || undefined,
          phone: formData.phone || undefined,
          cnic: formData.cnic || undefined,
          contactPerson: formData.contactPerson || undefined,
          taxId: formData.taxId || undefined,
          paymentTerms: formData.paymentTerms || undefined,
          status: formData.status,
          notes: formData.notes || undefined,
        });

        if (response.error) {
          toast({
            title: "Error",
            description: response.error,
            variant: "destructive",
          });
        } else {
          toast({ title: "Supplier Updated", description: "Supplier has been updated successfully." });
          setFormData(emptySupplier);
          setEditingId(null);
          setActiveTab("suppliers");
          fetchSuppliers();
        }
      } else {
        const response = await apiClient.createSupplier({
          code: formData.code,
          name: formData.name || undefined,
          companyName: formData.companyName,
          address: formData.address || undefined,
          city: formData.city || undefined,
          state: formData.state || undefined,
          country: formData.country || undefined,
          zipCode: formData.zipCode || undefined,
          email: formData.email || undefined,
          phone: formData.phone || undefined,
          cnic: formData.cnic || undefined,
          contactPerson: formData.contactPerson || undefined,
          taxId: formData.taxId || undefined,
          paymentTerms: formData.paymentTerms || undefined,
          status: formData.status,
          notes: formData.notes || undefined,
        });

        if (response.error) {
          toast({
            title: "Error",
            description: response.error,
            variant: "destructive",
          });
        } else {
          toast({ title: "Supplier Created", description: "New supplier has been added successfully." });
          setFormData(emptySupplier);
          setActiveTab("suppliers");
          fetchSuppliers();
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save supplier",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setFormData({
      code: supplier.code,
      name: supplier.name,
      companyName: supplier.companyName,
      address: supplier.address,
      city: supplier.city,
      state: supplier.state,
      country: supplier.country,
      zipCode: supplier.zipCode,
      email: supplier.email,
      phone: supplier.phone,
      cnic: supplier.cnic,
      contactPerson: supplier.contactPerson,
      taxId: supplier.taxId,
      paymentTerms: supplier.paymentTerms,
      status: supplier.status,
      notes: supplier.notes,
    });
    setEditingId(supplier.id);
    setActiveTab("manage");
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await apiClient.deleteSupplier(id);
      if (response.error) {
        toast({
          title: "Error",
          description: response.error,
          variant: "destructive",
        });
      } else {
        toast({ title: "Supplier Deleted", description: "Supplier has been removed." });
        fetchSuppliers();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete supplier",
        variant: "destructive",
      });
    }
  };

  const handleToggleStatusClick = (supplier: Supplier) => {
    setSupplierToToggle(supplier);
    setStatusConfirmOpen(true);
  };

  const handleToggleStatusConfirm = async () => {
    if (supplierToToggle) {
      const newStatus = supplierToToggle.status === "active" ? "inactive" : "active";
      try {
        const response = await apiClient.updateSupplier(supplierToToggle.id, {
          status: newStatus,
        });

        if (response.error) {
          toast({
            title: "Error",
            description: response.error,
            variant: "destructive",
          });
        } else {
          toast({ 
            title: "Status Updated", 
            description: `${supplierToToggle.companyName} is now ${newStatus === "active" ? "Active" : "Inactive"}.` 
          });
          fetchSuppliers();
        }
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to update status",
          variant: "destructive",
        });
      }
    }
    setStatusConfirmOpen(false);
    setSupplierToToggle(null);
  };

  const handleCancelForm = () => {
    setFormData(emptySupplier);
    setEditingId(null);
    setActiveTab("suppliers");
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Supplier Management</h1>
          <p className="text-xs text-muted-foreground">
            Manage your suppliers for purchase orders
          </p>
        </div>
        <Button
          onClick={() => {
            setFormData(emptySupplier);
            setEditingId(null);
            setActiveTab("manage");
          }}
          className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs"
        >
          <Plus className="w-3 h-3 mr-1" />
          New Supplier
        </Button>
      </div>


      {activeTab === "suppliers" && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Suppliers</h2>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-end">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Active/Inactive</Label>
                <Select 
                  value={statusFilter} 
                  onValueChange={(value) => {
                    setStatusFilter(value);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-24 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">All Fields</Label>
                <Select 
                  value={fieldFilter} 
                  onValueChange={(value) => {
                    setFieldFilter(value);
                  }}
                >
                  <SelectTrigger className="w-28 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Fields</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <Button 
                className="bg-primary text-primary-foreground h-8 text-xs px-4"
                onClick={() => {
                  setCurrentPage(1);
                  fetchSuppliers();
                }}
              >
                <Search className="w-3 h-3 mr-1" />
                Search
              </Button>
            </div>

            {/* Table */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="w-10">
                      <Checkbox
                        checked={
                          suppliers.length > 0 &&
                          suppliers.every((s) => selectedIds.includes(s.id))
                        }
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="text-xs font-medium">SR. NO</TableHead>
                    <TableHead className="text-xs font-medium">NAME</TableHead>
                    <TableHead className="text-xs font-medium">COMPANY NAME</TableHead>
                    <TableHead className="text-xs font-medium">ADDRESS</TableHead>
                    <TableHead className="text-xs font-medium">EMAIL</TableHead>
                    <TableHead className="text-xs font-medium">CNIC</TableHead>
                    <TableHead className="text-xs font-medium">CONTACT NO</TableHead>
                    <TableHead className="text-xs font-medium">STATUS</TableHead>
                    <TableHead className="text-xs font-medium">ACTIONS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-xs text-muted-foreground">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : suppliers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-xs text-muted-foreground">
                        No suppliers found
                      </TableCell>
                    </TableRow>
                  ) : (
                    suppliers.map((supplier, index) => (
                    <TableRow key={supplier.id} className="hover:bg-muted/20">
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(supplier.id)}
                          onCheckedChange={(checked) =>
                            handleSelectOne(supplier.id, checked as boolean)
                          }
                        />
                      </TableCell>
                      <TableCell className="text-xs">
                        {(currentPage - 1) * rowsPerPage + index + 1}
                      </TableCell>
                      <TableCell className="text-xs">{supplier.name || "-"}</TableCell>
                      <TableCell className="text-xs font-medium">{supplier.companyName}</TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate">
                        {supplier.address || "-"}
                      </TableCell>
                      <TableCell className="text-xs text-primary">{supplier.email || "-"}</TableCell>
                      <TableCell className="text-xs">{supplier.cnic || "-"}</TableCell>
                      <TableCell className="text-xs">{supplier.phone || "-"}</TableCell>
                      <TableCell>
                        <button
                          onClick={() => handleToggleStatusClick(supplier)}
                          title="Click to toggle status"
                        >
                          <Badge
                            variant={supplier.status === "active" ? "default" : "secondary"}
                            className={`text-xs cursor-pointer transition-colors ${
                              supplier.status === "active"
                                ? "bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700"
                                : "bg-muted text-muted-foreground hover:bg-green-100 hover:text-green-700"
                            }`}
                          >
                            • {supplier.status === "active" ? "Active" : "Inactive"}
                          </Badge>
                        </button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-primary hover:text-primary/80"
                            onClick={() => handleEdit(supplier)}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive hover:text-destructive/80"
                            onClick={() => handleDelete(supplier.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <MoreVertical className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {totalRecords === 0 ? (
                  <>Showing 0 to 0 of 0 Records</>
                ) : (
                  <>
                    Showing {Math.min((currentPage - 1) * rowsPerPage + 1, totalRecords)} to{" "}
                    {Math.min(currentPage * rowsPerPage, totalRecords)} of{" "}
                    {totalRecords} Records
                  </>
                )}
              </p>
              <div className="flex items-center gap-2">
                <Select
                  value={rowsPerPage.toString()}
                  onValueChange={(v) => {
                    setRowsPerPage(Number(v));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-16 h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      setCurrentPage(1);
                    }}
                    disabled={currentPage === 1 || totalPages === 0}
                  >
                    First
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      setCurrentPage(Math.max(1, currentPage - 1));
                    }}
                    disabled={currentPage === 1 || totalPages === 0}
                  >
                    Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      setCurrentPage(Math.min(totalPages, currentPage + 1));
                    }}
                    disabled={currentPage >= totalPages || totalPages === 0}
                  >
                    Next
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      setCurrentPage(totalPages);
                    }}
                    disabled={currentPage >= totalPages || totalPages === 0}
                  >
                    Last
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "manage" && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">
                {editingId ? "Edit Supplier" : "Create New Supplier"}
              </h2>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCancelForm}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">Supplier Code *</Label>
                <Input
                  placeholder="SUP-001"
                  value={formData.code}
                  onChange={(e) => handleInputChange("code", e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Supplier Name *</Label>
                <Input
                  placeholder="Enter supplier name"
                  value={formData.companyName}
                  onChange={(e) => handleInputChange("companyName", e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Email</Label>
                <Input
                  type="email"
                  placeholder="supplier@example.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Phone</Label>
                <Input
                  placeholder="+1 234 567 8900"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Contact Person</Label>
                <Input
                  placeholder="Contact person name"
                  value={formData.contactPerson}
                  onChange={(e) => handleInputChange("contactPerson", e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tax ID</Label>
                <Input
                  placeholder="Tax identification number"
                  value={formData.taxId}
                  onChange={(e) => handleInputChange("taxId", e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <h3 className="text-xs font-semibold text-foreground pt-2">Address Information</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1 md:col-span-2">
                <Label className="text-xs">Address</Label>
                <Input
                  placeholder="Street address"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">City</Label>
                <Input
                  placeholder="City"
                  value={formData.city}
                  onChange={(e) => handleInputChange("city", e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">State/Province</Label>
                <Input
                  placeholder="State or Province"
                  value={formData.state}
                  onChange={(e) => handleInputChange("state", e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Country</Label>
                <Input
                  placeholder="Country"
                  value={formData.country}
                  onChange={(e) => handleInputChange("country", e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Zip/Postal Code</Label>
                <Input
                  placeholder="Zip code"
                  value={formData.zipCode}
                  onChange={(e) => handleInputChange("zipCode", e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Payment Terms</Label>
                <Input
                  placeholder="e.g., Net 30, COD, etc."
                  value={formData.paymentTerms}
                  onChange={(e) => handleInputChange("paymentTerms", e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) => handleInputChange("status", v)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Notes</Label>
              <Textarea
                placeholder="Additional notes about the supplier..."
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                className="text-xs min-h-[80px]"
              />
            </div>

            <Button
              onClick={handleSubmit}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs"
            >
              {editingId ? "Update Supplier" : "Create Supplier"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Status Toggle Confirmation Dialog */}
      <AlertDialog open={statusConfirmOpen} onOpenChange={setStatusConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Supplier Status</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {supplierToToggle?.status === "active" ? "deactivate" : "activate"} "{supplierToToggle?.companyName}"?
              {supplierToToggle?.status === "active" 
                ? " This supplier will no longer appear in active supplier lists."
                : " This supplier will be available for new purchase orders."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleStatusConfirm}
              className={supplierToToggle?.status === "active" 
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : "bg-green-600 text-white hover:bg-green-700"}
            >
              {supplierToToggle?.status === "active" ? "Deactivate" : "Activate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
