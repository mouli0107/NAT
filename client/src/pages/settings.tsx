import { useState } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useBranding } from "@/contexts/BrandingContext";
import { 
  Cog,
  Bell,
  Palette,
  TestTube2,
  Link2,
  User,
  Save,
  Moon,
  Sun,
  Monitor
} from "lucide-react";

export default function SettingsPage() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { toast } = useToast();
  const { brand } = useBranding();
  
  const [settings, setSettings] = useState(() => {
    const savedDomain = localStorage.getItem("defaultDomain");
    return {
      defaultDomain: savedDomain || 'insurance',
      defaultCoverageLevel: 'comprehensive',
      autoSaveInterval: '30',
      dateFormat: 'MM/DD/YYYY',
      emailNotifications: true,
      notifyGeneration: true,
      notifyExecution: true,
      notifySync: true,
      notifyErrors: true,
      theme: 'dark',
      sidebarCollapsed: false,
      itemsPerPage: '25',
      defaultTestTypes: ['functional', 'negative', 'edge'],
      defaultModule: 'autonomous'
    };
  });

  const handleSave = () => {
    toast({
      title: "Settings saved",
      description: "Your preferences have been updated successfully."
    });
  };

  return (
    <div className="h-full bg-background flex">
      <Sidebar
        activeView="testing"
        onViewChange={() => {}}
        isRunning={false}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader />
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
                  <Cog className="w-7 h-7 text-primary" />
                  Settings
                </h1>
                <p className="text-muted-foreground mt-1">Configure your {brand.platformShortName} preferences</p>
              </div>
              <Button onClick={handleSave} data-testid="button-save-settings">
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </div>

            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Cog className="w-5 h-5 text-primary" />
                  General Settings
                </CardTitle>
                <CardDescription>Basic application preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="default-domain">Default Domain</Label>
                    <Select 
                      value={settings.defaultDomain} 
                      onValueChange={(value) => {
                        setSettings({...settings, defaultDomain: value});
                        localStorage.setItem("defaultDomain", value);
                      }}
                    >
                      <SelectTrigger id="default-domain" data-testid="select-default-domain">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="insurance">Insurance</SelectItem>
                        <SelectItem value="healthcare">Healthcare</SelectItem>
                        <SelectItem value="banking">Banking & Finance</SelectItem>
                        <SelectItem value="ecommerce">E-Commerce</SelectItem>
                        <SelectItem value="general">General</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="coverage-level">Default Coverage Level</Label>
                    <Select 
                      value={settings.defaultCoverageLevel} 
                      onValueChange={(value) => setSettings({...settings, defaultCoverageLevel: value})}
                    >
                      <SelectTrigger id="coverage-level" data-testid="select-coverage-level">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="basic">Basic</SelectItem>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="comprehensive">Comprehensive</SelectItem>
                        <SelectItem value="exhaustive">Exhaustive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="auto-save">Auto-save Interval (seconds)</Label>
                    <Select 
                      value={settings.autoSaveInterval} 
                      onValueChange={(value) => setSettings({...settings, autoSaveInterval: value})}
                    >
                      <SelectTrigger id="auto-save" data-testid="select-auto-save">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 seconds</SelectItem>
                        <SelectItem value="30">30 seconds</SelectItem>
                        <SelectItem value="60">1 minute</SelectItem>
                        <SelectItem value="300">5 minutes</SelectItem>
                        <SelectItem value="0">Disabled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date-format">Date/Time Format</Label>
                    <Select 
                      value={settings.dateFormat} 
                      onValueChange={(value) => setSettings({...settings, dateFormat: value})}
                    >
                      <SelectTrigger id="date-format" data-testid="select-date-format">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                        <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                        <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bell className="w-5 h-5 text-primary" />
                  Notification Settings
                </CardTitle>
                <CardDescription>Configure how you receive updates</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Email Notifications</p>
                    <p className="text-sm text-muted-foreground">Receive email updates for important events</p>
                  </div>
                  <Switch 
                    checked={settings.emailNotifications}
                    onCheckedChange={(checked) => setSettings({...settings, emailNotifications: checked})}
                    data-testid="switch-email-notifications"
                  />
                </div>
                <Separator />
                <div className="space-y-4">
                  <p className="text-sm font-medium text-muted-foreground">Notification Types</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
                      <span className="text-sm text-foreground">Generation complete</span>
                      <Switch 
                        checked={settings.notifyGeneration}
                        onCheckedChange={(checked) => setSettings({...settings, notifyGeneration: checked})}
                        data-testid="switch-notify-generation"
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
                      <span className="text-sm text-foreground">Execution complete</span>
                      <Switch 
                        checked={settings.notifyExecution}
                        onCheckedChange={(checked) => setSettings({...settings, notifyExecution: checked})}
                        data-testid="switch-notify-execution"
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
                      <span className="text-sm text-foreground">Sync complete</span>
                      <Switch 
                        checked={settings.notifySync}
                        onCheckedChange={(checked) => setSettings({...settings, notifySync: checked})}
                        data-testid="switch-notify-sync"
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
                      <span className="text-sm text-foreground">Errors/failures</span>
                      <Switch 
                        checked={settings.notifyErrors}
                        onCheckedChange={(checked) => setSettings({...settings, notifyErrors: checked})}
                        data-testid="switch-notify-errors"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Palette className="w-5 h-5 text-primary" />
                  Display Settings
                </CardTitle>
                <CardDescription>Customize the appearance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Label>Theme</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'light', icon: Sun, label: 'Light' },
                      { id: 'dark', icon: Moon, label: 'Dark' },
                      { id: 'system', icon: Monitor, label: 'System' },
                    ].map((theme) => (
                      <button
                        key={theme.id}
                        onClick={() => setSettings({...settings, theme: theme.id})}
                        className={`p-4 rounded-lg border transition-all flex flex-col items-center gap-2 ${
                          settings.theme === theme.id 
                            ? 'border-primary bg-primary/10' 
                            : 'border-border/50 bg-background/50 hover:border-primary/50'
                        }`}
                        data-testid={`button-theme-${theme.id}`}
                      >
                        <theme.icon className="w-5 h-5" />
                        <span className="text-sm font-medium">{theme.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">Sidebar collapsed by default</p>
                      <p className="text-sm text-muted-foreground">Start with minimized sidebar</p>
                    </div>
                    <Switch 
                      checked={settings.sidebarCollapsed}
                      onCheckedChange={(checked) => setSettings({...settings, sidebarCollapsed: checked})}
                      data-testid="switch-sidebar-collapsed"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="items-per-page">Items per page</Label>
                    <Select 
                      value={settings.itemsPerPage} 
                      onValueChange={(value) => setSettings({...settings, itemsPerPage: value})}
                    >
                      <SelectTrigger id="items-per-page" data-testid="select-items-per-page">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10 items</SelectItem>
                        <SelectItem value="25">25 items</SelectItem>
                        <SelectItem value="50">50 items</SelectItem>
                        <SelectItem value="100">100 items</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TestTube2 className="w-5 h-5 text-primary" />
                  Default Test Generation Settings
                </CardTitle>
                <CardDescription>Configure default test generation options</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="default-module">Default Module</Label>
                    <Select 
                      value={settings.defaultModule} 
                      onValueChange={(value) => setSettings({...settings, defaultModule: value})}
                    >
                      <SelectTrigger id="default-module" data-testid="select-default-module">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="autonomous">Autonomous Testing</SelectItem>
                        <SelectItem value="stories">Generate from User Stories</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Default Test Types</Label>
                    <p className="text-xs text-muted-foreground">Pre-selected when generating tests</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Link2 className="w-5 h-5 text-primary" />
                  Integration Settings
                </CardTitle>
                <CardDescription>Manage external connections</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 rounded-lg bg-background/50">
                  <div>
                    <p className="font-medium text-foreground">Integration Management</p>
                    <p className="text-sm text-muted-foreground">Manage Azure DevOps, JIRA, and other integrations</p>
                  </div>
                  <Button variant="outline" asChild data-testid="button-manage-integrations">
                    <a href="/integration-management">Manage</a>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  Account Settings
                </CardTitle>
                <CardDescription>Manage your account</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="display-name">Display Name</Label>
                    <Input id="display-name" defaultValue="Demo User" data-testid="input-display-name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" defaultValue="demo@example.com" data-testid="input-email" />
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" data-testid="button-change-password">
                    Change Password
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
