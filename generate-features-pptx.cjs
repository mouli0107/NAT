'use strict';

const PptxGenJS = require('pptxgenjs');
const path = require('path');

const pptx = new PptxGenJS();

// Layout: widescreen 13.33 x 7.5
pptx.layout = 'LAYOUT_WIDE';

// ── Design Constants ────────────────────────────────────────────────────────
const BG    = '0A1628';
const CARD  = '0D1F38';
const CYAN  = '00BFFF';
const WHITE = 'FFFFFF';
const MUTED = 'A0C4D8';
const GREEN = '00FF88';
const DARK  = '050E1A';

// ── Helpers ──────────────────────────────────────────────────────────────────
function addCard(slide, x, y, w, h) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h,
    fill: { color: CARD },
    line: { color: CYAN, width: 0.5 },
    rectRadius: 0.05
  });
  slide.addShape(pptx.ShapeType.rect, {
    x, y, w, h: 0.06,
    fill: { color: CYAN }
  });
}

function addTitle(slide, text) {
  slide.addText(text, {
    x: 0.4, y: 0.15, w: 12.5, h: 0.6,
    fontSize: 30, bold: true, color: CYAN, fontFace: 'Calibri'
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.4, y: 0.78, w: 1.2, h: 0.05,
    fill: { color: CYAN }
  });
}

// ════════════════════════════════════════════════════════════════════════════
// SLIDE 1 — Agentic AI Testing Platform
// ════════════════════════════════════════════════════════════════════════════
(function buildSlide1() {
  const slide = pptx.addSlide();
  slide.background = { color: BG };

  addTitle(slide, 'Agentic AI Testing Platform');

  // Center headline block
  slide.addText('NAT 2.0', {
    x: 0.4, y: 1.0, w: 12.5, h: 0.8,
    fontSize: 52, bold: true, color: CYAN, fontFace: 'Calibri',
    align: 'center'
  });
  slide.addText('Nous Autonomous Testing Platform', {
    x: 0.4, y: 1.85, w: 12.5, h: 0.5,
    fontSize: 20, bold: false, color: WHITE, fontFace: 'Calibri',
    align: 'center'
  });
  slide.addText('AI-Powered · Self-Healing · Enterprise-Grade', {
    x: 0.4, y: 2.3, w: 12.5, h: 0.4,
    fontSize: 14, italic: true, color: MUTED, fontFace: 'Calibri',
    align: 'center'
  });

  // 4 capability cards
  const cards = [
    {
      x: 0.3, icon: '🤖', title: 'AI Agents',
      body: 'Multi-agent pipeline: Orchestrator → Analyst → Strategist → Generator. Each agent specializes in one QA discipline.'
    },
    {
      x: 3.35, icon: '🔄', title: 'Self-Healing',
      body: 'Auto-discovers locators, repairs broken selectors, adapts to DOM changes without manual intervention.'
    },
    {
      x: 6.4, icon: '⚡', title: 'Zero Scaffolding',
      body: 'From user story to executable Playwright script in under 30 seconds. No boilerplate. No manual setup.'
    },
    {
      x: 9.45, icon: '🏢', title: 'Enterprise Scale',
      body: 'Multi-tenant, RBAC, audit trails, CI/CD hooks, ZIP export, Azure DevOps & Jira integration.'
    }
  ];

  cards.forEach(c => {
    addCard(slide, c.x, 3.0, 2.9, 2.5);
    slide.addText(c.icon, {
      x: c.x + 0.1, y: 3.15, w: 2.7, h: 0.5,
      fontSize: 28, align: 'center'
    });
    slide.addText(c.title, {
      x: c.x + 0.1, y: 3.7, w: 2.7, h: 0.4,
      fontSize: 14, bold: true, color: CYAN, fontFace: 'Calibri',
      align: 'center'
    });
    slide.addText(c.body, {
      x: c.x + 0.15, y: 4.15, w: 2.6, h: 1.2,
      fontSize: 11, color: MUTED, fontFace: 'Calibri',
      align: 'left', valign: 'top', wrap: true
    });
  });

  // Bottom strip
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.0, y: 5.7, w: 13.33, h: 0.5,
    fill: { color: CYAN }
  });
  slide.addText('Powered by Claude AI · React + TypeScript · Playwright · Azure DevOps · Jira', {
    x: 0.0, y: 5.72, w: 13.33, h: 0.46,
    fontSize: 11, bold: true, color: DARK, fontFace: 'Calibri',
    align: 'center', valign: 'middle'
  });
})();

