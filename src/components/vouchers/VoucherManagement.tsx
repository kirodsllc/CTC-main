import { useState } from "react";
import { cn } from "@/lib/utils";
import { CreditCard, Receipt, FileText, ArrowRightLeft, List, Plus } from "lucide-react";
import { PaymentVoucherForm } from "./PaymentVoucherForm";
import { ReceiptVoucherForm } from "./ReceiptVoucherForm";
import { JournalVoucherForm } from "./JournalVoucherForm";
import { ContraVoucherForm } from "./ContraVoucherForm";
import { ViewVouchersTab } from "./ViewVouchersTab";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export interface Voucher {
  id: string;
  voucherNumber: string;
  type: "receipt" | "payment" | "journal" | "contra";
  date: string;
  narration: string;
  cashBankAccount: string;
  chequeNumber?: string;
  chequeDate?: string;
  entries: VoucherEntry[];
  totalDebit: number;
  totalCredit: number;
  status: "draft" | "posted" | "cancelled";
  createdAt: string;
}

export interface VoucherEntry {
  id: string;
  account: string;
  description: string;
  debit: number;
  credit: number;
}

type MainTab = "new" | "view";
type VoucherTab = "payment" | "receipt" | "journal" | "contra";

const mainTabs: { id: MainTab; label: string; icon: React.ElementType }[] = [
  { id: "new", label: "New Voucher", icon: Plus },
  { id: "view", label: "View Vouchers", icon: List },
];

const voucherTabs: { id: VoucherTab; label: string; icon: React.ElementType }[] = [
  { id: "payment", label: "Payment Voucher", icon: CreditCard },
  { id: "receipt", label: "Receipt Voucher", icon: Receipt },
  { id: "journal", label: "Journal Voucher", icon: FileText },
  { id: "contra", label: "Contra Voucher", icon: ArrowRightLeft },
];

// Sample accounts
const initialAccounts = [
  { value: "cash-in-hand", label: "Cash in Hand" },
  { value: "cash-at-bank-hbl", label: "Cash at Bank - HBL" },
  { value: "cash-at-bank-mcb", label: "Cash at Bank - MCB" },
  { value: "cash-at-bank-ubl", label: "Cash at Bank - UBL" },
  { value: "petty-cash", label: "Petty Cash" },
  { value: "sales-revenue", label: "Sales Revenue" },
  { value: "purchase-account", label: "Purchase Account" },
  { value: "accounts-receivable", label: "Accounts Receivable" },
  { value: "accounts-payable", label: "Accounts Payable" },
  { value: "salary-expense", label: "Salary Expense" },
  { value: "rent-expense", label: "Rent Expense" },
  { value: "utility-expense", label: "Utility Expense" },
  { value: "office-supplies", label: "Office Supplies" },
  { value: "furniture-fixtures", label: "Furniture & Fixtures" },
  { value: "equipment", label: "Equipment" },
  { value: "capital-account", label: "Capital Account" },
  { value: "drawings", label: "Drawings" },
  { value: "interest-income", label: "Interest Income" },
  { value: "interest-expense", label: "Interest Expense" },
];

// Vouchers start empty
const sampleVouchers: Voucher[] = [];

