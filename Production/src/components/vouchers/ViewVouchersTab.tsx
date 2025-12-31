import { useState } from "react";
import { format } from "date-fns";
import { Search, Edit, Trash2, MoreVertical, Printer, CheckCircle, Clock, X, Plus, CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
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
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useToast } from "@/hooks/use-toast";
import { Voucher } from "./VoucherManagement";

interface ViewVouchersTabProps {
  vouchers: Voucher[];
  onUpdateVoucher: (voucher: Voucher) => void;
  onDeleteVoucher: (id: string) => void;
  accounts: { value: string; label: string }[];
  onAddSubgroup: () => void;
  onAddAccount: () => void;
}

const mainGroups = [
  { value: "assets", label: "Assets" },
  { value: "liabilities", label: "Liabilities" },
  { value: "equity", label: "Equity" },
  { value: "revenue", label: "Revenue" },
  { value: "expenses", label: "Expenses" },
];

const subGroups = [
  { value: "current-assets", label: "Current Assets" },
  { value: "fixed-assets", label: "Fixed Assets" },
  { value: "current-liabilities", label: "Current Liabilities" },
  { value: "long-term-liabilities", label: "Long Term Liabilities" },
];

export const ViewVouchersTab = ({
  vouchers,
  onUpdateVoucher,
  onDeleteVoucher,
  accounts,
  onAddSubgroup,
  onAddAccount,
}: ViewVouchersTabProps) => {
  const { toast } = useToast();
  
  // Filter states
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("default");
  const [postDatedFilter, setPostDatedFilter] = useState("default");
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(new Date());
  const [mainGroupFilter, setMainGroupFilter] = useState("_all");
  const [subGroupFilter, setSubGroupFilter] = useState("_all");
  const [accountFilter, setAccountFilter] = useState("_all");
  const [searchBy, setSearchBy] = useState("voucher-no");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Selection
  const [selectedVouchers, setSelectedVouchers] = useState<string[]>([]);
  
  // Edit dialog
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);
  const [editEntries, setEditEntries] = useState<Voucher["entries"]>([]);
  const [editNarration, setEditNarration] = useState("");
  const [editDate, setEditDate] = useState("");
  
  // Print function - opens print dialog directly
  const handlePrint = (voucher: Voucher) => {
    const getVoucherTypeName = (type: Voucher["type"]) => {
      const names = {
        receipt: "Receipt Voucher",
        payment: "Payment Voucher",
        journal: "Journal Voucher",
        contra: "Contra Voucher",
      };
      return names[type];
    };

    const numberToWords = (num: number): string => {
      const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
        "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
      const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
      
      if (num === 0) return "Zero";
      
      const convertLessThanThousand = (n: number): string => {
        if (n === 0) return "";
        if (n < 20) return ones[n];
        if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + ones[n % 10] : "");
        return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 !== 0 ? " " + convertLessThanThousand(n % 100) : "");
      };

      const wholePart = Math.floor(num);
      
      if (wholePart >= 10000000) {
        const crore = Math.floor(wholePart / 10000000);
        const remainder = wholePart % 10000000;
        return convertLessThanThousand(crore) + " Crore" + (remainder > 0 ? " " + numberToWords(remainder) : "");
      }
      if (wholePart >= 100000) {
        const lakh = Math.floor(wholePart / 100000);
        const remainder = wholePart % 100000;
        return convertLessThanThousand(lakh) + " Lakh" + (remainder > 0 ? " " + numberToWords(remainder) : "");
      }
      if (wholePart >= 1000) {
        const thousand = Math.floor(wholePart / 1000);
        const remainder = wholePart % 1000;
        return convertLessThanThousand(thousand) + " Thousand" + (remainder > 0 ? " " + convertLessThanThousand(remainder) : "");
      }
      
      return convertLessThanThousand(wholePart);
    };

    const formatDate = (dateString: string) => {
      try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        return date.toLocaleDateString("en-GB");
      } catch {
        return dateString;
      }
    };

    // Get account label from accounts list
    const getAccountLabel = (accountValue: string) => {
      const account = accounts.find(acc => acc.value === accountValue);
      return account ? account.label : accountValue;
    };

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = `
<!DOCTYPE html>
<html>
<head>
  <title>Print Voucher - ${voucher.voucherNumber}</title>
  <style>
    @media print {
      @page {
        size: A4;
        margin: 1cm;
      }
      body {
        margin: 0;
        padding: 0;
      }
    }
    body {
      font-family: Arial, sans-serif;
      padding: 32px;
      background: white;
      color: black;
      min-height: 297mm;
    }
    .header {
      border-bottom: 2px solid black;
      padding-bottom: 16px;
      margin-bottom: 24px;
      text-align: center;
    }
    .header h1 {
      font-size: 24px;
      font-weight: bold;
      margin: 0 0 8px 0;
    }
    .header p {
      font-size: 14px;
      margin: 4px 0;
    }
    .voucher-title {
      text-align: center;
      margin-bottom: 24px;
    }
    .voucher-title h2 {
      font-size: 20px;
      font-weight: bold;
      border: 2px solid black;
      display: inline-block;
      padding: 8px 32px;
      margin: 0;
    }
    .voucher-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 24px;
    }
    .voucher-info p {
      margin: 8px 0;
    }
    .voucher-info .right {
      text-align: right;
    }
    .narration {
      margin-bottom: 24px;
      padding: 12px;
      background: #f5f5f5;
      border: 1px solid #e0e0e0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid black;
      margin-bottom: 24px;
    }
    th, td {
      border: 1px solid black;
      padding: 8px;
      text-align: left;
    }
    th {
      background: #f0f0f0;
    }
    .text-right {
      text-align: right;
    }
    tfoot tr {
      background: #f0f0f0;
      font-weight: bold;
    }
    .amount-words {
      margin-bottom: 32px;
      padding: 12px;
      border: 1px solid black;
    }
    .amount-words p {
      margin: 4px 0;
    }
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 32px;
      margin-top: 64px;
      padding-top: 16px;
    }
    .signature {
      text-align: center;
      border-top: 1px solid black;
      padding-top: 8px;
    }
    .signature p {
      font-weight: bold;
      margin: 0;
    }
    .footer {
      margin-top: 48px;
      text-align: center;
      font-size: 12px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Your Company Name</h1>
    <p>123 Business Street, City, Country</p>
    <p>Phone: +92-XXX-XXXXXXX | Email: info@company.com</p>
  </div>

  <div class="voucher-title">
    <h2>${getVoucherTypeName(voucher.type).toUpperCase()}</h2>
  </div>

  <div class="voucher-info">
    <div>
      <p><strong>Voucher No:</strong> ${voucher.voucherNumber}</p>
      <p><strong>Account:</strong> ${getAccountLabel(voucher.cashBankAccount) || voucher.cashBankAccount}</p>
      ${voucher.chequeNumber ? `<p><strong>Cheque No:</strong> ${voucher.chequeNumber}</p>` : ''}
    </div>
    <div class="right">
      <p><strong>Date:</strong> ${formatDate(voucher.date)}</p>
      <p><strong>Status:</strong> ${voucher.status.charAt(0).toUpperCase() + voucher.status.slice(1)}</p>
      ${voucher.chequeDate ? `<p><strong>Cheque Date:</strong> ${formatDate(voucher.chequeDate)}</p>` : ''}
    </div>
  </div>

  ${voucher.narration ? `
  <div class="narration">
    <p><strong>Narration:</strong> ${voucher.narration}</p>
  </div>
  ` : ''}

  <table>
    <thead>
      <tr>
        <th>S.No</th>
        <th>Account</th>
        <th>Description</th>
        <th class="text-right">Debit (Rs)</th>
        <th class="text-right">Credit (Rs)</th>
      </tr>
    </thead>
    <tbody>
      ${voucher.entries.map((entry, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${getAccountLabel(entry.account) || entry.account}</td>
        <td>${entry.description || "-"}</td>
        <td class="text-right">${entry.debit > 0 ? entry.debit.toLocaleString("en-PK", { minimumFractionDigits: 2 }) : "-"}</td>
        <td class="text-right">${entry.credit > 0 ? entry.credit.toLocaleString("en-PK", { minimumFractionDigits: 2 }) : "-"}</td>
      </tr>
      `).join('')}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="3" class="text-right"><strong>Total:</strong></td>
        <td class="text-right"><strong>${voucher.totalDebit.toLocaleString("en-PK", { minimumFractionDigits: 2 })}</strong></td>
        <td class="text-right"><strong>${voucher.totalCredit.toLocaleString("en-PK", { minimumFractionDigits: 2 })}</strong></td>
      </tr>
    </tfoot>
  </table>

  <div class="amount-words">
    <p><strong>Amount in Words:</strong></p>
    <p style="font-style: italic;">${numberToWords(voucher.totalDebit)} Rupees Only</p>
  </div>

  <div class="signatures">
    <div class="signature">
      <p>Prepared By</p>
    </div>
    <div class="signature">
      <p>Checked By</p>
    </div>
    <div class="signature">
      <p>Approved By</p>
    </div>
  </div>

  <div class="footer">
    <p>This is a computer generated document. Printed on ${new Date().toLocaleString()}</p>
  </div>

  <script>
    window.onload = function() {
      window.print();
      window.onafterprint = function() {
        window.close();
      };
    };
  </script>
