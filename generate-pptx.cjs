'use strict';
const PptxGenJS = require('pptxgenjs');

const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5

// ── DESIGN CONSTANTS ────────────────────────────────────────────────────────
const BG      = '0A1628';
const CARD_BG = '0D1F38';
const CYAN    = '00BFFF';
const WHITE   = 'FFFFFF';
const MUTED   = 'A0C4D8';
const GREEN   = '00FF88';
const DARK    = '061020';
const SLIDE_W = 13.33;
const SLIDE_H = 7.5;

// ── HELPERS ──────────────────────────────────────────────────────────────────
function bgSlide(slide) {
  slide.background = { color: BG };
}

function addTitle(slide, text, opts = {}) {
  slide.addText(text, {
    x: opts.x !== undefined ? opts.x : 0.5,
    y: opts.y !== undefined ? opts.y : 0.25,
    w: opts.w || SLIDE_W - 1,
    h: 0.65,
    fontSize: opts.size || 32,
    bold: true,
    color: CYAN,
    fontFace: 'Calibri',
    align: opts.align || 'left',
    ...opts.extra
  });
}

function addCard(slide, x, y, w, h, opts = {}) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h,
    fill: { color: opts.fill || CARD_BG },
    line: { color: opts.borderColor || CYAN, width: opts.borderWidth !== undefined ? opts.borderWidth : 0.75 },
    rectRadius: 0.06,
    shadow: { type: 'outer', blur: 4, offset: 2, angle: 45, color: '000000', opacity: 0.3 }
  });
  if (opts.topBar !== false) {
    slide.addShape(pptx.ShapeType.rect, {
      x, y, w, h: 0.06,
      fill: { color: CYAN },
      line: { color: CYAN, width: 0 }
    });
  }
}

function addBadge(slide, text, x, y, w, opts = {}) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h: 0.3,
    fill: { color: opts.fill || CYAN },
    line: { color: opts.fill || CYAN, width: 0 },
    rectRadius: 0.04
  });
  slide.addText(text, {
    x, y, w, h: 0.3,
    fontSize: 9,
    bold: true,
    color: opts.color || DARK,
    fontFace: 'Calibri',
    align: 'center'
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// SLIDE 1 — Cover
// ═══════════════════════════════════════════════════════════════════════════
(function slide1() {
  const slide = pptx.addSlide();
  bgSlide(slide);

  // Decorative gradient-like accent rect
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: SLIDE_W, h: 1.2,
    fill: { color: '061830' },
    line: { color: '061830', width: 0 }
  });

  // Main title
  slide.addText('NAT 2.0', {
    x: 0, y: 1.8, w: SLIDE_W, h: 1.2,
    fontSize: 72, bold: true, color: CYAN,
    fontFace: 'Arial', align: 'center'
  });

  // Subtitle
  slide.addText('Nous Autonomous Testing Platform', {
    x: 0, y: 3.2, w: SLIDE_W, h: 0.6,
    fontSize: 28, bold: false, color: WHITE,
    fontFace: 'Calibri', align: 'center'
  });

  // Tagline
  slide.addText('AI-Powered. Self-Healing. Enterprise-Grade.', {
    x: 0, y: 3.9, w: SLIDE_W, h: 0.5,
    fontSize: 18, italic: true, color: MUTED,
    fontFace: 'Calibri', align: 'center'
  });

  // Bottom bar
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 6.9, w: SLIDE_W, h: 0.6,
    fill: { color: CYAN },
    line: { color: CYAN, width: 0 }
  });
  slide.addText('Comprehensive Product Overview \u2014 2026', {
    x: 0, y: 7.0, w: SLIDE_W, h: 0.4,
    fontSize: 13, bold: true, color: BG,
    fontFace: 'Calibri', align: 'center'
  });
})();

