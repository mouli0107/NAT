/**
 * DevX QE — recorder-ws.ts
 * WebSocket server that bridges:
 *   Chrome Extension (sender) ←→ NAT 2.0 UI (listener)
 *
 * Session flow:
 *   1. NAT 2.0 UI calls POST /api/recorder/sessions → gets sessionId (e.g. "ABC-4821")
 *   2. NAT 2.0 UI connects via SSE to /api/recorder/sessions/:id/events
 *   3. Chrome Extension connects to WS /ws/recorder
 *   4. Extension sends { type: "join_session", sessionId: "ABC-4821" }
 *   5. Server validates session, links extension WS to session
 *   6. Extension sends recording events → server forwards to NAT 2.0 via SSE
 */

import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import type { Express, Request, Response } from 'express';
import { randomBytes } from 'crypto';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { fileURLToPath } from 'url';
import * as XLSX from 'xlsx';
import Anthropic from '@anthropic-ai/sdk';
import type { Browser, BrowserContext, Page as PwPage } from 'playwright';
import { UNIVERSAL_HELPERS_CONTENT } from './universal-helpers-content';
import { KENDO_HELPERS_CONTENT } from './kendo-helpers-content';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Types ────────────────────────────────────────────────────────────────────

interface RecordingSession {
  id: string;                          // e.g. "ABC-4821"
  createdAt: number;
  status: 'waiting' | 'recording' | 'stopped' | 'completed';
  extensionWs: WebSocket | null;       // connected extension client
  uiClients: Set<Response>;            // SSE clients (NAT 2.0 browser tabs)
  events: RecordingEvent[];            // buffered events
  metadata: {
    projectName: string;       // REQUIRED — from New Recording dialog
    moduleName: string;        // REQUIRED — e.g. "Form Settings"
    tcId: string;              // AUTO-ASSIGNED — e.g. "TC004"
    testCaseName: string;      // REQUIRED — e.g. "Create form with fee"
    applicationUrl: string;    // from project settings
    adoStoryId?: string;       // optional — ADO story reference
    businessContext?: string;
    frameworkConfigId?: string;
  };
}

interface RecordingEvent {
  sequence: number;
  timestamp: number;
  type: string;
  url: string;
  pageTitle: string;
  sessionId: string;
  [key: string]: unknown;
}

// ─── Session Store ────────────────────────────────────────────────────────────

const sessions = new Map<string, RecordingSession>();
const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

// Generate a human-friendly session code: ABC-4821
function generateSessionCode(): string {
  const letters = randomBytes(3).toString('hex').toUpperCase().slice(0, 3);
  const digits = String(Math.floor(Math.random() * 9000) + 1000);
  return `${letters}-${digits}`;
}

// Cleanup expired sessions every 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions.entries()) {
    if (now - session.createdAt > SESSION_TTL_MS) {
      sessions.delete(id);
    }
  }
}, 30 * 60 * 1000);

// ─── Natural Language Converter ──────────────────────────────────────────────

function toNaturalLanguage(event: RecordingEvent, stepNum: number): string | null {
  const el = event.element as any;
  const desc = el?.description || el?.label || el?.placeholder || 'element';
  const label = el?.label || desc;

  switch (event.type) {
    case 'click': {
      const tag = (el?.tag || '').toLowerCase();
      if (tag === 'a') return `Step ${stepNum}: Click link "${desc}"`;
      if (tag === 'button' || (tag === 'input' && (el?.inputType === 'submit' || el?.inputType === 'button')))
        return `Step ${stepNum}: Click button "${desc}"`;
      return `Step ${stepNum}: Click on "${desc}"`;
    }
    case 'input': {
      const val = (event as any).value || '';
      // Encode the best locator key so the script generator can resolve exact element
      const locData = el?.locatorData as any;
      const primary = locData?.primary;
      const elemId   = el?.elementId || '';
      const elemName = el?.elementName || '';
      // Use the primary strategy's value as the locator hint (most precise available)
      let locatorHint = '';
      if (primary?.strategy === 'id' && elemId)          locatorHint = `[id=${elemId}]`;
      else if (primary?.strategy === 'name' && elemName)  locatorHint = `[name=${elemName}]`;
      else if (primary?.strategy === 'data-testid')       locatorHint = `[testid=${locData?.effectiveEl?.testId || ''}]`;
      else if (elemId)                                     locatorHint = `[id=${elemId}]`;
      else if (elemName)                                   locatorHint = `[name=${elemName}]`;
      return `Step ${stepNum}: Enter "${val}" in the "${label}${locatorHint}" field`;
    }
    case 'check':
    {
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
    // ── Kendo UI widget events ──────────────────────────────────────────────
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
      // Skip internal browser pages — they are not meaningful steps
      const pageUrl = event.url || '';
      if (!pageUrl || pageUrl.startsWith('about:') || pageUrl.startsWith('data:') || pageUrl === 'srcdoc') return null;
      // Skip third-party page_load events — these are background redirects
      // from tracking/analytics/chat tools (Intellimize, Qualified, etc.)
      // They are NOT user-initiated navigations and should never appear in NL steps
      const sessionStartUrl = (event as any).sessionStartUrl as string | undefined;
      if (sessionStartUrl) {
        try {
          const startOrigin = new URL(sessionStartUrl).hostname.split('.').slice(-2).join('.');
          const loadOrigin  = new URL(pageUrl).hostname.split('.').slice(-2).join('.');
          if (loadOrigin !== startOrigin) return null; // third-party — skip silently
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
      return null; // screenshots don't generate NL steps
    default:
      return null;
  }
}

// ─── SSE Helper ───────────────────────────────────────────────────────────────

function sendSSE(res: Response, event: string, data: unknown) {
  try {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  } catch {
    // Client disconnected
  }
}

function broadcastToUI(session: RecordingSession, event: string, data: unknown) {
  for (const client of session.uiClients) {
    sendSSE(client, event, data);
  }
}

// ─── Browser Proxy (strips X-Frame-Options so sites load in iframe) ──────────

async function proxyUrl(targetUrl: string, res: Response, depth = 0) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const upstream = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
      },
      redirect: 'follow'
    });
    clearTimeout(timeout);

    const contentType = upstream.headers.get('content-type') || 'text/html; charset=utf-8';

    // Only rewrite HTML — pass other assets through as-is
    if (!contentType.includes('text/html')) {
      res.setHeader('Content-Type', contentType);
      res.setHeader('Access-Control-Allow-Origin', '*');
      const buf = await upstream.arrayBuffer();
      return res.send(Buffer.from(buf));
    }

    let html = await upstream.text();

    // Inject <base> tag so relative URLs resolve to original domain
    const urlObj = new URL(targetUrl);
    const base = `${urlObj.protocol}//${urlObj.host}`;
    html = html.replace(/<head([^>]*)>/i, `<head$1><base href="${base}/">`);

    // Remove CSP meta tags that block framing
    html = html.replace(/<meta[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/gi, '');
    html = html.replace(/<meta[^>]*Content-Security-Policy[^>]*>/gi, '');

    // ── Inject recorder script — captures interactions and posts to parent frame ──
    const recorderScript = `<script>(function(){
  var _bc=null;try{_bc=new BroadcastChannel('devxqe-recorder');}catch(e){}
  function send(type,data){
    var msg=Object.assign({source:'devxqe-iframe',type:type,pageTitle:document.title,url:window.location.href},data);
    try{window.parent.postMessage(msg,'*');}catch(e){}
    try{if(_bc)_bc.postMessage(msg);}catch(e){}
  }
  // Page load
  send('page_load',{});
  // Track hovered elements to detect hover-before-click patterns (mega menus)
  var lastHoveredTrigger=null;
  document.addEventListener('mouseover',function(e){
    if(assertMode)return;
    var el=e.target;if(!el)return;
    // Detect dropdown/menu triggers (aria-haspopup, aria-expanded, role=menuitem)
    var isMenuTrigger=el.getAttribute('aria-haspopup')||el.getAttribute('aria-expanded')==='false'||el.getAttribute('role')==='menuitem'||el.getAttribute('role')==='button';
    if(isMenuTrigger){
      var hDesc=el.getAttribute('aria-label')||(el.textContent||'').trim().slice(0,60)||el.tagName.toLowerCase();
      lastHoveredTrigger={tag:el.tagName.toLowerCase(),description:hDesc,label:hDesc};
    }
  },true);

  document.addEventListener('click',function(e){
    if(assertMode){return;}
    var el=e.target;if(!el||el===document.body||el===document.documentElement)return;
    var desc=el.getAttribute('aria-label')||el.getAttribute('placeholder')||el.getAttribute('name')||(el.textContent||'').trim().slice(0,60)||el.tagName.toLowerCase();
    // Detect target="_blank" — find closest anchor
    var anchor=el;while(anchor&&anchor.tagName!=='A')anchor=anchor.parentElement;
    var isNewTab=!!(anchor&&(anchor.getAttribute('target')==='_blank'||anchor.getAttribute('rel')==='noopener noreferrer'));
    // If this click is on a child element that was revealed by hovering a trigger, emit hover first
    var parentTrigger=el.closest('[aria-haspopup],[aria-expanded],[role="menuitem"]');
    if(lastHoveredTrigger&&parentTrigger&&parentTrigger!==el){
      send('hover',{element:lastHoveredTrigger});
    }
    lastHoveredTrigger=null;
    // Shadow DOM detection
    var rootNode=el.getRootNode();
    var inShadowDom=rootNode!==document&&rootNode instanceof ShadowRoot;
    send('click',{element:{tag:el.tagName.toLowerCase(),description:desc,label:el.getAttribute('aria-label')||desc},isNewTab:isNewTab,inShadowDom:inShadowDom});
  },true);
  // Link interception — do NOT intercept target="_blank" links (they open new tabs)
  document.addEventListener('click',function(e){
    if(assertMode){return;}
    var a=e.target;while(a&&a.tagName!=='A')a=a.parentElement;
    if(!a||!a.href)return;
    // Skip new-tab links — they open externally, no proxy navigation needed
    if(a.getAttribute('target')==='_blank')return;
    var href=a.getAttribute('href');
    if(!href||href==='#'||href.indexOf('javascript:')===0||href.indexOf('mailto:')===0||href.indexOf('tel:')===0)return;
    e.preventDefault();e.stopPropagation();
    send('__proxy_navigate',{url:a.href});
  },false);
  // Inputs (on blur so we capture final value)
  document.addEventListener('blur',function(e){
    if(assertMode){return;}
    var el=e.target;if(!el||!['INPUT','TEXTAREA','SELECT'].includes(el.tagName))return;
    var isPass=el.type==='password';
    var label=el.getAttribute('aria-label')||el.getAttribute('placeholder')||el.getAttribute('name')||el.tagName.toLowerCase();
    send('input',{element:{label:label,description:label},value:el.value,isMasked:isPass});
  },true);
  // Select dropdowns
  document.addEventListener('change',function(e){
    if(assertMode){return;}
    var el=e.target;if(!el||el.tagName!=='SELECT')return;
    var label=el.getAttribute('aria-label')||el.getAttribute('name')||el.tagName.toLowerCase();
    send('select',{element:{label:label,description:label},value:el.value,displayText:el.options[el.selectedIndex]?el.options[el.selectedIndex].text:el.value});
  },true);
  // SPA navigation (pushState/replaceState)
  var lastUrl=window.location.href;
  function checkNav(){var u=window.location.href;if(u!==lastUrl){send('navigation',{fromUrl:lastUrl,toUrl:u});lastUrl=u;}}
  var _push=history.pushState.bind(history);var _replace=history.replaceState.bind(history);
  history.pushState=function(){_push.apply(history,arguments);setTimeout(checkNav,100);};
  history.replaceState=function(){_replace.apply(history,arguments);setTimeout(checkNav,100);};
  window.addEventListener('popstate',function(){setTimeout(checkNav,100);});

  // ── Assert Mode ──────────────────────────────────────────────────────────────
  var assertMode=false;
  var hlEl=null;

  function getElInfo(el){
    var tag=el.tagName.toLowerCase();
    var text=(el.innerText||el.textContent||'').trim().replace(/\\s+/g,' ').slice(0,120);
    var val=el.value||'';
    var ph=el.getAttribute('placeholder')||'';
    var al=el.getAttribute('aria-label')||'';
    var nm=el.getAttribute('name')||'';
    var tp=el.getAttribute('type')||'';
    var lbl=al||ph||nm||text.slice(0,60)||tag;
    var isInp=['input','textarea','select'].includes(tag);
    var isCb=tp==='checkbox'||tp==='radio';
    var attrs={};
    ['href','src','alt','title','data-testid','id'].forEach(function(a){var v=el.getAttribute(a);if(v)attrs[a]=v;});
    return{tag:tag,text:text,value:val,placeholder:ph,ariaLabel:al,name:nm,type:tp,label:lbl,isInput:isInp,isCheckbox:isCb,isChecked:el.checked||false,attrs:attrs};
  }

  function setHighlight(el){
    var old=document.getElementById('__dxqe_hl');if(old)old.remove();
    if(!el)return;
    var r=el.getBoundingClientRect();
    var d=document.createElement('div');
    d.id='__dxqe_hl';
    d.style.cssText='position:fixed;z-index:2147483647;pointer-events:none;border:2px solid #f59e0b;border-radius:3px;background:rgba(245,158,11,0.10);box-shadow:0 0 0 3000px rgba(0,0,0,0.25);';
    d.style.top=(r.top-2)+'px';d.style.left=(r.left-2)+'px';
    d.style.width=(r.width+4)+'px';d.style.height=(r.height+4)+'px';
    document.body.appendChild(d);
    hlEl=d;
  }

  // Listen for assert mode toggle from parent
  window.addEventListener('message',function(e){
    if(!e.data||e.data.target!=='__devxqe_assert')return;
    if(e.data.mode==='on'){
      assertMode=true;
      document.body.style.cursor='crosshair';
    } else {
      assertMode=false;
      document.body.style.cursor='';
      var old=document.getElementById('__dxqe_hl');if(old)old.remove();
    }
  });

  document.addEventListener('mouseover',function(e){
    if(!assertMode)return;
    var el=e.target;
    if(!el||el.id==='__dxqe_hl')return;
    setHighlight(el);
  },true);

  document.addEventListener('click',function(e){
    if(!assertMode)return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    var el=e.target;
    if(!el||el.id==='__dxqe_hl')return;
    var info=getElInfo(el);
    send('assert_element',{elementInfo:info});
  },true);

})();</script>`;
    html = html.replace(/<\/head>/i, recorderScript + '</head>');

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.removeHeader('X-Frame-Options');
    res.removeHeader('Content-Security-Policy');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(html);
  } catch (err: any) {
    const isTimeout = err.name === 'AbortError' || (err.message || '').includes('abort');
    const isRefused = (err.message || '').toLowerCase().includes('econnrefused') ||
                      (err.message || '').toLowerCase().includes('connection refused');
    const msg = isTimeout ? 'Request timed out (30 s)' : isRefused ? 'Site refused connection from proxy server' : (err.message || 'Connection failed');
    const hint = isRefused
      ? 'This site blocks server-side requests (common with enterprise/education portals). Use <strong style="color:#f59e0b">Record in Window</strong> to open a real browser instead — it always works.'
      : 'The site may be blocking server-side requests or loading slowly. Try <strong style="color:#818cf8">Record in Window</strong> for reliable recording.';
    res.status(200).send(`<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="background:#0f172a;color:#94a3b8;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;flex-direction:column;gap:12px">
      <script>
        // Notify parent frame immediately so the UI can show the "use Record in Window" banner
        try { window.parent.postMessage({source:'devxqe-iframe',type:'proxy_error',reason:'${isRefused ? 'connection_refused' : isTimeout ? 'timeout' : 'network_error'}',url:'${targetUrl}'},'*'); } catch(e){}
      </script>
      <div style="font-size:40px">🌐</div>
      <div style="font-size:14px;font-weight:600;color:#f1f5f9">Could not load page</div>
      <div style="font-size:12px;color:#64748b;max-width:360px;text-align:center">${msg}</div>
      <div style="font-size:11px;color:#475569;margin-top:4px;max-width:360px;text-align:center;line-height:1.6">${hint}</div>
      <div style="display:flex;gap:8px;margin-top:4px">
        <button onclick="window.parent.postMessage({source:'devxqe-iframe',type:'__proxy_navigate',url:'${targetUrl}'},'*')" style="padding:8px 16px;background:#334155;color:#e2e8f0;border:none;border-radius:8px;font-size:12px;cursor:pointer;font-weight:600">↺ Retry</button>
        <button onclick="window.parent.postMessage({source:'devxqe-iframe',type:'open_in_window',url:'${targetUrl}'},'*')" style="padding:8px 16px;background:#d97706;color:white;border:none;border-radius:8px;font-size:12px;cursor:pointer;font-weight:600">📂 Record in Window</button>
      </div>
    </body></html>`);
  }
}

// ─── REST Routes ──────────────────────────────────────────────────────────────

