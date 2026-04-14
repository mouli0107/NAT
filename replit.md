# Agent-Based Visual Regression Testing Platform

## Overview

This platform is an AI agent-based solution for visual regression and intelligent functional testing, primarily for insurance products. It simulates AI agents to analyze Figma designs against live websites and automates real browser testing to generate and execute test cases. The platform provides an interactive dashboard to visualize the testing process, aiming to automate visual and functional testing workflows, enhance product quality, and accelerate time-to-market for insurance applications using AI-driven test automation.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend

The frontend uses React, TypeScript, Vite, Shadcn/UI, and Tailwind CSS for a component-based, dark-themed UI. State management involves React hooks for local UI, TanStack Query for server state, and Server-Sent Events (SSE) for real-time updates. Wouter handles client-side routing.

### Backend

The backend is built with Express.js, providing API routes for session management, demo simulation, and intelligent testing. It leverages Playwright for real browser automation, including website crawling, workflow discovery, and automated test case generation. Drizzle ORM interacts with a Neon serverless PostgreSQL database. Zod schemas ensure runtime validation and type safety.

### Key Features and Modules

- **Dashboard**: Central entry point with analytics, quick actions, and project listings.
- **Autonomous Testing**: AI-powered test generation from website analysis, including target configuration, authentication management, and context input.
- **Sprint Agent V2**: A multi-agent AI pipeline for intelligent test case generation from user stories, supporting functional, negative, edge case, security, and accessibility tests. Includes real-time streaming via SSE and import functionality for user stories from Azure DevOps and Jira.
- **AI Quality Engine**: Comprehensive testing solution with Visual Regression, Pixel Comparison, WCAG 2.1 AA Accessibility Compliance (with Claude Vision AI Analysis), Responsive Design Testing across various devices and applications, SSRS to PowerBI Migration Validator (with validation history), and API Testing Module.
- **API Testing Module**: AI-powered comprehensive API test case generation with Postman & ReadyAPI integration. Features include:
  - **Single Endpoint Testing**: Manual endpoint configuration with AI-powered test generation
  - **Swagger/OpenAPI Integration**: Parse specs from URL (SwaggerHub) or file upload (.json/.yaml)
  - **Batch Testing**: Execute tests against multiple endpoints with configurable options
  - **Endpoint Tree View**: Endpoints grouped by tags with collapsible sections and bulk selection
  - **Test Results Dashboard**: Summary metrics (total/passed/failed/avg response time) with detailed results
  - **HTML Report Export**: Styled reports with test execution details
  - **Security**: SSRF protection with URL validation, Zod schema validation for all inputs
  - Generates functional, negative, boundary, security, and performance tests with executable scripts for Postman, ReadyAPI, and Playwright