// ════════════════════════════════════════════════════════════════════════════
// SLIDE 2 — Autonomous Test Case Generation
// ════════════════════════════════════════════════════════════════════════════
(function buildSlide2() {
  const slide = pptx.addSlide();
  slide.background = { color: BG };

  addTitle(slide, 'Autonomous Test Case Generation');

  // LEFT: 5-Phase Workflow
  slide.addText('5-Phase Execution Model', {
    x: 0.4, y: 1.0, w: 5.8, h: 0.4,
    fontSize: 15, bold: true, color: WHITE, fontFace: 'Calibri'
  });

  const phases = [
    { y: 1.5,  num: '①', label: 'CONFIGURE', desc: '  Set target URL, crawl depth, auth config' },
    { y: 2.45, num: '②', label: 'CRAWL',     desc: '  Discover pages, forms, inputs, buttons, links' },
    { y: 3.4,  num: '③', label: 'ANALYSE',   desc: '  AI maps page structure, counts forms/buttons/inputs' },
    { y: 4.35, num: '④', label: 'GENERATE',  desc: '  Creates test cases by category and priority' },
    { y: 5.3,  num: '⑤', label: 'EXECUTE',   desc: '  Runs Playwright scripts, captures results & screenshots' }
  ];

  phases.forEach(p => {
    // Card bg
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.4, y: p.y, w: 5.5, h: 0.85,
      fill: { color: CARD },
      line: { color: CARD, width: 0 }
    });
    // Cyan left border
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.4, y: p.y, w: 0.06, h: 0.85,
      fill: { color: CYAN }
    });
    slide.addText(p.num + ' ' + p.label, {
      x: 0.55, y: p.y + 0.08, w: 5.3, h: 0.3,
      fontSize: 12, bold: true, color: CYAN, fontFace: 'Calibri'
    });
    slide.addText(p.desc, {
      x: 0.55, y: p.y + 0.42, w: 5.3, h: 0.35,
      fontSize: 11, color: MUTED, fontFace: 'Calibri'
    });
  });

  // RIGHT: Test Categories
  slide.addText('Test Categories Generated', {
    x: 6.6, y: 1.0, w: 6.3, h: 0.4,
    fontSize: 15, bold: true, color: WHITE, fontFace: 'Calibri'
  });

  const categories = [
    { x: 6.6,  y: 1.5,  icon: '🔥', title: 'Smoke',         body: 'Critical path validation' },
    { x: 9.7,  y: 1.5,  icon: '⚙️', title: 'Functional',    body: 'Business logic & user flows' },
    { x: 6.6,  y: 2.55, icon: '❌', title: 'Negative',      body: 'Invalid inputs, error handling' },
    { x: 9.7,  y: 2.55, icon: '🔲', title: 'Edge Cases',    body: 'Boundary conditions, limits' },
    { x: 6.6,  y: 3.6,  icon: '🔒', title: 'Security',      body: 'Auth, injection, XSS checks' },
    { x: 9.7,  y: 3.6,  icon: '♿', title: 'Accessibility', body: 'WCAG 2.1 AA compliance' }
  ];

  categories.forEach(c => {
    addCard(slide, c.x, c.y, 2.8, 0.9);
    slide.addText(c.icon + '  ' + c.title, {
      x: c.x + 0.15, y: c.y + 0.12, w: 2.5, h: 0.35,
      fontSize: 12, bold: true, color: CYAN, fontFace: 'Calibri'
    });
    slide.addText(c.body, {
      x: c.x + 0.15, y: c.y + 0.5, w: 2.5, h: 0.3,
      fontSize: 10, color: MUTED, fontFace: 'Calibri'
    });
  });

  // Priority levels
  slide.addText('Priority Levels:', {
    x: 6.6, y: 4.75, w: 6.3, h: 0.35,
    fontSize: 12, bold: true, color: WHITE, fontFace: 'Calibri'
  });

  const priorities = [
    { x: 6.6,  fill: 'CC0000', label: 'P0 CRITICAL' },
    { x: 8.1,  fill: 'CC6600', label: 'P1 HIGH' },
    { x: 9.6,  fill: 'CCAA00', label: 'P2 MEDIUM' },
    { x: 11.1, fill: '444466', label: 'P3 LOW' }
  ];

  priorities.forEach(p => {
    slide.addShape(pptx.ShapeType.rect, {
      x: p.x, y: 5.1, w: 1.35, h: 0.5,
      fill: { color: p.fill },
      line: { color: p.fill, width: 0 }
    });
    slide.addText(p.label, {
      x: p.x, y: 5.1, w: 1.35, h: 0.5,
      fontSize: 10, bold: true, color: WHITE, fontFace: 'Calibri',
      align: 'center', valign: 'middle'
    });
  });

  // Stat bar
  const stats = ['6 Test Categories', '4 Priority Levels', 'Playwright Output'];
  const statX = [0.4, 4.4, 8.4];
  stats.forEach((s, i) => {
    addCard(slide, statX[i], 6.3, 3.8, 0.7);
    slide.addText(s, {
      x: statX[i] + 0.1, y: 6.35, w: 3.6, h: 0.55,
      fontSize: 13, bold: true, color: CYAN, fontFace: 'Calibri',
      align: 'center', valign: 'middle'
    });
  });
})();