export function registerRecorderRoutes(app: Express) {

  // GET /api/recorder/check-url — quick reachability probe before loading iframe
  // Returns { reachable: boolean, reason?: string, blocksFraming?: boolean }
  app.get('/api/recorder/check-url', async (req: Request, res: Response) => {
    const rawUrl = req.query.url as string;
    if (!rawUrl) return res.json({ reachable: false, reason: 'Missing url parameter' });
    let targetUrl = rawUrl;
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const probe = await fetch(targetUrl, {
        method: 'HEAD',
        signal: controller.signal,
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        }
      });
      clearTimeout(timeout);
      const xfo = probe.headers.get('x-frame-options') || '';
      const csp = probe.headers.get('content-security-policy') || '';
      const blocksFraming =
        /DENY|SAMEORIGIN/i.test(xfo) ||
        /frame-ancestors\s+'none'/.test(csp) ||
        /frame-ancestors\s+'self'/.test(csp);
      return res.json({ reachable: true, blocksFraming, status: probe.status });
    } catch (err: any) {
      const isTimeout = err.name === 'AbortError' || (err.message || '').includes('abort');
      const isRefused = (err.message || '').toLowerCase().includes('econnrefused') ||
                        (err.message || '').toLowerCase().includes('connection refused');
      const isDns     = (err.message || '').toLowerCase().includes('enotfound') ||
                        (err.message || '').toLowerCase().includes('getaddrinfo');
      const reason = isTimeout ? 'timeout' : isRefused ? 'connection_refused' : isDns ? 'dns_failed' : 'network_error';
      return res.json({ reachable: false, reason, message: err.message });
    }
  });

  // GET /api/recorder/browse — proxy any URL into an iframe-friendly response
  app.get('/api/recorder/browse', async (req: Request, res: Response) => {
    const rawUrl = req.query.url as string;
    if (!rawUrl) return res.status(400).send('Missing ?url= parameter');
    let targetUrl = rawUrl;
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }
    await proxyUrl(targetUrl, res);
  });

  // POST /api/recorder/sessions — NAT 2.0 creates a new session, gets a code
  // Requires project context from the New Recording dialog.
  app.post('/api/recorder/sessions', (req: Request, res: Response) => {
    const meta = req.body?.metadata || {};
    // Project context is required for new recordings
    // (backward compat: allow empty metadata for legacy flows)
    const sessionId = generateSessionCode();
    const session: RecordingSession = {
      id: sessionId,
      createdAt: Date.now(),
      status: 'waiting',
      extensionWs: null,
      uiClients: new Set(),
      events: [],
      metadata: {
        projectName: meta.projectName || '',
        moduleName: meta.moduleName || '',
        tcId: meta.tcId || '',
        testCaseName: meta.testCaseName || '',
        applicationUrl: meta.applicationUrl || '',
        adoStoryId: meta.adoStoryId || '',
        businessContext: meta.businessContext || '',
        frameworkConfigId: meta.frameworkConfigId || '',
      }
    };
    sessions.set(sessionId, session);
    res.json({ sessionId, metadata: session.metadata, message: 'Session created with project context.' });
  });

  // GET /api/recorder/sessions/:id — get session status + events
  app.get('/api/recorder/sessions/:id', (req: Request, res: Response) => {
    const session = sessions.get(req.params.id?.toUpperCase());
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json({
      sessionId: session.id,
      status: session.status,
      eventCount: session.events.length,
      events: session.events,
      metadata: session.metadata
    });
  });

  // DELETE /api/recorder/sessions/:id — NAT 2.0 stops the session
  app.delete('/api/recorder/sessions/:id', (req: Request, res: Response) => {
    const session = sessions.get(req.params.id?.toUpperCase());
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    session.status = 'stopped';

    // Tell extension to stop
    if (session.extensionWs && session.extensionWs.readyState === WebSocket.OPEN) {
      session.extensionWs.send(JSON.stringify({ type: 'stop_recording' }));
    }

    // Notify UI clients
    broadcastToUI(session, 'recording_stopped', { sessionId: session.id, eventCount: session.events.length });
    res.json({ success: true, eventCount: session.events.length });
  });

  // GET /api/recorder/sessions/:id/events — SSE stream for NAT 2.0 UI
  app.get('/api/recorder/sessions/:id/events', (req: Request, res: Response) => {
    const session = sessions.get(req.params.id?.toUpperCase());
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Setup SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    // Register client
    session.uiClients.add(res);

    // Send current status immediately
    sendSSE(res, 'connected', {
      sessionId: session.id,
      status: session.status,
      eventCount: session.events.length
    });

    // Replay buffered events (for page refresh)
    for (const evt of session.events) {
      sendSSE(res, 'recording_event', evt);
    }

    // Keep-alive ping every 20s
    const pingInterval = setInterval(() => {
      try { res.write(': ping\n\n'); } catch { clearInterval(pingInterval); }
    }, 20000);

    // Cleanup on disconnect
    req.on('close', () => {
      clearInterval(pingInterval);
      session.uiClients.delete(res);
    });
  });

  // GET /api/recorder/sessions — list all active sessions (for debugging)
  app.get('/api/recorder/sessions', (_req: Request, res: Response) => {
    const list = Array.from(sessions.values()).map(s => ({
      id: s.id,
      status: s.status,
      eventCount: s.events.length,
      createdAt: s.createdAt,
      hasExtension: s.extensionWs !== null,
      uiClientCount: s.uiClients.size
    }));
    res.json(list);
  });

  // ─── Playwright-based Recorder ─────────────────────────────────────────────
  // Stores live Playwright browser per session so we can stop it later
  const pwBrowsers = new Map<string, { browser: Browser; context: BrowserContext; page: PwPage }>();

  // The recorder init script — injected into every page via addInitScript.
  // Uses window.__devxqe_send() which is exposed by Playwright's exposeFunction.
  const PW_RECORDER_INIT = `
(function () {

  // ── Element Inspector Utilities ────────────────────────────────────────────

  /** Build a stable, non-absolute XPath for an element */
  function _getXPath(el) {
    if (!el || el === document.body) return '//body';
    var tag = el.tagName.toLowerCase();
    var _guidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    var _embeddedGuidRe = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    var _genRe  = /^(mat|cdk|ng|p-|mdc-|mdl-)\w+-\d+$|^\w+_\d{5,}$|^[a-z]+_[a-z0-9]{6,}$/;
    function _isGen(id) { return !id || _guidRe.test(id) || _embeddedGuidRe.test(id) || _genRe.test(id) || (id.length > 40 && /[0-9a-f]{12}/i.test(id)); }
    // Anchor on stable id
    if (el.id && !_isGen(el.id)) return '//*[@id="' + el.id + '"]';
    // Walk up to find a stable ancestor
    var cur = el.parentElement;
    var depth = 0;
    while (cur && cur !== document.body && depth < 6) {
      if (cur.id && !_isGen(cur.id)) {
        // Build path from stable ancestor down — never use positional indexes as sole discriminator
        var nm = el.getAttribute('name');
        var ph = el.getAttribute('placeholder');
        if (nm) return '//*[@id="' + cur.id + '"]//' + tag + '[@name="' + nm + '"]';
        if (ph) return '//*[@id="' + cur.id + '"]//' + tag + '[@placeholder="' + ph + '"]';
        var txt = (el.innerText || '').trim().slice(0, 60);
        if (txt && (tag === 'button' || tag === 'a')) return '//*[@id="' + cur.id + '"]//' + tag + '[normalize-space(text())="' + txt + '"]';
        return '//*[@id="' + cur.id + '"]//' + tag;
      }
      cur = cur.parentElement;
      depth++;
    }
    // Fallback: text-anchored (still not absolute)
    var text2 = (el.innerText || '').trim().slice(0, 60);
    if (text2 && (tag === 'button' || tag === 'a')) return '//' + tag + '[normalize-space(text())="' + text2 + '"]';
    return '//' + tag;
  }

  /**
   * XPath-First Locator Strategy — Priority order follows non-negotiable XPath rules.
   * All playwright expressions use page.locator('xpath=...').
   */
  function _getAllLocators(el) {
    var eff = el;
    while (eff && eff.tagName !== 'BUTTON' && eff.tagName !== 'A' &&
           eff.tagName !== 'LABEL' &&
           !['INPUT','TEXTAREA','SELECT'].includes(eff.tagName) &&
           eff.getAttribute('role') !== 'option' &&
           eff.getAttribute('role') !== 'listitem' &&
           eff.getAttribute('role') !== 'menuitem') {
      eff = eff.parentElement;
    }
    eff = eff || el;

    var effTag  = eff.tagName.toLowerCase();
    var effText = (eff.innerText || eff.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 80);
    var effType = (eff.getAttribute('type') || '').toLowerCase();
    var ph      = eff.getAttribute('placeholder') || '';
    var nm      = eff.getAttribute('name') || '';
    var ariaLbl = eff.getAttribute('aria-label') || '';

    // ── Helpers ──────────────────────────────────────────────────────────────
    var _guidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    var _embeddedGuidRe = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    var _genRe  = /^(mat|cdk|ng|p-|mdc-|mdl-)\\w+-\\d+$|^\\w+_\\d{5,}$|^[a-z]+_[a-z0-9]{6,}$/;
    function _isGen(id) { return !id || _guidRe.test(id) || _embeddedGuidRe.test(id) || _genRe.test(id) || (id.length > 40 && /[0-9a-f]{12}/i.test(id)); }

    // XPath string-literal escaping (handles values containing single quotes)
    function _xesc(s) {
      if (s.indexOf("'") === -1) return "'" + s + "'";
      var parts = s.split("'");
      return 'concat(' + parts.map(function(p) { return "'" + p + "'"; }).join(", \\"'\\", ") + ')';
    }

    // Build the Playwright locator call for a given XPath
    function _xpw(xpath) {
      return "page.locator('xpath=" + xpath.replace(/'/g, "\\\\'") + "')";
    }

    var strategies = [];
    var testAttrs  = ['data-testid','data-test','data-cy','data-qa','data-automation-id'];

    // ═══════════════════════════════════════════════════════════════════════════
    // PRIORITY 1 — Stable Unique Attributes
    // ═══════════════════════════════════════════════════════════════════════════

    // 1a. id (skip GUIDs and auto-generated IDs)
    if (eff.id && !_isGen(eff.id)) {
      var xp1 = '//*[@id=' + _xesc(eff.id) + ']';
      strategies.push({
        strategy: 'id', confidence: 10, xpath: xp1, playwright: _xpw(xp1),
        uniqueness: 'unique', stability: 'stable',
        fallback: nm ? '//'+effTag+'[@name='+_xesc(nm)+']' : ph ? '//'+effTag+'[@placeholder='+_xesc(ph)+']' : null
      });
    }

    // 1b. data-testid / data-test / data-cy / data-qa / data-automation-id
    var testVal = null, testAttrName = null;
    for (var ti = 0; ti < testAttrs.length; ti++) {
      testVal = eff.getAttribute(testAttrs[ti]);
      if (testVal) { testAttrName = testAttrs[ti]; break; }
    }
    if (testVal && testAttrName) {
      var xp2 = '//*[@' + testAttrName + '=' + _xesc(testVal) + ']';
      strategies.push({
        strategy: 'data-testid', confidence: 10, xpath: xp2, playwright: _xpw(xp2),
        uniqueness: 'unique', stability: 'stable — test attribute',
        fallback: eff.id && !_isGen(eff.id) ? '//*[@id='+_xesc(eff.id)+']' : null
      });
    }

    // 1c. aria-label
    if (ariaLbl) {
      var xp3 = '//' + effTag + '[@aria-label=' + _xesc(ariaLbl) + ']';
      strategies.push({
        strategy: 'aria-label', confidence: 9, xpath: xp3, playwright: _xpw(xp3),
        uniqueness: 'likely unique', stability: 'stable',
        fallback: effText ? '//'+effTag+'[normalize-space(text())='+_xesc(effText)+']' : null
      });
    }

    // 1d. name attribute (form fields — skip generated names)
    if (nm && !_isGen(nm) && ['input','textarea','select'].includes(effTag)) {
      var xp4 = '//' + effTag + '[@name=' + _xesc(nm) + ']';
      strategies.push({
        strategy: 'name', confidence: 9, xpath: xp4, playwright: _xpw(xp4),
        uniqueness: 'likely unique', stability: 'stable',
        fallback: ph ? '//'+effTag+'[@placeholder='+_xesc(ph)+']' : null
      });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PRIORITY 2 — Semantic XPath (text-based)
    // ═══════════════════════════════════════════════════════════════════════════

    // 2a. Button with normalized text
    if (effText && effTag === 'button') {
      var xp5a = '//button[normalize-space(text())=' + _xesc(effText) + ']';
      strategies.push({
        strategy: 'button-text', confidence: 8, xpath: xp5a, playwright: _xpw(xp5a),
        uniqueness: 'verify', stability: 'stable if button text is unique',
        fallback: ariaLbl ? '//button[@aria-label='+_xesc(ariaLbl)+']' : null
      });
    }

    // 2b. Link with normalized text
    if (effText && effTag === 'a') {
      var xp5b = '//a[normalize-space(text())=' + _xesc(effText) + ']';
      strategies.push({
        strategy: 'link-text', confidence: 8, xpath: xp5b, playwright: _xpw(xp5b),
        uniqueness: 'verify', stability: 'stable if link text is unique',
        fallback: null
      });
    }

    // 2c. Label-associated input (label[for] relationship)
    if (['input','textarea','select'].includes(effTag) && eff.id && !_isGen(eff.id)) {
      var labelEl = document.querySelector('label[for="' + eff.id + '"]');
      if (labelEl) {
        var labelTxt = (labelEl.textContent || '').trim();
        if (labelTxt) {
          var xp5c = '//label[normalize-space(text())=' + _xesc(labelTxt) + ']/following-sibling::' + effTag + '[1]';
          strategies.push({
            strategy: 'label-text', confidence: 8, xpath: xp5c, playwright: _xpw(xp5c),
            uniqueness: 'likely unique', stability: 'stable',
            fallback: nm ? '//'+effTag+'[@name='+_xesc(nm)+']' : null
          });
        }
      }
    }

    // 2d. Placeholder (input/textarea)
    if (ph && ['input','textarea'].includes(effTag)) {
      var xp5d = '//' + effTag + '[@placeholder=' + _xesc(ph) + ']';
      strategies.push({
        strategy: 'placeholder', confidence: 7, xpath: xp5d, playwright: _xpw(xp5d),
        uniqueness: 'verify', stability: 'stable if placeholder text unchanged',
        fallback: nm ? '//'+effTag+'[@name='+_xesc(nm)+']' : null
      });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PRIORITY 3 — Relative Structural XPath (anchored to stable parent)
    // ═══════════════════════════════════════════════════════════════════════════

    var anchor = eff.parentElement;
    var relFound = false;
    for (var d = 0; d < 6 && anchor && !relFound; d++) {
      var anchorId = anchor.id && !_isGen(anchor.id) ? anchor.id : null;
      var anchorTestAttr = null, anchorTestVal = null;
      if (!anchorId) {
        for (var ti2 = 0; ti2 < testAttrs.length; ti2++) {
          anchorTestVal = anchor.getAttribute(testAttrs[ti2]);
          if (anchorTestVal) { anchorTestAttr = testAttrs[ti2]; break; }
        }
      }
      var anchorXp = anchorId
        ? '//*[@id=' + _xesc(anchorId) + ']'
        : anchorTestAttr ? '//*[@' + anchorTestAttr + '=' + _xesc(anchorTestVal) + ']' : null;
      if (anchorXp) {
        var suffix = nm ? '[@name=' + _xesc(nm) + ']'
                       : ph ? '[@placeholder=' + _xesc(ph) + ']'
                       : effText && (effTag === 'button' || effTag === 'a')
                         ? '[normalize-space(text())=' + _xesc(effText) + ']'
                         : '';
        var xp6 = anchorXp + '//' + effTag + suffix;
        strategies.push({
          strategy: 'relative-structural', confidence: 6, xpath: xp6, playwright: _xpw(xp6),
          uniqueness: 'verify', stability: 'stable — anchored to ' + (anchorId || anchorTestVal),
          fallback: null
        });
        relFound = true;
      }
      anchor = anchor.parentElement;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PRIORITY 4 — Attribute Combination
    // ═══════════════════════════════════════════════════════════════════════════

    if (effType && ph && ['input','textarea'].includes(effTag)) {
      var xp7a = '//' + effTag + '[@type=' + _xesc(effType) + ' and @placeholder=' + _xesc(ph) + ']';
      strategies.push({
        strategy: 'attr-combo', confidence: 5, xpath: xp7a, playwright: _xpw(xp7a),
        uniqueness: 'verify', stability: 'fragile if placeholder changes',
        fallback: null
      });
    }
    if (effType && nm && !_isGen(nm) && ['input','textarea','select'].includes(effTag)) {
      var xp7b = '//' + effTag + '[@type=' + _xesc(effType) + ' and @name=' + _xesc(nm) + ']';
      strategies.push({
        strategy: 'attr-combo', confidence: 5, xpath: xp7b, playwright: _xpw(xp7b),
        uniqueness: 'verify', stability: 'stable',
        fallback: null
      });
    }

    // ── Absolute last-resort: form-scoped or text-contains (never root-absolute) ──
    if (!strategies.length) {
      var formEl = typeof eff.closest === 'function' ? eff.closest('form') : null;
      if (formEl && formEl.id && !_isGen(formEl.id)) {
        var xp8 = '//form[@id=' + _xesc(formEl.id) + ']//' + effTag + (nm ? '[@name='+_xesc(nm)+']' : '');
        strategies.push({ strategy: 'form-scoped', confidence: 4, xpath: xp8, playwright: _xpw(xp8), uniqueness: 'verify', stability: 'stable', fallback: null });
      } else if (effText) {
        var xp9 = '//' + effTag + '[contains(normalize-space(text()),' + _xesc(effText.slice(0,60)) + ')]';
        strategies.push({ strategy: 'text-contains', confidence: 3, xpath: xp9, playwright: _xpw(xp9), uniqueness: 'verify', stability: 'fragile', fallback: null });
      } else {
        strategies.push({ strategy: 'tag-only', confidence: 1, xpath: '//'+effTag, playwright: _xpw('//'+effTag), uniqueness: 'not unique', stability: 'fragile', fallback: null });
      }
    }

    // KENDO DROPDOWNLIST BRIDGE
    // Only run for DropDownList widgets — explicitly exclude other Kendo widgets
    (function(element) {
      var cursor = element;
      for (var i = 0; i < 5; i++) {
        if (!cursor) break;
        var cls = cursor.className || '';
        // Positive match: k-dropdown or k-dropdown-wrap
        if (cls.indexOf('k-dropdown') > -1 && cls.indexOf('k-datetimepicker') === -1) {
          // Confirm it has aria-owns ending in _listbox (DropDownList signature)
          var ariaOwns = cursor.getAttribute('aria-owns') || '';
          if (ariaOwns.indexOf('_listbox') > -1) {
            var realInputId = ariaOwns.replace('_listbox', '');
            var realInput = document.getElementById(realInputId);
            // Only proceed if the real input exists AND has data-role="dropdownlist"
            if (realInput && realInput.getAttribute('data-role') === 'dropdownlist') {
              // Check if disabled — tag it but do not suppress
              var isDisabled = realInput.disabled ||
                               cursor.getAttribute('aria-disabled') === 'true';
              strategies.unshift({
                strategy: 'kendo-dropdownlist',
                confidence: 10,
                xpath: '//*[@id="' + realInputId + '"]',
                css: '#' + realInputId,
                // Playwright locator targets the visible wrapper, not the hidden input
                playwright: "page.locator('[aria-owns=\\"" + ariaOwns + "\\"]')",
                kendoInputId: realInputId,
                kendoListboxId: ariaOwns,
                kendoDisabled: isDisabled
              });
            }
            return;
          }
        }
        cursor = cursor.parentElement;
      }
    })(el);

    // KENDO TREEVIEW CHECKBOX BRIDGE
    // For input.k-checkbox inside a .k-treeview — use the checkbox value + tree container id
    // instead of the GUID-based checkbox id (which _isGen() correctly rejects).
    (function(element) {
      if (element.tagName === 'INPUT' && element.type === 'checkbox' &&
          (element.className || '').indexOf('k-checkbox') > -1) {
        var treeContainer = element.closest('[data-role="treeview"]');
        if (treeContainer && treeContainer.id && element.value) {
          strategies.unshift({
            strategy: 'kendo-treeview-checkbox',
            confidence: 9,
            xpath: '//*[@id="' + treeContainer.id + '"]//input[@type="checkbox"][@value="' + element.value + '"]',
            css: '#' + treeContainer.id + ' input[type="checkbox"][value="' + element.value + '"]',
            playwright: "page.locator('#" + treeContainer.id + " input[type=\\"checkbox\\"][value=\\"" + element.value + "\\"]')",
            kendoNodeValue: element.value,
            kendoTreeId: treeContainer.id
          });
        }
      }
    })(el);

    // KENDO GRID CHECKBOX BRIDGE
    // For checkboxes inside a Kendo Grid (header "select all" or row checkboxes),
    // use the grid's stable ID + structural locator instead of GUID-based checkbox IDs.
    (function(element) {
      if (element.tagName === 'INPUT' && element.type === 'checkbox') {
        var grid = element.closest('[data-role="grid"], .k-grid');
        if (grid && grid.id) {
          var isHeader = !!element.closest('thead, .k-grid-header');
          if (isHeader) {
            strategies.unshift({
              strategy: 'kendo-grid-header-checkbox',
              confidence: 9,
              xpath: '//*[@id="' + grid.id + '"]//thead//input[@type="checkbox"]',
              css: '#' + grid.id + ' thead input[type="checkbox"]',
              playwright: "page.locator('#" + grid.id + " th input[type=\\"checkbox\\"]').first()",
              kendoGridId: grid.id
            });
          } else {
            var row = element.closest('tr');
            var rowIdx = row ? Array.from(row.parentElement.children).indexOf(row) : 0;
            strategies.unshift({
              strategy: 'kendo-grid-row-checkbox',
              confidence: 8,
              xpath: '//*[@id="' + grid.id + '"]//tbody/tr[' + (rowIdx + 1) + ']//input[@type="checkbox"]',
              css: '#' + grid.id + ' tbody tr:nth-child(' + (rowIdx + 1) + ') input[type="checkbox"]',
              playwright: "page.locator('#" + grid.id + " tbody tr').nth(" + rowIdx + ").locator('input[type=\\"checkbox\\"]')",
              kendoGridId: grid.id,
              kendoRowIndex: rowIdx
            });
          }
        }
      }
    })(el);

    return {
      primary: strategies[0],
      all: strategies,
      effectiveEl: {
        tag: effTag, id: eff.id || '', name: nm, placeholder: ph,
        ariaLabel: ariaLbl, text: effText, type: effType,
        cssPath: eff.id && !_isGen(eff.id) ? '#' + eff.id : null
      }
    };
  }

  // ── Associated <label> text helper ────────────────────────────────────────
  function _getAssocLabel(el) {
    if (el.id) {
      var lbl = document.querySelector('label[for="' + el.id + '"]');
      if (lbl) return (lbl.textContent || '').trim();
    }
    return null;
  }

  // ── page_load ─────────────────────────────────────────────────────────────
  if (window.location.href && !window.location.href.startsWith('about:') && !window.location.href.startsWith('data:')) {
    window.__devxqe_send({ type: 'page_load', url: window.location.href, pageTitle: document.title });
  }

  // ── Kendo UI widget detection ──────────────────────────────────────────────
  // Detects Kendo widgets by CSS class AND data-role attribute (older Kendo versions).
  // Returns { type: string, wrapper: HTMLElement } or null.
  var KENDO_MAP = {
    'k-dropdownlist': 'dropdownlist', 'k-dropdown':  'dropdownlist',
    'k-dropdown-wrap': 'dropdownlist',
    'k-combobox':     'combobox',
    'k-datepicker':   'datepicker',   'k-datetimepicker': 'datetimepicker',
    'k-timepicker':   'timepicker',
    'k-multiselect':  'multiselect',
    'k-numerictextbox':'numerictextbox',
    'k-tabstrip':     'tabstrip',
    'k-treeview':     'treeview',
    'k-grid':         'grid',
    'k-switch':       'switch',
    'k-slider':       'slider',
    'k-upload':       'upload',
    'k-editor':       'editor'
  };
  var KENDO_ROLES = {
    'dropdownlist': 'dropdownlist', 'combobox': 'combobox',
    'datepicker': 'datepicker', 'datetimepicker': 'datetimepicker',
    'timepicker': 'timepicker', 'multiselect': 'multiselect',
    'numerictextbox': 'numerictextbox', 'tabstrip': 'tabstrip',
    'treeview': 'treeview', 'grid': 'grid', 'slider': 'slider',
    'upload': 'upload', 'editor': 'editor', 'switch': 'switch'
  };
  function _detectKendo(el) {
    // Only walk up 5 levels — keeps detection tight to the clicked element.
    // For each ancestor, check CSS class markers FIRST (most specific),
    // then data-role on the SAME element only (not querySelector which is too broad).
    var cur = el;
    for (var i = 0; i < 5 && cur && cur !== document.body; i++) {
      if (cur.classList) {
        // Check specific Kendo CSS class markers (k-dropdown, k-datepicker, etc.)
        for (var cls in KENDO_MAP) {
          if (cur.classList.contains(cls)) return { type: KENDO_MAP[cls], wrapper: cur };
        }
      }
      // Check data-role on THIS element only (not children — that caused false positives)
      var role = cur.getAttribute && cur.getAttribute('data-role');
      if (role && KENDO_ROLES[role]) return { type: KENDO_ROLES[role], wrapper: cur };
      cur = cur.parentElement;
    }
    // Check if inside a Kendo popup (animation container or k-popup)
    if (el.closest) {
      var popup = el.closest('.k-animation-container, .k-popup, .k-list-container');
      if (popup) return { type: 'popup_item', wrapper: popup };
    }
    return null;
  }

  // Get human-readable label for a Kendo widget wrapper
  function _getKendoLabel(wrapper) {
    // Try: preceding <label>, aria-label, id-based label, wrapper id, name
    var id = wrapper.querySelector('input[id],select[id]');
    if (id && id.id) {
      var lbl = document.querySelector('label[for="' + id.id + '"]');
      if (lbl) return (lbl.textContent || '').trim();
    }
    var ariaLbl = wrapper.getAttribute('aria-label') || (id && id.getAttribute('aria-label'));
    if (ariaLbl) return ariaLbl;
    // Check preceding sibling or parent label text
    var prev = wrapper.previousElementSibling;
    if (prev && prev.tagName === 'LABEL') return (prev.textContent || '').trim();
    // Name attribute
    if (id && id.name) return id.name;
    if (id && id.id) return id.id;
    return wrapper.className.split(' ').find(function(c){return c.startsWith('k-');}) || 'kendo-widget';
  }

  // Read Kendo widget value via jQuery data API (if available) or DOM fallback
  function _getKendoValue(wrapper, widgetType) {
    try {
      if (window.$ || window.jQuery) {
        var $w = (window.$ || window.jQuery)(wrapper);
        var widget = $w.data('kendo' + widgetType.charAt(0).toUpperCase() + widgetType.slice(1));
        if (widget) {
          return { text: widget.text ? widget.text() : '', value: widget.value ? String(widget.value()) : '' };
        }
      }
    } catch(e) {}
    // DOM fallback: read from visible input text
    var inp = wrapper.querySelector('.k-input-inner, .k-input-value-text, input:not([type="hidden"])');
    var hidden = wrapper.querySelector('input[type="hidden"], select');
    return {
      text: inp ? (inp.textContent || inp.value || '').trim() : '',
      value: hidden ? (hidden.value || '') : ''
    };
  }

  // ── Dedup guard ───────────────────────────────────────────────────────────
  var _lastClickKey = '';
  var _lastClickTime = 0;
  var _lastKendoChange = '';
  var _lastKendoChangeTime = 0;
  var _kendoRegistry = {};  // populated by MutationObserver (P0-A) or _bindKendoWidgets

  // ── Click events ──────────────────────────────────────────────────────────
  document.addEventListener('click', function (e) {
    var el = e.target;
    if (!el || el === document.body || el === document.documentElement) return;
    if (el.disabled || el.getAttribute('aria-disabled') === 'true') return;
    // Native <select> and <option> clicks are handled by the 'change' event — skip here
    if (el.tagName === 'OPTION' || el.tagName === 'SELECT') return;

    // ── TIER 1: SUPPRESS — noise elements that should NEVER generate events ──
    // Script/style tags and their children
    if (el.closest('script, style, noscript')) return;
    // Invisible elements (not rendered)
    if (el.offsetParent === null && el.tagName !== 'BODY' && el.tagName !== 'HTML' &&
        !el.closest('.k-animation-container') && !el.closest('.k-popup')) return;
    // Single character text or bare HTML tag names (e.g., "a", "p", "span")
    var clickText = (el.textContent || '').trim();
    if (clickText.length <= 1 && !el.id && !el.getAttribute('aria-label')) return;
    if (/^(a|p|b|i|u|s|em|div|span|li|td|tr|th|hr|br|ul|ol|dl|dt|dd)$/i.test(clickText) && !el.id) return;
    // Inline JavaScript code captured as text (e.g., "var selformats = ...")
    if (/\\bvar\\s|\\bfunction\\s*\\(|=>\\s*\\{|\\.prototype\\b|document\\.\\w|window\\.\\w|\\bif\\s*\\(.+\\{/i.test(clickText)) return;
    if (clickText.length > 80 && clickText.indexOf("'") > -1 && clickText.indexOf('=') > -1) return;

    // ── TIER 2: KENDO — check if element is inside a registered Kendo widget ──
    // Consult the _kendoRegistry (built by MutationObserver) for instant classification
    if (typeof _kendoRegistry !== 'undefined') {
      var cur2 = el;
      for (var k2 = 0; k2 < 6 && cur2 && cur2 !== document.body; k2++) {
        var regId = cur2.getAttribute && cur2.getAttribute('data-role') ?
          (cur2.id || '') : '';
        if (!regId) {
          var innerSel = cur2.querySelector && cur2.querySelector('[data-role]');
          if (innerSel) regId = innerSel.id || '';
        }
        if (regId && _kendoRegistry[regId]) {
          var regType = _kendoRegistry[regId].type;
          // Date/time pickers: allow click through (calendar icon clicks need recording)
          if (regType === 'datetimepicker' || regType === 'datepicker' || regType === 'timepicker') break;
          // All other Kendo widgets: suppress click, change listener handles value capture
          if (regType === 'dropdownlist' || regType === 'combobox' || regType === 'multiselect') return;
        }
        cur2 = cur2.parentElement;
      }
    }

    // ── Kendo-specific click handling ──────────────────────────────────────
    var kendo = _detectKendo(el);
    if (kendo) {
      // DateTimePicker / DatePicker — ALWAYS allow through to generic click handler.
      // Calendar/time icon clicks must be recorded normally; value is captured by blur.
      if (kendo.type === 'datetimepicker' || kendo.type === 'datepicker' || kendo.type === 'timepicker') {
        kendo = null; // clear so it falls through to the standard click path below
      }
    }
    if (kendo) {
      // Clicks inside Kendo dropdown popup items — suppress (captured by change listener)
      if (kendo.type === 'popup_item') return;
      // Clicks on Kendo dropdown/combobox trigger — suppress (captured by change listener)
      if (kendo.type === 'dropdownlist' || kendo.type === 'combobox') return;
      // Kendo TabStrip tab click
      if (kendo.type === 'tabstrip') {
        var tab = el.closest('.k-item, [role="tab"]');
        var tabText = tab ? (tab.textContent || '').trim() : (el.textContent || '').trim();
        var allTabs = kendo.wrapper.querySelectorAll('.k-item, [role="tab"]');
        var tabIdx = tab ? Array.from(allTabs).indexOf(tab) : -1;
        window.__devxqe_send({
          type: 'kendo_tab', url: window.location.href, pageTitle: document.title,
          tabText: tabText, tabIndex: tabIdx,
          element: { label: tabText, description: tabText, tag: 'kendo-tab',
            elementId: tab ? tab.id : '', locatorData: _getAllLocators(tab || el) }
        });
        return;
      }
      // Kendo TreeView node click
      if (kendo.type === 'treeview') {
        var node = el.closest('.k-item, [role="treeitem"]');
        var nodeTextEl = node ? (node.querySelector('.k-in, .k-treeview-leaf-text') || node) : el;
        var nodeText = (nodeTextEl.textContent || '').trim().substring(0, 60);
        // Detect if clicking expand/collapse icon
        var isToggle = el.classList.contains('k-i-expand') || el.classList.contains('k-i-collapse')
          || el.classList.contains('k-icon') || el.closest('.k-icon');
        window.__devxqe_send({
          type: isToggle ? 'kendo_tree_toggle' : 'kendo_tree_select',
          url: window.location.href, pageTitle: document.title,
          nodeText: nodeText,
          element: { label: nodeText, description: nodeText, tag: 'kendo-tree',
            locatorData: _getAllLocators(node || el) }
        });
        return;
      }
      // Kendo Grid column header sort click
      if (kendo.type === 'grid') {
        var th = el.closest('th');
        if (th && th.closest('.k-grid-header')) {
          var colText = (th.textContent || '').replace(/[▲▼↑↓]/g, '').trim();
          var sortDir = th.querySelector('.k-i-sort-asc-sm, .k-sort-asc-icon') ? 'descending'
            : th.querySelector('.k-i-sort-desc-sm, .k-sort-desc-icon') ? 'none' : 'ascending';
          window.__devxqe_send({
            type: 'kendo_grid_sort', url: window.location.href, pageTitle: document.title,
            column: colText, direction: sortDir,
            element: { label: colText, description: 'Sort ' + colText, tag: 'kendo-grid-header',
              locatorData: _getAllLocators(th) }
          });
          return;
        }
        // Grid pager click
        var pager = el.closest('.k-pager, .k-pager-numbers');
        if (pager) {
          var pageNum = (el.textContent || '').trim();
          window.__devxqe_send({
            type: 'kendo_grid_page', url: window.location.href, pageTitle: document.title,
            pageNumber: pageNum,
            element: { label: 'Page ' + pageNum, description: 'Page ' + pageNum, tag: 'kendo-pager',
              locatorData: _getAllLocators(el) }
          });
          return;
        }
        // Other grid clicks (row, cell) — fall through to normal click handler
      }
      // DatePicker, MultiSelect, NumericTextBox clicks — fall through
      // (value captured by change/blur listeners)
    }

    // Dedup: same element within 300ms
    var key = (el.id || el.getAttribute('name') || el.tagName) + '|' + (el.innerText || '').trim().slice(0, 30);
    var now = Date.now();
    if (key === _lastClickKey && now - _lastClickTime < 300) return;
    _lastClickKey = key;
    _lastClickTime = now;

    var locData = _getAllLocators(el);
    var eff     = locData.effectiveEl;
    var desc    = eff.ariaLabel || eff.text || eff.placeholder || eff.id || eff.name || eff.tag;
    var tag     = eff.tag;
    var isLink  = tag === 'a';

    window.__devxqe_send({
      type: 'click',
      url: window.location.href,
      pageTitle: document.title,
      element: {
        tag: tag, description: desc, label: eff.ariaLabel || desc, isLink: isLink,
        elementId: eff.id, elementName: eff.name, placeholder: eff.placeholder,
        locatorData: locData
      }
    });
  }, false);

  // ── Input events (on blur — final value) ─────────────────────────────────
  document.addEventListener('blur', function (e) {
    var el = e.target;
    if (!el || !['INPUT','TEXTAREA','SELECT'].includes(el.tagName)) return;
    if (el.type === 'checkbox' || el.type === 'radio') return;

    var isPass   = el.type === 'password';
    var locData  = _getAllLocators(el);
    var eff      = locData.effectiveEl;

    // Human-readable label: associated <label> > aria-label > placeholder > id > name
    var humanLabel = _getAssocLabel(el) || eff.ariaLabel || eff.placeholder || eff.id || eff.name || eff.tag;

    window.__devxqe_send({
      type: 'input',
      url: window.location.href,
      pageTitle: document.title,
      element: {
        label: humanLabel, description: humanLabel, tag: eff.tag,
        elementId: eff.id, elementName: eff.name, placeholder: eff.placeholder,
        locatorData: locData
      },
      value: el.value,
      isMasked: isPass
    });
  }, true);

  // ── Change events (checkbox, radio, select) ───────────────────────────────
  document.addEventListener('change', function (e) {
    var el = e.target;
    if (!el) return;

    if (el.type === 'checkbox' || el.type === 'radio') {
      var locData = _getAllLocators(el);
      var eff     = locData.effectiveEl;
      var cbLabel = _getAssocLabel(el) || eff.ariaLabel || eff.id || eff.name || eff.tag;

      // For generic grid/list checkboxes (aria-label like "Deselect row", "Select row"),
      // find the closest row/list-item and use its text content as a unique identifier.
      // This lets the code generator produce: page.locator('tr:has-text("FormName") input[type="checkbox"]')
      var rowContext = '';
      if (/^(de)?select\s*row$/i.test(cbLabel) || /^(de)?select\s*all$/i.test(cbLabel) || cbLabel === el.tagName.toLowerCase()) {
        var row = el.closest('tr') || el.closest('li') || el.closest('[role="row"]') || el.closest('[role="listitem"]');
        if (row) {
          var txt = (row.textContent || '').replace(/\\s+/g, ' ').trim().substring(0, 60);
          if (txt) rowContext = txt;
        }
      }

      window.__devxqe_send({
        type: el.checked ? 'check' : 'uncheck',
        url: window.location.href,
        pageTitle: document.title,
        element: {
          label: cbLabel, description: cbLabel, tag: eff.tag,
          elementId: eff.id, elementName: eff.name, locatorData: locData
        },
        rowContext: rowContext || undefined
      });
      return;
    }

    if (el.tagName === 'SELECT') {
      var locData = _getAllLocators(el);
      var eff     = locData.effectiveEl;
      var selLabel = eff.ariaLabel || eff.name || eff.id || eff.tag;
      // Support multi-select: collect all selected options
      var selectedOpts = el.selectedOptions ? Array.from(el.selectedOptions) : [];
      if (!selectedOpts.length && el.selectedIndex >= 0) {
        selectedOpts = [el.options[el.selectedIndex]];
      }
      var selectedValues = selectedOpts.map(function(o) { return o.value; }).join(',');
      var selectedTexts  = selectedOpts.map(function(o) { return o.text; }).join(', ');
      window.__devxqe_send({
        type: 'select',
        url: window.location.href,
        pageTitle: document.title,
        element: {
          label: selLabel, description: selLabel, tag: eff.tag,
          elementId: eff.id, elementName: eff.name, locatorData: locData
        },
        value: selectedValues,
        displayText: selectedTexts,
        isMulti: selectedOpts.length > 1
      });
    }
  }, true);

  // ── Kendo widget value change listener ─────────────────────────────────────
  // Hooks directly into Kendo's jQuery API to bind 'change' events on widgets.
  // This is far more reliable than DOM polling — it fires immediately when the
  // user selects an option, regardless of Kendo version or animation timing.
  // Re-scans periodically to catch dynamically created widgets (SPA pages).
  (function initKendoListener() {
    var _boundWidgets = new Set();
    var _lastEmitKey = '';
    var _lastEmitTime = 0;

    function _emitKendoEvent(widgetType, widget, wrapper) {
      try {
        var label = _getKendoLabel(wrapper);

        // ── Get the unique ID of the widget's underlying element ──────────
        // Kendo widgets always have an inner <select> or <input> with a unique ID
        // (e.g., ddlFormSubmittedParent). The wrapper <span> has no stable ID.
        // The listbox popup is always: <ul id="ddlFormSubmittedParent_listbox">
        var elemId = '';
        try {
          if (widget.element && widget.element[0] && widget.element[0].id) {
            elemId = widget.element[0].id;
          }
        } catch(e1) {}
        if (!elemId) {
          var inner = wrapper.querySelector('select[id], input[id], [data-role][id]');
          if (inner) elemId = inner.id;
        }
        if (!elemId) elemId = wrapper.id || '';

        // ── Build an ID-based locator (stable, unique, never generic //span) ──
        var locData;
        if (elemId) {
          locData = {
            primary: { strategy: 'id', playwright: "page.locator('#" + elemId + "')", xpath: "//*[@id='" + elemId + "']", confidence: 10 },
            effectiveEl: { id: elemId, tag: 'select', name: elemId },
            all: [
              { strategy: 'id', playwright: "page.locator('#" + elemId + "')", xpath: "//*[@id='" + elemId + "']", confidence: 10 },
              { strategy: 'kendo-wrapper', playwright: "page.locator('span[aria-owns=" + elemId + "_listbox]')", xpath: "//span[@aria-owns='" + elemId + "_listbox']", confidence: 9 }
            ]
          };
        } else {
          locData = _getAllLocators(wrapper);
        }

        if (widgetType === 'dropdownlist' || widgetType === 'combobox') {
          var text = widget.text ? widget.text() : '';
          var val  = widget.value ? String(widget.value()) : '';
          if (!text && !val) return;
          // Simple dedup: same widget+text within 2s
          var key = elemId + '|' + text;
          if (key === _lastEmitKey && (Date.now() - _lastEmitTime) < 2000) return;
          _lastEmitKey = key; _lastEmitTime = Date.now();
          window.__devxqe_send({
            type: 'kendo_select', url: window.location.href, pageTitle: document.title,
            widgetType: widgetType, selectedText: text, selectedValue: val,
            kendoInputId: elemId, kendoWidgetType: widgetType,
            element: { label: label, description: label, tag: 'kendo-' + widgetType,
              elementId: elemId, locatorData: locData }
          });
        } else if (widgetType === 'datepicker' || widgetType === 'datetimepicker' || widgetType === 'timepicker') {
          var dateVal = widget.value ? widget.value() : null;
          var inp = wrapper.querySelector('input');
          var formatted = inp ? inp.value : (dateVal ? String(dateVal) : '');
          if (!formatted) return;
          window.__devxqe_send({
            type: 'kendo_date', url: window.location.href, pageTitle: document.title,
            value: dateVal ? (dateVal.toISOString ? dateVal.toISOString() : String(dateVal)) : formatted,
            formattedValue: formatted,
            kendoInputId: elemId, kendoWidgetType: widgetType,
            element: { label: label, description: label, tag: 'kendo-datepicker',
              elementId: elemId, locatorData: locData }
          });
        } else if (widgetType === 'multiselect') {
          var items = [];
          try {
            if (widget.dataItems) items = widget.dataItems().map(function(d) { return d.text || d.Text || String(d); });
          } catch(e2) {}
          if (!items.length) {
            wrapper.querySelectorAll('.k-chip-text, .k-button-text, li.k-button').forEach(function(t) {
              items.push((t.textContent || '').trim());
            });
          }
          if (!items.length) return;
          window.__devxqe_send({
            type: 'kendo_multiselect', url: window.location.href, pageTitle: document.title,
            selectedItems: items, selectedText: items.join(', '),
            kendoInputId: elemId, kendoWidgetType: widgetType,
            element: { label: label, description: label, tag: 'kendo-multiselect',
              elementId: elemId, locatorData: locData }
          });
        } else if (widgetType === 'numerictextbox') {
          var numVal = widget.value ? String(widget.value()) : '';
          if (!numVal) return;
          window.__devxqe_send({
            type: 'input', url: window.location.href, pageTitle: document.title,
            element: { label: label, description: label, tag: 'input',
              elementId: elemId, locatorData: locData },
            value: numVal, isMasked: false
          });
        }
      } catch(err) {
        // Never crash the recorder — silently skip this Kendo event
      }
    }

    // Kendo data-role values are lowercase but jQuery data keys are camelCase.
    // "dropdownlist" → "kendoDropDownList", NOT "kendoDropdownlist"
    var KENDO_DATA_KEYS = {
      'dropdownlist': 'kendoDropDownList', 'combobox': 'kendoComboBox',
      'datepicker': 'kendoDatePicker', 'datetimepicker': 'kendoDateTimePicker',
      'timepicker': 'kendoTimePicker', 'multiselect': 'kendoMultiSelect',
      'numerictextbox': 'kendoNumericTextBox', 'grid': 'kendoGrid',
      'tabstrip': 'kendoTabStrip', 'treeview': 'kendoTreeView',
      'slider': 'kendoSlider', 'switch': 'kendoSwitch',
      'upload': 'kendoUpload', 'editor': 'kendoEditor'
    };

    function _bindKendoWidgets() {
      var jq = window.$ || window.jQuery;
      if (!jq) return;

      // Find all elements with data-role attribute (Kendo's standard marker)
      var kendoEls = document.querySelectorAll('[data-role]');
      kendoEls.forEach(function(el) {
        var uid = el.id || el.getAttribute('data-role') + '|' + (el.name || '') + '|' + el.className.substring(0, 30);
        if (_boundWidgets.has(uid)) return;

        var role = el.getAttribute('data-role');
        var widgetName = KENDO_DATA_KEYS[role];
        var widget;
        try { widget = jq(el).data(widgetName); } catch(e) {}
        if (!widget) return;

        // Find the outermost Kendo wrapper
        var wrapper = el.closest('.k-widget, .k-dropdownlist, .k-dropdown, .k-combobox, .k-datepicker, .k-datetimepicker, .k-timepicker, .k-multiselect, .k-numerictextbox') || el.parentElement || el;

        // Bind Kendo's native change event
        try {
          widget.bind('change', function() {
            _emitKendoEvent(role, widget, wrapper);
          });
          _boundWidgets.add(uid);
        } catch(e) {}
      });

      // Also try finding widgets via k-widget class wrappers (fallback)
      document.querySelectorAll('.k-widget[data-role], .k-dropdown, .k-combobox, .k-datepicker, .k-multiselect, .k-numerictextbox').forEach(function(wrapper) {
        var inner = wrapper.querySelector('[data-role]') || wrapper;
        var uid = 'wrap|' + (inner.id || inner.getAttribute('data-role') || '') + '|' + wrapper.className.substring(0, 30);
        if (_boundWidgets.has(uid)) return;

        var role = inner.getAttribute('data-role') || wrapper.className.match(/k-(dropdown|combobox|datepicker|multiselect|numerictextbox)/);
        if (!role) return;
        if (typeof role === 'object') role = role[1]; // regex match
        // Map "dropdown" (from CSS class) to "dropdownlist" (Kendo role name)
        if (role === 'dropdown') role = 'dropdownlist';

        var widgetName = KENDO_DATA_KEYS[role];
        if (!widgetName) widgetName = 'kendo' + role.charAt(0).toUpperCase() + role.slice(1);
        var widget;
        try { widget = jq(inner).data(widgetName) || jq(wrapper).data(widgetName); } catch(e) {}
        if (!widget) return;

        try {
          widget.bind('change', function() {
            _emitKendoEvent(role, widget, wrapper);
          });
          _boundWidgets.add(uid);
        } catch(e) {}
      });

      // ── Bind Kendo Grid save events for inline editing capture ──────────
      document.querySelectorAll('[data-role="grid"]').forEach(function(gridEl) {
        var gridUid = 'grid|' + (gridEl.id || '') + '|save';
        if (_boundWidgets.has(gridUid)) return;
        var jqGrid = jq(gridEl);
        var grid = jqGrid.data('kendoGrid');
        if (!grid) return;
        try {
          grid.bind('save', function(ev) {
            var model = ev.model;
            var container = ev.container;
            if (!model || !container) return;
            // Find which column was edited
            var cell = container.closest('td');
            var field = cell ? cell.attr('data-field') || '' : '';
            var rowIndex = cell ? cell.closest('tr').index() : -1;
            var value = '';
            // Try to get the edited value from the input
            var input = container.find('input');
            if (input.length) {
              var picker = input.data('kendoDatePicker') || input.data('kendoDateTimePicker');
              if (picker && picker.value()) {
                value = picker.value().toString();
              } else {
                value = input.val() || '';
              }
            }
            window.__devxqe_send({
              type: 'kendo_grid_edit',
              url: window.location.href,
              pageTitle: document.title,
              gridId: gridEl.id,
              rowIndex: rowIndex,
              columnField: field,
              value: value,
              editorType: picker ? 'datepicker' : 'text',
              element: {
                label: field + ' (row ' + (rowIndex + 1) + ')',
                description: 'Grid cell edit: ' + field,
                tag: 'kendo-grid-cell',
                elementId: gridEl.id,
                locatorData: _getAllLocators(gridEl)
              }
            });
          });
          _boundWidgets.add(gridUid);
        } catch(e) {}
      });
    }

    // ── MutationObserver: watch for new Kendo widgets being added to the DOM ──
    // Replaces fixed timeouts (1s/3s/6s) with reactive detection.
    // When new [data-role] elements appear (page nav, modal open, radio enabling),
    // we debounce and re-scan for widgets to bind.
    var _bindDebounce = null;
    function _debouncedBind() {
      if (_bindDebounce) clearTimeout(_bindDebounce);
      _bindDebounce = setTimeout(function() {
        _bindKendoWidgets();
        // Also build the _kendoRegistry for the element classifier (P0-B)
        if (typeof _kendoRegistry !== 'undefined') {
          var jq = window.$ || window.jQuery;
          if (jq) {
            document.querySelectorAll('[data-role]').forEach(function(el) {
              if (el.id) {
                var role = el.getAttribute('data-role');
                _kendoRegistry[el.id] = {
                  type: role,
                  label: el.id,
                  disabled: el.disabled || false
                };
              }
            });
          }
        }
      }, 300);
    }

    // Initial bind after page load
    setTimeout(_debouncedBind, 500);
    setTimeout(_debouncedBind, 2000);

    // Watch for DOM mutations (new widgets added by SPA navigation, modals, AJAX)
    if (typeof MutationObserver !== 'undefined') {
      var observer = new MutationObserver(function(mutations) {
        var hasNewWidgets = false;
        for (var i = 0; i < mutations.length; i++) {
          var m = mutations[i];
          if (m.type === 'childList' && m.addedNodes.length) {
            for (var j = 0; j < m.addedNodes.length; j++) {
              var node = m.addedNodes[j];
              if (node.nodeType === 1 && (node.getAttribute('data-role') ||
                  (node.querySelector && node.querySelector('[data-role]')))) {
                hasNewWidgets = true;
                break;
              }
            }
          }
          if (m.type === 'attributes' && m.attributeName === 'data-role') hasNewWidgets = true;
          if (hasNewWidgets) break;
        }
        if (hasNewWidgets) _debouncedBind();
      });
      observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-role'] });
    }

    // Also re-bind after radio/checkbox changes (enable/disable Kendo widgets)
    document.addEventListener('change', function(e) {
      var el = e.target;
      if (el && (el.type === 'radio' || el.type === 'checkbox')) {
        setTimeout(_debouncedBind, 500);
        setTimeout(_debouncedBind, 1500);
      }
    }, true);
  })();

  // ── SPA navigation (pushState / replaceState) ─────────────────────────────
  var _lastUrl = window.location.href;
  function _checkNav() {
    var u = window.location.href;
    if (u !== _lastUrl) {
      window.__devxqe_send({ type: 'navigation', fromUrl: _lastUrl, toUrl: u, url: u, pageTitle: document.title });
      _lastUrl = u;
    }
  }
  var _push = history.pushState.bind(history);
  var _repl = history.replaceState.bind(history);
  history.pushState    = function () { _push.apply(history, arguments);    setTimeout(_checkNav, 150); };
  history.replaceState = function () { _repl.apply(history, arguments);    setTimeout(_checkNav, 150); };
  window.addEventListener('popstate', function () { setTimeout(_checkNav, 150); });

  // ── Assert Mode ──────────────────────────────────────────────────────────────
  var _assertMode = false;

  // Exposed as a global so pw.page.evaluate() can toggle assert mode directly
  // without relying on MessageEvent dispatch (which can be unreliable cross-Playwright versions).
  window.__dxqe_setAssertMode = function(on) {
    _assertMode = !!on;
    document.body.style.cursor = on ? 'crosshair' : '';
    if (!on) { var old = document.getElementById('__dxqe_hl'); if (old) old.remove(); }
  };

  function _getAssertElInfo(el) {
    var tag = el.tagName.toLowerCase();
    var text = (el.innerText || el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 120);
    var val = el.value || '';
    var ph = el.getAttribute('placeholder') || '';
    var al = el.getAttribute('aria-label') || '';
    var nm = el.getAttribute('name') || '';
    var tp = el.getAttribute('type') || '';
    var lbl = al || ph || nm || text.slice(0, 60) || tag;
    var isInp = ['input','textarea','select'].includes(tag);
    var isCb = tp === 'checkbox' || tp === 'radio';
    var attrs = {};
    ['href','src','alt','title','data-testid','id'].forEach(function(a) { var v = el.getAttribute(a); if (v) attrs[a] = v; });
    return { tag: tag, text: text, value: val, placeholder: ph, ariaLabel: al, name: nm, type: tp, label: lbl, isInput: isInp, isCheckbox: isCb, isChecked: el.checked || false, attrs: attrs };
  }

  function _setAssertHighlight(el) {
    var old = document.getElementById('__dxqe_hl');
    if (old) old.remove();
    if (!el) return;
    var r = el.getBoundingClientRect();
    var d = document.createElement('div');
    d.id = '__dxqe_hl';
    d.style.cssText = 'position:fixed;z-index:2147483647;pointer-events:none;border:2px solid #f59e0b;border-radius:3px;background:rgba(245,158,11,0.10);box-shadow:0 0 0 3000px rgba(0,0,0,0.25);';
    d.style.top = (r.top - 2) + 'px';
    d.style.left = (r.left - 2) + 'px';
    d.style.width = (r.width + 4) + 'px';
    d.style.height = (r.height + 4) + 'px';
    document.body.appendChild(d);
  }

  // Listen for assert mode toggle dispatched via pw.page.evaluate(...)
  window.addEventListener('message', function(e) {
    if (!e.data || e.data.target !== '__devxqe_assert') return;
    if (e.data.mode === 'on') {
      _assertMode = true;
      document.body.style.cursor = 'crosshair';
    } else {
      _assertMode = false;
      document.body.style.cursor = '';
      var old = document.getElementById('__dxqe_hl');
      if (old) old.remove();
    }
  });

  document.addEventListener('mouseover', function(e) {
    if (!_assertMode) return;
    var el = e.target;
    if (!el || el.id === '__dxqe_hl') return;
    _setAssertHighlight(el);
  }, true);

  document.addEventListener('click', function(e) {
    if (!_assertMode) return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    var el = e.target;
    if (!el || el.id === '__dxqe_hl') return;
    var info = _getAssertElInfo(el);
    window.__devxqe_send({ type: 'assert_element', url: window.location.href, pageTitle: document.title, elementInfo: info });
  }, true);

})();
`;

  // POST /api/recorder/playwright-start
  // Body: { sessionId: string, url: string }
  // Launches a headed Playwright Chromium, injects recorder, navigates to url.
  // All captured events are forwarded into the existing session SSE stream.
  app.post('/api/recorder/playwright-start', async (req: Request, res: Response) => {
    const { sessionId, url: targetUrl } = req.body as { sessionId: string; url: string };
    if (!sessionId || !targetUrl) {
      return res.status(400).json({ error: 'sessionId and url are required' });
    }

    const sid = (sessionId as string).toUpperCase();
    const session = sessions.get(sid);
    if (!session) return res.status(404).json({ error: 'Session not found — create one first via POST /api/recorder/sessions' });

    // If a browser is already running for this session, close it first
    const existing = pwBrowsers.get(sid);
    if (existing) {
      try { await existing.browser.close(); } catch {}
      pwBrowsers.delete(sid);
    }

    try {
      // Ensure a virtual X display is running on Linux containers (Azure, Docker)
      const { ensureXvfb, getBrowserExecutablePath } = await import('./playwright-setup');
      ensureXvfb();

      // Dynamic import so the module is only loaded when needed
      const { chromium } = await import('playwright');
      const display = process.env.DISPLAY || ':99';
      const browser = await chromium.launch({
        headless: false,
        slowMo: 0,
        executablePath: getBrowserExecutablePath() ?? undefined,
        env: { ...process.env, DISPLAY: display },
        args: [
          '--start-maximized',
          '--disable-blink-features=AutomationControlled', // hides navigator.webdriver
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-infobars',
        ],
      });
      const context = await browser.newContext({
        viewport: null,          // null = use the real screen size (maximized window)
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      });

      const page = await context.newPage();
      const popupPages = new Set<string>(); // track popup page URLs for isPopup tagging

      // Expose __devxqe_send on the CONTEXT (not page) so it works on ALL pages
      // including popups, new tabs, and window.open() — no per-page setup needed.
      await context.exposeFunction('__devxqe_send', (eventData: Record<string, unknown>) => {
        if (session.status === 'stopped') return;
        session.status = 'recording';

        const eventUrl = String(eventData.url || '');
        const isFromPopup = popupPages.has(eventUrl) ||
          [...popupPages].some(pu => eventUrl.startsWith(new URL(pu).origin));

        const seq = session.events.length + 1;
        // Detect if this event is from an iframe (different origin than session start)
        const sessionStartUrl = session.events.length > 0
          ? String((session.events[0] as any).url || '')
          : eventUrl;
        let inIframe = false;
        let iframeOrigin = '';
        try {
          const startOrigin = new URL(sessionStartUrl).origin;
          const evOrigin    = new URL(eventUrl).origin;
          if (evOrigin !== startOrigin && !isFromPopup) {
            inIframe = true;
            iframeOrigin = evOrigin;
          }
        } catch {}

        const ev: RecordingEvent = {
          sequence: seq,
          timestamp: Date.now(),
          sessionId: sid,
          type: String(eventData.type || 'unknown'),
          url: eventUrl,
          pageTitle: String(eventData.pageTitle || ''),
          ...eventData,
          ...(isFromPopup ? { isPopup: true } : {}),
          ...(inIframe ? { inIframe: true, iframeOrigin } : {}),
          sessionStartUrl,
        };
        // Add natural-language step
        const nl = toNaturalLanguage(ev, seq);
        if (nl) (ev as any).naturalLanguage = nl;

        session.events.push(ev);
        broadcastToUI(session, 'recording_event', ev);
      });

      // Inject recorder into every page/frame that loads
      await context.addInitScript(PW_RECORDER_INIT);

      // Also handle full-page navigations (new pages fire page_load via init script,
      // but we also track them server-side for robustness)
      page.on('framenavigated', (frame) => {
        if (frame !== page.mainFrame()) return;
        const navUrl = frame.url();
        // Skip internal browser pages — not meaningful steps
        if (!navUrl || navUrl.startsWith('about:') || navUrl.startsWith('data:')) return;
        // The init script also fires page_load; this is a safety net for redirects
        // Debounce: skip if last event is already a page_load for this url
        const last = session.events[session.events.length - 1];
        if (last?.url === navUrl && last?.type === 'page_load') return;
        const seq = session.events.length + 1;
        const sessionStartUrl = session.events.length > 0 ? String((session.events[0] as any).url || navUrl) : navUrl;
        const ev: RecordingEvent = {
          sequence: seq, timestamp: Date.now(), sessionId: sid,
          type: 'page_load', url: navUrl, pageTitle: '',
          sessionStartUrl,
          naturalLanguage: `Step ${seq}: Navigate to ${navUrl}`,
        };
        session.events.push(ev);
        broadcastToUI(session, 'recording_event', ev);
      });

      // ── Popup / new window detection ───────────────────────────────────────
      // When the tested app opens a popup (window.open, target="_blank", etc.),
      // expose __devxqe_send on it so recording continues seamlessly across windows.
      context.on('page', async (popupPage) => {
        try {
          // __devxqe_send is already exposed at context level — works on all pages.
          // We just need to emit popup lifecycle events for the code generator.
          await popupPage.waitForLoadState('domcontentloaded').catch(() => {});
          popupPages.add(popupPage.url());
          const popupUrl = popupPage.url();

          // Emit a popup_opened event so the code generator can insert context switch
          const seq = session.events.length + 1;
          const ev: RecordingEvent = {
            sequence: seq, timestamp: Date.now(), sessionId: sid,
            type: 'popup_opened', url: popupUrl, pageTitle: '',
            naturalLanguage: `Step ${seq}: Popup window opened → ${popupUrl}`,
          };
          session.events.push(ev);
          broadcastToUI(session, 'recording_event', ev);

          // Track popup navigations
          popupPage.on('framenavigated', (frame) => {
            if (frame !== popupPage.mainFrame()) return;
            const navUrl = frame.url();
            if (!navUrl || navUrl.startsWith('about:') || navUrl.startsWith('data:')) return;
            const last = session.events[session.events.length - 1];
            if (last?.url === navUrl && last?.type === 'page_load') return;
            const s = session.events.length + 1;
            const navEv: RecordingEvent = {
              sequence: s, timestamp: Date.now(), sessionId: sid,
              type: 'page_load', url: navUrl, pageTitle: '',
              isPopup: true,
              naturalLanguage: `Step ${s}: Popup navigated to ${navUrl}`,
            };
            session.events.push(navEv);
            broadcastToUI(session, 'recording_event', navEv);
          });

          // Detect when popup closes
          popupPage.on('close', () => {
            const s = session.events.length + 1;
            const closeEv: RecordingEvent = {
              sequence: s, timestamp: Date.now(), sessionId: sid,
              type: 'popup_closed', url: popupUrl, pageTitle: '',
              naturalLanguage: `Step ${s}: Popup window closed`,
            };
            session.events.push(closeEv);
            broadcastToUI(session, 'recording_event', closeEv);
          });
        } catch (err) {
          // Non-fatal — popup recording enhancement, main page still works
        }
      });

      // Clean up when the user closes the browser window manually
      browser.on('disconnected', () => {
        pwBrowsers.delete(sid);
        if (session.status === 'recording') {
          session.status = 'stopped';
          broadcastToUI(session, 'recording_stopped', { sessionId: sid, eventCount: session.events.length, reason: 'browser_closed' });
        }
      });

      pwBrowsers.set(sid, { browser, context, page });
      session.status = 'recording';

      // Navigate to the target URL
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

      res.json({ success: true, message: 'Playwright browser launched. Record your workflow, then stop via DELETE /api/recorder/playwright-stop/:sessionId' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE /api/recorder/playwright-stop/:sessionId
  // Closes the Playwright browser for the given session.
  app.delete('/api/recorder/playwright-stop/:sessionId', async (req: Request, res: Response) => {
    const sid = (req.params.sessionId as string).toUpperCase();
    const pw = pwBrowsers.get(sid);
    if (!pw) return res.status(404).json({ error: 'No active Playwright browser for this session' });

    try {
      await pw.browser.close();
    } catch {}
    pwBrowsers.delete(sid);

    const session = sessions.get(sid);
    if (session) {
      session.status = 'stopped';
      broadcastToUI(session, 'recording_stopped', { sessionId: sid, eventCount: session.events.length });
    }

    res.json({ success: true, message: 'Playwright browser closed and session stopped.' });
  });

  // POST /api/recorder/assert-mode — toggle assert mode in the live Playwright browser
  // Body: { sessionId: string, mode: 'on' | 'off' }
  app.post('/api/recorder/assert-mode', async (req: Request, res: Response) => {
    const { sessionId, mode } = req.body as { sessionId: string; mode: 'on' | 'off' };
    if (!sessionId || !mode) return res.status(400).json({ error: 'sessionId and mode required' });

    const sid = (sessionId as string).toUpperCase();
    const pw = pwBrowsers.get(sid);
    if (!pw) {
      // Browser not registered in this server instance (e.g. server restarted).
      // Return 200 so the client banner stays visible — user just needs to
      // Stop Playwright and re-open to re-register the session.
      return res.json({ success: false, mode, warning: 'No active Playwright browser — stop and re-open Playwright to reconnect' });
    }

    // Diagnostic: check page state first
    try {
      const pageUrl = pw.page.url();
      console.log(`[Assert] mode=${mode} page=${pageUrl} closed=${pw.page.isClosed()}`);
    } catch(e: any) {
      console.error('[Assert] page check failed:', e.message);
      return res.status(500).json({ error: 'Playwright page is unavailable: ' + e.message });
    }

    // The JS snippet injected into the live Playwright page.
    // Plain JS — no TypeScript syntax — safe for page.evaluate serialisation.
    const ASSERT_JS = `(function() {
  if (typeof window.__dxqe_assertOff === 'function') window.__dxqe_assertOff();

  function setHL(el) {
    var old = document.getElementById('__dxqe_hl');
    if (old) old.remove();
    if (!el) return;
    var r = el.getBoundingClientRect();
    var d = document.createElement('div');
    d.id = '__dxqe_hl';
    d.style.cssText = 'position:fixed;z-index:2147483647;pointer-events:none;' +
      'border:3px solid #f59e0b;border-radius:3px;background:rgba(245,158,11,0.15);' +
      'box-shadow:0 0 0 3000px rgba(0,0,0,0.28);transition:all 0.08s ease;';
    d.style.top    = (r.top    - 2) + 'px';
    d.style.left   = (r.left   - 2) + 'px';
    d.style.width  = (r.width  + 4) + 'px';
    d.style.height = (r.height + 4) + 'px';
    document.body.appendChild(d);
  }

  function getInfo(el) {
    var tag  = el.tagName.toLowerCase();
    var text = (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 120);
    var val  = el.value || '';
    var ph   = el.getAttribute('placeholder') || '';
    var al   = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') && '' || '';
    // Try aria-label attribute first
    al = el.getAttribute('aria-label') || '';
    var nm   = el.getAttribute('name') || '';
    var tp   = el.getAttribute('type') || '';
    var isInp = /^(input|textarea|select)$/.test(tag);
    var isCb  = tp === 'checkbox' || tp === 'radio';

    // Resolve label — priority: associated <label> > aria-label > visible text > placeholder > name > type+tag
    var lbl = '';
    var id = el.id;
    if (id) { var lb = document.querySelector('label[for="' + id + '"]'); if (lb) lbl = (lb.textContent || '').trim(); }
    if (!lbl) { var lb2 = el.closest('label'); if (lb2) lbl = (lb2.textContent || '').replace(text, '').trim(); }
    if (!lbl) lbl = al;
    if (!lbl) lbl = text.slice(0, 60);
    if (!lbl) lbl = ph;
    if (!lbl) lbl = nm;
    if (!lbl && tp) lbl = tp + ' ' + tag;   // e.g. "submit button", "email input"
    if (!lbl) lbl = tag;                     // last resort: "div", "span", etc.

    // Collect key attrs for attribute-type assertions
    var attrs = {};
    ['href','src','alt','title','data-testid','id','role','class'].forEach(function(a) {
      var v = el.getAttribute(a); if (v) attrs[a] = v.slice(0, 100);
    });

    return { tag: tag, text: text, value: val, placeholder: ph, ariaLabel: al,
             name: nm, type: tp, label: lbl, isInput: isInp, isCheckbox: isCb,
             isChecked: el.checked || false, attrs: attrs };
  }

  function onOver(e) {
    var el = e.target;
    if (!el || el.id === '__dxqe_hl') return;
    setHL(el);
  }

  function onClick(e) {
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    var el = e.target;
    if (!el || el.id === '__dxqe_hl') return;
    if (typeof window.__devxqe_send === 'function') {
      window.__devxqe_send({ type: 'assert_element', url: window.location.href,
        pageTitle: document.title, elementInfo: getInfo(el) });
    }
  }

  document.body.style.cursor = 'crosshair';
  document.addEventListener('mouseover', onOver,  true);
  document.addEventListener('click',     onClick, true);

  window.__dxqe_assertOff = function() {
    document.body.style.cursor = '';
    var hl = document.getElementById('__dxqe_hl');
    if (hl) hl.remove();
    document.removeEventListener('mouseover', onOver,  true);
    document.removeEventListener('click',     onClick, true);
    delete window.__dxqe_assertOff;
  };
  return 'ok';
})()`;

    try {
      if (mode === 'on') {
        // Inject on the current page immediately
        const result = await pw.page.evaluate(ASSERT_JS);
        console.log(`[Assert] inject result for ${sid}:`, result);

        // Re-inject after every navigation so assert mode survives page loads
        const reinject = async () => {
          try { await pw.page.evaluate(ASSERT_JS); } catch (e) { /* navigating */ }
        };
        // Remove any previous listener before adding a new one
        if ((pw as any)._assertReinject) {
          pw.page.off('load', (pw as any)._assertReinject);
        }
        pw.page.on('load', reinject);
        (pw as any)._assertReinject = reinject;

      } else {
        // Remove navigation listener
        if ((pw as any)._assertReinject) {
          pw.page.off('load', (pw as any)._assertReinject);
          delete (pw as any)._assertReinject;
        }
        // Clean up the current page
        await pw.page.evaluate(`
          if (typeof window.__dxqe_assertOff === 'function') window.__dxqe_assertOff();
        `).catch(() => {});
      }
      res.json({ success: true, mode });
    } catch (err: any) {
      // Log full error — bypass the 80-char HTTP log truncation
      console.error('[Assert] FULL ERROR:', err.message);
      console.error('[Assert] STACK:', err.stack?.split('\n').slice(0,4).join(' | '));
      // Return 200 so the UI banner stays visible — user sees assert mode ON
      // even if injection failed (they can try navigating to trigger reinject)
      res.json({ success: false, mode, error: err.message });
    }
  });

  // POST /api/recorder/heal-locator — AI-powered locator healing
  // When a locator fails, this calls Claude to find the correct XPath from the page HTML
  app.post('/api/recorder/heal-locator', async (req: Request, res: Response) => {
    const { failingLocator, errorMessage, pageHtml, screenshotBase64, elementDescription } = req.body;
    if (!failingLocator && !elementDescription) {
      return res.status(400).json({ error: 'failingLocator or elementDescription required' });
    }

    try {
      const Anthropic = require('@anthropic-ai/sdk').default;
      const client = new Anthropic({
        apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY,
      });

      const htmlSnippet = pageHtml ? pageHtml.slice(0, 15000) : '(not provided)';

      const messages: any[] = [
        {
          role: 'user',
          content: [
            ...(screenshotBase64 ? [{
              type: 'image',
              source: { type: 'base64', media_type: 'image/png', data: screenshotBase64 }
            }] : []),
            {
              type: 'text',
              text: `You are an expert Playwright test automation engineer. A locator has failed.

FAILING LOCATOR: ${failingLocator || 'unknown'}
ELEMENT DESCRIPTION: ${elementDescription || 'unknown'}
ERROR: ${errorMessage || 'Element not found'}

PAGE HTML (truncated):
${htmlSnippet}

Your task: Find the correct XPath locator for this element.

Rules:
1. Use XPath with page.locator('xpath=...') format
2. Prefer: @id (non-generated) > @data-testid > @aria-label > @name > text-based
3. Never use auto-generated IDs (mat-input-N, input_1234, GUIDs)
4. Scope to closest stable container if element text is not unique
5. If the element opens in a new tab (target="_blank"), note that with isNewTab: true

Respond with JSON only:
{
  "fixedLocator": "page.locator('xpath=...')",
  "confidence": 0-100,
  "explanation": "why this locator works",
  "isNewTab": false,
  "fallbackLocators": ["page.locator('...')", "page.locator('...')"]
}`
            }
          ]
        }
      ];

      const response = await client.messages.create({
        model: 'claude-opus-4-5',
        max_tokens: 1024,
        messages,
      });

      const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { fixedLocator: failingLocator, confidence: 0, explanation: 'Could not parse AI response' };

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message, fixedLocator: failingLocator, confidence: 0 });
    }
  });
}

// ─── Playwright Executor ──────────────────────────────────────────────────────

interface PlaywrightExecution {
  status: 'running' | 'passed' | 'failed';
  output: any[];
  clients: Response[];
}

const executions = new Map<string, PlaywrightExecution>();

// Scripts are written inside the project so @playwright/test resolves from project node_modules
const PROJECT_ROOT = path.resolve(__dirname, '..');
const PW_SCRIPTS_DIR = path.join(PROJECT_ROOT, 'recorded-scripts');
const PW_CONFIG = path.join(PROJECT_ROOT, 'playwright-recorder.config.ts');

const DATA_DIR = path.join(PROJECT_ROOT, 'recorder-data');
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ── JSON file helpers ────────────────────────────────────────────────────────
function readJson<T>(file: string, fallback: T): T {
  try { return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8')); } catch { return fallback; }
}
function writeJson(file: string, data: unknown) {
  ensureDataDir();
  fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2), 'utf8');
}

/**
 * Write helpers/universal.ts at the project root so standalone recorded scripts
 * (recorded-scripts/exec-*.spec.ts) can resolve the `../helpers/universal` import.
 * This is idempotent — always overwritten with the latest version.
 */
function ensureRootHelpers() {
  const helpersDir = path.join(PROJECT_ROOT, 'helpers');
  if (!fs.existsSync(helpersDir)) fs.mkdirSync(helpersDir, { recursive: true });
  fs.writeFileSync(path.join(helpersDir, 'universal.ts'), UNIVERSAL_HELPERS_CONTENT, 'utf8');
  fs.writeFileSync(path.join(helpersDir, 'kendo.ts'), KENDO_HELPERS_CONTENT, 'utf8');
}

/**
 * Derives a site-specific password env var name from the recording URL.
 * e.g. "https://ap-forms.rediker.com/..." → "REDIKER_PASSWORD"
 *      "https://app.salesforce.com/..."   → "SALESFORCE_PASSWORD"
 */
function derivePasswordEnvVar(url: string): string {
  try {
    const hostname = new URL(url).hostname;           // "ap-forms.rediker.com"
    const parts = hostname.split('.');
    const domain = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
    return domain.toUpperCase().replace(/[^A-Z0-9]/g, '_') + '_PASSWORD';
  } catch {
    return 'TEST_PASSWORD';
  }
}

/**
 * Auto-writes a key=value pair to the root .env file.
 * Overwrites the key if it already exists; appends if new.
 * Called automatically when a password field is recorded — zero manual steps needed.
 */
function autoUpdateEnvFile(key: string, value: string): void {
  const envPath = path.join(PROJECT_ROOT, '.env');
  let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  const lines = content.split('\n');
  const idx = lines.findIndex(l => l.startsWith(`${key}=`));
  const newLine = `${key}=${value}`;
  if (idx >= 0) {
    lines[idx] = newLine;
  } else {
    // Add after the last non-empty line
    const lastNonEmpty = lines.reduce((acc, l, i) => l.trim() ? i : acc, -1);
    lines.splice(lastNonEmpty + 1, 0, newLine);
  }
  fs.writeFileSync(envPath, lines.join('\n'), 'utf8');
}

function ensurePwConfig() {
  if (!fs.existsSync(PW_SCRIPTS_DIR)) fs.mkdirSync(PW_SCRIPTS_DIR, { recursive: true });
  ensureRootHelpers();
  fs.writeFileSync(PW_CONFIG, `import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './recorded-scripts',
  use: {
    headless: false,
    viewport: null,
    launchOptions: {
      args: [
        '--start-maximized',
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--disable-infobars',
      ],
    },
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  timeout: 180000,
  retries: 0,
});
`);
}

function broadcastExec(exec: PlaywrightExecution, event: any) {
  exec.output.push(event);
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  exec.clients.forEach(c => { try { c.write(payload); } catch {} });
}

// ─── Failure Screenshot Analyser ─────────────────────────────────────────────

const visionClient = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY || '',
});