// ═══════════════════════════════════════════════════════════════════════════
// SLIDE 2 — What is NAT 2.0?
// ═══════════════════════════════════════════════════════════════════════════
(function slide2() {
  const slide = pptx.addSlide();
  bgSlide(slide);
  addTitle(slide, 'What is NAT 2.0?');

  slide.addText(
    'NAT 2.0 is an enterprise QA automation platform that uses AI to generate tests, execute them across frameworks, and deliver production-quality results \u2014 with zero manual scaffolding.',
    {
      x: 0.5, y: 1.1, w: 12, h: 0.6,
      fontSize: 15, italic: true, color: WHITE,
      fontFace: 'Calibri', align: 'center'
    }
  );

  const cards = [
    { x: 0.4, icon: '\uD83E\uDD16', title: 'AI-First', body: 'Generate tests from user stories, Swagger specs, or file uploads. Zero manual prompt engineering.' },
    { x: 4.6, icon: '\u2699\uFE0F', title: 'Multi-Framework', body: 'Java Selenium, TypeScript Playwright, TestComplete JS \u2014 idiomatic output per framework.' },
    { x: 8.8, icon: '\uD83C\uDFE2', title: 'Enterprise-Ready', body: 'ZIP download, CI/CD integration, multi-tenant capable, structured folder output.' },
  ];

  cards.forEach(c => {
    addCard(slide, c.x, 2.2, 3.8, 4.0);
    slide.addText(c.icon, {
      x: c.x, y: 2.5, w: 3.8, h: 0.7,
      fontSize: 36, align: 'center', color: WHITE, fontFace: 'Segoe UI Emoji'
    });
    slide.addText(c.title, {
      x: c.x + 0.2, y: 3.3, w: 3.4, h: 0.45,
      fontSize: 18, bold: true, color: CYAN,
      fontFace: 'Calibri', align: 'center'
    });
    slide.addText(c.body, {
      x: c.x + 0.15, y: 3.85, w: 3.5, h: 1.8,
      fontSize: 13, color: WHITE,
      fontFace: 'Calibri', align: 'center', wrap: true
    });
  });
})();

// ═══════════════════════════════════════════════════════════════════════════
// SLIDE 3 — Core Modules
// ═══════════════════════════════════════════════════════════════════════════
(function slide3() {
  const slide = pptx.addSlide();
  bgSlide(slide);
  addTitle(slide, 'Core Modules');

  const modules = [
    { icon: '\uD83D\uDDC2\uFE0F', title: 'Framework Catalog',     body: 'Browse, configure & launch framework-specific test generation' },
    { icon: '\uD83E\uDDE0',      title: 'AI Test Generation',     body: 'Upload source files, get production-quality test code in seconds' },
    { icon: '\uD83D\uDD0C',      title: 'API Testing Module',     body: 'Swagger/OpenAPI-driven test generation with bearer token support' },
    { icon: '\uD83D\uDCC1',      title: 'Folder Upload',          body: 'Upload entire project folders, generate tests at scale' },
    { icon: '\uD83D\uDC41\uFE0F', title: 'Code Preview & ZIP',   body: 'Inspect generated code inline, download structured ZIP' },
    { icon: '\u2705',            title: 'TestComplete Integration', body: 'JavaScript test generation for desktop/web via TestComplete' },
  ];

  const positions = [
    { x: 0.3, y: 1.3 }, { x: 4.5, y: 1.3 }, { x: 8.7, y: 1.3 },
    { x: 0.3, y: 4.2 }, { x: 4.5, y: 4.2 }, { x: 8.7, y: 4.2 },
  ];

  modules.forEach((m, i) => {
    const { x, y } = positions[i];
    addCard(slide, x, y, 3.9, 2.6);
    slide.addText(m.icon, {
      x: x + 0.1, y: y + 0.15, w: 0.6, h: 0.5,
      fontSize: 22, color: WHITE, fontFace: 'Segoe UI Emoji'
    });
    slide.addText(m.title, {
      x: x + 0.15, y: y + 0.7, w: 3.6, h: 0.4,
      fontSize: 14, bold: true, color: CYAN,
      fontFace: 'Calibri'
    });
    slide.addText(m.body, {
      x: x + 0.15, y: y + 1.15, w: 3.6, h: 1.2,
      fontSize: 12, color: MUTED,
      fontFace: 'Calibri', wrap: true
    });
  });
})();

// ═══════════════════════════════════════════════════════════════════════════
// SLIDE 4 — Framework Catalog
// ═══════════════════════════════════════════════════════════════════════════
(function slide4() {
  const slide = pptx.addSlide();
  bgSlide(slide);
  addTitle(slide, 'Framework Catalog');

  // Left column
  slide.addText('Browse, configure & launch test generation', {
    x: 0.4, y: 1.1, w: 5.5, h: 0.4,
    fontSize: 16, color: WHITE, fontFace: 'Calibri'
  });

  const bullets = [
    'Java Selenium \u2014 Maven/Gradle POM structure',
    'TypeScript Playwright \u2014 async/await, cross-browser',
    'TestComplete JS \u2014 Aliases, Log.Message, TestedApps',
    'Framework-aware prompt engineering per selection',
    'Launch \u2192 parameter collection \u2192 code generation',
  ];
  bullets.forEach((b, i) => {
    slide.addText('\u2022  ' + b, {
      x: 0.4, y: 1.8 + i * 0.55, w: 5.5, h: 0.5,
      fontSize: 13, color: MUTED, fontFace: 'Calibri'
    });
  });

  // Right column — 3 stacked framework cards
  const frameworks = [
    { icon: '\u2615', label: 'Java Selenium',         badge: 'MAVEN',        y: 1.2 },
    { icon: '\uD83D\uDD37', label: 'TypeScript Playwright', badge: 'CROSS-BROWSER', y: 2.9 },
    { icon: '\u2705',   label: 'TestComplete JS',      badge: 'DESKTOP+WEB',  y: 4.6 },
  ];

  frameworks.forEach(f => {
    addCard(slide, 6.5, f.y, 6.4, 1.5);
    slide.addText(f.icon + '  ' + f.label, {
      x: 6.7, y: f.y + 0.5, w: 4.5, h: 0.5,
      fontSize: 15, bold: true, color: WHITE, fontFace: 'Calibri'
    });
    addBadge(slide, f.badge, 11.4, f.y + 0.5, 1.2);
  });
})();