- **Execution Mode**: Playwright-based test execution with AI agent orchestration (Orchestrator, Navigator, Executor, Validator, Reporter), capturing screenshots and generating BDD artifacts. Supports three test sources: Sprint Agent (project/sprint), Jira User Stories (project/story from `jira_test_cases` DB table), and Autonomous Testing (functional test runs).
- **Synthetic Data Generator**: Creates production-grade test datasets for various industry domains using AI for intelligent value generation, PII masking, and multi-format export.
- **Agent Configurations**: Module to integrate and push generated test cases to external platforms like Azure DevOps, Jira, and TestRail.
- **Architecture Diagram**: Interactive 4-layer visualization of the platform showing User Interaction, Autonomous Agents, Code Generation, and Data & Integration layers with neon-accented dark theme styling.
- **Global Navigation**: Features like breadcrumbs, global search, and notifications.
- **Tri-Brand Mode**: Cycleable branding between three profiles via `BrandingContext` — "Gold" (NAT 2.0, cyan accent), "Envestnet" (Envestnet QE AI, #0074bd blue, logo at `attached_assets/image_1772543292062.png`), and "P&G" (P&G QE AI, #003DA5 P&G blue, SVG logo at `client/src/assets/pg-logo.svg`). Sidebar toggle cycles through brands and persists to localStorage. Active nav color, dashboard banner color, and all UI text dynamically adapt per brand. Backend export artifacts (HTML reports, Excel, BDD ZIPs) still reference "NAT 2.0" as a known limitation.

### System Design Choices

The platform supports both simulated demos and real Playwright automation, focusing on real-time feedback, data persistence, and extensibility. It includes project management, Excel and Azure DevOps export, and Claude API integration across agents for enhanced analysis and generation.

### Test Case Format (Comprehensive 6-Step Structure)

All generated test cases follow a comprehensive format with exactly 6 detailed steps:

1. **Step 1**: Navigation/Setup - Navigate to the target page/module
2. **Step 2**: Precondition Verification - Verify initial state and required data
3. **Step 3**: Primary Action - Execute the main action being tested
4. **Step 4**: Intermediate Validation - Verify immediate response/feedback
5. **Step 5**: Workflow Completion - Complete any secondary actions
6. **Step 6**: Final State Verification - Verify end state and data persistence

Each test case includes:
- **Test Case ID**: Unique identifier (e.g., TC_FUNC_001)
- **Title**: Descriptive test name
- **Description**: Detailed explanation of what is being tested
- **Objective**: Specific validation goal
- **Preconditions**: Array of conditions required before testing
- **Test Steps**: Array of 6 steps, each with action and expected_behavior
- **Expected Results**: Overall expected outcomes
- **Postconditions**: System state after test completion
- **Test Data**: Required input data for the test
- **Test Type**: functional, negative, edge, security, or accessibility
- **Priority**: P0 (critical), P1 (high), P2 (medium), P3 (low)

## External Dependencies

**UI Components & Styling**:
- Shadcn/UI (with Radix UI primitives)
- Tailwind CSS
- Framer Motion
- Lucide React

**Data & Forms**:
- TanStack Query
- React Hook Form
- Zod
- Hookform Resolvers

**Backend**:
- Express.js
- Drizzle ORM
- Neon Serverless (PostgreSQL)
- Playwright (Chromium)
- `xlsx`
- Claude API

**Build Tools**:
- Vite
- esbuild
- TypeScript
- Wouter

**Integrations**:
- Azure DevOps (full API integration)
- Jira (full API integration)
- TestRail (implied by "Agent Configurations" module)

## Azure DevOps Integration

The platform has full ADO integration for Sprint Agent V2's "Generate from User Stories" feature:

### Environment Secrets
- `ADO_ORGANIZATION`: Azure DevOps organization URL (e.g., https://dev.azure.com/myorg or just "myorg")
- `ADO_PAT`: Personal Access Token with Work Items read/write permissions
- `ADO_PROJECT`: Default project name (optional)

### API Endpoints
- `GET /api/ado/env/projects` - List all accessible ADO projects
- `GET /api/ado/env/projects/:projectName/iterations` - List sprints/iterations for a project
- `GET /api/ado/env/projects/:projectName/user-stories` - List user stories (optionally filtered by iteration)
- `POST /api/ado/env/push-test-cases` - Create Test Case work items in ADO

### Workflow
1. Select an ADO project from the dropdown
2. Select a sprint/iteration
3. Select a user story from the list
4. Generate test cases using the AI pipeline
5. Push generated test cases to ADO as Test Case work items

## Jira Integration

The platform has full Jira integration for Sprint Agent V2's "Generate from User Stories" feature:

### Environment Secrets
- `JIRA_BASE_URL`: Jira instance URL (e.g., https://yourorg.atlassian.net)
- `JIRA_EMAIL`: Email associated with the Jira account
- `JIRA_API_TOKEN`: Jira API token for authentication

### API Endpoints
- `GET /api/jira/projects` - List all accessible Jira projects
- `GET /api/jira/projects/:projectKey/boards` - List boards for a project
- `GET /api/jira/boards/:boardId/sprints` - List sprints for a board
- `GET /api/jira/sprints/:sprintId/user-stories` - List user stories in a sprint
- `GET /api/jira/projects/:projectKey/user-stories` - List all user stories for a project (via agile board API)
- `POST /api/jira/save-test-cases` - Save generated test cases to DB per project/story
- `GET /api/jira/test-cases/:projectKey/:storyId` - Retrieve previously generated test cases
- `POST /api/jira/push-test-cases` - Create issues in Jira from generated test cases

### Database Storage
- `jira_test_cases` table stores generated test cases per Jira project key, board, sprint, and user story
- When selecting a user story, previously generated test cases are automatically loaded
- Test cases include Playwright scripts when generated
- Acceptance criteria are auto-extracted from description text (patterns: `*Acceptance Criteria:*`, `### Acceptance Criteria`, etc.)

### Workflow
1. Switch to Jira mode in Sprint Agent V2
2. Search and select a Jira project from the searchable dropdown
3. Optionally select a board and sprint
4. Select a user story from the list (existing test cases auto-load if previously generated)
5. Generate test cases using the AI pipeline (saved to DB automatically)
6. Generate Playwright scripts inline for each test case
7. Export as Excel, Formatted Text, Playwright .spec.ts, or BDD Assets ZIP
8. Push generated test cases to Jira as Task issues