/** Find the first PNG failure screenshot Playwright wrote for this execution */
function findFailureScreenshot(execId: string): string | null {
  const testResultsDir = path.join(PROJECT_ROOT, 'test-results');
  if (!fs.existsSync(testResultsDir)) return null;
  // Playwright names folders like: exec-1234567-Recorded-flow/
  const entries = fs.readdirSync(testResultsDir);
  const match = entries.find(e => e.startsWith(execId));
  if (!match) return null;
  const folder = path.join(testResultsDir, match);
  // Screenshot is named test-failed-1.png (or similar)
  const files = fs.readdirSync(folder).filter(f => f.endsWith('.png'));
  if (!files.length) return null;
  return path.join(folder, files[0]);
}

/** Call Claude vision with the failure screenshot + error output → plain-English explanation */
async function analyzeFailureScreenshot(
  screenshotPath: string,
  errorOutput: string,
  onChunk: (text: string) => void
): Promise<void> {
  const imgBuffer = fs.readFileSync(screenshotPath);
  const base64 = imgBuffer.toString('base64');

  // Strip ANSI codes from error for cleaner Claude input
  const cleanError = errorOutput.replace(/\x1b\[[0-9;]*m/g, '').slice(0, 3000);

  try {
    const stream = visionClient.messages.stream({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: 'image/png', data: base64 }
          },
          {
            type: 'text',
            text: `This screenshot was captured the moment a Playwright test FAILED.\n\nError output:\n${cleanError}\n\nLook at the screenshot carefully and answer:\n1. What state is the page in?\n2. What is visually wrong or unexpected?\n3. Why did the test fail based on what you can see?\n4. What is the simplest fix?\n\nBe concise. Use plain English. No code unless essential.`
          }
        ]
      }]
    });

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        onChunk(event.delta.text);
      }
    }
  } catch (err: any) {
    onChunk(`Visual analysis unavailable: ${err.message}`);
  }
}

