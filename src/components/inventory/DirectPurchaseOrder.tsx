import { useState, useMemo, useEffect } from "react";
import { format } from "date-fns";
import { apiClient } from "@/lib/api";
import { SearchableSelect } from "@/components/ui/searchable-select";
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
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  X,
  Save,
  RotateCcw,
  Calendar,
  ArrowLeft,
} from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DirectPurchaseOrderItem {
  id: string;
  partNo: string;
  description: string;
  brand: string;
  uom: string;
  quantity: number;
  purchasePrice: number;
  salePrice: number;
  amount: number;
  rack: string;
  shelf: string;
}

interface DirectPurchaseOrder {
  id: string;
  dpoNo: string;
  store: string;
  requestDate: string;
  description: string;
  grandTotal: number;
  status: "Draft" | "Completed" | "Cancelled";
  items: DirectPurchaseOrderItem[];
  account: string;
}

interface Rack {
  id: string;
  name: string;
  shelves: string[];
}

// Expense types
const expenseTypes = [
  "Freight",
  "Handling Charges",
  "Customs Duty",
  "Insurance",
  "Packaging",
  "Other",
];

// Payable accounts
const payableAccounts = [
  "Accounts Payable",
  "Freight Payable",
  "Customs Payable",
  "Other Payables",
];

// Sample accounts
const accounts = [
  "Cash Account",
  "Bank Account",
  "Credit Card",
  "Petty Cash",
  "Supplier Credit",
];

// Sample suppliers
const suppliers = [
  "ABC Auto Parts Ltd.",
  "Global Motors Supply",
  "Premium Parts Co.",
  "AutoZone Distributors",
  "CarParts International",
];

type ViewMode = "list" | "create" | "edit";

interface OrderItemForm {
  id: string;
  partId: string;
  quantity: number;
  purchasePrice: number;
  salePrice: number;
  rack: string;
  shelf: string;
}

interface ExpenseForm {
  id: string;
  expenseType: string;
  payableAccount: string;
  description: string;
  amount: number;
}

