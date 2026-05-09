import { useState, useEffect, useCallback } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
  Monitor,
  Download,
  Chrome,
  Cpu,
  CheckCircle2,
  XCircle,
  RefreshCw,
  FolderSync,
  Key,
  Terminal,
  UserPlus,
  Trash2,
  Users,
  RotateCcw,
  ShieldCheck,
  Layers
} from "lucide-react";

// ── Module definitions ─────────────────────────────────────────────────────────
const ALL_MODULES = [
  { id: 'recorder',           label: 'Recording Studio' },
  { id: 'test-library',       label: 'Test Library' },
  { id: 'test-management',    label: 'Test Management' },
  { id: 'functional-testing', label: 'Autonomous Testing' },
  { id: 'sprint-agent',       label: 'Generate from User Stories' },
  { id: 'execution-mode',     label: 'Execution Mode' },
  { id: 'visual-regression',  label: 'Visual Regression' },
  { id: 'synthetic-data',     label: 'Synthetic Data' },
  { id: 'nradiverse',         label: 'AI Quality Engine' },
  { id: 'reports',            label: 'Reports & Analytics' },
  { id: 'import-export',      label: 'Import/Export' },
  { id: 'projects',           label: 'Project History' },
  { id: 'architecture',       label: 'Architecture Diagram' },
];

const ALWAYS_ON_MODULES = [
  { id: 'dashboard',               label: 'Dashboard' },
  { id: 'framework-config',        label: 'Framework Catalog' },
  { id: 'integration-management',  label: 'Integrations' },
  { id: 'settings',                label: 'Settings' },
  { id: 'help',                    label: 'Help & Guidance' },
];

interface AgentStatusData {
  total: number;
  idle: number;
  busy: number;
  agents: Array<{ agentId: string; hostname: string; status: string }>;
}

interface WorkspaceAgentStatusData {
  total: number;
  agents: Array<{ agentId: string; tenantId: string; hostname: string; workspaceDir: string; connectedSince: string }>;
}