function runPlaywright(execId: string, scriptPath: string, credentials?: Record<string, string>) {
  const exec = executions.get(execId)!;
  // Use node directly to run the playwright CLI — avoids .cmd / shebang issues on Windows
  const nodeBin = process.execPath;
  const pwCli = path.join(PROJECT_ROOT, 'node_modules', 'playwright', 'cli.js');

  broadcastExec(exec, { type: 'start', message: '▶ Starting Playwright...' });

  const relScript = path.relative(PROJECT_ROOT, scriptPath).replace(/\\/g, '/');
  const proc = spawn(nodeBin, [pwCli, 'test', relScript, '--reporter=list', '--headed', '--config', PW_CONFIG], {
    cwd: PROJECT_ROOT,
    env: { ...process.env, FORCE_COLOR: '0', ...(credentials || {}) },
    shell: false
  });

  let buf = '';
  const parseLine = (raw: string) => {
    const line = raw.trim();
    if (!line) return;
    let type = 'log';
    if (/✓|PASSED|passed \d/.test(line))  type = 'pass';
    else if (/✗|FAILED|failed \d|Error:/.test(line)) type = 'fail';
    else if (/^\s+at /.test(line)) type = 'trace';
    else if (/^\d+ (passed|failed)/.test(line)) type = 'summary';
    broadcastExec(exec, { type, message: line });
  };

  proc.stdout.on('data', d => { buf += d.toString(); const ls = buf.split('\n'); buf = ls.pop()!; ls.forEach(parseLine); });
  proc.stderr.on('data', d => d.toString().split('\n').filter((l:string) => l.trim()).forEach((l:string) => broadcastExec(exec, { type: 'warn', message: l.trim() })));

  proc.on('close', async code => {
    if (buf.trim()) parseLine(buf);
    exec.status = code === 0 ? 'passed' : 'failed';
    broadcastExec(exec, {
      type: 'done', status: exec.status, exitCode: code,
      message: code === 0 ? '✅ All tests passed!' : '❌ Tests failed — see output above'
    });

    // ── Visual failure analysis via Claude vision ──────────────────────────
    if (code !== 0) {
      const screenshotPath = findFailureScreenshot(execId);
      if (screenshotPath) {
        broadcastExec(exec, { type: 'visual_analysis_start', message: '🔍 Analysing failure screenshot...' });

        const allOutput = exec.output.map((e: any) => e.message || '').join('\n');
        let analysisText = '';

        await analyzeFailureScreenshot(screenshotPath, allOutput, (chunk) => {
          analysisText += chunk;
          // Stream each chunk to connected clients
          const payload = JSON.stringify({ type: 'visual_analysis_chunk', message: chunk });
          exec.clients.forEach(c => { try { c.write(`data: ${payload}\n\n`); } catch {} });
        });

        // Final assembled message
        broadcastExec(exec, { type: 'visual_analysis_done', message: analysisText });
      }
    }

    exec.clients.forEach(c => { try { c.end(); } catch {} });
    // Keep scripts for 10 min then delete
    setTimeout(() => { try { fs.unlinkSync(scriptPath); } catch {} }, 10 * 60 * 1000);
  });

  proc.on('error', err => {
    broadcastExec(exec, { type: 'fail', message: `Failed to start Playwright: ${err.message}` });
    broadcastExec(exec, { type: 'done', status: 'failed', message: '❌ Execution error' });
    exec.clients.forEach(c => { try { c.end(); } catch {} });
  });
}

