# NAT 2.0 — AI-Powered Quality Engineering Platform
## Complete Functionality Documentation

---

## Table of Contents

1. [Platform Overview](#1-platform-overview)
2. [Getting Started & Authentication](#2-getting-started--authentication)
3. [Dashboard](#3-dashboard)
4. [Autonomous Testing](#4-autonomous-testing)
5. [Sprint Agent V2](#5-sprint-agent-v2)
6. [Execution Mode](#6-execution-mode)
7. [AI Quality Engine](#7-ai-quality-engine)
   - 7.1 [Visual Regression Testing](#71-visual-regression-testing)
   - 7.2 [Pixel-to-Pixel Comparison](#72-pixel-to-pixel-comparison)
   - 7.3 [Accessibility Compliance (WCAG 2.1)](#73-accessibility-compliance-wcag-21)
   - 7.4 [Responsive Design Testing](#74-responsive-design-testing)
   - 7.5 [SSRS to PowerBI Migration Validator](#75-ssrs-to-powerbi-migration-validator)
   - 7.6 [API Testing Module](#76-api-testing-module)
   - 7.7 [Selenium to Playwright Migration](#77-selenium-to-playwright-migration)
   - 7.8 [ICU Medical Device Stream Validator](#78-icu-medical-device-stream-validator)
8. [Synthetic Data Generator](#8-synthetic-data-generator)
9. [Agent Configurations](#9-agent-configurations)
10. [Architecture Diagram](#10-architecture-diagram)
11. [Tri-Brand Mode](#11-tri-brand-mode)
12. [Integrations](#12-integrations)
    - 12.1 [Azure DevOps](#121-azure-devops-integration)
    - 12.2 [Jira](#122-jira-integration)
13. [Test Case Format Standard](#13-test-case-format-standard)
14. [Export Formats](#14-export-formats)

---

## 1. Platform Overview

NAT 2.0 is an AI agent-based quality engineering platform that automates the full spectrum of software testing — from functional test case generation to visual regression, accessibility, API testing, and medical device data validation. It is designed for QE teams who need to ship faster without compromising on test coverage or quality.

**Core capabilities at a glance:**

| Capability | What it does |
|---|---|
| Sprint Agent V2 | Generates test cases from user stories using a multi-agent AI pipeline |
| Autonomous Testing | Crawls any website and generates test cases without manual input |
| Execution Mode | Runs generated tests in a real browser with AI agent orchestration |
| AI Quality Engine | Modular testing suite — visual, accessibility, API, responsive, migration, medical |
| Synthetic Data Generator | Creates realistic test datasets for any industry domain |
| Agent Configurations | Pushes generated tests to ADO, Jira, or TestRail |

**Technology stack:**
- Frontend: React, TypeScript, Vite, Shadcn/UI, Tailwind CSS
- Backend: Express.js, Drizzle ORM, PostgreSQL (Neon serverless)
- Browser automation: Playwright (Chromium)
- AI: Anthropic Claude API (claude-sonnet-4-5)
- Real-time updates: Server-Sent Events (SSE)

---

## 2. Getting Started & Authentication

### Login
Navigate to `/landing` to access the login page. Enter credentials to authenticate. The platform uses session-based authentication stored in localStorage.

### Navigation
The left sidebar provides access to all modules. The sidebar collapses to icon-only mode for more working space. A brand toggle at the bottom of the sidebar cycles between brand profiles (see Section 11).

### Global Search
A search bar in the header allows searching across projects, test cases, and sessions.

### Notifications
The bell icon in the header shows recent activity and pipeline completion alerts.

---

## 3. Dashboard

**Route:** `/dashboard`

The dashboard is the central entry point providing a real-time view of the platform's activity.

### What it shows

**Summary Cards (top row):**
- Total test runs executed
- Tests passed / failed / pending
- Active projects count
- Recent activity timeline

**Quick Actions:**
- Start a new Autonomous Test
- Open Sprint Agent V2
- Launch Execution Mode
- Open AI Quality Engine

**Project List:**
Displays all registered projects with status indicators, last run timestamps, and pass rates. Projects can be opened directly from the dashboard.

**Recent Activity Feed:**
Shows the last N test sessions with their outcomes, timestamps, and links to full reports.

---

## 4. Autonomous Testing

**Route:** `/functional-testing`

Autonomous Testing crawls any live website and generates a full test suite without the user needing to write a single test case manually.

### How it works

1. **Target Configuration**
   - Enter the target URL (the website to test)
   - Set crawl depth (how many pages to discover)
   - Optionally specify pages to include or exclude

2. **Authentication Setup**
   - If the target requires login, configure credentials
   - Supports username/password, cookie injection, and token-based auth
   - Credentials are stored securely and reused across runs

3. **Context Input**
   - Optionally describe the application in plain text ("This is a claims management portal for insurance adjusters")
   - Context improves the relevance of generated test cases

4. **AI Analysis**
   - The platform crawls the target site using Playwright
   - Discovers all interactive elements, forms, flows, and pages
   - Claude AI analyses the application's purpose and user workflows

5. **Test Generation**
   - Generates functional, negative, edge case, security, and accessibility test cases
   - All tests follow the 6-step comprehensive format (see Section 13)
   - Test cases are tagged by page, priority, and type

6. **Output**
   - View generated test cases in the results panel
   - Export as Excel, BDD ZIP, or Playwright `.spec.ts` files
   - Push directly to ADO or Jira via Agent Configurations

---

## 5. Sprint Agent V2

**Route:** `/sprint-agent`

Sprint Agent V2 is a multi-agent AI pipeline that generates comprehensive, structured test cases from user stories. It supports two input modes: Azure DevOps and Jira.

### Input Modes

#### Mode 1 — Azure DevOps
1. Select an ADO project from the dropdown (fetched live from your ADO organisation)
2. Select a sprint / iteration
3. Select a user story from the list
4. Acceptance criteria are automatically extracted from the story description
5. Click **Generate Test Cases**

#### Mode 2 — Jira
1. Switch to Jira mode using the toggle
2. Search and select a Jira project (searchable dropdown)
3. Optionally filter by board and sprint
4. Select a user story
5. Previously generated test cases auto-load if they exist for this story
6. Click **Generate Test Cases**

### AI Pipeline (5 agents)

The generation runs through a sequential multi-agent pipeline streamed in real time:

| Agent | Role |
|---|---|
| Requirements Analyst | Decomposes the user story and acceptance criteria into testable requirements |
| Test Architect | Designs the test coverage strategy across all test types |
| Test Case Generator | Writes detailed 6-step test cases for each requirement |
| Quality Reviewer | Reviews and refines test cases for completeness and accuracy |
| Report Formatter | Structures output for export and downstream tools |

### Test Types Generated

- **Functional** — Happy path scenarios validating the primary business flow
- **Negative** — Invalid inputs, boundary violations, error handling
- **Edge Case** — Boundary values, unusual data combinations, race conditions
- **Security** — Authentication, authorisation, injection, session management
- **Accessibility** — WCAG 2.1 AA compliance, screen reader compatibility, keyboard navigation

### Playwright Script Generation

For each test case, you can generate a ready-to-run Playwright TypeScript script by clicking **Generate Script** on any test case card. The script:
- Includes full page navigation and element interactions
- Adds assertions matching the test case expected results
- Follows Playwright best practices (locators, waits, retries)

### Export Options

| Format | Description |
|---|---|
| Excel (.xlsx) | Tabular format with all test case fields, suitable for test management tools |
| Formatted Text | Human-readable markdown format for documentation |
| Playwright .spec.ts | Ready-to-run TypeScript test file |
| BDD Assets ZIP | Feature files + step definitions + support files for Cucumber.js |

### Saving & History

Test cases generated from Jira stories are automatically saved to the database linked to the project key and story ID. Re-opening the same story loads previously generated test cases instantly without re-running the AI pipeline.

---

## 6. Execution Mode

**Route:** `/execution-mode`

Execution Mode runs generated test cases in a real browser using a Playwright-backed AI agent orchestration system.

### Test Sources

Three sources can feed tests into Execution Mode:

| Source | How to use |
|---|---|
| Sprint Agent | Select a project and sprint; loads test cases generated by Sprint Agent V2 |
| Jira User Stories | Select a project and story; loads test cases from the `jira_test_cases` database table |
| Autonomous Testing | Select a functional test run; loads test cases from a previous Autonomous Test session |

### AI Agent Roles During Execution

| Agent | Responsibility |
|---|---|
| Orchestrator | Plans the test execution sequence and manages overall flow |
| Navigator | Controls browser navigation between pages |
| Executor | Performs the actual interactions (clicks, form fills, assertions) |
| Validator | Checks outcomes against expected results after each step |
| Reporter | Captures screenshots, logs, and generates the final BDD report |

### During Execution

- A live browser viewport is visible in the UI
- Each step is highlighted as it executes
- Screenshots are captured at key moments
- Pass/fail status updates in real time
- Agent "thoughts" are displayed showing reasoning

### Output Artifacts

- **BDD Report**: Cucumber-formatted test results with step-by-step outcomes
- **Screenshots**: Timestamped captures at each test step
- **Execution Log**: Full timeline of agent actions and decisions
- **BDD ZIP**: Downloadable package containing feature files and results

---

## 7. AI Quality Engine

**Route:** `/nradiverse`

The AI Quality Engine is a modular testing suite covering specialised validation scenarios. Each module operates independently and can be used on demand.

---

### 7.1 Visual Regression Testing

**Route:** `/nradiverse/visual-regression`

Detects unintended visual changes in web interfaces by comparing screenshots against approved baselines.

**How it works:**
1. Enter the target URL
2. The module captures a full-page screenshot (baseline on first run)
3. On subsequent runs, it compares the new screenshot pixel-by-pixel against the baseline
4. Differences are highlighted with a visual diff overlay
5. SSIM (Structural Similarity Index) and PSNR (Peak Signal-to-Noise Ratio) scores are calculated

**Key features:**
- Baseline image capture and management
- Pixel-by-pixel comparison with diff heatmap
- SSIM / PSNR quality metrics
- Support for multiple viewport sizes
- Ignore regions (for dynamic content like timestamps)

**Output:** Pass/fail status with percentage similarity score and annotated diff image

---

### 7.2 Pixel-to-Pixel Comparison

**Route:** `/nradiverse/pixel-comparison`

Provides granular image comparison between any two images (not limited to web screenshots).

**Use cases:**
- Comparing design mockups against implemented UI
- Validating report outputs across system versions
- Checking print/export fidelity

**Features:**
- Multi-algorithm comparison (pixel diff, SSIM, histogram analysis)
- Heat map visualisation highlighting changed regions
- Batch processing support for multiple image pairs
- Configurable tolerance thresholds

---

### 7.3 Accessibility Compliance (WCAG 2.1)

**Route:** `/nradiverse/accessibility`

Automated WCAG 2.1 Level AA accessibility validation powered by axe-core and Claude Vision AI analysis.

**How it works:**
1. Enter a URL to scan
2. The module loads the page in a headless browser
3. axe-core runs automated accessibility checks
4. Claude Vision AI provides additional contextual analysis (contrast, label quality, flow)
5. Results are categorised by WCAG criterion and severity

**What is checked:**
- Color contrast ratios (minimum 4.5:1 for normal text)
- Alternative text for all images
- Keyboard navigability of all interactive elements
- Screen reader compatibility (ARIA labels, roles, landmarks)
- Form label associations
- Focus management and visible focus indicators
- Heading hierarchy and document structure

**Output:**
- Issue list with WCAG criterion reference, severity (Critical / Serious / Moderate / Minor), and remediation guidance
- Compliance percentage score
- Exportable PDF/Excel report

**Compliance frameworks covered:** WCAG 2.1 AA, Section 508

---

### 7.4 Responsive Design Testing

**Route:** `/nradiverse/responsive`

Validates that a web application renders correctly across a defined set of device sizes and orientations.

**Device profiles tested:**
- Mobile: 375×667 (iPhone SE), 390×844 (iPhone 14), 360×800 (Android)
- Tablet: 768×1024 (iPad), 820×1180 (iPad Air)
- Desktop: 1280×720 (HD), 1920×1080 (Full HD), 2560×1440 (QHD)

**What it checks:**
- Layout breaks (overflow, clipped content, overlapping elements)
- Navigation usability on each device
- Text readability (font sizes, line lengths)
- Touch target sizes on mobile
- Image scaling and aspect ratio preservation

**Output:** Grid of screenshots per device with annotated issues and a responsive score per breakpoint

---

### 7.5 SSRS to PowerBI Migration Validator

**Route:** `/nradiverse/ssrs-powerbi`

AI-powered validation for SSRS report to PowerBI migration projects. Ensures that migrated reports produce identical outputs to the originals.

**How it works:**
1. Upload or link the SSRS report output (Excel or PDF)
2. Upload or link the PowerBI report output for the same data
3. The module compares both reports cell-by-cell
4. AI analysis identifies discrepancies, formatting differences, and data mismatches

**What it validates:**
- Numeric values and calculated fields
- Data grouping and aggregation logic
- Chart data points and series
- Formatting (number formats, date formats, currency)
- Page layout and section structure

**Validation History:**
All previous validation runs are saved with timestamps, report names, and comparison results. Users can review past validations and track improvement across migration iterations.

**Output:** Side-by-side comparison viewer with highlighted discrepancies, discrepancy count by category, and exportable validation report

---

### 7.6 API Testing Module

**Route:** `/nradiverse/api-testing`

AI-powered API test case generation integrated with Postman and ReadyAPI.

#### Input Methods

**1. Single Endpoint Testing**
- Manually configure: HTTP method, URL, headers, request body, authentication
- Click **Generate Tests** to produce a full test suite for that endpoint

**2. Swagger / OpenAPI Integration**
- Import from URL (SwaggerHub, any OpenAPI spec URL)
- Upload `.json` or `.yaml` spec file directly
- The module parses all endpoints automatically

#### Endpoint Tree View
When a spec is imported, all endpoints are displayed in a collapsible tree grouped by tags. Users can:
- Expand / collapse tag groups
- Select individual endpoints or bulk-select by tag
- View request/response schemas inline

#### Test Types Generated

For each endpoint, the following test types are generated:

| Type | Description |
|---|---|
| Functional | Valid request with expected 2xx response and schema validation |
| Negative | Invalid inputs, missing required fields, wrong types |
| Boundary | Min/max values for numeric fields, string length limits |
| Security | Auth bypass attempts, injection payloads, IDOR checks |
| Performance | Response time assertions under load conditions |

#### Executable Script Output

Each test case includes ready-to-run scripts for:
- **Postman** (Pre-request Script + Test script in JavaScript)
- **ReadyAPI** (Groovy-based test script)
- **Playwright** (TypeScript API test using `request` context)

#### Test Results Dashboard
After batch execution:
- Summary metrics: total, passed, failed, average response time
- Per-endpoint pass/fail breakdown
- Detailed failure messages with actual vs expected values

#### HTML Report Export
Generates a styled, standalone HTML report containing:
- Test execution summary
- Environment details
- Full test results with request/response bodies

#### Security
- SSRF protection: all URLs are validated against an allowlist before requests are made
- Zod schema validation on all inputs
- No credentials are stored or logged

---

### 7.7 Selenium to Playwright Migration

**Route:** `/nradiverse/migration`

Automatically converts Selenium C# BDD tests (SpecFlow) to Playwright TypeScript with Cucumber.js.

**What it converts:**
- SpecFlow feature files → Cucumber.js `.feature` files
- C# step definition classes → TypeScript step definition files
- Page Object classes → TypeScript Page Object Models
- `[BeforeScenario]` / `[AfterScenario]` hooks → `Before()` / `After()` Cucumber hooks
- Selenium locator strategies → Playwright locators (CSS, role-based, text-based)

**Input:** Paste C# Selenium code or upload `.cs` files

**Output:**
- TypeScript step definitions with full type safety
- Playwright Page Object files
- Cucumber.js configuration (`cucumber.json`)
- `package.json` with required dependencies

**Locator mapping:**
| Selenium | Playwright |
|---|---|
| `By.Id("x")` | `page.locator('#x')` |
| `By.CssSelector(".x")` | `page.locator('.x')` |
| `By.XPath("//x")` | `page.locator('xpath=//x')` |
| `By.LinkText("x")` | `page.getByRole('link', { name: 'x' })` |

---

### 7.8 ICU Medical Device Stream Validator

**Route:** `/nradiverse/icu-streaming`

Validates the quality and fidelity of real-time ICU medical device data as it flows through a cloud data pipeline. Purpose-built for healthcare data platform testing.

#### The Problem It Solves

Medical device data streams continuously from ICU equipment (patient monitors, ventilators, infusion pumps, ECG monitors) to cloud platforms. Two critical questions must be answered at every cycle:
1. **Is the data correct at the source?** — Before it gets pushed, is every field present, in range, and properly formatted?
2. **Did it arrive correctly in the cloud?** — After ingestion, is the cloud record identical to what left the device?

#### Data Source Configuration

Before running validation, configure two connections:

**Source — Edge / Device Layer:**
| Field | Description |
|---|---|
| Protocol | MQTT, WebSocket, REST API, HL7 MLLP, or OPC-UA |
| Host / IP | Edge gateway hostname or IP address |
| Port | Connection port (e.g., 1883 for MQTT) |
| Topic / Path | MQTT topic (`icu/devices/+/vitals`) or REST endpoint path |
| Authentication | API Key, Client Certificate, or None |

**Destination — Cloud Store:**
| Field | Description |
|---|---|
| Cloud Provider | Microsoft Azure, Amazon AWS, or Google Cloud |
| Service Type | Azure FHIR R4 Service, Azure Data Lake Gen2, Azure Cosmos DB, Azure SQL Database |
| Endpoint URL | Cloud ingestion endpoint URL |
| Authentication | Managed Identity, Service Principal, or API Key |

Use the **Test Connection** buttons on each panel to verify connectivity before running validation.

#### Device Selection

Choose which ICU devices to include in the validation run. Supported device types:

| Device | Model | Parameters Validated |
|---|---|---|
| Patient Monitor | GE CARESCAPE B650 | Heart Rate, SpO2, Systolic BP, Diastolic BP, Temperature, Respiratory Rate |
| Ventilator | GE Carestation 650 | Tidal Volume, PEEP, FiO2, Vent Rate, Peak Inspiratory Pressure |
| Infusion Pump | GE Alaris 8015 | Flow Rate, Volume Remaining, Volume to Infuse, Line Pressure |
| ECG Monitor | GE MAC 5500 HD | Heart Rate, PR Interval, QRS Duration, QT Interval |

#### AI Agent Pipeline (5 agents)

Click **Run Agent Pipeline** to start the automated 5-stage validation:

| Stage | Agent | What it does |
|---|---|---|
| 1 | Data Collector | Connects to the configured source, captures a snapshot of all selected device readings |
| 2 | Pre-Cloud Validator | Validates data quality at source — clinical ranges, field completeness, format compliance |
| 3 | Cloud Transmitter | Pushes data through the configured cloud endpoint with TLS 1.3 encryption |
| 4 | Post-Cloud Verifier | Queries the cloud store and compares every field against the source snapshot |
| 5 | Report Agent | Aggregates all findings, computes scores, generates the reconciliation report |

The agent activity feed streams real-time log messages from each agent as it works, making the pipeline fully transparent.

#### Stage 1 — Pre-Cloud Validation (Data Quality Gate)

For each device and each parameter, the Pre-Cloud Validator checks:
- **Clinical Range Compliance**: Is the value within the safe clinical range for that parameter?
  - e.g., Heart Rate must be between 40–150 bpm; SpO2 must be ≥ 88%
- **Field Completeness**: Are all expected parameters present? No nulls or missing fields?
- **Data Format**: Is the payload correctly structured for the configured target (HL7 v2.x, FHIR R4)?

A device passes the pre-cloud gate only when all its parameters satisfy all three checks.

#### Stage 2 — Post-Cloud Validation (Fidelity Verification)

After ingestion, the Post-Cloud Verifier performs a field-by-field reconciliation:
- **Value Preservation**: Is each cloud field value identical to the source value?
- **Value Drift Detection**: Flags any deviation between source and cloud values, with percentage shown
- **Missing Field Detection**: Identifies parameters present at source but absent in the cloud record
- **FHIR R4 Mapping**: Verifies that device parameters are correctly mapped to FHIR R4 Observation resources (with the correct `fhirPath` for each field)
- **Record Count Reconciliation**: Confirms the number of records in the cloud matches what was sent
- **Latency Measurement**: Measures end-to-end time from device capture to cloud availability

#### Results View

Each device shows a card with:
- Pre-Cloud status badge (PASS / FAIL)
- Post-Cloud status badge (PASS / WARN / FAIL)
- FHIR Map status badge
- Expandable field-level table: Parameter | Source Value | Cloud Value | Pre-Cloud Check | Post-Cloud Check | FHIR Path

#### End-to-End Data Quality Report

After the pipeline completes, a summary report shows 6 NFR scores:

| NFR | What it measures |
|---|---|
| Data Completeness | All fields present in cloud records |
| Value Integrity | No value drift between source and cloud |
| Clinical Ranges | All device readings within clinical safe bounds |
| FHIR Mapping | FHIR R4 transformation completeness across all parameters |
| Cloud Latency | Average end-to-end latency (target: < 200ms) |
| Record Count | Source-to-cloud record count reconciliation |

---

## 8. Synthetic Data Generator

**Route:** `/synthetic-data`

Generates production-grade test datasets for any industry domain using AI-driven value generation.

### How it works

1. **Select Domain** — Choose from healthcare, insurance, financial services, retail, manufacturing, and more
2. **Configure Dataset** — Specify record count, required fields, and data relationships
3. **Set Rules** — Define value ranges, distributions, referential integrity constraints
4. **Generate** — AI generates realistic values respecting domain-specific rules and patterns

### Key Features

**AI-Intelligent Value Generation:**
- Values are contextually realistic (e.g., medical diagnoses match patient age/gender)
- Referential integrity preserved across related tables
- Statistically distributed values (not random noise)

**PII Masking:**
- Automatically masks sensitive fields (SSN, DOB, credit card, email, phone)
- Configurable masking strategy: redact, pseudonymise, or tokenise

**Export Formats:**
- CSV for spreadsheet tools
- JSON for API testing and development seeding
- SQL INSERT statements for direct database population
- Excel for business stakeholder review

### Healthcare-Specific Capabilities
- Patient demographics with realistic distributions
- ICD-10 diagnosis codes matched to patient profiles
- Medication records with clinically consistent dosages
- Lab results within realistic reference ranges

---

## 9. Agent Configurations

**Route:** `/agent-configurations`

Agent Configurations manages the integration between the platform and external test management tools. After test cases are generated (via Sprint Agent V2 or Autonomous Testing), they can be pushed to:

### Azure DevOps
- Creates **Test Case** work items under the selected project
- Maps test case fields to ADO fields: Title, Description, Steps, Expected Result
- Assigns work items to the selected iteration/sprint
- Tags work items with priority and test type

### Jira
- Creates **Task** or **Test** issue types in the selected Jira project
- Maps test case fields to Jira fields using field mappings
- Attaches Playwright scripts as issue attachments
- Links issues to the originating user story

### TestRail
- Creates test cases in the selected TestRail project and suite
- Maps priority levels to TestRail priority values
- Groups test cases by test type in sections
- Supports run creation for immediate execution planning

### Configuration per Platform

Each platform integration requires:
- Connection credentials (stored as environment secrets, never in the codebase)
- Field mapping configuration
- Default project / suite assignment
- Push confirmation with preview before sending

---

## 10. Architecture Diagram

**Route:** `/architecture`

An interactive visualisation of the platform's 4-layer architecture, rendered in a neon-accented dark theme.

### The 4 Layers

**Layer 1 — User Interaction**
- Dashboard, Sprint Agent V2, Execution Mode, Quality Engine, Synthetic Data, Agent Configurations
- Direct user touchpoints

**Layer 2 — Autonomous Agents**
- Orchestrator Agent, Navigator Agent, Executor Agent, Validator Agent, Reporter Agent
- AI pipeline coordination

**Layer 3 — Code Generation**
- Playwright test scripts, BDD feature files, Postman/ReadyAPI collections, API test scripts

**Layer 4 — Data & Integration**
- PostgreSQL database, Azure DevOps, Jira, TestRail, Claude AI API, Playwright Chromium

### Interaction

- Click any layer to expand it and see component details
- Hover over connections to see data flow descriptions
- Zoom and pan controls for large screens

---

## 11. Tri-Brand Mode

The platform supports three brand profiles switchable at runtime. The brand toggle is at the bottom of the left sidebar.

| Brand | Platform Name | Accent Color | Logo |
|---|---|---|---|
| Gold (default) | NAT 2.0 | Cyan `#06b6d4` | NAT 2.0 wordmark |
| Envestnet | Envestnet QE AI | Blue `#0074bd` | Envestnet logo |
| P&G | P&G QE AI | P&G Blue `#003DA5` | P&G circular logo |

**What changes with each brand:**
- Platform name in the sidebar header
- Logo displayed in the sidebar
- Dashboard hero banner background colour
- Active navigation item highlight colour
- All UI accent colours throughout the platform

**Persistence:** The selected brand is saved to `localStorage` and restored on next visit.

**Known limitation:** Backend-generated export files (HTML reports, Excel sheets, BDD ZIPs) still reference "NAT 2.0" in their headers. Passing brand context through every export API call is a planned improvement.

---

## 12. Integrations

### 12.1 Azure DevOps Integration

**Environment variables required:**
| Variable | Description |
|---|---|
| `ADO_ORGANIZATION` | ADO organisation URL (e.g., `https://dev.azure.com/myorg` or just `myorg`) |
| `ADO_PAT` | Personal Access Token with Work Items read/write permissions |
| `ADO_PROJECT` | Default project name (optional — can be selected in UI) |

**API endpoints exposed:**
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/ado/env/projects` | List all accessible ADO projects |
| GET | `/api/ado/env/projects/:project/iterations` | List sprints for a project |
| GET | `/api/ado/env/projects/:project/user-stories` | List user stories (filter by iteration) |
| POST | `/api/ado/env/push-test-cases` | Create Test Case work items |

**Workflow:**
1. Sprint Agent V2 → generate test cases from an ADO user story
2. Review generated test cases
3. Click **Push to Azure DevOps** in Agent Configurations
4. Test Cases appear as work items in your ADO project under the selected iteration

---

### 12.2 Jira Integration

**Environment variables required:**
| Variable | Description |
|---|---|
| `JIRA_BASE_URL` | Jira instance URL (e.g., `https://yourorg.atlassian.net`) |
| `JIRA_EMAIL` | Email associated with the Jira account |
| `JIRA_API_TOKEN` | Jira API token for authentication |

**API endpoints exposed:**
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/jira/projects` | List all accessible Jira projects |
| GET | `/api/jira/projects/:key/boards` | List boards for a project |
| GET | `/api/jira/boards/:boardId/sprints` | List sprints for a board |
| GET | `/api/jira/sprints/:sprintId/user-stories` | List user stories in a sprint |
| POST | `/api/jira/save-test-cases` | Save generated test cases to database |
| GET | `/api/jira/test-cases/:projectKey/:storyId` | Retrieve previously generated test cases |
| POST | `/api/jira/push-test-cases` | Create Jira issues from test cases |

**Database storage:**
Generated test cases are stored in the `jira_test_cases` table keyed by project key, board ID, sprint ID, and user story ID. Revisiting a story instantly loads previously generated test cases without re-running the AI pipeline.

**Acceptance criteria extraction:**
The platform automatically extracts acceptance criteria from Jira story descriptions using these patterns:
- `*Acceptance Criteria:*`
- `### Acceptance Criteria`
- `**AC:**`
- Numbered/bulleted lists under any AC heading

---

## 13. Test Case Format Standard

All test cases generated by the platform follow a consistent 6-step structure:

### Test Case Fields

| Field | Description | Example |
|---|---|---|
| Test Case ID | Unique identifier | `TC_FUNC_001` |
| Title | Descriptive test name | "Verify user login with valid credentials" |
| Description | Detailed explanation | "Tests that a registered user can log in..." |
| Objective | Specific validation goal | "Confirm JWT token is issued on successful login" |
| Preconditions | Array of required setup conditions | `["User account exists", "Password not expired"]` |
| Test Steps | Array of 6 steps (see below) | — |
| Expected Results | Overall expected outcomes | "User is redirected to dashboard" |
| Postconditions | System state after completion | "Session token stored in localStorage" |
| Test Data | Required input values | `{ username: "test@example.com", password: "..." }` |
| Test Type | Category | `functional` / `negative` / `edge` / `security` / `accessibility` |
| Priority | Severity level | `P0` (critical) / `P1` (high) / `P2` (medium) / `P3` (low) |

### The 6-Step Structure

| Step | Name | Purpose |
|---|---|---|
| Step 1 | Navigation / Setup | Navigate to the target page or module |
| Step 2 | Precondition Verification | Verify initial state and required data exists |
| Step 3 | Primary Action | Execute the main action being tested |
| Step 4 | Intermediate Validation | Verify immediate response or feedback |
| Step 5 | Workflow Completion | Complete any secondary or follow-on actions |
| Step 6 | Final State Verification | Verify end state and confirm data persistence |

Each step contains:
- `action`: What the tester/automation does
- `expected_behavior`: What the system should do in response

---

## 14. Export Formats

The platform produces the following output formats:

| Format | Module | Description |
|---|---|---|
| Excel (.xlsx) | Sprint Agent V2, Autonomous Testing | Tabular test case export with all fields across multiple sheets |
| Playwright .spec.ts | Sprint Agent V2, Jira | Ready-to-run TypeScript test file for Playwright test runner |
| BDD ZIP | Sprint Agent V2, Execution Mode | Cucumber.js feature files + step definitions + support files + configuration |
| Formatted Text | Sprint Agent V2 | Human-readable markdown-formatted test cases |
| HTML Report | API Testing | Styled standalone HTML with full test execution results |
| BDD Execution Report | Execution Mode | Cucumber JSON/HTML report from live test execution |
| Validation Report | SSRS/PowerBI, ICU Validator | PDF/Excel reconciliation report |

---

*Documentation version: March 2026 | Platform: NAT 2.0 / Envestnet QE AI / P&G QE AI*