// ═══════════════════════════════════════════════════════════════════════════
// SLIDE 5 — AI Generation Pipeline
// ═══════════════════════════════════════════════════════════════════════════
(function slide5() {
  const slide = pptx.addSlide();
  bgSlide(slide);
  addTitle(slide, 'AI Test Generation Pipeline');

  const steps = [
    { icon: '\uD83D\uDCE5', label: 'INPUT',      body: 'User Story / Swagger / File Upload', x: 0.3 },
    { icon: '\uD83D\uDD0D', label: 'ANALYSIS',   body: 'Framework-aware pattern extraction',  x: 2.9 },
    { icon: '\uD83C\uDFD7\uFE0F', label: 'PROMPT', body: 'Shared AI generation function constructed', x: 5.5 },
    { icon: '\u26A1',       label: 'GENERATION', body: 'Claude Sonnet API call with full context', x: 8.1 },
    { icon: '\uD83D\uDCE6', label: 'OUTPUT',     body: 'Preview + ZIP with proper folder structure', x: 10.7 },
  ];

  steps.forEach(s => {
    addCard(slide, s.x, 2.5, 2.4, 2.8);
    slide.addText(s.icon, {
      x: s.x, y: 2.65, w: 2.4, h: 0.55,
      fontSize: 26, align: 'center', color: WHITE, fontFace: 'Segoe UI Emoji'
    });
    slide.addText(s.label, {
      x: s.x + 0.1, y: 3.25, w: 2.2, h: 0.38,
      fontSize: 14, bold: true, color: WHITE,
      fontFace: 'Calibri', align: 'center'
    });
    slide.addText(s.body, {
      x: s.x + 0.1, y: 3.7, w: 2.2, h: 1.4,
      fontSize: 11, color: MUTED,
      fontFace: 'Calibri', align: 'center', wrap: true
    });
  });

  // Arrows
  [2.6, 5.2, 7.8, 10.4].forEach(ax => {
    slide.addText('\u2192', {
      x: ax, y: 3.6, w: 0.4, h: 0.4,
      fontSize: 20, bold: true, color: CYAN,
      fontFace: 'Calibri', align: 'center'
    });
  });

  // Footer
  slide.addText('Framework-aware prompt engineering ensures idiomatic, production-quality code per framework', {
    x: 0.5, y: 5.6, w: SLIDE_W - 1, h: 0.4,
    fontSize: 13, italic: true, color: MUTED,
    fontFace: 'Calibri', align: 'center'
  });
})();

// ═══════════════════════════════════════════════════════════════════════════
// SLIDE 6 — Test Quality by Framework
// ═══════════════════════════════════════════════════════════════════════════
(function slide6() {
  const slide = pptx.addSlide();
  bgSlide(slide);
  addTitle(slide, 'Test Quality by Framework');

  const cards = [
    {
      x: 0.3, title: '\u2615  Java Selenium',
      bullets: [
        'Page Object Model (POM)',
        'BaseTest @BeforeClass setup',
        '@Test with explicit waits',
        'TestNG annotations',
        'Realistic locators (ID/CSS/XPath)',
      ]
    },
    {
      x: 4.5, title: '\uD83D\uDD37  TypeScript Playwright',
      bullets: [
        'test.describe blocks',
        'page.goto + locator selectors',
        'expect() assertions',
        'async/await pattern',
        'Screenshot on failure',
      ]
    },
    {
      x: 8.7, title: '\u2705  TestComplete JS',
      bullets: [
        'Aliases-based object mapping',
        'Log.Message step logging',
        'TestedApps launch',
        'Checkpoint assertions',
        'Proper test function structure',
      ]
    },
  ];

  cards.forEach(c => {
    addCard(slide, c.x, 1.3, 3.9, 5.5);
    slide.addText(c.title, {
      x: c.x + 0.15, y: 1.5, w: 3.6, h: 0.45,
      fontSize: 15, bold: true, color: CYAN, fontFace: 'Calibri'
    });
    c.bullets.forEach((b, i) => {
      slide.addText('\u2022  ' + b, {
        x: c.x + 0.2, y: 2.1 + i * 0.7, w: 3.5, h: 0.6,
        fontSize: 12, color: MUTED, fontFace: 'Calibri', wrap: true
      });
    });
  });
})();

