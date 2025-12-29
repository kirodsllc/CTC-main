import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api";
import {
  BarChart3,
  FileText,
  Tag,
  RefreshCw,
  Target,
  TrendingUp,
  Package,
  DollarSign,
  AlertTriangle,
  Download,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Percent,
  History,
  Eye,
  Clock,
  User,
} from "lucide-react";

// Sample data for pricing items
interface PriceItem {
  id: string;
  partNo: string;
  description: string;
  category: string;
  brand: string;
  cost: number;
  newCost: number;
  priceA: number;
  newPriceA: number;
  priceB: number;
  newPriceB: number;
  priceM: number;
  newPriceM: number;
  quantity: number;
  selected: boolean;
  modified: boolean;
}

const sampleItems: PriceItem[] = [];

// Price levels data
interface PriceLevel {
  id: string;
  name: string;
  description: string;
  markup: number;
  customerType: string;
  itemCount: number;
}

const priceLevels: PriceLevel[] = [];

// Landed cost entries
interface LandedCostEntry {
  id: string;
  poNumber: string;
  date: string;
  supplier: string;
  itemCount: number;
  invoiceValue: number;
  freight: number;
  customs: number;
  insurance: number;
  handling: number;
  totalLanded: number;
  status: "pending" | "calculated" | "applied";
}

const landedCostEntries: LandedCostEntry[] = [];

// Price history interface
interface PriceHistoryEntry {
  id: string;
  itemId: string;
  partNo: string;
  description: string;
  date: string;
  time: string;
  updatedBy: string;
  reason: string;
  updateType: "individual" | "bulk" | "margin";
  changes: {
    field: string;
    oldValue: number;
    newValue: number;
  }[];
}

const samplePriceHistory: PriceHistoryEntry[] = [];

