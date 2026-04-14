import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/header";
import { useBranding } from "@/contexts/BrandingContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowUpDown,
  Download,
  Upload,
  FileSpreadsheet,
  FileJson,
  FileText,
  FolderOpen,
  Filter,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  RefreshCw,
  Trash2,
  Edit,
  Plus
} from "lucide-react";
import type { Project } from "@shared/schema";

const mockHistory = [
  { id: 1, date: '2024-12-20 14:32', type: 'Export', source: 'Insurance Portal', destination: 'Excel', records: 156, status: 'completed' },
  { id: 2, date: '2024-12-19 10:15', type: 'Import', source: 'test_cases.xlsx', destination: 'Claims System', records: 45, status: 'completed' },
  { id: 3, date: '2024-12-18 16:45', type: 'Export', source: 'Policy Manager', destination: 'JSON', records: 234, status: 'completed' },
  { id: 4, date: '2024-12-17 09:20', type: 'Import', source: 'regression_suite.csv', destination: 'Customer Portal', records: 89, status: 'failed' },
];

const mockTemplates = [
  { id: 1, name: 'Standard Export', type: 'export', format: 'Excel', fields: 12 },
  { id: 2, name: 'Zephyr Format', type: 'export', format: 'CSV', fields: 15 },
  { id: 3, name: 'TestRail Import', type: 'import', format: 'CSV', fields: 10 },
];