// ═══════════════════════════════════════════════════════════════════════════
// SLIDE 7 — API Testing Module
// ═══════════════════════════════════════════════════════════════════════════
(function slide7() {
  const slide = pptx.addSlide();
  bgSlide(slide);
  addTitle(slide, 'API Testing Module');

  const features = [
    'Swagger/OpenAPI file upload & parsing',
    'Auto-discovery of all endpoints & schemas',
    'Base URL resolution from servers[] array',
    'Bearer token authentication injection',
    'Parameter collection for required values',
    'Prevents hallucinated parameter values',
    'Schema-compliant realistic test body generation',
    '20-endpoint batch test execution',
  ];

  features.forEach((f, i) => {
    slide.addText('\u25B6  ' + f, {
      x: 0.4, y: 1.3 + i * 0.52, w: 5.8, h: 0.45,
      fontSize: 13, color: WHITE, fontFace: 'Calibri'
    });
  });

  // Right — Parameter collection card
  addCard(slide, 6.5, 1.2, 6.4, 5.5);
  slide.addText('Parameter Collection', {
    x: 6.7, y: 1.45, w: 5.8, h: 0.4,
    fontSize: 14, bold: true, color: WHITE, fontFace: 'Calibri', align: 'center'
  });

  // Table header
  const cols = [{ l: 'Name', w: 1.3 }, { l: 'Type', w: 1.1 }, { l: 'Required', w: 1.2 }, { l: 'Value', w: 2.0 }];
  const tableX = [6.7, 8.0, 9.1, 10.3];
  cols.forEach((c, i) => {
    slide.addShape(pptx.ShapeType.rect, {
      x: tableX[i], y: 2.0, w: c.w, h: 0.35,
      fill: { color: '1a3a5c' }, line: { color: CYAN, width: 0.5 }
    });
    slide.addText(c.l, {
      x: tableX[i], y: 2.0, w: c.w, h: 0.35,
      fontSize: 11, bold: true, color: CYAN, fontFace: 'Calibri', align: 'center'
    });
  });

  const rows = [
    ['petId', 'integer', '\u2713', '12345'],
    ['status', 'string', '\u2713', 'available'],
    ['api_key', 'string', '\u2014', 'special-key'],
  ];
  rows.forEach((row, ri) => {
    row.forEach((cell, ci) => {
      slide.addShape(pptx.ShapeType.rect, {
        x: tableX[ci], y: 2.35 + ri * 0.38, w: cols[ci].w, h: 0.38,
        fill: { color: ri % 2 === 0 ? CARD_BG : '0f2840' },
        line: { color: '1a3a5c', width: 0.5 }
      });
      slide.addText(cell, {
        x: tableX[ci] + 0.05, y: 2.35 + ri * 0.38, w: cols[ci].w - 0.1, h: 0.38,
        fontSize: 11, color: ci === 2 && cell === '\u2713' ? GREEN : WHITE,
        fontFace: 'Calibri', align: 'center'
      });
    });
  });

  // Auth field
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 6.7, y: 3.65, w: 5.9, h: 0.45,
    fill: { color: '061830' }, line: { color: CYAN, width: 0.75 },
    rectRadius: 0.04
  });
  slide.addText('Bearer Token:  \u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022', {
    x: 6.85, y: 3.67, w: 5.6, h: 0.4,
    fontSize: 12, color: MUTED, fontFace: 'Calibri'
  });

  // Button mockup
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 7.8, y: 4.35, w: 3.9, h: 0.55,
    fill: { color: CYAN }, line: { color: CYAN, width: 0 },
    rectRadius: 0.06
  });
  slide.addText('Generate Tests \u2192', {
    x: 7.8, y: 4.35, w: 3.9, h: 0.55,
    fontSize: 14, bold: true, color: DARK, fontFace: 'Calibri', align: 'center'
  });
})();

