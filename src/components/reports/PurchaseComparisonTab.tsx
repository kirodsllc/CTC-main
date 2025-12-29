import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Download, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { toast } from "sonner";

interface ComparisonData {
  supplier: string;
  currentPeriod: number;
  previousPeriod: number;
  change: number;
  items: number;
  avgDelivery: number;
}

const PurchaseComparisonTab = () => {
  const [period1, setPeriod1] = useState("dec-2024");
  const [period2, setPeriod2] = useState("nov-2024");

  const comparisonData: ComparisonData[] = [];

  const chartData = comparisonData.map(d => ({
    name: d.supplier.split(" ")[0],
    current: d.currentPeriod / 1000,
    previous: d.previousPeriod / 1000,
  }));

  const handleExport = () => {
    toast.success("Exporting comparison report...");
  };

  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="w-4 h-4 text-success" />;
    if (change < 0) return <TrendingDown className="w-4 h-4 text-destructive" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-lg">Purchase Comparison</CardTitle>
              <p className="text-sm text-muted-foreground">Compare purchase data across different periods</p>
            </div>
            <Button onClick={handleExport} className="bg-primary hover:bg-primary/90">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Current Period</label>
              <Select value={period1} onValueChange={setPeriod1}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dec-2024">December 2024</SelectItem>
                  <SelectItem value="nov-2024">November 2024</SelectItem>
                  <SelectItem value="oct-2024">October 2024</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Compare With</label>
              <Select value={period2} onValueChange={setPeriod2}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nov-2024">November 2024</SelectItem>
                  <SelectItem value="oct-2024">October 2024</SelectItem>
                  <SelectItem value="sep-2024">September 2024</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button>Compare</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-primary">Current Period Total</p>
            <p className="text-2xl font-bold mt-1">Rs 0</p>
          </CardContent>
        </Card>
        <Card className="bg-info/5 border-info/20">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-info">Previous Period Total</p>
            <p className="text-2xl font-bold mt-1">Rs 0</p>
          </CardContent>
        </Card>
        <Card className="bg-success/5 border-success/20">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-success">Change</p>
            <p className="text-2xl font-bold mt-1 flex items-center gap-1">
              <Minus className="w-5 h-5" />
              0%
            </p>
          </CardContent>
        </Card>
        <Card className="bg-warning/5 border-warning/20">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-warning">Total Items</p>
            <p className="text-2xl font-bold mt-1">0</p>
          </CardContent>
        </Card>
      </div>

      {/* Comparison Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Supplier Purchase Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={0}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `${value}K`}
                />
                <Tooltip 
                  formatter={(value: number) => [`Rs ${(value * 1000).toLocaleString()}`, ""]}
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px"
                  }}
                />
                <Legend />
                <Bar dataKey="current" name="Current Period" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="previous" name="Previous Period" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Comparison Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SUPPLIER</TableHead>
                <TableHead className="text-right">CURRENT PERIOD</TableHead>
                <TableHead className="text-right">PREVIOUS PERIOD</TableHead>
                <TableHead className="text-center">CHANGE</TableHead>
                <TableHead className="text-center">ITEMS</TableHead>
                <TableHead className="text-center">AVG DELIVERY (DAYS)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparisonData.map((row) => (
                <TableRow key={row.supplier}>
                  <TableCell className="font-medium">{row.supplier}</TableCell>
                  <TableCell className="text-right">Rs {row.currentPeriod.toLocaleString()}</TableCell>
                  <TableCell className="text-right">Rs {row.previousPeriod.toLocaleString()}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      {getTrendIcon(row.change)}
                      <span className={row.change > 0 ? "text-success" : row.change < 0 ? "text-destructive" : ""}>
                        {row.change > 0 ? "+" : ""}{row.change}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">{row.items}</TableCell>
                  <TableCell className="text-center">{row.avgDelivery} days</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default PurchaseComparisonTab;
