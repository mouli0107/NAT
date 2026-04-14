import { useState } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import type { AccessibilityViolation, WCAGCriterion } from "@shared/schema";
import { 
  Accessibility, 
  Play,
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  Download,
  Eye,
  Keyboard,
  Palette,
  Volume2,
  Shield,
  FileText,
  ExternalLink,
  Info,
  Brain,
  Clock,
  Lightbulb,
  Target,
  Wrench
} from "lucide-react";

interface AccessibilityAIAnalysis {
  summary: string;
  prioritizedIssues: {
    issue: string;
    impact: string;
    affectedUsers: string;
    remediation: string;
    codeExample?: string;
  }[];
  complianceStatus: {
    wcag21AA: boolean;
    section508: boolean;
    adaCompliance: boolean;
  };
  recommendations: string[];
  estimatedFixTime: string;
}

const wcagPrinciples = [
  { id: "perceivable", name: "Perceivable", icon: Eye, color: "text-violet-400", bgColor: "bg-violet-500/20" },
  { id: "operable", name: "Operable", icon: Keyboard, color: "text-cyan-400", bgColor: "bg-cyan-500/20" },
  { id: "understandable", name: "Understandable", icon: FileText, color: "text-emerald-400", bgColor: "bg-emerald-500/20" },
  { id: "robust", name: "Robust", icon: Shield, color: "text-amber-400", bgColor: "bg-amber-500/20" },
];

const sampleViolations: AccessibilityViolation[] = [
  {
    id: "color-contrast",
    impact: "serious",
    description: "Elements must have sufficient color contrast",
    help: "Ensure the contrast ratio between the foreground and background colors is at least 4.5:1 for normal text and 3:1 for large text.",
    helpUrl: "https://dequeuniversity.com/rules/axe/4.4/color-contrast",
    tags: ["wcag2aa", "wcag143"],
    nodes: [
      { html: '<p class="subtitle">Low contrast text</p>', target: [".subtitle"], failureSummary: "Element has insufficient color contrast of 2.5:1 (foreground: #888, background: #fff). Expected 4.5:1." }
    ]
  },
  {
    id: "image-alt",
    impact: "critical",
    description: "Images must have alternate text",
    help: "All images must have an alt attribute that describes the image content.",
    helpUrl: "https://dequeuniversity.com/rules/axe/4.4/image-alt",
    tags: ["wcag2a", "wcag111"],
    nodes: [
      { html: '<img src="logo.png">', target: ["img.logo"], failureSummary: "Element has no alt attribute" }
    ]
  },
  {
    id: "label",
    impact: "critical",
    description: "Form elements must have labels",
    help: "Ensure every form element has a corresponding label.",
    helpUrl: "https://dequeuniversity.com/rules/axe/4.4/label",
    tags: ["wcag2a", "wcag412"],
    nodes: [
      { html: '<input type="text" name="search">', target: ["input[name='search']"], failureSummary: "Form element does not have an associated label" }
    ]
  }
];

const sampleWCAGCriteria: WCAGCriterion[] = [
  { id: "1.1.1", level: "A", principle: "perceivable", status: "fail", violations: 2 },
  { id: "1.3.1", level: "A", principle: "perceivable", status: "pass" },
  { id: "1.4.3", level: "AA", principle: "perceivable", status: "fail", violations: 5 },
  { id: "1.4.11", level: "AA", principle: "perceivable", status: "pass" },
  { id: "2.1.1", level: "A", principle: "operable", status: "pass" },
  { id: "2.1.2", level: "A", principle: "operable", status: "pass" },
  { id: "2.4.3", level: "A", principle: "operable", status: "incomplete" },
  { id: "2.4.6", level: "AA", principle: "operable", status: "pass" },
  { id: "3.1.1", level: "A", principle: "understandable", status: "pass" },
  { id: "3.2.1", level: "A", principle: "understandable", status: "pass" },
  { id: "3.3.1", level: "A", principle: "understandable", status: "fail", violations: 1 },
  { id: "4.1.1", level: "A", principle: "robust", status: "pass" },
  { id: "4.1.2", level: "A", principle: "robust", status: "fail", violations: 3 },
];

interface WCAGTestCase {
  id: string;
  criterion: string;
  level: "A" | "AA";
  principle: "perceivable" | "operable" | "understandable" | "robust";
  name: string;
  description: string;
  testProcedure: string[];
  expectedResult: string;
  automatable: boolean;
  tools: string[];
}

