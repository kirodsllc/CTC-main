import { useState, useRef, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Search, Eye, FileText, CalendarIcon, Package, ShoppingCart, Boxes, Settings2, Truck, Printer } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { PrintableDocument, printDocument } from "./PrintableDocument";

interface Inquiry {
  id: string;
  inquiryNo: string;
  inquiryDate: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  subject: string;
  description: string;
  status: "New" | "In Progress" | "Quoted" | "Closed" | "Cancelled";
}

interface PartDetail {
  partNo: string;
  masterPart: string;
  brand: string;
  description: string;
  category: string;
  subCategory: string;
  uom: string;
  hsCode: string;
  weight: string;
  cost: string;
  priceA: string;
  priceB: string;
  priceM: string;
  origin: string;
  grade: string;
  status: string;
  rackNo: string;
  reOrderLevel: string;
}

// Mock parts data for lookup
const mockPartsData: PartDetail[] = [
  {
    partNo: "TEST001",
    masterPart: "MP-001",
    brand: "Test Brand",
    description: "High quality brake pad for vehicles",
    category: "Brakes",
    subCategory: "Brake Pads",
    uom: "NOS",
    hsCode: "8708.30",
    weight: "0.5",
    cost: "100.50",
    priceA: "150.00",
    priceB: "140.00",
    priceM: "130.00",
    origin: "Japan",
    grade: "A",
    status: "A",
    rackNo: "R-101",
    reOrderLevel: "10",
  },
  {
    partNo: "TEST002",
    masterPart: "MP-001",
    brand: "Test Brand 2",
    description: "Premium air filter element",
    category: "Filters",
    subCategory: "Air Filter",
    uom: "NOS",
    hsCode: "8421.31",
    weight: "0.3",
    cost: "200.75",
    priceA: "250.00",
    priceB: "240.00",
    priceM: "230.00",
    origin: "Germany",
    grade: "A",
    status: "A",
    rackNo: "R-102",
    reOrderLevel: "15",
  },
  {
    partNo: "ENG-001",
    masterPart: "MP-002",
    brand: "Bosch",
    description: "Engine oil filter for diesel engines",
    category: "Engine",
    subCategory: "Oil Filter",
    uom: "NOS",
    hsCode: "8421.23",
    weight: "0.4",
    cost: "85.00",
    priceA: "120.00",
    priceB: "110.00",
    priceM: "100.00",
    origin: "USA",
    grade: "A",
    status: "A",
    rackNo: "R-103",
    reOrderLevel: "20",
  },
  {
    partNo: "SUS-001",
    masterPart: "MP-003",
    brand: "Michelin",
    description: "Suspension shock absorber front",
    category: "Suspension",
    subCategory: "Shock Absorber",
    uom: "SET",
    hsCode: "8708.80",
    weight: "2.5",
    cost: "320.00",
    priceA: "400.00",
    priceB: "380.00",
    priceM: "360.00",
    origin: "France",
    grade: "B",
    status: "A",
    rackNo: "R-104",
    reOrderLevel: "5",
  },
];