// ════════════════════════════════════════════════════════════════════════════
// SLIDE 3 — Generate from User Stories
// ════════════════════════════════════════════════════════════════════════════
(function buildSlide3() {
  const slide = pptx.addSlide();
  slide.background = { color: BG };

  addTitle(slide, 'Generate from User Stories');

  // Integration badges
  const badges = [
    { x: 0.4,  label: '🔷 Azure DevOps' },
    { x: 3.4,  label: '🟠 Jira' },
    { x: 6.2,  label: '📋 Manual Entry' }
  ];
  badges.forEach(b => {
    slide.addShape(pptx.ShapeType.rect, {
      x: b.x, y: 0.95, w: 2.8, h: 0.55,
      fill: { color: CARD },
      line: { color: CYAN, width: 0.5 }
    });
    slide.addText(b.label, {
      x: b.x + 0.1, y: 0.95, w: 2.6, h: 0.55,
      fontSize: 12, bold: true, color: CYAN, fontFace: 'Calibri',
      align: 'center', valign: 'middle'
    });
  });

  // Flow diagram
  const flowBoxes = [
    { x: 0.3,  icon: '📋', title: 'Select Sprint',  desc: 'Pick ADO/Jira sprint' },
    { x: 2.4,  icon: '📖', title: 'User Stories',   desc: 'Import acceptance criteria' },
    { x: 4.5,  icon: '🧠', title: 'AI Analysis',    desc: 'Claude extracts test scenarios' },
    { x: 6.6,  icon: '✅', title: 'Test Cases',     desc: 'Categorised by type & priority' },
    { x: 8.7,  icon: '📜', title: 'BDD Scripts',    desc: 'Feature files + step defs' },
    { x: 10.8, icon: '📦', title: 'ZIP Export',     desc: 'TS-Playwright / Java / TestComplete' }
  ];

  flowBoxes.forEach(b => {
    addCard(slide, b.x, 1.8, 1.9, 1.3);
    slide.addText(b.icon, {
      x: b.x + 0.05, y: 1.88, w: 1.8, h: 0.35,
      fontSize: 18, align: 'center'
    });
    slide.addText(b.title, {
      x: b.x + 0.05, y: 2.25, w: 1.8, h: 0.35,
      fontSize: 11, bold: true, color: WHITE, fontFace: 'Calibri',
      align: 'center'
    });
    slide.addText(b.desc, {
      x: b.x + 0.05, y: 2.62, w: 1.8, h: 0.4,
      fontSize: 9, color: MUTED, fontFace: 'Calibri',
      align: 'center', wrap: true
    });
  });

  // Arrows between flow boxes
  [2.2, 4.3, 6.4, 8.5, 10.6].forEach(ax => {
    slide.addText('→', {
      x: ax, y: 2.2, w: 0.25, h: 0.4,
      fontSize: 16, color: CYAN, fontFace: 'Calibri',
      align: 'center', bold: true
    });
  });

  // Test case output spec card
  addCard(slide, 0.4, 3.3, 12.5, 1.5);
  slide.addText('Generated Test Case Structure', {
    x: 0.6, y: 3.4, w: 6.0, h: 0.35,
    fontSize: 13, bold: true, color: CYAN, fontFace: 'Calibri'
  });

  const fields = ['ID + Title', 'Category', 'Priority', 'Preconditions', 'Test Steps', 'Expected Result'];
  fields.forEach((f, i) => {
    const fx = 0.6 + i * 2.05;
    slide.addShape(pptx.ShapeType.rect, {
      x: fx, y: 3.75, w: 1.9, h: 0.4,
      fill: { color: DARK },
      line: { color: CYAN, width: 0.5 }
    });
    slide.addText(f, {
      x: fx, y: 3.75, w: 1.9, h: 0.4,
      fontSize: 10, color: WHITE, fontFace: 'Calibri',
      align: 'center', valign: 'middle'
    });
  });

  // BDD Multi-language export card
  addCard(slide, 0.4, 5.0, 12.5, 1.9);
  slide.addText('Multi-Language BDD Export', {
    x: 0.6, y: 5.05, w: 6.0, h: 0.35,
    fontSize: 13, bold: true, color: CYAN, fontFace: 'Calibri'
  });

  const frameworks = [
    { x: 0.5,  icon: '🔷', title: 'TypeScript Playwright', body: 'feature/ · step-definitions/ · pages/ · cucumber.config.ts' },
    { x: 4.5,  icon: '☕', title: 'Java Selenium',         body: 'features/ · step-definitions/ · pages/ · TestRunner.java' },
    { x: 8.5,  icon: '✅', title: 'TestComplete JS',       body: 'features/ · step-definitions/ · pages/ · TestSuiteRunner.js' }
  ];

  frameworks.forEach(f => {
    slide.addShape(pptx.ShapeType.rect, {
      x: f.x, y: 5.3, w: 3.8, h: 1.1,
      fill: { color: CARD },
      line: { color: CYAN, width: 0.3 }
    });
    slide.addText(f.icon + ' ' + f.title, {
      x: f.x + 0.1, y: 5.35, w: 3.6, h: 0.4,
      fontSize: 12, bold: true, color: WHITE, fontFace: 'Calibri'
    });
    slide.addText(f.body, {
      x: f.x + 0.1, y: 5.78, w: 3.6, h: 0.55,
      fontSize: 10, color: MUTED, fontFace: 'Calibri', wrap: true
    });
  });
})();

