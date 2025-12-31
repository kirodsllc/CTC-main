import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Plus, X, Save, MoreVertical, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface JournalEntry {
  id: string;
  account: string;
  description: string;
  drAmount: number;
  crAmount: number;
  type: "dr" | "cr";
}

interface JournalVoucherFormProps {
  accounts: { value: string; label: string }[];
  onAddSubgroup: () => void;
  onAddAccount: () => void;
  onSave: (data: any) => void;
}

export const JournalVoucherForm = ({ accounts, onAddSubgroup, onAddAccount, onSave }: JournalVoucherFormProps) => {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [date, setDate] = useState(new Date().toLocaleDateString("en-GB").replace(/\//g, "/"));
  const [drEntries, setDrEntries] = useState<JournalEntry[]>([
    { id: "dr-1", account: "", description: "", drAmount: 0, crAmount: 0, type: "dr" }
  ]);
  const [crEntries, setCrEntries] = useState<JournalEntry[]>([
    { id: "cr-1", account: "", description: "", drAmount: 0, crAmount: 0, type: "cr" }
  ]);

  const addDrEntry = () => {
    setDrEntries([...drEntries, { id: `dr-${Date.now()}`, account: "", description: "", drAmount: 0, crAmount: 0, type: "dr" }]);
  };

  const addCrEntry = () => {
    setCrEntries([...crEntries, { id: `cr-${Date.now()}`, account: "", description: "", drAmount: 0, crAmount: 0, type: "cr" }]);
  };

  const removeDrEntry = (id: string) => {
    if (drEntries.length > 1) {
      setDrEntries(drEntries.filter(e => e.id !== id));
    }
  };

  const removeCrEntry = (id: string) => {
    if (crEntries.length > 1) {
      setCrEntries(crEntries.filter(e => e.id !== id));
    }
  };

  const updateDrEntry = (id: string, field: keyof JournalEntry, value: string | number) => {
    setDrEntries(drEntries.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const updateCrEntry = (id: string, field: keyof JournalEntry, value: string | number) => {
    setCrEntries(crEntries.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const totalDr = drEntries.reduce((sum, e) => sum + (Number(e.drAmount) || 0), 0);
  const totalCr = crEntries.reduce((sum, e) => sum + (Number(e.crAmount) || 0), 0);

  const handleSave = () => {
    if (!name) {
      toast({ title: "Error", description: "Please enter Name field", variant: "destructive" });
      return;
    }
    if (drEntries.some(e => !e.account) || crEntries.some(e => !e.account)) {
      toast({ title: "Error", description: "Please select Account for all entries", variant: "destructive" });
      return;
    }
    if (totalDr === 0 && totalCr === 0) {
      toast({ title: "Error", description: "Please enter at least one amount", variant: "destructive" });
      return;
    }
    if (totalDr !== totalCr) {
      toast({ title: "Error", description: "Total Dr must equal Total Cr", variant: "destructive" });
      return;
    }

    onSave({
      type: "journal",
      name,
      date,
      drEntries,
      crEntries,
      totalDr,
      totalCr
    });

    // Reset form
    setName("");
    setDrEntries([{ id: "dr-1", account: "", description: "", drAmount: 0, crAmount: 0, type: "dr" }]);
    setCrEntries([{ id: "cr-1", account: "", description: "", drAmount: 0, crAmount: 0, type: "cr" }]);
    toast({ title: "Success", description: "Journal Voucher saved successfully" });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Journal Voucher</h2>
            <p className="text-sm text-muted-foreground">JV</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onAddSubgroup} className="text-muted-foreground hover:text-foreground">
            + Add New Subgroup
          </Button>
          <Button variant="ghost" size="sm" onClick={onAddAccount} className="text-muted-foreground hover:text-foreground">
            + Add New Account
          </Button>
        </div>
      </div>

      {/* Name and Date */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3">
          <Input
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-11"
          />
        </div>
        <div>
          <div className="relative">
            <Label className="absolute -top-2 left-2 bg-background px-1 text-xs text-muted-foreground z-10">Date</Label>
            <Input
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-11 bg-muted/30"
            />
          </div>
        </div>
      </div>

      {/* Entries Table */}
      <div className="space-y-4">
        <div className="grid grid-cols-12 gap-4 items-center">
          <div className="col-span-3">
            <Label className="text-base font-medium">Account Dr/ Cr</Label>
          </div>
          <div className="col-span-4">
            <Label className="text-base font-medium">Description</Label>
          </div>
          <div className="col-span-2">
            <Label className="text-base font-medium">Dr</Label>
          </div>
          <div className="col-span-2">
            <Label className="text-base font-medium">Cr</Label>
          </div>
          <div className="col-span-1"></div>
        </div>

        {/* Dr Entries */}
        {drEntries.map((entry) => (
          <div key={entry.id} className="grid grid-cols-12 gap-4 items-center">
            <div className="col-span-3">
              <SearchableSelect
                options={accounts}
                value={entry.account}
                onValueChange={(v) => updateDrEntry(entry.id, "account", v)}
                placeholder="Select..."
              />
            </div>
            <div className="col-span-4">
              <Input
                placeholder="Description"
                value={entry.description}
                onChange={(e) => updateDrEntry(entry.id, "description", e.target.value)}
                className="h-10"
              />
            </div>
            <div className="col-span-2">
              <Input
                type="number"
                placeholder="amount"
                value={entry.drAmount || ""}
                onChange={(e) => updateDrEntry(entry.id, "drAmount", parseFloat(e.target.value) || 0)}
                className="h-10"
              />
            </div>
            <div className="col-span-2">
              <div className="relative">
                <Label className="absolute -top-2 left-2 bg-background px-1 text-xs text-muted-foreground z-10">amount</Label>
                <Input
                  value="0"
                  readOnly
                  className="h-10 bg-muted/30"
                />
              </div>
            </div>
            <div className="col-span-1 flex justify-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeDrEntry(entry.id)}
                disabled={drEntries.length === 1}
                className="h-8 w-8 text-destructive hover:bg-destructive/10"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}

        {/* Cr Entries */}
        {crEntries.map((entry) => (
          <div key={entry.id} className="grid grid-cols-12 gap-4 items-center">
            <div className="col-span-3">
              <SearchableSelect
                options={accounts}
                value={entry.account}
                onValueChange={(v) => updateCrEntry(entry.id, "account", v)}
                placeholder="Select..."
              />
            </div>
            <div className="col-span-4">
              <Input
                placeholder="Description"
                value={entry.description}
                onChange={(e) => updateCrEntry(entry.id, "description", e.target.value)}
                className="h-10"
              />
            </div>
            <div className="col-span-2">
              <div className="relative">
                <Label className="absolute -top-2 left-2 bg-background px-1 text-xs text-muted-foreground z-10">amount</Label>
                <Input
                  value="0"
                  readOnly
                  className="h-10 bg-muted/30"
                />
              </div>
            </div>
            <div className="col-span-2">
              <Input
                type="number"
                placeholder="amount"
                value={entry.crAmount || ""}
                onChange={(e) => updateCrEntry(entry.id, "crAmount", parseFloat(e.target.value) || 0)}
                className="h-10"
              />
            </div>
            <div className="col-span-1 flex justify-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeCrEntry(entry.id)}
                disabled={crEntries.length === 1}
                className="h-8 w-8 text-destructive hover:bg-destructive/10"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}

        {/* Total Amount */}
        <div className="grid grid-cols-12 gap-4 items-center">
          <div className="col-span-7 text-right">
            <Label className="text-base font-medium">Total Amount</Label>
          </div>
          <div className="col-span-2">
            <div className="relative">
              <Label className="absolute -top-2 left-2 bg-background px-1 text-xs text-muted-foreground z-10">Total Amount</Label>
              <Input
                value={totalDr}
                readOnly
                className="h-10 bg-muted/30 font-medium"
              />
            </div>
          </div>
          <div className="col-span-2">
            <div className="relative">
              <Label className="absolute -top-2 left-2 bg-background px-1 text-xs text-muted-foreground z-10">Total Amount</Label>
              <Input
                value={totalCr}
                readOnly
                className="h-10 bg-muted/30 font-medium"
              />
            </div>
          </div>
          <div className="col-span-1"></div>
        </div>

        {/* Add Buttons */}
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-7"></div>
          <div className="col-span-2">
            <Button
              onClick={addDrEntry}
              className="bg-primary hover:bg-primary/90 gap-2 w-full"
              size="sm"
            >
              <Plus className="w-4 h-4" />
              Add Dr
            </Button>
          </div>
          <div className="col-span-2">
            <Button
              onClick={addCrEntry}
              className="bg-primary hover:bg-primary/90 gap-2 w-full"
              size="sm"
            >
              <Plus className="w-4 h-4" />
              Add Cr
            </Button>
          </div>
          <div className="col-span-1"></div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2">
        <Button onClick={handleSave} variant="ghost" className="gap-2">
          <Save className="w-4 h-4" />
          Save
        </Button>
        <Button variant="ghost" size="icon">
          <MoreVertical className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