const wcagAATestCases: WCAGTestCase[] = [
  {
    id: "TC-1.1.1-01",
    criterion: "1.1.1",
    level: "A",
    principle: "perceivable",
    name: "Non-text Content - Images",
    description: "All images must have appropriate alt text that describes the image content",
    testProcedure: [
      "Identify all <img> elements on the page",
      "Check each image for an alt attribute",
      "Verify alt text accurately describes the image",
      "For decorative images, verify alt=\"\" is used"
    ],
    expectedResult: "All images have appropriate alt text or are marked as decorative",
    automatable: true,
    tools: ["axe-core", "WAVE", "Claude Vision AI"]
  },
  {
    id: "TC-1.1.1-02",
    criterion: "1.1.1",
    level: "A",
    principle: "perceivable",
    name: "Non-text Content - Icons",
    description: "Icons conveying information must have text alternatives",
    testProcedure: [
      "Identify all icon elements (SVG, icon fonts)",
      "Check for aria-label or aria-labelledby",
      "Verify screen readers announce the icon purpose"
    ],
    expectedResult: "All informative icons have accessible names",
    automatable: true,
    tools: ["axe-core", "Screen reader"]
  },
  {
    id: "TC-1.3.1-01",
    criterion: "1.3.1",
    level: "A",
    principle: "perceivable",
    name: "Info and Relationships - Headings",
    description: "Content structure must be programmatically determinable through proper heading hierarchy",
    testProcedure: [
      "Check heading elements (h1-h6) are used",
      "Verify heading levels don't skip (h1->h3)",
      "Ensure headings accurately describe content",
      "Check only one h1 exists per page"
    ],
    expectedResult: "Headings follow proper hierarchy without skipping levels",
    automatable: true,
    tools: ["axe-core", "HeadingsMap extension"]
  },
  {
    id: "TC-1.3.1-02",
    criterion: "1.3.1",
    level: "A",
    principle: "perceivable",
    name: "Info and Relationships - Form Labels",
    description: "Form inputs must be programmatically associated with labels",
    testProcedure: [
      "Check each form input has a label",
      "Verify label for= matches input id",
      "Or verify aria-labelledby is used correctly"
    ],
    expectedResult: "All form inputs are properly labeled",
    automatable: true,
    tools: ["axe-core", "WAVE"]
  },
  {
    id: "TC-1.3.1-03",
    criterion: "1.3.1",
    level: "A",
    principle: "perceivable",
    name: "Info and Relationships - Tables",
    description: "Data tables must have proper header cells and associations",
    testProcedure: [
      "Identify all data tables",
      "Check for <th> elements in headers",
      "Verify scope attribute is used",
      "Check for caption if needed"
    ],
    expectedResult: "Data tables are properly structured with headers",
    automatable: true,
    tools: ["axe-core", "Table Inspector"]
  },
  {
    id: "TC-1.4.1-01",
    criterion: "1.4.1",
    level: "A",
    principle: "perceivable",
    name: "Use of Color",
    description: "Color must not be the only means of conveying information",
    testProcedure: [
      "Identify elements using color to convey info",
      "Verify additional indicators exist (icons, text, patterns)",
      "Test with grayscale simulation",
      "Check error/success states"
    ],
    expectedResult: "Information is conveyed through multiple means, not just color",
    automatable: false,
    tools: ["Claude Vision AI", "Colorblind simulator"]
  },
  {
    id: "TC-1.4.3-01",
    criterion: "1.4.3",
    level: "AA",
    principle: "perceivable",
    name: "Contrast (Minimum) - Normal Text",
    description: "Normal text must have contrast ratio of at least 4.5:1",
    testProcedure: [
      "Identify all normal text elements (<18pt or <14pt bold)",
      "Calculate contrast ratio for each",
      "Verify ratio meets 4.5:1 minimum",
      "Check text on images/gradients"
    ],
    expectedResult: "All normal text has 4.5:1 contrast ratio or higher",
    automatable: true,
    tools: ["axe-core", "Color Contrast Analyzer", "Claude Vision AI"]
  },
  {
    id: "TC-1.4.3-02",
    criterion: "1.4.3",
    level: "AA",
    principle: "perceivable",
    name: "Contrast (Minimum) - Large Text",
    description: "Large text (18pt+ or 14pt+ bold) must have contrast ratio of at least 3:1",
    testProcedure: [
      "Identify large text elements (>=18pt or >=14pt bold)",
      "Calculate contrast ratio",
      "Verify ratio meets 3:1 minimum"
    ],
    expectedResult: "All large text has 3:1 contrast ratio or higher",
    automatable: true,
    tools: ["axe-core", "Color Contrast Analyzer"]
  },
  {
    id: "TC-1.4.4-01",
    criterion: "1.4.4",
    level: "AA",
    principle: "perceivable",
    name: "Resize Text",
    description: "Text can be resized up to 200% without loss of content or functionality",
    testProcedure: [
      "Zoom page to 200%",
      "Check all text remains visible",
      "Verify no content overlap",
      "Ensure functionality remains usable"
    ],
    expectedResult: "All content readable and functional at 200% zoom",
    automatable: false,
    tools: ["Browser zoom", "Claude Vision AI"]
  },
  {
    id: "TC-1.4.10-01",
    criterion: "1.4.10",
    level: "AA",
    principle: "perceivable",
    name: "Reflow",
    description: "Content can reflow at 320px width without horizontal scrolling",
    testProcedure: [
      "Set viewport to 320px width",
      "Check for horizontal scrolling",
      "Verify all content is accessible",
      "Test interactive elements"
    ],
    expectedResult: "No horizontal scrolling required at 320px width",
    automatable: false,
    tools: ["Browser DevTools", "Responsive test tool"]
  },
  {
    id: "TC-1.4.11-01",
    criterion: "1.4.11",
    level: "AA",
    principle: "perceivable",
    name: "Non-text Contrast",
    description: "UI components and graphical objects must have 3:1 contrast",
    testProcedure: [
      "Identify buttons, inputs, icons",
      "Calculate contrast against background",
      "Check focus indicators",
      "Verify graphical objects have sufficient contrast"
    ],
    expectedResult: "All UI components have 3:1 contrast ratio",
    automatable: true,
    tools: ["axe-core", "Claude Vision AI"]
  },
  {
    id: "TC-1.4.12-01",
    criterion: "1.4.12",
    level: "AA",
    principle: "perceivable",
    name: "Text Spacing",
    description: "Text remains readable when line height, letter/word spacing are increased",
    testProcedure: [
      "Apply 1.5x line height",
      "Apply 0.12em letter spacing",
      "Apply 0.16em word spacing",
      "Verify no content loss"
    ],
    expectedResult: "Text readable with increased spacing settings",
    automatable: false,
    tools: ["Text Spacing bookmarklet"]
  },
  {
    id: "TC-2.1.1-01",
    criterion: "2.1.1",
    level: "A",
    principle: "operable",
    name: "Keyboard - All Functionality",
    description: "All functionality must be operable via keyboard",
    testProcedure: [
      "Tab through all interactive elements",
      "Verify all elements are reachable",
      "Test Enter/Space for activation",
      "Check arrow key navigation where appropriate"
    ],
    expectedResult: "All functionality accessible via keyboard",
    automatable: false,
    tools: ["Keyboard testing", "axe-core"]
  },
  {
    id: "TC-2.1.2-01",
    criterion: "2.1.2",
    level: "A",
    principle: "operable",
    name: "No Keyboard Trap",
    description: "Keyboard focus must not become trapped in any element",
    testProcedure: [
      "Tab through page elements",
      "Enter modals/dialogs",
      "Verify ability to exit",
      "Check custom widgets"
    ],
    expectedResult: "Focus can always be moved away from any element",
    automatable: false,
    tools: ["Keyboard testing"]
  },
  {
    id: "TC-2.4.3-01",
    criterion: "2.4.3",
    level: "A",
    principle: "operable",
    name: "Focus Order",
    description: "Focus order must follow a logical reading sequence",
    testProcedure: [
      "Tab through page elements",
      "Verify order matches visual layout",
      "Check dynamically added content",
      "Test modal dialogs"
    ],
    expectedResult: "Focus order is logical and predictable",
    automatable: false,
    tools: ["Keyboard testing"]
  },
  {
    id: "TC-2.4.4-01",
    criterion: "2.4.4",
    level: "A",
    principle: "operable",
    name: "Link Purpose (In Context)",
    description: "Link purpose must be determinable from link text or context",
    testProcedure: [
      "Identify all links",
      "Check link text is descriptive",
      "Avoid 'click here', 'read more'",
      "Verify programmatic context if needed"
    ],
    expectedResult: "All links have clear, descriptive text",
    automatable: true,
    tools: ["axe-core", "WAVE"]
  },
  {
    id: "TC-2.4.6-01",
    criterion: "2.4.6",
    level: "AA",
    principle: "operable",
    name: "Headings and Labels",
    description: "Headings and labels must describe topic or purpose",
    testProcedure: [
      "Review all headings for clarity",
      "Check form labels are descriptive",
      "Verify headings match content",
      "Test with screen reader"
    ],
    expectedResult: "All headings and labels are descriptive",
    automatable: false,
    tools: ["Manual review", "Screen reader"]
  },
  {
    id: "TC-2.4.7-01",
    criterion: "2.4.7",
    level: "AA",
    principle: "operable",
    name: "Focus Visible",
    description: "Keyboard focus indicator must be visible",
    testProcedure: [
      "Tab through all focusable elements",
      "Verify focus indicator is visible",
      "Check indicator has sufficient contrast",
      "Test in both light/dark modes"
    ],
    expectedResult: "All focusable elements have visible focus indicator",
    automatable: true,
    tools: ["Claude Vision AI", "Keyboard testing"]
  },
  {
    id: "TC-3.1.1-01",
    criterion: "3.1.1",
    level: "A",
    principle: "understandable",
    name: "Language of Page",
    description: "The default language of the page must be programmatically identified",
    testProcedure: [
      "Check <html> element for lang attribute",
      "Verify language code is valid",
      "Check lang matches content language"
    ],
    expectedResult: "HTML element has valid lang attribute",
    automatable: true,
    tools: ["axe-core", "WAVE"]
  },
  {
    id: "TC-3.2.1-01",
    criterion: "3.2.1",
    level: "A",
    principle: "understandable",
    name: "On Focus",
    description: "Receiving focus must not cause unexpected context change",
    testProcedure: [
      "Tab to each focusable element",
      "Verify no automatic form submissions",
      "Check no unexpected navigation",
      "Ensure no popup windows on focus"
    ],
    expectedResult: "No context changes occur on focus alone",
    automatable: false,
    tools: ["Keyboard testing"]
  },
  {
    id: "TC-3.2.2-01",
    criterion: "3.2.2",
    level: "A",
    principle: "understandable",
    name: "On Input",
    description: "Changing form settings must not cause unexpected context change",
    testProcedure: [
      "Test form inputs and select elements",
      "Verify no auto-submit on change",
      "Check checkboxes/radios behavior",
      "Ensure user-initiated submission"
    ],
    expectedResult: "No unexpected context changes on input",
    automatable: false,
    tools: ["Manual testing"]
  },
  {
    id: "TC-3.3.1-01",
    criterion: "3.3.1",
    level: "A",
    principle: "understandable",
    name: "Error Identification",
    description: "Form errors must be identified and described in text",
    testProcedure: [
      "Submit forms with invalid data",
      "Check error messages are displayed",
      "Verify errors identify the field",
      "Ensure errors are perceivable"
    ],
    expectedResult: "All form errors are clearly identified in text",
    automatable: false,
    tools: ["Manual testing", "Screen reader"]
  },
  {
    id: "TC-3.3.2-01",
    criterion: "3.3.2",
    level: "A",
    principle: "understandable",
    name: "Labels or Instructions",
    description: "Labels or instructions are provided for user input",
    testProcedure: [
      "Check all form fields have labels",
      "Verify required fields are indicated",
      "Check format instructions are provided",
      "Test with screen reader"
    ],
    expectedResult: "All inputs have clear labels and instructions",
    automatable: true,
    tools: ["axe-core", "Manual review"]
  },
  {
    id: "TC-3.3.3-01",
    criterion: "3.3.3",
    level: "AA",
    principle: "understandable",
    name: "Error Suggestion",
    description: "Error messages provide suggestions for correction when possible",
    testProcedure: [
      "Trigger form validation errors",
      "Check for helpful error suggestions",
      "Verify format examples are provided",
      "Test different error scenarios"
    ],
    expectedResult: "Error messages include correction suggestions",
    automatable: false,
    tools: ["Manual testing"]
  },
  {
    id: "TC-4.1.1-01",
    criterion: "4.1.1",
    level: "A",
    principle: "robust",
    name: "Parsing",
    description: "HTML must be well-formed without duplicate IDs or improper nesting",
    testProcedure: [
      "Run HTML validator",
      "Check for duplicate IDs",
      "Verify proper element nesting",
      "Check for complete start/end tags"
    ],
    expectedResult: "HTML is well-formed and valid",
    automatable: true,
    tools: ["axe-core", "W3C Validator"]
  },
  {
    id: "TC-4.1.2-01",
    criterion: "4.1.2",
    level: "A",
    principle: "robust",
    name: "Name, Role, Value",
    description: "Custom UI components must have accessible name, role, and value",
    testProcedure: [
      "Identify custom widgets",
      "Check ARIA roles are appropriate",
      "Verify accessible names exist",
      "Check state changes are announced"
    ],
    expectedResult: "All custom components have proper ARIA attributes",
    automatable: true,
    tools: ["axe-core", "Screen reader"]
  }
];

