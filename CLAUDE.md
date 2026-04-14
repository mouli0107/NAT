# NAT 2.0 — Architecture Reference

## Kendo UI Rules (APOLF/Rediker application)
Never use Playwright locators or smartFill() on Kendo widgets.
Always use helpers/kendo.ts functions.

| Control | Function | Example |
|---|---|---|
| DropDownList | selectKendoDropdown(page, inputId, text) | selectKendoDropdown(page, 'ddlSubmittedDate', 'Birth Date') |
| DateTimePicker | selectKendoDate(page, inputId, dateStr) | selectKendoDate(page, 'formStartDate', '04-08-2026 12:00 AM') |
| TreeView checkbox | checkKendoTreeNode(page, treeId, value) | checkKendoTreeNode(page, 'LoadSchoolProgramTreeView', '1') |
| Kendo Window alert | waitAndDismissAnyKendoAlert(page) | after every Save/Submit |

## 5-Layer Framework Structure
locators/     <- selectors only, one file per page, SHARED
pages/        <- methods only, imports locators, SHARED
actions/      <- business workflows, imports pages, SHARED
fixtures/     <- test data by TC ID, SHARED
tests/        <- one spec per TC, imports actions + fixtures only

## Adding a New Test Case
1. Record workflow in NAT 2.0
2. Click Generate Scripts
3. Enter: Module name, TC ID (auto-incremented), Test name
4. Click Save to Project
5. New files created: tests/{Module}/TC{id}_{Name}.spec.ts
6. Appended to: actions/business/{Module}.actions.ts
7. Appended to: fixtures/test-data.ts
8. Existing locators and pages: NOT modified

## Key Bugs Fixed (do not revert)
1. PW_RECORDER_INIT: use \\" not \' inside backtick template literals
2. _detectKendo(): removed .k-widget + querySelector block,
   walk-up max 5 levels not 10
3. kendoSelect(): use aria-owns to find listbox in body
4. DateTimePicker: use picker.enable(true) + picker.value() via jQuery
5. Duplicate events: handledKendoFields Set prevents double generation

## Running Tests
npx playwright test                          # all tests
npx playwright test tests/FormSettings/      # one module
npx playwright test tests/FormSettings/TC001 # one test case
npx playwright test --headed                 # see the browser
