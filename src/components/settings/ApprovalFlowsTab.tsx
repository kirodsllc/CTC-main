import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  GitBranch,
  Plus,
  Edit,
  Volume2,
  ChevronRight,
  ClipboardCheck
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ApprovalStep {
  role: string;
  action: string;
}

interface ApprovalFlow {
  id: string;
  name: string;
  status: "active" | "inactive";
  description: string;
  steps: ApprovalStep[];
  module: string;
  trigger: string;
  condition: string;
}

const initialFlows: ApprovalFlow[] = [];

interface PendingApproval {
  id: string;
  type: string;
  reference: string;
  requestedBy: string;
  date: string;
  amount?: number;
}

const pendingApprovals: PendingApproval[] = [];

export const ApprovalFlowsTab = () => {
  const [flows, setFlows] = useState<ApprovalFlow[]>(initialFlows);
  const [activeSubTab, setActiveSubTab] = useState<"flows" | "pending">("flows");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    module: "",
    trigger: "On Create",
    condition: "",
    steps: [{ role: "manager", action: "approve" }] as ApprovalStep[],
  });

  const handleSubmit = () => {
    if (!formData.name || !formData.module) {
      toast.error("Please fill required fields");
      return;
    }

    const newFlow: ApprovalFlow = {
      id: Date.now().toString(),
      name: formData.name,
      status: "active",
      description: formData.description,
      steps: formData.steps,
      module: formData.module,
      trigger: formData.trigger,
      condition: formData.condition,
    };
    setFlows([...flows, newFlow]);
    toast.success("Approval flow created successfully");
    setIsDialogOpen(false);
    setFormData({
      name: "",
      description: "",
      module: "",
      trigger: "On Create",
      condition: "",
      steps: [{ role: "manager", action: "approve" }],
    });
  };

  const addStep = () => {
    setFormData(prev => ({
      ...prev,
      steps: [...prev.steps, { role: "manager", action: "approve" }]
    }));
  };

  const removeStep = (index: number) => {
    setFormData(prev => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== index)
    }));
  };

  const updateStep = (index: number, field: keyof ApprovalStep, value: string) => {
    setFormData(prev => ({
      ...prev,
      steps: prev.steps.map((step, i) => i === index ? { ...step, [field]: value } : step)
    }));
  };

  return (
    <div className="space-y-4">
      {/* Sub Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab("flows")}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
              activeSubTab === "flows"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Approval Flows
          </button>
          <button
            onClick={() => setActiveSubTab("pending")}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2",
              activeSubTab === "pending"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Pending Approvals
            <Badge variant="secondary" className="text-xs">{pendingApprovals.length}</Badge>
          </button>
        </div>
        {activeSubTab === "flows" && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Create Flow
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Approval Flow</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Flow Name *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter flow name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Module *</Label>
                    <Select value={formData.module} onValueChange={(v) => setFormData({ ...formData, module: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select module" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Purchase Orders">Purchase Orders</SelectItem>
                        <SelectItem value="Sales">Sales</SelectItem>
                        <SelectItem value="Inventory">Inventory</SelectItem>
                        <SelectItem value="Customers">Customers</SelectItem>
                        <SelectItem value="Expenses">Expenses</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe the approval flow"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Trigger</Label>
                    <Select value={formData.trigger} onValueChange={(v) => setFormData({ ...formData, trigger: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="On Create">On Create</SelectItem>
                        <SelectItem value="On Update">On Update</SelectItem>
                        <SelectItem value="On Delete">On Delete</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Condition</Label>
                    <Input
                      value={formData.condition}
                      onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                      placeholder="e.g., amount > 50000"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Approval Steps</Label>
                    <Button variant="outline" size="sm" onClick={addStep}>
                      <Plus className="w-4 h-4 mr-1" /> Add Step
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {formData.steps.map((step, index) => (
                      <div key={index} className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30">
                        <span className="text-sm text-muted-foreground">Step {index + 1}:</span>
                        <Select value={step.role} onValueChange={(v) => updateStep(index, "role", v)}>
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="accountant">Accountant</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={step.action} onValueChange={(v) => updateStep(index, "action", v)}>
                          <SelectTrigger className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="review">Review</SelectItem>
                            <SelectItem value="approve">Approve</SelectItem>
                          </SelectContent>
                        </Select>
                        {formData.steps.length > 1 && (
                          <Button variant="ghost" size="sm" className="text-destructive ml-auto" onClick={() => removeStep(index)}>
                            Remove
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleSubmit}>Create Flow</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Content */}
      {activeSubTab === "flows" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {flows.map((flow) => (
            <Card key={flow.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <ClipboardCheck className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{flow.name}</h3>
                      <Badge variant={flow.status === "active" ? "default" : "secondary"} className="text-xs mt-1">
                        {flow.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Volume2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{flow.description}</p>
                
                {/* Approval Steps */}
                <div className="mb-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">APPROVAL STEPS</p>
                  <div className="flex items-center flex-wrap gap-1">
                    {flow.steps.map((step, index) => (
                      <div key={index} className="flex items-center">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {step.role} ({step.action})
                        </Badge>
                        {index < flow.steps.length - 1 && (
                          <ChevronRight className="w-4 h-4 text-muted-foreground mx-1" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                  <span>Module: {flow.module}{flow.condition && ` • ${flow.condition}`}</span>
                  <span>Trigger: {flow.trigger}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 text-sm font-medium">Type</th>
                  <th className="text-left p-4 text-sm font-medium">Reference</th>
                  <th className="text-left p-4 text-sm font-medium">Requested By</th>
                  <th className="text-left p-4 text-sm font-medium">Date</th>
                  <th className="text-left p-4 text-sm font-medium">Amount</th>
                  <th className="text-right p-4 text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingApprovals.map((item) => (
                  <tr key={item.id} className="border-t">
                    <td className="p-4 text-sm">{item.type}</td>
                    <td className="p-4 text-sm font-medium">{item.reference}</td>
                    <td className="p-4 text-sm">{item.requestedBy}</td>
                    <td className="p-4 text-sm">{item.date}</td>
                    <td className="p-4 text-sm">{item.amount ? `$${item.amount.toLocaleString()}` : "-"}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="outline">Review</Button>
                        <Button size="sm">Approve</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
