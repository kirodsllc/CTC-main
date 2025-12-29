import { useState, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Plus, Search, Eye, FileText, ArrowRight, X, Package, Trash2, Pencil, ShoppingCart, Printer } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { MoreHorizontal } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PrintableDocument, printDocument } from "./PrintableDocument";

interface QuotationItem {
  id: string;
  partNo: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Quotation {
  id: string;
  quotationNo: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  date: string;
  validUntil: string;
  totalAmount: number;
  status: "draft" | "sent" | "accepted" | "rejected" | "expired";
  items: QuotationItem[];
  notes: string;
}

// Parts data for selection
const availableParts: { id: string; partNo: string; description: string; price: number; stock: number }[] = [
  { id: "1", partNo: "TEST001", description: "High quality brake pad for vehicles", price: 150.00, stock: 50 },
  { id: "2", partNo: "TEST002", description: "Premium air filter element", price: 250.00, stock: 30 },
  { id: "3", partNo: "ENG-001", description: "Engine oil filter for diesel engines", price: 120.00, stock: 100 },
  { id: "4", partNo: "SUS-001", description: "Suspension shock absorber front", price: 400.00, stock: 25 },
];

export const SalesQuotation = () => {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [itemSearchTerm, setItemSearchTerm] = useState("");
  const [selectedItems, setSelectedItems] = useState<QuotationItem[]>([]);
  const [editingQuotationId, setEditingQuotationId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [printQuotation, setPrintQuotation] = useState<Quotation | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState<{
    quotationNo: string;
    quotationDate: string;
    validUntil: string;
    status: Quotation["status"];
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    customerAddress: string;
    notes: string;
  }>({
    quotationNo: "",
    quotationDate: new Date().toISOString().split("T")[0],
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    status: "draft",
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    customerAddress: "",
    notes: "",
  });

  // Generate quotation number
  const generateQuotationNo = () => {
    const prefix = "SQ";
    const num = String(quotations.length + 1).padStart(3, "0");
    return `${prefix}-${num}`;
  };

  // Filter parts based on search
  const filteredParts = useMemo(() => {
    if (!itemSearchTerm) return availableParts;
    const term = itemSearchTerm.toLowerCase();
    return availableParts.filter(
      (p) =>
        p.partNo.toLowerCase().includes(term) ||
        p.description.toLowerCase().includes(term)
    );
  }, [itemSearchTerm]);

  // Filter quotations
  const filteredQuotations = quotations.filter((item) =>
    item.quotationNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.customerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate total
  const calculateTotal = () => {
    return selectedItems.reduce((sum, item) => sum + item.total, 0);
  };

  // Handle item selection
  const handleToggleItem = (part: typeof availableParts[0], checked: boolean) => {
    if (checked) {
      const newItem: QuotationItem = {
        id: part.id,
        partNo: part.partNo,
        description: part.description,
        quantity: 1,
        unitPrice: part.price,
        total: part.price,
      };
      setSelectedItems([...selectedItems, newItem]);
    } else {
      setSelectedItems(selectedItems.filter((i) => i.id !== part.id));
    }
  };

  // Update item quantity
  const handleQuantityChange = (itemId: string, quantity: number) => {
    setSelectedItems(
      selectedItems.map((item) =>
        item.id === itemId
          ? { ...item, quantity, total: item.unitPrice * quantity }
          : item
      )
    );
  };

  // Remove item
  const handleRemoveItem = (itemId: string) => {
    setSelectedItems(selectedItems.filter((i) => i.id !== itemId));
  };

  // Handle new quotation
  const handleNewQuotation = () => {
    setEditingQuotationId(null);
    setFormData({
      quotationNo: generateQuotationNo(),
      quotationDate: new Date().toISOString().split("T")[0],
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      status: "draft",
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      customerAddress: "",
      notes: "",
    });
    setSelectedItems([]);
    setIsFormOpen(true);
  };

  // Handle edit quotation
  const handleEditQuotation = (quotation: Quotation) => {
    setEditingQuotationId(quotation.id);
    setFormData({
      quotationNo: quotation.quotationNo,
      quotationDate: quotation.date,
      validUntil: quotation.validUntil,
      status: quotation.status,
      customerName: quotation.customerName,
      customerEmail: quotation.customerEmail,
      customerPhone: quotation.customerPhone,
      customerAddress: quotation.customerAddress,
      notes: quotation.notes,
    });
    setSelectedItems(quotation.items);
    setIsFormOpen(true);
  };

  // Open delete confirmation dialog
  const openDeleteDialog = (quotation: Quotation) => {
    setSelectedQuotation(quotation);
    setDeleteDialogOpen(true);
  };

  // Confirm delete quotation
  const confirmDeleteQuotation = () => {
    if (selectedQuotation) {
      setQuotations(quotations.filter((q) => q.id !== selectedQuotation.id));
      toast({
        title: "Quotation Deleted",
        description: `Quotation ${selectedQuotation.quotationNo} has been deleted successfully.`,
      });
      setDeleteDialogOpen(false);
      setSelectedQuotation(null);
    }
  };

  // Open convert confirmation dialog
  const openConvertDialog = (quotation: Quotation) => {
    setSelectedQuotation(quotation);
    setConvertDialogOpen(true);
  };

  // Confirm convert to sales order
  const confirmConvertToOrder = () => {
    if (selectedQuotation) {
      // Update quotation status to accepted
      setQuotations(
        quotations.map((q) =>
          q.id === selectedQuotation.id ? { ...q, status: "accepted" as const } : q
        )
      );
      toast({
        title: "Converted to Sales Order",
        description: `Quotation ${selectedQuotation.quotationNo} has been converted to a sales order successfully.`,
      });
      setConvertDialogOpen(false);
      setSelectedQuotation(null);
    }
  };

  // Handle print quotation
  const handlePrintQuotation = (quotation: Quotation) => {
    setPrintQuotation(quotation);
    setTimeout(() => {
      printDocument(printRef);
      toast({
        title: "Print Initiated",
        description: `Quotation ${quotation.quotationNo} is being printed.`,
      });
    }, 100);
  };

  // Handle form submit
  const handleSubmit = () => {
    if (!formData.customerName) {
      toast({
        title: "Error",
        description: "Customer name is required",
        variant: "destructive",
      });
      return;
    }

    if (selectedItems.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one item",
        variant: "destructive",
      });
      return;
    }

    if (editingQuotationId) {
      // Update existing quotation
      setQuotations(
        quotations.map((q) =>
          q.id === editingQuotationId
            ? {
                ...q,
                quotationNo: formData.quotationNo,
                customerName: formData.customerName,
                customerEmail: formData.customerEmail,
                customerPhone: formData.customerPhone,
                customerAddress: formData.customerAddress,
                date: formData.quotationDate,
                validUntil: formData.validUntil,
                totalAmount: calculateTotal(),
                status: formData.status,
                items: selectedItems,
                notes: formData.notes,
              }
            : q
        )
      );
      setIsFormOpen(false);
      setEditingQuotationId(null);
      toast({
        title: "Quotation Updated",
        description: `Quotation ${formData.quotationNo} has been updated successfully.`,
      });
    } else {
      // Create new quotation
      const newQuotation: Quotation = {
        id: `Q${String(quotations.length + 1).padStart(3, "0")}`,
        quotationNo: formData.quotationNo,
        customerName: formData.customerName,
        customerEmail: formData.customerEmail,
        customerPhone: formData.customerPhone,
        customerAddress: formData.customerAddress,
        date: formData.quotationDate,
        validUntil: formData.validUntil,
        totalAmount: calculateTotal(),
        status: formData.status,
        items: selectedItems,
        notes: formData.notes,
      };

      setQuotations([newQuotation, ...quotations]);
      setIsFormOpen(false);
      toast({
        title: "Quotation Created",
        description: `Quotation ${newQuotation.quotationNo} has been created successfully.`,
      });
    }
  };


  const getStatusColor = (status: Quotation["status"]) => {
    switch (status) {
      case "draft":
        return "secondary";
      case "sent":
        return "default";
      case "accepted":
        return "default";
      case "rejected":
        return "destructive";
      case "expired":
        return "secondary";
      default:
        return "secondary";
    }
  };

  // Form View
  if (isFormOpen) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-4 bg-gradient-to-r from-primary/5 to-transparent">
            <CardTitle className="text-lg">{editingQuotationId ? "Edit Sales Quotation" : "New Sales Quotation"}</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {/* Form Fields - Row 1 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">Quotation No</Label>
                <Input
                  value={formData.quotationNo}
                  readOnly
                  className="bg-muted/50 h-9"
                  placeholder="SQ-001"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">Quotation Date</Label>
                <Input
                  type="date"
                  value={formData.quotationDate}
                  onChange={(e) => setFormData({ ...formData, quotationDate: e.target.value })}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">Valid Until</Label>
                <Input
                  type="date"
                  value={formData.validUntil}
                  onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData({ ...formData, status: value as Quotation["status"] })
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Form Fields - Row 2 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">Customer Name</Label>
                <Input
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  placeholder="Enter customer name"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">Customer Email</Label>
                <Input
                  type="email"
                  value={formData.customerEmail}
                  onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                  placeholder="customer@email.com"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">Customer Phone</Label>
                <Input
                  value={formData.customerPhone}
                  onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                  placeholder="Enter phone number"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">Customer Address</Label>
                <Input
                  value={formData.customerAddress}
                  onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
                  placeholder="Enter address"
                  className="h-9"
                />
              </div>
            </div>

            {/* Item Selection Section */}
            <div className="border rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Package className="w-4 h-4 text-primary" />
                <h3 className="font-medium">Select Items</h3>
              </div>

              {/* Item Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search parts by number or description..."
                  value={itemSearchTerm}
                  onChange={(e) => setItemSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Available Parts */}
              <ScrollArea className="h-48 border rounded-md">
                <div className="p-2 space-y-1">
                  {filteredParts.map((part) => {
                    const isSelected = selectedItems.some((i) => i.id === part.id);
                    return (
                      <div
                        key={part.id}
                        className={`flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer ${
                          isSelected ? "bg-primary/10" : ""
                        }`}
                        onClick={() => handleToggleItem(part, !isSelected)}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) =>
                            handleToggleItem(part, checked as boolean)
                          }
                        />
                        <div className="flex-1 grid grid-cols-4 gap-2 text-sm">
                          <span className="font-medium">{part.partNo}</span>
                          <span className="text-muted-foreground">{part.description}</span>
                          <span className="text-center text-primary font-medium">{part.stock} pcs</span>
                          <span className="text-right">Rs {part.price.toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>

              {/* Selected Items Table */}
              {selectedItems.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2">
                    Selected Items ({selectedItems.length})
                  </h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Part No</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="w-24">Qty</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.partNo}</TableCell>
                          <TableCell>{item.description}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) =>
                                handleQuantityChange(item.id, parseInt(e.target.value) || 1)
                              }
                              className="w-20 h-8"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            Rs {item.unitPrice.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            Rs {item.total.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => handleRemoveItem(item.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell colSpan={4} className="text-right font-medium">
                          Grand Total:
                        </TableCell>
                        <TableCell className="text-right font-bold text-primary">
                          Rs {calculateTotal().toFixed(2)}
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2 mb-6">
              <Label className="text-muted-foreground text-sm">Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={3}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button onClick={handleSubmit}>
                {editingQuotationId ? "Update Quotation" : "Create Quotation"}
              </Button>
              <Button variant="outline" onClick={() => {
                setIsFormOpen(false);
                setEditingQuotationId(null);
              }}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // List View
  return (
    <div className="space-y-4">
      {/* Search and New Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search quotations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={handleNewQuotation} className="gap-2">
          <Plus className="w-4 h-4" />
          New Quotation
        </Button>
      </div>

      {/* Quotations Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Sales Quotations ({filteredQuotations.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredQuotations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No quotations found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quotation #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Valid Until</TableHead>
                    <TableHead className="text-center">Items</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQuotations.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.quotationNo}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.customerName}</p>
                          <p className="text-xs text-muted-foreground">{item.customerEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell>{item.date}</TableCell>
                      <TableCell>{item.validUntil}</TableCell>
                      <TableCell className="text-center">{item.items.length}</TableCell>
                      <TableCell className="text-right">Rs {item.totalAmount.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(item.status)}>{item.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditQuotation(item)}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openConvertDialog(item)}>
                              <ShoppingCart className="w-4 h-4 mr-2" />
                              Convert to Sales Order
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handlePrintQuotation(item)}>
                              <Printer className="w-4 h-4 mr-2" />
                              Print / Export PDF
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => openDeleteDialog(item)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Quotation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete quotation{" "}
              <span className="font-semibold">{selectedQuotation?.quotationNo}</span>? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteQuotation}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Convert to Sales Order Confirmation Dialog */}
      <AlertDialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Convert to Sales Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to convert quotation{" "}
              <span className="font-semibold">{selectedQuotation?.quotationNo}</span>{" "}
              for customer <span className="font-semibold">{selectedQuotation?.customerName}</span>{" "}
              to a sales order?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmConvertToOrder}>
              Convert
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Hidden Print Component */}
      {printQuotation && (
        <div className="hidden">
          <PrintableDocument
            ref={printRef}
            type="quotation"
            data={{
              documentNo: printQuotation.quotationNo,
              date: printQuotation.date,
              validUntil: printQuotation.validUntil,
              customerName: printQuotation.customerName,
              customerEmail: printQuotation.customerEmail,
              customerPhone: printQuotation.customerPhone,
              customerAddress: printQuotation.customerAddress,
              status: printQuotation.status,
              items: printQuotation.items,
              totalAmount: printQuotation.totalAmount,
              notes: printQuotation.notes,
            }}
          />
        </div>
      )}
    </div>
  );
};
