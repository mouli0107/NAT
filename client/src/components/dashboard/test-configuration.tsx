import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

interface TestConfigurationProps {
  onStartDemo: (config: { 
    figmaUrl: string; 
    websiteUrl: string; 
    testScope: string; 
    browserTarget: string 
  }) => void;
}

export function TestConfiguration({ onStartDemo }: TestConfigurationProps) {
  const [figmaUrl, setFigmaUrl] = useState("https://www.figma.com/file/abc123/InsurancePortal");
  const [websiteUrl, setWebsiteUrl] = useState("https://demo.insurity.com/policy-portal");
  const [testScope, setTestScope] = useState("full-page");
  const [browserTarget, setBrowserTarget] = useState("chrome");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStartDemo({ figmaUrl, websiteUrl, testScope, browserTarget });
  };

  return (
    <div className="p-6 w-full">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-purple-500/20">
          <Sparkles className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground">Visual Regression</h2>
          <p className="text-sm text-muted-foreground">
            AI agents analyse your Figma designs and compare them against your live website in real-time
          </p>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Left — Configuration form (2/3 width) */}
        <div className="xl:col-span-2">
          <Card className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="figma-url" className="text-sm font-semibold text-foreground">
                    Figma Design File URL
                  </Label>
                  <Input
                    id="figma-url"
                    type="text"
                    placeholder="https://www.figma.com/file/..."
                    value={figmaUrl}
                    onChange={(e) => setFigmaUrl(e.target.value)}
                    className="min-h-10"
                    data-testid="input-figma-url"
                  />
                  <p className="text-xs text-muted-foreground">Figma file containing your baseline design</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website-url" className="text-sm font-semibold text-foreground">
                    Website / Application URL
                  </Label>
                  <Input
                    id="website-url"
                    type="text"
                    placeholder="https://your-app.com"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    className="min-h-10"
                    data-testid="input-website-url"
                  />
                  <p className="text-xs text-muted-foreground">Live website to test against the design</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="test-scope" className="text-sm font-semibold text-foreground">Test Scope</Label>
                  <Select value={testScope} onValueChange={setTestScope}>
                    <SelectTrigger id="test-scope" className="min-h-10" data-testid="select-test-scope">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full-page">Full Page</SelectItem>
                      <SelectItem value="component">Component</SelectItem>
                      <SelectItem value="accessibility">Accessibility Scan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="browser-target" className="text-sm font-semibold text-foreground">Browser Target</Label>
                  <Select value={browserTarget} onValueChange={setBrowserTarget}>
                    <SelectTrigger id="browser-target" className="min-h-10" data-testid="select-browser-target">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="chrome">Chrome</SelectItem>
                      <SelectItem value="firefox">Firefox</SelectItem>
                      <SelectItem value="safari">Safari</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-sm text-foreground">
                  <span className="font-semibold">Visual Regression Testing:</span> Configure your design comparison parameters above. AI agents will capture screenshots, compare pixel-by-pixel, and report visual deviations automatically.
                </p>
              </div>

              <Button type="submit" className="w-full" size="lg" data-testid="button-start-test">
                Start Test Now
              </Button>
            </form>
          </Card>
        </div>

        {/* Right — Info panel (1/3 width) */}
        <div className="flex flex-col gap-4">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">How it works</h3>
            <ol className="space-y-3">
              {[
                { n: "1", t: "Fetch Figma design", d: "AI extracts layout from your Figma file" },
                { n: "2", t: "Capture live site", d: "Puppeteer screenshots at target URL" },
                { n: "3", t: "Pixel comparison", d: "SSIM + diff-map generated per element" },
                { n: "4", t: "Report deviations", d: "Annotated results with confidence scores" },
              ].map(s => (
                <li key={s.n} className="flex gap-3">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center">{s.n}</span>
                  <div>
                    <p className="text-xs font-semibold text-foreground">{s.t}</p>
                    <p className="text-xs text-muted-foreground">{s.d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">Supported formats</h3>
            <div className="space-y-2">
              {[
                { label: "Figma", status: "Full support" },
                { label: "Chrome / Firefox / Safari", status: "All targets" },
                { label: "Full page + components", status: "3 scopes" },
                { label: "WCAG accessibility scan", status: "Built-in" },
              ].map(f => (
                <div key={f.label} className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{f.label}</span>
                  <span className="text-xs font-medium text-emerald-500">{f.status}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
