import { useState, useMemo, useEffect } from "react";
import { format } from "date-fns";
import apiClient from "@/lib/api";
import {
  ShoppingCart,
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  PackageCheck,
  X,
  Download,
  Printer,
  Save,
  RotateCcw,
  MoreVertical,
  Calendar,
  ArrowLeft,
  History,
  Package,
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
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface PurchaseOrderItem {
  id: string;
  partNo: string;
  description: string;
  brand: string;
  uom: string;
  quantity: number;
  receivedQty: number;
  purchasePrice: number;
  salePrice: number;
  cost: number;
  amount: number;
  remarks: string;
  currentStock?: number;
  lastPurchaseDate?: string;
}

interface PurchaseOrder {
  id: string;
  poNo: string;
  supplier: string;
  store: string;
  requestDate: string;
  receiveDate: string | null;
  grandTotal: number;
  remarks: string;
  status: "Draft" | "Pending" | "Received" | "Cancelled";
  items: PurchaseOrderItem[];
}

interface Expense {
  id: string;
  type: string;
  payableAccount: string;
  description: string;
  amount: number;
}

interface Rack {
  id: string;
  name: string;
  shelves: string[];
}

// Sample expense types
const expenseTypes = [
  "Freight",
  "Customs Duty",
  "Handling Charges",
  "Insurance",
  "Documentation Fee",
  "Other",
];

// Sample payable accounts
const payableAccounts = [
  "Cash Account",
  "Bank Account",
  "Credit Card",
  "Petty Cash",
  "Supplier Credit",
];

// Sample suppliers
const suppliers = [
  "AutoParts Direct Inc.",
  "Global Auto Supplies",
  "Heavy Vehicle Parts Co.",
  "Test Supplier",
  "Premium Parts Ltd.",
];

// Sample racks
const sampleRacks: Rack[] = [
  { id: "1", name: "Rack A", shelves: ["Shelf 1", "Shelf 2", "Shelf 3"] },
  { id: "2", name: "Rack B", shelves: ["Shelf 1", "Shelf 2"] },
  { id: "3", name: "Rack C", shelves: ["Shelf 1", "Shelf 2", "Shelf 3", "Shelf 4"] },
];

// Sample parts for selection - empty by default
const availableParts: { id: string; partNo: string; description: string; brand: string; uom: string; price: number; currentStock: number; lastPurchaseDate: string }[] = [];

// Sample purchase orders - empty by default
const sampleOrders: PurchaseOrder[] = [];

// Print columns configuration
const printColumns = [
  { id: "srNo", label: "Sr. No." },
  { id: "oemPartNo", label: "OEM/Part No" },
  { id: "item", label: "Item" },
  { id: "brand", label: "Brand" },
  { id: "uom", label: "UoM" },
  { id: "receivedQty", label: "Received Qty" },
  { id: "rack", label: "Rack" },
  { id: "shelf", label: "Shelf" },
  { id: "purchasePrice", label: "Purchase Price" },
  { id: "amount", label: "Amount" },
  { id: "costPercent", label: "Cost %" },
  { id: "cost", label: "Cost" },
  { id: "costUnit", label: "Cost/Unit" },
  { id: "remarks", label: "Remarks" },
];

// ViewOrderDialog component
interface ViewOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: PurchaseOrder | null;
  statusColors: Record<string, string>;
  formatCurrency: (amount: number) => string;
}