export const SalesInquiry = () => {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [inquiryDate, setInquiryDate] = useState<Date>(new Date());
  const [formData, setFormData] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    subject: "",
    description: "",
    status: "New" as Inquiry["status"],
  });
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [printInquiry, setPrintInquiry] = useState<Inquiry | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // Part lookup state with dropdowns
  const [masterPartSearch, setMasterPartSearch] = useState("");
  const [selectedMasterPart, setSelectedMasterPart] = useState<string | null>(null);
  const [partNoSearch, setPartNoSearch] = useState("");
  const [selectedPart, setSelectedPart] = useState<PartDetail | null>(null);
  const [showMasterDropdown, setShowMasterDropdown] = useState(false);
  const [showPartDropdown, setShowPartDropdown] = useState(false);

  const masterDropdownRef = useRef<HTMLDivElement>(null);
  const partDropdownRef = useRef<HTMLDivElement>(null);

  // Get unique master part numbers
  const masterPartNumbers = useMemo(() => {
    const uniqueMasters = [...new Set(mockPartsData.map((item) => item.masterPart))].filter(Boolean);
    if (masterPartSearch) {
      return uniqueMasters.filter((master) =>
        master.toLowerCase().includes(masterPartSearch.toLowerCase())
      );
    }
    return uniqueMasters;
  }, [masterPartSearch]);

  // Filter parts based on search and selected master part
  const filteredParts = useMemo(() => {
    let filtered = mockPartsData;
    if (selectedMasterPart) {
      filtered = filtered.filter((item) => item.masterPart === selectedMasterPart);
    }
    if (partNoSearch) {
      filtered = filtered.filter(
        (item) =>
          item.partNo.toLowerCase().includes(partNoSearch.toLowerCase()) ||
          item.description.toLowerCase().includes(partNoSearch.toLowerCase()) ||
          item.brand.toLowerCase().includes(partNoSearch.toLowerCase())
      );
    }
    return filtered;
  }, [selectedMasterPart, partNoSearch]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (masterDropdownRef.current && !masterDropdownRef.current.contains(event.target as Node)) {
        setShowMasterDropdown(false);
      }
      if (partDropdownRef.current && !partDropdownRef.current.contains(event.target as Node)) {
        setShowPartDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectMasterPart = (master: string) => {
    setSelectedMasterPart(master);
    setMasterPartSearch(master);
    setShowMasterDropdown(false);
    // Reset part selection when master changes
    setSelectedPart(null);
    setPartNoSearch("");
  };

  const handleSelectPart = (part: PartDetail) => {
    setSelectedPart(part);
    setPartNoSearch(part.partNo);
    setShowPartDropdown(false);
  };

  const handleClearSearch = () => {
    setMasterPartSearch("");
    setSelectedMasterPart(null);
    setPartNoSearch("");
    setSelectedPart(null);
  };

  const handleView = (inquiry: Inquiry) => {
    setSelectedInquiry(inquiry);
    setViewDialogOpen(true);
  };

  const handleConvertToQuote = (inquiry: Inquiry) => {
    toast({
      title: "Quotation Created",
      description: `Inquiry ${inquiry.inquiryNo} has been converted to a quotation.`,
    });
    setInquiries(inquiries.map(inq => 
      inq.id === inquiry.id ? { ...inq, status: "Quoted" as Inquiry["status"] } : inq
    ));
  };

  // Handle print inquiry
  const handlePrintInquiry = (inquiry: Inquiry) => {
    setPrintInquiry(inquiry);
    setTimeout(() => {
      printDocument(printRef);
      toast({
        title: "Print Initiated",
        description: `Inquiry ${inquiry.inquiryNo} is being printed.`,
      });
    }, 100);
  };

  const filteredInquiries = inquiries.filter(
    (inquiry) =>
      inquiry.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inquiry.inquiryNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inquiry.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const generateInquiryNo = () => {
    const nextNum = inquiries.length + 1;
    return `INQ-${String(nextNum).padStart(3, "0")}`;
  };

  const handleSubmit = () => {
    if (!formData.customerName || !formData.subject) {
      toast({
        title: "Validation Error",
        description: "Please fill in required fields (Customer Name and Subject).",
        variant: "destructive",
      });
      return;
    }

    const newInquiry: Inquiry = {
      id: crypto.randomUUID(),
      inquiryNo: generateInquiryNo(),
      inquiryDate: format(inquiryDate, "dd/MM/yyyy"),
      customerName: formData.customerName,
      customerEmail: formData.customerEmail,
      customerPhone: formData.customerPhone,
      subject: formData.subject,
      description: formData.description,
      status: formData.status,
    };

    setInquiries([...inquiries, newInquiry]);
    setFormData({
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      subject: "",
      description: "",
      status: "New",
    });
    setShowForm(false);
    toast({
      title: "Inquiry Created",
      description: `Inquiry ${newInquiry.inquiryNo} has been created successfully.`,
    });
  };

  const handleCancel = () => {
    setFormData({
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      subject: "",
      description: "",
      status: "New",
    });
    setShowForm(false);
  };

  const getStatusColor = (status: Inquiry["status"]) => {
    switch (status) {
      case "New":
        return "bg-blue-100 text-blue-800";
      case "In Progress":
        return "bg-yellow-100 text-yellow-800";
      case "Quoted":
        return "bg-green-100 text-green-800";
      case "Closed":
        return "bg-gray-100 text-gray-800";
      case "Cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-4">
      {/* Part Lookup Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-semibold">Part Inquiry Lookup</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">Search for part details using Master Part or Part Number</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Fields with Dropdowns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            {/* Master Part Dropdown */}
            <div ref={masterDropdownRef} className="relative space-y-2">
              <Label className="text-sm font-medium">Master Part #</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search master part..."
                  value={masterPartSearch}
                  onChange={(e) => {
                    setMasterPartSearch(e.target.value);
                    setShowMasterDropdown(true);
                    if (e.target.value !== selectedMasterPart) {
                      setSelectedMasterPart(null);
                    }
                  }}
                  onFocus={() => setShowMasterDropdown(true)}
                  className={cn(
                    "pl-10",
                    showMasterDropdown && "ring-2 ring-primary border-primary"
                  )}
                />
              </div>
              {/* Master Part Dropdown */}
              {showMasterDropdown && (
                <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-60 overflow-auto">
                  {masterPartNumbers.length > 0 ? (
                    masterPartNumbers.map((master) => (
                      <button
                        key={master}
                        onClick={() => handleSelectMasterPart(master)}
                        className={cn(
                          "w-full text-left px-4 py-3 text-sm hover:bg-muted transition-colors border-b border-border last:border-b-0",
                          selectedMasterPart === master && "bg-muted"
                        )}
                      >
                        {master}
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-sm text-muted-foreground">
                      No master part numbers found
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Part No Dropdown */}
            <div ref={partDropdownRef} className="relative space-y-2">
              <Label className="text-sm font-medium">Part No/SSP#</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by part number, description..."
                  value={partNoSearch}
                  onChange={(e) => {
                    setPartNoSearch(e.target.value);
                    setShowPartDropdown(true);
                    if (e.target.value !== selectedPart?.partNo) {
                      setSelectedPart(null);
                    }
                  }}
                  onFocus={() => setShowPartDropdown(true)}
                  className={cn(
                    "pl-10",
                    showPartDropdown && "ring-2 ring-primary border-primary"
                  )}
                />
              </div>
              {/* Part Dropdown */}
              {showPartDropdown && (
                <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-80 overflow-auto">
                  {filteredParts.length > 0 ? (
                    filteredParts.map((part) => (
                      <button
                        key={part.partNo}
                        onClick={() => handleSelectPart(part)}
                        className={cn(
                          "w-full text-left px-4 py-3 hover:bg-muted transition-colors border-b border-border last:border-b-0",
                          selectedPart?.partNo === part.partNo && "bg-muted"
                        )}
                      >
                        <p className="font-medium text-foreground text-sm">{part.partNo}</p>
                        <p className="text-sm text-muted-foreground">{part.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Brand: {part.brand} &nbsp;&nbsp; Master: {part.masterPart}
                        </p>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-sm text-muted-foreground">
                      No parts found
                    </div>
                  )}
                </div>
              )}
            </div>

            <Button variant="outline" onClick={handleClearSearch}>
              Clear
            </Button>
          </div>

          {/* Part Details Display (Read-only) */}
          {selectedPart && (
            <div className="mt-4 p-4 rounded-lg bg-muted/30 border">
              <h4 className="text-sm font-semibold mb-4 flex items-center gap-2 text-primary">
                <Package className="h-4 w-4" />
                Part Details - {selectedPart.partNo}
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Part No</Label>
                  <div className="text-sm font-medium bg-background px-2 py-1.5 rounded border">{selectedPart.partNo}</div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Master Part</Label>
                  <div className="text-sm font-medium bg-background px-2 py-1.5 rounded border">{selectedPart.masterPart}</div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Brand</Label>
                  <div className="text-sm font-medium bg-background px-2 py-1.5 rounded border">{selectedPart.brand}</div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Category</Label>
                  <div className="text-sm font-medium bg-background px-2 py-1.5 rounded border">{selectedPart.category}</div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Sub Category</Label>
                  <div className="text-sm font-medium bg-background px-2 py-1.5 rounded border">{selectedPart.subCategory}</div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">UOM</Label>
                  <div className="text-sm font-medium bg-background px-2 py-1.5 rounded border">{selectedPart.uom}</div>
                </div>
                <div className="space-y-1 col-span-2">
                  <Label className="text-xs text-muted-foreground">Description</Label>
                  <div className="text-sm font-medium bg-background px-2 py-1.5 rounded border">{selectedPart.description}</div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">HS Code</Label>
                  <div className="text-sm font-medium bg-background px-2 py-1.5 rounded border">{selectedPart.hsCode}</div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Weight (Kg)</Label>
                  <div className="text-sm font-medium bg-background px-2 py-1.5 rounded border">{selectedPart.weight}</div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Origin</Label>
                  <div className="text-sm font-medium bg-background px-2 py-1.5 rounded border">{selectedPart.origin}</div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Grade</Label>
                  <div className="text-sm font-medium bg-background px-2 py-1.5 rounded border">{selectedPart.grade}</div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Cost</Label>
                  <div className="text-sm font-medium bg-background px-2 py-1.5 rounded border text-primary">Rs {selectedPart.cost}</div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Price-A</Label>
                  <div className="text-sm font-medium bg-background px-2 py-1.5 rounded border text-green-600">Rs {selectedPart.priceA}</div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Price-B</Label>
                  <div className="text-sm font-medium bg-background px-2 py-1.5 rounded border text-green-600">Rs {selectedPart.priceB}</div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Price-M</Label>
                  <div className="text-sm font-medium bg-background px-2 py-1.5 rounded border text-green-600">Rs {selectedPart.priceM}</div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Rack No</Label>
                  <div className="text-sm font-medium bg-background px-2 py-1.5 rounded border">{selectedPart.rackNo}</div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Re-Order Level</Label>
                  <div className="text-sm font-medium bg-background px-2 py-1.5 rounded border">{selectedPart.reOrderLevel}</div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <div className="text-sm font-medium bg-background px-2 py-1.5 rounded border">
                    <Badge variant={selectedPart.status === "A" ? "default" : "secondary"}>
                      {selectedPart.status === "A" ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!selectedPart && (
            <div className="text-center py-6 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Select a part from the dropdown to view details</p>
            </div>
          )}

          {/* Tabs Section */}
          {selectedPart && (
            <Tabs defaultValue="last-po" className="mt-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="last-po" className="flex items-center gap-1.5 text-xs">
                  <ShoppingCart className="h-3.5 w-3.5" />
                  Last Purchase Order
                </TabsTrigger>
                <TabsTrigger value="related-kits" className="flex items-center gap-1.5 text-xs">
                  <Boxes className="h-3.5 w-3.5" />
                  Related Kits
                </TabsTrigger>
                <TabsTrigger value="models" className="flex items-center gap-1.5 text-xs">
                  <Settings2 className="h-3.5 w-3.5" />
                  Models
                </TabsTrigger>
                <TabsTrigger value="last-dpo" className="flex items-center gap-1.5 text-xs">
                  <Truck className="h-3.5 w-3.5" />
                  Last Direct PO
                </TabsTrigger>
              </TabsList>

              {/* Last Purchase Order Tab */}
              <TabsContent value="last-po" className="mt-4">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="text-xs">PO No</TableHead>
                        <TableHead className="text-xs">Date</TableHead>
                        <TableHead className="text-xs">Supplier</TableHead>
                        <TableHead className="text-xs">Qty</TableHead>
                        <TableHead className="text-xs">Rate</TableHead>
                        <TableHead className="text-xs">Amount</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="text-xs font-medium">PO-2024-001</TableCell>
                        <TableCell className="text-xs">15/12/2024</TableCell>
                        <TableCell className="text-xs">ABC Suppliers</TableCell>
                        <TableCell className="text-xs">50</TableCell>
                        <TableCell className="text-xs">Rs 95.00</TableCell>
                        <TableCell className="text-xs">Rs 4,750.00</TableCell>
                        <TableCell>
                          <Badge variant="default" className="text-xs">Received</Badge>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-xs font-medium">PO-2024-002</TableCell>
                        <TableCell className="text-xs">10/11/2024</TableCell>
                        <TableCell className="text-xs">XYZ Trading</TableCell>
                        <TableCell className="text-xs">100</TableCell>
                        <TableCell className="text-xs">Rs 92.00</TableCell>
                        <TableCell className="text-xs">Rs 9,200.00</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">Pending</Badge>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* Related Kits Tab */}
              <TabsContent value="related-kits" className="mt-4">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="text-xs">Kit Code</TableHead>
                        <TableHead className="text-xs">Kit Name</TableHead>
                        <TableHead className="text-xs">Qty Used</TableHead>
                        <TableHead className="text-xs">Kit Price</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="text-xs font-medium">KIT-001</TableCell>
                        <TableCell className="text-xs">Brake Service Kit</TableCell>
                        <TableCell className="text-xs">2</TableCell>
                        <TableCell className="text-xs">Rs 1,500.00</TableCell>
                        <TableCell>
                          <Badge variant="default" className="text-xs">Active</Badge>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-xs font-medium">KIT-002</TableCell>
                        <TableCell className="text-xs">Full Service Package</TableCell>
                        <TableCell className="text-xs">1</TableCell>
                        <TableCell className="text-xs">Rs 3,200.00</TableCell>
                        <TableCell>
                          <Badge variant="default" className="text-xs">Active</Badge>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* Models Tab */}
              <TabsContent value="models" className="mt-4">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="text-xs">Model Name</TableHead>
                        <TableHead className="text-xs">Year</TableHead>
                        <TableHead className="text-xs">Qty Used</TableHead>
                        <TableHead className="text-xs">Application</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="text-xs font-medium">Toyota Camry</TableCell>
                        <TableCell className="text-xs">2018-2024</TableCell>
                        <TableCell className="text-xs">4</TableCell>
                        <TableCell className="text-xs">Front Brakes</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-xs font-medium">Honda Civic</TableCell>
                        <TableCell className="text-xs">2019-2023</TableCell>
                        <TableCell className="text-xs">4</TableCell>
                        <TableCell className="text-xs">Front & Rear Brakes</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-xs font-medium">Nissan Altima</TableCell>
                        <TableCell className="text-xs">2020-2024</TableCell>
                        <TableCell className="text-xs">2</TableCell>
                        <TableCell className="text-xs">Rear Brakes</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* Last Direct Purchase Order Tab */}
              <TabsContent value="last-dpo" className="mt-4">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="text-xs">DPO No</TableHead>
                        <TableHead className="text-xs">Date</TableHead>
                        <TableHead className="text-xs">Customer</TableHead>
                        <TableHead className="text-xs">Qty</TableHead>
                        <TableHead className="text-xs">Rate</TableHead>
                        <TableHead className="text-xs">Amount</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="text-xs font-medium">DPO-2024-015</TableCell>
                        <TableCell className="text-xs">20/12/2024</TableCell>
                        <TableCell className="text-xs">Auto Parts Store</TableCell>
                        <TableCell className="text-xs">25</TableCell>
                        <TableCell className="text-xs">Rs 140.00</TableCell>
                        <TableCell className="text-xs">Rs 3,500.00</TableCell>
                        <TableCell>
                          <Badge variant="default" className="text-xs">Received</Badge>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-xs font-medium">DPO-2024-012</TableCell>
                        <TableCell className="text-xs">05/12/2024</TableCell>
                        <TableCell className="text-xs">Quick Service Center</TableCell>
                        <TableCell className="text-xs">10</TableCell>
                        <TableCell className="text-xs">Rs 145.00</TableCell>
                        <TableCell className="text-xs">Rs 1,450.00</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">Processing</Badge>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Hidden Print Component */}
      {printInquiry && (
        <div className="hidden">
          <PrintableDocument
            ref={printRef}
            type="inquiry"
            data={{
              documentNo: printInquiry.inquiryNo,
              date: printInquiry.inquiryDate,
              customerName: printInquiry.customerName,
              customerEmail: printInquiry.customerEmail,
              customerPhone: printInquiry.customerPhone,
              subject: printInquiry.subject,
              description: printInquiry.description,
              status: printInquiry.status,
            }}
          />
        </div>
      )}
    </div>
  );
};