// ════════════════════════════════════════════════════════════════════════════
// SLIDE 4 — Enterprise-Ready Automation Scripts
// ════════════════════════════════════════════════════════════════════════════
(function buildSlide4() {
  const slide = pptx.addSlide();
  slide.background = { color: BG };

  addTitle(slide, 'Enterprise-Ready Automation Scripts');

  // 3 framework cards LEFT
  const frameworkCards = [
    {
      y: 1.0, icon: '☕', title: 'Java Selenium (Maven/Gradle)',
      body: 'BaseTest @BeforeClass · @Test methods · Page Object Model · TestNG annotations · Explicit waits · Realistic locators (ID/CSS/XPath)'
    },
    {
      y: 2.8, icon: '🔷', title: 'TypeScript Playwright',
      body: 'test.describe blocks · async/await · page.goto + locator() · expect() assertions · Cross-browser aware · Screenshot on failure'
    },
    {
      y: 4.6, icon: '✅', title: 'TestComplete JavaScript',
      body: 'Aliases-based object mapping · Log.Message logging · TestedApps.launch · Checkpoint assertions · Proper test function structure'
    }
  ];

  frameworkCards.forEach(f => {
    addCard(slide, 0.3, f.y, 4.0, 1.6);
    slide.addText(f.icon + ' ' + f.title, {
      x: 0.45, y: f.y + 0.15, w: 3.7, h: 0.4,
      fontSize: 13, bold: true, color: CYAN, fontFace: 'Calibri'
    });
    slide.addText(f.body, {
      x: 0.45, y: f.y + 0.6, w: 3.7, h: 0.9,
      fontSize: 10, color: MUTED, fontFace: 'Calibri', wrap: true
    });
  });

  // Quality badges (RIGHT)
  const qualBadges = [
    { x: 4.9,  big: 'P0→P3',   small: 'Priority Tiers' },
    { x: 6.9,  big: 'XPath+CSS', small: 'Smart Locators' },
    { x: 8.9,  big: '<30s',     small: 'Generation Time' },
    { x: 10.9, big: 'ZIP',      small: 'CI-Ready Export' }
  ];

  qualBadges.forEach(b => {
    addCard(slide, b.x, 1.0, 1.85, 0.75);
    slide.addText(b.big, {
      x: b.x + 0.05, y: 1.05, w: 1.75, h: 0.38,
      fontSize: b.big.length > 4 ? 13 : 18, bold: true, color: CYAN, fontFace: 'Calibri',
      align: 'center'
    });
    slide.addText(b.small, {
      x: b.x + 0.05, y: 1.45, w: 1.75, h: 0.25,
      fontSize: 10, color: MUTED, fontFace: 'Calibri',
      align: 'center'
    });
  });

  // 3-Agent pipeline card
  addCard(slide, 4.9, 2.0, 7.8, 1.8);
  slide.addText('3-Agent Script Generation Pipeline', {
    x: 5.1, y: 2.1, w: 7.4, h: 0.35,
    fontSize: 13, bold: true, color: CYAN, fontFace: 'Calibri'
  });

  const agents = [
    { x: 5.0,  icon: '🔍', title: 'Workflow Analyst',  body: 'Maps user journeys & navigation flows' },
    { x: 7.5,  icon: '🏗️', title: 'Test Architect',    body: 'Designs test strategy across 6 categories' },
    { x: 10.0, icon: '⚡', title: 'Script Forge',      body: 'Writes complete automation scripts' }
  ];

  agents.forEach(a => {
    slide.addShape(pptx.ShapeType.rect, {
      x: a.x, y: 2.4, w: 2.3, h: 0.9,
      fill: { color: DARK },
      line: { color: CYAN, width: 0.3 }
    });
    slide.addText(a.icon + ' ' + a.title, {
      x: a.x + 0.05, y: 2.42, w: 2.2, h: 0.38,
      fontSize: 11, bold: true, color: WHITE, fontFace: 'Calibri',
      align: 'center'
    });
    slide.addText(a.body, {
      x: a.x + 0.05, y: 2.82, w: 2.2, h: 0.42,
      fontSize: 9, color: MUTED, fontFace: 'Calibri',
      align: 'center', wrap: true
    });
  });

  // Arrows
  [7.25, 9.75].forEach(ax => {
    slide.addText('→', {
      x: ax, y: 2.7, w: 0.25, h: 0.35,
      fontSize: 14, color: CYAN, fontFace: 'Calibri',
      align: 'center', bold: true
    });
  });

  // ZIP structure card
  addCard(slide, 4.9, 4.0, 7.8, 2.8);
  slide.addText('Java Selenium Output Structure', {
    x: 5.1, y: 4.1, w: 7.4, h: 0.35,
    fontSize: 13, bold: true, color: CYAN, fontFace: 'Calibri'
  });
  slide.addText(
    'src/test/java/tests/  \u2190 @Test classes\nsrc/test/java/pages/  \u2190 Page Objects (POM)\nsrc/test/resources/testng.xml\npom.xml  \u00b7  README.md',
    {
      x: 5.1, y: 4.45, w: 7.4, h: 1.7,
      fontSize: 10, color: MUTED, fontFace: 'Courier New',
      wrap: true, valign: 'top'
    }
  );
})();