export default function ImportExportPage() {
  const { brand } = useBranding();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('export');
  const [exportSource, setExportSource] = useState('all');
  const [exportFormat, setExportFormat] = useState('excel');
  const [importSource, setImportSource] = useState('file');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFile(e.target.files[0]);
    }
  };

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => setIsExporting(false), 2000);
  };

  const handleImport = () => {
    setIsImporting(true);
    setTimeout(() => setIsImporting(false), 2000);
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
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
                  <ArrowUpDown className="w-7 h-7 text-primary" />
                  Import/Export
                </h1>
                <p className="text-muted-foreground mt-1">Transfer test cases between {brand.platformShortName} and external tools</p>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="bg-card border">
                <TabsTrigger value="export" data-testid="tab-export">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </TabsTrigger>
                <TabsTrigger value="import" data-testid="tab-import">
                  <Upload className="w-4 h-4 mr-2" />
                  Import
                </TabsTrigger>
                <TabsTrigger value="templates" data-testid="tab-templates">
                  <FileText className="w-4 h-4 mr-2" />
                  Templates
                </TabsTrigger>
                <TabsTrigger value="history" data-testid="tab-history">
                  <Clock className="w-4 h-4 mr-2" />
                  History
                </TabsTrigger>
              </TabsList>

              <TabsContent value="export" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="bg-card/50 border-border/50">
                    <CardHeader>
                      <CardTitle className="text-lg">Export Source</CardTitle>
                      <CardDescription>Select which test cases to export</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <RadioGroup value={exportSource} onValueChange={setExportSource} className="space-y-3">
                        <div className="flex items-center space-x-3 p-3 rounded-lg bg-background/50 border border-border/50">
                          <RadioGroupItem value="all" id="all" />
                          <Label htmlFor="all" className="flex-1 cursor-pointer">
                            <p className="font-medium">All Test Cases</p>
                            <p className="text-xs text-muted-foreground">Export all test cases from all projects</p>
                          </Label>
                        </div>
                        <div className="flex items-center space-x-3 p-3 rounded-lg bg-background/50 border border-border/50">
                          <RadioGroupItem value="autonomous" id="autonomous" />
                          <Label htmlFor="autonomous" className="flex-1 cursor-pointer">
                            <p className="font-medium">From Autonomous Testing</p>
                            <p className="text-xs text-muted-foreground">Export from a specific project</p>
                          </Label>
                        </div>
                        <div className="flex items-center space-x-3 p-3 rounded-lg bg-background/50 border border-border/50">
                          <RadioGroupItem value="stories" id="stories" />
                          <Label htmlFor="stories" className="flex-1 cursor-pointer">
                            <p className="font-medium">From Generate from User Stories</p>
                            <p className="text-xs text-muted-foreground">Export from a specific project and sprint</p>
                          </Label>
                        </div>
                        <div className="flex items-center space-x-3 p-3 rounded-lg bg-background/50 border border-border/50">
                          <RadioGroupItem value="custom" id="custom" />
                          <Label htmlFor="custom" className="flex-1 cursor-pointer">
                            <p className="font-medium">Custom Selection</p>
                            <p className="text-xs text-muted-foreground">Choose specific test cases</p>
                          </Label>
                        </div>
                      </RadioGroup>

                      {(exportSource === 'autonomous' || exportSource === 'stories') && (
                        <div className="space-y-3 pt-3 border-t border-border/50">
                          <Select>
                            <SelectTrigger data-testid="select-export-project">
                              <SelectValue placeholder="Select project" />
                            </SelectTrigger>
                            <SelectContent>
                              {projects.map((project) => (
                                <SelectItem key={project.id} value={project.id.toString()}>
                                  {project.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {exportSource === 'stories' && (
                            <Select>
                              <SelectTrigger data-testid="select-export-sprint">
                                <SelectValue placeholder="Select sprint" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="sprint1">Sprint 1</SelectItem>
                                <SelectItem value="sprint2">Sprint 2</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <div className="space-y-6">
                    <Card className="bg-card/50 border-border/50">
                      <CardHeader>
                        <CardTitle className="text-lg">Export Format</CardTitle>
                        <CardDescription>Choose output format</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { id: 'excel', icon: FileSpreadsheet, label: 'Excel (.xlsx)', color: 'text-emerald-400' },
                            { id: 'csv', icon: FileText, label: 'CSV', color: 'text-blue-400' },
                            { id: 'json', icon: FileJson, label: 'JSON', color: 'text-amber-400' },
                            { id: 'pdf', icon: FileText, label: 'PDF', color: 'text-red-400' },
                          ].map((format) => (
                            <button
                              key={format.id}
                              onClick={() => setExportFormat(format.id)}
                              className={`p-4 rounded-lg border transition-all ${
                                exportFormat === format.id 
                                  ? 'border-primary bg-primary/10' 
                                  : 'border-border/50 bg-background/50 hover:border-primary/50'
                              }`}
                              data-testid={`button-format-${format.id}`}
                            >
                              <format.icon className={`w-6 h-6 mx-auto mb-2 ${format.color}`} />
                              <p className="text-sm font-medium text-foreground">{format.label}</p>
                            </button>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-card/50 border-border/50">
                      <CardHeader>
                        <CardTitle className="text-lg">Filters</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Priority</Label>
                            <div className="space-y-2">
                              {['Smoke', 'Sanity', 'Regression', 'Critical'].map((priority) => (
                                <div key={priority} className="flex items-center space-x-2">
                                  <Checkbox id={`priority-${priority}`} defaultChecked />
                                  <Label htmlFor={`priority-${priority}`} className="text-sm">{priority}</Label>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Type</Label>
                            <div className="space-y-2">
                              {['Functional', 'Edge Case', 'Negative', 'Security'].map((type) => (
                                <div key={type} className="flex items-center space-x-2">
                                  <Checkbox id={`type-${type}`} defaultChecked />
                                  <Label htmlFor={`type-${type}`} className="text-sm">{type}</Label>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <Card className="bg-card/50 border-border/50">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground">Ready to export</p>
                        <p className="text-sm text-muted-foreground">156 test cases selected</p>
                      </div>
                      <div className="flex gap-3">
                        <Button variant="outline" data-testid="button-preview-export">
                          <Eye className="w-4 h-4 mr-2" />
                          Preview
                        </Button>
                        <Button onClick={handleExport} disabled={isExporting} data-testid="button-export">
                          {isExporting ? (
                            <>
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                              Exporting...
                            </>
                          ) : (
                            <>
                              <Download className="w-4 h-4 mr-2" />
                              Export
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                    {isExporting && (
                      <Progress value={65} className="mt-4 h-2" />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="import" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="bg-card/50 border-border/50">
                    <CardHeader>
                      <CardTitle className="text-lg">Import Source</CardTitle>
                      <CardDescription>Select where to import from</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <RadioGroup value={importSource} onValueChange={setImportSource} className="space-y-3">
                        <div className="flex items-center space-x-3 p-3 rounded-lg bg-background/50 border border-border/50">
                          <RadioGroupItem value="file" id="import-file" />
                          <Label htmlFor="import-file" className="flex-1 cursor-pointer">
                            <p className="font-medium">Upload File</p>
                            <p className="text-xs text-muted-foreground">Import from Excel, CSV, or JSON file</p>
                          </Label>
                        </div>
                        <div className="flex items-center space-x-3 p-3 rounded-lg bg-background/50 border border-border/50">
                          <RadioGroupItem value="tool" id="import-tool" />
                          <Label htmlFor="import-tool" className="flex-1 cursor-pointer">
                            <p className="font-medium">From Connected Tool</p>
                            <p className="text-xs text-muted-foreground">Import from Azure DevOps, JIRA, etc.</p>
                          </Label>
                        </div>
                        <div className="flex items-center space-x-3 p-3 rounded-lg bg-background/50 border border-border/50">
                          <RadioGroupItem value="url" id="import-url" />
                          <Label htmlFor="import-url" className="flex-1 cursor-pointer">
                            <p className="font-medium">From URL</p>
                            <p className="text-xs text-muted-foreground">Import from a remote file URL</p>
                          </Label>
                        </div>
                      </RadioGroup>

                      {importSource === 'file' && (
                        <div className="pt-4 border-t border-border/50">
                          <div 
                            className="border-2 border-dashed border-border/50 rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                            onClick={() => document.getElementById('file-upload')?.click()}
                          >
                            <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                            <p className="font-medium text-foreground">
                              {uploadedFile ? uploadedFile.name : 'Drop file here or click to upload'}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Supports .xlsx, .csv, .json
                            </p>
                            <input
                              id="file-upload"
                              type="file"
                              className="hidden"
                              accept=".xlsx,.csv,.json"
                              onChange={handleFileUpload}
                              data-testid="input-file-upload"
                            />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <div className="space-y-6">
                    <Card className="bg-card/50 border-border/50">
                      <CardHeader>
                        <CardTitle className="text-lg">Destination</CardTitle>
                        <CardDescription>Where to import test cases</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label className="text-sm mb-2 block">Destination Type</Label>
                          <Select defaultValue="autonomous">
                            <SelectTrigger data-testid="select-destination-type">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="autonomous">To Autonomous Testing project</SelectItem>
                              <SelectItem value="stories">To Generate from User Stories project/sprint</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-sm mb-2 block">Project</Label>
                          <Select>
                            <SelectTrigger data-testid="select-destination-project">
                              <SelectValue placeholder="Select or create project" />
                            </SelectTrigger>
                            <SelectContent>
                              {projects.map((project) => (
                                <SelectItem key={project.id} value={project.id.toString()}>
                                  {project.name}
                                </SelectItem>
                              ))}
                              <SelectItem value="new">+ Create New Project</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-card/50 border-border/50">
                      <CardHeader>
                        <CardTitle className="text-lg">Import Options</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label className="text-sm mb-2 block">Duplicate Handling</Label>
                          <Select defaultValue="skip">
                            <SelectTrigger data-testid="select-duplicate-handling">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="skip">Skip duplicates</SelectItem>
                              <SelectItem value="replace">Replace existing</SelectItem>
                              <SelectItem value="create">Create as new</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox id="validate" defaultChecked />
                            <Label htmlFor="validate" className="text-sm">Validate data before import</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox id="generate-ids" defaultChecked />
                            <Label htmlFor="generate-ids" className="text-sm">Auto-generate IDs</Label>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <Card className="bg-card/50 border-border/50">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground">
                          {uploadedFile ? `Ready to import: ${uploadedFile.name}` : 'Upload a file to continue'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {uploadedFile ? 'File validated and ready' : 'Select a file to import test cases'}
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <Button variant="outline" disabled={!uploadedFile} data-testid="button-preview-import">
                          <Eye className="w-4 h-4 mr-2" />
                          Preview
                        </Button>
                        <Button onClick={handleImport} disabled={!uploadedFile || isImporting} data-testid="button-import">
                          {isImporting ? (
                            <>
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                              Importing...
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4 mr-2" />
                              Import
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                    {isImporting && (
                      <Progress value={45} className="mt-4 h-2" />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="templates" className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Saved Templates</h2>
                    <p className="text-sm text-muted-foreground">Manage your import and export templates</p>
                  </div>
                  <Button data-testid="button-create-template">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Template
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {mockTemplates.map((template) => (
                    <Card key={template.id} className="bg-card/50 border-border/50">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-medium text-foreground">{template.name}</p>
                            <p className="text-xs text-muted-foreground">{template.fields} fields configured</p>
                          </div>
                          <Badge variant={template.type === 'export' ? 'default' : 'secondary'}>
                            {template.type}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t border-border/50">
                          <span className="text-xs text-muted-foreground">Format: {template.format}</span>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-edit-template-${template.id}`}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" data-testid={`button-delete-template-${template.id}`}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="history" className="space-y-6">
                <Card className="bg-card/50 border-border/50">
                  <CardHeader>
                    <CardTitle className="text-lg">Sync History</CardTitle>
                    <CardDescription>Recent import and export operations</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Date</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Type</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Source</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Destination</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Records</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {mockHistory.map((item) => (
                            <tr key={item.id} className="border-b border-border/50 hover:bg-muted/50">
                              <td className="py-3 px-4 text-sm text-muted-foreground">{item.date}</td>
                              <td className="py-3 px-4">
                                <Badge variant={item.type === 'Export' ? 'default' : 'secondary'}>
                                  {item.type === 'Export' ? <Download className="w-3 h-3 mr-1" /> : <Upload className="w-3 h-3 mr-1" />}
                                  {item.type}
                                </Badge>
                              </td>
                              <td className="py-3 px-4 text-sm text-foreground">{item.source}</td>
                              <td className="py-3 px-4 text-sm text-foreground">{item.destination}</td>
                              <td className="py-3 px-4 text-sm text-foreground">{item.records}</td>
                              <td className="py-3 px-4">
                                {item.status === 'completed' ? (
                                  <span className="flex items-center gap-1 text-sm text-emerald-400">
                                    <CheckCircle2 className="w-4 h-4" />
                                    Completed
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 text-sm text-red-400">
                                    <XCircle className="w-4 h-4" />
                                    Failed
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}
