import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Download, Printer, Building2, Wallet, Landmark, CheckCircle2 } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight } from "lucide-react";

interface BalanceCategory {
  name: string;
  items: { name: string; amount: number }[];
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export const BalanceSheetTab = () => {
  const [assetsData, setAssetsData] = useState<BalanceCategory[]>([]);
  const [liabilitiesData, setLiabilitiesData] = useState<BalanceCategory[]>([]);
  const [equityData, setEquityData] = useState<BalanceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("december-2024");
  const [expandedAssets, setExpandedAssets] = useState<string[]>([]);
  const [expandedLiabilities, setExpandedLiabilities] = useState<string[]>([]);
  const [expandedEquity, setExpandedEquity] = useState<string[]>([]);

  useEffect(() => {
    fetchBalanceSheet();
  }, [period]);

  const fetchBalanceSheet = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append("period", period);
      
      const response = await fetch(`${API_URL}/api/accounting/balance-sheet?${params}`);
      if (response.ok) {
        const data = await response.json();
        setAssetsData(data.assets || []);
        setLiabilitiesData(data.liabilities || []);
        setEquityData(data.equity || []);
        // Auto-expand first items
        if (data.assets && data.assets.length > 0) {
          setExpandedAssets([data.assets[0].name]);
        }
        if (data.liabilities && data.liabilities.length > 0) {
          setExpandedLiabilities([data.liabilities[0].name]);
        }
        if (data.equity && data.equity.length > 0) {
          setExpandedEquity([data.equity[0].name]);
        }
      }
    } catch (error) {
      console.error("Error fetching balance sheet:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const printHTML = `
      <html>
        <head>
          <title>Balance Sheet</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { text-align: center; color: #333; }
            .section { margin-top: 20px; }
            .item { padding: 4px 0; }
            .total { font-weight: bold; padding: 8px 0; border-top: 2px solid #333; }
            @media print { button { display: none; } }
          </style>
        </head>
        <body>
          <h1>Balance Sheet - ${period}</h1>
          <div class="section">
            <h2>Assets</h2>
            ${assetsData.map(cat => `
              <div class="item">
                <strong>${cat.name}</strong>: Rs ${cat.items.reduce((s, item) => s + item.amount, 0).toLocaleString()}
              </div>
            `).join('')}
            <div class="total">Total Assets: Rs ${totalAssets.toLocaleString()}</div>
          </div>
          <div class="section">
            <h2>Liabilities</h2>
            ${liabilitiesData.map(cat => `
              <div class="item">
                <strong>${cat.name}</strong>: Rs ${cat.items.reduce((s, item) => s + item.amount, 0).toLocaleString()}
              </div>
            `).join('')}
            <div class="total">Total Liabilities: Rs ${totalLiabilities.toLocaleString()}</div>
          </div>
          <div class="section">
            <h2>Equity</h2>
            ${equityData.map(cat => `
              <div class="item">
                <strong>${cat.name}</strong>: Rs ${cat.items.reduce((s, item) => s + item.amount, 0).toLocaleString()}
              </div>
            `).join('')}
            <div class="total">Total Equity: Rs ${totalEquity.toLocaleString()}</div>
          </div>
          <div class="section">
            <div class="total">Total Liabilities & Equity: Rs ${liabilitiesAndEquity.toLocaleString()}</div>
            <div class="total">Balance: ${isBalanced ? 'Balanced' : 'Unbalanced'}</div>
          </div>
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
  };

  const handleExport = () => {
    const rows = [];
    rows.push(["Section", "Category", "Item", "Amount"]);
    assetsData.forEach(cat => {
      rows.push(["ASSETS", cat.name, "", ""]);
      cat.items.forEach(item => {
        rows.push(["", "", item.name, item.amount]);
      });
    });
    rows.push(["ASSETS", "Total Assets", "", totalAssets]);
    liabilitiesData.forEach(cat => {
      rows.push(["LIABILITIES", cat.name, "", ""]);
      cat.items.forEach(item => {
        rows.push(["", "", item.name, item.amount]);
      });
    });
    rows.push(["LIABILITIES", "Total Liabilities", "", totalLiabilities]);
    equityData.forEach(cat => {
      rows.push(["EQUITY", cat.name, "", ""]);
      cat.items.forEach(item => {
        rows.push(["", "", item.name, item.amount]);
      });
    });
    rows.push(["EQUITY", "Total Equity", "", totalEquity]);
    rows.push(["", "Total Liabilities & Equity", "", liabilitiesAndEquity]);
    
    const csvContent = rows.map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `balance_sheet_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const toggleSection = (section: string, type: "assets" | "liabilities" | "equity") => {
    if (type === "assets") {
      setExpandedAssets(prev => prev.includes(section) ? prev.filter(n => n !== section) : [...prev, section]);
    } else if (type === "liabilities") {
      setExpandedLiabilities(prev => prev.includes(section) ? prev.filter(n => n !== section) : [...prev, section]);
    } else {
      setExpandedEquity(prev => prev.includes(section) ? prev.filter(n => n !== section) : [...prev, section]);
    }
  };

  const totalAssets = assetsData.reduce((sum, cat) => 
    sum + cat.items.reduce((s, item) => s + item.amount, 0), 0
  );

  const totalLiabilities = liabilitiesData.reduce((sum, cat) => 
    sum + cat.items.reduce((s, item) => s + item.amount, 0), 0
  );

  const totalEquity = equityData.reduce((sum, cat) => 
    sum + cat.items.reduce((s, item) => s + item.amount, 0), 0
  );

  const liabilitiesAndEquity = totalLiabilities + totalEquity;
  const isBalanced = totalAssets === liabilitiesAndEquity;

  const currentAssets = assetsData[0]?.items?.reduce((s, item) => s + item.amount, 0) || 0;
  const currentLiabilities = liabilitiesData[0]?.items?.reduce((s, item) => s + item.amount, 0) || 0;
  const currentRatio = currentLiabilities > 0 ? (currentAssets / currentLiabilities).toFixed(2) : "0.00";

  const renderCategory = (
    categories: BalanceCategory[], 
    expanded: string[], 
    type: "assets" | "liabilities" | "equity",
    colorClass: string
  ) => (
    <div className="space-y-3">
      {categories.map((category) => (
        <Collapsible 
          key={category.name} 
          open={expanded.includes(category.name)}
          onOpenChange={() => toggleSection(category.name, type)}
        >
          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-all duration-200">
            <div className="flex items-center gap-2">
              {expanded.includes(category.name) ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="font-medium">{category.name}</span>
            </div>
            <span className={`font-semibold ${colorClass}`}>
              Rs {category.items.reduce((s, item) => s + item.amount, 0).toLocaleString()}
            </span>
          </CollapsibleTrigger>
          <CollapsibleContent className="animate-accordion-down">
            <div className="pl-8 pr-4 py-2 space-y-2">
              {category.items.map((item) => (
                <div key={item.name} className="flex justify-between text-sm py-1 border-b border-border/30">
                  <span className={`${item.amount < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>{item.name}</span>
                  <span className={`font-mono ${item.amount < 0 ? 'text-red-500' : ''}`}>
                    {item.amount < 0 ? `(Rs ${Math.abs(item.amount).toLocaleString()})` : `Rs ${item.amount.toLocaleString()}`}
                  </span>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20 transition-all duration-300 hover:shadow-lg hover:scale-[1.02]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Assets</p>
                <p className="text-2xl font-bold text-blue-600">Rs {totalAssets.toLocaleString()}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20 transition-all duration-300 hover:shadow-lg hover:scale-[1.02]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Liabilities</p>
                <p className="text-2xl font-bold text-red-600">Rs {totalLiabilities.toLocaleString()}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <Wallet className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20 transition-all duration-300 hover:shadow-lg hover:scale-[1.02]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Equity</p>
                <p className="text-2xl font-bold text-green-600">Rs {totalEquity.toLocaleString()}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <Landmark className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-br ${isBalanced ? 'from-emerald-500/10 to-emerald-600/5 border-emerald-500/20' : 'from-orange-500/10 to-orange-600/5 border-orange-500/20'} transition-all duration-300 hover:shadow-lg hover:scale-[1.02]`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Ratio</p>
                <p className={`text-2xl font-bold ${parseFloat(currentRatio) >= 1 ? 'text-emerald-600' : 'text-orange-600'}`}>
                  {currentRatio}x
                </p>
              </div>
              <div className={`h-12 w-12 rounded-full ${parseFloat(currentRatio) >= 1 ? 'bg-emerald-500/20' : 'bg-orange-500/20'} flex items-center justify-center`}>
                <CheckCircle2 className={`h-6 w-6 ${parseFloat(currentRatio) >= 1 ? 'text-emerald-600' : 'text-orange-600'}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Balance Sheet */}
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Balance Sheet
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Statement of Financial Position</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-[180px]">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Select Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="december-2024">December 31, 2024</SelectItem>
                  <SelectItem value="september-2024">September 30, 2024</SelectItem>
                  <SelectItem value="june-2024">June 30, 2024</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="transition-all duration-200 hover:scale-105" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button variant="outline" size="sm" className="transition-all duration-200 hover:scale-105" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Assets Column */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-blue-600 border-b border-blue-500/20 pb-2 flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Assets
              </h3>
              {renderCategory(assetsData, expandedAssets, "assets", "text-blue-600")}
              <div className="flex justify-between p-4 bg-blue-500/10 rounded-lg font-bold text-lg border border-blue-500/20">
                <span>Total Assets</span>
                <span className="text-blue-600">Rs {totalAssets.toLocaleString()}</span>
              </div>
            </div>

            {/* Liabilities & Equity Column */}
            <div className="space-y-4">
              {/* Liabilities Section */}
              <h3 className="font-semibold text-lg text-red-600 border-b border-red-500/20 pb-2 flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Liabilities
              </h3>
              {renderCategory(liabilitiesData, expandedLiabilities, "liabilities", "text-red-600")}
              <div className="flex justify-between p-3 bg-red-500/10 rounded-lg font-semibold border border-red-500/20">
                <span>Total Liabilities</span>
                <span className="text-red-600">Rs {totalLiabilities.toLocaleString()}</span>
              </div>

              {/* Equity Section */}
              <h3 className="font-semibold text-lg text-green-600 border-b border-green-500/20 pb-2 mt-6 flex items-center gap-2">
                <Landmark className="h-5 w-5" />
                Owner's Equity
              </h3>
              {renderCategory(equityData, expandedEquity, "equity", "text-green-600")}
              <div className="flex justify-between p-3 bg-green-500/10 rounded-lg font-semibold border border-green-500/20">
                <span>Total Equity</span>
                <span className="text-green-600">Rs {totalEquity.toLocaleString()}</span>
              </div>

              {/* Total Liabilities & Equity */}
              <div className={`flex justify-between p-4 rounded-lg font-bold text-lg ${isBalanced ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-orange-500/20 border border-orange-500/30'}`}>
                <span>Total Liabilities & Equity</span>
                <span className={isBalanced ? 'text-emerald-600' : 'text-orange-600'}>
                  Rs {liabilitiesAndEquity.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Balance Check */}
          <div className={`mt-6 p-4 rounded-lg flex items-center justify-center gap-3 ${isBalanced ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
            {isBalanced ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <span className="font-medium text-emerald-600">Balance Sheet is balanced (Assets = Liabilities + Equity)</span>
              </>
            ) : (
              <>
                <span className="font-medium text-red-600">Balance Sheet is not balanced. Difference: Rs {Math.abs(totalAssets - liabilitiesAndEquity).toLocaleString()}</span>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
