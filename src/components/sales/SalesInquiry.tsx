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
import { Plus, Search, Eye, FileText, CalendarIcon, Package, ShoppingCart, Boxes, Settings2, Truck, Printer, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { PrintableDocument, printDocument } from "./PrintableDocument";
import { apiClient } from "@/lib/api";

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
  id?: string; // Part ID for fetching full details
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
  const [partsData, setPartsData] = useState<PartDetail[]>([]);
  const [loadingParts, setLoadingParts] = useState(false);
  const [loadingPartDetails, setLoadingPartDetails] = useState(false);
  const [rackMap, setRackMap] = useState<Record<string, string>>({});
  const [partIdMap, setPartIdMap] = useState<Record<string, string>>({}); // Map partNo to part ID

  const masterDropdownRef = useRef<HTMLDivElement>(null);
  const partDropdownRef = useRef<HTMLDivElement>(null);

  // Fetch parts from database
  useEffect(() => {
    const fetchParts = async () => {
      setLoadingParts(true);
      try {
        const [partsResponse, balancesResponse] = await Promise.all([
          apiClient.getParts({ 
            status: 'active',
            limit: 10000,
            page: 1 
          }),
          apiClient.getStockBalances({ limit: 10000 }).catch(() => ({ data: [], error: null }))
        ]);

        if (partsResponse.error) {
          console.error('Error fetching parts:', partsResponse.error);
          toast({
            title: "Error",
            description: "Failed to load parts from database",
            variant: "destructive",
          });
          return;
        }

        let partsDataArray: any[] = [];
        if (Array.isArray(partsResponse)) {
          partsDataArray = partsResponse;
        } else if (partsResponse.data && Array.isArray(partsResponse.data)) {
          partsDataArray = partsResponse.data;
        } else if (partsResponse.pagination && partsResponse.data) {
          partsDataArray = partsResponse.data;
        }

        let balancesData: any[] = [];
        if (Array.isArray(balancesResponse)) {
          balancesData = balancesResponse;
        } else if (balancesResponse.data && Array.isArray(balancesResponse.data)) {
          balancesData = balancesResponse.data;
        }

        // Create rack map from stock balances
        const rackMapData: Record<string, string> = {};
        if (Array.isArray(balancesData)) {
          balancesData.forEach((b: any) => {
            if (b.part_id && b.rack_no) {
              rackMapData[b.part_id] = b.rack_no;
            }
          });
        }
        setRackMap(rackMapData);

        // Create part ID map
        const idMap: Record<string, string> = {};
        
        // Transform API data to PartDetail format
        const transformedParts: PartDetail[] = partsDataArray
          .filter((p: any) => p.status === 'active' || !p.status)
          .map((p: any) => {
            const partNo = String(p.part_no || p.partNo || '').trim();
            if (partNo && p.id) {
              idMap[partNo] = p.id;
            }
            
            // Format numbers properly
            const formatNumber = (val: any): string => {
              if (val === null || val === undefined || val === '') return '0';
              const num = parseFloat(val);
              if (isNaN(num)) return '0';
              // Remove unnecessary decimals if whole number
              return num % 1 === 0 ? String(num) : num.toFixed(2);
            };
            
            return {
              id: p.id,
              partNo: partNo,
              masterPart: String(p.master_part_no || p.masterPart || p.master_part_no || '').trim() || 'N/A',
              brand: String(p.brand_name || p.brand || '').trim() || 'N/A',
              description: String(p.description || p.part_no || '').trim() || 'No description',
              category: String(p.category_name || p.category || '').trim() || 'N/A',
              subCategory: String(p.subcategory_name || p.subcategory || '').trim() || 'N/A',
              uom: String(p.uom || 'NOS').trim(),
              hsCode: String(p.hs_code || p.hsCode || '').trim() || 'N/A',
              weight: formatNumber(p.weight),
              cost: formatNumber(p.cost),
              priceA: formatNumber(p.price_a || p.priceA),
              priceB: formatNumber(p.price_b || p.priceB),
              priceM: formatNumber(p.price_m || p.priceM),
              origin: 'N/A', // Not in API
              grade: 'A', // Not in API
              status: (p.status || 'active').toUpperCase() === 'ACTIVE' ? 'A' : 'I',
              rackNo: rackMapData[p.id] || 'N/A',
              reOrderLevel: formatNumber(p.reorder_level || p.reorderLevel),
            };
          })
          .filter((p: PartDetail) => p.partNo && p.partNo.trim() !== '');

        setPartIdMap(idMap);
        setPartsData(transformedParts);
        console.log('Loaded parts from database:', transformedParts.length);
      } catch (error: any) {
        console.error('Error fetching parts:', error);
        toast({
          title: "Error",
          description: error.message || "Failed to fetch parts from database",
          variant: "destructive",
        });
      } finally {
        setLoadingParts(false);
      }
    };

    fetchParts();
  }, []);

  // Get unique master part numbers from database
  const masterPartNumbers = useMemo(() => {
    const uniqueMasters = [...new Set(partsData.map((item) => item.masterPart))].filter(Boolean);
    if (masterPartSearch) {
      return uniqueMasters.filter((master) =>
        master.toLowerCase().includes(masterPartSearch.toLowerCase())
      );
    }
    return uniqueMasters;
  }, [masterPartSearch, partsData]);

  // Filter parts based on search and selected master part
  const filteredParts = useMemo(() => {
    let filtered = partsData;
    if (selectedMasterPart) {
      filtered = filtered.filter((item) => item.masterPart === selectedMasterPart);
    }
    if (partNoSearch) {
      const searchLower = partNoSearch.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.partNo.toLowerCase().includes(searchLower) ||
          item.description.toLowerCase().includes(searchLower) ||
          item.brand.toLowerCase().includes(searchLower)
      );
    }
    return filtered;
  }, [selectedMasterPart, partNoSearch, partsData]);

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

  const handleSelectPart = async (part: PartDetail) => {
    setSelectedPart(part);
    setPartNoSearch(part.partNo);
    setShowPartDropdown(false);
    
    // Fetch full part details if we have the ID
    if (part.id) {
      setLoadingPartDetails(true);
      try {
        const response = await apiClient.getPart(part.id);
        if (response.error) {
          console.error('Error fetching part details:', response.error);
          // Keep the selected part from list if API fails
          return;
        }
        
        const p = response.data || response;
        
        // Format numbers properly
        const formatNumber = (val: any): string => {
          if (val === null || val === undefined || val === '') return '0';
          const num = parseFloat(val);
          if (isNaN(num)) return '0';
          return num % 1 === 0 ? String(num) : num.toFixed(2);
        };
        
        // Update selected part with full details
        const fullPartDetails: PartDetail = {
          id: p.id,
          partNo: String(p.part_no || p.partNo || '').trim(),
          masterPart: String(p.master_part_no || p.masterPart || '').trim() || 'N/A',
          brand: String(p.brand_name || p.brand || '').trim() || 'N/A',
          description: String(p.description || '').trim() || 'No description',
          category: String(p.category_name || p.category || '').trim() || 'N/A',
          subCategory: String(p.subcategory_name || p.subcategory || '').trim() || 'N/A',
          uom: String(p.uom || 'NOS').trim(),
          hsCode: String(p.hs_code || p.hsCode || '').trim() || 'N/A',
          weight: formatNumber(p.weight),
          cost: formatNumber(p.cost),
          priceA: formatNumber(p.price_a || p.priceA),
          priceB: formatNumber(p.price_b || p.priceB),
          priceM: formatNumber(p.price_m || p.priceM),
          origin: 'N/A',
          grade: 'A',
          status: (p.status || 'active').toUpperCase() === 'ACTIVE' ? 'A' : 'I',
          rackNo: (rackMap[p.id] && rackMap[p.id] !== 'N/A') ? rackMap[p.id] : 'N/A',
          reOrderLevel: formatNumber(p.reorder_level || p.reorderLevel),
        };
        
        setSelectedPart(fullPartDetails);
      } catch (error: any) {
        console.error('Error fetching part details:', error);
        // Keep the selected part from list if API fails
      } finally {
        setLoadingPartDetails(false);
      }
    }
  };

  const handleClearSearch = () => {
    setMasterPartSearch("");
    setSelectedMasterPart(null);
    setPartNoSearch("");
    setSelectedPart(null);
  };

  const handleRefreshParts = async () => {
    setLoadingParts(true);
    try {
      const [partsResponse, balancesResponse] = await Promise.all([
        apiClient.getParts({ 
          status: 'active',
          limit: 10000,
          page: 1 
        }),
        apiClient.getStockBalances({ limit: 10000 }).catch(() => ({ data: [], error: null }))
      ]);

      let partsDataArray: any[] = [];
      if (Array.isArray(partsResponse)) {
        partsDataArray = partsResponse;
      } else if (partsResponse.data && Array.isArray(partsResponse.data)) {
        partsDataArray = partsResponse.data;
      } else if (partsResponse.pagination && partsResponse.data) {
        partsDataArray = partsResponse.data;
      }

      let balancesData: any[] = [];
      if (Array.isArray(balancesResponse)) {
        balancesData = balancesResponse;
      } else if (balancesResponse.data && Array.isArray(balancesResponse.data)) {
        balancesData = balancesResponse.data;
      }

      const rackMapData: Record<string, string> = {};
      if (Array.isArray(balancesData)) {
        balancesData.forEach((b: any) => {
          if (b.part_id && b.rack_no) {
            rackMapData[b.part_id] = b.rack_no;
          }
        });
      }
      setRackMap(rackMapData);

      // Create part ID map
      const idMap: Record<string, string> = {};
      
      // Format numbers properly
      const formatNumber = (val: any): string => {
        if (val === null || val === undefined || val === '') return '0';
        const num = parseFloat(val);
        if (isNaN(num)) return '0';
        return num % 1 === 0 ? String(num) : num.toFixed(2);
      };
      
      const transformedParts: PartDetail[] = partsDataArray
        .filter((p: any) => p.status === 'active' || !p.status)
        .map((p: any) => {
          const partNo = String(p.part_no || p.partNo || '').trim();
          if (partNo && p.id) {
            idMap[partNo] = p.id;
          }
          
          return {
            id: p.id,
            partNo: partNo,
            masterPart: String(p.master_part_no || p.masterPart || p.master_part_no || '').trim() || 'N/A',
            brand: String(p.brand_name || p.brand || '').trim() || 'N/A',
            description: String(p.description || p.part_no || '').trim() || 'No description',
            category: String(p.category_name || p.category || '').trim() || 'N/A',
            subCategory: String(p.subcategory_name || p.subcategory || '').trim() || 'N/A',
            uom: String(p.uom || 'NOS').trim(),
            hsCode: String(p.hs_code || p.hsCode || '').trim() || 'N/A',
            weight: formatNumber(p.weight),
            cost: formatNumber(p.cost),
            priceA: formatNumber(p.price_a || p.priceA),
            priceB: formatNumber(p.price_b || p.priceB),
            priceM: formatNumber(p.price_m || p.priceM),
            origin: 'N/A',
            grade: 'A',
            status: (p.status || 'active').toUpperCase() === 'ACTIVE' ? 'A' : 'I',
            rackNo: rackMapData[p.id] || 'N/A',
            reOrderLevel: formatNumber(p.reorder_level || p.reorderLevel),
          };
        })
        .filter((p: PartDetail) => p.partNo && p.partNo.trim() !== '');

      setPartIdMap(idMap);

      setPartsData(transformedParts);
      toast({
        title: "Parts Refreshed",
        description: `Loaded ${transformedParts.length} parts from database.`,
      });
    } catch (error: any) {
      console.error('Error refreshing parts:', error);
      toast({
        title: "Error",
        description: "Failed to refresh parts",
        variant: "destructive",
      });
    } finally {
      setLoadingParts(false);
    }
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
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg font-semibold">Part Inquiry Lookup</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Search for part details using Master Part or Part Number</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshParts}
              disabled={loadingParts}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loadingParts ? "animate-spin" : ""}`} />
              {loadingParts ? "Loading..." : "Refresh"}
            </Button>
          </div>
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
                  {loadingParts ? (
                    <div className="px-4 py-3 text-sm text-muted-foreground text-center">
                      Loading master parts...
                    </div>
                  ) : masterPartNumbers.length > 0 ? (
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
                      {masterPartSearch ? "No master part numbers found matching your search" : "No master part numbers available"}
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
                  {loadingParts ? (
                    <div className="px-4 py-3 text-sm text-muted-foreground text-center">
                      Loading parts...
                    </div>
                  ) : filteredParts.length > 0 ? (
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
                      {partNoSearch ? "No parts found matching your search" : "No parts available"}
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
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold flex items-center gap-2 text-primary">
                  <Package className="h-4 w-4" />
                  Part Details - {selectedPart.partNo}
                </h4>
                {loadingPartDetails && (
                  <Badge variant="outline" className="text-xs">
                    Loading details...
                  </Badge>
                )}
              </div>
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
                  <div className="text-sm font-medium bg-background px-2 py-1.5 rounded border">
                    {selectedPart.hsCode && selectedPart.hsCode !== 'N/A' ? selectedPart.hsCode : 'N/A'}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Weight (Kg)</Label>
                  <div className="text-sm font-medium bg-background px-2 py-1.5 rounded border">
                    {selectedPart.weight && selectedPart.weight !== '0' ? selectedPart.weight : '0'}
                  </div>
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
                  <div className="text-sm font-medium bg-background px-2 py-1.5 rounded border text-primary">
                    Rs {selectedPart.cost && selectedPart.cost !== '0' ? parseFloat(selectedPart.cost).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Price-A</Label>
                  <div className="text-sm font-medium bg-background px-2 py-1.5 rounded border text-green-600">
                    Rs {selectedPart.priceA && selectedPart.priceA !== '0' ? parseFloat(selectedPart.priceA).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Price-B</Label>
                  <div className="text-sm font-medium bg-background px-2 py-1.5 rounded border text-green-600">
                    Rs {selectedPart.priceB && selectedPart.priceB !== '0' ? parseFloat(selectedPart.priceB).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Price-M</Label>
                  <div className="text-sm font-medium bg-background px-2 py-1.5 rounded border text-green-600">
                    Rs {selectedPart.priceM && selectedPart.priceM !== '0' ? parseFloat(selectedPart.priceM).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                  </div>
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
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-sm">
                          No purchase order history available for this part
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
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">
                          No related kits found for this part
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
                      {selectedPart && partsData.find(p => p.partNo === selectedPart.partNo) ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground text-sm">
                            No model information available for this part
                          </TableCell>
                        </TableRow>
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground text-sm">
                            Select a part to view model information
                          </TableCell>
                        </TableRow>
                      )}
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
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-sm">
                          No direct purchase order history available for this part
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