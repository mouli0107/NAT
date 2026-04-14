import { useState } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart3, 
  TrendingUp, 
  PieChart, 
  FileText, 
  Download,
  Calendar,
  Filter,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Target,
  Layers,
  Activity,
  Clock
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPie, Pie, Cell, Legend } from 'recharts';

const mockTrendData = [
  { day: 'Mon', testCases: 45, executions: 12 },
  { day: 'Tue', testCases: 52, executions: 18 },
  { day: 'Wed', testCases: 78, executions: 25 },
  { day: 'Thu', testCases: 63, executions: 22 },
  { day: 'Fri', testCases: 89, executions: 31 },
  { day: 'Sat', testCases: 34, executions: 8 },
  { day: 'Sun', testCases: 28, executions: 5 },
];

const mockTypeDistribution = [
  { name: 'Functional', value: 45, color: '#f97316' },
  { name: 'Edge Case', value: 20, color: '#8b5cf6' },
  { name: 'Negative', value: 18, color: '#ef4444' },
  { name: 'Security', value: 10, color: '#06b6d4' },
  { name: 'Accessibility', value: 7, color: '#22c55e' },
];

const mockExecutionResults = [
  { project: 'Insurance Portal', passed: 85, failed: 12, skipped: 3 },
  { project: 'Claims System', passed: 72, failed: 8, skipped: 5 },
  { project: 'Policy Manager', passed: 64, failed: 15, skipped: 2 },
  { project: 'Customer Portal', passed: 91, failed: 6, skipped: 1 },
];

const mockCoverageData = [
  { project: 'Insurance Portal', source: 'User Stories', stories: 24, testCases: 156, coverage: 87 },
  { project: 'Claims System', source: 'Autonomous', stories: 18, testCases: 98, coverage: 72 },
  { project: 'Policy Manager', source: 'User Stories', stories: 32, testCases: 234, coverage: 95 },
  { project: 'Customer Portal', source: 'Autonomous', stories: 15, testCases: 67, coverage: 64 },
];

const mockExecutionHistory = [
  { id: 'EXE-001', date: '2024-12-20', project: 'Insurance Portal', source: 'User Stories', tests: 45, passed: 42, failed: 3, duration: '4m 32s' },
  { id: 'EXE-002', date: '2024-12-19', project: 'Claims System', source: 'Autonomous', tests: 32, passed: 30, failed: 2, duration: '3m 18s' },
  { id: 'EXE-003', date: '2024-12-18', project: 'Policy Manager', source: 'User Stories', tests: 58, passed: 51, failed: 7, duration: '6m 45s' },
  { id: 'EXE-004', date: '2024-12-17', project: 'Customer Portal', source: 'Autonomous', tests: 28, passed: 28, failed: 0, duration: '2m 55s' },
];