// ═══════════════════════════════════════════════════════════════════════════
// SLIDE 8 — Folder Upload & Batch Processing
// ═══════════════════════════════════════════════════════════════════════════
(function slide8() {
  const slide = pptx.addSlide();
  bgSlide(slide);
  addTitle(slide, 'Folder Upload & Batch Processing');

  const items = [
    { icon: '\uD83D\uDCC1', main: 'Upload entire project directory (zip or folder)', detail: 'Drag-and-drop or browse to select' },
    { icon: '\uD83D\uDD0D', main: 'Auto-detection of source files by extension',    detail: '.java, .ts, .js, .py and more' },
    { icon: '\u26A1',        main: 'Parallel AI generation across multiple files',  detail: 'Concurrent Claude API calls' },
    { icon: '\uD83D\uDCE6', main: 'Aggregated ZIP with mirrored folder structure', detail: 'Preserves original directory layout' },
    { icon: '\uD83D\uDCCA', main: 'Progress tracking per file with status indicators', detail: 'Real-time status per file' },
    { icon: '\uD83D\uDEE1\uFE0F', main: 'Error isolation \u2014 one failure doesn\'t block others', detail: 'Fault-tolerant batch execution' },
  ];

  items.forEach((item, i) => {
    slide.addText(item.icon + '  ' + item.main, {
      x: 0.4, y: 1.3 + i * 0.72, w: 6.0, h: 0.38,
      fontSize: 14, bold: true, color: WHITE, fontFace: 'Calibri'
    });
    slide.addText('    ' + item.detail, {
      x: 0.4, y: 1.65 + i * 0.72, w: 6.0, h: 0.3,
      fontSize: 12, color: MUTED, fontFace: 'Calibri'
    });
  });

  // Right stat boxes
  const stats = [
    { big: '100s', label: 'Files per session',         y: 1.3,  bigSize: 48 },
    { big: 'Mirrored', label: 'Output folder structure', y: 3.1,  bigSize: 36 },
    { big: 'Zero Config', label: 'Framework auto-detected', y: 4.9, bigSize: 28 },
  ];

  stats.forEach(s => {
    addCard(slide, 6.8, s.y, 6.0, 1.6, { topBar: false });
    slide.addText(s.big, {
      x: 6.8, y: s.y + 0.15, w: 6.0, h: 0.9,
      fontSize: s.bigSize, bold: true, color: CYAN,
      fontFace: 'Calibri', align: 'center'
    });
    slide.addText(s.label, {
      x: 6.8, y: s.y + 1.05, w: 6.0, h: 0.4,
      fontSize: 13, color: WHITE, fontFace: 'Calibri', align: 'center'
    });
  });
})();

// ═══════════════════════════════════════════════════════════════════════════
// SLIDE 9 — Code Preview & ZIP Download
// ═══════════════════════════════════════════════════════════════════════════
(function slide9() {
  const slide = pptx.addSlide();
  bgSlide(slide);
  addTitle(slide, 'Code Preview & ZIP Download');

  // Left panel
  addCard(slide, 0.3, 1.3, 6.2, 5.5, { topBar: false });

  // Header bar
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.3, y: 1.3, w: 6.2, h: 0.5,
    fill: { color: '1a2f4a' }, line: { color: '1a2f4a', width: 0 }
  });
  slide.addText('\uD83D\uDCC4  tests/LoginPageTest.java', {
    x: 0.45, y: 1.32, w: 5.9, h: 0.45,
    fontSize: 11, color: WHITE, fontFace: 'Calibri'
  });

  const codeLines = [
    '@Test',
    'public void testLogin() {',
    '  LoginPage page = new LoginPage(driver);',
    '  page.enterUsername("testUser");',
    '  page.enterPassword("pass123");',
    '  page.clickLogin();',
    '  Assert.assertTrue(page.isLoggedIn());',
    '}',
  ];
  codeLines.forEach((line, i) => {
    slide.addText(line, {
      x: 0.45, y: 1.95 + i * 0.38, w: 5.9, h: 0.38,
      fontSize: 10, color: '98FB98', fontFace: 'Courier New'
    });
  });

  // Badges
  addBadge(slide, 'Java Selenium', 0.5, 5.5, 1.4);
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 2.1, y: 5.5, w: 1.1, h: 0.3,
    fill: { color: CARD_BG }, line: { color: MUTED, width: 0.5 }, rectRadius: 0.04
  });
  slide.addText('42 lines', {
    x: 2.1, y: 5.5, w: 1.1, h: 0.3,
    fontSize: 9, color: MUTED, fontFace: 'Calibri', align: 'center'
  });

  // Right panel
  addCard(slide, 6.8, 1.3, 6.0, 5.5, { topBar: false });
  slide.addText('ZIP Structure', {
    x: 6.95, y: 1.55, w: 5.7, h: 0.45,
    fontSize: 14, bold: true, color: WHITE, fontFace: 'Calibri'
  });

  const tree = [
    'src/',
    '  test/',
    '    java/',
    '      tests/',
    '        LoginPageTest.java',
    '      pages/',
    '        LoginPage.java',
    '    resources/',
    '      testng.xml',
    'pom.xml',
    'README.md',
  ];
  tree.forEach((line, i) => {
    slide.addText(line, {
      x: 6.95, y: 2.1 + i * 0.38, w: 5.6, h: 0.38,
      fontSize: 11, color: MUTED, fontFace: 'Courier New'
    });
  });
})();