// ════════════════════════════════════════════════════════════════════════════
// SLIDE 5 — Synthetic Data Generation (Insurance Specific)
// ════════════════════════════════════════════════════════════════════════════
(function buildSlide5() {
  const slide = pptx.addSlide();
  slide.background = { color: BG };

  addTitle(slide, 'Synthetic Data Generation \u2014 Insurance');

  // Top stat bar
  const topStats = [
    '6 Insurance Sub-Domains',
    '150+ Configurable Fields',
    'AI-Powered Generation',
    'CSV \u00b7 JSON \u00b7 Excel Export'
  ];
  const topX = [0.3, 3.5, 6.7, 9.9];
  topStats.forEach((s, i) => {
    slide.addShape(pptx.ShapeType.rect, {
      x: topX[i], y: 0.95, w: 3.0, h: 0.5,
      fill: { color: CARD },
      line: { color: CYAN, width: 0.5 }
    });
    slide.addText(s, {
      x: topX[i] + 0.1, y: 0.95, w: 2.8, h: 0.5,
      fontSize: 11, bold: true, color: CYAN, fontFace: 'Calibri',
      align: 'center', valign: 'middle'
    });
  });

  // 6 insurance sub-domain cards
  const domainCards = [
    {
      x: 0.3, y: 1.7, icon: '🚗', title: 'Personal Auto',
      body: 'VIN · Vehicle Year/Make/Model · Driver DOB · MVR Score · Annual Mileage · Deductibles · Prior Carrier · Multi-Policy Discount'
    },
    {
      x: 4.5, y: 1.7, icon: '🏠', title: 'Homeowner',
      body: 'Policy Form · Year Built · Sq Footage · Roof Type/Age · Construction Type · Coverage A/B/C/D · AOP Deductible'
    },
    {
      x: 8.7, y: 1.7, icon: '🏢', title: 'Commercial Property',
      body: 'COPE factors · Protection Class · SIC Code · Building/BPP Limits · Business Income · Equipment Breakdown'
    },
    {
      x: 0.3, y: 3.45, icon: '📋', title: 'Claims',
      body: 'Claim Number · Date of Loss · Adjuster · Reserve/Paid · Fraud Indicator · Catastrophe Code · Cause of Loss'
    },
    {
      x: 4.5, y: 3.45, icon: '❤️', title: 'Life Insurance',
      body: 'Face Amount · Premium Frequency · Cash/Surrender Value · Underwriting Class · Smoker Status · Beneficiary · Riders'
    },
    {
      x: 8.7, y: 3.45, icon: '🏥', title: 'Health Insurance',
      body: 'Plan Type · Deductible · Copay PCP/Specialist · Network Type · Pharmacy/Dental/Vision · Preauth Required'
    }
  ];

  domainCards.forEach(c => {
    addCard(slide, c.x, c.y, 3.9, 1.55);
    slide.addText(c.icon + ' ' + c.title, {
      x: c.x + 0.15, y: c.y + 0.12, w: 3.6, h: 0.38,
      fontSize: 13, bold: true, color: CYAN, fontFace: 'Calibri'
    });
    slide.addText(c.body, {
      x: c.x + 0.15, y: c.y + 0.55, w: 3.6, h: 0.9,
      fontSize: 9, color: MUTED, fontFace: 'Calibri', wrap: true
    });
  });

  // AI generation callout
  addCard(slide, 0.3, 5.2, 12.7, 1.6);
  slide.addText('AI-Powered Field Intelligence', {
    x: 0.5, y: 5.3, w: 6.0, h: 0.35,
    fontSize: 13, bold: true, color: CYAN, fontFace: 'Calibri'
  });
  slide.addText(
    'Claude AI understands domain context \u2014 generates realistic Payment_Plan, Vehicle_Usage, Prior_Insurance_Carrier, MVR_Score, and any custom field name you add. No more Data_1 placeholders.',
    {
      x: 0.5, y: 5.65, w: 12.3, h: 0.55,
      fontSize: 12, color: WHITE, fontFace: 'Calibri', wrap: true
    }
  );

  // Badge row
  const aiBadges = ['Domain-Aware', 'Custom Fields', '50,000 Records', 'LLM-Validated'];
  const badgeX   = [0.5, 3.2, 5.5, 7.8];
  aiBadges.forEach((b, i) => {
    slide.addShape(pptx.ShapeType.rect, {
      x: badgeX[i], y: 6.1, w: 2.2, h: 0.45,
      fill: { color: CYAN },
      line: { color: CYAN, width: 0 }
    });
    slide.addText(b, {
      x: badgeX[i], y: 6.1, w: 2.2, h: 0.45,
      fontSize: 11, bold: true, color: DARK, fontFace: 'Calibri',
      align: 'center', valign: 'middle'
    });
  });
})();