export default function ReportsPage() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [dateRange, setDateRange] = useState('week');
  const [activeTab, setActiveTab] = useState('overview');

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
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
                  <BarChart3 className="w-7 h-7 text-primary" />
                  Reports & Analytics
                </h1>
                <p className="text-muted-foreground mt-1">Comprehensive testing insights and metrics</p>
              </div>
              <div className="flex items-center gap-3">
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="w-40" data-testid="select-date-range">
                    <Calendar className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="quarter">This Quarter</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" data-testid="button-refresh-reports">
                  <RefreshCw className="w-4 h-4" />
                </Button>
                <Button data-testid="button-export-report">
                  <Download className="w-4 h-4 mr-2" />
                  Export Report
                </Button>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="bg-card border">
                <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
                <TabsTrigger value="coverage" data-testid="tab-coverage">Coverage Reports</TabsTrigger>
                <TabsTrigger value="execution" data-testid="tab-execution">Execution Reports</TabsTrigger>
                <TabsTrigger value="custom" data-testid="tab-custom">Custom Reports</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="bg-card/50 border-border/50">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Test Cases Generated</p>
                          <p className="text-3xl font-bold text-foreground mt-1">389</p>
                          <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" /> +12% vs last week
                          </p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                          <FileText className="w-6 h-6 text-primary" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-card/50 border-border/50">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Executions Run</p>
                          <p className="text-3xl font-bold text-foreground mt-1">121</p>
                          <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" /> +8% vs last week
                          </p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center">
                          <Activity className="w-6 h-6 text-violet-400" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-card/50 border-border/50">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Pass Rate</p>
                          <p className="text-3xl font-bold text-foreground mt-1">94.2%</p>
                          <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" /> +2.1% vs last week
                          </p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                          <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-card/50 border-border/50">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Coverage</p>
                          <p className="text-3xl font-bold text-foreground mt-1">79.5%</p>
                          <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Target: 85%
                          </p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                          <Target className="w-6 h-6 text-cyan-400" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="bg-card/50 border-border/50">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-primary" />
                        Generation Trend
                      </CardTitle>
                      <CardDescription>Test cases generated over the past week</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={mockTrendData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                            <XAxis dataKey="day" stroke="#888" />
                            <YAxis stroke="#888" />
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #333' }}
                              labelStyle={{ color: '#fff' }}
                            />
                            <Line type="monotone" dataKey="testCases" stroke="#f97316" strokeWidth={2} dot={{ fill: '#f97316' }} />
                            <Line type="monotone" dataKey="executions" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: '#8b5cf6' }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-card/50 border-border/50">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <PieChart className="w-5 h-5 text-primary" />
                        Test Type Distribution
                      </CardTitle>
                      <CardDescription>Breakdown by test category</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsPie>
                            <Pie
                              data={mockTypeDistribution}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            >
                              {mockTypeDistribution.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #333' }}
                            />
                          </RechartsPie>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="bg-card/50 border-border/50">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-primary" />
                      Execution Results by Project
                    </CardTitle>
                    <CardDescription>Pass/Fail/Skip breakdown per project</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={mockExecutionResults} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                          <XAxis type="number" stroke="#888" />
                          <YAxis dataKey="project" type="category" stroke="#888" width={120} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #333' }}
                          />
                          <Legend />
                          <Bar dataKey="passed" stackId="a" fill="#22c55e" name="Passed" />
                          <Bar dataKey="failed" stackId="a" fill="#ef4444" name="Failed" />
                          <Bar dataKey="skipped" stackId="a" fill="#6b7280" name="Skipped" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="coverage" className="space-y-6">
                <Card className="bg-card/50 border-border/50">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Target className="w-5 h-5 text-primary" />
                          Coverage Summary
                        </CardTitle>
                        <CardDescription>Overall test coverage metrics</CardDescription>
                      </div>
                      <div className="text-right">
                        <p className="text-4xl font-bold text-foreground">79.5%</p>
                        <p className="text-sm text-muted-foreground">Overall Coverage</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-6">
                      <div className="text-center p-4 rounded-lg bg-background/50">
                        <p className="text-2xl font-bold text-foreground">89</p>
                        <p className="text-sm text-muted-foreground">User Stories Covered</p>
                        <p className="text-xs text-emerald-400">of 112 total</p>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-background/50">
                        <p className="text-2xl font-bold text-foreground">555</p>
                        <p className="text-sm text-muted-foreground">Test Cases</p>
                        <p className="text-xs text-muted-foreground">Active</p>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-background/50">
                        <p className="text-2xl font-bold text-foreground">23</p>
                        <p className="text-sm text-muted-foreground">Coverage Gaps</p>
                        <p className="text-xs text-amber-400">Needs attention</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card/50 border-border/50">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Layers className="w-5 h-5 text-primary" />
                      Coverage by Project
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {mockCoverageData.map((item, index) => (
                        <div key={index} className="flex items-center gap-4 p-4 rounded-lg bg-background/50">
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <p className="font-medium text-foreground">{item.project}</p>
                                <p className="text-xs text-muted-foreground">{item.stories} stories | {item.testCases} test cases</p>
                              </div>
                              <Badge variant={item.source === 'User Stories' ? 'default' : 'secondary'}>
                                {item.source}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3">
                              <Progress value={item.coverage} className="flex-1 h-2" />
                              <span className="text-sm font-medium text-foreground w-12">{item.coverage}%</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="execution" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-card/50 border-border/50">
                    <CardContent className="p-6 text-center">
                      <p className="text-4xl font-bold text-foreground">121</p>
                      <p className="text-sm text-muted-foreground mt-1">Total Runs</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-card/50 border-border/50">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-center gap-6">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-emerald-400">112</p>
                          <p className="text-xs text-muted-foreground">Passed</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-red-400">7</p>
                          <p className="text-xs text-muted-foreground">Failed</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-gray-400">2</p>
                          <p className="text-xs text-muted-foreground">Skipped</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-card/50 border-border/50">
                    <CardContent className="p-6 text-center">
                      <p className="text-4xl font-bold text-foreground">4m 22s</p>
                      <p className="text-sm text-muted-foreground mt-1">Avg Duration</p>
                    </CardContent>
                  </Card>
                </div>

                <Card className="bg-card/50 border-border/50">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Clock className="w-5 h-5 text-primary" />
                        Execution History
                      </CardTitle>
                      <Button variant="outline" size="sm" data-testid="button-export-history">
                        <Download className="w-4 h-4 mr-2" />
                        Export
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Run ID</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Date</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Project</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Source</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Tests</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Passed</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Failed</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Duration</th>
                          </tr>
                        </thead>
                        <tbody>
                          {mockExecutionHistory.map((item, index) => (
                            <tr key={index} className="border-b border-border/50 hover:bg-muted/50">
                              <td className="py-3 px-4 text-sm font-medium text-primary">{item.id}</td>
                              <td className="py-3 px-4 text-sm text-muted-foreground">{item.date}</td>
                              <td className="py-3 px-4 text-sm text-foreground">{item.project}</td>
                              <td className="py-3 px-4">
                                <Badge variant={item.source === 'User Stories' ? 'default' : 'secondary'} className="text-xs">
                                  {item.source}
                                </Badge>
                              </td>
                              <td className="py-3 px-4 text-sm text-foreground">{item.tests}</td>
                              <td className="py-3 px-4 text-sm text-emerald-400">{item.passed}</td>
                              <td className="py-3 px-4 text-sm text-red-400">{item.failed}</td>
                              <td className="py-3 px-4 text-sm text-muted-foreground">{item.duration}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="custom" className="space-y-6">
                <Card className="bg-card/50 border-border/50">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Filter className="w-5 h-5 text-primary" />
                      Custom Report Builder
                    </CardTitle>
                    <CardDescription>Create custom reports with specific data and filters</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-foreground mb-2 block">Data Source</label>
                          <Select defaultValue="all">
                            <SelectTrigger data-testid="select-data-source">
                              <SelectValue placeholder="Select source" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Sources</SelectItem>
                              <SelectItem value="autonomous">Autonomous Testing</SelectItem>
                              <SelectItem value="stories">Generate from User Stories</SelectItem>
                              <SelectItem value="execution">Execution Mode</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-foreground mb-2 block">Chart Type</label>
                          <Select defaultValue="line">
                            <SelectTrigger data-testid="select-chart-type">
                              <SelectValue placeholder="Select chart type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="line">Line Chart</SelectItem>
                              <SelectItem value="bar">Bar Chart</SelectItem>
                              <SelectItem value="pie">Pie Chart</SelectItem>
                              <SelectItem value="table">Table View</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-foreground mb-2 block">Metrics</label>
                          <Select defaultValue="testcases">
                            <SelectTrigger data-testid="select-metrics">
                              <SelectValue placeholder="Select metrics" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="testcases">Test Cases Generated</SelectItem>
                              <SelectItem value="executions">Executions</SelectItem>
                              <SelectItem value="coverage">Coverage</SelectItem>
                              <SelectItem value="passrate">Pass Rate</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-foreground mb-2 block">Group By</label>
                          <Select defaultValue="day">
                            <SelectTrigger data-testid="select-group-by">
                              <SelectValue placeholder="Select grouping" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="day">Daily</SelectItem>
                              <SelectItem value="week">Weekly</SelectItem>
                              <SelectItem value="month">Monthly</SelectItem>
                              <SelectItem value="project">By Project</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Button data-testid="button-generate-report">
                        <BarChart3 className="w-4 h-4 mr-2" />
                        Generate Report
                      </Button>
                      <Button variant="outline" data-testid="button-save-report">
                        Save Report Template
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card/50 border-border/50">
                  <CardHeader>
                    <CardTitle className="text-lg">Saved Reports</CardTitle>
                    <CardDescription>Your custom report templates</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No saved reports yet</p>
                      <p className="text-sm">Create a custom report above to save it as a template</p>
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