export const PricingCosting = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [items, setItems] = useState<PriceItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterBrand, setFilterBrand] = useState("all");
  const [priceUpdateMode, setPriceUpdateMode] = useState<"individual" | "group">("individual");
  const [currentPage, setCurrentPage] = useState(1);
  const [updateReason, setUpdateReason] = useState("");
  const [showNewLandedCost, setShowNewLandedCost] = useState(false);
  const [showSetMargins, setShowSetMargins] = useState(false);
  const [showBulkPercentage, setShowBulkPercentage] = useState(false);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryEntry[]>([]);
  const [historySearchTerm, setHistorySearchTerm] = useState("");
  const [historyFilterType, setHistoryFilterType] = useState<"all" | "individual" | "bulk" | "margin">("all");
  const [showItemHistory, setShowItemHistory] = useState(false);
  const [selectedItemForHistory, setSelectedItemForHistory] = useState<PriceItem | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const historyPerPage = 10;
  const itemsPerPage = 25;

  // Bulk percentage adjustment state
  const [bulkPercentage, setBulkPercentage] = useState({
    percentage: 0,
    adjustmentType: "increase" as "increase" | "decrease",
    applyToCost: false,
    applyToPriceA: true,
    applyToPriceB: true,
    applyToPriceM: true,
  });

  // New landed cost form state
  const [newLandedCost, setNewLandedCost] = useState({
    poNumber: "",
    supplier: "",
    invoiceValue: 0,
    freight: 0,
    customs: 0,
    insurance: 0,
    handling: 0,
  });

  // Margin settings state
  const [marginSettings, setMarginSettings] = useState({
    minMargin: 10,
    targetMargin: 25,
    maxMargin: 50,
    applyTo: "all",
  });

  // Fetch parts data
  useEffect(() => {
    if (activeTab === "dashboard" || activeTab === "price-updating" || activeTab === "profitability") {
      fetchParts();
    }
  }, [activeTab, searchTerm, filterCategory, filterBrand, currentPage]);

  // Fetch price history
  useEffect(() => {
    if (activeTab === "price-history") {
      fetchPriceHistory();
    }
  }, [activeTab, historyPage]);

  const fetchParts = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        limit: 1000, // Get all items for calculations
      };

      if (searchTerm) {
        params.search = searchTerm;
      }

      if (filterCategory !== "all") {
        params.category = filterCategory;
      }

      const response = await apiClient.getPartsForPriceManagement(params);
      const data = response.data || [];
      
      if (Array.isArray(data)) {
        const priceItems: PriceItem[] = data.map((item: any) => ({
          id: item.id,
          partNo: item.partNo || "",
          description: item.description || "",
          category: item.category || "Uncategorized",
          brand: item.brand || "Unknown",
          cost: item.cost || 0,
          newCost: item.cost || 0,
          priceA: item.priceA || 0,
          newPriceA: item.priceA || 0,
          priceB: item.priceB || 0,
          newPriceB: item.priceB || 0,
          priceM: item.priceM || item.price_m || item.priceA || 0,
          newPriceM: item.priceM || item.price_m || item.priceA || 0,
          quantity: item.qty || 0,
          selected: false,
          modified: false,
        }));
        setItems(priceItems);
      } else {
        setItems([]);
      }
    } catch (error) {
      console.error('Error fetching parts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch parts data",
        variant: "destructive",
      });
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPriceHistory = async () => {
    try {
      setHistoryLoading(true);
      const response = await apiClient.getPriceHistory({ 
        page: historyPage, 
        limit: 100 
      });
      const data = response.data || [];
      
      if (Array.isArray(data)) {
        const historyItems: PriceHistoryEntry[] = data.map((item: any) => {
          const dateObj = new Date(item.date);
          // Determine update type
          let updateType: "individual" | "bulk" | "margin" = "individual";
          if (item.updateType && item.updateType.includes("Percentage")) {
            updateType = "bulk";
          } else if (item.updateType && item.updateType.includes("Fixed")) {
            updateType = "bulk";
          } else if (item.itemsUpdated && item.itemsUpdated > 1) {
            updateType = "bulk";
          }
          
          return {
            id: item.id,
            itemId: item.partId || item.part?.id || "",
            partNo: item.part?.partNo || item.partNo || "",
            description: item.part?.description || item.description || "",
            date: dateObj.toLocaleDateString(),
            time: dateObj.toLocaleTimeString(),
            updatedBy: item.updatedBy || "System",
            reason: item.reason || "",
            updateType: updateType,
            changes: [{
              field: item.priceField || "priceA",
              oldValue: 0,
              newValue: item.value || 0,
            }],
          };
        });
        setPriceHistory(historyItems);
      } else {
        setPriceHistory([]);
      }
    } catch (error) {
      console.error('Error fetching price history:', error);
      toast({
        title: "Error",
        description: "Failed to fetch price history",
        variant: "destructive",
      });
      setPriceHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Calculate statistics
  const totalStockValue = items.reduce((sum, item) => sum + (item.priceA * item.quantity), 0);
  const totalCost = items.reduce((sum, item) => sum + (item.cost * item.quantity), 0);
  const potentialProfit = totalStockValue - totalCost;
  const profitMargin = totalCost > 0 ? ((potentialProfit / totalCost) * 100) : 0;
  
  const itemsWithPrice = items.filter(item => item.priceA > 0);
  const avgMargin = itemsWithPrice.length > 0 
    ? itemsWithPrice.reduce((sum, item) => {
        const margin = item.cost > 0 ? ((item.priceA - item.cost) / item.cost) * 100 : 0;
        return sum + margin;
      }, 0) / itemsWithPrice.length
    : 0;

  const lowMarginItems = items.filter(item => {
    if (item.cost === 0 || item.priceA === 0) return false;
    const margin = ((item.priceA - item.cost) / item.cost) * 100;
    return margin < 10;
  });

  const nopriceItems = items.filter(item => item.priceA === 0);
  const normalMarginItems = items.filter(item => {
    if (item.cost === 0 || item.priceA === 0) return false;
    const margin = ((item.priceA - item.cost) / item.cost) * 100;
    return margin >= 10 && margin <= 50;
  });
  const highMarginItems = items.filter(item => {
    if (item.cost === 0 || item.priceA === 0) return false;
    const margin = ((item.priceA - item.cost) / item.cost) * 100;
    return margin > 50;
  });

  const categories = useMemo(() => {
    const cats = ["all", ...new Set(items.map(item => item.category).filter(Boolean))];
    return cats;
  }, [items]);

  const brands = useMemo(() => {
    const brs = ["all", ...new Set(items.map(item => item.brand).filter(Boolean))];
    return brs;
  }, [items]);

  // Filter items
  const filteredItems = items.filter(item => {
    const matchesSearch = item.partNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === "all" || item.category === filterCategory;
    const matchesBrand = filterBrand === "all" || item.brand === filterBrand;
    return matchesSearch && matchesCategory && matchesBrand;
  });

  // Pagination
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + itemsPerPage);

  // Selected and modified counts
  const selectedCount = items.filter(item => item.selected).length;
  const modifiedCount = items.filter(item => item.modified).length;

  const formatCurrency = (value: number) => {
    return `Rs ${value.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Handle individual price changes
  const handlePriceChange = (id: string, field: "newCost" | "newPriceA" | "newPriceB" | "newPriceM", value: number) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        // Check if modified
        updated.modified = 
          updated.newCost !== updated.cost ||
          updated.newPriceA !== updated.priceA ||
          updated.newPriceB !== updated.priceB ||
          updated.newPriceM !== updated.priceM;
        return updated;
      }
      return item;
    }));
  };

  // Handle checkbox selection
  const handleSelectItem = (id: string) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, selected: !item.selected } : item
    ));
  };

  const handleSelectAll = () => {
    const allSelected = paginatedItems.every(item => item.selected);
    const ids = paginatedItems.map(item => item.id);
    setItems(prev => prev.map(item => 
      ids.includes(item.id) ? { ...item, selected: !allSelected } : item
    ));
  };

  // Reset changes
  const handleReset = () => {
    setItems(prev => prev.map(item => ({
      ...item,
      newCost: item.cost,
      newPriceA: item.priceA,
      newPriceB: item.priceB,
      newPriceM: item.priceM,
      modified: false,
      selected: false,
    })));
    setUpdateReason("");
    toast({
      title: "Changes Reset",
      description: "All price changes have been reset.",
    });
  };

  // Apply changes
  const handleApplyChanges = async () => {
    if (modifiedCount === 0) {
      toast({
        title: "No Changes",
        description: "There are no changes to apply.",
        variant: "destructive",
      });
      return;
    }

    if (!updateReason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for the price update.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const modifiedItems = items.filter(item => item.modified);
      
      // Update each modified item
      const updatePromises = modifiedItems.map(async (item) => {
        const priceUpdates: any = {};
        const partUpdates: any = {};
        
        if (item.newCost !== item.cost) priceUpdates.cost = item.newCost;
        if (item.newPriceA !== item.priceA) priceUpdates.priceA = item.newPriceA;
        if (item.newPriceB !== item.priceB) priceUpdates.priceB = item.newPriceB;
        if (item.newPriceM !== item.priceM) partUpdates.priceM = item.newPriceM;

        const promises: Promise<any>[] = [];
        
        // Update prices via updatePartPrices
        if (Object.keys(priceUpdates).length > 0) {
          promises.push(apiClient.updatePartPrices(item.id, {
            ...priceUpdates,
            reason: updateReason,
            updated_by: 'User',
          }));
        }
        
        // Update priceM via updatePart if changed
        if (Object.keys(partUpdates).length > 0) {
          promises.push(apiClient.updatePart(item.id, partUpdates));
        }
        
        return promises.length > 0 ? Promise.all(promises) : null;
      });

      await Promise.all(updatePromises.filter(p => p !== null));

      // Refresh data
      await fetchParts();
      
      toast({
        title: "Changes Applied",
        description: `${modifiedCount} item(s) updated successfully.`,
      });
      setUpdateReason("");
    } catch (error) {
      console.error('Error applying changes:', error);
      toast({
        title: "Error",
        description: "Failed to apply changes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Export data
  const handleExport = () => {
    const headers = ["Part No", "Description", "Category", "Cost", "Price A", "Price B", "Price M", "Margin %"];
    const csvContent = [
      headers.join(","),
      ...items.map(item => {
        const margin = item.cost > 0 ? ((item.priceA - item.cost) / item.cost * 100).toFixed(2) : "0";
        return [item.partNo, item.description, item.category, item.cost, item.priceA, item.priceB, item.priceM, margin].join(",");
      })
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pricing_report.csv";
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: "Pricing report exported successfully.",
    });
  };

  // Handle new landed cost
  const handleSaveLandedCost = () => {
    const total = newLandedCost.invoiceValue + newLandedCost.freight + newLandedCost.customs + 
                  newLandedCost.insurance + newLandedCost.handling;
    
    toast({
      title: "Landed Cost Calculated",
      description: `Total landed cost: ${formatCurrency(total)}`,
    });
    setShowNewLandedCost(false);
    setNewLandedCost({ poNumber: "", supplier: "", invoiceValue: 0, freight: 0, customs: 0, insurance: 0, handling: 0 });
  };

  // Handle set margins
  const handleApplyMargins = async () => {
    try {
      setLoading(true);
      const targetMargin = marginSettings.targetMargin / 100; // Convert to decimal
      const itemsToUpdate = marginSettings.applyTo === "all" 
        ? items 
        : items.filter(item => item.category === marginSettings.applyTo);

      const updatePromises = itemsToUpdate.map(async (item) => {
        if (item.cost > 0) {
          const newPriceA = item.cost * (1 + targetMargin);
          const updates: any = {
            priceA: Math.round(newPriceA * 100) / 100,
            reason: `Margin target of ${marginSettings.targetMargin}% applied`,
            updated_by: 'User',
          };
          return apiClient.updatePartPrices(item.id, updates);
        }
        return null;
      });

      await Promise.all(updatePromises.filter(p => p !== null));
      await fetchParts();

      toast({
        title: "Margins Applied",
        description: `Target margin of ${marginSettings.targetMargin}% applied to ${itemsToUpdate.length} item(s).`,
      });
      setShowSetMargins(false);
    } catch (error) {
      console.error('Error applying margins:', error);
      toast({
        title: "Error",
        description: "Failed to apply margins. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle bulk percentage adjustment
  const handleApplyBulkPercentage = () => {
    const selectedItems = items.filter(item => item.selected);
    
    if (selectedItems.length === 0) {
      toast({
        title: "No Items Selected",
        description: "Please select items to apply the percentage adjustment.",
        variant: "destructive",
      });
      return;
    }

    if (bulkPercentage.percentage === 0) {
      toast({
        title: "Invalid Percentage",
        description: "Please enter a percentage value greater than 0.",
        variant: "destructive",
      });
      return;
    }

    const multiplier = bulkPercentage.adjustmentType === "increase" 
      ? 1 + (bulkPercentage.percentage / 100)
      : 1 - (bulkPercentage.percentage / 100);

    setItems(prev => prev.map(item => {
      if (!item.selected) return item;
      
      const updated = {
        ...item,
        newCost: bulkPercentage.applyToCost ? Math.round(item.cost * multiplier * 100) / 100 : item.newCost,
        newPriceA: bulkPercentage.applyToPriceA ? Math.round(item.priceA * multiplier * 100) / 100 : item.newPriceA,
        newPriceB: bulkPercentage.applyToPriceB ? Math.round(item.priceB * multiplier * 100) / 100 : item.newPriceB,
        newPriceM: bulkPercentage.applyToPriceM ? Math.round(item.priceM * multiplier * 100) / 100 : item.newPriceM,
      };
      
      // Check if modified
      updated.modified = 
        updated.newCost !== updated.cost ||
        updated.newPriceA !== updated.priceA ||
        updated.newPriceB !== updated.priceB ||
        updated.newPriceM !== updated.priceM;
      
      return updated;
    }));

    toast({
      title: "Bulk Adjustment Applied",
      description: `${bulkPercentage.percentage}% ${bulkPercentage.adjustmentType} applied to ${selectedItems.length} item(s).`,
    });
    
    setShowBulkPercentage(false);
    setBulkPercentage({
      percentage: 0,
      adjustmentType: "increase",
      applyToCost: false,
      applyToPriceA: true,
      applyToPriceB: true,
      applyToPriceM: true,
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <DollarSign className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pricing & Costing</h1>
          <p className="text-sm text-muted-foreground">Manage costs, pricing, margins, and profitability analysis</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="dashboard" className="gap-2 data-[state=active]:text-primary">
            <BarChart3 className="w-4 h-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="price-updating" className="gap-2 data-[state=active]:text-primary">
            <RefreshCw className="w-4 h-4" />
            Price Updating
          </TabsTrigger>
          <TabsTrigger value="profitability" className="gap-2 data-[state=active]:text-primary">
            <TrendingUp className="w-4 h-4" />
            Profitability
          </TabsTrigger>
          <TabsTrigger value="price-history" className="gap-2 data-[state=active]:text-primary">
            <History className="w-4 h-4" />
            Price History
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-primary text-primary-foreground">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-90">Total Stock Value</p>
                    <p className="text-2xl font-bold">{formatCurrency(totalStockValue)}</p>
                    <p className="text-xs opacity-75">{items.length} items in inventory</p>
                  </div>
                  <Package className="w-10 h-10 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-success text-success-foreground">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-90">Potential Profit</p>
                    <p className="text-2xl font-bold">{formatCurrency(potentialProfit)}</p>
                    <p className="text-xs opacity-75">{profitMargin.toFixed(1)}% profit margin</p>
                  </div>
                  <TrendingUp className="w-10 h-10 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-warning text-warning-foreground">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-90">Average Margin</p>
                    <p className="text-2xl font-bold">{avgMargin.toFixed(1)}%</p>
                    <p className="text-xs opacity-75">{itemsWithPrice.length} items priced</p>
                  </div>
                  <BarChart3 className="w-10 h-10 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-destructive/90 text-destructive-foreground">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-90">Margin Alerts</p>
                    <p className="text-2xl font-bold">{lowMarginItems.length}</p>
                    <p className="text-xs opacity-75">items below 10% margin</p>
                  </div>
                  <AlertTriangle className="w-10 h-10 opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Margin Distribution */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Percent className="w-4 h-4 text-primary" />
                  Margin Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Low (&lt;10%)</span>
                    <div className="flex items-center gap-2 flex-1 mx-4">
                      <Progress value={(lowMarginItems.length / items.length) * 100} className="h-2 flex-1 [&>div]:bg-destructive" />
                    </div>
                    <span className="text-sm font-medium text-destructive">{lowMarginItems.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Normal (10-50%)</span>
                    <div className="flex items-center gap-2 flex-1 mx-4">
                      <Progress value={(normalMarginItems.length / items.length) * 100} className="h-2 flex-1 [&>div]:bg-success" />
                    </div>
                    <span className="text-sm font-medium text-success">{normalMarginItems.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">High (&gt;50%)</span>
                    <div className="flex items-center gap-2 flex-1 mx-4">
                      <Progress value={(highMarginItems.length / items.length) * 100} className="h-2 flex-1 [&>div]:bg-info" />
                    </div>
                    <span className="text-sm font-medium text-info">{highMarginItems.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">No Price Set</span>
                    <div className="flex items-center gap-2 flex-1 mx-4">
                      <Progress value={(nopriceItems.length / items.length) * 100} className="h-2 flex-1 [&>div]:bg-muted-foreground" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">{nopriceItems.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cost vs Revenue Analysis */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-primary" />
                  Cost vs Revenue Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center h-32">
                  <div className="grid grid-cols-3 gap-8 text-center">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Cost</p>
                      <p className="text-xl font-bold text-destructive">{formatCurrency(totalCost)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Revenue</p>
                      <p className="text-xl font-bold text-info">{formatCurrency(totalStockValue)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Profit</p>
                      <p className="text-xl font-bold text-success">{formatCurrency(potentialProfit)}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Low Margin Alerts */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2 text-destructive">
                  <AlertTriangle className="w-4 h-4" />
                  Low Margin Alerts
                </CardTitle>
                <Badge variant="destructive">{lowMarginItems.length} items need attention</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PART NO</TableHead>
                    <TableHead>DESCRIPTION</TableHead>
                    <TableHead className="text-right">COST</TableHead>
                    <TableHead className="text-right">PRICE</TableHead>
                    <TableHead className="text-right">MARGIN</TableHead>
                    <TableHead className="text-center">STATUS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowMarginItems.map(item => {
                    const margin = ((item.priceA - item.cost) / item.cost * 100);
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.partNo}</TableCell>
                        <TableCell>{item.description}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.cost)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.priceA)}</TableCell>
                        <TableCell className="text-right text-destructive font-medium">{margin.toFixed(1)}%</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="destructive" className="text-xs">Critical</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {lowMarginItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No low margin items found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

        </TabsContent>


        {/* Price Updating Tab */}
        <TabsContent value="price-updating" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success/10 rounded-lg">
                <RefreshCw className="w-5 h-5 text-success" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Price Updating</h2>
                <p className="text-sm text-muted-foreground">Update prices individually or by group (Category/Brand)</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={() => setShowBulkPercentage(true)}
                className="gap-2"
                disabled={selectedCount === 0}
              >
                <Percent className="w-4 h-4" />
                Bulk % Adjust
              </Button>
              <Button 
                variant={priceUpdateMode === "individual" ? "default" : "outline"}
                onClick={() => setPriceUpdateMode("individual")}
              >
                Individual
              </Button>
              <Button 
                variant={priceUpdateMode === "group" ? "default" : "outline"}
                onClick={() => setPriceUpdateMode("group")}
              >
                Group Level
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold">{items.length}</p>
              </CardContent>
            </Card>
            <Card className="border-success/50">
              <CardContent className="p-4">
                <p className="text-sm text-success">Selected</p>
                <p className="text-2xl font-bold text-success">{selectedCount}</p>
              </CardContent>
            </Card>
            <Card className="border-warning/50">
              <CardContent className="p-4">
                <p className="text-sm text-warning">Modified</p>
                <p className="text-2xl font-bold text-warning">{modifiedCount}</p>
              </CardContent>
            </Card>
            <Card className="border-info/50">
              <CardContent className="p-4">
                <p className="text-sm text-info">Categories</p>
                <p className="text-2xl font-bold text-info">{categories.length - 1}</p>
              </CardContent>
            </Card>
          </div>

          {/* Individual Price Editor */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <CardTitle className="text-base">Individual Price Editor</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      placeholder="Search" 
                      className="pl-9 w-40"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat} value={cat}>
                          {cat === "all" ? "All Categories" : cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterBrand} onValueChange={setFilterBrand}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="All Brands" />
                    </SelectTrigger>
                    <SelectContent>
                      {brands.map(brand => (
                        <SelectItem key={brand} value={brand}>
                          {brand === "all" ? "All Brands" : brand}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox 
                          checked={paginatedItems.length > 0 && paginatedItems.every(item => item.selected)}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>PART NO</TableHead>
                      <TableHead>DESCRIPTION</TableHead>
                      <TableHead>CATEGORY</TableHead>
                      <TableHead className="text-right">COST</TableHead>
                      <TableHead className="text-center bg-primary/5">NEW COST</TableHead>
                      <TableHead className="text-right">PRICE A</TableHead>
                      <TableHead className="text-center bg-primary/5">NEW A</TableHead>
                      <TableHead className="text-right">PRICE B</TableHead>
                      <TableHead className="text-center bg-primary/5">NEW B</TableHead>
                      <TableHead className="text-right">PRICE M</TableHead>
                      <TableHead className="text-center bg-primary/5">NEW M</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedItems.map(item => (
                      <TableRow key={item.id} className={item.modified ? "bg-warning/5" : ""}>
                        <TableCell>
                          <Checkbox 
                            checked={item.selected}
                            onCheckedChange={() => handleSelectItem(item.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{item.partNo}</TableCell>
                        <TableCell className="max-w-32 truncate">{item.description}</TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(item.cost)}</TableCell>
                        <TableCell className="bg-primary/5">
                          <Input 
                            type="number"
                            step="0.01"
                            value={item.newCost}
                            onChange={(e) => handlePriceChange(item.id, "newCost", parseFloat(e.target.value) || 0)}
                            className="w-24 h-8 text-center"
                          />
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(item.priceA)}</TableCell>
                        <TableCell className="bg-primary/5">
                          <Input 
                            type="number"
                            step="0.01"
                            value={item.newPriceA}
                            onChange={(e) => handlePriceChange(item.id, "newPriceA", parseFloat(e.target.value) || 0)}
                            className="w-24 h-8 text-center"
                          />
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(item.priceB)}</TableCell>
                        <TableCell className="bg-primary/5">
                          <Input 
                            type="number"
                            step="0.01"
                            value={item.newPriceB}
                            onChange={(e) => handlePriceChange(item.id, "newPriceB", parseFloat(e.target.value) || 0)}
                            className="w-24 h-8 text-center"
                          />
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(item.priceM)}</TableCell>
                        <TableCell className="bg-primary/5">
                          <Input 
                            type="number"
                            step="0.01"
                            value={item.newPriceM}
                            onChange={(e) => handlePriceChange(item.id, "newPriceM", parseFloat(e.target.value) || 0)}
                            className="w-24 h-8 text-center"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination and Actions */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 border-t">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredItems.length)} of {filteredItems.length}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Prev
                  </Button>
                  <span className="px-2 text-primary font-medium">{currentPage} / {totalPages}</span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Input 
                    placeholder="Reason for update..."
                    value={updateReason}
                    onChange={(e) => setUpdateReason(e.target.value)}
                    className="w-48"
                  />
                  <Button variant="outline" onClick={handleReset}>Reset</Button>
                  <Button onClick={handleApplyChanges} disabled={modifiedCount === 0}>
                    Apply {modifiedCount} Changes
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>


        {/* Profitability Tab */}
        <TabsContent value="profitability" className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-success/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-success" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Profitability Analysis</h2>
              <p className="text-sm text-muted-foreground">Analyze profit margins and revenue performance</p>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Gross Profit</p>
                <p className="text-2xl font-bold text-success">{formatCurrency(potentialProfit)}</p>
                <p className="text-xs text-muted-foreground mt-1">{profitMargin.toFixed(1)}% margin</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Average Item Profit</p>
                <p className="text-2xl font-bold">{formatCurrency(potentialProfit / items.length)}</p>
                <p className="text-xs text-muted-foreground mt-1">per item</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Best Margin Category</p>
                <p className="text-2xl font-bold text-primary">Electrical</p>
                <p className="text-xs text-muted-foreground mt-1">35.7% avg margin</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Lowest Margin Category</p>
                <p className="text-2xl font-bold text-destructive">Misc</p>
                <p className="text-xs text-muted-foreground mt-1">-45.0% avg margin</p>
              </CardContent>
            </Card>
          </div>

          {/* Top Profitable Items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top Profitable Items</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Part No</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                    <TableHead className="text-right">Profit/Unit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items
                    .filter(item => item.cost > 0 && item.priceA > 0)
                    .sort((a, b) => {
                      const marginA = ((a.priceA - a.cost) / a.cost) * 100;
                      const marginB = ((b.priceA - b.cost) / b.cost) * 100;
                      return marginB - marginA;
                    })
                    .slice(0, 5)
                    .map(item => {
                      const margin = ((item.priceA - item.cost) / item.cost) * 100;
                      const profit = item.priceA - item.cost;
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.partNo}</TableCell>
                          <TableCell>{item.description}</TableCell>
                          <TableCell>{item.category}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.cost)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.priceA)}</TableCell>
                          <TableCell className="text-right">
                            <Badge className="bg-success text-success-foreground">{margin.toFixed(1)}%</Badge>
                          </TableCell>
                          <TableCell className="text-right text-success font-medium">{formatCurrency(profit)}</TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Category Profitability */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Category Profitability</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Array.from(new Set(items.map(item => item.category))).slice(0, 6).map(category => {
                  const categoryItems = items.filter(item => item.category === category && item.cost > 0 && item.priceA > 0);
                  const avgMargin = categoryItems.length > 0
                    ? categoryItems.reduce((sum, item) => sum + ((item.priceA - item.cost) / item.cost * 100), 0) / categoryItems.length
                    : 0;
                  const totalProfit = categoryItems.reduce((sum, item) => sum + ((item.priceA - item.cost) * item.quantity), 0);

                  return (
                    <div key={category} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{category}</p>
                        <p className="text-sm text-muted-foreground">{categoryItems.length} items</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Avg Margin</p>
                          <p className={`font-medium ${avgMargin >= 0 ? 'text-success' : 'text-destructive'}`}>
                            {avgMargin.toFixed(1)}%
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Total Profit</p>
                          <p className={`font-medium ${totalProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                            {formatCurrency(totalProfit)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Price History Tab */}
        <TabsContent value="price-history" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-info/10 rounded-lg">
                <History className="w-5 h-5 text-info" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Price History</h2>
                <p className="text-sm text-muted-foreground">Track all price changes with date, user, and reason</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => {
              const headers = ["Date", "Time", "Part No", "Description", "Updated By", "Reason", "Type", "Changes"];
              const csvContent = [
                headers.join(","),
                ...priceHistory.map(entry => [
                  entry.date,
                  entry.time,
                  entry.partNo,
                  `"${entry.description}"`,
                  entry.updatedBy,
                  `"${entry.reason}"`,
                  entry.updateType,
                  `"${entry.changes.map(c => `${c.field}: ${c.oldValue} → ${c.newValue}`).join('; ')}"`
                ].join(","))
              ].join("\n");
              const blob = new Blob([csvContent], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "price_history.csv";
              a.click();
              URL.revokeObjectURL(url);
              toast({
                title: "Export Complete",
                description: "Price history exported successfully.",
              });
            }} className="gap-2">
              <Download className="w-4 h-4" />
              Export History
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Total Changes</span>
                </div>
                <p className="text-2xl font-bold mt-1">{priceHistory.length}</p>
              </CardContent>
            </Card>
            <Card className="border-primary/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  <span className="text-sm text-primary">Individual Updates</span>
                </div>
                <p className="text-2xl font-bold mt-1 text-primary">
                  {priceHistory.filter(h => h.updateType === "individual").length}
                </p>
              </CardContent>
            </Card>
            <Card className="border-success/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Percent className="w-4 h-4 text-success" />
                  <span className="text-sm text-success">Bulk Updates</span>
                </div>
                <p className="text-2xl font-bold mt-1 text-success">
                  {priceHistory.filter(h => h.updateType === "bulk").length}
                </p>
              </CardContent>
            </Card>
            <Card className="border-warning/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-warning" />
                  <span className="text-sm text-warning">Margin Updates</span>
                </div>
                <p className="text-2xl font-bold mt-1 text-warning">
                  {priceHistory.filter(h => h.updateType === "margin").length}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <CardTitle className="text-base">Price Change History</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      placeholder="Search by part no or user" 
                      className="pl-9 w-48"
                      value={historySearchTerm}
                      onChange={(e) => setHistorySearchTerm(e.target.value)}
                    />
                  </div>
                  <Select value={historyFilterType} onValueChange={(v: typeof historyFilterType) => setHistoryFilterType(v)}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="bulk">Bulk</SelectItem>
                      <SelectItem value="margin">Margin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Part No</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Updated By</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-center">Type</TableHead>
                    <TableHead>Changes</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                  <TableBody>
                    {historyLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          Loading history...
                        </TableCell>
                      </TableRow>
                    ) : (() => {
                      const filtered = priceHistory.filter(entry => {
                        const matchesSearch = 
                          entry.partNo.toLowerCase().includes(historySearchTerm.toLowerCase()) ||
                          entry.updatedBy.toLowerCase().includes(historySearchTerm.toLowerCase()) ||
                          entry.reason.toLowerCase().includes(historySearchTerm.toLowerCase());
                        const matchesType = historyFilterType === "all" || entry.updateType === historyFilterType;
                        return matchesSearch && matchesType;
                      });
                      const totalHistoryPages = Math.ceil(filtered.length / historyPerPage);
                      const startIdx = (historyPage - 1) * historyPerPage;
                      const paginated = filtered.slice(startIdx, startIdx + historyPerPage);

                      return paginated.length > 0 ? paginated.map(entry => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{entry.date}</span>
                            <span className="text-xs text-muted-foreground">{entry.time}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{entry.partNo}</TableCell>
                        <TableCell className="max-w-32 truncate">{entry.description}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="w-3 h-3 text-primary" />
                            </div>
                            {entry.updatedBy}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-40 truncate">{entry.reason}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={
                            entry.updateType === "individual" ? "default" :
                            entry.updateType === "bulk" ? "secondary" : "outline"
                          }>
                            {entry.updateType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {entry.changes.slice(0, 2).map((change, idx) => (
                              <span key={idx} className="text-xs">
                                <span className="text-muted-foreground">{change.field}:</span>{" "}
                                <span className="text-destructive line-through">{formatCurrency(change.oldValue)}</span>{" "}
                                → <span className="text-success">{formatCurrency(change.newValue)}</span>
                              </span>
                            ))}
                            {entry.changes.length > 2 && (
                              <span className="text-xs text-muted-foreground">+{entry.changes.length - 2} more</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              // Find item by partNo since itemId might not match
                              const item = items.find(i => i.partNo === entry.partNo) || items.find(i => i.id === entry.itemId);
                              if (item) {
                                setSelectedItemForHistory(item);
                                setShowItemHistory(true);
                              } else {
                                // Create a temporary item from history entry
                                const tempItem: PriceItem = {
                                  id: entry.itemId || entry.id,
                                  partNo: entry.partNo,
                                  description: entry.description,
                                  category: "",
                                  brand: "",
                                  cost: 0,
                                  newCost: 0,
                                  priceA: 0,
                                  newPriceA: 0,
                                  priceB: 0,
                                  newPriceB: 0,
                                  priceM: 0,
                                  newPriceM: 0,
                                  quantity: 0,
                                  selected: false,
                                  modified: false,
                                };
                                setSelectedItemForHistory(tempItem);
                                setShowItemHistory(true);
                              }
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No price history found
                        </TableCell>
                      </TableRow>
                    );
                  })()}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Pagination */}
          {priceHistory.length > historyPerPage && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {((historyPage - 1) * historyPerPage) + 1} to {Math.min(historyPage * historyPerPage, priceHistory.length)} of {priceHistory.length} entries
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={historyPage === 1}
                  onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={historyPage >= Math.ceil(priceHistory.length / historyPerPage)}
                  onClick={() => setHistoryPage(p => p + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* New Landed Cost Dialog */}
      <Dialog open={showNewLandedCost} onOpenChange={setShowNewLandedCost}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Landed Cost Calculation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>PO Number</Label>
                <Input 
                  value={newLandedCost.poNumber}
                  onChange={(e) => setNewLandedCost(prev => ({ ...prev, poNumber: e.target.value }))}
                  placeholder="PO-2024-XXX"
                />
              </div>
              <div className="space-y-2">
                <Label>Supplier</Label>
                <Input 
                  value={newLandedCost.supplier}
                  onChange={(e) => setNewLandedCost(prev => ({ ...prev, supplier: e.target.value }))}
                  placeholder="Supplier name"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Invoice Value</Label>
              <Input 
                type="number"
                value={newLandedCost.invoiceValue}
                onChange={(e) => setNewLandedCost(prev => ({ ...prev, invoiceValue: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Freight</Label>
                <Input 
                  type="number"
                  value={newLandedCost.freight}
                  onChange={(e) => setNewLandedCost(prev => ({ ...prev, freight: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Customs</Label>
                <Input 
                  type="number"
                  value={newLandedCost.customs}
                  onChange={(e) => setNewLandedCost(prev => ({ ...prev, customs: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Insurance</Label>
                <Input 
                  type="number"
                  value={newLandedCost.insurance}
                  onChange={(e) => setNewLandedCost(prev => ({ ...prev, insurance: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Handling</Label>
                <Input 
                  type="number"
                  value={newLandedCost.handling}
                  onChange={(e) => setNewLandedCost(prev => ({ ...prev, handling: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex justify-between">
                <span className="font-medium">Total Landed Cost:</span>
                <span className="font-bold text-primary">
                  {formatCurrency(
                    newLandedCost.invoiceValue + newLandedCost.freight + 
                    newLandedCost.customs + newLandedCost.insurance + newLandedCost.handling
                  )}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewLandedCost(false)}>Cancel</Button>
            <Button onClick={handleSaveLandedCost}>Calculate & Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set Margins Dialog */}
      <Dialog open={showSetMargins} onOpenChange={setShowSetMargins}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Set Margin Targets</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Target Margin (%)</Label>
              <Input 
                type="number"
                value={marginSettings.targetMargin}
                onChange={(e) => setMarginSettings(prev => ({ ...prev, targetMargin: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Apply To</Label>
              <Select 
                value={marginSettings.applyTo} 
                onValueChange={(value) => setMarginSettings(prev => ({ ...prev, applyTo: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Items</SelectItem>
                  {categories.filter(c => c !== "all").map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSetMargins(false)}>Cancel</Button>
            <Button onClick={handleApplyMargins}>Apply Margins</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Percentage Adjustment Dialog */}
      <Dialog open={showBulkPercentage} onOpenChange={setShowBulkPercentage}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Percent className="w-5 h-5 text-primary" />
              Bulk Percentage Adjustment
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{selectedCount}</span> item(s) selected for adjustment
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Percentage (%)</Label>
                <Input 
                  type="number"
                  min="0"
                  max="100"
                  value={bulkPercentage.percentage}
                  onChange={(e) => setBulkPercentage(prev => ({ ...prev, percentage: parseFloat(e.target.value) || 0 }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Adjustment Type</Label>
                <Select 
                  value={bulkPercentage.adjustmentType} 
                  onValueChange={(value: "increase" | "decrease") => setBulkPercentage(prev => ({ ...prev, adjustmentType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="increase">Increase ↑</SelectItem>
                    <SelectItem value="decrease">Decrease ↓</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Apply To</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="applyToCost"
                    checked={bulkPercentage.applyToCost}
                    onCheckedChange={(checked) => setBulkPercentage(prev => ({ ...prev, applyToCost: !!checked }))}
                  />
                  <Label htmlFor="applyToCost" className="text-sm font-normal cursor-pointer">Cost</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="applyToPriceA"
                    checked={bulkPercentage.applyToPriceA}
                    onCheckedChange={(checked) => setBulkPercentage(prev => ({ ...prev, applyToPriceA: !!checked }))}
                  />
                  <Label htmlFor="applyToPriceA" className="text-sm font-normal cursor-pointer">Price A</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="applyToPriceB"
                    checked={bulkPercentage.applyToPriceB}
                    onCheckedChange={(checked) => setBulkPercentage(prev => ({ ...prev, applyToPriceB: !!checked }))}
                  />
                  <Label htmlFor="applyToPriceB" className="text-sm font-normal cursor-pointer">Price B</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="applyToPriceM"
                    checked={bulkPercentage.applyToPriceM}
                    onCheckedChange={(checked) => setBulkPercentage(prev => ({ ...prev, applyToPriceM: !!checked }))}
                  />
                  <Label htmlFor="applyToPriceM" className="text-sm font-normal cursor-pointer">Price M</Label>
                </div>
              </div>
            </div>

            {bulkPercentage.percentage > 0 && (
              <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                <p className="text-sm">
                  <span className="font-medium">Preview:</span> Selected prices will be{" "}
                  <span className={bulkPercentage.adjustmentType === "increase" ? "text-success" : "text-destructive"}>
                    {bulkPercentage.adjustmentType === "increase" ? "increased" : "decreased"} by {bulkPercentage.percentage}%
                  </span>
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkPercentage(false)}>Cancel</Button>
            <Button onClick={handleApplyBulkPercentage} disabled={selectedCount === 0}>
              Apply Adjustment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Item Price History Dialog */}
      <Dialog open={showItemHistory} onOpenChange={setShowItemHistory}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-info" />
              Price History - {selectedItemForHistory?.partNo}
            </DialogTitle>
          </DialogHeader>
          {selectedItemForHistory && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Part Number</p>
                    <p className="font-medium">{selectedItemForHistory.partNo}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Description</p>
                    <p className="font-medium">{selectedItemForHistory.description}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Current Cost</p>
                    <p className="font-medium">{formatCurrency(selectedItemForHistory.cost)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Current Price A</p>
                    <p className="font-medium">{formatCurrency(selectedItemForHistory.priceA)}</p>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Updated By</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Changes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {priceHistory
                      .filter(h => h.itemId === selectedItemForHistory.id || h.partNo === selectedItemForHistory.partNo)
                      .map(entry => (
                        <TableRow key={entry.id}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{entry.date}</span>
                              <span className="text-xs text-muted-foreground">{entry.time}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="w-3 h-3 text-primary" />
                              </div>
                              {entry.updatedBy}
                            </div>
                          </TableCell>
                          <TableCell>{entry.reason}</TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              {entry.changes.map((change, idx) => (
                                <span key={idx} className="text-xs">
                                  <span className="text-muted-foreground">{change.field}:</span>{" "}
                                  <span className="text-destructive line-through">{formatCurrency(change.oldValue)}</span>{" "}
                                  → <span className="text-success">{formatCurrency(change.newValue)}</span>
                                </span>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    {priceHistory.filter(h => h.itemId === selectedItemForHistory.id).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          No price history for this item
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowItemHistory(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
