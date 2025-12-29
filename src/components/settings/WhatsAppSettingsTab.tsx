import { useState } from "react";
import { MessageCircle, Save, Eye, EyeOff, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

export const WhatsAppSettingsTab = () => {
  const [appKey, setAppKey] = useState("");
  const [authKey, setAuthKey] = useState("");
  const [showAppKey, setShowAppKey] = useState(false);
  const [showAuthKey, setShowAuthKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    
    // Simulate save operation
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast({
      title: "Settings Saved",
      description: "WhatsApp API settings have been saved successfully.",
    });
    
    setIsSaving(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <CardTitle>WhatsApp API Configuration</CardTitle>
              <CardDescription>
                Configure your WhatsApp API credentials for messaging integration
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="appKey">App Key</Label>
              <div className="relative">
                <Input
                  id="appKey"
                  type={showAppKey ? "text" : "password"}
                  value={appKey}
                  onChange={(e) => setAppKey(e.target.value)}
                  placeholder="Enter your WhatsApp App Key"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowAppKey(!showAppKey)}
                >
                  {showAppKey ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Your unique application identifier for WhatsApp API
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="authKey">Auth Key</Label>
              <div className="relative">
                <Input
                  id="authKey"
                  type={showAuthKey ? "text" : "password"}
                  value={authKey}
                  onChange={(e) => setAuthKey(e.target.value)}
                  placeholder="Enter your WhatsApp Auth Key"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowAuthKey(!showAuthKey)}
                >
                  {showAuthKey ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Your authentication key for secure API access
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 pt-4 border-t">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>Saving...</>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Settings
                </>
              )}
            </Button>
            
            {appKey && authKey && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="w-4 h-4" />
                <span>API credentials configured</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Integration Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
            <div>
              <p className="text-sm font-medium">WhatsApp API Connected</p>
              <p className="text-xs text-muted-foreground">
                Your WhatsApp integration is active and ready to send messages
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