export const VoucherManagement = () => {
  const { toast } = useToast();
  const [mainTab, setMainTab] = useState<MainTab>("view");
  const [activeTab, setActiveTab] = useState<VoucherTab>("payment");
  const [vouchers, setVouchers] = useState<Voucher[]>(sampleVouchers);
  const [showSubgroupDialog, setShowSubgroupDialog] = useState(false);
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [newSubgroupName, setNewSubgroupName] = useState("");
  const [newAccountName, setNewAccountName] = useState("");
  const [accountsList, setAccountsList] = useState(initialAccounts);
  const [voucherCounters, setVoucherCounters] = useState({
    receipt: 1019,
    payment: 2881,
    journal: 4633,
    contra: 100,
  });

  const handleAddSubgroup = () => {
    setShowSubgroupDialog(true);
  };

  const handleAddAccount = () => {
    setShowAccountDialog(true);
  };

  const handleSaveSubgroup = () => {
    if (newSubgroupName.trim()) {
      toast({ title: "Success", description: `Subgroup "${newSubgroupName}" added successfully` });
      setNewSubgroupName("");
      setShowSubgroupDialog(false);
    }
  };

  const handleSaveAccount = () => {
    if (newAccountName.trim()) {
      const newAccount = {
        value: newAccountName.toLowerCase().replace(/\s+/g, "-"),
        label: newAccountName
      };
      setAccountsList([...accountsList, newAccount]);
      toast({ title: "Success", description: `Account "${newAccountName}" added successfully` });
      setNewAccountName("");
      setShowAccountDialog(false);
    }
  };

  const handleSaveVoucher = (data: any) => {
    const typePrefix = {
      receipt: "RV",
      payment: "PV",
      journal: "JV",
      contra: "CV",
    };
    
    let newVoucher: Voucher;
    const voucherNumber = `${typePrefix[data.type as VoucherTab]}${voucherCounters[data.type as VoucherTab]}`;
    
    if (data.type === "payment") {
      // Convert Payment Voucher data
      const entries: VoucherEntry[] = data.entries.map((entry: any) => ({
        id: entry.id,
        account: entry.accountDr,
        description: entry.description || "",
        debit: entry.drAmount || 0,
        credit: 0,
      }));
      // Add the Cr account entry
      entries.push({
        id: `cr-${Date.now()}`,
        account: data.crAccount,
        description: `Payment to ${data.paidTo}`,
        debit: 0,
        credit: data.totalAmount || 0,
      });
      
      newVoucher = {
        id: Date.now().toString(),
        voucherNumber,
        type: "payment",
        date: data.date || new Date().toISOString().split('T')[0],
        narration: data.paidTo || "",
        cashBankAccount: data.crAccount,
        entries,
        totalDebit: data.totalAmount || 0,
        totalCredit: data.totalAmount || 0,
        status: "draft",
        createdAt: new Date().toISOString(),
      };
    } else if (data.type === "receipt") {
      // Convert Receipt Voucher data
      const entries: VoucherEntry[] = data.entries.map((entry: any) => ({
        id: entry.id,
        account: entry.accountCr,
        description: entry.description || "",
        debit: 0,
        credit: entry.crAmount || 0,
      }));
      // Add the Dr account entry
      entries.unshift({
        id: `dr-${Date.now()}`,
        account: data.drAccount,
        description: `Receipt from ${data.receivedFrom}`,
        debit: data.totalAmount || 0,
        credit: 0,
      });
      
      newVoucher = {
        id: Date.now().toString(),
        voucherNumber,
        type: "receipt",
        date: data.date || new Date().toISOString().split('T')[0],
        narration: data.receivedFrom || "",
        cashBankAccount: data.drAccount,
        entries,
        totalDebit: data.totalAmount || 0,
        totalCredit: data.totalAmount || 0,
        status: "draft",
        createdAt: new Date().toISOString(),
      };
    } else if (data.type === "journal") {
      // Convert Journal Voucher data
      const drEntries: VoucherEntry[] = data.drEntries.map((entry: any) => ({
        id: entry.id,
        account: entry.account,
        description: entry.description || "",
        debit: entry.drAmount || 0,
        credit: 0,
      }));
      const crEntries: VoucherEntry[] = data.crEntries.map((entry: any) => ({
        id: entry.id,
        account: entry.account,
        description: entry.description || "",
        debit: 0,
        credit: entry.crAmount || 0,
      }));
      
      newVoucher = {
        id: Date.now().toString(),
        voucherNumber,
        type: "journal",
        date: data.date || new Date().toISOString().split('T')[0],
        narration: data.name || "",
        cashBankAccount: "",
        entries: [...drEntries, ...crEntries],
        totalDebit: data.totalDr || 0,
        totalCredit: data.totalCr || 0,
        status: "draft",
        createdAt: new Date().toISOString(),
      };
    } else if (data.type === "contra") {
      // Convert Contra Voucher data
      const drEntries: VoucherEntry[] = data.drEntries.map((entry: any) => ({
        id: entry.id,
        account: entry.account,
        description: entry.description || "",
        debit: entry.drAmount || 0,
        credit: 0,
      }));
      const crEntries: VoucherEntry[] = data.crEntries.map((entry: any) => ({
        id: entry.id,
        account: entry.account,
        description: entry.description || "",
        debit: 0,
        credit: entry.crAmount || 0,
      }));
      
      newVoucher = {
        id: Date.now().toString(),
        voucherNumber,
        type: "contra",
        date: data.date || new Date().toISOString().split('T')[0],
        narration: data.name || "",
        cashBankAccount: "",
        entries: [...drEntries, ...crEntries],
        totalDebit: data.totalDr || 0,
        totalCredit: data.totalCr || 0,
        status: "draft",
        createdAt: new Date().toISOString(),
      };
    } else {
      // Fallback for any other type
      newVoucher = {
        id: Date.now().toString(),
        voucherNumber,
        type: data.type,
        date: data.date || new Date().toISOString().split('T')[0],
        narration: data.narration || data.name || data.paidTo || data.receivedFrom || "",
        cashBankAccount: data.cashBankAccount || data.crAccount || data.drAccount || "",
        entries: data.entries || [],
        totalDebit: data.totalDebit || data.totalAmount || data.totalDr || 0,
        totalCredit: data.totalCredit || data.totalAmount || data.totalCr || 0,
        status: "draft",
        createdAt: new Date().toISOString(),
      };
    }
    
    setVouchers([newVoucher, ...vouchers]);
    setVoucherCounters(prev => ({
      ...prev,
      [data.type]: prev[data.type as VoucherTab] + 1
    }));
    
    toast({ title: "Success", description: `Voucher ${newVoucher.voucherNumber} created successfully` });
  };

  const handleUpdateVoucher = (updatedVoucher: Voucher) => {
    setVouchers(vouchers.map(v => v.id === updatedVoucher.id ? updatedVoucher : v));
  };

  const handleDeleteVoucher = (id: string) => {
    setVouchers(vouchers.filter(v => v.id !== id));
  };

  const generateVoucherNo = () => {
    const count = voucherCounters.receipt;
    return `RV-${String(count).padStart(4, "0")}`;
  };

  return (
    <div className="space-y-6">
      {/* Main Tab Navigation */}
      <div className="bg-card border-b border-border">
        <div className="flex items-center gap-1 overflow-x-auto">
          {mainTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setMainTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all duration-200 rounded-t-lg",
                  mainTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {mainTab === "new" && (
        <>
          {/* Voucher Type Tab Navigation */}
          <div className="bg-card border-b border-border">
            <div className="flex items-center gap-1 overflow-x-auto">
              {voucherTabs.map((tab) => {
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all duration-200 rounded-t-lg",
                      activeTab === tab.id
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    <span className="text-xs">^</span>
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form Content */}
          <div className="bg-card border border-border rounded-lg p-6">
            {activeTab === "payment" && (
              <PaymentVoucherForm
                accounts={accountsList}
                onAddSubgroup={handleAddSubgroup}
                onAddAccount={handleAddAccount}
                onSave={handleSaveVoucher}
              />
            )}
            {activeTab === "receipt" && (
              <ReceiptVoucherForm
                accounts={accountsList}
                onAddSubgroup={handleAddSubgroup}
                onAddAccount={handleAddAccount}
                onSave={handleSaveVoucher}
                generateVoucherNo={generateVoucherNo}
              />
            )}
            {activeTab === "journal" && (
              <JournalVoucherForm
                accounts={accountsList}
                onAddSubgroup={handleAddSubgroup}
                onAddAccount={handleAddAccount}
                onSave={handleSaveVoucher}
              />
            )}
            {activeTab === "contra" && (
              <ContraVoucherForm
                accounts={accountsList}
                onAddSubgroup={handleAddSubgroup}
                onAddAccount={handleAddAccount}
                onSave={handleSaveVoucher}
              />
            )}
          </div>
        </>
      )}

      {mainTab === "view" && (
        <ViewVouchersTab
          vouchers={vouchers}
          onUpdateVoucher={handleUpdateVoucher}
          onDeleteVoucher={handleDeleteVoucher}
          accounts={accountsList}
          onAddSubgroup={handleAddSubgroup}
          onAddAccount={handleAddAccount}
        />
      )}

      {/* Add Subgroup Dialog */}
      <Dialog open={showSubgroupDialog} onOpenChange={setShowSubgroupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Subgroup</DialogTitle>
            <DialogDescription>
              Create a new subgroup for organizing your accounts.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="subgroupName">Subgroup Name</Label>
              <Input
                id="subgroupName"
                placeholder="Enter subgroup name"
                value={newSubgroupName}
                onChange={(e) => setNewSubgroupName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubgroupDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSubgroup}>Save Subgroup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Account Dialog */}
      <Dialog open={showAccountDialog} onOpenChange={setShowAccountDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Account</DialogTitle>
            <DialogDescription>
              Create a new account for your chart of accounts.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="accountName">Account Name</Label>
              <Input
                id="accountName"
                placeholder="Enter account name"
                value={newAccountName}
                onChange={(e) => setNewAccountName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAccountDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAccount}>Save Account</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