// ════════════════════════════════════════════════════════════════════════════
// SLIDE 6 — API Testing Module
// ════════════════════════════════════════════════════════════════════════════
(function buildSlide6() {
  const slide = pptx.addSlide();
  slide.background = { color: BG };

  addTitle(slide, 'API Testing Module \u2014 AI Quality Engine');

  // Left: Agent pipeline
  slide.addText('Multi-Agent Orchestration Pipeline', {
    x: 0.3, y: 1.0, w: 5.5, h: 0.4,
    fontSize: 14, bold: true, color: WHITE, fontFace: 'Calibri'
  });

  const agentCards = [
    { y: 1.5,  icon: '🎯', title: 'Orchestrator',    body: 'Parses API config · validates endpoint structure · configures auth context · dispatches agents' },
    { y: 2.95, icon: '🔍', title: 'API Analyzer',    body: 'Reads methods & paths · extracts parameters · analyzes response schema · maps domain context' },
    { y: 4.4,  icon: '🧠', title: 'Expert Strategist', body: 'Applies Postman best practices · designs assertion strategies · formulates test scenarios' },
    { y: 5.85, icon: '⚡', title: 'Test Generator',  body: 'Creates test cases: Functional · Negative · Security · Performance · Boundary' }
  ];

  agentCards.forEach(a => {
    addCard(slide, 0.3, a.y, 5.3, 1.3);
    slide.addText(a.icon + ' ' + a.title, {
      x: 0.45, y: a.y + 0.12, w: 5.0, h: 0.38,
      fontSize: 13, bold: true, color: CYAN, fontFace: 'Calibri'
    });
    slide.addText(a.body, {
      x: 0.45, y: a.y + 0.55, w: 5.0, h: 0.65,
      fontSize: 10, color: MUTED, fontFace: 'Calibri', wrap: true
    });
  });

  // Connecting line
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.95, y: 2.8, w: 0.04, h: 3.05,
    fill: { color: CYAN }
  });

  // Right: Capabilities
  slide.addText('Capabilities', {
    x: 6.2, y: 1.0, w: 6.8, h: 0.4,
    fontSize: 14, bold: true, color: WHITE, fontFace: 'Calibri'
  });

  const features = [
    'Swagger / OpenAPI specification import & parsing',
    'Auto-discovery of all endpoints and response schemas',
    'Base URL resolution from servers[] array',
    'Bearer token & API key authentication injection',
    'Parameter collection \u2014 no hallucinated values',
    '20-endpoint batch test execution with progress tracking',
    'HTML test execution reports with pass/fail metrics',
    'Schema-compliant realistic test body generation'
  ];

  const featureYStart = 1.5;
  features.forEach((f, i) => {
    slide.addText([
      { text: '\u25b6 ', options: { color: CYAN, bold: true } },
      { text: f,        options: { color: WHITE } }
    ], {
      x: 6.3, y: featureYStart + i * 0.55, w: 6.6, h: 0.5,
      fontSize: 11, fontFace: 'Calibri'
    });
  });

  // Metrics strip
  const metrics = [
    { x: 6.2,  big: '5',    small: 'Test Types' },
    { x: 7.9,  big: 'P0-P3', small: 'Priority Levels' },
    { x: 9.6,  big: '20',   small: 'Batch Endpoints' },
    { x: 11.3, big: 'HTML', small: 'Test Reports' }
  ];

  metrics.forEach(m => {
    addCard(slide, m.x, 6.1, 1.55, 0.7);
    slide.addText(m.big, {
      x: m.x + 0.05, y: 6.12, w: 1.45, h: 0.35,
      fontSize: m.big.length > 2 ? 16 : 28, bold: true, color: CYAN, fontFace: 'Calibri',
      align: 'center'
    });
    slide.addText(m.small, {
      x: m.x + 0.05, y: 6.5, w: 1.45, h: 0.25,
      fontSize: 9, color: MUTED, fontFace: 'Calibri',
      align: 'center'
    });
  });
})();