</body>
</html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  // Filter vouchers
  const filteredVouchers = vouchers.filter((voucher) => {
    // Type filter
    if (typeFilter !== "all" && voucher.type !== typeFilter) return false;
    
    // Category filter (based on voucher type - payment/receipt = expense/income)
    if (categoryFilter !== "default") {
      if (categoryFilter === "expense" && voucher.type !== "payment") return false;
      if (categoryFilter === "income" && voucher.type !== "receipt") return false;
    }
    
    // Post dated filter (check if voucher date is in the future)
    if (postDatedFilter !== "default") {
      const voucherDate = new Date(voucher.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const isPostDated = voucherDate > today;
      if (postDatedFilter === "yes" && !isPostDated) return false;
      if (postDatedFilter === "no" && isPostDated) return false;
    }
    
    // Date range filter
    if (fromDate) {
      const from = new Date(fromDate);
      from.setHours(0, 0, 0, 0);
      const voucherDate = new Date(voucher.date);
      if (voucherDate < from) return false;
    }
    if (toDate) {
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      const voucherDate = new Date(voucher.date);
      if (voucherDate > to) return false;
    }
    
    // Main Group filter (check if any entry account matches main group)
    if (mainGroupFilter !== "_all") {
      // This would require account metadata - for now, we'll skip this filter
      // as we don't have account main group information in the voucher entries
    }
    
    // Sub Group filter (similar to main group)
    if (subGroupFilter !== "_all") {
      // This would require account metadata - for now, we'll skip this filter
    }
    
    // Account filter (check if any entry matches the selected account)
    if (accountFilter !== "_all") {
      const hasMatchingAccount = voucher.entries.some(entry => entry.account === accountFilter);
      if (!hasMatchingAccount) return false;
    }
    
    // Search query filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (searchBy === "voucher-no" && !voucher.voucherNumber.toLowerCase().includes(query)) return false;
      if (searchBy === "voucher-name" && !voucher.narration.toLowerCase().includes(query)) return false;
      if (searchBy === "amount" && !voucher.totalDebit.toString().includes(query)) return false;
    }
    
    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredVouchers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedVouchers = filteredVouchers.slice(startIndex, startIndex + itemsPerPage);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedVouchers(paginatedVouchers.map((v) => v.id));
    } else {
      setSelectedVouchers([]);
    }
  };

  const handleSelectVoucher = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedVouchers([...selectedVouchers, id]);
    } else {
      setSelectedVouchers(selectedVouchers.filter((v) => v !== id));
    }
  };

  const handleEdit = (voucher: Voucher) => {
    if (voucher.status === "posted") {
      toast({
        title: "Cannot Edit",
        description: "Approved vouchers cannot be edited.",
        variant: "destructive",
      });
      return;
    }
    setEditingVoucher(voucher);
    setEditNarration(voucher.narration);
    setEditDate(voucher.date);
    setEditEntries([...voucher.entries]);
  };

  const handleSaveEdit = () => {
    if (!editingVoucher) return;
    
    const totalDebit = editEntries.reduce((sum, e) => sum + e.debit, 0);
    const totalCredit = editEntries.reduce((sum, e) => sum + e.credit, 0);
    
    if (totalDebit !== totalCredit) {
      toast({
        title: "Validation Error",
        description: "Total Debit must equal Total Credit",
        variant: "destructive",
      });
      return;
    }
    
    onUpdateVoucher({
      ...editingVoucher,
      narration: editNarration,
      date: editDate,
      entries: editEntries,
      totalDebit,
      totalCredit,
    });
    
    setEditingVoucher(null);
    toast({ title: "Success", description: "Voucher updated successfully" });
  };

  const handleDelete = (voucher: Voucher) => {
    if (voucher.status === "posted") {
      toast({
        title: "Cannot Delete",
        description: "Approved vouchers cannot be deleted.",
        variant: "destructive",
      });
      return;
    }
    onDeleteVoucher(voucher.id);
    toast({ title: "Success", description: "Voucher deleted successfully" });
  };

  const handleApprove = (voucher: Voucher) => {
    onUpdateVoucher({ ...voucher, status: "posted" });
    toast({ title: "Success", description: "Voucher approved successfully" });
  };

  const addDebitEntry = () => {
    setEditEntries([
      ...editEntries,
      { id: Date.now().toString(), account: "", description: "", debit: 0, credit: 0 },
    ]);
  };

  const addCreditEntry = () => {
    setEditEntries([
      ...editEntries,
      { id: Date.now().toString(), account: "", description: "", debit: 0, credit: 0 },
    ]);
  };

  const updateEntry = (id: string, field: string, value: string | number) => {
    setEditEntries(
      editEntries.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );
  };

  const removeEntry = (id: string) => {
    setEditEntries(editEntries.filter((e) => e.id !== id));
  };

  const getVoucherTypeLabel = (type: string) => {
    switch (type) {
      case "payment": return "PV";
      case "receipt": return "RV";
      case "journal": return "JV";
      case "contra": return "CV";
      default: return type;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "posted":
        return (
          <span className="inline-flex items-center gap-1 text-green-600">
            <CheckCircle className="h-4 w-4" />
            Approved
          </span>
        );
      case "draft":
        return (
          <span className="inline-flex items-center gap-1 text-amber-600">
            <Clock className="h-4 w-4" />
            Pending
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Clock className="h-4 w-4" />
            {status}
          </span>
        );
    }
  };

  const totalDebit = editEntries.reduce((sum, e) => sum + e.debit, 0);
  const totalCredit = editEntries.reduce((sum, e) => sum + e.credit, 0);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-card border border-border rounded-lg p-4 space-y-4">
        {/* First row of filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Type</Label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="payment">Payment</SelectItem>
                <SelectItem value="receipt">Receipt</SelectItem>
                <SelectItem value="journal">Journal</SelectItem>
                <SelectItem value="contra">Contra</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Category</Label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Default" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="income">Income</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Post Dated</Label>
            <Select value={postDatedFilter} onValueChange={setPostDatedFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Default" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default</SelectItem>
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">From</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal h-9",
                    !fromDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {fromDate ? format(fromDate, "dd/MM/yyyy") : <span>DD/MM/YYYY</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={fromDate}
                  onSelect={setFromDate}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">To</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal h-9",
                    !toDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {toDate ? format(toDate, "dd/MM/yyyy") : <span>DD/MM/YYYY</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={toDate}
                  onSelect={setToDate}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        
        {/* Second row of filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Main Group</Label>
            <Select value={mainGroupFilter} onValueChange={setMainGroupFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All</SelectItem>
                {mainGroups.map((group) => (
                  <SelectItem key={group.value} value={group.value}>
                    {group.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Sub Group</Label>
            <Select value={subGroupFilter} onValueChange={setSubGroupFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All</SelectItem>
                {subGroups.map((group) => (
                  <SelectItem key={group.value} value={group.value}>
                    {group.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Account</Label>
            <Select value={accountFilter} onValueChange={setAccountFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All</SelectItem>
                {accounts.map((acc) => (
                  <SelectItem key={acc.value} value={acc.value}>
                    {acc.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Search row */}
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Search By</Label>
            <Select value={searchBy} onValueChange={setSearchBy}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="voucher-no">Voucher No</SelectItem>
                <SelectItem value="voucher-name">Voucher Name</SelectItem>
                <SelectItem value="amount">Amount</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={() => {
              // Search is already handled by the filter logic on input change
              // This button can trigger a re-filter if needed, but it's already working
              // via the onChange handler on the input field
            }}
          >
            <Search className="h-4 w-4" />
            Search
          </Button>
        </div>
      </div>

      {/* Vouchers Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-primary/10">
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={
                      paginatedVouchers.length > 0 &&
                      paginatedVouchers.every((v) => selectedVouchers.includes(v.id))
                    }
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead className="font-semibold text-primary">Sr No</TableHead>
                <TableHead className="font-semibold text-primary">Voucher no</TableHead>
                <TableHead className="font-semibold text-primary">Voucher Name</TableHead>
                <TableHead className="font-semibold text-primary">Date</TableHead>
                <TableHead className="font-semibold text-primary">Amount</TableHead>
                <TableHead className="font-semibold text-primary">Status</TableHead>
                <TableHead className="font-semibold text-primary">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedVouchers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No vouchers found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedVouchers.map((voucher, index) => (
                  <TableRow key={voucher.id} className="hover:bg-muted/50">
                    <TableCell>
                      <Checkbox
                        checked={selectedVouchers.includes(voucher.id)}
                        onCheckedChange={(checked) =>
                          handleSelectVoucher(voucher.id, checked as boolean)
                        }
                      />
                    </TableCell>
                    <TableCell>{startIndex + index + 1}</TableCell>
                    <TableCell className="text-primary font-medium">
                      {voucher.voucherNumber}
                    </TableCell>
                    <TableCell className="text-primary">{voucher.narration || "-"}</TableCell>
                    <TableCell>{new Date(voucher.date).toLocaleDateString("en-GB")}</TableCell>
                    <TableCell>{voucher.totalDebit.toLocaleString()}</TableCell>
                    <TableCell>{getStatusBadge(voucher.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 text-primary"
                          onClick={() => handleEdit(voucher)}
                          disabled={voucher.status === "posted"}
                        >
                          <Edit className="h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 text-destructive"
                          onClick={() => handleDelete(voucher)}
                          disabled={voucher.status === "posted"}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handlePrint(voucher)}>
                              <Printer className="h-4 w-4 mr-2" />
                              Print
                            </DropdownMenuItem>
                            {voucher.status !== "posted" && (
                              <DropdownMenuItem onClick={() => handleApprove(voucher)}>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Approve
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-border">
          <p className="text-sm text-primary">
            Showing {filteredVouchers.length > 0 ? startIndex + 1 : 0} to {Math.min(startIndex + itemsPerPage, filteredVouchers.length)} of {filteredVouchers.length} items
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              «
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              ‹
            </Button>
            {Array.from({ length: Math.min(5, totalPages || 1) }, (_, i) => {
              const page = i + 1;
              return (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Button>
              );
            })}
            {totalPages > 5 && <span className="px-2">...</span>}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages || totalPages === 0}
            >
              ›
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages || totalPages === 0}
            >
              »
            </Button>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(v) => {
                setItemsPerPage(Number(v));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingVoucher} onOpenChange={() => setEditingVoucher(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-primary" />
              Editing Voucher {editingVoucher?.voucherNumber}
              <span className="text-sm text-muted-foreground ml-2">
                Voucher Id: {editingVoucher?.voucherNumber}
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Voucher Type Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded">
                  <span className="text-primary font-bold">
                    {editingVoucher && getVoucherTypeLabel(editingVoucher.type)}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-primary">
                    {editingVoucher?.type.charAt(0).toUpperCase() + (editingVoucher?.type.slice(1) || "")} Voucher
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {editingVoucher && getVoucherTypeLabel(editingVoucher.type)}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={onAddSubgroup}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add New Subgroup
                </Button>
                <Button variant="outline" size="sm" onClick={onAddAccount}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add New Account
                </Button>
              </div>
            </div>

            {/* Name and Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Name</Label>
                <Input
                  value={editNarration}
                  onChange={(e) => setEditNarration(e.target.value)}
                  placeholder="Enter name"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Date</Label>
                <Input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                />
              </div>
            </div>

            {/* Entries Table */}
            <div className="space-y-4">
              <div className="grid grid-cols-12 gap-2 text-sm font-medium">
                <div className="col-span-3">Account Dr/ Cr</div>
                <div className="col-span-4">Description</div>
                <div className="col-span-2">Dr</div>
                <div className="col-span-2">Cr</div>
                <div className="col-span-1"></div>
              </div>

              {editEntries.map((entry) => (
                <div key={entry.id} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-3">
                    <SearchableSelect
                      options={accounts}
                      value={entry.account}
                      onValueChange={(value) => updateEntry(entry.id, "account", value)}
                      placeholder="Select account"
                    />
                  </div>
                  <div className="col-span-4">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Description</Label>
                      <Input
                        value={entry.description}
                        onChange={(e) => updateEntry(entry.id, "description", e.target.value)}
                        placeholder="Description"
                      />
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">amount</Label>
                      <Input
                        type="number"
                        value={entry.debit || ""}
                        onChange={(e) => updateEntry(entry.id, "debit", Number(e.target.value))}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">amount</Label>
                      <Input
                        type="number"
                        value={entry.credit || ""}
                        onChange={(e) => updateEntry(entry.id, "credit", Number(e.target.value))}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="col-span-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => removeEntry(entry.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {/* Totals */}
              <div className="grid grid-cols-12 gap-2 items-center pt-4">
                <div className="col-span-7 text-right font-semibold">Total Amount</div>
                <div className="col-span-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Total Amount</Label>
                    <Input value={totalDebit} readOnly className="bg-muted" />
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Total Amount</Label>
                    <Input value={totalCredit} readOnly className="bg-muted" />
                  </div>
                </div>
                <div className="col-span-1"></div>
              </div>

              {/* Add Buttons */}
              <div className="flex justify-center gap-4 pt-4">
                <Button onClick={addDebitEntry} className="bg-primary hover:bg-primary/90">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Dr
                </Button>
                <Button onClick={addCreditEntry} className="bg-destructive hover:bg-destructive/90">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Cr
                </Button>
              </div>

              {/* Save Button */}
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={handleSaveEdit}>
                  💾 Save
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem>Save & Print</DropdownMenuItem>
                    <DropdownMenuItem>Save & New</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Cancel */}
            <Button
              variant="ghost"
              className="text-primary"
              onClick={() => setEditingVoucher(null)}
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};
