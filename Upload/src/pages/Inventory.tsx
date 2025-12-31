import { useState } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ArrowRightLeft,
  Truck,
  BarChart3,
  Settings2,
  Layers,
  Activity,
  ClipboardCheck,
  DollarSign,
  ShoppingCart,
  FileText,
  Archive,
  Store,
} from "lucide-react";

// Inventory sub-modules
import { StockInOut } from "@/components/inventory/StockInOut";
import { StockTransfer } from "@/components/inventory/StockTransfer";
import { StockBalance } from "@/components/inventory/StockBalance";
import { AdjustItem } from "@/components/inventory/AdjustItem";
import { InventoryDashboard } from "@/components/inventory/InventoryDashboard";
import { MultiDimensionalReport } from "@/components/inventory/MultiDimensionalReport";
import { StockAnalysis } from "@/components/inventory/StockAnalysis";
import { StockVerification } from "@/components/inventory/StockVerification";
import { StockPriceManagement } from "@/components/inventory/StockPriceManagement";
import { PurchaseOrder } from "@/components/inventory/PurchaseOrder";
import { DirectPurchaseOrder } from "@/components/inventory/DirectPurchaseOrder";
import { RackAndShelf } from "@/components/inventory/RackAndShelf";
import { StoreManagementTab } from "@/components/settings/StoreManagementTab";

type InventoryTab =
  | "dashboard"
  | "stock-in-out"
  | "stock-transfer"
  | "adjust-item"
  | "stock-balance"
  | "multi-dimensional"
  | "stock-analysis"
  | "stock-verification"
  | "price-management"
  | "purchase-order"
  | "direct-purchase-order"
  | "rack-shelf"
  | "store-management";

interface TabConfig {
  id: InventoryTab;
  label: string;
  icon: React.ElementType;
  description: string;
}

const tabs: TabConfig[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, description: "Overview & analytics" },
  { id: "store-management", label: "Store Management", icon: Store, description: "Manage stores & locations" },
  { id: "stock-in-out", label: "Stock In/Out", icon: ArrowRightLeft, description: "Record stock movements" },
  { id: "stock-transfer", label: "Stock Transfer", icon: Truck, description: "Transfer between locations" },
  { id: "adjust-item", label: "Adjust Item", icon: Settings2, description: "Stock quantity adjustments" },
  { id: "stock-balance", label: "Balance & Valuation", icon: BarChart3, description: "Balance & valuation" },
  { id: "multi-dimensional", label: "Multi-Dimensional", icon: Layers, description: "Multi-dimensional analysis" },
  { id: "stock-analysis", label: "Stock Analysis", icon: Activity, description: "Fast, slow & dead stock" },
  { id: "stock-verification", label: "Verification", icon: ClipboardCheck, description: "Physical stock verification" },
  { id: "price-management", label: "Price Control", icon: DollarSign, description: "Manage stock prices" },
  { id: "purchase-order", label: "Purchase Order", icon: ShoppingCart, description: "Manage purchase orders" },
  { id: "direct-purchase-order", label: "Direct Purchase", icon: FileText, description: "Direct purchase orders" },
  { id: "rack-shelf", label: "Racks & Shelves", icon: Archive, description: "Manage racks and shelves" },
];

const Inventory = () => {
  const [activeTab, setActiveTab] = useState<InventoryTab>("dashboard");

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <InventoryDashboard />;
      case "store-management":
        return <StoreManagementTab />;
      case "stock-in-out":
        return <StockInOut />;
      case "stock-transfer":
        return <StockTransfer />;
      case "adjust-item":
        return <AdjustItem />;
      case "stock-balance":
        return <StockBalance />;
      case "multi-dimensional":
        return <MultiDimensionalReport />;
      case "stock-analysis":
        return <StockAnalysis />;
      case "stock-verification":
        return <StockVerification />;
      case "price-management":
        return <StockPriceManagement />;
      case "purchase-order":
        return <PurchaseOrder />;
      case "direct-purchase-order":
        return <DirectPurchaseOrder />;
      case "rack-shelf":
        return <RackAndShelf />;
      default:
        return <InventoryDashboard />;
    }
  };

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden ml-16">
        <Header />

        {/* Horizontal Scrollable Tab Navigation */}
        <div className="bg-card border-b border-border">
          <div className="px-4 py-2 overflow-x-auto scrollbar-hide">
            <div className="flex items-center gap-2 min-w-max">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 text-xs font-medium whitespace-nowrap group",
                      activeTab === tab.id
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <main className="flex-1 p-4 overflow-auto">
          <div className="animate-fade-in">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Inventory;
