import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

const DailyClosingTab = () => {
  const [closingDate, setClosingDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [isGeneratingClosing, setIsGeneratingClosing] = useState(false);

  // Brand Wise Sales Report state
  const [shop, setShop] = useState("");
  const [saleType, setSaleType] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [brand, setBrand] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [isGeneratingBrand, setIsGeneratingBrand] = useState(false);

  const accounts = [
    { id: "103015", name: "103015-JAZCASH" },
    { id: "103016", name: "103016-EASYPAISA" },
    { id: "103017", name: "103017-BANK ALFALAH" },
    { id: "103018", name: "103018-HBL" },
    { id: "103019", name: "103019-CASH" },
  ];

  const shops = [
    { id: "1", name: "Shop 1" },
    { id: "2", name: "Shop 2" },
    { id: "3", name: "Main Store" },
  ];

  const saleTypes = [
    { id: "walk-in", name: "Walk-in Customer" },
    { id: "regular", name: "Regular Customer" },
    { id: "wholesale", name: "Wholesale" },
  ];

  const brands = [
    { id: "denso", name: "Denso" },
    { id: "toyota", name: "Toyota" },
    { id: "honda", name: "Honda" },
    { id: "suzuki", name: "Suzuki" },
  ];

  const handleViewClosingPDF = () => {
    if (!closingDate) {
      toast.error("Please select a date");
      return;
    }
    setIsGeneratingClosing(true);
    setTimeout(() => {
      setIsGeneratingClosing(false);
      toast.success("Daily Closing Report generated successfully");
    }, 1500);
  };

  const handleGenerateBrandPDF = () => {
    if (!fromDate || !toDate) {
      toast.error("Please select date range");
      return;
    }
    setIsGeneratingBrand(true);
    setTimeout(() => {
      setIsGeneratingBrand(false);
      toast.success("Brand Wise Sales Report generated successfully");
    }, 1500);
  };

  return (
    <div className="space-y-6">
      {/* Daily Closing Report */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5" />
            Daily Closing Report
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm font-medium text-muted-foreground">Filter</p>
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-2">
                <Label htmlFor="closingDate">Date</Label>
                <Input
                  id="closingDate"
                  type="date"
                  value={closingDate}
                  onChange={(e) => setClosingDate(e.target.value)}
                  className="w-40"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="account">Account</Label>
                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                  <SelectTrigger className="w-56">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleViewClosingPDF} disabled={isGeneratingClosing}>
                {isGeneratingClosing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    View PDF
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Brand Wise Sales Report */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5" />
            Brand Wise Sales Report
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label htmlFor="shop">Shop</Label>
                <Select value={shop} onValueChange={setShop}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select shop" />
                  </SelectTrigger>
                  <SelectContent>
                    {shops.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="saleType">Sale Type</Label>
                <Select value={saleType} onValueChange={setSaleType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {saleTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerName">Customer Name</Label>
                <Input
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter customer name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand">Brand</Label>
                <Select value={brand} onValueChange={setBrand}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select brand" />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fromDate">From</Label>
                <Input
                  id="fromDate"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-end gap-4">
              <div className="space-y-2">
                <Label htmlFor="toDate">To</Label>
                <Input
                  id="toDate"
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-40"
                />
              </div>
              <Button onClick={handleGenerateBrandPDF} disabled={isGeneratingBrand}>
                {isGeneratingBrand ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating PDF...
                  </>
                ) : (
                  "Generating PDF..."
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DailyClosingTab;