export function registerPlaywrightRoutes(app: Express) {
  ensurePwConfig();

  // GET /api/playwright/setup-check — verify Node + Playwright are available
  app.get('/api/playwright/setup-check', async (_req, res) => {
    try {
      const nodeBin = process.execPath;
      const pwCli = path.join(PROJECT_ROOT, 'node_modules', 'playwright', 'cli.js');
      const pwInstalled = fs.existsSync(pwCli);

      // Check if browsers are installed — check both Playwright cache and PLAYWRIGHT_BROWSERS_PATH
      const browsersDir = process.env.PLAYWRIGHT_BROWSERS_PATH ||
        path.join(PROJECT_ROOT, 'node_modules', 'playwright-core', '.local-browsers');
      const chromiumInstalled = fs.existsSync(browsersDir) &&
        fs.readdirSync(browsersDir).some(d => d.startsWith('chromium'));

      res.json({
        nodeVersion: process.version,
        playwrightInstalled: pwInstalled,
        chromiumInstalled,
        ready: pwInstalled && chromiumInstalled,
      });
    } catch (err: any) {
      res.json({ nodeVersion: process.version, playwrightInstalled: false, chromiumInstalled: false, ready: false, error: err.message });
    }
  });

  // POST /api/playwright/install — install Playwright browsers
  app.post('/api/playwright/install', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const send = (msg: string, done = false) => {
      res.write(`data: ${JSON.stringify({ message: msg, done })}\n\n`);
    };

    send('Checking Playwright browser installation...');

    const nodeBin = process.execPath;

    // 1. Check PLAYWRIGHT_BROWSERS_PATH (set to /ms-playwright in Docker via Dockerfile)
    const pwBrowsersPath = process.env.PLAYWRIGHT_BROWSERS_PATH;
    if (pwBrowsersPath && fs.existsSync(pwBrowsersPath)) {
      const entries = fs.readdirSync(pwBrowsersPath);
      const hasChromium = entries.some(e => e.startsWith('chromium'));
      if (hasChromium) {
        send('✅ Chromium already installed at ' + pwBrowsersPath, true);
        res.end();
        return;
      }
    }

    // 2. Check if @playwright/test CLI is available in project node_modules
    const localCli = path.join(PROJECT_ROOT, 'node_modules', '@playwright', 'test', 'cli.js');
    const playwrightCli = path.join(PROJECT_ROOT, 'node_modules', 'playwright', 'cli.js');
    const cliToUse = fs.existsSync(localCli) ? localCli : (fs.existsSync(playwrightCli) ? playwrightCli : null);

    if (cliToUse) {
      send('Installing Chromium browser binaries...');
      const proc = spawn(nodeBin, [cliToUse, 'install', 'chromium'], {
        cwd: PROJECT_ROOT, shell: false, env: { ...process.env }
      });
      proc.stdout.on('data', d => {
        d.toString().split('\n').filter((l: string) => l.trim()).forEach((l: string) => send(l));
      });
      proc.stderr.on('data', d => {
        d.toString().split('\n').filter((l: string) => l.trim()).forEach((l: string) => send(l));
      });
      proc.on('close', code => {
        if (code === 0) {
          send('✅ Playwright browsers installed successfully!', true);
        } else {
          send('❌ Installation failed. Check server logs.', true);
        }
        res.end();
      });
      proc.on('error', err => {
        send(`❌ Error: ${err.message}`, true);
        res.end();
      });
      return;
    }

    // 3. Last resort — npm install @playwright/test to /tmp/pw-install
    send('Installing @playwright/test (one-time setup)...');
    const PW_PREFIX = '/tmp/pw-install';
    const tmpCli = path.join(PW_PREFIX, 'node_modules', '@playwright', 'test', 'cli.js');
    const npm = spawn('sh', ['-c',
      `mkdir -p ${PW_PREFIX} && npm install @playwright/test --prefix ${PW_PREFIX} --no-package-lock`
    ], { shell: false, env: { ...process.env } });
    npm.stdout.on('data', d => {
      d.toString().split('\n').filter((l: string) => l.trim()).forEach((l: string) => send(l));
    });
    npm.stderr.on('data', d => {
      d.toString().split('\n').filter((l: string) => l.trim()).forEach((l: string) => send(l));
    });
    npm.on('close', code => {
      if (code !== 0) {
        send('❌ npm install @playwright/test failed. Check server logs.', true);
        res.end();
        return;
      }
      send('Installing Chromium browser binaries...');
      const proc2 = spawn(nodeBin, [tmpCli, 'install', 'chromium'], {
        cwd: PW_PREFIX, shell: false, env: { ...process.env }
      });
      proc2.stdout.on('data', d => {
        d.toString().split('\n').filter((l: string) => l.trim()).forEach((l: string) => send(l));
      });
      proc2.stderr.on('data', d => {
        d.toString().split('\n').filter((l: string) => l.trim()).forEach((l: string) => send(l));
      });
      proc2.on('close', c => {
        send(c === 0 ? '✅ Playwright browsers installed successfully!' : '❌ Installation failed. Check server logs.', true);
        res.end();
      });
      proc2.on('error', err => { send(`❌ Error: ${err.message}`, true); res.end(); });
    });
    npm.on('error', err => { send(`❌ Error: ${err.message}`, true); res.end(); });
  });

  // GET /api/playwright/video/:execId — serve the failure video file
  app.get('/api/playwright/video/:execId', (req, res) => {
    const { execId } = req.params;
    const testResultsDir = path.join(PROJECT_ROOT, 'test-results');
    if (!fs.existsSync(testResultsDir)) return res.status(404).json({ error: 'No test results' });

    // Playwright names folders like: exec-1234567-Recorded-flow/
    const entries = fs.readdirSync(testResultsDir);
    const match = entries.find(e => e.startsWith(execId));
    if (!match) return res.status(404).json({ error: 'No results for this execution' });

    const folder = path.join(testResultsDir, match);
    const videos = fs.readdirSync(folder).filter(f => f.endsWith('.webm'));
    if (!videos.length) return res.status(404).json({ error: 'No video found' });

    const videoPath = path.join(folder, videos[0]);
    const stat = fs.statSync(videoPath);
    res.setHeader('Content-Type', 'video/webm');
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Accept-Ranges', 'bytes');
    fs.createReadStream(videoPath).pipe(res);
  });

  // POST /api/playwright/execute — start execution, returns execId
  app.post('/api/playwright/execute', (req, res) => {
    const { script, credentials } = req.body as { script: string; credentials?: Record<string, string> };
    if (!script) return res.status(400).json({ error: 'No script provided' });

    const execId = `exec-${Date.now()}`;
    const scriptPath = path.join(PW_SCRIPTS_DIR, `${execId}.spec.ts`);

    fs.writeFileSync(scriptPath, script);

    executions.set(execId, { status: 'running', output: [], clients: [] });
    res.json({ execId });

    // Run async — don't await
    runPlaywright(execId, scriptPath, credentials);
  });

  // GET /api/playwright/execute/:execId/stream — SSE stream of output
  app.get('/api/playwright/execute/:execId/stream', (req, res) => {
    const exec = executions.get(req.params.execId);
    if (!exec) return res.status(404).json({ error: 'Execution not found' });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Replay buffered output
    exec.output.forEach(e => res.write(`data: ${JSON.stringify(e)}\n\n`));

    if (exec.status !== 'running') { res.end(); return; }

    exec.clients.push(res);
    req.on('close', () => { exec.clients = exec.clients.filter(c => c !== res); });
  });

  // POST /api/playwright/generate-framework — SSE: AI framework generation
  app.post('/api/playwright/generate-framework', async (req, res) => {
    const { nlSteps, startUrl, testName, events, projectName, tcId, moduleName } = req.body as {
      nlSteps: string[];
      startUrl: string;
      testName: string;
      events?: Array<{ sequence: number; type: string; url: string; pageTitle: string; naturalLanguage: string }>;
      projectName?: string;  // optional: when provided, existing POMs on disk are read
      tcId?: string;         // optional: TC ID for Excel row key (e.g. "TC001")
      moduleName?: string;   // optional: module/feature name
    };
    if (!nlSteps?.length) return res.status(400).json({ error: 'nlSteps required' });

    // Resolve the on-disk project directory if a project name was supplied.
    // This lets generateFramework() read existing pages/*.ts from TC001, TC002, …
    // so Claude sees all previously generated method names before writing new code.
    const projectOutputDir = projectName?.trim()
      ? path.join(PROJECTS_DIR, projectName.trim().replace(/[^a-zA-Z0-9_-]/g, '-'))
      : undefined;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const send = (data: object) => {
      try { res.write(`data: ${JSON.stringify(data)}\n\n`); } catch {}
    };

    try {
      const { generateFramework } = await import('./script-writer-agent.js');
      for await (const event of generateFramework(
        nlSteps, startUrl || '', testName || 'Recorded Flow',
        events || [], projectOutputDir, tcId
      )) {
        send(event);
      }
      send({ type: 'done' });
    } catch (err: any) {
      send({ type: 'error', message: err.message });
    }
    res.end();
  });

  // POST /api/playwright/heal — self-heal a broken locator via Claude
  app.post('/api/playwright/heal', async (req, res) => {
    const { brokenLocator, errorMessage, pageUrl, domSnapshot } = req.body as {
      brokenLocator: string; errorMessage: string; pageUrl: string; domSnapshot: string;
    };
    if (!brokenLocator || !pageUrl) return res.status(400).json({ error: 'brokenLocator and pageUrl required' });

    try {
      const { healLocator } = await import('./script-writer-agent.js');
      const healed = await healLocator(brokenLocator, errorMessage || '', pageUrl, domSnapshot || '');
      res.json({ healed });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/playwright/heal-script — heal full script: find broken locators + fetch DOM + patch
  app.post('/api/playwright/heal-script', async (req, res) => {
    const { script, errorOutput, pageUrl } = req.body as {
      script: string; errorOutput: string; pageUrl: string;
    };
    if (!script || !errorOutput) return res.status(400).json({ error: 'script and errorOutput required' });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const send = (data: object) => {
      try { res.write(`data: ${JSON.stringify(data)}\n\n`); } catch {}
    };

    try {
      // Strip ANSI escape codes so regex matching works on coloured Playwright output
      const cleanError = errorOutput.replace(/\x1b\[[0-9;]*m/g, '');

      // ── Strategy 1: extract locator from the Playwright call log ──
      // e.g. "waiting for getByText('Menu').first()"  or  "locator resolved to..."
      let brokenLocator = '';
      const callLogMatch = cleanError.match(/waiting for (getBy\w+\([^)]*\)|locator\([^)]*\))/);
      if (callLogMatch) brokenLocator = callLogMatch[1];

      // ── Strategy 2: extract from the failing script line using line number ──
      if (!brokenLocator) {
        // Error points at line like: "exec-xxx.spec.ts:7:58"
        const lineNumMatch = cleanError.match(/\.spec\.ts:(\d+):\d+/);
        if (lineNumMatch) {
          const lineNum = parseInt(lineNumMatch[1], 10);
          const scriptLines = script.split('\n');
          const failingLine = scriptLines[lineNum - 1] || '';
          const lineLocMatch = failingLine.match(/(getBy\w+\([^)]*(?:\{[^}]*\}[^)]*)*\)(?:\.[\w]+\([^)]*\))*)/);
          if (lineLocMatch) brokenLocator = lineLocMatch[1];
        }
      }

      // ── Strategy 3: broad regex scan on the full error text ──
      if (!brokenLocator) {
        const broadMatch = cleanError.match(/(getBy\w+\([^)]*(?:\{[^}]*\}[^)]*)*\)|locator\([^)]+\))/);
        if (broadMatch) brokenLocator = broadMatch[1];
      }

      if (!brokenLocator) {
        send({ type: 'no_locator', message: 'Could not identify broken locator in error output' });
        res.end();
        return;
      }

      send({ type: 'status', message: `🔧 Fixer Agent: found broken locator — ${brokenLocator}` });

      // Grab DOM snapshot using Playwright
      let domSnapshot = '';
      try {
        const { playwrightService } = await import('./playwright-service.js');
        const browser = await playwrightService.getBrowser();
        const ctx = await browser.newContext();
        const page = await ctx.newPage();
        await page.goto(pageUrl, { timeout: 20000, waitUntil: 'domcontentloaded' });
        domSnapshot = await page.evaluate(() => document.body.innerHTML);
        await ctx.close();
        send({ type: 'status', message: '🔧 Fixer Agent: captured live DOM snapshot' });
      } catch {
        send({ type: 'status', message: '🔧 Fixer Agent: could not capture DOM, healing from error context only' });
      }

      const { healLocator } = await import('./script-writer-agent.js');
      send({ type: 'status', message: '🔧 Fixer Agent: asking Claude for healed locator...' });
      const healed = await healLocator(brokenLocator, errorOutput, pageUrl, domSnapshot);

      // Patch the script
      const healedScript = script.replace(brokenLocator, healed);
      send({ type: 'healed', healedScript, brokenLocator, healedLocator: healed });
    } catch (err: any) {
      send({ type: 'error', message: err.message });
    }
    res.end();
  });

  // ─── Project Library Routes ──────────────────────────────────────────────────

  const PROJECTS_DIR = path.join(__dirname, '../projects');

  // ═══════════════════════════════════════════════════════════════════════════
  // PROJECT MANAGEMENT APIs
  // ═══════════════════════════════════════════════════════════════════════════

  /** GET /api/recorder/projects — List all recording projects with metadata */
  app.get('/api/recorder/projects', (req, res) => {
    try {
      if (!fs.existsSync(PROJECTS_DIR)) return res.json({ projects: [] });
      const dirs = fs.readdirSync(PROJECTS_DIR, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => {
          const metaPath = path.join(PROJECTS_DIR, d.name, 'project.json');
          let meta: any = { name: d.name };
          if (fs.existsSync(metaPath)) {
            try { meta = { ...meta, ...JSON.parse(fs.readFileSync(metaPath, 'utf8')) }; } catch {}
          }
          return meta;
        });
      res.json({ projects: dirs });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /** POST /api/recorder/projects/create — Create a new recording project with directory structure */
  app.post('/api/recorder/projects/create', (req, res) => {
    const { name, description, applicationUrl } = req.body as {
      name: string; description?: string; applicationUrl: string;
    };
    if (!name || !applicationUrl) {
      return res.status(400).json({ error: 'name and applicationUrl are required' });
    }
    const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '-');
    const projectDir = path.join(PROJECTS_DIR, safeName);

    try {
      // Create directory structure
      for (const dir of ['locators', 'pages', 'actions/business', 'fixtures', 'tests', 'helpers']) {
        fs.mkdirSync(path.join(projectDir, dir), { recursive: true });
      }

      // Write helpers from server templates (never copy from root — root gets reverted by file watcher)
      fs.writeFileSync(path.join(projectDir, 'helpers', 'universal.ts'), UNIVERSAL_HELPERS_CONTENT, 'utf8');
      if (KENDO_HELPERS_CONTENT) {
        fs.writeFileSync(path.join(projectDir, 'helpers', 'kendo.ts'), KENDO_HELPERS_CONTENT, 'utf8');
      }

      // Create project.json
      const projectMeta = {
        name: safeName,
        description: description || '',
        applicationUrl,
        createdAt: new Date().toISOString(),
        modules: [] as string[],
        testCount: 0,
        lastRecordedAt: null as string | null,
      };
      fs.writeFileSync(path.join(projectDir, 'project.json'), JSON.stringify(projectMeta, null, 2), 'utf8');

      // Create package.json
      fs.writeFileSync(path.join(projectDir, 'package.json'), JSON.stringify({
        name: safeName, version: '1.0.0', description: description || 'NAT 2.0 Test Project',
        scripts: { test: 'npx playwright test', 'test:headed': 'npx playwright test --headed' },
        devDependencies: { '@playwright/test': '^1.52.0', dotenv: '^16.4.7', typescript: '^5.7.3' }
      }, null, 2), 'utf8');

      // Create tsconfig.json
      fs.writeFileSync(path.join(projectDir, 'tsconfig.json'), JSON.stringify({
        compilerOptions: {
          target: 'ES2020', module: 'commonjs', lib: ['ES2020', 'DOM'],
          strict: true, esModuleInterop: true, skipLibCheck: true,
          forceConsistentCasingInFileNames: true, resolveJsonModule: true,
          outDir: './dist', rootDir: '.', baseUrl: '.',
        },
        include: ['**/*.ts'], exclude: ['node_modules', 'dist']
      }, null, 2), 'utf8');

      // Create playwright.config.ts
      const configContent = `import { defineConfig } from '@playwright/test';
import * as dotenv from 'dotenv';
dotenv.config();

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  timeout: 180_000,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: '${applicationUrl}',
    headless: false,
    viewport: null,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    launchOptions: {
      args: ['--start-maximized', '--disable-blink-features=AutomationControlled', '--no-sandbox', '--disable-infobars'],
    },
  },
});
`;
      fs.writeFileSync(path.join(projectDir, 'playwright.config.ts'), configContent, 'utf8');

      // Create .gitignore
      fs.writeFileSync(path.join(projectDir, '.gitignore'), 'node_modules/\ntest-results/\nplaywright-report/\n.env\ndist/\n', 'utf8');

      res.json({ success: true, projectName: safeName, projectPath: projectDir });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /** GET /api/projects/:name/modules — List modules (test subfolder names) */
  app.get('/api/projects/:name/modules', (req, res) => {
    const safeName = req.params.name.replace(/[^a-zA-Z0-9_-]/g, '-');
    const testsDir = path.join(PROJECTS_DIR, safeName, 'tests');
    try {
      if (!fs.existsSync(testsDir)) return res.json({ modules: [] });
      const modules = fs.readdirSync(testsDir, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name);
      res.json({ modules });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /** GET /api/projects/:name/next-tc-id — Get next auto-incremented TC ID */
  app.get('/api/projects/:name/next-tc-id', (req, res) => {
    const safeName = req.params.name.replace(/[^a-zA-Z0-9_-]/g, '-');
    const testsDir = path.join(PROJECTS_DIR, safeName, 'tests');
    try {
      let maxTc = 0;
      if (fs.existsSync(testsDir)) {
        // Recursively find all TC*.spec.ts files
        const findTcFiles = (dir: string): void => {
          for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            if (entry.isDirectory()) findTcFiles(path.join(dir, entry.name));
            else {
              const match = entry.name.match(/^TC(\d+)/);
              if (match) maxTc = Math.max(maxTc, parseInt(match[1]));
            }
          }
        };
        findTcFiles(testsDir);
      }
      const nextId = `TC${String(maxTc + 1).padStart(3, '0')}`;
      res.json({ nextTcId: nextId, currentMax: maxTc });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * Merge a new locator file content into an existing one.
   * Existing locator keys are preserved (never overwritten).
   * New keys are appended before the closing `};`.
   */
  function mergeLocatorFile(existing: string, newLocators: Record<string, string>): string {
    // Parse keys already present: match `  varName: (page: Page) =>`
    const existingKeys = new Set(
      [...existing.matchAll(/^\s{2}(\w+)\s*:/gm)].map(m => m[1])
    );
    const toAdd = Object.entries(newLocators).filter(([k]) => !existingKeys.has(k));
    if (!toAdd.length) return existing; // nothing new to add

    const newLines = toAdd.map(([k, v]) => `  ${k}: ${v},`).join('\n');
    // Insert before the final `};`
    return existing.replace(/\};\s*$/, `${newLines}\n};\n`);
  }

  /**
   * POST /api/projects/save-ai-framework
   * Saves AI-generated framework files (from /api/playwright/generate-framework)
   * to the project folder on disk using smart skip/merge rules:
   *
   *   generic_action  → skip if file already exists (user may have customised)
   *   config          → skip if file already exists (package.json, tsconfig, playwright.config, auth.setup, README …)
   *   pom (locators)  → merge new locator keys if file already exists
   *   pom (page class) → skip if file already exists (user edits manually)
   *   business_action → skip if file already exists
   *   test            → always write (each test gets a unique slug)
   *
   * Body: { projectName: string, files: GeneratedFile[] }
   * where GeneratedFile = { path: string; content: string; type: string }
   */
  app.post('/api/projects/save-ai-framework', async (req, res) => {
    const { projectName, files } = req.body as {
      projectName: string;
      files: Array<{ path: string; content: string; type: string }>;
    };

    if (!projectName || !files?.length) {
      return res.status(400).json({ error: 'projectName and files are required' });
    }

    const safeName   = projectName.replace(/[^a-zA-Z0-9_-]/g, '-');
    const projectDir = path.join(PROJECTS_DIR, safeName);

    try {
      const written: string[] = [];
      const skipped: string[] = [];
      const merged:  string[] = [];

      for (const file of files) {
        const filePath = path.join(projectDir, file.path);
        const fileDir  = path.dirname(filePath);
        fs.mkdirSync(fileDir, { recursive: true });

        const exists = fs.existsSync(filePath);

        if (file.type === 'excel_data') {
          // ── Excel test data — upsert a row into fixtures/test-data.xlsx ──────────
          // file.content is JSON: { tcId, baseUrl, fieldName: value, ... }
          try {
            const newRow: Record<string, string> = JSON.parse(file.content);
            let wb: XLSX.WorkBook;
            let rows: Record<string, string>[] = [];

            if (exists) {
              wb = XLSX.readFile(filePath);
              const sheetName = wb.SheetNames.includes('TestData') ? 'TestData' : wb.SheetNames[0];
              rows = XLSX.utils.sheet_to_json<Record<string, string>>(wb.Sheets[sheetName], { defval: '' });
              const idx = rows.findIndex(r => r['tcId'] === newRow['tcId']);
              if (idx >= 0) {
                rows[idx] = { ...rows[idx], ...newRow }; // merge — keep extra user-added columns
              } else {
                rows.push(newRow); // new TC ID — append
              }
            } else {
              wb = XLSX.utils.book_new();
              rows = [newRow];
            }

            const ws = XLSX.utils.json_to_sheet(rows);
            // Set sensible column widths
            ws['!cols'] = Object.keys(newRow).map(k => ({ wch: Math.max(k.length + 2, 22) }));

            if (wb.SheetNames.includes('TestData')) {
              wb.Sheets['TestData'] = ws;
            } else {
              if (wb.SheetNames.length > 0) {
                wb.Sheets[wb.SheetNames[0]] = ws;
              } else {
                XLSX.utils.book_append_sheet(wb, ws, 'TestData');
              }
            }

            XLSX.writeFile(wb, filePath);
            written.push(file.path);
          } catch (xlsxErr: any) {
            console.error(`[save-ai-framework] Excel upsert failed: ${xlsxErr.message}`);
            skipped.push(file.path);
          }
        } else if (file.type === 'test') {
          // Test spec: always write (never overwrite — use timestamp suffix for uniqueness)
          const ext  = path.extname(file.path);
          const base = path.basename(file.path, ext);
          const dir  = path.dirname(filePath);
          let dest   = filePath;
          if (exists) {
            dest = path.join(dir, `${base}-${Date.now()}${ext}`);
          }
          fs.writeFileSync(dest, file.content, 'utf8');
          written.push(path.relative(projectDir, dest));
        } else if (file.type === 'pom' && file.path.includes('.locators.')) {
          // Locator file: merge new keys if exists, create if not
          if (exists) {
            const existing = fs.readFileSync(filePath, 'utf8');
            // Extract new locators as a simple key→value map from the new content
            const newLocators: Record<string, string> = {};
            const matches = [...file.content.matchAll(/^\s{2}(\w+)\s*:\s*(\(page[^,]+,)/gm)];
            for (const m of matches) newLocators[m[1]] = m[2].replace(/,$/, '');
            const updated = mergeLocatorFile(existing, newLocators);
            fs.writeFileSync(filePath, updated, 'utf8');
            merged.push(file.path);
          } else {
            fs.writeFileSync(filePath, file.content, 'utf8');
            written.push(file.path);
          }
        } else {
          // All other types (generic_action, config, pom class, business_action):
          // write on first creation, skip on subsequent runs
          if (exists) {
            skipped.push(file.path);
          } else {
            fs.writeFileSync(filePath, file.content, 'utf8');
            written.push(file.path);
          }
        }
      }

      // ── Register project in DB so it shows on the dashboard ─────────────────
      try {
        const { storage } = await import('./storage.js');
        const user = (req as any).user;
        if (user?.id) {
          const existingProjects = await storage.getProjectsByUserId(user.id);
          const alreadyInDb = existingProjects.some(
            p => p.name.toLowerCase() === safeName.toLowerCase()
          );
          if (!alreadyInDb) {
            await storage.createProject({
              userId: user.id,
              tenantId: user.tenantId || 'default-tenant',
              name: safeName,
              description: 'Playwright framework — created by Recording Studio',
              type: 'playwright',
            });
            console.log(`[save-ai-framework] Registered project "${safeName}" in DB for user ${user.id}`);
          }
        }
      } catch (dbErr: any) {
        // Non-fatal — files were saved successfully, DB registration is best-effort
        console.warn(`[save-ai-framework] DB project registration skipped: ${dbErr.message}`);
      }

      res.json({ projectName: safeName, projectDir, written, skipped, merged });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /api/projects/:name/rename
   * Rename a locator key or page method across all affected layers in a saved project.
   *
   * Body: {
   *   scope:    'locator' | 'method'
   *   file:     base file name without extension, e.g. "NousinfosystemsHomePage"
   *   oldName:  current name
   *   newName:  desired name
   *   dryRun:   true = preview only (default true)
   * }
   *
   * Response: RenameResult — hits[], filesAffected, applied
   */
  app.post('/api/projects/:name/rename', async (req, res) => {
    const projectName = req.params.name;
    const { scope, file, oldName, newName, dryRun = true } = req.body as {
      scope: 'locator' | 'method';
      file: string;
      oldName: string;
      newName: string;
      dryRun?: boolean;
    };

    if (!scope || !file || !oldName || !newName) {
      return res.status(400).json({ error: 'scope, file, oldName and newName are required' });
    }
    if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(newName)) {
      return res.status(400).json({ error: 'newName must be a valid JavaScript identifier' });
    }

    const safeName   = projectName.replace(/[^a-zA-Z0-9_-]/g, '-');
    const projectDir = path.join(PROJECTS_DIR, safeName);

    if (!fs.existsSync(projectDir)) {
      return res.status(404).json({ error: `Project "${safeName}" not found` });
    }

    try {
      const { renameLocator, renameMethod } = await import('./rename-propagation.js');
      const result = scope === 'locator'
        ? renameLocator(projectDir, file, oldName, newName, dryRun)
        : renameMethod(projectDir, file, oldName, newName, dryRun);

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /api/projects/save-framework
   * Body: {
   *   projectName: string,
   *   testName: string,
   *   locatorFiles: Array<{ pageName: string; content: string; locators: Record<string,string> }>,
   *   testContent: string,
   *   configContent: string
   * }
   * Writes framework files to projects/<projectName>/ on disk.
   * Locator files are merged if they already exist.
   * playwright.config.ts is written only on first creation.
   * Test files are always overwritten.
   */
  app.post('/api/projects/save-framework', (req, res) => {
    const { projectName, testName, locatorFiles, pageFiles, actionsFile, fixtureFile, testContent, configContent, universalHelpersContent } =
      req.body as {
        projectName: string;
        testName: string;
        locatorFiles: Array<{ pageName: string; content: string; locators: Record<string, string> }>;
        pageFiles?: Array<{ pageName: string; className: string; content: string }>;
        actionsFile?: { path: string; content: string } | null;
        fixtureFile?: { path: string; content: string } | null;
        testContent: string;
        configContent: string;
        universalHelpersContent?: string;
      };

    if (!projectName || !testName || !testContent) {
      return res.status(400).json({ error: 'projectName, testName, and testContent are required' });
    }

    // Sanitise project name: keep only alphanumeric + hyphens/underscores
    const safeName = projectName.replace(/[^a-zA-Z0-9_-]/g, '-');
    const projectDir  = path.join(PROJECTS_DIR, safeName);
    const locatorsDir = path.join(projectDir, 'locators');
    const testsDir    = path.join(projectDir, 'tests');

    try {
      const helpersDir = path.join(projectDir, 'helpers');
      fs.mkdirSync(locatorsDir, { recursive: true });
      fs.mkdirSync(testsDir,    { recursive: true });
      fs.mkdirSync(helpersDir,  { recursive: true });

      const written: string[] = [];
      const merged:  string[] = [];

      // ── Write helpers/universal.ts (ALWAYS from server template — never stale) ──
      const helpersPath = path.join(helpersDir, 'universal.ts');
      fs.writeFileSync(helpersPath, universalHelpersContent || UNIVERSAL_HELPERS_CONTENT, 'utf8');
      written.push('helpers/universal.ts');

      // ── Write locator files (merge if existing) ────────────────────────────
      for (const lf of (locatorFiles || [])) {
        const filePath = path.join(locatorsDir, `${lf.pageName}.locators.ts`);
        if (fs.existsSync(filePath)) {
          const existing = fs.readFileSync(filePath, 'utf8');
          const updated  = mergeLocatorFile(existing, lf.locators);
          fs.writeFileSync(filePath, updated, 'utf8');
          merged.push(`locators/${lf.pageName}.locators.ts`);
        } else {
          fs.writeFileSync(filePath, lf.content, 'utf8');
          written.push(`locators/${lf.pageName}.locators.ts`);
        }
      }

      // ── Write page class files (pages/{PageName}.ts) ─────────────────────
      // Skip if file exists — append-only strategy preserves existing methods from earlier TCs
      if (pageFiles && pageFiles.length) {
        const pagesDir = path.join(projectDir, 'pages');
        fs.mkdirSync(pagesDir, { recursive: true });
        for (const pf of pageFiles) {
          const pagePath = path.join(pagesDir, `${pf.pageName}.ts`);
          if (fs.existsSync(pagePath)) {
            merged.push(`pages/${pf.pageName}.ts`);
          } else {
            fs.writeFileSync(pagePath, pf.content, 'utf8');
            written.push(`pages/${pf.pageName}.ts`);
          }
        }
      }

      // ── Write business actions file ───────────────────────────────────────
      if (actionsFile && actionsFile.content) {
        const actionsDir = path.join(projectDir, 'actions');
        fs.mkdirSync(actionsDir, { recursive: true });
        const actionsPath = path.join(projectDir, actionsFile.path);
        fs.mkdirSync(path.dirname(actionsPath), { recursive: true });
        fs.writeFileSync(actionsPath, actionsFile.content, 'utf8');
        written.push(actionsFile.path);
      }

      // ── Write test data fixture (skip if exists — preserves earlier TC data) ──
      if (fixtureFile && fixtureFile.content) {
        const fixturePath = path.join(projectDir, fixtureFile.path);
        fs.mkdirSync(path.dirname(fixturePath), { recursive: true });
        if (fs.existsSync(fixturePath)) {
          merged.push(fixtureFile.path);
        } else {
          fs.writeFileSync(fixturePath, fixtureFile.content, 'utf8');
          written.push(fixtureFile.path);
        }
      }

      // ── Write helpers/kendo.ts (always refresh — ensures latest fixes) ────
      const kendoHelpersPath = path.join(helpersDir, 'kendo.ts');
      if (KENDO_HELPERS_CONTENT) {
        fs.writeFileSync(kendoHelpersPath, KENDO_HELPERS_CONTENT, 'utf8');
        written.push('helpers/kendo.ts');
      } else {
        const kendoSrc = path.join(PROJECT_ROOT, 'helpers', 'kendo.ts');
        if (fs.existsSync(kendoSrc)) {
          fs.copyFileSync(kendoSrc, kendoHelpersPath);
          written.push('helpers/kendo.ts');
        }
      }

      // ── Write test file (always overwrite) ────────────────────────────────
      const testSlug = testName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const testPath = path.join(testsDir, `${testSlug}.spec.ts`);
      fs.writeFileSync(testPath, testContent, 'utf8');
      written.push(`tests/${testSlug}.spec.ts`);

      // ── Write playwright.config.ts only on first creation ─────────────────
      const configPath = path.join(projectDir, 'playwright.config.ts');
      if (!fs.existsSync(configPath) && configContent) {
        fs.writeFileSync(configPath, configContent, 'utf8');
        written.push('playwright.config.ts');
      }

      // ── Update project.json with test count and module ───────────────────
      const projectJsonPath = path.join(projectDir, 'project.json');
      try {
        let projectMeta: any = {
          name: safeName, testCount: 0, modules: [] as string[],
          lastRecordedAt: null as string | null
        };
        if (fs.existsSync(projectJsonPath)) {
          projectMeta = { ...projectMeta, ...JSON.parse(fs.readFileSync(projectJsonPath, 'utf8')) };
        }
        projectMeta.testCount = (projectMeta.testCount || 0) + 1;
        projectMeta.lastRecordedAt = new Date().toISOString();
        const modName = (req.body as any).moduleName;
        if (modName && !projectMeta.modules.includes(modName)) {
          projectMeta.modules.push(modName);
        }
        fs.writeFileSync(projectJsonPath, JSON.stringify(projectMeta, null, 2), 'utf8');
      } catch {}

      res.json({ projectName: safeName, projectDir, written, merged });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/projects/:projectName/locators
   * Returns a list of existing locator files in the project's locators/ folder,
   * with key counts so the UI can show "X locators (will merge)" badges.
   */
  app.get('/api/projects/:projectName/locators', (req, res) => {
    const safeName = req.params.projectName.replace(/[^a-zA-Z0-9_-]/g, '-');
    const locatorsDir = path.join(PROJECTS_DIR, safeName, 'locators');

    if (!fs.existsSync(locatorsDir)) {
      return res.json({ files: [] });
    }

    try {
      const files = fs.readdirSync(locatorsDir)
        .filter(f => f.endsWith('.locators.ts'))
        .map(f => {
          const content = fs.readFileSync(path.join(locatorsDir, f), 'utf8');
          const keyCount = (content.match(/^\s{2}\w+\s*:/gm) || []).length;
          return {
            name: f,
            pageName: f.replace('.locators.ts', ''),
            keyCount,
          };
        });
      res.json({ files });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
}

// ─── WebSocket Server ─────────────────────────────────────────────────────────

export function setupRecorderWebSocket(server: Server) {
  const wss = new WebSocketServer({ noServer: true });

  wss.on('connection', (ws: WebSocket) => {
    let linkedSession: RecordingSession | null = null;
    let clientType: 'chrome_extension' | 'unknown' = 'unknown';

    ws.on('message', (raw: Buffer) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }

      switch (msg.type) {

        case 'extension_connect':
          clientType = 'chrome_extension';
          break;

        case 'join_session': {
          const sid = (msg.sessionId as string)?.toUpperCase();
          const session = sessions.get(sid);

          if (!session) {
            ws.send(JSON.stringify({ type: 'session_invalid', message: `Session "${sid}" not found. Generate a new code in NAT 2.0.` }));
            return;
          }

          // Link this extension to the session
          linkedSession = session;
          session.extensionWs = ws;
          session.status = 'recording';

          ws.send(JSON.stringify({ type: 'session_confirmed', sessionId: sid }));

          // Notify NAT 2.0 UI that extension connected
          broadcastToUI(session, 'extension_connected', { sessionId: sid });
          break;
        }

        case 'recording_event': {
          if (!linkedSession) return;
          const event = msg.event as RecordingEvent;
          if (!event) return;

          // Screenshots are stored separately — don't count in step numbers
          if (event.type === 'screenshot') {
            // Just broadcast screenshot to UI, don't push to events array
            broadcastToUI(linkedSession, 'screenshot', { dataUrl: (event as any).dataUrl });
            return;
          }

          // Store event
          linkedSession.events.push(event);

          // Generate natural language step
          const stepNum = linkedSession.events.length;
          const naturalLanguage = toNaturalLanguage(event, stepNum);

          // Forward to all NAT 2.0 UI clients in real-time
          broadcastToUI(linkedSession, 'recording_event', { ...event, naturalLanguage, stepNum });
          break;
        }

        case 'recording_stopped': {
          if (!linkedSession) return;
          linkedSession.status = 'completed';
          linkedSession.extensionWs = null;
          broadcastToUI(linkedSession, 'recording_completed', {
            sessionId: linkedSession.id,
            eventCount: linkedSession.events.length
          });
          linkedSession = null;
          break;
        }

        case 'ping':
          ws.send(JSON.stringify({ type: 'pong' }));
          break;
      }
    });

    ws.on('close', () => {
      if (linkedSession) {
        linkedSession.extensionWs = null;
        if (linkedSession.status === 'recording') {
          linkedSession.status = 'waiting';
          broadcastToUI(linkedSession, 'extension_disconnected', {
            sessionId: linkedSession.id,
            message: 'Extension disconnected. Reconnect to resume recording.'
          });
        }
      }
    });

    ws.on('error', () => {
      // Handled by close event
    });
  });

  console.log('[DevXQE] Recorder WebSocket server ready at /ws/recorder');
  return wss;
}

// ─── Test Management Routes ───────────────────────────────────────────────────
// Handles: execution history, test suites, RTM, environments, CI/CD, metrics
// All data stored in recorder-data/*.json (no DB migration required)

export function registerTestManagementRoutes(app: Express) {
  ensureDataDir();

  // ── Types ──────────────────────────────────────────────────────────────────
  interface HistoryEntry {
    id: string;
    testId: string;
    testName: string;
    suiteId?: string;
    status: 'passed' | 'failed' | 'skipped';
    duration: number;        // ms
    environment: string;
    errorMessage?: string;
    screenshotPath?: string;
    videoPath?: string;
    runAt: number;           // epoch ms
    nlSteps?: string[];
  }

  interface TestSuite {
    id: string;
    name: string;
    type: 'smoke' | 'regression' | 'sanity' | 'sprint' | 'custom';
    testIds: string[];
    tags: string[];
    createdAt: number;
    updatedAt: number;
  }

  interface Requirement {
    id: string;
    title: string;
    description?: string;
    source: 'manual' | 'jira' | 'ado';
    ticketId?: string;
    priority: 'P0' | 'P1' | 'P2' | 'P3';
    createdAt: number;
  }

  interface RTMLink {
    requirementId: string;
    testId: string;
    testName: string;
    linkedAt: number;
  }

  interface Environment {
    id: string;
    name: string;
    baseUrl: string;
    type: 'dev' | 'staging' | 'production' | 'custom';
    isDefault: boolean;
    createdAt: number;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  function getHistory(): HistoryEntry[] { return readJson<HistoryEntry[]>('history.json', []); }
  function getSuites(): TestSuite[]     { return readJson<TestSuite[]>('suites.json', []); }
  function getRequirements(): Requirement[] { return readJson<Requirement[]>('requirements.json', []); }
  function getRTMLinks(): RTMLink[]     { return readJson<RTMLink[]>('rtm.json', []); }
  function getEnvironments(): Environment[] { return readJson<Environment[]>('environments.json', []); }

  function computeFlakiness(testId: string, history: HistoryEntry[]): number {
    const last10 = history.filter(h => h.testId === testId).slice(-10);
    if (last10.length === 0) return 0;
    const passed = last10.filter(h => h.status === 'passed').length;
    return Math.round((passed / last10.length) * 100);
  }

  // ── Execution History ──────────────────────────────────────────────────────

  // POST /api/tm/history — record a completed test execution
  app.post('/api/tm/history', (req: Request, res: Response) => {
    const entry: HistoryEntry = {
      id: `run-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
      testId: req.body.testId || 'unknown',
      testName: req.body.testName || 'Unnamed Test',
      suiteId: req.body.suiteId,
      status: req.body.status || 'failed',
      duration: req.body.duration || 0,
      environment: req.body.environment || 'default',
      errorMessage: req.body.errorMessage,
      screenshotPath: req.body.screenshotPath,
      videoPath: req.body.videoPath,
      runAt: Date.now(),
      nlSteps: req.body.nlSteps,
    };
    const history = getHistory();
    history.push(entry);
    // Keep last 1000 entries
    if (history.length > 1000) history.splice(0, history.length - 1000);
    writeJson('history.json', history);
    res.json({ ok: true, entry });
  });

  // GET /api/tm/history — list history with filters
  app.get('/api/tm/history', (req: Request, res: Response) => {
    let history = getHistory();
    if (req.query.testId)   history = history.filter(h => h.testId === req.query.testId);
    if (req.query.suiteId)  history = history.filter(h => h.suiteId === req.query.suiteId);
    if (req.query.status)   history = history.filter(h => h.status === req.query.status);
    const limit = parseInt(req.query.limit as string) || 200;
    res.json(history.slice(-limit).reverse()); // newest first
  });

  // GET /api/tm/history/trends — aggregated pass rate per day (last 30 days)
  app.get('/api/tm/history/trends', (_req: Request, res: Response) => {
    const history = getHistory();
    const now = Date.now();
    const days: Record<string, { passed: number; failed: number; total: number }> = {};

    for (let i = 29; i >= 0; i--) {
      const d = new Date(now - i * 86400000);
      const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
      days[key] = { passed: 0, failed: 0, total: 0 };
    }

    for (const h of history) {
      const key = new Date(h.runAt).toISOString().slice(0, 10);
      if (days[key]) {
        days[key].total++;
        if (h.status === 'passed') days[key].passed++;
        else days[key].failed++;
      }
    }

    res.json(Object.entries(days).map(([date, d]) => ({
      date,
      passed: d.passed,
      failed: d.failed,
      total: d.total,
      passRate: d.total > 0 ? Math.round((d.passed / d.total) * 100) : null,
    })));
  });

  // GET /api/tm/flakiness — flakiness score per test (based on last 10 runs)
  app.get('/api/tm/flakiness', (_req: Request, res: Response) => {
    const history = getHistory();
    const testIds = [...new Set(history.map(h => h.testId))];
    const result = testIds.map(testId => {
      const entries = history.filter(h => h.testId === testId);
      const last = entries[entries.length - 1];
      const stability = computeFlakiness(testId, history);
      return {
        testId,
        testName: last?.testName || testId,
        stability,          // 100 = always passes, 0 = always fails
        isFlaky: stability > 0 && stability < 80,
        runCount: entries.length,
        lastStatus: last?.status,
        lastRunAt: last?.runAt,
      };
    }).sort((a, b) => a.stability - b.stability); // flakiest first
    res.json(result);
  });

  // ── Dashboard Metrics ──────────────────────────────────────────────────────

  app.get('/api/tm/metrics', (_req: Request, res: Response) => {
    const history = getHistory();
    const suites  = getSuites();
    const reqs    = getRequirements();
    const links   = getRTMLinks();

    const totalRuns  = history.length;
    const last30 = history.filter(h => h.runAt > Date.now() - 30 * 86400000);
    const passed30   = last30.filter(h => h.status === 'passed').length;
    const passRate30 = last30.length > 0 ? Math.round((passed30 / last30.length) * 100) : 0;

    const testIds    = [...new Set(history.map(h => h.testId))];
    const flakyCount = testIds.filter(id => {
      const s = computeFlakiness(id, history);
      return s > 0 && s < 80;
    }).length;

    const linkedTestIds = new Set(links.map(l => l.testId));
    const coverage = reqs.length > 0
      ? Math.round((new Set(links.map(l => l.requirementId)).size / reqs.length) * 100)
      : 0;

    // Average duration of passed tests
    const passedRuns = history.filter(h => h.status === 'passed' && h.duration > 0);
    const avgDuration = passedRuns.length > 0
      ? Math.round(passedRuns.reduce((a, b) => a + b.duration, 0) / passedRuns.length / 1000)
      : 0;

    res.json({
      totalRuns,
      passRate30,
      passedLast30: passed30,
      failedLast30: last30.length - passed30,
      totalTests: testIds.length,
      flakyCount,
      suiteCount: suites.length,
      requirementCount: reqs.length,
      linkedTests: linkedTestIds.size,
      coverage,
      avgDurationSec: avgDuration,
      lastRunAt: history.length > 0 ? history[history.length - 1].runAt : null,
    });
  });

  // ── Test Suites ────────────────────────────────────────────────────────────

  app.get('/api/tm/suites', (_req: Request, res: Response) => {
    res.json(getSuites());
  });

  app.post('/api/tm/suites', (req: Request, res: Response) => {
    const suite: TestSuite = {
      id: `suite-${Date.now()}`,
      name: req.body.name || 'Untitled Suite',
      type: req.body.type || 'custom',
      testIds: req.body.testIds || [],
      tags: req.body.tags || [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const suites = getSuites();
    suites.push(suite);
    writeJson('suites.json', suites);
    res.json(suite);
  });

  app.patch('/api/tm/suites/:id', (req: Request, res: Response) => {
    const suites = getSuites();
    const idx = suites.findIndex(s => s.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Suite not found' });
    suites[idx] = { ...suites[idx], ...req.body, id: suites[idx].id, updatedAt: Date.now() };
    writeJson('suites.json', suites);
    res.json(suites[idx]);
  });

  app.delete('/api/tm/suites/:id', (req: Request, res: Response) => {
    const suites = getSuites().filter(s => s.id !== req.params.id);
    writeJson('suites.json', suites);
    res.json({ ok: true });
  });

  // POST /api/tm/suites/:id/run — run all tests in a suite (SSE stream)
  app.post('/api/tm/suites/:id/run', (req: Request, res: Response) => {
    const suite = getSuites().find(s => s.id === req.params.id);
    if (!suite) return res.status(404).json({ error: 'Suite not found' });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const environment = (req.body?.environment as string) || 'default';
    const credentials = (req.body?.credentials as Record<string, string>) || {};

    const send = (type: string, data: Record<string, unknown>) => {
      res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
    };

    const projectsDir = path.join(PROJECT_ROOT, 'projects');
    const results: Array<{ testId: string; testName: string; status: string; duration: number; error?: string }> = [];

    const runNext = async (idx: number) => {
      if (idx >= suite.testIds.length) {
        const passed = results.filter(r => r.status === 'passed').length;
        const failed = results.filter(r => r.status === 'failed').length;
        send('suite_done', { passed, failed, total: results.length, results });
        res.end();
        return;
      }

      const testId = suite.testIds[idx];
      send('test_start', { testId, index: idx, total: suite.testIds.length });

      // Find the test script: look in projects/*/tests/*.spec.ts
      let scriptPath: string | null = null;
      let testName = testId;

      if (fs.existsSync(projectsDir)) {
        for (const proj of fs.readdirSync(projectsDir)) {
          const testsDir = path.join(projectsDir, proj, 'tests');
          if (!fs.existsSync(testsDir)) continue;
          for (const f of fs.readdirSync(testsDir)) {
            if (f.includes(testId) || testId.includes(f.replace('.spec.ts', ''))) {
              scriptPath = path.join(testsDir, f);
              testName = f.replace('.spec.ts', '');
              break;
            }
          }
          if (scriptPath) break;
        }
      }

      // Also check recorded-scripts/
      if (!scriptPath) {
        const recScript = path.join(PROJECT_ROOT, 'recorded-scripts', `${testId}.spec.ts`);
        if (fs.existsSync(recScript)) { scriptPath = recScript; testName = testId; }
      }

      if (!scriptPath) {
        send('test_done', { testId, testName, status: 'skipped', duration: 0, error: 'Script not found' });
        results.push({ testId, testName, status: 'skipped', duration: 0, error: 'Script not found' });
        runNext(idx + 1);
        return;
      }

      const startTime = Date.now();
      const nodeBin = process.execPath;
      const pwCli = path.join(PROJECT_ROOT, 'node_modules', 'playwright', 'cli.js');
      const relScript = path.relative(PROJECT_ROOT, scriptPath).replace(/\\/g, '/');

      const proc = spawn(nodeBin, [pwCli, 'test', relScript, '--reporter=list', '--headed', '--config', PW_CONFIG], {
        cwd: PROJECT_ROOT,
        env: { ...process.env, FORCE_COLOR: '0', ...credentials },
        shell: false,
      });

      let output = '';
      proc.stdout.on('data', (d: Buffer) => {
        const text = d.toString();
        output += text;
        text.split('\n').filter((l: string) => l.trim()).forEach((l: string) =>
          send('log', { testId, message: l.trim() })
        );
      });
      proc.stderr.on('data', (d: Buffer) => { output += d.toString(); });

      proc.on('close', (code: number | null) => {
        const duration = Date.now() - startTime;
        const status = code === 0 ? 'passed' : 'failed';
        const errorLine = output.split('\n').find((l: string) => /Error:|failed/i.test(l))?.trim();

        // Record to history
        const histEntry: HistoryEntry = {
          id: `run-${Date.now()}`,
          testId,
          testName,
          suiteId: suite.id,
          status,
          duration,
          environment,
          errorMessage: status === 'failed' ? errorLine : undefined,
          runAt: Date.now(),
        };
        const history = getHistory();
        history.push(histEntry);
        if (history.length > 1000) history.splice(0, history.length - 1000);
        writeJson('history.json', history);

        send('test_done', { testId, testName, status, duration, error: errorLine });
        results.push({ testId, testName, status, duration, error: errorLine });
        runNext(idx + 1);
      });

      proc.on('error', (err: Error) => {
        const duration = Date.now() - startTime;
        send('test_done', { testId, testName, status: 'failed', duration, error: err.message });
        results.push({ testId, testName, status: 'failed', duration, error: err.message });
        runNext(idx + 1);
      });
    };

    send('suite_start', { suiteId: suite.id, suiteName: suite.name, total: suite.testIds.length });
    runNext(0);
  });

  // ── Requirements & RTM ─────────────────────────────────────────────────────

  app.get('/api/tm/requirements', (_req: Request, res: Response) => {
    const reqs = getRequirements();
    const links = getRTMLinks();
    res.json(reqs.map(r => ({
      ...r,
      linkedTests: links.filter(l => l.requirementId === r.id),
    })));
  });

  app.post('/api/tm/requirements', (req: Request, res: Response) => {
    const req2: Requirement = {
      id: `req-${Date.now()}`,
      title: req.body.title || 'Untitled Requirement',
      description: req.body.description,
      source: req.body.source || 'manual',
      ticketId: req.body.ticketId,
      priority: req.body.priority || 'P2',
      createdAt: Date.now(),
    };
    const reqs = getRequirements();
    reqs.push(req2);
    writeJson('requirements.json', reqs);
    res.json(req2);
  });

  app.delete('/api/tm/requirements/:id', (req: Request, res: Response) => {
    writeJson('requirements.json', getRequirements().filter(r => r.id !== req.params.id));
    writeJson('rtm.json', getRTMLinks().filter(l => l.requirementId !== req.params.id));
    res.json({ ok: true });
  });

  // GET /api/tm/rtm — full RTM matrix
  app.get('/api/tm/rtm', (_req: Request, res: Response) => {
    const reqs  = getRequirements();
    const links = getRTMLinks();
    const history = getHistory();
    res.json(reqs.map(r => {
      const reqLinks = links.filter(l => l.requirementId === r.id);
      const testStatuses = reqLinks.map(l => {
        const last = history.filter(h => h.testId === l.testId).slice(-1)[0];
        return { testId: l.testId, testName: l.testName, lastStatus: last?.status || 'never', lastRunAt: last?.runAt };
      });
      const allPassed = testStatuses.length > 0 && testStatuses.every(t => t.lastStatus === 'passed');
      const anyFailed = testStatuses.some(t => t.lastStatus === 'failed');
      return {
        ...r,
        tests: testStatuses,
        coverage: testStatuses.length > 0 ? (allPassed ? 'covered' : anyFailed ? 'failing' : 'partial') : 'none',
      };
    }));
  });

  // POST /api/tm/rtm/link — link a test to a requirement
  app.post('/api/tm/rtm/link', (req: Request, res: Response) => {
    const { requirementId, testId, testName } = req.body;
    const links = getRTMLinks();
    if (!links.find(l => l.requirementId === requirementId && l.testId === testId)) {
      links.push({ requirementId, testId, testName, linkedAt: Date.now() });
      writeJson('rtm.json', links);
    }
    res.json({ ok: true });
  });

  // DELETE /api/tm/rtm/link — unlink
  app.delete('/api/tm/rtm/link', (req: Request, res: Response) => {
    const { requirementId, testId } = req.body;
    writeJson('rtm.json', getRTMLinks().filter(l => !(l.requirementId === requirementId && l.testId === testId)));
    res.json({ ok: true });
  });

  // ── Environments ───────────────────────────────────────────────────────────

  app.get('/api/tm/environments', (_req: Request, res: Response) => {
    res.json(getEnvironments());
  });

  app.post('/api/tm/environments', (req: Request, res: Response) => {
    const env: Environment = {
      id: `env-${Date.now()}`,
      name: req.body.name || 'New Environment',
      baseUrl: req.body.baseUrl || '',
      type: req.body.type || 'custom',
      isDefault: req.body.isDefault || false,
      createdAt: Date.now(),
    };
    let envs = getEnvironments();
    if (env.isDefault) envs = envs.map(e => ({ ...e, isDefault: false }));
    envs.push(env);
    writeJson('environments.json', envs);
    res.json(env);
  });

  app.patch('/api/tm/environments/:id', (req: Request, res: Response) => {
    let envs = getEnvironments();
    const idx = envs.findIndex(e => e.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    if (req.body.isDefault) envs = envs.map(e => ({ ...e, isDefault: false }));
    envs[idx] = { ...envs[idx], ...req.body, id: envs[idx].id };
    writeJson('environments.json', envs);
    res.json(envs[idx]);
  });

  app.delete('/api/tm/environments/:id', (req: Request, res: Response) => {
    writeJson('environments.json', getEnvironments().filter(e => e.id !== req.params.id));
    res.json({ ok: true });
  });

  // ── CI/CD YAML Generator ───────────────────────────────────────────────────

  app.post('/api/tm/cicd/generate', (req: Request, res: Response) => {
    const { type, projectName, suiteType, testCommand } = req.body as {
      type: 'github' | 'azure' | 'gitlab' | 'jenkins';
      projectName?: string;
      suiteType?: string;
      testCommand?: string;
    };

    const cmd = testCommand || 'npx playwright test';
    const proj = projectName || 'my-tests';

    const yamls: Record<string, string> = {
      github: `# GitHub Actions — Playwright Test Pipeline
# Generated by Nat20 Test Management
name: Playwright Tests${suiteType ? ` — ${suiteType}` : ''}
on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]
  workflow_dispatch:

jobs:
  playwright-tests:
    name: Run ${suiteType || 'All'} Tests
    runs-on: ubuntu-latest
    timeout-minutes: 30

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install chromium --with-deps

      - name: Run tests
        run: ${cmd}
        env:
          TEST_PASSWORD: \${{ secrets.TEST_PASSWORD }}
          BASE_URL: \${{ vars.BASE_URL || 'https://staging.example.com' }}

      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-results-\${{ github.run_id }}
          path: |
            test-results/
            playwright-report/
          retention-days: 30

      - name: Upload failure screenshots
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: failure-screenshots-\${{ github.run_id }}
          path: test-results/**/*.png
`,

      azure: `# Azure Pipelines — Playwright Test Pipeline
# Generated by Nat20 Test Management
trigger:
  branches:
    include:
      - main
      - develop

pr:
  branches:
    include:
      - main

pool:
  vmImage: 'ubuntu-latest'

variables:
  nodeVersion: '20.x'

stages:
  - stage: Test
    displayName: 'Run ${suiteType || 'Playwright'} Tests'
    jobs:
      - job: PlaywrightTests
        displayName: 'Playwright Test Run'
        timeoutInMinutes: 30
        steps:
          - task: NodeTool@0
            displayName: 'Setup Node.js \$(nodeVersion)'
            inputs:
              versionSpec: '\$(nodeVersion)'

          - script: npm ci
            displayName: 'Install dependencies'

          - script: npx playwright install chromium --with-deps
            displayName: 'Install Playwright browsers'

          - script: ${cmd}
            displayName: 'Run ${suiteType || 'all'} tests'
            env:
              TEST_PASSWORD: \$(TEST_PASSWORD)
              BASE_URL: \$(BASE_URL)

          - task: PublishTestResults@2
            displayName: 'Publish test results'
            condition: always()
            inputs:
              testResultsFormat: 'JUnit'
              testResultsFiles: 'test-results/*.xml'
              failTaskOnFailedTests: true

          - task: PublishBuildArtifacts@1
            displayName: 'Upload failure artifacts'
            condition: failed()
            inputs:
              pathToPublish: 'test-results'
              artifactName: 'playwright-failures'
`,

      gitlab: `# GitLab CI — Playwright Test Pipeline
# Generated by Nat20 Test Management
image: mcr.microsoft.com/playwright:v1.49.0-noble

stages:
  - test

variables:
  BASE_URL: \${BASE_URL:-"https://staging.example.com"}

playwright-tests:
  stage: test
  script:
    - npm ci
    - ${cmd}
  variables:
    TEST_PASSWORD: \$TEST_PASSWORD
  artifacts:
    when: always
    paths:
      - test-results/
      - playwright-report/
    expire_in: 1 week
    reports:
      junit: test-results/results.xml
  rules:
    - if: \$CI_PIPELINE_SOURCE == "merge_request_event"
    - if: \$CI_COMMIT_BRANCH == "main"
`,

      jenkins: `// Jenkinsfile — Playwright Test Pipeline
// Generated by Nat20 Test Management
pipeline {
    agent {
        docker {
            image 'mcr.microsoft.com/playwright:v1.49.0-noble'
            args '--ipc=host'
        }
    }

    environment {
        TEST_PASSWORD = credentials('TEST_PASSWORD')
        BASE_URL      = "\${env.BASE_URL ?: 'https://staging.example.com'}"
    }

    options {
        timeout(time: 30, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '20'))
    }

    stages {
        stage('Install') {
            steps {
                sh 'npm ci'
            }
        }
        stage('Test') {
            steps {
                sh '${cmd}'
            }
            post {
                always {
                    junit 'test-results/*.xml'
                    archiveArtifacts artifacts: 'test-results/**,playwright-report/**',
                                     allowEmptyArchive: true
                }
            }
        }
    }

    post {
        failure {
            echo 'Tests failed — check artifacts for screenshots and video'
        }
    }
}
`,
    };

    const yaml = yamls[type] || yamls.github;
    res.json({ yaml, type, projectName: proj });
  });
}
