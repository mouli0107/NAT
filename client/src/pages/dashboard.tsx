import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Sidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProject } from "@/contexts/ProjectContext";
import { useBranding } from "@/contexts/BrandingContext";
import {
  Activity,
  Zap,
  Target,
  FolderOpen,
  TrendingUp,
  BarChart3,
  TestTube2,
  Layers,
  ArrowRight,
  Sparkles,
  Eye,
  Clock,
  CheckCircle2,
  Plus,
  Bot,
  Brain,
  Cpu,
  Database,
  Play,
  FileCode2,
  Workflow,
  Settings2,
  CircleDot,
  Library,
  ChevronRight
} from "lucide-react";
import { format } from "date-fns";
import type { Project } from "@shared/schema";

interface AnalyticsData {
  projects: {
    total: number;
    recent: Project[];
  };
  testCases: {
    total: number;
    functional: number;
    workflow: number;
    negative: number;
    edgeCase: number;
    sprint: number;
  };
  sessions: {
    total: number;
    recentWeek: number;
  };
  testRuns: {
    total: number;
    recentWeek: number;
  };
  activity: {
    lastWeek: {
      testRuns: number;
      sessions: number;
    };
  };
}

function AnimatedCounter({ value, duration = 2000 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (value === 0) {
      setDisplayValue(0);
      return;
    }
    
    const startTime = Date.now();
    const startValue = 0;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(startValue + (value - startValue) * easeOut);
      
      setDisplayValue(current);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [value, duration]);

  return <span>{displayValue.toLocaleString()}</span>;
}

const agentActivities = [
  { agent: "Discovery Agent", status: "analyzing", icon: Eye, color: "text-indigo-400" },
  { agent: "Test Generator", status: "generating", icon: Brain, color: "text-violet-400" },
  { agent: "Executor Agent", status: "ready", icon: Play, color: "text-emerald-400" },
  { agent: "QA Refiner", status: "idle", icon: CheckCircle2, color: "text-amber-400" },
];