// ════════════════════════════════════════════════════════════════════════════
// SLIDE 7 — Migration from Selenium to Playwright
// ════════════════════════════════════════════════════════════════════════════
(function buildSlide7() {
  const slide = pptx.addSlide();
  slide.background = { color: BG };

  addTitle(slide, 'Selenium \u2192 Playwright Migration Tool');

  // Overview strip
  addCard(slide, 0.4, 1.0, 12.5, 0.65);
  slide.addText(
    'Automated code migration from Java Selenium (C#/Java/Python) to TypeScript Playwright \u2014 preserving test intent while modernising the entire test suite.',
    {
      x: 0.5, y: 1.05, w: 12.3, h: 0.55,
      fontSize: 13, color: WHITE, fontFace: 'Calibri',
      align: 'center', valign: 'middle', wrap: true
    }
  );

  // Conversion table
  const tableRows = [
    // Header
    [
      { text: 'Selenium Pattern',    options: { bold: true, color: DARK, fill: { color: CYAN }, align: 'center' } },
      { text: 'Playwright Equivalent', options: { bold: true, color: DARK, fill: { color: CYAN }, align: 'center' } },
      { text: 'Category',            options: { bold: true, color: DARK, fill: { color: CYAN }, align: 'center' } }
    ],
    [
      { text: 'By.Id("id")',                    options: {} },
      { text: "locator('#id')",                  options: {} },
      { text: 'Locator',                         options: {} }
    ],
    [
      { text: 'By.CssSelector(css)',             options: {} },
      { text: "locator('css')",                  options: {} },
      { text: 'Locator',                         options: {} }
    ],
    [
      { text: 'By.XPath(xpath)',                 options: {} },
      { text: "locator('xpath=...')",            options: {} },
      { text: 'Locator',                         options: {} }
    ],
    [
      { text: 'By.LinkText(text)',               options: {} },
      { text: "getByRole('link', {name})",       options: {} },
      { text: 'Locator',                         options: {} }
    ],
    [
      { text: 'driver.Navigate().GoToUrl()',     options: {} },
      { text: 'page.goto(url)',                  options: {} },
      { text: 'Navigation',                      options: {} }
    ],
    [
      { text: 'element.SendKeys(text)',          options: {} },
      { text: 'locator.fill(text)',              options: {} },
      { text: 'Action',                          options: {} }
    ],
    [
      { text: 'element.Click()',                 options: {} },
      { text: 'locator.click()',                 options: {} },
      { text: 'Action',                          options: {} }
    ],
    [
      { text: 'Thread.Sleep(ms)',                options: {} },
      { text: 'page.waitForTimeout(ms)',         options: {} },
      { text: 'Wait',                            options: {} }
    ]
  ];

  // Build rows with alternating fills
  const builtRows = tableRows.map((row, idx) => {
    if (idx === 0) {
      return row.map(cell => ({
        text: cell.text,
        options: {
          bold: true,
          fontSize: 11,
          color: DARK,
          fill: { color: CYAN },
          align: 'center',
          valign: 'middle',
          fontFace: 'Calibri'
        }
      }));
    }
    const fillColor = idx % 2 === 0 ? DARK : CARD;
    return row.map((cell, ci) => ({
      text: cell.text,
      options: {
        fontSize: 10,
        color: WHITE,
        fill: { color: fillColor },
        align: ci === 2 ? 'center' : 'left',
        valign: 'middle',
        fontFace: ci < 2 ? 'Courier New' : 'Calibri'
      }
    }));
  });

  slide.addTable(builtRows, {
    x: 0.4, y: 1.85, w: 12.5,
    rowH: 0.35,
    border: { type: 'solid', color: CYAN, pt: 0.5 },
    autoPage: false
  });

  // Migration metrics strip
  const migMetrics = [
    { x: 0.4,  title: 'Locators',   num: '8 patterns',  sub: 'converted' },
    { x: 2.9,  title: 'Actions',    num: '12 methods',  sub: 'converted' },
    { x: 5.4,  title: 'Waits',      num: '6 conditions', sub: 'converted' },
    { x: 7.9,  title: 'Navigation', num: '5 commands',  sub: 'converted' },
    { x: 10.4, title: 'File Types', num: '5 types',     sub: 'detected' }
  ];

  migMetrics.forEach(m => {
    addCard(slide, m.x, 5.05, 2.3, 1.1);
    slide.addText(m.title, {
      x: m.x + 0.1, y: 5.1, w: 2.1, h: 0.32,
      fontSize: 14, bold: true, color: CYAN, fontFace: 'Calibri',
      align: 'center'
    });
    slide.addText(m.num, {
      x: m.x + 0.1, y: 5.44, w: 2.1, h: 0.32,
      fontSize: 12, color: WHITE, fontFace: 'Calibri',
      align: 'center'
    });
    slide.addText(m.sub, {
      x: m.x + 0.1, y: 5.78, w: 2.1, h: 0.28,
      fontSize: 10, color: MUTED, fontFace: 'Calibri',
      align: 'center'
    });
  });

  // Footer note
  slide.addText(
    'Supports Step Definitions \u00b7 Page Objects \u00b7 Feature Files \u00b7 Hooks/Setup \u00b7 Test Configuration files',
    {
      x: 0.4, y: 6.35, w: 12.5, h: 0.4,
      fontSize: 12, italic: true, color: MUTED, fontFace: 'Calibri',
      align: 'center'
    }
  );
})();

// ════════════════════════════════════════════════════════════════════════════
// SAVE
// ════════════════════════════════════════════════════════════════════════════
const outPath = path.join(__dirname, 'NAT_2_0_Features.pptx');
pptx.writeFile({ fileName: outPath })
  .then(() => {
    const fs = require('fs');
    const stat = fs.statSync(outPath);
    console.log('SUCCESS: ' + outPath);
    console.log('File size: ' + (stat.size / 1024).toFixed(1) + ' KB');
  })
  .catch(err => {
    console.error('ERROR:', err);
    process.exit(1);
  });