// ═══════════════════════════════════════════════════════════════════════════
// SLIDE 10 — Self-Healing Framework (Roadmap)
// ═══════════════════════════════════════════════════════════════════════════
(function slide10() {
  const slide = pptx.addSlide();
  bgSlide(slide);
  addTitle(slide, 'Roadmap: Self-Healing Framework');

  // Badge
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 9.5, y: 0.2, w: 3.4, h: 0.42,
    fill: { color: CYAN }, line: { color: CYAN, width: 0 }, rectRadius: 0.06
  });
  slide.addText('Coming in Phase 2', {
    x: 9.5, y: 0.2, w: 3.4, h: 0.42,
    fontSize: 13, bold: true, color: DARK, fontFace: 'Calibri', align: 'center'
  });

  const cards2x2 = [
    { x: 0.4, y: 1.8,  icon: '\uD83D\uDD27', title: 'Auto-Repair',                body: 'Automatically repairs broken locators when DOM changes are detected' },
    { x: 7.0, y: 1.8,  icon: '\uD83D\uDD17', title: 'Selector Fallback Chain',     body: 'ID \u2192 CSS \u2192 XPath \u2192 Text content \u2014 tries all before failing' },
    { x: 0.4, y: 4.2,  icon: '\uD83D\uDD0D', title: 'Failure Fingerprinting',      body: 'Classifies failures as locator, timing, data, or logic issues' },
    { x: 7.0, y: 4.2,  icon: '\uD83D\uDCCA', title: 'Maintenance Dashboard',       body: 'Track healing events, locator health scores, and repair history' },
  ];

  cards2x2.forEach(c => {
    addCard(slide, c.x, c.y, 5.8, 2.2);
    slide.addText(c.icon + '  ' + c.title, {
      x: c.x + 0.2, y: c.y + 0.25, w: 5.4, h: 0.45,
      fontSize: 16, bold: true, color: CYAN, fontFace: 'Calibri'
    });
    slide.addText(c.body, {
      x: c.x + 0.2, y: c.y + 0.78, w: 5.4, h: 1.2,
      fontSize: 13, color: WHITE, fontFace: 'Calibri', wrap: true
    });
  });
})();

// ═══════════════════════════════════════════════════════════════════════════
// SLIDE 11 — CI/CD Integration
// ═══════════════════════════════════════════════════════════════════════════
(function slide11() {
  const slide = pptx.addSlide();
  bgSlide(slide);
  addTitle(slide, 'CI/CD Integration & Shift-Left Testing');

  const stages = ['Code Commit', 'NAT 2.0 Triggered', 'Tests Generated', 'Tests Executed', 'Results Reported', 'Gate Decision'];
  const stageX = [0.3, 2.3, 4.3, 6.3, 8.3, 10.3];

  stages.forEach((s, i) => {
    const isLast = i === stages.length - 1;
    addCard(slide, stageX[i], 2.0, 1.9, 1.4, { borderColor: isLast ? GREEN : CYAN });
    slide.addText(s, {
      x: stageX[i] + 0.1, y: 2.1, w: 1.7, h: 1.2,
      fontSize: 12, bold: true, color: isLast ? GREEN : WHITE,
      fontFace: 'Calibri', align: 'center', wrap: true
    });
  });

  // Arrows between stages
  [2.05, 4.05, 6.05, 8.05, 10.05].forEach(ax => {
    slide.addText('\u2192', {
      x: ax, y: 2.5, w: 0.35, h: 0.35,
      fontSize: 18, bold: true, color: CYAN, fontFace: 'Calibri', align: 'center'
    });
  });

  // Feature callouts
  const callouts = [
    { icon: '\uD83D\uDD0C', label: 'REST API' },
    { icon: '\uD83E\uDE9D', label: 'Webhooks' },
    { icon: '\uD83D\uDCCB', label: 'JUnit/TestNG XML' },
    { icon: '\uD83D\uDD27', label: 'GitHub/Jenkins/Azure DevOps' },
  ];
  const calloutX = [0.4, 3.4, 6.4, 9.4];
  callouts.forEach((c, i) => {
    addCard(slide, calloutX[i], 3.8, 2.9, 1.4, { topBar: false });
    slide.addText(c.icon + '  ' + c.label, {
      x: calloutX[i] + 0.1, y: 3.9, w: 2.7, h: 1.1,
      fontSize: 13, bold: true, color: CYAN,
      fontFace: 'Calibri', align: 'center', wrap: true
    });
  });
})();