export default function Dashboard() {
  const { setSelectedProjectId } = useProject();
  const { brand } = useBranding();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeAgentIndex, setActiveAgentIndex] = useState(0);

  const { data: analytics, isLoading: analyticsLoading, error: analyticsError } = useQuery<AnalyticsData>({
    queryKey: ['/api/analytics/overview'],
  });

  const { data: allProjects = [], isLoading: projectsLoading, error: projectsError } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  // True when the API responded successfully but returned genuinely empty data.
  // Distinguished from an API error (non-200) which surfaces separately below.
  const dbIsEmpty = !analyticsLoading && !analyticsError &&
    analytics?.projects.total === 0 && analytics?.testCases.total === 0;

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveAgentIndex((prev) => (prev + 1) % agentActivities.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectProject = (projectId: string) => {
    setSelectedProjectId(projectId);
  };

  const getProjectTypeColor = (type: string) => {
    switch (type) {
      case 'visual-regression': return 'border-violet-500/30';
      case 'functional': return 'border-indigo-500/30';
      case 'sprint': return 'border-emerald-500/30';
      default: return 'border-primary/30';
    }
  };

  const getProjectTypeIcon = (type: string) => {
    switch (type) {
      case 'visual-regression': return <Eye className="w-4 h-4" />;
      case 'functional': return <Zap className="w-4 h-4" />;
      case 'sprint': return <Target className="w-4 h-4" />;
      default: return <TestTube2 className="w-4 h-4" />;
    }
  };

  return (
    <div className="flex h-screen w-full bg-background">
      <Sidebar 
        activeView="configuration" 
        onViewChange={() => {}} 
        isRunning={false} 
        isCollapsed={isSidebarCollapsed} 
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader />
        
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-8 py-8">

            {/* ── API error banner — shown when /api/analytics/overview returns non-200 ── */}
            {(analyticsError || projectsError) && (
              <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
                <div className="text-red-400 mt-0.5 flex-shrink-0">⚠</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-red-300">Dashboard API error</p>
                  <p className="text-xs text-red-400/80 mt-0.5">
                    {String((analyticsError || projectsError)?.message || 'Unknown error')}
                  </p>
                  <p className="text-xs text-red-400/60 mt-1">
                    Check server logs for details. Hit{' '}
                    <a href="/api/health/db" target="_blank" rel="noreferrer"
                       className="underline hover:text-red-300">/api/health/db</a>{' '}
                    to verify the database connection.
                  </p>
                </div>
                <button
                  onClick={() => window.location.reload()}
                  className="flex-shrink-0 text-xs text-red-400 hover:text-red-200 border border-red-500/30 rounded-lg px-2.5 py-1 transition-colors"
                >
                  Retry
                </button>
              </div>
            )}

            {/* ── Empty-database hint — shown when API succeeds but returns all zeros ── */}
            {/* This happens when the Azure database is fresh and no data has been created yet. */}
            {/* It is NOT an error — the API returned 200 with genuine zero counts.           */}
            {dbIsEmpty && (
              <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
                <div className="text-amber-400 mt-0.5 flex-shrink-0">ℹ</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-amber-300">No data in this database</p>
                  <p className="text-xs text-amber-400/80 mt-0.5">
                    The API is responding correctly (HTTP 200) but there are no projects, test cases,
                    or test runs in the connected database. If you expected to see data, this deployment
                    may be using a different database instance from your local environment.
                  </p>
                  <p className="text-xs text-amber-400/60 mt-1">
                    Verify which database is connected:{' '}
                    <a href="/api/health/db" target="_blank" rel="noreferrer"
                       className="underline hover:text-amber-300">/api/health/db</a>
                    {' '}→ check <code className="font-mono">dbHost</code> and{' '}
                    <code className="font-mono">adminProjectCount</code>.
                    Create a project below to get started.
                  </p>
                </div>
              </div>
            )}

            {/* Hero Section with Agent Activity */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-10 relative overflow-hidden rounded-2xl border border-white/20 p-8"
              style={{ backgroundColor: brand.accentColor }}
            >
              <div className="absolute inset-0 bg-grid-white/[0.04] bg-[size:32px_32px]" />
              
              <div className="relative z-10 flex flex-col lg:flex-row gap-8 items-start lg:items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <motion.div 
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                      className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary via-primary/80 to-indigo-400 flex items-center justify-center shadow-lg shadow-primary/30"
                    >
                      <Bot className="w-7 h-7 text-white" />
                    </motion.div>
                    <div>
                      <h1 className="text-3xl font-bold text-white" data-testid="heading-dashboard">
                        {brand.commandCenter}
                      </h1>
                      <p className="text-white/75">
                        {brand.tagline}
                      </p>
                    </div>
                  </div>
                  
                  {/* Agent Status Pills */}
                  <div className="flex flex-wrap gap-2 mt-6" data-testid="container-agent-pills">
                    {agentActivities.map((agent, index) => (
                      <motion.div
                        key={agent.agent}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ 
                          opacity: 1, 
                          scale: activeAgentIndex === index ? 1.05 : 1,
                          borderColor: activeAgentIndex === index ? 'rgba(99, 102, 241, 0.5)' : 'rgba(100, 116, 139, 0.3)'
                        }}
                        transition={{ delay: index * 0.1 }}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 border ${activeAgentIndex === index ? 'border-white/50' : 'border-white/20'}`}
                        data-testid={`pill-agent-${index}`}
                      >
                        <agent.icon className="w-3.5 h-3.5 text-white" />
                        <span className="text-xs text-white/90" data-testid={`text-agent-${index}`}>{agent.agent}</span>
                        {activeAgentIndex === index && (
                          <motion.div
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className="w-1.5 h-1.5 rounded-full bg-white"
                          />
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>
                
                {/* Live Stats Mini Panel */}
                <div className="grid grid-cols-2 gap-4" data-testid="container-live-stats">
                  <div className="bg-white/15 rounded-xl p-4 border border-white/25 min-w-[120px]" data-testid="panel-active-runs">
                    <div className="flex items-center gap-2 mb-1">
                      <Cpu className="w-4 h-4 text-white/80" />
                      <span className="text-xs text-white/70">Active</span>
                    </div>
                    <p className="text-2xl font-bold text-white" data-testid="stat-runs-week">
                      {analyticsLoading ? "..." : <AnimatedCounter value={analytics?.testRuns.recentWeek || 0} />}
                    </p>
                    <p className="text-xs text-white/60">runs this week</p>
                  </div>
                  <div className="bg-white/15 rounded-xl p-4 border border-white/25 min-w-[120px]" data-testid="panel-generated-cases">
                    <div className="flex items-center gap-2 mb-1">
                      <Database className="w-4 h-4 text-white/80" />
                      <span className="text-xs text-white/70">Generated</span>
                    </div>
                    <p className="text-2xl font-bold text-white" data-testid="stat-total-generated">
                      {analyticsLoading ? "..." : <AnimatedCounter value={analytics?.testCases.total || 0} />}
                    </p>
                    <p className="text-xs text-white/60">test cases</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Analytics Cards - 4 Column Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
              {/* Total Projects */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 to-transparent" data-testid="card-total-projects">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Projects</p>
                        <p className="text-4xl font-bold mt-1" data-testid="stat-total-projects">
                          {analyticsLoading ? "..." : <AnimatedCounter value={analytics?.projects.total || 0} />}
                        </p>
                      </div>
                      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <FolderOpen className="w-7 h-7 text-primary" />
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-primary/10 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: "100%" }}
                          transition={{ duration: 1.5, ease: "easeOut" }}
                          className="h-full bg-primary rounded-full"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Total Test Cases */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="relative overflow-hidden border-indigo-500/20 bg-gradient-to-br from-indigo-500/5 to-transparent" data-testid="card-test-cases">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Test Cases</p>
                        <p className="text-4xl font-bold mt-1 text-indigo-500" data-testid="stat-total-test-cases">
                          {analyticsLoading ? "..." : <AnimatedCounter value={analytics?.testCases.total || 0} />}
                        </p>
                      </div>
                      <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
                        <TestTube2 className="w-7 h-7 text-indigo-500" />
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-indigo-500/10 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: "85%" }}
                          transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
                          className="h-full bg-indigo-500 rounded-full"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Test Runs */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="relative overflow-hidden border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent" data-testid="card-test-runs">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Test Runs</p>
                        <p className="text-4xl font-bold mt-1 text-emerald-500" data-testid="stat-test-runs">
                          {analyticsLoading ? "..." : <AnimatedCounter value={analytics?.testRuns.total || 0} />}
                        </p>
                      </div>
                      <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                        <Activity className="w-7 h-7 text-emerald-500" />
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-sm text-emerald-500">
                      <TrendingUp className="w-4 h-4" />
                      <span>{analytics?.activity.lastWeek.testRuns || 0} this week</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Workflow Tests */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Card className="relative overflow-hidden border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-transparent" data-testid="card-workflow">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Workflow Tests</p>
                        <p className="text-4xl font-bold mt-1 text-violet-500" data-testid="stat-workflow">
                          {analyticsLoading ? "..." : <AnimatedCounter value={analytics?.testCases.workflow || 0} />}
                        </p>
                      </div>
                      <div className="w-14 h-14 rounded-2xl bg-violet-500/10 flex items-center justify-center">
                        <Workflow className="w-7 h-7 text-violet-500" />
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-sm text-violet-500">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>AI-discovered flows</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Test Case Breakdown - Horizontal Bar Chart Style */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card className="mb-10 overflow-hidden">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-primary" />
                        Test Case Distribution
                      </CardTitle>
                      <CardDescription>Breakdown by category</CardDescription>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {analytics?.testCases.total || 0} total
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { label: "Functional", value: analytics?.testCases.functional || 0, color: "bg-indigo-500", textColor: "text-indigo-500" },
                      { label: "Workflow", value: analytics?.testCases.workflow || 0, color: "bg-blue-500", textColor: "text-blue-500" },
                      { label: "Negative", value: analytics?.testCases.negative || 0, color: "bg-amber-500", textColor: "text-amber-500" },
                      { label: "Edge Case", value: analytics?.testCases.edgeCase || 0, color: "bg-purple-500", textColor: "text-purple-500" },
                      { label: "Sprint", value: analytics?.testCases.sprint || 0, color: "bg-emerald-500", textColor: "text-emerald-500" },
                    ].map((item, index) => {
                      const total = analytics?.testCases.total || 1;
                      const percentage = Math.round((item.value / total) * 100);
                      return (
                        <div key={item.label} className="flex items-center gap-4">
                          <div className="w-24 text-sm font-medium">{item.label}</div>
                          <div className="flex-1 h-8 bg-muted/30 rounded-lg overflow-hidden relative">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              transition={{ duration: 1, delay: 0.6 + index * 0.1, ease: "easeOut" }}
                              className={`h-full ${item.color} rounded-lg flex items-center justify-end pr-3`}
                            >
                              {percentage > 10 && (
                                <span className="text-xs font-bold text-white">{item.value}</span>
                              )}
                            </motion.div>
                            {percentage <= 10 && item.value > 0 && (
                              <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold ${item.textColor}`}>
                                {item.value}
                              </span>
                            )}
                          </div>
                          <div className={`w-12 text-right text-sm font-bold ${item.textColor}`}>
                            {percentage}%
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Quick Actions - Modern Cards */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10"
            >
              <Link href="/functional-testing" data-testid="link-functional-testing">
                <Card className="group cursor-pointer hover-elevate transition-all duration-300 h-full border-indigo-500/20 hover:border-indigo-500/40" data-testid="card-action-functional">
                  <CardContent className="pt-6 pb-6">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Zap className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-semibold mb-1" data-testid="text-action-functional">Autonomous Testing</h3>
                    <p className="text-sm text-muted-foreground">AI-powered test generation</p>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/sprint-agent" data-testid="link-sprint-testing">
                <Card className="group cursor-pointer hover-elevate transition-all duration-300 h-full border-emerald-500/20 hover:border-emerald-500/40" data-testid="card-action-sprint">
                  <CardContent className="pt-6 pb-6">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Target className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-semibold mb-1" data-testid="text-action-sprint">Generate from User Stories</h3>
                    <p className="text-sm text-muted-foreground">User story to tests</p>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/execution-mode" data-testid="link-execution-mode">
                <Card className="group cursor-pointer hover-elevate transition-all duration-300 h-full border-amber-500/20 hover:border-amber-500/40" data-testid="card-action-execution">
                  <CardContent className="pt-6 pb-6">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Play className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-semibold mb-1" data-testid="text-action-execution">Execution Mode</h3>
                    <p className="text-sm text-muted-foreground">Run tests with Playwright</p>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/visual-regression" data-testid="link-visual-regression">
                <Card className="group cursor-pointer hover-elevate transition-all duration-300 h-full border-violet-500/20 hover:border-violet-500/40" data-testid="card-action-visual">
                  <CardContent className="pt-6 pb-6">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Eye className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-semibold mb-1" data-testid="text-action-visual">Visual Regression</h3>
                    <p className="text-sm text-muted-foreground">Figma vs live comparison</p>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/recorder">
                <Card className="group cursor-pointer hover-elevate transition-all duration-300 h-full border-rose-500/20 hover:border-rose-500/40">
                  <CardContent className="pt-6 pb-6">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-red-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <CircleDot className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-semibold mb-1">Recording Studio</h3>
                    <p className="text-sm text-muted-foreground">Record & replay user flows</p>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/test-library">
                <Card className="group cursor-pointer hover-elevate transition-all duration-300 h-full border-fuchsia-500/20 hover:border-fuchsia-500/40">
                  <CardContent className="pt-6 pb-6">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-fuchsia-500 to-pink-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Library className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-semibold mb-1">Test Library</h3>
                    <p className="text-sm text-muted-foreground">Manage & run regression tests</p>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/coverage">
                <Card className="group cursor-pointer hover-elevate transition-all duration-300 h-full border-emerald-500/20 hover:border-emerald-500/40">
                  <CardContent className="pt-6 pb-6">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <span className="text-white text-xl">📊</span>
                    </div>
                    <h3 className="font-semibold mb-1">Coverage Reporter</h3>
                    <p className="text-sm text-muted-foreground">Track which flows are tested</p>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>

            {/* Recording Studio Workflow Banner */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.72 }}
              className="mb-8"
            >
              <div className="rounded-2xl border border-slate-800/60 bg-gradient-to-r from-slate-900/80 via-slate-900/60 to-slate-900/80 p-5 overflow-hidden relative">
                <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, rgb(239,68,68) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgb(168,85,247) 0%, transparent 50%)' }} />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-4">
                    <CircleDot className="w-4 h-4 text-rose-400" />
                    <span className="text-sm font-bold text-white">Recording Studio Workflow</span>
                    <span className="text-[10px] text-slate-500 ml-1">— record once, run forever</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {[
                      { step: '1', label: 'Record', desc: 'Open a URL, interact with the app', href: '/recorder', color: 'from-rose-600 to-red-600' },
                      { step: '2', label: 'Generate Script', desc: 'AI converts steps → Playwright', href: '/recorder', color: 'from-orange-600 to-amber-600' },
                      { step: '3', label: 'Save to Library', desc: 'Organise by module or suite', href: '/test-library', color: 'from-violet-600 to-purple-600' },
                      { step: '4', label: 'Execute', desc: 'Run selected tests, watch live', href: '/test-library', color: 'from-emerald-600 to-teal-600' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Link href={item.href}>
                          <div className="flex items-center gap-2.5 bg-slate-900 border border-slate-700/60 hover:border-slate-600 rounded-xl px-3.5 py-2.5 cursor-pointer transition-all group">
                            <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0`}>{item.step}</div>
                            <div>
                              <div className="text-xs font-semibold text-white group-hover:text-slate-200">{item.label}</div>
                              <div className="text-[10px] text-slate-600">{item.desc}</div>
                            </div>
                          </div>
                        </Link>
                        {i < 3 && <ChevronRight className="w-3.5 h-3.5 text-slate-700 flex-shrink-0" />}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Recent Activity Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.75 }}
              className="mb-10"
            >
              <Card className="overflow-hidden">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="w-5 h-5 text-primary" />
                        Recent Activity
                      </CardTitle>
                      <CardDescription>Latest actions across the platform</CardDescription>
                    </div>
                    <Link href="/reports">
                      <Button variant="outline" size="sm" data-testid="button-view-all-activity">
                        View All
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { action: "Generated 45 test cases", source: "Autonomous Testing", project: "Insurance Portal", time: "2 hours ago", icon: Zap, color: "text-indigo-400" },
                      { action: "Executed 32 tests", source: "Execution Mode", project: "Claims System", time: "4 hours ago", icon: Play, color: "text-amber-400" },
                      { action: "Created 28 tests from 5 user stories", source: "Generate from User Stories", project: "Policy Manager", time: "6 hours ago", icon: Target, color: "text-emerald-400" },
                      { action: "Exported test suite to Azure DevOps", source: "Import/Export Center", project: "Customer Portal", time: "1 day ago", icon: FileCode2, color: "text-violet-400" },
                    ].map((item, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.8 + index * 0.1 }}
                        className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                        data-testid={`activity-item-${index}`}
                      >
                        <div className={`w-10 h-10 rounded-lg bg-background flex items-center justify-center ${item.color}`}>
                          <item.icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">{item.action}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {item.source} - {item.project}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>{item.time}</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Recent Projects */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="mb-8"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Layers className="w-5 h-5 text-primary" />
                    Recent Projects
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Continue where you left off
                  </p>
                </div>
                <Link href="/projects">
                  <Button variant="outline" size="sm" data-testid="button-view-all-projects">
                    View All
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>

              {projectsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="pt-6">
                        <div className="h-4 bg-muted rounded w-3/4 mb-3" />
                        <div className="h-3 bg-muted rounded w-1/2" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : allProjects.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="pt-8 pb-8 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                      <Plus className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold mb-2">No Projects Yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Create your first project to start testing
                    </p>
                    <Link href="/projects">
                      <Button data-testid="button-create-first-project">
                        <Plus className="w-4 h-4 mr-2" />
                        Create Project
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allProjects.slice(0, 6).map((project, index) => (
                    <motion.div
                      key={project.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.9 + index * 0.05 }}
                    >
                      <Link href="/functional-testing">
                        <Card 
                          className={`group cursor-pointer hover-elevate transition-all duration-300 ${getProjectTypeColor(project.type)}`}
                          onClick={() => handleSelectProject(project.id)}
                          data-testid={`card-project-${project.id}`}
                        >
                          <CardContent className="pt-5 pb-5">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center">
                                  {getProjectTypeIcon(project.type)}
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  {project.domain || 'General'}
                                </Badge>
                              </div>
                              <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <h3 className="font-semibold mb-1 truncate">{project.name}</h3>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              <span>{format(new Date(project.createdAt), 'MMM d, yyyy')}</span>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
}