export const DirectPurchaseOrder = () => {
  // Orders state
  const [orders, setOrders] = useState<DirectPurchaseOrder[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);

  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedOrder, setSelectedOrder] = useState<DirectPurchaseOrder | null>(null);

  // View dialog
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);

  // Form state
  const [formStore, setFormStore] = useState("");
  const [formSupplier, setFormSupplier] = useState("");
  const [formRequestDate, setFormRequestDate] = useState<Date>(new Date());
  const [formDescription, setFormDescription] = useState("");
  const [formAccount, setFormAccount] = useState("");
  const [formItems, setFormItems] = useState<OrderItemForm[]>([]);
  const [formExpenses, setFormExpenses] = useState<ExpenseForm[]>([]);

  // API data state
  const [stores, setStores] = useState<{ value: string; label: string }[]>([]);
  const [parts, setParts] = useState<{ id: string; partNo: string; description: string; brand: string; uom: string; price: number }[]>([]);
  const [racks, setRacks] = useState<{ id: string; name: string; shelves: { id: string; name: string }[] }[]>([]);
  const [newRackName, setNewRackName] = useState("");
  const [newShelfName, setNewShelfName] = useState("");
  const [showNewRackInput, setShowNewRackInput] = useState(false);
  const [showNewShelfInput, setShowNewShelfInput] = useState(false);
  const [selectedRackForShelf, setSelectedRackForShelf] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(25);

  // Fetch orders
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getDirectPurchaseOrders({
        status: statusFilter !== "all" ? statusFilter : undefined,
        page: currentPage,
        limit: itemsPerPage,
      });

      if (response.error) {
        toast.error(response.error);
        return;
      }

      const data = response.data || [];
      const pagination = response.pagination || { total: 0 };

      // Filter by search term on client side
      let filteredData = data;
      if (searchTerm) {
        filteredData = data.filter((order: any) => {
          const searchLower = searchTerm.toLowerCase();
          return (
            order.dpo_no?.toLowerCase().includes(searchLower) ||
            order.store_name?.toLowerCase().includes(searchLower) ||
            order.description?.toLowerCase().includes(searchLower)
          );
        });
      }

      setOrders(filteredData.map((o: any) => ({
        id: o.id,
        dpoNo: o.dpo_no,
        store: o.store_name || "N/A",
        requestDate: new Date(o.date).toLocaleDateString('en-GB'),
        description: o.description || "",
        grandTotal: o.total_amount || 0,
        status: o.status as "Draft" | "Completed" | "Cancelled",
        items: [],
        account: o.account || "",
      })));
      setTotalRecords(pagination.total || 0);
    } catch (error: any) {
      toast.error(`Error fetching orders: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch stores
  const fetchStores = async () => {
    try {
      const response = await apiClient.getStores();
      const storesData = response.data || response;
      if (Array.isArray(storesData)) {
        setStores(storesData.map((s: any) => ({ value: s.id, label: s.name })));
      }
    } catch (error: any) {
      console.error('Error fetching stores:', error);
    }
  };

  // Fetch parts
  const fetchParts = async () => {
    try {
      const response = await apiClient.getParts({ page: 1, limit: 1000, status: 'active' });
      const partsData = response.data || response;
      if (Array.isArray(partsData)) {
        setParts(partsData.map((p: any) => ({
          id: p.id,
          partNo: p.part_no || p.partNo,
          description: p.description || p.part_no || p.partNo || '',
          brand: p.brand?.name || 'N/A',
          uom: p.uom || 'pcs',
          price: p.priceA || p.cost || 0,
        })));
      }
    } catch (error: any) {
      console.error('Error fetching parts:', error);
    }
  };

  // Fetch racks and shelves
  const fetchRacksAndShelves = async () => {
    try {
      const [racksResponse, shelvesResponse] = await Promise.all([
        apiClient.getRacks(),
        apiClient.getShelves(),
      ]);

      const racksData = racksResponse.data || racksResponse;
      const shelvesData = shelvesResponse.data || shelvesResponse;

      if (Array.isArray(racksData) && Array.isArray(shelvesData)) {
        const racksWithShelves = racksData.map((rack: any) => ({
          id: rack.id,
          name: rack.codeNo || rack.code_no || rack.name || '',
          shelves: (shelvesData as any[])
            .filter((shelf: any) => shelf.rackId === rack.id || shelf.rack_id === rack.id)
            .map((shelf: any) => ({
              id: shelf.id,
              name: shelf.shelfNo || shelf.shelf_no || shelf.name || '',
            })),
        }));
        setRacks(racksWithShelves);
      }
    } catch (error: any) {
      console.error('Error fetching racks and shelves:', error);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [currentPage, itemsPerPage, statusFilter]);

  useEffect(() => {
    if (viewMode === "list") {
      fetchOrders();
    }
  }, [searchTerm]);

  useEffect(() => {
    fetchStores();
    fetchParts();
    fetchRacksAndShelves();
  }, []);

  // Filter orders (client-side for search)
  const filteredOrders = useMemo(() => {
    return orders;
  }, [orders]);

  // Pagination
  const totalPages = Math.ceil(totalRecords / itemsPerPage);
  const paginatedOrders = useMemo(() => {
    return filteredOrders;
  }, [filteredOrders]);

  // Generate new DPO number
  const generateDpoNo = () => {
    const year = new Date().getFullYear();
    const nextNum = totalRecords + 1;
    return `DPO-${year}-${String(nextNum).padStart(3, "0")}`;
  };

  // Reset form
  const resetForm = () => {
    setFormStore("");
    setFormSupplier("");
    setFormRequestDate(new Date());
    setFormDescription("");
    setFormAccount("");
    setFormItems([]);
    setFormExpenses([]);
    setShowNewRackInput(false);
    setShowNewShelfInput(false);
    setNewRackName("");
    setNewShelfName("");
  };

  // Open create view
  const handleNewOrder = () => {
    resetForm();
    setViewMode("create");
  };

  // Open edit view
  const handleEdit = async (order: DirectPurchaseOrder) => {
    try {
      setLoading(true);
      const response = await apiClient.getDirectPurchaseOrder(order.id);
      
      if (response.error) {
        toast.error(response.error);
        return;
      }

      const dpo = response;
      setSelectedOrder(order);
      setFormStore(dpo.store_id || "");
      setFormDescription(dpo.description || "");
      setFormAccount(dpo.account || "");
      setFormRequestDate(new Date(dpo.date));
      
      setFormItems(
        (dpo.items || []).map((item: any, idx: number) => ({
          id: String(idx + 1),
          partId: item.part_id,
          quantity: item.quantity,
          purchasePrice: item.purchase_price,
          salePrice: item.sale_price,
          rack: item.rack_id || "",
          shelf: item.shelf_id || "",
        }))
      );

      setFormExpenses(
        (dpo.expenses || []).map((exp: any, idx: number) => ({
          id: String(idx + 1),
          expenseType: exp.expense_type,
          payableAccount: exp.payable_account,
          description: exp.description || "",
          amount: exp.amount,
        }))
      );

      setViewMode("edit");
    } catch (error: any) {
      toast.error(`Error fetching order: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Open view dialog
  const handleView = async (order: DirectPurchaseOrder) => {
    try {
      setLoading(true);
      const response = await apiClient.getDirectPurchaseOrder(order.id);
      
      if (response.error) {
        toast.error(response.error);
        return;
      }

      const dpo = response;
      const viewOrder: DirectPurchaseOrder = {
        id: dpo.id,
        dpoNo: dpo.dpo_no,
        store: dpo.store_name || "N/A",
        requestDate: new Date(dpo.date).toLocaleDateString('en-GB'),
        description: dpo.description || "",
        grandTotal: dpo.total_amount || 0,
        status: dpo.status as "Draft" | "Completed" | "Cancelled",
        account: dpo.account || "",
        items: (dpo.items || []).map((item: any) => ({
          id: item.id,
          partNo: item.part_no,
          description: item.part_description || item.part_no,
          brand: item.brand || "",
          uom: item.uom || "pcs",
          quantity: item.quantity,
          purchasePrice: item.purchase_price,
          salePrice: item.sale_price,
          amount: item.amount,
          rack: item.rack_name || "",
          shelf: item.shelf_name || "",
        })),
      };

      setSelectedOrder(viewOrder);
      setShowViewDialog(true);
    } catch (error: any) {
      toast.error(`Error fetching order: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Back to list
  const handleBackToList = () => {
    setViewMode("list");
    setSelectedOrder(null);
    resetForm();
  };

  // Delete order
  const handleDeleteClick = (order: DirectPurchaseOrder) => {
    setOrderToDelete(order.id);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!orderToDelete) return;

    try {
      setLoading(true);
      const response = await apiClient.deleteDirectPurchaseOrder(orderToDelete);
      
      if (response.error) {
        toast.error(response.error);
        return;
      }

      toast.success("Direct Purchase Order deleted successfully");
      setOrderToDelete(null);
      fetchOrders();
    } catch (error: any) {
      toast.error(`Error deleting order: ${error.message}`);
    } finally {
      setLoading(false);
      setDeleteDialogOpen(false);
    }
  };

  // Add item to form
  const handleAddItem = () => {
    setFormItems((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        partId: "",
        quantity: 1,
        purchasePrice: 0,
        salePrice: 0,
        rack: "",
        shelf: "",
      },
    ]);
  };

  // Remove item from form
  const handleRemoveItem = (id: string) => {
    setFormItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Update form item
  const handleUpdateItem = (id: string, field: keyof OrderItemForm, value: string | number) => {
    setFormItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          // Reset shelf when rack changes
          if (field === "rack") {
            updated.shelf = "";
          }
          // Set sale price from part when part is selected
          if (field === "partId") {
            const part = parts.find((p) => p.id === value);
            if (part) {
              updated.salePrice = part.price;
            }
          }
          return updated;
        }
        return item;
      })
    );
  };

  // Add new rack
  const handleAddRack = async () => {
    if (!newRackName.trim() || !formStore) {
      toast.error("Please select a store and enter rack name");
      return;
    }

    try {
      setLoading(true);
      const response = await apiClient.createRack({
        codeNo: newRackName.trim(),
        storeId: formStore,
        description: `Rack ${newRackName.trim()}`,
        status: "Active",
      });

      if (response.error) {
        toast.error(response.error);
        return;
      }

      toast.success("Rack added successfully");
      setNewRackName("");
      setShowNewRackInput(false);
      fetchRacksAndShelves();
    } catch (error: any) {
      toast.error(`Error adding rack: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Add new shelf
  const handleAddShelf = async () => {
    if (!newShelfName.trim() || !selectedRackForShelf) {
      toast.error("Please select a rack and enter shelf name");
      return;
    }

    try {
      setLoading(true);
      const response = await apiClient.createShelf({
        shelfNo: newShelfName.trim(),
        rackId: selectedRackForShelf,
        description: `Shelf ${newShelfName.trim()}`,
        status: "Active",
      });

      if (response.error) {
        toast.error(response.error);
        return;
      }

      toast.success("Shelf added successfully");
      setNewShelfName("");
      setShowNewShelfInput(false);
      setSelectedRackForShelf("");
      fetchRacksAndShelves();
    } catch (error: any) {
      toast.error(`Error adding shelf: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Calculate total
  const calculateTotal = () => {
    return formItems.reduce((sum, item) => {
      return sum + item.purchasePrice * item.quantity;
    }, 0);
  };

  // Calculate total expenses
  const calculateTotalExpenses = () => {
    return formExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  };

  // Add expense
  const handleAddExpense = () => {
    setFormExpenses((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        expenseType: "",
        payableAccount: "",
        description: "",
        amount: 0,
      },
    ]);
  };

  // Remove expense
  const handleRemoveExpense = (id: string) => {
    setFormExpenses((prev) => prev.filter((expense) => expense.id !== id));
  };

  // Update expense
  const handleUpdateExpense = (id: string, field: keyof ExpenseForm, value: string | number) => {
    setFormExpenses((prev) =>
      prev.map((expense) =>
        expense.id === id ? { ...expense, [field]: value } : expense
      )
    );
  };

  // Save order
  const handleSave = async () => {
    if (!formStore) {
      toast.error("Please select a store");
      return;
    }
    if (!formAccount) {
      toast.error("Please select an account");
      return;
    }
    if (formItems.length === 0) {
      toast.error("Please add at least one item");
      return;
    }

    const validItems = formItems.filter((item) => item.partId && item.quantity > 0);
    if (validItems.length === 0) {
      toast.error("Please select at least one part with quantity");
      return;
    }

    try {
      setLoading(true);
      const dpoData = {
        dpo_number: viewMode === "edit" && selectedOrder ? selectedOrder.dpoNo : generateDpoNo(),
        date: format(formRequestDate, "yyyy-MM-dd"),
        store_id: formStore,
        supplier_id: formSupplier || undefined,
        account: formAccount,
        description: formDescription || undefined,
        status: "Completed",
        items: validItems.map((item) => ({
          part_id: item.partId,
          quantity: item.quantity,
          purchase_price: item.purchasePrice,
          sale_price: item.salePrice,
          amount: item.purchasePrice * item.quantity,
          rack_id: item.rack || undefined,
          shelf_id: item.shelf || undefined,
        })),
        expenses: formExpenses.length > 0 ? formExpenses.map((exp) => ({
          expense_type: exp.expenseType,
          payable_account: exp.payableAccount,
          description: exp.description || undefined,
          amount: exp.amount,
        })) : undefined,
      };

      let response;
      if (viewMode === "edit" && selectedOrder) {
        response = await apiClient.updateDirectPurchaseOrder(selectedOrder.id, dpoData);
      } else {
        response = await apiClient.createDirectPurchaseOrder(dpoData);
      }

      if (response.error) {
        toast.error(response.error);
        return;
      }

      toast.success(viewMode === "edit" ? "Direct Purchase Order updated successfully" : "Direct Purchase Order created successfully");
      handleBackToList();
      fetchOrders();
    } catch (error: any) {
      toast.error(`Error saving order: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Get status badge variant
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Completed":
        return <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20">{status}</Badge>;
      case "Draft":
        return <Badge variant="secondary">{status}</Badge>;
      case "Cancelled":
        return <Badge variant="destructive">{status}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Render list view
  const renderListView = () => (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Direct Purchase Orders</h1>
        <p className="text-muted-foreground text-sm">Manage direct purchase orders</p>
      </div>

      {/* New Order Button */}
      <Button onClick={handleNewOrder} className="bg-orange-500 hover:bg-orange-600 text-white">
        <Plus className="w-4 h-4 mr-2" />
        New Direct Purchase Order
      </Button>

      {/* Orders Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">
            All Direct Purchase Orders ({filteredOrders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading...
            </div>
          ) : paginatedOrders.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">S.NO</TableHead>
                    <TableHead>DPO No.</TableHead>
                    <TableHead>Store</TableHead>
                    <TableHead>Request Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Grand Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedOrders.map((order, index) => (
                    <TableRow key={order.id}>
                      <TableCell>{(currentPage - 1) * itemsPerPage + index + 1}</TableCell>
                      <TableCell className="font-medium">{order.dpoNo}</TableCell>
                      <TableCell>{order.store}</TableCell>
                      <TableCell>{order.requestDate}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{order.description || "-"}</TableCell>
                      <TableCell className="text-right font-medium">
                        {order.grandTotal.toLocaleString("en-PK", { style: "currency", currency: "PKR" })}
                      </TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleView(order)}
                            className="h-8 w-8"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(order)}
                            className="h-8 w-8"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(order)}
                            className="h-8 w-8 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No direct purchase orders found. Create one to get started.
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                {Math.min(currentPage * itemsPerPage, totalRecords)} of {totalRecords} entries
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // Render create/edit view
  const renderCreateEditView = () => (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={handleBackToList}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {viewMode === "edit" ? "Edit Direct Purchase Order" : "Add Direct Purchase Order"}
            </h1>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={handleBackToList}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Form Card */}
      <Card>
        <CardContent className="pt-6">
          {/* Header Fields */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="space-y-2">
              <Label>PO NO</Label>
              <Input
                value={viewMode === "edit" && selectedOrder ? selectedOrder.dpoNo : generateDpoNo()}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label>Request Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formRequestDate && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {formRequestDate ? format(formRequestDate, "MM/dd/yyyy") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={formRequestDate}
                    onSelect={(date) => date && setFormRequestDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Supplier</Label>
              <Select value={formSupplier} onValueChange={setFormSupplier}>
                <SelectTrigger className={cn(!formSupplier && "border-orange-500")}>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier} value={supplier}>
                      {supplier}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Store</Label>
              <SearchableSelect
                options={stores}
                value={formStore}
                onValueChange={setFormStore}
                placeholder="Select store..."
              />
              {!formStore && <p className="text-xs text-destructive">Required</p>}
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Enter description..."
              />
            </div>
          </div>

          {/* Item Parts Section */}
          <Card className="mb-6">
            <CardHeader className="py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium">Item Parts</CardTitle>
                <Button onClick={handleAddItem} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {formItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No items added yet</p>
                  <p className="text-sm">Click "Add New Item" to add items</p>
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Part</TableHead>
                        <TableHead>Brand</TableHead>
                        <TableHead>UoM</TableHead>
                        <TableHead className="w-24">Qty</TableHead>
                        <TableHead className="w-32">Purchase Price</TableHead>
                        <TableHead className="w-32">Sale Price</TableHead>
                        <TableHead className="w-32">Rack</TableHead>
                        <TableHead className="w-32">Shelf</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {formItems.map((item, index) => {
                        const selectedPart = parts.find((p) => p.id === item.partId);
                        const selectedRack = racks.find((r) => r.id === item.rack);
                        return (
                          <TableRow key={item.id}>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell>
                              <SearchableSelect
                                options={parts.map(p => ({ value: p.id, label: `${p.partNo} - ${p.description}` }))}
                                value={item.partId}
                                onValueChange={(value) => handleUpdateItem(item.id, "partId", value)}
                                placeholder="Select part..."
                              />
                            </TableCell>
                            <TableCell>{selectedPart?.brand || "-"}</TableCell>
                            <TableCell>{selectedPart?.uom || "-"}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => handleUpdateItem(item.id, "quantity", parseInt(e.target.value) || 1)}
                                className="w-20"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                value={item.purchasePrice}
                                onChange={(e) => handleUpdateItem(item.id, "purchasePrice", parseFloat(e.target.value) || 0)}
                                className="w-28"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                value={item.salePrice}
                                onChange={(e) => handleUpdateItem(item.id, "salePrice", parseFloat(e.target.value) || 0)}
                                className="w-28"
                              />
                            </TableCell>
                            <TableCell>
                              <SearchableSelect
                                options={racks.map(r => ({ value: r.id, label: r.name }))}
                                value={item.rack}
                                onValueChange={(value) => handleUpdateItem(item.id, "rack", value)}
                                placeholder="Select rack..."
                              />
                            </TableCell>
                            <TableCell>
                              <SearchableSelect
                                options={racks.find(r => r.id === item.rack)?.shelves.map(s => ({ value: s.id, label: s.name })) || []}
                                value={item.shelf}
                                onValueChange={(value) => handleUpdateItem(item.id, "shelf", value)}
                                placeholder="Select shelf..."
                                disabled={!item.rack}
                              />
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {(item.purchasePrice * item.quantity).toLocaleString("en-PK")}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveItem(item.id)}
                                className="h-8 w-8 text-destructive hover:text-destructive"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Rack and Shelves Section */}
          <Card className="mb-6">
            <CardHeader className="py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium">Rack and Shelves</CardTitle>
                <div className="flex gap-2">
                      {showNewRackInput ? (
                    <div className="flex gap-2">
                      <Input
                        value={newRackName}
                        onChange={(e) => setNewRackName(e.target.value)}
                        placeholder="Rack code..."
                        className="w-32"
                        disabled={loading}
                      />
                      <Button size="sm" onClick={handleAddRack} disabled={loading || !formStore}>
                        Add
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowNewRackInput(false)} disabled={loading}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => setShowNewRackInput(true)} disabled={!formStore}>
                      + Add New Rack
                    </Button>
                  )}
                  {showNewShelfInput ? (
                    <div className="flex gap-2">
                      <SearchableSelect
                        options={racks.map(r => ({ value: r.id, label: r.name }))}
                        value={selectedRackForShelf}
                        onValueChange={setSelectedRackForShelf}
                        placeholder="Select rack..."
                      />
                      <Input
                        value={newShelfName}
                        onChange={(e) => setNewShelfName(e.target.value)}
                        placeholder="Shelf number..."
                        className="w-32"
                        disabled={loading}
                      />
                      <Button size="sm" onClick={handleAddShelf} disabled={loading || !selectedRackForShelf}>
                        Add
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowNewShelfInput(false)} disabled={loading}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => setShowNewShelfInput(true)}>
                      + Add New Shelf
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Items Total - Before Expenses */}
          {formItems.length > 0 && (
            <div className="flex justify-end mb-6">
              <div className="bg-muted/30 border border-border rounded-lg px-4 py-2 text-right">
                <p className="text-xs text-muted-foreground">Items Total</p>
                <p className="text-lg font-bold text-primary">{calculateTotal().toLocaleString("en-PK")}</p>
              </div>
            </div>
          )}

          {/* Expense Section */}
          <Card className="mb-6">
            <CardHeader className="py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium">Expenses</CardTitle>
                <Button onClick={handleAddExpense} variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Expense
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {formExpenses.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <p className="text-sm">No expenses added yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 text-sm font-medium text-muted-foreground pb-2 border-b">
                    <div className="col-span-3">Expense Type</div>
                    <div className="col-span-3">Payable Account</div>
                    <div className="col-span-3">Description</div>
                    <div className="col-span-2 text-right">Amount</div>
                    <div className="col-span-1"></div>
                  </div>
                  {formExpenses.map((expense) => (
                    <div key={expense.id} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-3">
                        <Select
                          value={expense.expenseType}
                          onValueChange={(value) => handleUpdateExpense(expense.id, "expenseType", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            {expenseTypes.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-3">
                        <Select
                          value={expense.payableAccount}
                          onValueChange={(value) => handleUpdateExpense(expense.id, "payableAccount", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            {payableAccounts.map((account) => (
                              <SelectItem key={account} value={account}>
                                {account}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-3">
                        <Input
                          value={expense.description}
                          onChange={(e) => handleUpdateExpense(expense.id, "description", e.target.value)}
                          placeholder="Enter description..."
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          min="0"
                          value={expense.amount}
                          onChange={(e) => handleUpdateExpense(expense.id, "amount", parseFloat(e.target.value) || 0)}
                          className="text-right"
                        />
                      </div>
                      <div className="col-span-1 flex justify-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveExpense(expense.id)}
                          className="h-8 w-8 text-destructive hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-end pt-2 border-t mt-2">
                    <div className="text-sm font-medium">
                      Total Expenses: <span className="text-primary">{calculateTotalExpenses().toLocaleString("en-PK")}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Account and Total */}
          <div className="flex justify-end items-start gap-4 mb-6">
            <div className="space-y-2">
              <Label>Account</Label>
              <Select value={formAccount} onValueChange={setFormAccount}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account} value={account}>
                      {account}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!formAccount && <p className="text-orange-500 text-xs">Required</p>}
            </div>
            <div className="space-y-2">
              <Label>Total</Label>
              <Input value={calculateTotal().toFixed(2)} disabled className="w-32 text-right bg-muted" />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button variant="destructive" onClick={resetForm}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
            <div className="flex items-center gap-2">
              <Button onClick={handleSave} className="bg-orange-500 hover:bg-orange-600 text-white">
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
              <Button variant="link" onClick={handleBackToList} className="text-muted-foreground">
                Close
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Render view dialog
  const renderViewDialog = () => (
    <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Direct Purchase Order Details</DialogTitle>
          <DialogDescription>
            {selectedOrder?.dpoNo} - {selectedOrder?.requestDate}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-muted-foreground">DPO No</Label>
                  <p className="font-medium">{selectedOrder.dpoNo}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Store</Label>
                  <p className="font-medium">{selectedOrder.store}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Request Date</Label>
                  <p className="font-medium">{selectedOrder.requestDate}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div>{getStatusBadge(selectedOrder.status)}</div>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Description</Label>
                <p className="font-medium">{selectedOrder.description || "-"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Account</Label>
                <p className="font-medium">{selectedOrder.account}</p>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Part No</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Brand</TableHead>
                      <TableHead>UoM</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Purchase Price</TableHead>
                      <TableHead>Sale Price</TableHead>
                      <TableHead>Rack</TableHead>
                      <TableHead>Shelf</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedOrder.items.map((item, index) => (
                      <TableRow key={item.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell className="font-medium">{item.partNo}</TableCell>
                        <TableCell>{item.description}</TableCell>
                        <TableCell>{item.brand}</TableCell>
                        <TableCell>{item.uom}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{item.purchasePrice.toLocaleString("en-PK")}</TableCell>
                        <TableCell>{item.salePrice.toLocaleString("en-PK")}</TableCell>
                        <TableCell>{item.rack || "-"}</TableCell>
                        <TableCell>{item.shelf || "-"}</TableCell>
                        <TableCell className="text-right font-medium">
                          {item.amount.toLocaleString("en-PK")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-end">
                <div className="text-right">
                  <p className="text-muted-foreground">Grand Total</p>
                  <p className="text-2xl font-bold">
                    {selectedOrder.grandTotal.toLocaleString("en-PK", { style: "currency", currency: "PKR" })}
                  </p>
                </div>
              </div>
            </div>
          )}
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowViewDialog(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-4">
      {viewMode === "list" && renderListView()}
      {(viewMode === "create" || viewMode === "edit") && renderCreateEditView()}
      {renderViewDialog()}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this direct purchase order? This action cannot be undone and will also delete associated stock movements.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
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
