import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Download, Printer, RefreshCw, Scale, CheckCircle2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TrialBalanceRow {
  accountCode: string;
  accountName: string;
  accountType: string;
  debit: number;
  credit: number;
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export const TrialBalanceTab = () => {
  const [period, setPeriod] = useState("december-2024");
  const [filterType, setFilterType] = useState("all");
  const [trialBalanceData, setTrialBalanceData] = useState<TrialBalanceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrialBalance();
  }, [period, filterType]);

  const fetchTrialBalance = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append("period", period);
      if (filterType !== "all") params.append("type", filterType);
      
      const response = await fetch(`${API_URL}/api/accounting/trial-balance?${params}`);
      if (response.ok) {
        const data = await response.json();
        setTrialBalanceData(data);
      }
    } catch (error) {
      console.error("Error fetching trial balance:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const printHTML = `
      <html>
        <head>
          <title>Trial Balance</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { text-align: center; color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f4f4f4; }
            .text-right { text-align: right; }
            @media print { button { display: none; } }
          </style>
        </head>
        <body>
          <h1>Trial Balance - ${period}</h1>
          <table>
            <thead>
              <tr>
                <th>Account Code</th>
                <th>Account Name</th>
                <th>Type</th>
                <th class="text-right">Debit (Rs)</th>
                <th class="text-right">Credit (Rs)</th>
              </tr>
            </thead>
            <tbody>
              ${filteredData.map(row => `
                <tr>
                  <td>${row.accountCode}</td>
                  <td>${row.accountName}</td>
                  <td>${row.accountType}</td>
                  <td class="text-right">${row.debit > 0 ? row.debit.toLocaleString() : '-'}</td>
                  <td class="text-right">${row.credit > 0 ? row.credit.toLocaleString() : '-'}</td>
                </tr>
              `).join('')}
              <tr style="font-weight: bold; background-color: #f4f4f4;">
                <td colspan="3" class="text-right">Total</td>
                <td class="text-right">${totalDebit.toLocaleString()}</td>
                <td class="text-right">${totalCredit.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
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
    const csvContent = [
      ["Account Code", "Account Name", "Type", "Debit", "Credit"].join(","),
      ...filteredData.map(row => [
        row.accountCode,
        row.accountName,
        row.accountType,
        row.debit,
        row.credit
      ].join(",")),
      ["", "", "TOTAL", totalDebit, totalCredit].join(",")
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `trial_balance_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const filteredData = filterType === "all" 
    ? trialBalanceData 
    : trialBalanceData.filter(row => row.accountType.toLowerCase() === filterType);

  const totalDebit = filteredData.reduce((sum, row) => sum + row.debit, 0);
  const totalCredit = filteredData.reduce((sum, row) => sum + row.credit, 0);
  const isBalanced = totalDebit === totalCredit;
  const difference = Math.abs(totalDebit - totalCredit);

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "asset": return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "liability": return "bg-red-500/10 text-red-600 border-red-500/20";
      case "equity": return "bg-purple-500/10 text-purple-600 border-purple-500/20";
      case "revenue": return "bg-green-500/10 text-green-600 border-green-500/20";
      case "expense": return "bg-orange-500/10 text-orange-600 border-orange-500/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20 transition-all duration-300 hover:shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Debits</p>
                <p className="text-2xl font-bold text-blue-600">Rs {totalDebit.toLocaleString()}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Scale className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20 transition-all duration-300 hover:shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Credits</p>
                <p className="text-2xl font-bold text-green-600">Rs {totalCredit.toLocaleString()}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <Scale className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-br ${isBalanced ? 'from-emerald-500/10 to-emerald-600/5 border-emerald-500/20' : 'from-red-500/10 to-red-600/5 border-red-500/20'} transition-all duration-300 hover:shadow-lg`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className={`text-2xl font-bold ${isBalanced ? 'text-emerald-600' : 'text-red-600'}`}>
                  {isBalanced ? 'Balanced' : 'Unbalanced'}
                </p>
              </div>
              <div className={`h-12 w-12 rounded-full ${isBalanced ? 'bg-emerald-500/20' : 'bg-red-500/20'} flex items-center justify-center`}>
                {isBalanced ? (
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                ) : (
                  <AlertCircle className="h-6 w-6 text-red-600" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20 transition-all duration-300 hover:shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Difference</p>
                <p className="text-2xl font-bold text-purple-600">Rs {difference.toLocaleString()}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                <RefreshCw className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Scale className="h-5 w-5 text-primary" />
              Trial Balance
            </CardTitle>
            <div className="flex flex-wrap items-center gap-3">
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-[180px]">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Select Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="december-2024">December 2024</SelectItem>
                  <SelectItem value="november-2024">November 2024</SelectItem>
                  <SelectItem value="october-2024">October 2024</SelectItem>
                  <SelectItem value="q4-2024">Q4 2024</SelectItem>
                  <SelectItem value="fy-2024">FY 2024</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Account Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="asset">Assets</SelectItem>
                  <SelectItem value="liability">Liabilities</SelectItem>
                  <SelectItem value="equity">Equity</SelectItem>
                  <SelectItem value="revenue">Revenue</SelectItem>
                  <SelectItem value="expense">Expenses</SelectItem>
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
          <div className="rounded-lg border border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Account Code</TableHead>
                  <TableHead className="font-semibold">Account Name</TableHead>
                  <TableHead className="font-semibold">Type</TableHead>
                  <TableHead className="text-right font-semibold">Debit (Rs)</TableHead>
                  <TableHead className="text-right font-semibold">Credit (Rs)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((row, index) => (
                  <TableRow 
                    key={row.accountCode} 
                    className="transition-all duration-200 hover:bg-muted/50"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <TableCell className="font-mono text-sm">{row.accountCode}</TableCell>
                    <TableCell className="font-medium">{row.accountName}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getTypeColor(row.accountType)}>
                        {row.accountType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {row.debit > 0 ? `Rs ${row.debit.toLocaleString()}` : '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {row.credit > 0 ? `Rs ${row.credit.toLocaleString()}` : '-'}
                    </TableCell>
                  </TableRow>
                ))}
                {/* Total Row */}
                <TableRow className="bg-primary/5 font-bold border-t-2 border-primary/20">
                  <TableCell colSpan={3} className="text-right">Total</TableCell>
                  <TableCell className="text-right font-mono text-primary">Rs {totalDebit.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-mono text-primary">Rs {totalCredit.toLocaleString()}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