const ViewOrderDialog = ({ open, onOpenChange, order, statusColors, formatCurrency }: ViewOrderDialogProps) => {
  const [selectedColumns, setSelectedColumns] = useState<string[]>(
    printColumns.map((col) => col.id)
  );

  const handleSelectAll = () => {
    setSelectedColumns(printColumns.map((col) => col.id));
  };

  const handleClear = () => {
    setSelectedColumns([]);
  };

  const handleToggleColumn = (colId: string) => {
    setSelectedColumns((prev) =>
      prev.includes(colId)
        ? prev.filter((id) => id !== colId)
        : [...prev, colId]
    );
  };

  // Calculate totals from items
  const calculateTotals = () => {
    if (!order) return { totalAmount: 0, discount: 0, grandTotal: 0 };
    const totalAmount = order.items.reduce(
      (sum, item) => sum + item.quantity * item.salePrice,
      0
    );
    return {
      totalAmount,
      discount: 0,
      grandTotal: totalAmount,
    };
  };

  const totals = calculateTotals();

  // Generate printable content
  const generatePrintContent = () => {
    if (!order) return "";

    const visibleColumns = printColumns.filter((col) =>
      selectedColumns.includes(col.id)
    );

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Purchase Order - ${order.poNo}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #333; font-size: 24px; margin-bottom: 10px; }
          .header { margin-bottom: 20px; }
          .header-info { display: flex; flex-wrap: wrap; gap: 20px; margin-bottom: 20px; }
          .header-info div { min-width: 150px; }
          .header-info label { color: #666; font-size: 12px; display: block; }
          .header-info span { font-weight: 600; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { background-color: #f97316; color: white; padding: 10px; text-align: left; font-size: 12px; }
          td { border: 1px solid #ddd; padding: 8px; font-size: 12px; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .totals { text-align: right; margin-top: 10px; }
          .totals p { margin: 5px 0; }
          .totals .grand-total { font-weight: bold; font-size: 14px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Purchase Order Details</h1>
          <p>PO No.: ${order.poNo}</p>
        </div>
        <div class="header-info">
          <div><label>Supplier:</label><span>${order.supplier}</span></div>
          <div><label>Store:</label><span>${order.store}</span></div>
          <div><label>Date:</label><span>${order.requestDate}</span></div>
          <div><label>PO No:</label><span>${order.poNo}</span></div>
          <div><label>Remarks:</label><span>${order.remarks || "-"}</span></div>
          <div><label>Status:</label><span>${order.status}</span></div>
        </div>
        <table>
          <thead>
            <tr>
              ${visibleColumns
                .map((col) => `<th>${col.label}</th>`)
                .join("")}
            </tr>
          </thead>
          <tbody>
            ${order.items.length > 0
              ? order.items
                  .map((item, idx) => {
                    const rowData: Record<string, string> = {
                      srNo: String(idx + 1),
                      oemPartNo: item.partNo,
                      item: item.description,
                      brand: item.brand,
                      uom: item.uom,
                      receivedQty: String(item.receivedQty),
                      rack: "-",
                      shelf: "-",
                      purchasePrice: formatCurrency(item.purchasePrice),
                      amount: formatCurrency(item.quantity * item.salePrice),
                      costPercent: "-",
                      cost: formatCurrency(item.cost),
                      costUnit: "-",
                      remarks: item.remarks || "-",
                    };
                    return `<tr>${visibleColumns
                      .map((col) => `<td>${rowData[col.id] || "-"}</td>`)
                      .join("")}</tr>`;
                  })
                  .join("")
              : `<tr><td colspan="${visibleColumns.length}" style="text-align: center;">No items in this order</td></tr>`}
          </tbody>
        </table>
        <div class="totals">
          <p>Total Amount: <strong>PKR ${totals.totalAmount.toLocaleString()}</strong></p>
          <p>Discount: <strong>PKR ${totals.discount.toLocaleString()}</strong></p>
          <p class="grand-total">Grand Total: <strong>PKR ${totals.grandTotal.toLocaleString()}</strong></p>
        </div>
      </body>
      </html>
    `;
    return html;
  };

  const handlePrint = () => {
    const printContent = generatePrintContent();
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };

  const handleGeneratePDF = () => {
    const printContent = generatePrintContent();
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
    toast.success("PDF generation started - use your browser's print dialog to save as PDF");
  };

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" />
            Purchase Order Details
          </DialogTitle>
          <DialogDescription>PO No.: {order.poNo}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Print Column Selection */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium">Print Column Selection</h4>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleSelectAll}>
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={handleClear}>
                  Clear
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {printColumns.map((col) => (
                <div key={col.id} className="flex items-center gap-2">
                  <Checkbox
                    id={col.id}
                    checked={selectedColumns.includes(col.id)}
                    onCheckedChange={() => handleToggleColumn(col.id)}
                  />
                  <Label htmlFor={col.id} className="text-xs cursor-pointer">
                    {col.label}
                  </Label>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Tip: Select the columns you want, then click{" "}
              <strong>PRINT</strong>. It will print only the invoice tables.
            </p>
          </div>

          {/* Order Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Supplier:</span>
              <p className="font-medium">{order.supplier}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Store:</span>
              <p className="font-medium">{order.store}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Date:</span>
              <p className="font-medium">{order.requestDate}</p>
            </div>
            <div>
              <span className="text-muted-foreground">PO No:</span>
              <p className="font-medium">{order.poNo}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Remarks:</span>
              <p className="font-medium">{order.remarks || "-"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Status:</span>
              <Badge
                variant="outline"
                className={cn("mt-1", statusColors[order.status])}
              >
                {order.status}
              </Badge>
            </div>
          </div>

          {/* Items Table */}
          <div className="border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-primary hover:bg-primary">
                  <TableHead className="text-xs text-primary-foreground">Sr. No.</TableHead>
                  <TableHead className="text-xs text-primary-foreground">OEM/Part No</TableHead>
                  <TableHead className="text-xs text-primary-foreground">Item</TableHead>
                  <TableHead className="text-xs text-primary-foreground">Brand</TableHead>
                  <TableHead className="text-xs text-primary-foreground">UoM</TableHead>
                  <TableHead className="text-xs text-primary-foreground text-right">Qty</TableHead>
                  <TableHead className="text-xs text-primary-foreground text-right">Price</TableHead>
                  <TableHead className="text-xs text-primary-foreground text-right">Amount</TableHead>
                  <TableHead className="text-xs text-primary-foreground">Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.length > 0 ? (
                  order.items.map((item, idx) => (
                    <TableRow key={item.id} className="hover:bg-muted/50">
                      <TableCell className="text-sm">{idx + 1}</TableCell>
                      <TableCell className="text-sm font-medium">{item.partNo}</TableCell>
                      <TableCell className="text-sm">{item.description}</TableCell>
                      <TableCell className="text-sm">{item.brand}</TableCell>
                      <TableCell className="text-sm">{item.uom}</TableCell>
                      <TableCell className="text-sm text-right">{item.quantity}</TableCell>
                      <TableCell className="text-sm text-right">{formatCurrency(item.salePrice)}</TableCell>
                      <TableCell className="text-sm text-right">{formatCurrency(item.quantity * item.salePrice)}</TableCell>
                      <TableCell className="text-sm">{item.remarks || "-"}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-4">
                      No items in this order
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <div className="p-4 text-right space-y-1 bg-muted/30">
              <p className="text-sm">
                Total Amount:{" "}
                <span className="font-medium">PKR {totals.totalAmount.toLocaleString()}</span>
              </p>
              <p className="text-sm">
                Discount:{" "}
                <span className="font-medium">PKR {totals.discount.toLocaleString()}</span>
              </p>
              <p className="text-sm font-semibold">
                Grand Total: PKR {totals.grandTotal.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Expenses */}
          <div className="border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-primary hover:bg-primary">
                  <TableHead className="text-xs text-primary-foreground">Sr. No.</TableHead>
                  <TableHead className="text-xs text-primary-foreground">Expenses</TableHead>
                  <TableHead className="text-xs text-primary-foreground">Payable Account</TableHead>
                  <TableHead className="text-xs text-primary-foreground">Description</TableHead>
                  <TableHead className="text-xs text-primary-foreground text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
                    No expenses found.
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <div className="p-4 text-right bg-muted/30">
              <p className="text-sm font-medium">Total Expenses = PKR 0</p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
            onClick={() => onOpenChange(false)}
          >
            <X className="w-4 h-4 mr-1" />
            Close
          </Button>
          <Button variant="outline" onClick={handleGeneratePDF}>
            <Download className="w-4 h-4 mr-1" />
            Generate PDF
          </Button>
          <Button className="bg-primary hover:bg-primary/90" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-1" />
            PRINT
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

type ViewMode = "list" | "create" | "edit" | "receive";

interface OrderItemForm {
  id: string;
  partId: string;
  quantity: number;
  remarks: string;
}

interface ReceiveItemForm {
  id: string;
  partNo: string;
  description: string;
  brand: string;
  price: number;
  purchasePrice: number;
  salePrice: number;
  priceA: number;
  priceB: number;
  priceM: number;
  quantity: number;
  receivedQty: number;
  cost: number;
  amount: number;
  currentStock?: number;
  lastPurchaseDate?: string;
}

export const PurchaseOrder = () => {
  // Orders state
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  
  // Available data for dropdowns
  const [availableParts, setAvailableParts] = useState<{ id: string; partNo: string; description: string; brand: string; uom: string; price: number; currentStock: number; lastPurchaseDate: string }[]>([]);
  const [availableSuppliers, setAvailableSuppliers] = useState<string[]>([]);
  const [availableStores, setAvailableStores] = useState<{ id: string; name: string }[]>([]);

  // View mode state (replaces dialog mode)
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);

  // View dialog (only for viewing details)
  const [showViewDialog, setShowViewDialog] = useState(false);

  // Form state
  const [formSupplier, setFormSupplier] = useState("");
  const [formRequestDate, setFormRequestDate] = useState<Date>(new Date());
  const [formRemarks, setFormRemarks] = useState("");
  const [formItems, setFormItems] = useState<OrderItemForm[]>([{ id: "1", partId: "", quantity: 1, remarks: "" }]);

  // Receive form state
  const [receiveDate, setReceiveDate] = useState<Date>(new Date());
  const [receiveStore, setReceiveStore] = useState("");
  const [receiveRemarks, setReceiveRemarks] = useState("");
  const [receiveCurrency, setReceiveCurrency] = useState("pkr");
  const [receiveItems, setReceiveItems] = useState<ReceiveItemForm[]>([]);
  const [selectedReceiveItem, setSelectedReceiveItem] = useState<string>("");
  
  
  // Rack and shelf state
  const [racks, setRacks] = useState<Rack[]>(sampleRacks);
  const [selectedRack, setSelectedRack] = useState("");
  const [selectedShelf, setSelectedShelf] = useState("");
  const [newRackName, setNewRackName] = useState("");
  const [newShelfName, setNewShelfName] = useState("");

  // Expenses state
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // Totals state
  const [discount, setDiscount] = useState(0);
  const [discountPkr, setDiscountPkr] = useState(0);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Fetch purchase orders from API
  const fetchPurchaseOrders = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        limit: itemsPerPage,
      };
      if (statusFilter !== "all") {
        params.status = statusFilter;
      }

      const response = await apiClient.getPurchaseOrders(params);
      const data = response.data || response;
      
      // Handle paginated response
      const ordersData = data.data || (Array.isArray(data) ? data : []);
      
      // Map orders with items (items are now included in the response)
      const ordersWithItems: PurchaseOrder[] = ordersData.map((po: any) => {
        const items: PurchaseOrderItem[] = (po.items || []).map((item: any) => ({
          id: item.id || String(Date.now()),
          partNo: item.part_no || item.partNo || "",
          description: item.part_description || item.description || "",
          brand: item.brand || "N/A",
          uom: "pcs",
          quantity: item.quantity || 0,
          receivedQty: item.received_qty || item.receivedQty || 0,
          purchasePrice: item.unit_cost || item.unitCost || 0,
          salePrice: 0,
          cost: item.total_cost || item.totalCost || 0,
          amount: item.total_cost || item.totalCost || 0,
          remarks: item.notes || "",
        }));
        
        return {
          id: po.id,
          poNo: po.po_number || po.poNumber || `PO-${po.id}`,
          supplier: po.supplier_name || po.supplier || "N/A",
          store: po.store_name || po.store || "-",
          requestDate: po.date ? format(new Date(po.date), "dd/MM/yyyy") : format(new Date(), "dd/MM/yyyy"),
          receiveDate: null,
          grandTotal: po.total_amount || 0,
          remarks: po.notes || "",
          status: (po.status || "Draft") as "Draft" | "Pending" | "Received" | "Cancelled",
          items: items,
        };
      });
      
      setOrders(ordersWithItems);
    } catch (error: any) {
      console.error('Error fetching purchase orders:', error);
      toast.error('Failed to fetch purchase orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch parts for dropdown
  const fetchParts = async () => {
    try {
      const response = await apiClient.getParts({ page: 1, limit: 1000, status: 'active' });
      const partsData = response.data || response;
      
      if (Array.isArray(partsData)) {
        // Get all stock balances at once
        const balancesResponse = await apiClient.getStockBalances({ limit: 1000 });
        const balancesData = balancesResponse.data || balancesResponse;
        const balancesMap = new Map();
        
        if (Array.isArray(balancesData)) {
          balancesData.forEach((balance: any) => {
            balancesMap.set(balance.part_id, balance.current_stock || 0);
          });
        }
        
        const partsWithStock = partsData.map((part: any) => ({
          id: part.id,
          partNo: part.part_no || part.partNo,
          description: part.description || "",
          brand: part.brand_name || part.brand?.name || "N/A",
          uom: part.uom || "pcs",
          price: part.price_a || part.priceA || 0,
          currentStock: balancesMap.get(part.id) || 0,
          lastPurchaseDate: "-",
        }));
        
        setAvailableParts(partsWithStock);
      }
    } catch (error: any) {
      console.error('Error fetching parts:', error);
      toast.error('Failed to fetch parts');
    }
  };

  // Fetch stores
  const fetchStores = async () => {
    try {
      const response = await apiClient.getStores();
      const storesData = response.data || response;
      if (Array.isArray(storesData)) {
        setAvailableStores(storesData.map((s: any) => ({
          id: s.id,
          name: s.name || s.code || "Unknown",
        })));
      }
    } catch (error: any) {
      console.error('Error fetching stores:', error);
    }
  };

  // Fetch suppliers (using sample for now, can be extended with supplier API)
  const fetchSuppliers = async () => {
    // For now, use sample suppliers. Can be extended with supplier API later
    setAvailableSuppliers(suppliers);
  };

  // Fetch all data on mount
  useEffect(() => {
    fetchPurchaseOrders();
    fetchParts();
    fetchStores();
    fetchSuppliers();
  }, [currentPage, statusFilter]);

  // Filter orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch =
        order.poNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.remarks.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || order.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, statusFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredOrders.slice(start, start + itemsPerPage);
  }, [filteredOrders, currentPage, itemsPerPage]);

  // Generate new PO number
  const generatePoNo = async () => {
    try {
      // Get current year and month
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      
      // Fetch existing orders to get the next number
      const response = await apiClient.getPurchaseOrders({ limit: 1 });
      const data = response.data || response;
      const existingOrders = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
      const nextNum = existingOrders.length + 1;
      
      return `PO-${String(year).slice(-2)}${month}-${String(nextNum).padStart(3, "0")}`;
    } catch {
      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, '0');
      return `PO-${String(year).slice(-2)}${month}-001`;
    }
  };

  // Reset form
  const resetForm = () => {
    setFormSupplier("");
    setFormRequestDate(new Date());
    setFormRemarks("");
    setFormItems([{ id: "1", partId: "", quantity: 1, remarks: "" }]);
  };

  // Open create view
  const handleNewOrder = () => {
    resetForm();
    setViewMode("create");
  };

  // Open edit view
  const handleEdit = (order: PurchaseOrder) => {
    setSelectedOrder(order);
    setFormSupplier(order.supplier);
    setFormRemarks(order.remarks);
    const dateParts = order.requestDate.split("/");
    if (dateParts.length === 3) {
      setFormRequestDate(new Date(parseInt(dateParts[2]), parseInt(dateParts[1]) - 1, parseInt(dateParts[0])));
    }
    setFormItems(
      order.items.length > 0
        ? order.items.map((item, idx) => ({
            id: String(idx + 1),
            partId: availableParts.find((p) => p.partNo === item.partNo)?.id || "",
            quantity: item.quantity,
            remarks: item.remarks,
          }))
        : [{ id: "1", partId: "", quantity: 1, remarks: "" }]
    );
    setViewMode("edit");
  };

  // Open view dialog
  const handleView = (order: PurchaseOrder) => {
    setSelectedOrder(order);
    setShowViewDialog(true);
  };

  // Open receive view
  const handleReceive = async (order: PurchaseOrder) => {
    try {
      setLoading(true);
      
      // Fetch full order details with items from API
      const response = await apiClient.getPurchaseOrder(order.id);
      const orderData = response.data || response;
      
      if (!orderData || !orderData.items || orderData.items.length === 0) {
        toast.error("No items found in this purchase order");
        setLoading(false);
        return;
      }
      
      // Update selected order with full details
      const fullOrder: PurchaseOrder = {
        ...order,
        items: orderData.items.map((item: any) => ({
          id: item.id || String(Date.now()),
          partNo: item.part_no || item.partNo || "",
          description: item.part_description || item.description || "",
          brand: item.brand || "N/A",
          uom: "pcs",
          quantity: item.quantity || 0,
          receivedQty: item.received_qty || item.receivedQty || 0,
          purchasePrice: item.unit_cost || item.unitCost || 0,
          salePrice: 0,
          cost: item.total_cost || item.totalCost || 0,
          amount: item.total_cost || item.totalCost || 0,
          remarks: item.notes || "",
        })),
      };
      
      setSelectedOrder(fullOrder);
      setReceiveDate(new Date());
      setReceiveStore("");
      setReceiveRemarks("");
      setReceiveCurrency("pkr");
      setDiscount(0);
      setDiscountPkr(0);
      setExpenses([]);
      setSelectedRack("");
      setSelectedShelf("");
      
      // Convert order items to receive items
      const items: ReceiveItemForm[] = fullOrder.items.map((item) => {
        const part = availableParts.find(p => p.partNo === item.partNo);
        // Use purchasePrice from the order item (which comes from unit_cost in DB)
        const purchasePrice = item.purchasePrice || 0;
        const receivedQty = item.receivedQty > 0 ? item.receivedQty : item.quantity;
        const salePrice = part?.price || 0;
        
        return {
          id: item.id,
          partNo: item.partNo,
          description: item.description,
          brand: item.brand,
          price: purchasePrice,
          purchasePrice: purchasePrice,
          salePrice: salePrice,
          priceA: salePrice,
          priceB: 0,
          priceM: 0,
          quantity: item.quantity,
          receivedQty: receivedQty,
          cost: item.cost || (purchasePrice * receivedQty),
          amount: purchasePrice * receivedQty,
          currentStock: part?.currentStock || 0,
          lastPurchaseDate: part?.lastPurchaseDate || "-",
        };
      });
      
      if (items.length === 0) {
        toast.error("No items found in this purchase order");
        setLoading(false);
        return;
      }
      
      setReceiveItems(items);
      setSelectedReceiveItem(items[0]?.partNo || "");
      setViewMode("receive");
    } catch (error: any) {
      console.error('Error loading order for receive:', error);
      const errorMessage = error?.response?.data?.error || error?.message || 'Failed to load order details';
      toast.error(errorMessage);
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
  const handleDelete = async (order: PurchaseOrder) => {
    if (!confirm(`Are you sure you want to delete Purchase Order ${order.poNo}?`)) {
      return;
    }

    try {
      setLoading(true);
      const response = await apiClient.deletePurchaseOrder(order.id);
      
      if (response.error) {
        toast.error(response.error);
        return;
      }
      
      await fetchPurchaseOrders();
      toast.success(`Purchase Order ${order.poNo} deleted`);
    } catch (error: any) {
      console.error('Error deleting purchase order:', error);
      toast.error('Failed to delete purchase order');
    } finally {
      setLoading(false);
    }
  };

  // Add item to form
  const handleAddItem = () => {
    setFormItems((prev) => [...prev, { id: String(prev.length + 1), partId: "", quantity: 1, remarks: "" }]);
  };

  // Remove item from form
  const handleRemoveItem = (id: string) => {
    if (formItems.length > 1) {
      setFormItems((prev) => prev.filter((item) => item.id !== id));
    }
  };

  // Update form item
  const handleUpdateItem = (id: string, field: keyof OrderItemForm, value: string | number) => {
    setFormItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  // Update receive item
  const handleUpdateReceiveItem = (id: string, field: keyof ReceiveItemForm, value: number) => {
    setReceiveItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          // Calculate amount
          updated.amount = updated.purchasePrice * updated.receivedQty;
          return updated;
        }
        return item;
      })
    );
  };

  // Remove receive item
  const handleRemoveReceiveItem = (id: string) => {
    setReceiveItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Add new rack
  const handleAddRack = () => {
    if (newRackName.trim()) {
      const newRack: Rack = {
        id: String(racks.length + 1),
        name: newRackName.trim(),
        shelves: [],
      };
      setRacks([...racks, newRack]);
      setNewRackName("");
      toast.success("Rack added successfully");
    }
  };

  // Add new shelf
  const handleAddShelf = () => {
    if (newShelfName.trim() && selectedRack) {
      setRacks((prev) =>
        prev.map((rack) =>
          rack.id === selectedRack
            ? { ...rack, shelves: [...rack.shelves, newShelfName.trim()] }
            : rack
        )
      );
      setNewShelfName("");
      toast.success("Shelf added successfully");
    }
  };

  // Add new expense
  const handleAddExpense = () => {
    const newExpense: Expense = {
      id: String(Date.now()),
      type: "",
      payableAccount: "",
      description: "",
      amount: 0,
    };
    setExpenses([...expenses, newExpense]);
  };

  // Remove expense
  const handleRemoveExpense = (id: string) => {
    setExpenses((prev) => prev.filter((exp) => exp.id !== id));
  };

  // Update expense
  const handleUpdateExpense = (id: string, field: keyof Expense, value: string | number) => {
    setExpenses((prev) =>
      prev.map((exp) => (exp.id === id ? { ...exp, [field]: value } : exp))
    );
  };

  // Calculate totals
  const calculateTotals = () => {
    const itemsTotal = receiveItems.reduce((sum, item) => sum + item.amount, 0);
    const expensesTotal = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const totalAfterDiscount = itemsTotal - discount;
    const totalPkr = itemsTotal;
    const totalAfterDiscountPkr = totalPkr - discountPkr;
    return {
      itemsTotal,
      expensesTotal,
      totalAfterDiscount,
      totalPkr,
      totalAfterDiscountPkr,
      payable: totalAfterDiscountPkr + expensesTotal,
    };
  };

  // Save order
  const handleSave = async () => {
    if (!formSupplier) {
      toast.error("Please select a supplier");
      return;
    }

    const validItems = formItems.filter((item) => item.partId);
    if (validItems.length === 0) {
      toast.error("Please add at least one item");
      return;
    }

    try {
      setLoading(true);
      
      const items = validItems.map((item) => {
        const part = availableParts.find((p) => p.id === item.partId);
        const unitCost = part?.price || 0;
        return {
          part_id: item.partId,
          quantity: item.quantity,
          unit_cost: unitCost,
          total_cost: unitCost * item.quantity,
          received_qty: 0,
          notes: item.remarks || null,
        };
      });

      if (viewMode === "create") {
        const poNumber = await generatePoNo();
        const response = await apiClient.createPurchaseOrder({
          po_number: poNumber,
          date: format(formRequestDate, "yyyy-MM-dd"),
          supplier_id: null, // Can be extended with supplier API
          expected_date: null,
          notes: formRemarks || null,
          items: items,
        });

        if (response.error) {
          toast.error(response.error);
          return;
        }

        toast.success("Purchase Order created successfully");
        await fetchPurchaseOrders();
        handleBackToList();
      } else if (viewMode === "edit" && selectedOrder) {
        const response = await apiClient.updatePurchaseOrder(selectedOrder.id, {
          date: format(formRequestDate, "yyyy-MM-dd"),
          supplier_id: null,
          notes: formRemarks || null,
          items: items,
        });

        if (response.error) {
          toast.error(response.error);
          return;
        }

        toast.success("Purchase Order updated successfully");
        await fetchPurchaseOrders();
        handleBackToList();
      }
    } catch (error: any) {
      console.error('Error saving purchase order:', error);
      toast.error('Failed to save purchase order');
    } finally {
      setLoading(false);
    }
  };

  // Confirm receive
  const handleConfirmReceive = async () => {
    if (!selectedOrder) return;

    if (!receiveStore) {
      toast.error("Please select a store");
      return;
    }

    try {
      setLoading(true);
      const totals = calculateTotals();
      
      // Update purchase order items with received quantities and prices
      const updatedItems = receiveItems.map((item) => {
        const part = availableParts.find(p => p.partNo === item.partNo);
        return {
          part_id: part?.id || "",
          quantity: item.quantity,
          unit_cost: item.purchasePrice,
          total_cost: item.purchasePrice * item.receivedQty,
          received_qty: item.receivedQty,
          notes: item.remarks || null,
        };
      });

      // Create stock movements for received items
      for (const item of receiveItems) {
        const part = availableParts.find(p => p.partNo === item.partNo);
        if (part && item.receivedQty > 0) {
          // Find store ID
          const store = availableStores.find(s => s.name === receiveStore);
          
          await apiClient.createStockMovement({
            part_id: part.id,
            type: 'in',
            quantity: item.receivedQty,
            store_id: store?.id || null,
            reference_type: 'purchase',
            reference_id: selectedOrder.id,
            notes: `Purchase Order ${selectedOrder.poNo} - Received`,
          });
        }
      }

      // Update purchase order with received quantities and status
      await apiClient.updatePurchaseOrder(selectedOrder.id, {
        status: "Received",
        items: updatedItems,
      });
      
      toast.success(`Purchase Order ${selectedOrder.poNo} received`);
      await fetchPurchaseOrders();
      handleBackToList();
    } catch (error: any) {
      console.error('Error receiving purchase order:', error);
      toast.error('Failed to receive purchase order');
    } finally {
      setLoading(false);
    }
  };

  // Format currency
  const formatCurrency = (value: number) => `Rs ${value.toLocaleString("en-PK")}`;

  const statusColors = {
    Draft: "bg-gray-100 text-gray-600 border-gray-200",
    Pending: "bg-amber-50 text-amber-600 border-amber-200",
    Received: "bg-green-50 text-green-600 border-green-200",
    Cancelled: "bg-red-50 text-red-600 border-red-200",
  };

  // Get selected item for sidebar
  const getSelectedItemDetails = () => {
    if (!selectedReceiveItem) return null;
    const item = receiveItems.find(i => i.partNo === selectedReceiveItem);
    if (!item) return null;
    
    const part = availableParts.find(p => p.partNo === item.partNo);
    const margin = item.salePrice > 0 && item.purchasePrice > 0 
      ? (((item.salePrice - item.purchasePrice) / item.salePrice) * 100).toFixed(1)
      : "0.0";
    
    return {
      ...item,
      margin,
      lineCost: item.cost || 0,
    };
  };

  // Render list view
  const renderListView = () => (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Purchase Orders</h2>
          <p className="text-sm text-muted-foreground">Manage purchase orders</p>
        </div>
        <Button className="gap-1.5 bg-primary hover:bg-primary/90" onClick={handleNewOrder}>
          <Plus className="w-4 h-4" />
          New Purchase Order
        </Button>
      </div>

      {/* Orders Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-border">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <h3 className="text-sm font-medium text-foreground">
              All Purchase Orders ({filteredOrders.length})
            </h3>
            <div className="flex items-center gap-3 w-full lg:w-auto">
              <div className="relative flex-1 lg:w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  placeholder="Search..."
                  className="pl-9 h-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                <SelectTrigger className="w-full lg:w-36 h-9">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Received">Received</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-10">
                  <Checkbox />
                </TableHead>
                <TableHead className="text-xs font-medium w-12">S.NO</TableHead>
                <TableHead className="text-xs font-medium">PO.No</TableHead>
                <TableHead className="text-xs font-medium">Suppliers</TableHead>
                <TableHead className="text-xs font-medium">Store</TableHead>
                <TableHead className="text-xs font-medium">Request Date</TableHead>
                <TableHead className="text-xs font-medium">Receive Date</TableHead>
                <TableHead className="text-xs font-medium text-right">Grand Total</TableHead>
                <TableHead className="text-xs font-medium">Remarks</TableHead>
                <TableHead className="text-xs font-medium text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedOrders.map((order, index) => (
                <TableRow key={order.id} className="hover:bg-muted/20 transition-colors">
                  <TableCell>
                    <Checkbox />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {(currentPage - 1) * itemsPerPage + index + 1}
                  </TableCell>
                  <TableCell className="text-sm font-medium text-foreground">{order.poNo}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[120px] truncate">{order.supplier}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[100px] truncate">{order.store}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{order.requestDate}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{order.receiveDate || "-"}</TableCell>
                  <TableCell className="text-sm font-medium text-foreground text-right">
                    {order.grandTotal.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">{order.remarks || "-"}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleView(order)}>
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => handleEdit(order)}>
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => handleDelete(order)}
                      >
                        Delete
                      </Button>
                      {order.status === "Received" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs text-green-600 border-green-200"
                          disabled
                        >
                          Received
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="h-8 text-xs bg-primary hover:bg-primary/90"
                          onClick={() => handleReceive(order)}
                        >
                          Receive
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && paginatedOrders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                    No purchase orders found
                  </TableCell>
                </TableRow>
              )}
              {loading && paginatedOrders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredOrders.length)} of {filteredOrders.length} items
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
              First
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
              Prev
            </Button>
            <span className="px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded">
              {currentPage} / {totalPages || 1}
            </span>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0}>
              Next
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages || totalPages === 0}>
              Last
            </Button>
            <Select value={String(itemsPerPage)} onValueChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1); }}>
              <SelectTrigger className="w-20 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </>
  );

  // Render create/edit view
  const renderCreateEditView = () => (
    <>
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={handleBackToList}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            {viewMode === "create" ? "Create New Purchase Order" : "Edit Purchase Order"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {viewMode === "create" ? "Add a new purchase order" : `Editing ${selectedOrder?.poNo}`}
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-6">
        {/* Order Info */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs text-amber-700">PO NO</Label>
              <Input
                value={viewMode === "edit" ? selectedOrder?.poNo : generatePoNo()}
                disabled
                className="h-9 mt-1 bg-background"
              />
              <p className="text-xs text-muted-foreground mt-1">Auto-generated</p>
            </div>
            <div>
              <Label className="text-xs text-amber-700">Supplier</Label>
              <Select value={formSupplier} onValueChange={setFormSupplier}>
                <SelectTrigger className="h-9 mt-1 bg-background">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {availableSuppliers.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-red-500 mt-1">Required</p>
            </div>
            <div>
              <Label className="text-xs text-amber-700">Request Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full h-9 mt-1 justify-start text-left font-normal">
                    <Calendar className="mr-2 h-4 w-4" />
                    {format(formRequestDate, "dd/MM/yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={formRequestDate}
                    onSelect={(d) => d && setFormRequestDate(d)}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label className="text-xs text-amber-700">Remarks</Label>
              <Input
                value={formRemarks}
                onChange={(e) => setFormRemarks(e.target.value)}
                placeholder="Enter remarks..."
                className="h-9 mt-1 bg-background"
              />
            </div>
          </div>
        </div>

        {/* Item Parts */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-foreground">Item Parts</h3>
            <Button size="sm" className="gap-1 bg-primary hover:bg-primary/90" onClick={handleAddItem}>
              <Plus className="w-4 h-4" />
              Add New Item
            </Button>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-12 gap-3 text-xs font-medium text-muted-foreground">
              <div className="col-span-5">Item Parts</div>
              <div className="col-span-2">Quantity</div>
              <div className="col-span-4">Remarks</div>
              <div className="col-span-1 text-center">Remove</div>
            </div>

            {formItems.map((item) => (
              <div key={item.id} className="grid grid-cols-12 gap-3 items-start">
                <div className="col-span-5">
                  <Select
                    value={item.partId}
                    onValueChange={(v) => handleUpdateItem(item.id, "partId", v)}
                  >
                    <SelectTrigger className={cn("h-9 bg-background", !item.partId && "border-primary")}>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableParts.map((part) => (
                        <SelectItem key={part.id} value={part.id}>
                          {part.partNo} - {part.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!item.partId && <p className="text-xs text-red-500 mt-1">Required!</p>}
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => handleUpdateItem(item.id, "quantity", parseInt(e.target.value) || 1)}
                    className="h-9 bg-background"
                  />
                </div>
                <div className="col-span-4">
                  <Input
                    value={item.remarks}
                    onChange={(e) => handleUpdateItem(item.id, "remarks", e.target.value)}
                    placeholder="Enter remarks..."
                    className="h-9 bg-background"
                  />
                </div>
                <div className="col-span-1 flex justify-center">
                  <Button
                    variant="destructive"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => handleRemoveItem(item.id)}
                    disabled={formItems.length === 1}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-amber-200">
            <p className="text-sm text-muted-foreground">
              {formItems.filter((i) => i.partId).length} item(s) added
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={resetForm}>
                <RotateCcw className="w-4 h-4 mr-1" />
                Reset
              </Button>
              <Button className="bg-primary hover:bg-primary/90" onClick={handleSave}>
                <Save className="w-4 h-4 mr-1" />
                Save
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  // Render receive view
  const renderReceiveView = () => {
    const totals = calculateTotals();
    const selectedItemDetails = getSelectedItemDetails();
    const currentRack = racks.find(r => r.id === selectedRack);

    return (
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Content */}
        <div className="flex-1 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={handleBackToList}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h2 className="text-xl font-semibold text-foreground">Receive Purchase Order</h2>
            </div>
            <Button variant="ghost" size="icon" onClick={handleBackToList}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Header Info */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <div>
                <Label className="text-xs text-amber-700">PO NO</Label>
                <Input value={selectedOrder?.poNo || ""} disabled className="h-9 mt-1 bg-background" />
              </div>
              <div>
                <Label className="text-xs text-amber-700">Supplier</Label>
                <Input value={selectedOrder?.supplier || ""} disabled className="h-9 mt-1 bg-background" />
              </div>
              <div>
                <Label className="text-xs text-amber-700">Store</Label>
                <Select value={receiveStore} onValueChange={setReceiveStore}>
                  <SelectTrigger className="h-9 mt-1 bg-background">
                    <SelectValue placeholder="Select Store..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableStores.map((store) => (
                      <SelectItem key={store.id} value={store.name}>
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-amber-700">Request Date</Label>
                <Input value={selectedOrder?.requestDate || ""} disabled className="h-9 mt-1 bg-background" />
              </div>
              <div>
                <Label className="text-xs text-amber-700">Received Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full h-9 mt-1 justify-start text-left font-normal">
                      <Calendar className="mr-2 h-4 w-4" />
                      {format(receiveDate, "dd/MM/yyyy")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={receiveDate}
                      onSelect={(d) => d && setReceiveDate(d)}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
              <div>
                <Label className="text-xs text-amber-700">Currency / Rate (PKR)</Label>
                <Select value={receiveCurrency} onValueChange={setReceiveCurrency}>
                  <SelectTrigger className="h-9 mt-1 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pkr">Rs PKR</SelectItem>
                    <SelectItem value="usd">$ USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-4">
              <Label className="text-xs text-amber-700">Remarks</Label>
              <Textarea
                value={receiveRemarks}
                onChange={(e) => setReceiveRemarks(e.target.value)}
                placeholder="Enter remarks..."
                className="mt-1 bg-background"
                rows={2}
              />
            </div>
          </div>

          {/* Items */}
          <div className="border border-border rounded-lg p-4">
            <h3 className="text-sm font-medium mb-4">Items</h3>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-xs">Item Description</TableHead>
                    <TableHead className="text-xs text-right">Price (PKR)</TableHead>
                    <TableHead className="text-xs text-center">Purchase Price(PKR)</TableHead>
                    <TableHead className="text-xs text-center">Sale Price</TableHead>
                    <TableHead className="text-xs text-center">Price A</TableHead>
                    <TableHead className="text-xs text-center">Price B</TableHead>
                    <TableHead className="text-xs text-center">Price M</TableHead>
                    <TableHead className="text-xs text-center">Qty</TableHead>
                    <TableHead className="text-xs text-center">Received Qty</TableHead>
                    <TableHead className="text-xs text-right">Cost(PKR)</TableHead>
                    <TableHead className="text-xs text-right">Amount</TableHead>
                    
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receiveItems.length > 0 ? (
                    receiveItems.map((item) => (
                      <TableRow 
                        key={item.id} 
                        className={cn(
                          "cursor-pointer transition-colors",
                          selectedReceiveItem === item.partNo && "bg-primary/5"
                        )}
                        onClick={() => setSelectedReceiveItem(item.partNo)}
                      >
                        <TableCell className="text-sm max-w-[200px]">
                          {item.partNo} / N/A / {item.brand}-{item.partNo} / {item.description}
                        </TableCell>
                        <TableCell className="text-sm text-right">{item.price}</TableCell>
                        <TableCell className="text-center">
                          <Input 
                            type="number" 
                            value={item.purchasePrice}
                            onChange={(e) => handleUpdateReceiveItem(item.id, "purchasePrice", parseFloat(e.target.value) || 0)}
                            className="h-8 w-20 text-center mx-auto" 
                            onClick={(e) => e.stopPropagation()}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Input 
                            type="number" 
                            value={item.salePrice}
                            onChange={(e) => handleUpdateReceiveItem(item.id, "salePrice", parseFloat(e.target.value) || 0)}
                            className="h-8 w-20 text-center mx-auto" 
                            onClick={(e) => e.stopPropagation()}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Input 
                            type="number" 
                            value={item.priceA}
                            onChange={(e) => handleUpdateReceiveItem(item.id, "priceA", parseFloat(e.target.value) || 0)}
                            className="h-8 w-20 text-center mx-auto" 
                            onClick={(e) => e.stopPropagation()}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Input 
                            type="number" 
                            value={item.priceB}
                            onChange={(e) => handleUpdateReceiveItem(item.id, "priceB", parseFloat(e.target.value) || 0)}
                            className="h-8 w-20 text-center mx-auto" 
                            onClick={(e) => e.stopPropagation()}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Input 
                            type="number" 
                            value={item.priceM}
                            onChange={(e) => handleUpdateReceiveItem(item.id, "priceM", parseFloat(e.target.value) || 0)}
                            className="h-8 w-20 text-center mx-auto" 
                            onClick={(e) => e.stopPropagation()}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-sm">{item.quantity}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Input 
                            type="number" 
                            value={item.receivedQty}
                            onChange={(e) => handleUpdateReceiveItem(item.id, "receivedQty", parseInt(e.target.value) || 0)}
                            className="h-8 w-16 text-center mx-auto" 
                            onClick={(e) => e.stopPropagation()}
                          />
                        </TableCell>
                        <TableCell className="text-sm text-right">
                          <div className="text-center">
                            <span>-</span>
                            <p className="text-xs text-muted-foreground">100%</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-right">{item.amount}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center text-muted-foreground py-4">
                        {loading ? "Loading items..." : "No items in this order"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Rack and Shelves */}
          <div className="border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium">Rack and Shelves</h3>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => {
                  const name = prompt("Enter new rack name:");
                  if (name) {
                    setNewRackName(name);
                    handleAddRack();
                  }
                }}>
                  + Add New Rack
                </Button>
                <Button variant="outline" size="sm" onClick={() => {
                  if (!selectedRack) {
                    toast.error("Please select a rack first");
                    return;
                  }
                  const name = prompt("Enter new shelf name:");
                  if (name) {
                    setNewShelfName(name);
                    handleAddShelf();
                  }
                }}>
                  + Add New Shelf
                </Button>
                <Button size="sm" className="bg-primary hover:bg-primary/90">
                  + Add
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Rack</Label>
                <Select value={selectedRack} onValueChange={(v) => { setSelectedRack(v); setSelectedShelf(""); }}>
                  <SelectTrigger className="h-9 mt-1">
                    <SelectValue placeholder="Select Rack..." />
                  </SelectTrigger>
                  <SelectContent>
                    {racks.map((rack) => (
                      <SelectItem key={rack.id} value={rack.id}>{rack.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Shelf</Label>
                <Select value={selectedShelf} onValueChange={setSelectedShelf} disabled={!selectedRack}>
                  <SelectTrigger className="h-9 mt-1">
                    <SelectValue placeholder="Select rack first" />
                  </SelectTrigger>
                  <SelectContent>
                    {currentRack?.shelves.map((shelf, idx) => (
                      <SelectItem key={idx} value={shelf}>{shelf}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {selectedReceiveItem && (
              <p className="text-xs text-muted-foreground mt-2">
                Apply to Item: {selectedReceiveItem}<br />
                Current: - / -
              </p>
            )}
          </div>

          {/* Totals */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <Label className="text-xs">Total</Label>
              <Input type="number" value={totals.itemsTotal} disabled className="h-9 mt-1" />
            </div>
            <div>
              <Label className="text-xs">Discount</Label>
              <Input 
                type="number" 
                value={discount}
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                className="h-9 mt-1" 
              />
            </div>
            <div>
              <Label className="text-xs">Total after discount</Label>
              <Input type="number" value={totals.totalAfterDiscount} disabled className="h-9 mt-1" />
            </div>
            <div>
              <Label className="text-xs">Total (PKR)</Label>
              <Input type="number" value={totals.totalPkr} disabled className="h-9 mt-1" />
            </div>
            <div>
              <Label className="text-xs">Discount (PKR)</Label>
              <Input 
                type="number" 
                value={discountPkr}
                onChange={(e) => setDiscountPkr(parseFloat(e.target.value) || 0)}
                className="h-9 mt-1" 
              />
            </div>
            <div>
              <Label className="text-xs">Total after discount (PKR)</Label>
              <Input type="number" value={totals.totalAfterDiscountPkr} disabled className="h-9 mt-1" />
            </div>
          </div>

          {/* Expenses */}
          <div className="border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium">Expense Type</h3>
              <Button size="sm" className="gap-1 bg-primary hover:bg-primary/90" onClick={handleAddExpense}>
                <Plus className="w-4 h-4" />
                Add New Expense
              </Button>
            </div>
            
            {/* Column Headers */}
            {expenses.length > 0 && (
              <div className="grid grid-cols-12 gap-2 mb-2">
                <div className="col-span-3">
                  <Label className="text-xs text-muted-foreground">Expense Type</Label>
                </div>
                <div className="col-span-3">
                  <Label className="text-xs text-muted-foreground">Payable Account</Label>
                </div>
                <div className="col-span-3">
                  <Label className="text-xs text-muted-foreground">Description</Label>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs text-muted-foreground">Amount</Label>
                </div>
                <div className="col-span-1"></div>
              </div>
            )}
            
            {expenses.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No expenses added. Click "+ Add New Expense" to add one.
              </p>
            ) : (
              <div className="space-y-2">
                {expenses.map((expense) => (
                  <div key={expense.id} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-3">
                      <Select 
                        value={expense.type} 
                        onValueChange={(v) => handleUpdateExpense(expense.id, "type", v)}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          {expenseTypes.map((type) => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-3">
                      <Select 
                        value={expense.payableAccount} 
                        onValueChange={(v) => handleUpdateExpense(expense.id, "payableAccount", v)}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          {payableAccounts.map((account) => (
                            <SelectItem key={account} value={account}>{account}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-3">
                      <Input 
                        value={expense.description}
                        onChange={(e) => handleUpdateExpense(expense.id, "description", e.target.value)}
                        placeholder="Enter description..." 
                        className="h-9" 
                      />
                    </div>
                    <div className="col-span-2">
                      <Input 
                        type="number" 
                        value={expense.amount}
                        onChange={(e) => handleUpdateExpense(expense.id, "amount", parseFloat(e.target.value) || 0)}
                        placeholder="0" 
                        className="h-9" 
                      />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <Button 
                        variant="destructive" 
                        size="icon" 
                        className="h-9 w-9"
                        onClick={() => handleRemoveExpense(expense.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                {/* Total Expenses */}
                <div className="flex justify-end pt-2 border-t border-border mt-4">
                  <p className="text-sm font-medium">
                    Total Expenses: <span className="text-primary">{expenses.reduce((sum, exp) => sum + exp.amount, 0)}</span>
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" onClick={handleBackToList}>
              Cancel
            </Button>
            <Button className="bg-primary hover:bg-primary/90" onClick={handleConfirmReceive}>
              Confirm Receive
            </Button>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-full lg:w-80 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Item History</CardTitle>
              </div>
              <p className="text-xs text-muted-foreground">View item purchase history and stock details</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Select Item */}
              <div>
                <Label className="text-xs">Select Item</Label>
                <Select value={selectedReceiveItem} onValueChange={setSelectedReceiveItem}>
                  <SelectTrigger className="h-9 mt-1">
                    <SelectValue placeholder="Select item..." />
                  </SelectTrigger>
                  <SelectContent>
                    {receiveItems.map((item) => (
                      <SelectItem key={item.id} value={item.partNo}>{item.partNo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedItemDetails && (
                <>
                  {/* Item Info */}
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-sm font-medium">{selectedItemDetails.partNo}</p>
                    <p className="text-xs text-muted-foreground">{selectedItemDetails.description}</p>
                  </div>

                  {/* History Details */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Last Purchase Price</p>
                      <p className="text-lg font-semibold">{selectedItemDetails.purchasePrice}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Location</p>
                      <p className="text-sm font-medium">-</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Quantity</p>
                      <p className="text-sm font-medium">{selectedItemDetails.receivedQty}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Current Stock</p>
                      <p className="text-sm font-medium">{selectedItemDetails.currentStock || 0}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Reserved Quantity</p>
                      <p className="text-sm font-medium">0</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Price A</p>
                      <p className="text-sm font-medium">{selectedItemDetails.priceA || 0}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Price B</p>
                      <p className="text-sm font-medium">{selectedItemDetails.priceB || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Price M</p>
                      <p className="text-sm font-medium">{selectedItemDetails.priceM || 0}</p>
                    </div>
                  </div>
                </>
              )}

              <Separator />

              {/* Order Summary */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium">Order Summary</h4>
                  <span className="text-xs text-muted-foreground">PKR @ 1</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Items Total (PKR)</span>
                    <span>{totals.itemsTotal}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Discount (PKR)</span>
                    <span>{discountPkr}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Expenses (PKR)</span>
                    <span>{totals.expensesTotal}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between text-sm font-semibold">
                    <span>Payable (PKR)</span>
                    <span>{totals.payable}</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* All Items Stock */}
              <div>
                <h4 className="text-sm font-medium mb-2">All Items Stock</h4>
                <ScrollArea className="h-32">
                  <div className="space-y-2">
                    {receiveItems.map((item) => (
                      <div 
                        key={item.id} 
                        className={cn(
                          "flex justify-between items-center p-2 rounded cursor-pointer hover:bg-muted/50",
                          selectedReceiveItem === item.partNo && "bg-muted"
                        )}
                        onClick={() => setSelectedReceiveItem(item.partNo)}
                      >
                        <div>
                          <p className="text-xs font-medium">{item.partNo}</p>
                          <p className="text-xs text-muted-foreground">{item.description}</p>
                        </div>
                        <span className="text-sm font-medium">{item.currentStock || 0}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {viewMode === "list" && renderListView()}
      {(viewMode === "create" || viewMode === "edit") && renderCreateEditView()}
      {viewMode === "receive" && renderReceiveView()}

      {/* View Dialog (still a dialog for viewing details) */}
      <ViewOrderDialog 
        open={showViewDialog} 
        onOpenChange={setShowViewDialog} 
        order={selectedOrder} 
        statusColors={statusColors}
        formatCurrency={formatCurrency}
      />
    </div>
  );
};
