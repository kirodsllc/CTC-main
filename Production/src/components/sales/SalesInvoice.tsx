import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import {
  Search,
  Plus,
  Trash2,
  Eye,
  Truck,
  FileText,
  DollarSign,
  AlertTriangle,
  Clock,
  Package,
  X,
  Printer,
  Download,
  RefreshCw,
  Users,
  Info,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { InvoiceDeliveryLog } from "./InvoiceDeliveryLog";
import {
  Invoice,
  InvoiceItem,
  InvoiceStatus,
  CustomerType,
  PartItem,
  Customer,
  DeliveryLogEntry,
  ItemGrade,
} from "@/types/invoice";

// Customers Data
const mockCustomers: Customer[] = [
  { id: "1", name: "ABC Auto Parts", type: "registered", balance: 0, creditLimit: 50000, creditDays: 30 },
  { id: "2", name: "XYZ Trading Co", type: "registered", balance: 5000, creditLimit: 100000, creditDays: 45 },
  { id: "3", name: "Walk-in Customer", type: "walking", balance: 0, creditLimit: 0, creditDays: 0 },
];

// Parts Data
const mockParts: PartItem[] = [
  { 
    id: "1", 
    partNo: "TEST001", 
    description: "High quality brake pad for vehicles", 
    category: "Brakes", 
    price: 150.00, 
    availableQty: 50, 
    lastSalePrice: 145.00,
    grade: "A",
    brands: [{ id: "1", name: "Test Brand" }],
  },
  { 
    id: "2", 
    partNo: "TEST002", 
    description: "Premium air filter element", 
    category: "Filters", 
    price: 250.00, 
    availableQty: 30, 
    lastSalePrice: 240.00,
    grade: "A",
    brands: [{ id: "2", name: "Test Brand 2" }],
  },
  { 
    id: "3", 
    partNo: "ENG-001", 
    description: "Engine oil filter for diesel engines", 
    category: "Engine", 
    price: 120.00, 
    availableQty: 100, 
    lastSalePrice: 115.00,
    grade: "A",
    brands: [{ id: "3", name: "Bosch" }],
  },
];

// Alternate parts
const mockAlternateParts: { id: string; name: string; quantity: number; salePrice: number }[] = [
  { id: "alt1", name: "Alternate Brake Pad - Premium", quantity: 20, salePrice: 160.00 },
  { id: "alt2", name: "Alternate Brake Pad - Standard", quantity: 35, salePrice: 140.00 },
];

// Invoices Data
const mockInvoices: Invoice[] = [];

// Interface for inline item row
interface InlineItemRow {
  id: string;
  selectedPartId: string;
  qty: number;
  rate: number;
  showDetails: boolean;
}

export const SalesInvoice = () => {
  const [invoices, setInvoices] = useState<Invoice[]>(mockInvoices);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCustomerType, setFilterCustomerType] = useState<string>("all");

  // New Invoice State
  const [showNewInvoice, setShowNewInvoice] = useState(false);
  const [newInvoice, setNewInvoice] = useState<Partial<Invoice>>({
    customerType: "registered",
    items: [],
    overallDiscount: 0,
    overallDiscountType: "percent",
  });
  const [selectedCustomerId, setSelectedCustomerId] = useState("");

  // Inline items state - matching reference design
  const [inlineItems, setInlineItems] = useState<InlineItemRow[]>([]);

  // Alternate Parts/Brands Dialog
  const [showAlternateParts, setShowAlternateParts] = useState(false);
  const [showAlternateBrands, setShowAlternateBrands] = useState(false);
  const [currentItemForAlternate, setCurrentItemForAlternate] = useState<InlineItemRow | null>(null);

  // Payment fields
  const [discount, setDiscount] = useState(0);
  const [receivedCash, setReceivedCash] = useState(0);
  const [receivedBank, setReceivedBank] = useState(0);
  const [taxType, setTaxType] = useState("Without GST");
  const [deliveredTo, setDeliveredTo] = useState("");
  const [remarks, setRemarks] = useState("");

  // Delivery Log
  const [showDeliveryLog, setShowDeliveryLog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // View Invoice
  const [showViewInvoice, setShowViewInvoice] = useState(false);

  // Hold Dialog
  const [showHoldDialog, setShowHoldDialog] = useState(false);
  const [holdReason, setHoldReason] = useState("");
  const [invoiceToHold, setInvoiceToHold] = useState<Invoice | null>(null);

  // Cancel Confirmation
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [invoiceToCancel, setInvoiceToCancel] = useState<Invoice | null>(null);

  // Filter invoices
  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || inv.status === filterStatus;
    const matchesCustomerType =
      filterCustomerType === "all" || inv.customerType === filterCustomerType;
    return matchesSearch && matchesStatus && matchesCustomerType;
  });

  // Calculate totals
  const totalInvoices = invoices.length;
  const totalReceived = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
  const totalReceivable = invoices.reduce(
    (sum, inv) => sum + (inv.grandTotal - inv.paidAmount),
    0
  );
  const onHoldCount = invoices.filter((inv) => inv.status === "on_hold").length;
  const pendingDelivery = invoices.filter(
    (inv) => inv.status === "pending" || inv.status === "partially_delivered"
  ).length;

  // Get customers filtered by type
  const getFilteredCustomers = () => {
    if (newInvoice.customerType === "walking") {
      return mockCustomers.filter((c) => c.type === "walking");
    }
    return mockCustomers.filter((c) => c.type === "registered");
  };

  // Add new inline item row
  const handleAddNewItem = () => {
    const newItem: InlineItemRow = {
      id: `row-${Date.now()}`,
      selectedPartId: "",
      qty: 0,
      rate: 0,
      showDetails: false,
    };
    setInlineItems([...inlineItems, newItem]);
  };

  // Update inline item
  const handleUpdateInlineItem = (id: string, field: keyof InlineItemRow, value: any) => {
    setInlineItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          // If part changed, update rate from part data
          if (field === "selectedPartId" && value) {
            const part = mockParts.find((p) => p.id === value);
            if (part) {
              updated.rate = part.price;
            }
          }
          return updated;
        }
        return item;
      })
    );
  };

  // Remove inline item
  const handleRemoveInlineItem = (id: string) => {
    setInlineItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Get part data for inline item
  const getPartForItem = (partId: string) => {
    return mockParts.find((p) => p.id === partId);
  };

  // Calculate line total for inline item
  const calculateLineTotal = (item: InlineItemRow) => {
    return item.qty * item.rate;
  };

  // Calculate total amount
  const calculateTotalAmount = () => {
    return inlineItems.reduce((sum, item) => sum + calculateLineTotal(item), 0);
  };

  // Calculate amount after discount
  const calculateAmountAfterDiscount = () => {
    return calculateTotalAmount() - discount;
  };

  // Calculate due amount
  const calculateDueAmount = () => {
    return calculateAmountAfterDiscount() - receivedCash - receivedBank;
  };

  // Create new invoice
  const handleCreateInvoice = () => {
    const customer = mockCustomers.find((c) => c.id === selectedCustomerId);
    if (!customer) {
      toast({ title: "Error", description: "Please select a customer", variant: "destructive" });
      return;
    }
    if (inlineItems.length === 0 || inlineItems.every((i) => !i.selectedPartId)) {
      toast({ title: "Error", description: "Please add at least one item", variant: "destructive" });
      return;
    }

    // Convert inline items to invoice items
    const invoiceItems: InvoiceItem[] = inlineItems
      .filter((i) => i.selectedPartId && i.qty > 0)
      .map((item) => {
        const part = getPartForItem(item.selectedPartId);
        return {
          id: `item-${Date.now()}-${item.id}`,
          partId: item.selectedPartId,
          partNo: part?.partNo || "",
          description: part?.description || "",
          orderedQty: item.qty,
          deliveredQty: 0,
          pendingQty: item.qty,
          unitPrice: item.rate,
          discount: 0,
          discountType: "percent" as const,
          lineTotal: calculateLineTotal(item),
          grade: part?.grade || "A",
          brand: part?.brands[0]?.name,
        };
      });

    const subtotal = calculateTotalAmount();
    const grandTotal = calculateAmountAfterDiscount();
    const invoiceNo = `INV-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(3, "0")}`;

    const invoice: Invoice = {
      id: `INV${Date.now()}`,
      invoiceNo,
      invoiceDate: new Date().toISOString().split("T")[0],
      customerType: newInvoice.customerType as CustomerType,
      customerId: customer.id,
      customerName: customer.name,
      salesPerson: newInvoice.salesPerson || "Admin",
      items: invoiceItems,
      subtotal,
      overallDiscount: discount,
      overallDiscountType: "fixed",
      tax: 0,
      grandTotal,
      paidAmount: receivedCash + receivedBank,
      status: "pending",
      paymentStatus: receivedCash + receivedBank >= grandTotal ? "paid" : receivedCash + receivedBank > 0 ? "partial" : "unpaid",
      deliveryLog: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setInvoices((prev) => [invoice, ...prev]);
    resetForm();

    toast({
      title: "Invoice Created",
      description: `${invoiceNo} has been created. Items moved to RESERVED stock.`,
    });
  };

  // Reset form
  const resetForm = () => {
    setShowNewInvoice(false);
    setNewInvoice({
      customerType: "registered",
      items: [],
      overallDiscount: 0,
      overallDiscountType: "percent",
    });
    setSelectedCustomerId("");
    setInlineItems([]);
    setDiscount(0);
    setReceivedCash(0);
    setReceivedBank(0);
    setTaxType("Without GST");
    setDeliveredTo("");
    setRemarks("");
  };

  // Handle delivery recording
  const handleRecordDelivery = (delivery: DeliveryLogEntry, updatedItems: InvoiceItem[]) => {
    if (!selectedInvoice) return;

    const allDelivered = updatedItems.every((item) => item.pendingQty === 0);
    const newStatus: InvoiceStatus = allDelivered ? "fully_delivered" : "partially_delivered";

    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === selectedInvoice.id
          ? {
              ...inv,
              items: updatedItems,
              status: newStatus,
              deliveryLog: [...inv.deliveryLog, delivery],
              updatedAt: new Date().toISOString(),
            }
          : inv
      )
    );

    setSelectedInvoice((prev) =>
      prev
        ? {
            ...prev,
            items: updatedItems,
            status: newStatus,
            deliveryLog: [...prev.deliveryLog, delivery],
          }
        : null
    );

    toast({
      title: "Delivery Recorded",
      description: `${delivery.challanNo} - Items moved from RESERVED to OUT stock.`,
    });
  };

  // Hold invoice
  const handleHoldInvoice = () => {
    if (!invoiceToHold) return;

    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === invoiceToHold.id
          ? {
              ...inv,
              status: "on_hold",
              holdReason: holdReason,
              holdSince: new Date().toISOString().split("T")[0],
              updatedAt: new Date().toISOString(),
            }
          : inv
      )
    );

    setShowHoldDialog(false);
    setHoldReason("");
    setInvoiceToHold(null);
    toast({
      title: "Invoice On Hold",
      description: `Invoice has been put on hold.`,
    });
  };

  // Cancel invoice
  const handleCancelInvoice = () => {
    if (!invoiceToCancel) return;

    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === invoiceToCancel.id
          ? {
              ...inv,
              status: "cancelled",
              updatedAt: new Date().toISOString(),
            }
          : inv
      )
    );

    setShowCancelConfirm(false);
    setInvoiceToCancel(null);
    toast({
      title: "Invoice Cancelled",
      description: `Invoice has been cancelled. Reserved stock returned to available.`,
    });
  };

  // Release hold
  const handleReleaseHold = (invoice: Invoice) => {
    const hasPending = invoice.items.some((item) => item.pendingQty > 0);
    const hasDelivered = invoice.items.some((item) => item.deliveredQty > 0);

    let newStatus: InvoiceStatus = "pending";
    if (hasDelivered && hasPending) newStatus = "partially_delivered";
    else if (!hasPending) newStatus = "fully_delivered";

    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === invoice.id
          ? {
              ...inv,
              status: newStatus,
              holdReason: undefined,
              holdSince: undefined,
              updatedAt: new Date().toISOString(),
            }
          : inv
      )
    );

    toast({ title: "Hold Released", description: "Invoice is now active again." });
  };

  const getStatusBadge = (status: InvoiceStatus) => {
    const styles: Record<InvoiceStatus, string> = {
      draft: "bg-muted text-muted-foreground",
      pending: "bg-blue-500/10 text-blue-600 border-blue-500/20",
      partially_delivered: "bg-orange-500/10 text-orange-600 border-orange-500/20",
      fully_delivered: "bg-green-500/10 text-green-600 border-green-500/20",
      on_hold: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
      cancelled: "bg-destructive/10 text-destructive border-destructive/20",
    };
    const labels: Record<InvoiceStatus, string> = {
      draft: "Draft",
      pending: "Pending",
      partially_delivered: "Partial",
      fully_delivered: "Delivered",
      on_hold: "On Hold",
      cancelled: "Cancelled",
    };
    return (
      <Badge variant="outline" className={styles[status]}>
        {labels[status]}
      </Badge>
    );
  };

  const getPaymentBadge = (status: "unpaid" | "partial" | "paid") => {
    const styles = {
      unpaid: "bg-red-500/10 text-red-600 border-red-500/20",
      partial: "bg-orange-500/10 text-orange-600 border-orange-500/20",
      paid: "bg-green-500/10 text-green-600 border-green-500/20",
    };
    return (
      <Badge variant="outline" className={styles[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getGradeColor = (grade: ItemGrade) => {
    switch (grade) {
      case "A": return "bg-green-500/10 text-green-600 border-green-500/20";
      case "B": return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "C": return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
      case "D": return "bg-red-500/10 text-red-600 border-red-500/20";
    }
  };

  const selectedCustomer = mockCustomers.find((c) => c.id === selectedCustomerId);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Sales Invoice</h2>
          <p className="text-sm text-muted-foreground">
            Create invoices with stock reservation & partial delivery tracking
          </p>
        </div>
        <Button onClick={() => setShowNewInvoice(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          New Invoice
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalInvoices}</p>
                <p className="text-xs text-muted-foreground">Total Invoices</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  Rs {totalReceived.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Received</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <DollarSign className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  Rs {totalReceivable.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Receivable</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Truck className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{pendingDelivery}</p>
                <p className="text-xs text-muted-foreground">Pending Delivery</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{onHoldCount}</p>
                <p className="text-xs text-muted-foreground">On Hold</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by invoice number or customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterCustomerType} onValueChange={setFilterCustomerType}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Customer Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="walking">Walking (Party)</SelectItem>
                <SelectItem value="registered">Registered (Authority)</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="partially_delivered">Partial Delivery</SelectItem>
                <SelectItem value="fully_delivered">Fully Delivered</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* New Invoice Inline Form OR Invoices Table */}
      {showNewInvoice ? (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Create New Invoice
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={resetForm}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Customer Section */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Customer Type</Label>
                <Select
                  value={newInvoice.customerType}
                  onValueChange={(v) => {
                    setNewInvoice((prev) => ({ ...prev, customerType: v as CustomerType }));
                    setSelectedCustomerId("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="walking">Walk in Customer</SelectItem>
                    <SelectItem value="registered">Authority Sale</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tax Type</Label>
                <Select value={taxType} onValueChange={setTaxType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Without GST">Without GST</SelectItem>
                    <SelectItem value="With GST">With GST</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Customer Name</Label>
                <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer..." />
                  </SelectTrigger>
                  <SelectContent>
                    {getFilteredCustomers().map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedCustomer && selectedCustomer.balance > 0 && (
                  <p className="text-xs text-orange-600">
                    Previous Balance: Rs {selectedCustomer.balance.toLocaleString()}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Delivered To</Label>
                <Input
                  placeholder="Enter name"
                  value={deliveredTo}
                  onChange={(e) => setDeliveredTo(e.target.value)}
                />
              </div>
            </div>

            {/* Items Section - Inline Table Like Reference */}
            <div className="space-y-3">
              <Button onClick={handleAddNewItem} className="gap-2 bg-primary">
                <Plus className="w-4 h-4" />
                Add New Item
              </Button>

              {inlineItems.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="min-w-[250px]">Item Parts</TableHead>
                        <TableHead className="text-center">In Stock</TableHead>
                        <TableHead className="text-center">Qty</TableHead>
                        <TableHead className="text-center">Rate</TableHead>
                        <TableHead className="text-center">Total</TableHead>
                        <TableHead className="text-center">Remove</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inlineItems.map((item) => {
                        const part = getPartForItem(item.selectedPartId);
                        return (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div className="space-y-2">
                                <Select
                                  value={item.selectedPartId}
                                  onValueChange={(v) => handleUpdateInlineItem(item.id, "selectedPartId", v)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {mockParts.map((p) => (
                                      <SelectItem key={p.id} value={p.id}>
                                        {p.partNo} - {p.description}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {!item.selectedPartId && (
                                  <p className="text-destructive text-xs">Required</p>
                                )}
                                {part && (
                                  <>
                                    <p className="text-xs text-muted-foreground">
                                      Last Sold at: {part.lastSalePrice || 0}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {part.category}
                                    </p>
                                    <Button
                                      variant="default"
                                      size="sm"
                                      className="text-xs"
                                      onClick={() => handleUpdateInlineItem(item.id, "showDetails", !item.showDetails)}
                                    >
                                      {item.showDetails ? "Hide Details" : "Show Details"}
                                    </Button>
                                    {item.showDetails && part && (
                                      <div className="mt-2 p-2 bg-muted/50 rounded text-xs space-y-1">
                                        <p><strong>Grade:</strong> <Badge variant="outline" className={getGradeColor(part.grade)}>{part.grade}</Badge></p>
                                        <p><strong>Category:</strong> {part.category}</p>
                                        <p><strong>Brands:</strong> {part.brands.map(b => b.name).join(", ")}</p>
                                        {part.machineModels && (
                                          <p><strong>Machines:</strong> {part.machineModels.map(m => `${m.name} (${m.requiredQty})`).join(", ")}</p>
                                        )}
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div>
                                <p className="font-medium">{part?.availableQty || 0}</p>
                                <p className="text-xs text-muted-foreground">
                                  Avg Cost: {part?.price || 0}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min={0}
                                value={item.qty || ""}
                                onChange={(e) => handleUpdateInlineItem(item.id, "qty", parseInt(e.target.value) || 0)}
                                className="w-20 text-center mx-auto"
                                placeholder="0"
                              />
                              {item.qty === 0 && item.selectedPartId && (
                                <p className="text-destructive text-xs text-center mt-1">Required</p>
                              )}
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min={0}
                                value={item.rate || ""}
                                onChange={(e) => handleUpdateInlineItem(item.id, "rate", parseFloat(e.target.value) || 0)}
                                className="w-24 text-center mx-auto"
                                placeholder="0"
                              />
                              {item.rate === 0 && item.selectedPartId && (
                                <p className="text-destructive text-xs text-center mt-1">Required</p>
                              )}
                            </TableCell>
                            <TableCell className="text-center font-medium">
                              {calculateLineTotal(item).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center gap-2">
                                <Button
                                  variant="destructive"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleRemoveInlineItem(item.id)}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  className="text-xs"
                                  onClick={() => {
                                    setCurrentItemForAlternate(item);
                                    setShowAlternateParts(true);
                                  }}
                                >
                                  Alternate Parts
                                </Button>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  className="text-xs"
                                  onClick={() => {
                                    setCurrentItemForAlternate(item);
                                    setShowAlternateBrands(true);
                                  }}
                                >
                                  Alternate Brands
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            {/* Payment Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg border">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Discount</Label>
                  <Input
                    type="number"
                    min={0}
                    value={discount}
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Received Cash</Label>
                  <Input
                    type="number"
                    min={0}
                    value={receivedCash}
                    onChange={(e) => setReceivedCash(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Received Bank</Label>
                  <Input
                    type="number"
                    min={0}
                    value={receivedBank}
                    onChange={(e) => setReceivedBank(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Remarks</Label>
                <Textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Enter remarks..."
                  rows={6}
                />
              </div>

              <div className="space-y-3 p-4 bg-background rounded-lg border">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Amount:</span>
                  <span className="font-medium">Rs {calculateTotalAmount().toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-destructive">
                  <span>Discount:</span>
                  <span>-Rs {discount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-medium">After Discount:</span>
                  <span className="font-bold">Rs {calculateAmountAfterDiscount().toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Received:</span>
                  <span>Rs {(receivedCash + receivedBank).toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-medium">Due Amount:</span>
                  <span className="text-xl font-bold text-primary">
                    Rs {calculateDueAmount().toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button onClick={handleCreateInvoice}>
                <FileText className="w-4 h-4 mr-2" />
                Create Invoice
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Invoices Table */
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Invoice List</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-center">Delivery</TableHead>
                    <TableHead className="text-center">Payment</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">{inv.invoiceNo}</TableCell>
                      <TableCell>{inv.invoiceDate}</TableCell>
                      <TableCell>{inv.customerName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {inv.customerType === "walking" ? "Party" : "Authority"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        Rs {inv.grandTotal.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        Rs {inv.paidAmount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center">{getStatusBadge(inv.status)}</TableCell>
                      <TableCell className="text-center">{getPaymentBadge(inv.paymentStatus)}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* View */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setShowViewInvoice(true);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {/* Delivery - show for pending/partial delivery */}
                          {(inv.status === "pending" || inv.status === "partially_delivered") && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                setSelectedInvoice(inv);
                                setShowDeliveryLog(true);
                              }}
                            >
                              <Truck className="w-4 h-4" />
                            </Button>
                          )}
                          {/* Print */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => {
                              toast({ title: "Printing", description: `Printing invoice ${inv.invoiceNo}` });
                            }}
                          >
                            <Printer className="w-4 h-4" />
                          </Button>
                          {/* Hold - show for active invoices */}
                          {inv.status !== "cancelled" && inv.status !== "on_hold" && inv.status !== "fully_delivered" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-yellow-500 hover:text-yellow-600"
                              onClick={() => {
                                setInvoiceToHold(inv);
                                setShowHoldDialog(true);
                              }}
                            >
                              <Clock className="w-4 h-4" />
                            </Button>
                          )}
                          {/* Release Hold - show for on_hold invoices */}
                          {inv.status === "on_hold" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-green-500 hover:text-green-600"
                              onClick={() => handleReleaseHold(inv)}
                            >
                              <RefreshCw className="w-4 h-4" />
                            </Button>
                          )}
                          {/* Cancel/Delete */}
                          {inv.status !== "cancelled" && inv.status !== "fully_delivered" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => {
                                setInvoiceToCancel(inv);
                                setShowCancelConfirm(true);
                              }}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredInvoices.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        No invoices found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alternate Parts Dialog */}
      <Dialog open={showAlternateParts} onOpenChange={setShowAlternateParts}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Alternate Parts
              <Button variant="secondary" size="sm" onClick={() => setShowAlternateParts(false)}>
                Close
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Sale Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockAlternateParts.map((alt) => (
                  <TableRow
                    key={alt.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      toast({ title: "Alternate Selected", description: `Selected: ${alt.name}` });
                      setShowAlternateParts(false);
                    }}
                  >
                    <TableCell>{alt.id}</TableCell>
                    <TableCell>{alt.name}</TableCell>
                    <TableCell className="text-right">{alt.quantity}</TableCell>
                    <TableCell className="text-right">{alt.salePrice.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Alternate Brands Dialog */}
      <Dialog open={showAlternateBrands} onOpenChange={setShowAlternateBrands}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Alternate Brands
              <Button variant="secondary" size="sm" onClick={() => setShowAlternateBrands(false)}>
                Close
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {currentItemForAlternate && getPartForItem(currentItemForAlternate.selectedPartId)?.brands.map((brand) => (
              <Button
                key={brand.id}
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  toast({ title: "Brand Selected", description: `Selected: ${brand.name}` });
                  setShowAlternateBrands(false);
                }}
              >
                {brand.name}
              </Button>
            ))}
            {(!currentItemForAlternate || !getPartForItem(currentItemForAlternate.selectedPartId)) && (
              <p className="text-muted-foreground text-center py-4">No brands available</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* View Invoice Dialog */}
      <Dialog open={showViewInvoice} onOpenChange={setShowViewInvoice}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Invoice Details - {selectedInvoice?.invoiceNo}
            </DialogTitle>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="font-medium">{selectedInvoice.invoiceDate}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Customer</p>
                  <p className="font-medium">{selectedInvoice.customerName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Type</p>
                  <Badge variant="outline">
                    {selectedInvoice.customerType === "walking" ? "Party Sale" : "Authority Sale"}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  {getStatusBadge(selectedInvoice.status)}
                </div>
              </div>

              {selectedInvoice.holdReason && (
                <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                  <p className="text-sm font-medium text-yellow-600">On Hold</p>
                  <p className="text-sm text-muted-foreground">
                    Reason: {selectedInvoice.holdReason}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Since: {selectedInvoice.holdSince}
                  </p>
                </div>
              )}

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Part No</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-center">Ordered</TableHead>
                      <TableHead className="text-center">Delivered</TableHead>
                      <TableHead className="text-center">Pending</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedInvoice.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.partNo}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {item.description}
                        </TableCell>
                        <TableCell className="text-center">{item.orderedQty}</TableCell>
                        <TableCell className="text-center text-green-600">
                          {item.deliveredQty}
                        </TableCell>
                        <TableCell className="text-center text-orange-600">
                          {item.pendingQty}
                        </TableCell>
                        <TableCell className="text-right">
                          Rs {item.lineTotal.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-between items-center p-4 bg-muted/30 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Payment Status</p>
                  {getPaymentBadge(selectedInvoice.paymentStatus)}
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Grand Total</p>
                  <p className="text-2xl font-bold text-primary">
                    Rs {selectedInvoice.grandTotal.toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Paid: Rs {selectedInvoice.paidAmount.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button variant="outline" size="sm">
                  <Printer className="w-4 h-4 mr-2" />
                  Print
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delivery Log */}
      {selectedInvoice && (
        <InvoiceDeliveryLog
          open={showDeliveryLog}
          onOpenChange={setShowDeliveryLog}
          invoiceNo={selectedInvoice.invoiceNo}
          items={selectedInvoice.items}
          deliveryLog={selectedInvoice.deliveryLog}
          onRecordDelivery={handleRecordDelivery}
        />
      )}

      {/* Hold Dialog */}
      <Dialog open={showHoldDialog} onOpenChange={setShowHoldDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-500" />
              Put Invoice On Hold
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Items in this invoice will remain in RESERVED stock until the hold is released or
              invoice is cancelled.
            </p>
            <div className="space-y-2">
              <Label>Reason for Hold</Label>
              <Textarea
                value={holdReason}
                onChange={(e) => setHoldReason(e.target.value)}
                placeholder="Enter reason..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHoldDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleHoldInvoice} className="bg-yellow-500 hover:bg-yellow-600">
              Put On Hold
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation */}
      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Cancel Invoice?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel the invoice and return all RESERVED items back to AVAILABLE stock.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Invoice</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelInvoice}
              className="bg-destructive hover:bg-destructive/90"
            >
              Cancel Invoice
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
