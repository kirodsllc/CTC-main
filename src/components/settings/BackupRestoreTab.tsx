import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Label } from "@/components/ui/label";
import { 
  Database,
  CheckCircle,
  HardDrive,
  Clock,
  Plus,
  Download,
  Trash2,
  RotateCcw,
  Archive
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Backup {
  id: string;
  name: string;
  tables: string;
  type: "full" | "incremental";
  size: string;
  status: "completed" | "failed" | "in_progress";
  createdAt: string;
  createdBy: string;
}

interface Schedule {
  id: string;
  name: string;
  frequency: string;
  tables: string[];
  time: string;
  status: "active" | "inactive";
  lastRun: string;
  nextRun: string;
}

const initialBackups: Backup[] = [];

const initialSchedules: Schedule[] = [];

const allTables = ["parts", "inventory", "sales", "customers", "suppliers", "expenses", "users", "settings"];

export const BackupRestoreTab = () => {
  const [backups, setBackups] = useState<Backup[]>(initialBackups);
  const [schedules] = useState<Schedule[]>(initialSchedules);
  const [activeSubTab, setActiveSubTab] = useState<"backups" | "schedules" | "restore">("backups");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: "full" as "full" | "incremental",
    tables: [] as string[],
  });

  const stats = {
    total: backups.length,
    successful: backups.filter(b => b.status === "completed").length,
    storageUsed: "769 MB",
    activeSchedules: schedules.filter(s => s.status === "active").length,
  };

  const handleCreateBackup = () => {
    if (!formData.name) {
      toast.error("Please enter backup name");
      return;
    }

    const newBackup: Backup = {
      id: Date.now().toString(),
      name: formData.name,
      tables: formData.type === "full" ? "All Tables" : formData.tables.join(", "),
      type: formData.type,
      size: "Calculating...",
      status: "in_progress",
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
      createdBy: "Admin User",
    };
    setBackups([newBackup, ...backups]);
    toast.success("Backup started");
    setIsDialogOpen(false);
    setFormData({ name: "", type: "full", tables: [] });

    // Simulate backup completion
    setTimeout(() => {
      setBackups(prev => prev.map(b => 
        b.id === newBackup.id 
          ? { ...b, status: "completed" as const, size: `${Math.floor(Math.random() * 100 + 50)} MB` }
          : b
      ));
      toast.success("Backup completed successfully");
    }, 3000);
  };

  const handleRestore = (backup: Backup) => {
    toast.success(`Restoring from: ${backup.name}`);
  };

  const handleDelete = (id: string) => {
    setBackups(backups.filter(b => b.id !== id));
    toast.success("Backup deleted");
  };

  const toggleTable = (table: string) => {
    setFormData(prev => ({
      ...prev,
      tables: prev.tables.includes(table)
        ? prev.tables.filter(t => t !== table)
        : [...prev.tables, table]
    }));
  };

  const handleExportCSV = () => {
    const csvContent = [
      ["Backup Name", "Type", "Tables", "Size", "Status", "Created At", "Created By"],
      ...backups.map(backup => [
        backup.name, backup.type, backup.tables, backup.size, backup.status, backup.createdAt, backup.createdBy
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "backups_export.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Backups exported successfully");
  };

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs opacity-80">Total Backups</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <Database className="w-8 h-8 opacity-80" />
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-0">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs opacity-80">Successful</p>
              <p className="text-2xl font-bold">{stats.successful}</p>
            </div>
            <CheckCircle className="w-8 h-8 opacity-80" />
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs opacity-80">Storage Used</p>
              <p className="text-2xl font-bold">{stats.storageUsed}</p>
            </div>
            <HardDrive className="w-8 h-8 opacity-80" />
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs opacity-80">Active Schedules</p>
              <p className="text-2xl font-bold">{stats.activeSchedules}</p>
            </div>
            <Clock className="w-8 h-8 opacity-80" />
          </CardContent>
        </Card>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {["backups", "schedules", "restore"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveSubTab(tab as typeof activeSubTab)}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-lg transition-colors capitalize",
                activeSubTab === tab
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
        {activeSubTab === "backups" && (
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={handleExportCSV}>
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Create Backup
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Backup</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Backup Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter backup name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Backup Type</Label>
                  <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v as "full" | "incremental" })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">Full Backup</SelectItem>
                      <SelectItem value="incremental">Incremental</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.type === "incremental" && (
                  <div className="space-y-2">
                    <Label>Select Tables</Label>
                    <div className="grid grid-cols-2 gap-2 p-3 border rounded-lg bg-muted/30">
                      {allTables.map((table) => (
                        <div key={table} className="flex items-center space-x-2">
                          <Checkbox
                            id={table}
                            checked={formData.tables.includes(table)}
                            onCheckedChange={() => toggleTable(table)}
                          />
                          <label htmlFor={table} className="text-sm capitalize cursor-pointer">
                            {table}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreateBackup}>Create Backup</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        )}
      </div>

      {/* Content */}
      {activeSubTab === "backups" && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>BACKUP NAME</TableHead>
                  <TableHead>TYPE</TableHead>
                  <TableHead>SIZE</TableHead>
                  <TableHead>STATUS</TableHead>
                  <TableHead>CREATED</TableHead>
                  <TableHead>CREATED BY</TableHead>
                  <TableHead className="text-right">ACTIONS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {backups.map((backup) => (
                  <TableRow key={backup.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Archive className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">{backup.name}</p>
                          <p className="text-xs text-muted-foreground">{backup.tables}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={backup.type === "full" ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700"}>
                        {backup.type === "full" ? "Full" : "Incremental"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{backup.size}</TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          backup.status === "completed" && "bg-emerald-50 text-emerald-700",
                          backup.status === "failed" && "bg-red-50 text-red-700",
                          backup.status === "in_progress" && "bg-amber-50 text-amber-700"
                        )}
                      >
                        {backup.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{backup.createdAt}</TableCell>
                    <TableCell className="text-sm">{backup.createdBy}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        {backup.status === "completed" && (
                          <>
                            <Button variant="outline" size="sm" onClick={() => handleRestore(backup)}>
                              Restore
                            </Button>
                            <Button variant="ghost" size="icon">
                              <Download className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(backup.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {activeSubTab === "schedules" && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SCHEDULE NAME</TableHead>
                  <TableHead>FREQUENCY</TableHead>
                  <TableHead>TIME</TableHead>
                  <TableHead>TABLES</TableHead>
                  <TableHead>STATUS</TableHead>
                  <TableHead>LAST RUN</TableHead>
                  <TableHead>NEXT RUN</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((schedule) => (
                  <TableRow key={schedule.id}>
                    <TableCell className="font-medium text-sm">{schedule.name}</TableCell>
                    <TableCell className="text-sm">{schedule.frequency}</TableCell>
                    <TableCell className="text-sm">{schedule.time}</TableCell>
                    <TableCell className="text-sm">{schedule.tables.join(", ")}</TableCell>
                    <TableCell>
                      <Badge variant={schedule.status === "active" ? "default" : "secondary"}>
                        {schedule.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{schedule.lastRun}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{schedule.nextRun}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {activeSubTab === "restore" && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8">
              <RotateCcw className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Restore from Backup</h3>
              <p className="text-muted-foreground mb-4">Select a backup from the Backups tab and click "Restore" to restore your data.</p>
              <Button variant="outline" onClick={() => setActiveSubTab("backups")}>
                Go to Backups
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
