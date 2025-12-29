import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, MoreVertical, Eye, Download } from "lucide-react";
import { toast } from "sonner";

interface MainGroup {
  id: string;
  code: string;
  name: string;
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export const MainGroupsTab = () => {
  const [mainGroups, setMainGroups] = useState<MainGroup[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [pageSize, setPageSize] = useState("10");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMainGroups();
  }, []);

  const fetchMainGroups = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/accounting/main-groups`);
      if (response.ok) {
        const data = await response.json();
        setMainGroups(data);
      } else {
        toast.error("Failed to load main groups");
      }
    } catch (error) {
      console.error("Error fetching main groups:", error);
      toast.error("Error loading main groups");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(mainGroups.map((g) => g.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedItems([...selectedItems, id]);
    } else {
      setSelectedItems(selectedItems.filter((item) => item !== id));
    }
  };

  const handleViewChartOfAccounts = () => {
    // Generate HTML for chart of accounts
    const chartHTML = `
      <html>
        <head>
          <title>Chart of Accounts</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { text-align: center; color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f4f4f4; }
          </style>
        </head>
        <body>
          <h1>Chart of Accounts</h1>
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Main Group Name</th>
              </tr>
            </thead>
            <tbody>
              ${mainGroups.map(g => `
                <tr>
                  <td>${g.code}</td>
                  <td>${g.name}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(chartHTML);
      printWindow.document.close();
      printWindow.print();
    }
    toast.success("Chart of Accounts opened in new window");
  };

  const handleSavePdf = () => {
    // Generate CSV export
    const csvContent = [
      ["Code", "Main Group Name"].join(","),
      ...mainGroups.map(g => [g.code, g.name].join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `chart_of_accounts_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Chart of Accounts exported successfully!");
  };

  return (
    <Card className="border-border/50 shadow-sm transition-all duration-300 hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-destructive" />
          <CardTitle className="text-lg font-semibold">Main Groups</CardTitle>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="bg-primary text-primary-foreground hover:bg-primary/90">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-card border-border z-50">
            <DropdownMenuItem onClick={handleViewChartOfAccounts} className="cursor-pointer">
              <Eye className="h-4 w-4 mr-2" />
              View Chart of Accounts
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSavePdf} className="cursor-pointer">
              <Download className="h-4 w-4 mr-2" />
              Save pdf Chart of Accounts
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="p-3 text-left w-12">
                  <Checkbox
                    checked={selectedItems.length === mainGroups.length}
                    onCheckedChange={handleSelectAll}
                  />
                </th>
                <th className="p-3 text-left font-medium text-primary underline cursor-pointer hover:text-primary/80 transition-colors">
                  Code
                </th>
                <th className="p-3 text-left font-medium text-primary underline cursor-pointer hover:text-primary/80 transition-colors">
                  Main Group Name
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={3} className="p-3 text-center text-muted-foreground">
                    Loading...
                  </td>
                </tr>
              ) : mainGroups.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-3 text-center text-muted-foreground">
                    No main groups found
                  </td>
                </tr>
              ) : (
                mainGroups.map((group, index) => (
                <tr
                  key={group.id}
                  className={`border-b border-border/50 transition-colors duration-200 hover:bg-muted/30 ${
                    index % 2 === 0 ? "bg-muted/10" : ""
                  }`}
                >
                  <td className="p-3">
                    <Checkbox
                      checked={selectedItems.includes(group.id)}
                      onCheckedChange={(checked) =>
                        handleSelectItem(group.id, checked as boolean)
                      }
                    />
                  </td>
                  <td className="p-3 text-primary font-medium">{group.code}</td>
                  <td className="p-3 text-primary font-medium">{group.name}</td>
                </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-4">
          <p className="text-sm text-muted-foreground">
            Showing <span className="text-primary">{mainGroups.length > 0 ? 1 : 0}</span> to{" "}
            <span className="text-primary">{mainGroups.length}</span> of{" "}
            <span className="text-primary">{mainGroups.length}</span> items
          </p>
          <Select value={pageSize} onValueChange={setPageSize}>
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border-border z-50">
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
};