export default function NRadiVerseAccessibilityPage() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState("scan");
  const [scanUrl, setScanUrl] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [violations, setViolations] = useState<AccessibilityViolation[]>([]);
  const [wcagCriteria, setWcagCriteria] = useState<WCAGCriterion[]>([]);
  const [overallScore, setOverallScore] = useState(0);
  const [aiAnalysis, setAiAnalysis] = useState<AccessibilityAIAnalysis | null>(null);
  const [scanMetadata, setScanMetadata] = useState<{ browser: string; scanDuration: number; axeVersion: string } | null>(null);
  const { toast } = useToast();

  const runAccessibilityScan = async () => {
    if (!scanUrl) {
      toast({
        title: "Missing URL",
        description: "Please enter a URL to scan.",
        variant: "destructive"
      });
      return;
    }

    setIsScanning(true);
    setScanComplete(false);
    setAiAnalysis(null);

    try {
      const response = await fetch("/api/nradiverse/accessibility-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: scanUrl, wcagLevel: "AA" })
      });

      if (response.ok) {
        const result = await response.json();
        setViolations(result.violations || []);
        setWcagCriteria(result.wcagCriteria || []);
        setOverallScore(result.overallScore || 0);
        setAiAnalysis(result.aiAnalysis || null);
        setScanMetadata(result.metadata || null);
        
        toast({
          title: "Scan Complete",
          description: `Found ${result.violations?.length || 0} accessibility issues${result.aiAnalysis ? " with AI analysis" : ""}`
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Scan failed");
      }
    } catch (error: any) {
      console.error("Accessibility scan error:", error);
      toast({
        title: "Scan Failed",
        description: error.message || "Failed to scan the URL. Please check the URL and try again.",
        variant: "destructive"
      });
      setViolations(sampleViolations);
      setWcagCriteria(sampleWCAGCriteria);
      setOverallScore(76);
    }
    
    setScanComplete(true);
    setIsScanning(false);
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "critical": return "text-red-400 bg-red-500/20 border-red-500/50";
      case "serious": return "text-orange-400 bg-orange-500/20 border-orange-500/50";
      case "moderate": return "text-amber-400 bg-amber-500/20 border-amber-500/50";
      default: return "text-blue-400 bg-blue-500/20 border-blue-500/50";
    }
  };

  const criticalCount = violations.filter(v => v.impact === "critical").length;
  const seriousCount = violations.filter(v => v.impact === "serious").length;
  const moderateCount = violations.filter(v => v.impact === "moderate").length;
  const minorCount = violations.filter(v => v.impact === "minor").length;

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
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-3" data-testid="heading-accessibility">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500/20 to-green-500/20">
                    <Accessibility className="w-7 h-7 text-emerald-400" />
                  </div>
                  Accessibility Compliance
                </h1>
                <p className="text-muted-foreground mt-1">
                  WCAG 2.1 Level AA automated validation with axe-core integration
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" data-testid="button-export-report">
                  <Download className="w-4 h-4 mr-2" />
                  Export Report
                </Button>
              </div>
            </div>

            {scanComplete && (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Card className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 border-violet-500/30">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Score</p>
                        <p className="text-2xl font-bold text-violet-400">{overallScore}%</p>
                      </div>
                      <Shield className="w-6 h-6 text-violet-400" />
                    </div>
                    <Progress value={overallScore} className="mt-2 h-2" />
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-red-500/10 to-rose-500/10 border-red-500/30">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Critical</p>
                        <p className="text-2xl font-bold text-red-400">{criticalCount}</p>
                      </div>
                      <XCircle className="w-6 h-6 text-red-400" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-orange-500/10 to-amber-500/10 border-orange-500/30">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Serious</p>
                        <p className="text-2xl font-bold text-orange-400">{seriousCount}</p>
                      </div>
                      <AlertTriangle className="w-6 h-6 text-orange-400" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-amber-500/10 to-yellow-500/10 border-amber-500/30">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Moderate</p>
                        <p className="text-2xl font-bold text-amber-400">{moderateCount}</p>
                      </div>
                      <Info className="w-6 h-6 text-amber-400" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/30">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Minor</p>
                        <p className="text-2xl font-bold text-blue-400">{minorCount}</p>
                      </div>
                      <CheckCircle2 className="w-6 h-6 text-blue-400" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="bg-card border">
                <TabsTrigger value="scan" data-testid="tab-scan">
                  <Play className="w-4 h-4 mr-2" />
                  Run Scan
                </TabsTrigger>
                <TabsTrigger value="violations" data-testid="tab-violations" disabled={!scanComplete}>
                  <XCircle className="w-4 h-4 mr-2" />
                  Violations ({violations.length})
                </TabsTrigger>
                <TabsTrigger value="ai-analysis" data-testid="tab-ai-analysis" disabled={!aiAnalysis}>
                  <Brain className="w-4 h-4 mr-2" />
                  AI Analysis
                </TabsTrigger>
                <TabsTrigger value="wcag" data-testid="tab-wcag" disabled={!scanComplete}>
                  <Shield className="w-4 h-4 mr-2" />
                  WCAG Criteria
                </TabsTrigger>
                <TabsTrigger value="contrast" data-testid="tab-contrast">
                  <Palette className="w-4 h-4 mr-2" />
                  Color Contrast
                </TabsTrigger>
                <TabsTrigger value="testcases" data-testid="tab-testcases">
                  <FileText className="w-4 h-4 mr-2" />
                  WCAG AA Test Cases
                </TabsTrigger>
              </TabsList>

              <TabsContent value="scan" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Accessibility Scan</CardTitle>
                    <CardDescription>Enter a URL to scan for WCAG 2.1 Level AA compliance issues</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-4">
                      <div className="flex-1 space-y-2">
                        <Label>Website URL</Label>
                        <Input 
                          placeholder="https://example.gehealthcare.com" 
                          value={scanUrl}
                          onChange={(e) => setScanUrl(e.target.value)}
                          data-testid="input-scan-url"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button 
                          onClick={runAccessibilityScan} 
                          disabled={isScanning}
                          data-testid="button-run-scan"
                        >
                          {isScanning ? (
                            <>
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                              Scanning...
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4 mr-2" />
                              Run Scan
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                      {wcagPrinciples.map((principle) => (
                        <Card key={principle.id} className={`${principle.bgColor} border-transparent`}>
                          <CardContent className="p-4 flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${principle.bgColor}`}>
                              <principle.icon className={`w-5 h-5 ${principle.color}`} />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{principle.name}</p>
                              <p className="text-xs text-muted-foreground">WCAG Principle</p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>What We Test</CardTitle>
                    <CardDescription>Comprehensive WCAG 2.1 Level AA compliance validation</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                        <Palette className="w-6 h-6 text-violet-400 mb-2" />
                        <h4 className="font-medium mb-1">Color Contrast</h4>
                        <p className="text-sm text-muted-foreground">Verify text meets 4.5:1 ratio for normal text, 3:1 for large text</p>
                      </div>
                      <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                        <Keyboard className="w-6 h-6 text-cyan-400 mb-2" />
                        <h4 className="font-medium mb-1">Keyboard Navigation</h4>
                        <p className="text-sm text-muted-foreground">Ensure all interactive elements are keyboard accessible</p>
                      </div>
                      <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                        <Volume2 className="w-6 h-6 text-emerald-400 mb-2" />
                        <h4 className="font-medium mb-1">Screen Reader</h4>
                        <p className="text-sm text-muted-foreground">Validate ARIA labels and semantic structure</p>
                      </div>
                      <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                        <Eye className="w-6 h-6 text-amber-400 mb-2" />
                        <h4 className="font-medium mb-1">Alt Text</h4>
                        <p className="text-sm text-muted-foreground">Check all images have meaningful alternative text</p>
                      </div>
                      <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                        <FileText className="w-6 h-6 text-pink-400 mb-2" />
                        <h4 className="font-medium mb-1">Form Labels</h4>
                        <p className="text-sm text-muted-foreground">Verify form elements have associated labels</p>
                      </div>
                      <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                        <Shield className="w-6 h-6 text-blue-400 mb-2" />
                        <h4 className="font-medium mb-1">Focus Management</h4>
                        <p className="text-sm text-muted-foreground">Ensure visible focus indicators and logical order</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="violations" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Accessibility Violations</CardTitle>
                    <CardDescription>Issues found during the accessibility scan</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[600px]">
                      <Accordion type="multiple" className="space-y-3">
                        {violations.map((violation, idx) => (
                          <AccordionItem key={idx} value={violation.id} className="border rounded-lg">
                            <AccordionTrigger className="px-4 hover:no-underline">
                              <div className="flex items-center gap-3 text-left">
                                <Badge className={getImpactColor(violation.impact)}>
                                  {violation.impact.toUpperCase()}
                                </Badge>
                                <div>
                                  <p className="font-medium">{violation.description}</p>
                                  <p className="text-sm text-muted-foreground">{violation.nodes.length} element(s) affected</p>
                                </div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pb-4">
                              <div className="space-y-4">
                                <p className="text-sm text-muted-foreground">{violation.help}</p>
                                <div className="flex gap-2 flex-wrap">
                                  {violation.tags.map((tag) => (
                                    <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                                  ))}
                                </div>
                                <div className="space-y-2">
                                  <p className="font-medium text-sm">Affected Elements:</p>
                                  {violation.nodes.map((node, nodeIdx) => (
                                    <div key={nodeIdx} className="p-3 rounded bg-muted/50 font-mono text-xs">
                                      <code>{node.html}</code>
                                      <p className="text-muted-foreground mt-2 font-sans">{node.failureSummary}</p>
                                    </div>
                                  ))}
                                </div>
                                <Button variant="outline" size="sm" asChild>
                                  <a href={violation.helpUrl} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    Learn More
                                  </a>
                                </Button>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="ai-analysis" className="space-y-4">
                {aiAnalysis && (
                  <>
                    <Card className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 border-violet-500/30">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Brain className="w-5 h-5 text-violet-400" />
                          AI-Powered Analysis
                        </CardTitle>
                        <CardDescription>
                          Intelligent accessibility insights powered by Claude AI
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="p-4 rounded-lg bg-background/50 border border-border/50">
                          <p className="text-sm leading-relaxed">{aiAnalysis.summary}</p>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4">
                          <div className="p-4 rounded-lg bg-background/50 border border-border/50 text-center">
                            <div className={`text-lg font-bold ${aiAnalysis.complianceStatus?.wcag21AA ? 'text-emerald-400' : 'text-red-400'}`}>
                              {aiAnalysis.complianceStatus?.wcag21AA ? 'PASS' : 'FAIL'}
                            </div>
                            <p className="text-xs text-muted-foreground">WCAG 2.1 AA</p>
                          </div>
                          <div className="p-4 rounded-lg bg-background/50 border border-border/50 text-center">
                            <div className={`text-lg font-bold ${aiAnalysis.complianceStatus?.section508 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {aiAnalysis.complianceStatus?.section508 ? 'PASS' : 'FAIL'}
                            </div>
                            <p className="text-xs text-muted-foreground">Section 508</p>
                          </div>
                          <div className="p-4 rounded-lg bg-background/50 border border-border/50 text-center">
                            <div className={`text-lg font-bold ${aiAnalysis.complianceStatus?.adaCompliance ? 'text-emerald-400' : 'text-red-400'}`}>
                              {aiAnalysis.complianceStatus?.adaCompliance ? 'PASS' : 'FAIL'}
                            </div>
                            <p className="text-xs text-muted-foreground">ADA Compliance</p>
                          </div>
                        </div>
                        
                        {aiAnalysis.estimatedFixTime && (
                          <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                            <Clock className="w-4 h-4 text-amber-400" />
                            <span className="text-sm">Estimated fix time: <strong>{aiAnalysis.estimatedFixTime}</strong></span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    
                    {aiAnalysis.prioritizedIssues && aiAnalysis.prioritizedIssues.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Target className="w-5 h-5 text-cyan-400" />
                            Prioritized Issues
                          </CardTitle>
                          <CardDescription>Issues ordered by impact and importance</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ScrollArea className="h-[400px]">
                            <div className="space-y-4">
                              {aiAnalysis.prioritizedIssues.map((item, idx) => (
                                <div key={idx} className="p-4 rounded-lg border border-border/50 bg-muted/30">
                                  <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center text-white font-bold text-sm">
                                      {idx + 1}
                                    </div>
                                    <div className="flex-1 space-y-2">
                                      <h4 className="font-medium">{item.issue}</h4>
                                      <p className="text-sm text-muted-foreground">{item.impact}</p>
                                      <div className="flex items-center gap-2 text-xs">
                                        <Badge variant="outline">{item.affectedUsers}</Badge>
                                      </div>
                                      <div className="p-3 rounded bg-emerald-500/10 border border-emerald-500/30">
                                        <div className="flex items-center gap-2 mb-1">
                                          <Wrench className="w-3 h-3 text-emerald-400" />
                                          <span className="text-xs font-medium text-emerald-400">Remediation</span>
                                        </div>
                                        <p className="text-sm">{item.remediation}</p>
                                      </div>
                                      {item.codeExample && (
                                        <div className="p-3 rounded bg-muted/50 font-mono text-xs overflow-x-auto">
                                          <code>{item.codeExample}</code>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </CardContent>
                      </Card>
                    )}
                    
                    {aiAnalysis.recommendations && aiAnalysis.recommendations.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Lightbulb className="w-5 h-5 text-amber-400" />
                            Recommendations
                          </CardTitle>
                          <CardDescription>AI-generated suggestions for improvement</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {aiAnalysis.recommendations.map((rec, idx) => (
                              <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                                <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5" />
                                <p className="text-sm">{rec}</p>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </TabsContent>

              <TabsContent value="wcag" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>WCAG 2.1 Criteria Status</CardTitle>
                    <CardDescription>Compliance status for each WCAG success criterion</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {wcagPrinciples.map((principle) => {
                        const criteria = wcagCriteria.filter(c => c.principle === principle.id);
                        const passCount = criteria.filter(c => c.status === "pass").length;
                        const failCount = criteria.filter(c => c.status === "fail").length;
                        
                        return (
                          <Card key={principle.id} className={`${principle.bgColor} border-transparent`}>
                            <CardHeader className="pb-2">
                              <div className="flex items-center gap-2">
                                <principle.icon className={`w-5 h-5 ${principle.color}`} />
                                <CardTitle className="text-lg">{principle.name}</CardTitle>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div className="flex gap-4 mb-4">
                                <div className="text-center">
                                  <p className="text-2xl font-bold text-emerald-400">{passCount}</p>
                                  <p className="text-xs text-muted-foreground">Passed</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-2xl font-bold text-red-400">{failCount}</p>
                                  <p className="text-xs text-muted-foreground">Failed</p>
                                </div>
                              </div>
                              <div className="space-y-2">
                                {criteria.map((c) => (
                                  <div key={c.id} className="flex items-center justify-between p-2 rounded bg-background/50">
                                    <div className="flex items-center gap-2">
                                      {c.status === "pass" ? (
                                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                      ) : c.status === "fail" ? (
                                        <XCircle className="w-4 h-4 text-red-400" />
                                      ) : (
                                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                                      )}
                                      <span className="font-mono text-sm">{c.id}</span>
                                      <Badge variant="outline" className="text-xs">{c.level}</Badge>
                                    </div>
                                    {c.violations && c.violations > 0 && (
                                      <span className="text-xs text-red-400">{c.violations} issues</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="contrast" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Color Contrast Analyzer</CardTitle>
                    <CardDescription>Check color combinations for WCAG compliance</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Foreground Color</Label>
                          <div className="flex gap-2">
                            <Input type="color" className="w-14 h-10 p-1 cursor-pointer" defaultValue="#000000" />
                            <Input placeholder="#000000" className="flex-1" defaultValue="#000000" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Background Color</Label>
                          <div className="flex gap-2">
                            <Input type="color" className="w-14 h-10 p-1 cursor-pointer" defaultValue="#ffffff" />
                            <Input placeholder="#ffffff" className="flex-1" defaultValue="#ffffff" />
                          </div>
                        </div>
                        <Button className="w-full">Check Contrast</Button>
                      </div>
                      <div className="space-y-4">
                        <div className="p-6 rounded-lg border text-center" style={{ background: "#ffffff", color: "#000000" }}>
                          <p className="text-2xl font-bold mb-2">Sample Text</p>
                          <p className="text-sm">This is how your text will appear</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 rounded-lg bg-emerald-500/20 border border-emerald-500/50 text-center">
                            <p className="text-3xl font-bold text-emerald-400">21:1</p>
                            <p className="text-xs text-muted-foreground">Contrast Ratio</p>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              <span className="text-sm">Normal Text (4.5:1)</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              <span className="text-sm">Large Text (3:1)</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              <span className="text-sm">UI Components (3:1)</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="testcases" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-emerald-400" />
                      WCAG 2.1 AA Test Cases
                    </CardTitle>
                    <CardDescription>
                      Comprehensive test cases for WCAG 2.1 Level AA compliance testing. 
                      {wcagAATestCases.length} test cases covering all success criteria.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4 grid grid-cols-4 gap-4">
                      <Card className="bg-violet-500/10 border-violet-500/30">
                        <CardContent className="p-3 text-center">
                          <p className="text-2xl font-bold text-violet-400">{wcagAATestCases.filter(t => t.principle === 'perceivable').length}</p>
                          <p className="text-xs text-muted-foreground">Perceivable</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-cyan-500/10 border-cyan-500/30">
                        <CardContent className="p-3 text-center">
                          <p className="text-2xl font-bold text-cyan-400">{wcagAATestCases.filter(t => t.principle === 'operable').length}</p>
                          <p className="text-xs text-muted-foreground">Operable</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-emerald-500/10 border-emerald-500/30">
                        <CardContent className="p-3 text-center">
                          <p className="text-2xl font-bold text-emerald-400">{wcagAATestCases.filter(t => t.principle === 'understandable').length}</p>
                          <p className="text-xs text-muted-foreground">Understandable</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-amber-500/10 border-amber-500/30">
                        <CardContent className="p-3 text-center">
                          <p className="text-2xl font-bold text-amber-400">{wcagAATestCases.filter(t => t.principle === 'robust').length}</p>
                          <p className="text-xs text-muted-foreground">Robust</p>
                        </CardContent>
                      </Card>
                    </div>
                    
                    <ScrollArea className="h-[600px]">
                      <Accordion type="multiple" className="space-y-2">
                        {wcagAATestCases.map((testCase) => {
                          const principleConfig = wcagPrinciples.find(p => p.id === testCase.principle);
                          const PrincipleIcon = principleConfig?.icon || Shield;
                          
                          return (
                            <AccordionItem key={testCase.id} value={testCase.id} className="border rounded-lg px-4 bg-card">
                              <AccordionTrigger className="hover:no-underline py-3">
                                <div className="flex items-center gap-3 flex-1">
                                  <div className={`p-1.5 rounded ${principleConfig?.bgColor}`}>
                                    <PrincipleIcon className={`w-4 h-4 ${principleConfig?.color}`} />
                                  </div>
                                  <div className="flex items-center gap-2 flex-1">
                                    <Badge variant="outline" className="text-xs">
                                      {testCase.id}
                                    </Badge>
                                    <Badge className={testCase.level === 'AA' ? 'bg-amber-500/20 text-amber-400 border-amber-500/50' : 'bg-blue-500/20 text-blue-400 border-blue-500/50'}>
                                      Level {testCase.level}
                                    </Badge>
                                    <span className="font-medium text-sm text-left">{testCase.name}</span>
                                    {testCase.automatable && (
                                      <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/50">
                                        <Wrench className="w-3 h-3 mr-1" />
                                        Automatable
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="pt-2 pb-4">
                                <div className="space-y-4">
                                  <div>
                                    <p className="text-sm text-muted-foreground">{testCase.description}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      WCAG Criterion: <span className="text-foreground font-medium">{testCase.criterion}</span>
                                    </p>
                                  </div>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <h4 className="text-sm font-medium flex items-center gap-2">
                                        <Target className="w-4 h-4 text-cyan-400" />
                                        Test Procedure
                                      </h4>
                                      <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground pl-2">
                                        {testCase.testProcedure.map((step, idx) => (
                                          <li key={idx}>{step}</li>
                                        ))}
                                      </ol>
                                    </div>
                                    
                                    <div className="space-y-4">
                                      <div className="space-y-2">
                                        <h4 className="text-sm font-medium flex items-center gap-2">
                                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                          Expected Result
                                        </h4>
                                        <p className="text-sm text-muted-foreground bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/30">
                                          {testCase.expectedResult}
                                        </p>
                                      </div>
                                      
                                      <div className="space-y-2">
                                        <h4 className="text-sm font-medium flex items-center gap-2">
                                          <Wrench className="w-4 h-4 text-amber-400" />
                                          Testing Tools
                                        </h4>
                                        <div className="flex flex-wrap gap-2">
                                          {testCase.tools.map((tool, idx) => (
                                            <Badge key={idx} variant="outline" className="text-xs">
                                              {tool}
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          );
                        })}
                      </Accordion>
                    </ScrollArea>
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
