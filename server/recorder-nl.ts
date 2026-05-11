/**
 * recorder-nl.ts — Natural-language step converter (no runtime dependencies).
 *
 * Extracted from recorder-ws.ts so it can be imported by tests without pulling
 * in Express, the database, or Playwright.
 */

export interface RecordingEvent {
  sequence: number;
  timestamp: number;
  type: string;
  url: string;
  pageTitle: string;
  sessionId: string;
  [key: string]: unknown;
}

/**
 * Convert a raw recording event into a human-readable NL step string.
 *
 * D6 fixes applied here:
 *   1. Whitespace normalization — labels are trimmed and internal double-spaces collapsed.
 *   2. ARIA role awareness — `element.ariaRole` and `element.isButton` take precedence
 *      over the raw HTML `element.tag` when determining semantic intent.
 */
export function toNaturalLanguage(event: RecordingEvent, stepNum: number): string | null {
  const el = event.element as any;
  // D6: normalize whitespace in labels — belt-and-suspenders server-side normalization
  const rawDesc = el?.description || el?.label || el?.placeholder || 'element';
  const desc    = rawDesc.trim().replace(/\s+/g, ' ');
  const rawLabel = el?.label || desc;
  const label   = rawLabel.trim().replace(/\s+/g, ' ');

  switch (event.type) {
    case 'click': {
      const tag      = (el?.tag      || '').toLowerCase();
      const ariaRole = (el?.ariaRole || '').toLowerCase();
      // D6: ARIA role takes precedence; fall back to HTML tag
      if (tag === 'a' || ariaRole === 'link')
        return `Step ${stepNum}: Click link "${desc}"`;
      if (el?.isButton || tag === 'button' || ariaRole === 'button' ||
          (tag === 'input' && (el?.inputType === 'submit' || el?.inputType === 'button')))
        return `Step ${stepNum}: Click button "${desc}"`;
      return `Step ${stepNum}: Click on "${desc}"`;
    }
    case 'input': {
      const val = (event as any).value || '';
      const locData = el?.locatorData as any;
      const primary = locData?.primary;
      const elemId   = el?.elementId || '';
      const elemName = el?.elementName || '';
      let locatorHint = '';
      if (primary?.strategy === 'id' && elemId)          locatorHint = `[id=${elemId}]`;
      else if (primary?.strategy === 'name' && elemName)  locatorHint = `[name=${elemName}]`;
      else if (primary?.strategy === 'data-testid')       locatorHint = `[testid=${locData?.effectiveEl?.testId || ''}]`;
      else if (elemId)                                     locatorHint = `[id=${elemId}]`;
      else if (elemName)                                   locatorHint = `[name=${elemName}]`;
      return `Step ${stepNum}: Enter "${val}" in the "${label}${locatorHint}" field`;
    }
    case 'check': {
      const rc = (event as any).rowContext;
      return rc
        ? `Step ${stepNum}: Check the "${label}" checkbox in row "${rc}"`
        : `Step ${stepNum}: Check the "${label}" checkbox`;
    }
    case 'uncheck': {
      const rc = (event as any).rowContext;
      return rc
        ? `Step ${stepNum}: Uncheck the "${label}" checkbox in row "${rc}"`
        : `Step ${stepNum}: Uncheck the "${label}" checkbox`;
    }
    case 'select':
      return `Step ${stepNum}: Select "${(event as any).displayText || (event as any).value}" from the "${label}" dropdown`;
    case 'kendo_select':
      return `Step ${stepNum}: Select "${(event as any).selectedText}" from the "${label}" Kendo ${(event as any).widgetType || 'dropdown'}`;
    case 'kendo_date':
      return `Step ${stepNum}: Select date "${(event as any).formattedValue || (event as any).value}" in the "${label}" date picker`;
    case 'kendo_multiselect':
      return `Step ${stepNum}: Select "${(event as any).selectedText}" in the "${label}" Kendo multi-select`;
    case 'kendo_tab':
      return `Step ${stepNum}: Click tab "${(event as any).tabText}"`;
    case 'kendo_tree_toggle':
      return `Step ${stepNum}: Toggle tree node "${(event as any).nodeText}"`;
    case 'kendo_tree_select':
      return `Step ${stepNum}: Select tree node "${(event as any).nodeText}"`;
    case 'kendo_grid_sort':
      return `Step ${stepNum}: Sort grid column "${(event as any).column}" ${(event as any).direction}`;
    case 'kendo_grid_page':
      return `Step ${stepNum}: Go to grid page ${(event as any).pageNumber}`;
    case 'kendo_grid_edit':
      return `Step ${stepNum}: Edit grid "${(event as any).gridId}" row ${((event as any).rowIndex || 0) + 1} column "${(event as any).columnField}" with value "${(event as any).value}"`;
    case 'navigation': {
      try {
        const path = new URL((event as any).toUrl || event.url).pathname;
        return `Step ${stepNum}: Navigate to ${path}`;
      } catch {
        return `Step ${stepNum}: Navigate to ${(event as any).toUrl || event.url}`;
      }
    }
    case 'page_load': {
      const pageUrl = event.url || '';
      if (!pageUrl || pageUrl.startsWith('about:') || pageUrl.startsWith('data:') || pageUrl === 'srcdoc') return null;
      const sessionStartUrl = (event as any).sessionStartUrl as string | undefined;
      if (sessionStartUrl) {
        try {
          const startOrigin = new URL(sessionStartUrl).hostname.split('.').slice(-2).join('.');
          const loadOrigin  = new URL(pageUrl).hostname.split('.').slice(-2).join('.');
          if (loadOrigin !== startOrigin) return null;
        } catch {}
      }
      return `Step ${stepNum}: Page loaded — "${event.pageTitle || pageUrl}"`;
    }
    case 'api_call': {
      const method = (event as any).method || 'GET';
      const status = (event as any).responseStatus || '';
      let apiPath = '';
      try { apiPath = new URL((event as any).url || '').pathname; } catch { apiPath = (event as any).url || ''; }
      return `Step ${stepNum}: [API] ${method} ${apiPath} → ${status}`;
    }
    case 'screenshot':
      return null;
    default:
      return null;
  }
}