// ═══════════════════════════════════════════════════════════════════════════
// SLIDE 12 — Multi-Tenant Architecture
// ═══════════════════════════════════════════════════════════════════════════
(function slide12() {
  const slide = pptx.addSlide();
  bgSlide(slide);
  addTitle(slide, 'Multi-Tenant Architecture & Security');

  const cards = [
    { x: 0.3, y: 1.4, icon: '\uD83C\uDFE2', title: 'Tenant Isolation',    body: 'Separate generation contexts per organization' },
    { x: 4.5, y: 1.4, icon: '\uD83D\uDD11', title: 'API Key Management',   body: 'Per-tenant Claude API key configuration' },
    { x: 8.7, y: 1.4, icon: '\uD83D\uDCCB', title: 'Audit Trail',          body: 'Generation history and user activity logs' },
    { x: 0.3, y: 3.8, icon: '\uD83D\uDC65', title: 'Role-Based Access',    body: 'Admin / QA Lead / QA Engineer roles' },
    { x: 4.5, y: 3.8, icon: '\uD83D\uDD12', title: 'Data Privacy',         body: 'No source code retained post-generation' },
    { x: 8.7, y: 3.8, icon: '\uD83D\uDCDC', title: 'Compliance-Ready',     body: 'Configurable data retention policies' },
  ];

  cards.forEach(c => {
    addCard(slide, c.x, c.y, 3.9, 2.1);
    slide.addText(c.icon + '  ' + c.title, {
      x: c.x + 0.15, y: c.y + 0.2, w: 3.6, h: 0.45,
      fontSize: 14, bold: true, color: CYAN, fontFace: 'Calibri'
    });
    slide.addText(c.body, {
      x: c.x + 0.15, y: c.y + 0.72, w: 3.6, h: 1.1,
      fontSize: 12, color: WHITE, fontFace: 'Calibri', wrap: true
    });
  });
})();

// ═══════════════════════════════════════════════════════════════════════════
// SLIDE 13 — Platform Metrics
// ═══════════════════════════════════════════════════════════════════════════
(function slide13() {
  const slide = pptx.addSlide();
  bgSlide(slide);
  addTitle(slide, 'Platform Impact & Metrics');

  const stats = [
    { x: 0.3,  y: 1.4, big: '3',      bigSize: 60, label: 'Frameworks Supported' },
    { x: 4.5,  y: 1.4, big: '90%+',   bigSize: 48, label: 'Code Quality Score' },
    { x: 8.7,  y: 1.4, big: '<30s',   bigSize: 42, label: 'Full Suite Generation' },
    { x: 0.3,  y: 3.9, big: 'ZERO',   bigSize: 42, label: 'Manual Scaffolding' },
    { x: 4.5,  y: 3.9, big: '100%',   bigSize: 48, label: 'Swagger Coverage' },
    { x: 8.7,  y: 3.9, big: 'ZIP',    bigSize: 42, label: 'Structured CI-Ready Output' },
  ];

  stats.forEach(s => {
    addCard(slide, s.x, s.y, 3.9, 2.2, { topBar: false });
    slide.addText(s.big, {
      x: s.x, y: s.y + 0.1, w: 3.9, h: 1.1,
      fontSize: s.bigSize, bold: true, color: CYAN,
      fontFace: 'Calibri', align: 'center'
    });
    slide.addText(s.label, {
      x: s.x + 0.15, y: s.y + 1.5, w: 3.6, h: 0.55,
      fontSize: 13, color: WHITE,
      fontFace: 'Calibri', align: 'center', wrap: true
    });
  });
})();