export default function SettingsPage() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { toast } = useToast();
  const { brand } = useBranding();
  const [agentStatus, setAgentStatus] = useState<AgentStatusData | null>(null);
  const [agentStatusLoading, setAgentStatusLoading] = useState(false);
  const [workspaceAgentStatus, setWorkspaceAgentStatus] = useState<WorkspaceAgentStatusData | null>(null);
  const [deviceCodeInput, setDeviceCodeInput] = useState('');
  const [deviceCodeApproving, setDeviceCodeApproving] = useState(false);

  const fetchAgentStatus = () => {
    setAgentStatusLoading(true);
    fetch('/api/execution-agent/status')
      .then(r => r.json())
      .then((data: AgentStatusData) => setAgentStatus(data))
      .catch(() => setAgentStatus(null))
      .finally(() => setAgentStatusLoading(false));
  };

  const fetchWorkspaceAgentStatus = () => {
    fetch('/api/workspace-agent/status')
      .then(r => r.json())
      .then((data: WorkspaceAgentStatusData) => setWorkspaceAgentStatus(data))
      .catch(() => setWorkspaceAgentStatus(null));
  };

  // ── User Management State ─────────────────────────────────────────────────
  interface ManagedUser { id: string; username: string; tenantId: string; allowedModules: string[] | null; }
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [resetPasswordUserId, setResetPasswordUserId] = useState<string | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  // Module selection for new user (null = full access, array = restricted)
  const [newUserModules, setNewUserModules] = useState<string[]>(ALL_MODULES.map(m => m.id));
  const [newUserFullAccess, setNewUserFullAccess] = useState(false);
  // Edit modules dialog for existing user
  const [editModulesUserId, setEditModulesUserId] = useState<string | null>(null);
  const [editModulesList, setEditModulesList] = useState<string[]>([]);
  const [editModulesFullAccess, setEditModulesFullAccess] = useState(false);
  const [savingModules, setSavingModules] = useState(false);

  const fetchUsers = () => {
    setUsersLoading(true);
    fetch('/api/users')
      .then(r => r.json())
      .then((data: ManagedUser[]) => setUsers(Array.isArray(data) ? data : []))
      .catch(() => setUsers([]))
      .finally(() => setUsersLoading(false));
  };

  const createUser = () => {
    if (!newUsername.trim() || !newPassword) return;
    if (newPassword.length < 8) {
      toast({ title: 'Password too short', description: 'Minimum 8 characters', variant: 'destructive' });
      return;
    }
    setCreatingUser(true);
    fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: newUsername.trim(),
        password: newPassword,
        allowedModules: newUserFullAccess ? null : newUserModules,
      }),
    })
      .then(r => r.json())
      .then((data) => {
        if (data.id) {
          toast({ title: 'User created', description: `${data.username} can now log in` });
          setNewUsername('');
          setNewPassword('');
          setNewUserModules(ALL_MODULES.map(m => m.id));
          setNewUserFullAccess(false);
          fetchUsers();
        } else {
          toast({ title: 'Failed to create user', description: data.error, variant: 'destructive' });
        }
      })
      .catch(() => toast({ title: 'Error', description: 'Failed to create user', variant: 'destructive' }))
      .finally(() => setCreatingUser(false));
  };

  const openEditModules = (u: ManagedUser) => {
    setEditModulesUserId(u.id);
    setEditModulesFullAccess(u.allowedModules === null);
    setEditModulesList(u.allowedModules ?? ALL_MODULES.map(m => m.id));
  };

  const saveModules = () => {
    if (!editModulesUserId) return;
    setSavingModules(true);
    fetch(`/api/users/${editModulesUserId}/modules`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modules: editModulesFullAccess ? null : editModulesList }),
    })
      .then(r => r.json())
      .then((data) => {
        if (data.success) {
          toast({ title: 'Access updated', description: 'Module access saved' });
          setEditModulesUserId(null);
          fetchUsers();
        } else {
          toast({ title: 'Failed', description: data.error, variant: 'destructive' });
        }
      })
      .catch(() => toast({ title: 'Error', description: 'Failed to update modules', variant: 'destructive' }))
      .finally(() => setSavingModules(false));
  };

  const toggleModule = useCallback((id: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.includes(id) ? list.filter(m => m !== id) : [...list, id]);
  }, []);

  const deleteUser = (userId: string, username: string) => {
    if (!confirm(`Remove user "${username}"? This cannot be undone.`)) return;
    fetch(`/api/users/${userId}`, { method: 'DELETE' })
      .then(r => r.json())
      .then((data) => {
        if (data.success) {
          toast({ title: 'User removed', description: `${username} has been deleted` });
          fetchUsers();
        } else {
          toast({ title: 'Failed', description: data.error, variant: 'destructive' });
        }
      })
      .catch(() => toast({ title: 'Error', description: 'Failed to delete user', variant: 'destructive' }));
  };

  const resetPassword = (userId: string) => {
    if (!resetPasswordValue || resetPasswordValue.length < 8) {
      toast({ title: 'Password too short', description: 'Minimum 8 characters', variant: 'destructive' });
      return;
    }
    fetch(`/api/users/${userId}/password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: resetPasswordValue }),
    })
      .then(r => r.json())
      .then((data) => {
        if (data.success) {
          toast({ title: 'Password reset', description: 'Password updated successfully' });
          setResetPasswordUserId(null);
          setResetPasswordValue('');
        } else {
          toast({ title: 'Failed', description: data.error, variant: 'destructive' });
        }
      })
      .catch(() => toast({ title: 'Error', description: 'Failed to reset password', variant: 'destructive' }));
  };

  const approveDeviceCode = () => {
    const code = deviceCodeInput.trim().toUpperCase();
    if (!code) return;
    setDeviceCodeApproving(true);
    fetch('/api/auth/device/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userCode: code }),
    })
      .then(r => r.json())
      .then((data) => {
        if (data.success) {
          toast({ title: 'Workspace Agent Authorized', description: `Code ${code} approved. The agent will connect shortly.` });
          setDeviceCodeInput('');
          setTimeout(fetchWorkspaceAgentStatus, 2000);
        } else {
          toast({ title: 'Authorization Failed', description: data.error || 'Code not found or expired', variant: 'destructive' });
        }
      })
      .catch(() => toast({ title: 'Error', description: 'Failed to approve device code', variant: 'destructive' }))
      .finally(() => setDeviceCodeApproving(false));
  };

  useEffect(() => {
    fetchAgentStatus();
    fetchWorkspaceAgentStatus();
    fetchUsers();
    const interval = setInterval(() => {
      fetchAgentStatus();
      fetchWorkspaceAgentStatus();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

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
    <>
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
          <div className="w-full space-y-6">
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

            {/* ── Desktop Setup ─────────────────────────────────────────────── */}
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Download className="w-5 h-5 text-primary" />
                  Desktop Setup
                </CardTitle>
                <CardDescription>
                  Install the Chrome Extension for browser recording and the Remote Agent for local test execution
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">

                {/* Chrome Extension */}
                <div className="rounded-lg border border-border/50 bg-background/50 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Chrome className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Chrome / Edge Extension</p>
                        <p className="text-sm text-muted-foreground">
                          Captures clicks, fills, and navigation events and streams them to {brand.platformShortName} in real time
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                      onClick={() => { window.location.href = '/api/downloads/chrome-extension'; }}
                      data-testid="button-download-extension"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download ZIP
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1 pl-14">
                    <p>1. Download and unzip <code className="bg-muted px-1 rounded">nat20-chrome-extension.zip</code></p>
                    <p>2. Open Chrome → <code className="bg-muted px-1 rounded">chrome://extensions</code> → enable <strong>Developer mode</strong></p>
                    <p>3. Click <strong>Load unpacked</strong> and select the unzipped folder</p>
                    <p>4. Click the ASTRA QE icon, enter the server URL, and join a session code from the Recorder page</p>
                  </div>
                </div>

                <Separator />

                {/* Remote Agent */}
                <div className="rounded-lg border border-border/50 bg-background/50 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Cpu className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Remote Execution Agent</p>
                        <p className="text-sm text-muted-foreground">
                          Runs Playwright tests on your local machine and streams results back to {brand.platformShortName}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                      onClick={() => { window.location.href = '/api/downloads/remote-agent'; }}
                      data-testid="button-download-agent"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download ZIP
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1 pl-14">
                    <p>1. Download and unzip <code className="bg-muted px-1 rounded">nat20-remote-agent.zip</code></p>
                    <p>2. Double-click <code className="bg-muted px-1 rounded">start.bat</code> (Windows) or run <code className="bg-muted px-1 rounded">bash start.sh</code> (Mac/Linux)</p>
                    <p>3. <em>Server URL is pre-configured in the ZIP — no manual setup needed</em></p>
                    <p>4. The agent appears as <strong>Connected</strong> in the status panel below once running</p>
                  </div>
                </div>

                <Separator />

                {/* Workspace Agent */}
                <div className="rounded-lg border border-border/50 bg-background/50 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <FolderSync className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Workspace Agent</p>
                        <p className="text-sm text-muted-foreground">
                          Syncs generated test scripts to your local machine so Claude Code can iterate on them
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                      onClick={() => { window.location.href = '/api/downloads/workspace-agent'; }}
                      data-testid="button-download-workspace-agent"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download ZIP
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1 pl-14">
                    <p>1. Download and unzip <code className="bg-muted px-1 rounded">nat20-workspace-agent.zip</code></p>
                    <p>2. <code className="bg-muted px-1 rounded">cd nat20-workspace-agent &amp;&amp; npm install</code></p>
                    <p>3. <code className="bg-muted px-1 rounded">npx tsx agent.ts login --server=https://your-server</code></p>
                    <p>4. Enter the device code shown below when prompted, then run <code className="bg-muted px-1 rounded">npx tsx agent.ts</code></p>
                  </div>

                  {/* Device Code Approval */}
                  <div className="mt-3 pt-3 border-t border-border/40 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Key className="w-3 h-3" />
                      <span className="font-medium">Authorize Workspace Agent</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Enter code from agent CLI (e.g. ABCD-1234)"
                        value={deviceCodeInput}
                        onChange={(e) => setDeviceCodeInput(e.target.value.toUpperCase())}
                        className="font-mono text-sm h-8"
                        maxLength={9}
                        data-testid="input-device-code"
                        onKeyDown={(e) => { if (e.key === 'Enter') approveDeviceCode(); }}
                      />
                      <Button
                        size="sm"
                        onClick={approveDeviceCode}
                        disabled={!deviceCodeInput.trim() || deviceCodeApproving}
                        data-testid="button-approve-device-code"
                      >
                        {deviceCodeApproving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
                        Approve
                      </Button>
                    </div>
                  </div>

                  {/* Connected Workspace Agents */}
                  {workspaceAgentStatus !== null && workspaceAgentStatus.total > 0 && (
                    <div className="mt-3 pt-3 border-t border-border/40 space-y-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Terminal className="w-3 h-3" />
                        <span className="font-medium">{workspaceAgentStatus.total} Workspace Agent{workspaceAgentStatus.total !== 1 ? 's' : ''} Connected</span>
                      </div>
                      {workspaceAgentStatus.agents.map((a) => (
                        <div key={a.agentId} className="flex items-center justify-between p-2 rounded bg-background/50 border border-border/30 text-xs">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
                            <span className="font-medium">{a.hostname}</span>
                            <span className="text-muted-foreground">{a.workspaceDir}</span>
                          </div>
                          <span className="text-muted-foreground">{a.tenantId}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Execution Agent Status */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">Connected Execution Agents</p>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={fetchAgentStatus}
                      disabled={agentStatusLoading}
                      data-testid="button-refresh-agent-status"
                    >
                      <RefreshCw className={`w-3 h-3 mr-1 ${agentStatusLoading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                  </div>

                  {agentStatus === null ? (
                    <p className="text-sm text-muted-foreground">Unable to fetch agent status</p>
                  ) : agentStatus.total === 0 ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 rounded-lg bg-background/50">
                      <XCircle className="w-4 h-4 text-destructive shrink-0" />
                      No agents connected. Start the Remote Agent on your machine to enable local execution.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {agentStatus.agents.map((agent) => (
                        <div
                          key={agent.agentId}
                          className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/30"
                        >
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-foreground">{agent.hostname}</p>
                              <p className="text-xs text-muted-foreground">{agent.agentId}</p>
                            </div>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            agent.status === 'idle'
                              ? 'bg-green-500/15 text-green-400'
                              : 'bg-amber-500/15 text-amber-400'
                          }`}>
                            {agent.status}
                          </span>
                        </div>
                      ))}
                      <p className="text-xs text-muted-foreground text-right">
                        {agentStatus.idle} idle · {agentStatus.busy} busy
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* ── User Management ─────────────────────────────────────────── */}
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                  User Management
                </CardTitle>
                <CardDescription>
                  Create and manage users who can access this NAT 2.0 instance. Only admins can create accounts.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">

                {/* Create User Form */}
                <div className="rounded-lg border border-border/50 bg-background/50 p-4 space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <UserPlus className="w-4 h-4 text-primary" />
                    Create New User
                  </div>

                  {/* Credentials */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Username</Label>
                      <Input
                        placeholder="john_doe"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        data-testid="input-new-username"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Temporary Password</Label>
                      <div className="relative">
                        <Input
                          type={showNewPassword ? 'text' : 'password'}
                          placeholder="Min. 8 characters"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          data-testid="input-new-password"
                          className="pr-9"
                        />
                        <button type="button" onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showNewPassword ? <XCircle className="w-3.5 h-3.5" /> : <Key className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Module Access */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5" /> Module Access
                      </Label>
                      <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                        <Checkbox
                          checked={newUserFullAccess}
                          onCheckedChange={(v) => setNewUserFullAccess(!!v)}
                          data-testid="checkbox-full-access"
                        />
                        Full access (Admin)
                      </label>
                    </div>

                    {/* Always-on modules */}
                    <div className="rounded-md border border-border/30 bg-muted/30 p-3 space-y-1.5">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">Always available</p>
                      <div className="flex flex-wrap gap-1.5">
                        {ALWAYS_ON_MODULES.map(m => (
                          <Badge key={m.id} variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30 cursor-default">
                            {m.label}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Selectable modules */}
                    {!newUserFullAccess && (
                      <div className="rounded-md border border-border/30 bg-background/50 p-3">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-2">Selectable modules</p>
                        <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                          {ALL_MODULES.map(m => (
                            <label key={m.id} className="flex items-center gap-2 text-sm cursor-pointer">
                              <Checkbox
                                checked={newUserModules.includes(m.id)}
                                onCheckedChange={() => toggleModule(m.id, newUserModules, setNewUserModules)}
                                data-testid={`checkbox-module-${m.id}`}
                              />
                              {m.label}
                            </label>
                          ))}
                        </div>
                        <div className="mt-2 flex gap-2">
                          <button className="text-xs text-primary underline" onClick={() => setNewUserModules(ALL_MODULES.map(m => m.id))}>Select all</button>
                          <button className="text-xs text-muted-foreground underline" onClick={() => setNewUserModules([])}>Clear all</button>
                        </div>
                      </div>
                    )}
                  </div>

                  <Button
                    size="sm"
                    onClick={createUser}
                    disabled={!newUsername.trim() || newPassword.length < 8 || creatingUser}
                    data-testid="button-create-user"
                  >
                    {creatingUser ? <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" /> : <UserPlus className="w-3.5 h-3.5 mr-2" />}
                    Create User
                  </Button>
                </div>

                {/* User List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Users className="w-4 h-4 text-primary" />
                      All Users
                      <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{users.length}</span>
                    </div>
                    <Button size="sm" variant="ghost" onClick={fetchUsers} disabled={usersLoading} data-testid="button-refresh-users">
                      <RefreshCw className={`w-3 h-3 ${usersLoading ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>

                  {users.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-3 rounded-lg bg-background/50 text-center">
                      No users yet. Create the first one above.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {users.map((u) => (
                        <div
                          key={u.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/30 gap-3"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <User className="w-4 h-4 text-muted-foreground shrink-0" />
                            <div className="min-w-0">
                              <span className="font-medium text-sm truncate block">{u.username}</span>
                              {u.allowedModules === null ? (
                                <span className="text-[10px] text-primary font-semibold">Full access</span>
                              ) : (
                                <span className="text-[10px] text-muted-foreground">
                                  {u.allowedModules.length === 0 ? 'No modules' : `${u.allowedModules.length} module${u.allowedModules.length !== 1 ? 's' : ''}`}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {resetPasswordUserId === u.id ? (
                              <div className="flex items-center gap-1">
                                <Input
                                  type="password"
                                  placeholder="New password"
                                  value={resetPasswordValue}
                                  onChange={(e) => setResetPasswordValue(e.target.value)}
                                  className="h-7 text-xs w-32"
                                  autoFocus
                                  onKeyDown={(e) => { if (e.key === 'Enter') resetPassword(u.id); if (e.key === 'Escape') { setResetPasswordUserId(null); setResetPasswordValue(''); } }}
                                />
                                <Button size="sm" className="h-7 px-2" onClick={() => resetPassword(u.id)}>
                                  <CheckCircle2 className="w-3 h-3" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => { setResetPasswordUserId(null); setResetPasswordValue(''); }}>
                                  <XCircle className="w-3 h-3" />
                                </Button>
                              </div>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-muted-foreground hover:text-primary"
                                  onClick={() => openEditModules(u)}
                                  title="Edit module access"
                                  data-testid={`button-edit-modules-${u.id}`}
                                >
                                  <Layers className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-muted-foreground hover:text-foreground"
                                  onClick={() => { setResetPasswordUserId(u.id); setResetPasswordValue(''); }}
                                  title="Reset password"
                                  data-testid={`button-reset-password-${u.id}`}
                                >
                                  <RotateCcw className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-muted-foreground hover:text-destructive"
                                  onClick={() => deleteUser(u.id, u.username)}
                                  title="Delete user"
                                  data-testid={`button-delete-user-${u.id}`}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </CardContent>
            </Card>

            {/* ── Account Settings ─────────────────────────────────────────── */}
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
                <div className="flex gap-3 flex-wrap">
                  <Button variant="outline" data-testid="button-change-password">
                    Change Password
                  </Button>
                  <Button
                    variant="outline"
                    className="text-destructive border-destructive/50 hover:bg-destructive/10"
                    data-testid="button-sign-out"
                    onClick={() => {
                      fetch('/api/auth/logout', { method: 'POST' }).finally(() => {
                        localStorage.removeItem('isAuthenticated');
                        localStorage.removeItem('currentUser');
                        window.location.href = '/login';
                      });
                    }}
                  >
                    Sign Out
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>

    {/* ── Edit Module Access Dialog ─────────────────────────────────────── */}
    <Dialog open={!!editModulesUserId} onOpenChange={(open) => { if (!open) setEditModulesUserId(null); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" /> Edit Module Access
          </DialogTitle>
          <DialogDescription>
            {users.find(u => u.id === editModulesUserId)?.username} — choose which modules this user can access.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Full access toggle */}
          <label className="flex items-center gap-2.5 cursor-pointer">
            <Checkbox
              checked={editModulesFullAccess}
              onCheckedChange={(v) => setEditModulesFullAccess(!!v)}
              data-testid="checkbox-edit-full-access"
            />
            <span className="text-sm font-medium">Full access (Admin — no restrictions)</span>
          </label>

          {/* Always-on */}
          <div className="rounded-md border border-border/30 bg-muted/30 p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-2">Always available</p>
            <div className="flex flex-wrap gap-1.5">
              {ALWAYS_ON_MODULES.map(m => (
                <Badge key={m.id} variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                  {m.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Selectable modules */}
          {!editModulesFullAccess && (
            <div className="rounded-md border border-border/30 bg-background/50 p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-2">Selectable modules</p>
              <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                {ALL_MODULES.map(m => (
                  <label key={m.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={editModulesList.includes(m.id)}
                      onCheckedChange={() => toggleModule(m.id, editModulesList, setEditModulesList)}
                      data-testid={`checkbox-edit-module-${m.id}`}
                    />
                    {m.label}
                  </label>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <button className="text-xs text-primary underline" onClick={() => setEditModulesList(ALL_MODULES.map(m => m.id))}>Select all</button>
                <button className="text-xs text-muted-foreground underline" onClick={() => setEditModulesList([])}>Clear all</button>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditModulesUserId(null)}>Cancel</Button>
          <Button size="sm" onClick={saveModules} disabled={savingModules} data-testid="button-save-modules">
            {savingModules ? <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5 mr-2" />}
            Save Access
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
