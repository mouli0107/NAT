import { useEffect, useRef, useState } from "react";
import {
  Wand2, FileText, BookOpen, ShieldCheck, Brain, Loader2, CheckCircle2,
  XCircle, Copy, Download, Sparkles, ListChecks, Play, Database, FolderKanban, Plus, Layers,
  FileDown, Import, Cloud,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { MonacoEditor } from "@/components/functional/MonacoEditor";
import { Sidebar } from "@/components/dashboard/sidebar";

// ─── Types ──────────────────────────────────────────────────────────────────

interface TechProfile {
  id: string;
  name: string;
  description: string;
  layers: { id: string; label: string; summary: string }[];
}
interface Story {
  externalId: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
}
interface LoadedDoc { fileName: string; role: string; charCount: number; truncated: boolean }
interface Project { id: string; name: string; runCount?: number; elementCount?: number }
interface KElement { kind: string; name: string; module: string; summary: string; status: string; history: any[] }
interface Knowledge {
  project: { id: string; name: string };
  storyCount: number; elementCount: number;
  moduleMap: { module: string; count: number }[];
  runs: { id: string; storyExternalId: string; storyTitle: string; status: string; layerCount: number }[];
  elements: KElement[];
}
type LayerStatus = "pending" | "running" | "done" | "error";
interface LayerResult {
  layerId: string; label: string; status: LayerStatus; prompt: string; model?: string; error?: string;
}

const API = "/api/v1/prompt-generator";

const ROLE_META: Record<string, { label: string; icon: any }> = {
  fsd: { label: "FSD", icon: FileText },
  brd: { label: "BRD", icon: BookOpen },
  standards: { label: "CLAUDE.md", icon: ShieldCheck },
  memory: { label: "Memory", icon: Brain },
  other: { label: "Other", icon: FileText },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PromptGeneratorPage() {
  const { toast } = useToast();

  // Tech profiles
  const [profiles, setProfiles] = useState<TechProfile[]>([]);
  const [profileId, setProfileId] = useState<string>("");

  // Projects (foundation scope)
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string>("");
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [showKnowledge, setShowKnowledge] = useState(false);
  const [knowledge, setKnowledge] = useState<Knowledge | null>(null);
  const [loadingKnowledge, setLoadingKnowledge] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importSourceId, setImportSourceId] = useState("");

  // Context step
  const [fsd, setFsd] = useState<File | null>(null);
  const [brd, setBrd] = useState<File | null>(null);
  const [standards, setStandards] = useState<File | null>(null);
  const [memoryFile, setMemoryFile] = useState<File | null>(null);
  const [projectMemory, setProjectMemory] = useState("");
  const [loadingContext, setLoadingContext] = useState(false);
  const [bundleId, setBundleId] = useState<string | null>(null);
  const [loadedDocs, setLoadedDocs] = useState<LoadedDoc[]>([]);

  // Story step
  const [stories, setStories] = useState<Story[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [manual, setManual] = useState<Story>({ externalId: "", title: "", description: "", acceptanceCriteria: [] });
  const [manualAcs, setManualAcs] = useState("");

  // Azure DevOps pull
  const [adoOrg, setAdoOrg] = useState("");
  const [adoProject, setAdoProject] = useState("");
  const [adoPat, setAdoPat] = useState("");
  const [adoIterations, setAdoIterations] = useState<{ id: string; name: string; path: string }[]>([]);
  const [adoIteration, setAdoIteration] = useState("");
  const [adoBusy, setAdoBusy] = useState(false);

  // Generation
  const [generating, setGenerating] = useState(false);
  const [contract, setContract] = useState<string>("");
  const [layers, setLayers] = useState<LayerResult[]>([]);
  const [activeTab, setActiveTab] = useState<string>("contract");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    fetch(`${API}/tech-profiles`, { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        setProfiles(d.profiles ?? []);
        if (d.profiles?.[0]) setProfileId(d.profiles[0].id);
      })
      .catch(() => {});
    loadProjects();
    return () => { esRef.current?.close(); };
  }, []);

  const activeProfile = profiles.find(p => p.id === profileId);

  async function loadProjects(selectId?: string) {
    try {
      const d = await (await fetch(`${API}/projects`, { credentials: "include" })).json();
      setProjects(d.projects ?? []);
      if (selectId) setProjectId(selectId);
      else if (!projectId && d.projects?.[0]) setProjectId(d.projects[0].id);
    } catch { /* ignore */ }
  }

  async function createProject() {
    if (!newProjectName.trim()) return;
    try {
      const res = await fetch(`${API}/projects`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newProjectName.trim() }), credentials: "include",
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      const { project } = await res.json();
      setShowNewProject(false); setNewProjectName("");
      await loadProjects(project.id);
      toast({ title: "Project created", description: project.name });
    } catch (e: any) {
      toast({ title: "Could not create project", description: e.message, variant: "destructive" });
    }
  }

  async function downloadStoryRegister() {
    if (!projectId) { toast({ title: "Select a project first", variant: "destructive" }); return; }
    try {
      const d = await (await fetch(`${API}/projects/${projectId}/story-register`, { credentials: "include" })).json();
      const blob = new Blob([d.markdown || ""], { type: "text/markdown" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = "STORY-REGISTER.md"; a.click();
      URL.revokeObjectURL(a.href);
      toast({ title: "STORY-REGISTER.md downloaded" });
    } catch (e: any) {
      toast({ title: "Could not build story register", description: e.message, variant: "destructive" });
    }
  }

  async function importFoundation() {
    if (!projectId || !importSourceId) return;
    try {
      const res = await fetch(`${API}/projects/${projectId}/import-from`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceProjectId: importSourceId }), credentials: "include",
      });
      if (!res.ok) throw new Error((await res.json()).error || "Import failed");
      const { imported } = await res.json();
      setShowImport(false); setImportSourceId("");
      await loadProjects(projectId);
      toast({ title: "Foundation imported", description: `${imported} elements copied into this project.` });
    } catch (e: any) {
      toast({ title: "Import failed", description: e.message, variant: "destructive" });
    }
  }

  async function openKnowledge() {
    if (!projectId) { toast({ title: "Select a project first", variant: "destructive" }); return; }
    setShowKnowledge(true);
    setLoadingKnowledge(true);
    try {
      const d = await (await fetch(`${API}/projects/${projectId}/knowledge`, { credentials: "include" })).json();
      setKnowledge(d);
    } catch (e: any) {
      toast({ title: "Could not load context", description: e.message, variant: "destructive" });
    } finally {
      setLoadingKnowledge(false);
    }
  }

  // ── Load context ──────────────────────────────────────────────────────────
  async function loadContext() {
    setLoadingContext(true);
    try {
      const fd = new FormData();
      if (fsd) fd.append("fsd", fsd);
      if (brd) fd.append("brd", brd);
      if (standards) fd.append("standards", standards);
      if (memoryFile) fd.append("memory", memoryFile);
      if (projectMemory.trim()) fd.append("projectMemory", projectMemory);

      const res = await fetch(`${API}/context`, { method: "POST", body: fd, credentials: "include" });
      if (!res.ok) throw new Error((await res.json()).error || "Upload failed");
      const data = await res.json();
      setBundleId(data.bundleId);
      setLoadedDocs(data.docs ?? []);
      toast({ title: "Context loaded", description: `${data.docs?.length ?? 0} document(s) parsed.` });
    } catch (e: any) {
      toast({ title: "Could not load context", description: e.message, variant: "destructive" });
    } finally {
      setLoadingContext(false);
    }
  }

  // ── Extract stories ─────────────────────────────────────────────────────────
  async function extractStories() {
    if (!bundleId) return;
    setExtracting(true);
    try {
      const res = await fetch(`${API}/stories/extract`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bundleId }), credentials: "include",
      });
      if (!res.ok) throw new Error((await res.json()).error || "Extraction failed");
      const data = await res.json();
      setStories(data.stories ?? []);
      setSelectedIdx(data.stories?.length ? 0 : null);
      toast({ title: "Stories extracted", description: `${data.count ?? 0} user stor${data.count === 1 ? "y" : "ies"} found.` });
    } catch (e: any) {
      toast({ title: "Extraction failed", description: e.message, variant: "destructive" });
    } finally {
      setExtracting(false);
    }
  }

  async function loadAdoIterations() {
    if (!adoOrg || !adoProject || !adoPat) { toast({ title: "Enter organization, project and PAT", variant: "destructive" }); return; }
    setAdoBusy(true);
    try {
      const res = await fetch(`${API}/ado/iterations`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organization: adoOrg, project: adoProject, pat: adoPat }), credentials: "include",
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      const d = await res.json();
      setAdoIterations(d.iterations ?? []);
      if (d.iterations?.[0]) setAdoIteration(d.iterations[0].path);
      toast({ title: "Connected to Azure DevOps", description: `${d.iterations?.length ?? 0} iterations found.` });
    } catch (e: any) {
      toast({ title: "ADO connection failed", description: e.message, variant: "destructive" });
    } finally { setAdoBusy(false); }
  }

  async function pullAdoStories() {
    if (!adoIteration) { toast({ title: "Select an iteration", variant: "destructive" }); return; }
    setAdoBusy(true);
    try {
      const res = await fetch(`${API}/ado/stories`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organization: adoOrg, project: adoProject, pat: adoPat, iterationPath: adoIteration }),
        credentials: "include",
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      const d = await res.json();
      setStories(d.stories ?? []);
      setSelectedIdx(d.stories?.length ? 0 : null);
      toast({ title: "Pulled from Azure DevOps", description: `${d.count ?? 0} user stories loaded.` });
    } catch (e: any) {
      toast({ title: "Pull failed", description: e.message, variant: "destructive" });
    } finally { setAdoBusy(false); }
  }

  function resolveStory(): Story | null {
    if (selectedIdx !== null && stories[selectedIdx]) return stories[selectedIdx];
    if (manual.title.trim()) {
      return {
        ...manual,
        acceptanceCriteria: manualAcs.split("\n").map(s => s.trim()).filter(Boolean),
      };
    }
    return null;
  }

  // ── Generate ─────────────────────────────────────────────────────────────────
  async function generate() {
    const story = resolveStory();
    if (!bundleId) { toast({ title: "Load context first", variant: "destructive" }); return; }
    if (!story) { toast({ title: "Select or enter a user story", variant: "destructive" }); return; }

    setGenerating(true);
    setContract("");
    setActiveTab("contract");
    // seed layer placeholders from the active profile
    setLayers((activeProfile?.layers ?? []).map(l => ({
      layerId: l.id, label: l.label, status: "pending", prompt: "",
    })));

    try {
      const res = await fetch(`${API}/generate/start`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bundleId, techProfileId: profileId, projectId: projectId || undefined, story }),
        credentials: "include",
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to start");
      const { sessionId, projectId: usedProjectId } = await res.json();
      if (usedProjectId && usedProjectId !== projectId) { setProjectId(usedProjectId); loadProjects(usedProjectId); }
      openStream(sessionId);
    } catch (e: any) {
      setGenerating(false);
      toast({ title: "Generation failed to start", description: e.message, variant: "destructive" });
    }
  }

  function openStream(sessionId: string) {
    esRef.current?.close();
    const es = new EventSource(`${API}/generate/stream?sessionId=${sessionId}`);
    esRef.current = es;

    const setLayer = (id: string, patch: Partial<LayerResult>) =>
      setLayers(prev => prev.map(l => (l.layerId === id ? { ...l, ...patch } : l)));

    es.addEventListener("contract_start", () => {});
    es.addEventListener("contract_ready", (e: MessageEvent) => {
      const d = JSON.parse(e.data);
      setContract(d.markdown || "");
    });
    es.addEventListener("layer_start", (e: MessageEvent) => {
      const d = JSON.parse(e.data);
      setLayer(d.layerId, { status: "running", model: d.model });
    });
    es.addEventListener("layer_done", (e: MessageEvent) => {
      const d = JSON.parse(e.data);
      setLayer(d.layerId, { status: "done", prompt: d.prompt });
    });
    es.addEventListener("layer_error", (e: MessageEvent) => {
      const d = JSON.parse(e.data);
      setLayer(d.layerId, { status: "error", error: d.message });
    });
    es.addEventListener("complete", () => {
      setGenerating(false);
      es.close();
      loadProjects(projectId);  // refresh foundation counts (elements just persisted)
      toast({ title: "Prompts generated", description: "All layer prompts are ready. Foundation updated." });
    });
    es.addEventListener("error", (e: MessageEvent) => {
      // named 'error' event from server (payload) vs transient EventSource error (no data)
      if ((e as any).data) {
        try { toast({ title: "Generation error", description: JSON.parse((e as any).data).message, variant: "destructive" }); } catch {}
        setGenerating(false);
        es.close();
      }
    });
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  }

  function downloadAll() {
    const story = resolveStory();
    const parts = [`# AI-DLC Prompts — ${story?.externalId || ""} ${story?.title || ""}`.trim(), "", "## Contract", contract, ""];
    for (const l of layers) {
      if (l.prompt) parts.push(`## ${l.label} layer`, l.prompt, "");
    }
    const blob = new Blob([parts.join("\n")], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ai-dlc-prompts-${story?.externalId || "story"}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const statusIcon = (s: LayerStatus) =>
    s === "done" ? <CheckCircle2 className="h-4 w-4 text-green-600" />
    : s === "running" ? <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
    : s === "error" ? <XCircle className="h-4 w-4 text-red-500" />
    : <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />;

  const hasResults = !!contract || layers.some(l => l.prompt);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex overflow-hidden" style={{ height: "100vh" }}>
      <Sidebar isCollapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(c => !c)} />
      <div className="flex-1 overflow-auto bg-background">
        <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wand2 className="h-6 w-6 text-primary" /> Ascent
            <span className="text-sm font-normal text-muted-foreground">· AI-DLC Prompt Engine by Artizent</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Every story ascends on the ones before it. Load context, pick a user story, and generate layered
            implementation prompts — Domain, Application, API, Infrastructure, UI and Tests — aligned to Insurity standards.
          </p>
        </div>
        <div className="min-w-[260px]">
          <Label className="text-xs text-muted-foreground">Tech Profile</Label>
          <Select value={profileId} onValueChange={setProfileId}>
            <SelectTrigger data-testid="select-tech-profile"><SelectValue placeholder="Select stack" /></SelectTrigger>
            <SelectContent>
              {profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {activeProfile && <p className="text-xs text-muted-foreground mt-1">{activeProfile.description}</p>}
        </div>
      </div>

      {/* Project / foundation toolbar */}
      <div className="flex items-center gap-3 flex-wrap rounded-lg border bg-muted/30 px-3 py-2">
        <FolderKanban className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Project</span>
        <div className="min-w-[220px]">
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger data-testid="select-project"><SelectValue placeholder="Select a project" /></SelectTrigger>
            <SelectContent>
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}{typeof p.elementCount === "number" ? ` — ${p.elementCount} elements` : ""}
                </SelectItem>
              ))}
              {projects.length === 0 && <div className="px-2 py-1.5 text-xs text-muted-foreground">No projects yet</div>}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowNewProject(true)} data-testid="button-new-project">
          <Plus className="h-4 w-4 mr-1" /> New
        </Button>
        <Button variant="outline" size="sm" onClick={() => setShowImport(true)} disabled={!projectId} data-testid="button-import-foundation">
          <Import className="h-4 w-4 mr-1" /> Import
        </Button>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={downloadStoryRegister} disabled={!projectId} data-testid="button-story-register">
          <FileDown className="h-4 w-4 mr-1" /> STORY-REGISTER.md
        </Button>
        <Button variant="secondary" size="sm" onClick={openKnowledge} disabled={!projectId} data-testid="button-context-engine">
          <Database className="h-4 w-4 mr-2" /> Context Engine
        </Button>
        {(() => {
          const p = projects.find(x => x.id === projectId);
          return p ? (
            <span className="text-xs text-muted-foreground">
              Foundation: {p.runCount ?? 0} stories · {p.elementCount ?? 0} elements
            </span>
          ) : null;
        })()}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Step 1: Context */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm">1</span>
              Load Context
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 rounded-md bg-primary/5 border border-primary/20 px-3 py-2">
              <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
              <span className="text-xs">
                <b>Insurity coding standards + packages</b> are loaded by default — prompts will follow them and use Insurity shared libraries.
              </span>
            </div>
            <FileField label="Functional Spec (FSD)" icon={FileText} file={fsd} onPick={setFsd} />
            <FileField label="Business Requirements (BRD)" icon={BookOpen} file={brd} onPick={setBrd} />
            <FileField label="Coding Standards (CLAUDE.md)" icon={ShieldCheck} file={standards} onPick={setStandards} />
            <FileField label="Project Memory (doc)" icon={Brain} file={memoryFile} onPick={setMemoryFile} />
            <div>
              <Label className="text-xs text-muted-foreground">…or paste Project Memory (prior decisions, golden-path notes)</Label>
              <Textarea rows={3} value={projectMemory} onChange={e => setProjectMemory(e.target.value)}
                placeholder="e.g. US-4.1 Rule CRUD is the golden path for aggregate + CQRS; multi-tenant scoping is mandatory…"
                data-testid="input-project-memory" />
            </div>
            <Button onClick={loadContext} disabled={loadingContext} className="w-full" data-testid="button-load-context">
              {loadingContext ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Load Context
            </Button>
            {loadedDocs.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {loadedDocs.map((d, i) => {
                  const M = ROLE_META[d.role] ?? ROLE_META.other;
                  return (
                    <Badge key={i} variant="secondary" className="gap-1">
                      <M.icon className="h-3 w-3" /> {d.fileName}
                      {d.truncated && <span className="text-amber-600">(truncated)</span>}
                    </Badge>
                  );
                })}
                {projectMemory.trim() && <Badge variant="secondary" className="gap-1"><Brain className="h-3 w-3" /> memory</Badge>}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Story */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm">2</span>
              Select a User Story
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" onClick={extractStories} disabled={!bundleId || extracting} className="w-full" data-testid="button-extract-stories">
              {extracting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ListChecks className="h-4 w-4 mr-2" />}
              Extract Stories from FSD/BRD
            </Button>

            <details className="rounded-md border p-2">
              <summary className="text-sm font-medium cursor-pointer flex items-center gap-2">
                <Cloud className="h-4 w-4 text-primary" /> Pull from Azure DevOps
              </summary>
              <div className="space-y-2 pt-2">
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Organization" value={adoOrg} onChange={e => setAdoOrg(e.target.value)} data-testid="input-ado-org" />
                  <Input placeholder="Project" value={adoProject} onChange={e => setAdoProject(e.target.value)} data-testid="input-ado-project" />
                </div>
                <Input type="password" placeholder="Personal Access Token (used once, never stored)" value={adoPat}
                  onChange={e => setAdoPat(e.target.value)} data-testid="input-ado-pat" />
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={loadAdoIterations} disabled={adoBusy} data-testid="button-ado-connect">
                    {adoBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Connect"}
                  </Button>
                  {adoIterations.length > 0 && (
                    <div className="flex-1">
                      <Select value={adoIteration} onValueChange={setAdoIteration}>
                        <SelectTrigger data-testid="select-ado-iteration"><SelectValue placeholder="Iteration / sprint" /></SelectTrigger>
                        <SelectContent>
                          {adoIterations.map(it => <SelectItem key={it.id} value={it.path}>{it.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                {adoIterations.length > 0 && (
                  <Button size="sm" className="w-full" onClick={pullAdoStories} disabled={adoBusy} data-testid="button-ado-pull">
                    <Cloud className="h-4 w-4 mr-2" /> Pull user stories
                  </Button>
                )}
              </div>
            </details>

            {stories.length > 0 && (
              <div className="max-h-56 overflow-y-auto space-y-2 border rounded-md p-2">
                {stories.map((s, i) => (
                  <button key={i} onClick={() => setSelectedIdx(i)}
                    className={`w-full text-left rounded-md p-2 border transition ${selectedIdx === i ? "border-primary bg-primary/5" : "border-transparent hover:bg-muted"}`}
                    data-testid={`story-option-${i}`}>
                    <div className="flex items-center gap-2">
                      {s.externalId && <Badge variant="outline" className="text-xs">{s.externalId}</Badge>}
                      <span className="font-medium text-sm">{s.title}</span>
                    </div>
                    {s.acceptanceCriteria.length > 0 &&
                      <div className="text-xs text-muted-foreground mt-1">{s.acceptanceCriteria.length} acceptance criteria</div>}
                  </button>
                ))}
              </div>
            )}

            <Separator />
            <details>
              <summary className="text-sm text-muted-foreground cursor-pointer">…or enter a story manually</summary>
              <div className="space-y-2 pt-2">
                <div className="grid grid-cols-3 gap-2">
                  <Input placeholder="ID (US-4.1)" value={manual.externalId}
                    onChange={e => { setManual({ ...manual, externalId: e.target.value }); setSelectedIdx(null); }} />
                  <Input className="col-span-2" placeholder="Title" value={manual.title}
                    onChange={e => { setManual({ ...manual, title: e.target.value }); setSelectedIdx(null); }} />
                </div>
                <Textarea rows={2} placeholder="Description" value={manual.description}
                  onChange={e => setManual({ ...manual, description: e.target.value })} />
                <Textarea rows={3} placeholder="Acceptance criteria (one per line)" value={manualAcs}
                  onChange={e => { setManualAcs(e.target.value); setSelectedIdx(null); }} />
              </div>
            </details>

            <Button onClick={generate} disabled={generating || !bundleId} className="w-full" data-testid="button-generate">
              {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
              Generate Layered Prompts
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Progress + Results */}
      {(generating || hasResults) && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Generated Prompts</CardTitle>
            {hasResults && (
              <Button variant="outline" size="sm" onClick={downloadAll} data-testid="button-download-all">
                <Download className="h-4 w-4 mr-2" /> Download all (.md)
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {/* layer status chips */}
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge variant={contract ? "default" : "secondary"} className="gap-1">
                {contract ? <CheckCircle2 className="h-3 w-3" /> : <Loader2 className="h-3 w-3 animate-spin" />} Contract
              </Badge>
              {layers.map(l => (
                <Badge key={l.layerId} variant="secondary" className="gap-1">{statusIcon(l.status)} {l.label}</Badge>
              ))}
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="flex-wrap h-auto">
                <TabsTrigger value="contract" data-testid="tab-contract">Contract</TabsTrigger>
                {layers.map(l => (
                  <TabsTrigger key={l.layerId} value={l.layerId} disabled={!l.prompt && l.status !== "error"}>
                    {l.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="contract">
                <PromptView text={contract} placeholder="The cross-layer contract will appear here first…" onCopy={copy} />
              </TabsContent>
              {layers.map(l => (
                <TabsContent key={l.layerId} value={l.layerId}>
                  {l.status === "error"
                    ? <div className="text-red-500 text-sm p-4">Failed: {l.error}</div>
                    : <PromptView text={l.prompt} placeholder="Generating…" onCopy={copy} />}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* New Project dialog */}
      <Dialog open={showNewProject} onOpenChange={setShowNewProject}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Project</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            A project is the foundation scope — every story you generate is remembered here, so later stories build on it.
          </p>
          <Input autoFocus placeholder="Project name (e.g. Insurity Rating Engine)" value={newProjectName}
            onChange={e => setNewProjectName(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") createProject(); }} data-testid="input-new-project-name" />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowNewProject(false)}>Cancel</Button>
            <Button onClick={createProject}>Create</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import foundation dialog */}
      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent>
          <DialogHeader><DialogTitle>Import foundation from another project</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Copy another project's element catalog into <b>{projects.find(p => p.id === projectId)?.name ?? "this project"}</b> so
            new stories here can reuse/extend those elements. Only your own projects are listed.
          </p>
          <Select value={importSourceId} onValueChange={setImportSourceId}>
            <SelectTrigger data-testid="select-import-source"><SelectValue placeholder="Source project" /></SelectTrigger>
            <SelectContent>
              {projects.filter(p => p.id !== projectId).map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}{typeof p.elementCount === "number" ? ` — ${p.elementCount} elements` : ""}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowImport(false)}>Cancel</Button>
            <Button onClick={importFoundation} disabled={!importSourceId}>Import</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Context Engine (knowledge) dialog */}
      <Dialog open={showKnowledge} onOpenChange={setShowKnowledge}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" /> Context Engine — what the engine knows
            </DialogTitle>
          </DialogHeader>
          {loadingKnowledge ? (
            <div className="py-10 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline mr-2" />Loading…</div>
          ) : knowledge ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This is the accumulated foundation for <b>{knowledge.project.name}</b>. New stories are generated on top of
                it — the engine reuses/extends these elements instead of reinventing them.
              </p>
              <div className="flex gap-3">
                <div className="flex-1 rounded-lg border p-3 text-center">
                  <div className="text-2xl font-bold">{knowledge.storyCount}</div>
                  <div className="text-xs text-muted-foreground">stories generated</div>
                </div>
                <div className="flex-1 rounded-lg border p-3 text-center">
                  <div className="text-2xl font-bold">{knowledge.elementCount}</div>
                  <div className="text-xs text-muted-foreground">catalog elements</div>
                </div>
                <div className="flex-1 rounded-lg border p-3 text-center">
                  <div className="text-2xl font-bold">{knowledge.moduleMap.length}</div>
                  <div className="text-xs text-muted-foreground">modules</div>
                </div>
              </div>

              {knowledge.moduleMap.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1"><Layers className="h-3 w-3" /> MODULES</div>
                  <div className="flex flex-wrap gap-2">
                    {knowledge.moduleMap.map(m => <Badge key={m.module} variant="secondary">{m.module} · {m.count}</Badge>)}
                  </div>
                </div>
              )}

              <div>
                <div className="text-xs font-semibold text-muted-foreground mb-1">STORIES IN FOUNDATION</div>
                {knowledge.runs.length === 0 ? <p className="text-sm text-muted-foreground">None yet.</p> : (
                  <div className="space-y-1">
                    {knowledge.runs.map(r => (
                      <div key={r.id} className="flex items-center gap-2 text-sm border rounded px-2 py-1">
                        {r.storyExternalId && <Badge variant="outline" className="text-xs">{r.storyExternalId}</Badge>}
                        <span className="flex-1 truncate">{r.storyTitle}</span>
                        <span className="text-xs text-muted-foreground">{r.layerCount} layers</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="text-xs font-semibold text-muted-foreground mb-1">ELEMENT CATALOG (deduped — grows with the domain model, not story count)</div>
                {knowledge.elements.length === 0 ? <p className="text-sm text-muted-foreground">No elements yet — generate a story to seed the foundation.</p> : (
                  <div className="border rounded-md overflow-hidden">
                    <div className="grid grid-cols-[110px_1fr_120px_90px] gap-2 px-3 py-1.5 bg-muted text-xs font-semibold">
                      <span>Kind</span><span>Name</span><span>Module</span><span>Status</span>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {knowledge.elements.map((e, i) => (
                        <div key={i} className="grid grid-cols-[110px_1fr_120px_90px] gap-2 px-3 py-1.5 text-sm border-t items-center">
                          <span className="text-muted-foreground">{e.kind}</span>
                          <span className="font-medium truncate" title={e.summary}>{e.name}</span>
                          <span className="text-xs text-muted-foreground truncate">{e.module || "—"}</span>
                          <Badge variant={e.status === "new" ? "default" : "secondary"} className="text-xs justify-self-start">{e.status || "new"}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-6">No context loaded.</p>
          )}
        </DialogContent>
      </Dialog>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────────

function FileField({ label, icon: Icon, file, onPick }: {
  label: string; icon: any; file: File | null; onPick: (f: File | null) => void;
}) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground flex items-center gap-1"><Icon className="h-3 w-3" /> {label}</Label>
      <Input type="file" accept=".md,.markdown,.txt,.pdf,.docx,.xlsx,.json,.feature,.yaml,.yml,.csv"
        onChange={e => onPick(e.target.files?.[0] ?? null)} />
      {file && <p className="text-xs text-green-600 mt-1">{file.name}</p>}
    </div>
  );
}

function PromptView({ text, placeholder, onCopy }: { text: string; placeholder: string; onCopy: (t: string) => void }) {
  if (!text) return <div className="text-sm text-muted-foreground p-6 text-center">{placeholder}</div>;
  return (
    <div className="relative">
      <Button variant="outline" size="sm" className="absolute right-2 top-2 z-10" onClick={() => onCopy(text)}>
        <Copy className="h-4 w-4 mr-1" /> Copy
      </Button>
      <MonacoEditor value={text} language="markdown" readOnly height="480px" />
    </div>
  );
}