// ═══════════════════════════════════════════════════════════════════════════
// SLIDE 14 — Roadmap
// ═══════════════════════════════════════════════════════════════════════════
(function slide14() {
  const slide = pptx.addSlide();
  bgSlide(slide);
  addTitle(slide, 'Product Roadmap');

  const phases = [
    {
      x: 0.3, headerFill: CYAN, headerText: 'Phase 1 \u2014 NOW', headerTextColor: DARK,
      items: [
        '\u2713  Multi-framework code generation',
        '\u2713  API testing with Swagger support',
        '\u2713  Folder upload + batch processing',
        '\u2713  Code preview + ZIP download',
        '\u2713  TestComplete JS generator',
      ], itemColor: GREEN
    },
    {
      x: 4.5, headerFill: '1a5c7a', headerText: 'Phase 2 \u2014 Q2-Q3 2026', headerTextColor: WHITE,
      items: [
        '\u25EF  Visual regression testing module',
        '\u25EF  Self-healing locator engine',
        '\u25EF  Test impact analysis',
        '\u25EF  Jira story auto-trigger integration',
      ], itemColor: MUTED
    },
    {
      x: 8.7, headerFill: CARD_BG, headerText: 'Phase 3 \u2014 Future', headerTextColor: MUTED,
      borderColor: CYAN,
      items: [
        '\u25EF  6-Agent autonomous execution',
        '\u25EF  CI/CD-native deployment mode',
        '\u25EF  Python & C# language support',
        '\u25EF  Enterprise SSO + compliance audit',
      ], itemColor: MUTED
    },
  ];

  phases.forEach(p => {
    // Card background
    slide.addShape(pptx.ShapeType.roundRect, {
      x: p.x, y: 1.3, w: 3.9, h: 5.0,
      fill: { color: CARD_BG },
      line: { color: p.borderColor || p.headerFill, width: 0.75 },
      rectRadius: 0.06
    });
    // Header bar
    slide.addShape(pptx.ShapeType.rect, {
      x: p.x, y: 1.3, w: 3.9, h: 0.55,
      fill: { color: p.headerFill }, line: { color: p.headerFill, width: 0 }
    });
    slide.addText(p.headerText, {
      x: p.x + 0.1, y: 1.3, w: 3.7, h: 0.55,
      fontSize: 14, bold: true, color: p.headerTextColor, fontFace: 'Calibri', align: 'center'
    });
    p.items.forEach((item, i) => {
      slide.addText(item, {
        x: p.x + 0.2, y: 2.05 + i * 0.72, w: 3.5, h: 0.6,
        fontSize: 13, color: p.itemColor, fontFace: 'Calibri', wrap: true
      });
    });
  });
})();

// ═══════════════════════════════════════════════════════════════════════════
// SLIDE 15 — Closing CTA
// ═══════════════════════════════════════════════════════════════════════════
(function slide15() {
  const slide = pptx.addSlide();
  bgSlide(slide);

  // Headline
  slide.addText('NAT 2.0 \u2014 Where AI Meets Enterprise QA', {
    x: 0, y: 1.5, w: SLIDE_W, h: 0.75,
    fontSize: 36, bold: true, color: CYAN,
    fontFace: 'Calibri', align: 'center'
  });

  // Sub
  slide.addText('Built for teams who can\'t afford slow releases or fragile tests', {
    x: 0, y: 2.4, w: SLIDE_W, h: 0.55,
    fontSize: 18, italic: true, color: WHITE,
    fontFace: 'Calibri', align: 'center'
  });

  // CTA boxes
  const ctas = [
    { x: 0.8,  label: '\uD83C\uDFAF  Request Demo',      fill: CYAN,    textColor: DARK,  border: CYAN },
    { x: 4.5,  label: '\uD83D\uDCDA  View Docs',           fill: CARD_BG, textColor: WHITE, border: CYAN },
    { x: 8.2,  label: '\uD83D\uDE80  Start Free Trial',    fill: CARD_BG, textColor: WHITE, border: CYAN },
  ];

  ctas.forEach(c => {
    slide.addShape(pptx.ShapeType.roundRect, {
      x: c.x, y: 3.5, w: 3.2, h: 1.2,
      fill: { color: c.fill }, line: { color: c.border, width: 1.5 },
      rectRadius: 0.08
    });
    slide.addText(c.label, {
      x: c.x, y: 3.5, w: 3.2, h: 1.2,
      fontSize: 18, bold: true, color: c.textColor,
      fontFace: 'Calibri', align: 'center'
    });
  });

  // Bottom info
  slide.addText('Nous Info Systems  |  nous.com  |  enterprise-grade AI testing', {
    x: 0, y: 5.5, w: SLIDE_W, h: 0.45,
    fontSize: 13, color: MUTED, fontFace: 'Calibri', align: 'center'
  });

  // Decorative bottom bar
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 7.35, w: SLIDE_W, h: 0.15,
    fill: { color: CYAN }, line: { color: CYAN, width: 0 }
  });
})();

// ── SAVE ─────────────────────────────────────────────────────────────────────
const outFile = 'NAT_2_0_Product_Overview.pptx';
pptx.writeFile({ fileName: outFile })
  .then(() => {
    console.log('[SUCCESS] File written: ' + outFile);
  })
  .catch(err => {
    console.error('[ERROR]', err);
    process.exit(1);
  });
