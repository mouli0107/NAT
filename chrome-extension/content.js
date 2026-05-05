/**
 * ASTRA QE Recorder — content.js
 * Injected into every page. Captures user interactions and sends to background.js.
 *
 * Selector Priority Ladder (most stable → least stable):
 * 1. data-testid
 * 2. aria-label
 * 3. name attribute
 * 4. role + text content
 * 5. placeholder
 * 6. XPath (structural + text)
 * 7. Semantic CSS class (non-generated)
 * 8. Static-looking id
 * NEVER: generated ids (react-select-*), hashed classes (btn_xk29a), nth-child
 */

(function () {
  // Prevent double-injection
  if (window.__devxqe_injected) return;
  window.__devxqe_injected = true;

  let isRecording = false;
  let sessionId = null;
  let eventSequence = 0;

  // ─── Selector Builder ────────────────────────────────────────────────────────

  function isGeneratedId(id) {
    if (!id) return true;
    // React/Angular generated patterns
    return /^(react-select|rc-|ng-|mat-|mdc-|cdk-|ember|__next|radix-)/i.test(id)
      || /[-_][a-z0-9]{4,8}$/i.test(id) // ends in random hash
      || /\d{3,}/.test(id); // contains 3+ consecutive digits
  }

  function isGeneratedClass(cls) {
    if (!cls) return true;
    // Hashed CSS module classes: btn_xk29a, styles__button--2kHzS
    return /[_-][a-z0-9]{4,8}$/i.test(cls)
      || /--[a-z0-9]{4,}/i.test(cls)
      || /^[a-z]+_[A-Z][a-z]/.test(cls); // CSS modules pattern
  }

  function getSemanticClass(el) {
    const classes = Array.from(el.classList);
    const semantic = classes.find(c => !isGeneratedClass(c) && c.length > 2 && !/^\d/.test(c));
    return semantic || null;
  }

  function buildXPath(el) {
    // Prefer text-based or attribute-based XPath over positional
    const tag = el.tagName.toLowerCase();
    const text = el.textContent?.trim();
    const type = el.getAttribute('type');

    if (text && text.length < 50 && text.length > 0 && !text.includes('\n')) {
      return `//${tag}[normalize-space(text())='${text}']`;
    }
    if (type) {
      return `//${tag}[@type='${type}']`;
    }

    // Structural fallback
    let path = '';
    let node = el;
    while (node && node.nodeType === Node.ELEMENT_NODE && node !== document.body) {
      const tag = node.tagName.toLowerCase();
      const siblings = Array.from(node.parentNode?.children || []).filter(n => n.tagName === node.tagName);
      const idx = siblings.indexOf(node) + 1;
      path = `/${tag}${siblings.length > 1 ? `[${idx}]` : ''}` + path;
      node = node.parentNode;
    }
    return `/html/body${path}`;
  }

  function buildSelectors(el) {
    const selectors = [];

    // Rank 1 — data-testid
    const testId = el.getAttribute('data-testid') || el.getAttribute('data-cy') || el.getAttribute('data-test');
    if (testId) {
      selectors.push({ rank: 1, type: 'data-testid', value: `[data-testid="${testId}"]`, playwrightLocator: `getByTestId('${testId}')` });
    }

    // Rank 2 — aria-label
    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel) {
      selectors.push({ rank: 2, type: 'aria-label', value: `[aria-label="${ariaLabel}"]`, playwrightLocator: `getByLabel('${ariaLabel}')` });
    }

    // Rank 3 — name attribute (form fields)
    const name = el.getAttribute('name');
    if (name) {
      selectors.push({ rank: 3, type: 'name', value: `[name="${name}"]`, playwrightLocator: `locator('[name="${name}"]')` });
    }

    // Rank 4 — role + text (buttons, links)
    const role = el.getAttribute('role') || el.tagName.toLowerCase();
    const text = el.textContent?.trim();
    if (text && text.length < 50 && ['button', 'a', 'submit'].includes(role)) {
      selectors.push({ rank: 4, type: 'role-text', value: `${role}:has-text("${text}")`, playwrightLocator: `getByRole('${role}', { name: '${text}' })` });
    }

    // Rank 5 — placeholder
    const placeholder = el.getAttribute('placeholder');
    if (placeholder) {
      selectors.push({ rank: 5, type: 'placeholder', value: `[placeholder="${placeholder}"]`, playwrightLocator: `getByPlaceholder('${placeholder}')` });
    }

    // Rank 6 — XPath structural+text
    const xpath = buildXPath(el);
    if (xpath) {
      selectors.push({ rank: 6, type: 'xpath', value: xpath, playwrightLocator: `locator('xpath=${xpath}')` });
    }

    // Rank 7 — semantic CSS class
    const semanticClass = getSemanticClass(el);
    if (semanticClass) {
      selectors.push({ rank: 7, type: 'css-class', value: `.${semanticClass}`, playwrightLocator: `locator('.${semanticClass}')` });
    }

    // Rank 8 — id (only if not generated)
    const id = el.getAttribute('id');
    if (id && !isGeneratedId(id)) {
      selectors.push({ rank: 8, type: 'id', value: `#${id}`, playwrightLocator: `locator('#${id}')` });
    }

    // Sort by rank
    selectors.sort((a, b) => a.rank - b.rank);
    return selectors;
  }

  function getElementDescription(el) {
    return (
      el.getAttribute('aria-label') ||
      el.getAttribute('placeholder') ||
      el.getAttribute('name') ||
      el.getAttribute('title') ||
      el.textContent?.trim().slice(0, 60) ||
      el.getAttribute('id') ||
      `${el.tagName.toLowerCase()}[${el.getAttribute('type') || 'element'}]`
    );
  }

  function getLabel(el) {
    // Try aria-labelledby
    const labelledBy = el.getAttribute('aria-labelledby');
    if (labelledBy) {
      const labelEl = document.getElementById(labelledBy);
      if (labelEl) return labelEl.textContent?.trim();
    }
    // Try associated <label>
    if (el.id) {
      const label = document.querySelector(`label[for="${el.id}"]`);
      if (label) return label.textContent?.trim();
    }
    // Try wrapping label
    const parentLabel = el.closest('label');
    if (parentLabel) return parentLabel.textContent?.trim();
    // Fall back to placeholder or name
    return el.getAttribute('placeholder') || el.getAttribute('name') || el.getAttribute('aria-label') || '';
  }

  function detectFramework() {
    if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) return 'React';
    if (window.ng) return 'Angular';
    if (window.Vue) return 'Vue';
    if (window.Ember) return 'Ember';
    return 'Unknown';
  }

  // ─── Event Dispatcher ────────────────────────────────────────────────────────

  function sendEvent(type, data) {
    if (!isRecording || !sessionId) return;
    eventSequence++;
    const event = {
      source: 'devxqe-content',
      sessionId,
      sequence: eventSequence,
      timestamp: Date.now(),
      type,
      url: window.location.href,
      pageTitle: document.title,
      ...data
    };
    // Use chrome.runtime.sendMessage to reach background service worker
    try {
      chrome.runtime.sendMessage(event);
    } catch (e) {
      // Extension context may be invalidated on hot reload — ignore
    }
  }

  // ─── Click Handler ────────────────────────────────────────────────────────────

  function handleClick(e) {
    if (!isRecording) return;
    const el = e.target;
    if (!el || el === document.body || el === document.documentElement) return;

    const selectors = buildSelectors(el);
    if (selectors.length === 0) return; // no usable selectors — skip

    sendEvent('click', {
      element: {
        tag: el.tagName.toLowerCase(),
        type: el.getAttribute('type') || null,
        description: getElementDescription(el),
        selectors,
        primarySelector: selectors[0]?.value || null,
        playwrightLocator: selectors[0]?.playwrightLocator || null
      }
    });
  }

  // ─── Input Handler ────────────────────────────────────────────────────────────

  function handleInput(e) {
    if (!isRecording) return;
    const el = e.target;
    if (!el) return;
    if (!['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) return;

    const inputType = el.getAttribute('type') || 'text';
    const isPassword = inputType === 'password';
    const selectors = buildSelectors(el);

    sendEvent('input', {
      element: {
        tag: el.tagName.toLowerCase(),
        type: inputType,
        label: getLabel(el),
        description: getElementDescription(el),
        selectors,
        primarySelector: selectors[0]?.value || null,
        playwrightLocator: selectors[0]?.playwrightLocator || null
      },
      value: isPassword ? '***MASKED***' : el.value,
      isMasked: isPassword
    });
  }

  // ─── Change Handler (select dropdowns) ───────────────────────────────────────

  function handleChange(e) {
    if (!isRecording) return;
    const el = e.target;
    if (!el || el.tagName !== 'SELECT') return;

    const selectors = buildSelectors(el);
    const selectedOption = el.options[el.selectedIndex];

    sendEvent('select', {
      element: {
        tag: 'select',
        label: getLabel(el),
        description: getElementDescription(el),
        selectors,
        primarySelector: selectors[0]?.value || null,
        playwrightLocator: selectors[0]?.playwrightLocator || null
      },
      value: el.value,
      displayText: selectedOption?.text || el.value
    });
  }

  // ─── Navigation (URL change) ──────────────────────────────────────────────────

  let lastUrl = window.location.href;

  function checkNavigation() {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      sendEvent('navigation', {
        fromUrl: lastUrl,
        toUrl: currentUrl,
        pageTitle: document.title,
        framework: detectFramework()
      });
      lastUrl = currentUrl;
    }
  }

  // Intercept pushState / replaceState for SPA navigation
  const _pushState = history.pushState.bind(history);
  const _replaceState = history.replaceState.bind(history);

  history.pushState = function (...args) {
    _pushState(...args);
    setTimeout(checkNavigation, 100);
  };
  history.replaceState = function (...args) {
    _replaceState(...args);
    setTimeout(checkNavigation, 100);
  };

  window.addEventListener('popstate', () => setTimeout(checkNavigation, 100));

  // ─── XHR Interceptor ─────────────────────────────────────────────────────────

  const OriginalXHR = window.XMLHttpRequest;
  window.XMLHttpRequest = function () {
    const xhr = new OriginalXHR();
    let method, url, requestBody;

    const originalOpen = xhr.open.bind(xhr);
    const originalSend = xhr.send.bind(xhr);

    xhr.open = function (m, u, ...rest) {
      method = m;
      url = u;
      return originalOpen(m, u, ...rest);
    };

    xhr.send = function (body) {
      requestBody = body;
      const startTime = Date.now();

      xhr.addEventListener('loadend', function () {
        if (!isRecording) return;
        try {
          const duration = Date.now() - startTime;
          let responseBody = null;
          try {
            responseBody = JSON.parse(xhr.responseText);
          } catch {
            responseBody = xhr.responseText?.slice(0, 500) || null;
          }

          let parsedRequest = null;
          try {
            parsedRequest = typeof requestBody === 'string' ? JSON.parse(requestBody) : requestBody;
          } catch {
            parsedRequest = requestBody;
          }

          sendEvent('api_call', {
            method: method?.toUpperCase(),
            url: typeof url === 'string' ? url : url?.toString(),
            requestBody: parsedRequest,
            responseStatus: xhr.status,
            responseBody: responseBody,
            duration
          });
        } catch (err) {
          // Silently ignore capture errors
        }
      });

      return originalSend(body);
    };

    return xhr;
  };

  // ─── Fetch Interceptor ────────────────────────────────────────────────────────

  const originalFetch = window.fetch.bind(window);
  window.fetch = async function (input, init) {
    const startTime = Date.now();
    const method = (init?.method || 'GET').toUpperCase();
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input?.url;

    let requestBody = null;
    try {
      requestBody = init?.body ? JSON.parse(init.body) : null;
    } catch {
      requestBody = init?.body || null;
    }

    const response = await originalFetch(input, init);

    if (isRecording) {
      try {
        const clone = response.clone();
        const duration = Date.now() - startTime;
        clone.text().then(text => {
          let responseBody = null;
          try { responseBody = JSON.parse(text); } catch { responseBody = text?.slice(0, 500); }
          sendEvent('api_call', {
            method,
            url,
            requestBody,
            responseStatus: response.status,
            responseBody,
            duration
          });
        }).catch(() => {});
      } catch (err) {
        // Silently ignore
      }
    }

    return response;
  };

  // ─── Page Load Event ──────────────────────────────────────────────────────────

  function sendPageLoad() {
    sendEvent('page_load', {
      pageTitle: document.title,
      framework: detectFramework(),
      hasForm: document.querySelector('form') !== null,
      hasLogin: !!(
        document.querySelector('input[type="password"]') ||
        document.querySelector('[class*="login"]') ||
        document.querySelector('[id*="login"]')
      ),
      inputCount: document.querySelectorAll('input, textarea, select').length,
      buttonCount: document.querySelectorAll('button, input[type="submit"], input[type="button"]').length
    });
  }

  // ─── Message Listener (from background.js) ───────────────────────────────────

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'START_RECORDING') {
      isRecording = true;
      sessionId = msg.sessionId;
      eventSequence = 0;
      lastUrl = window.location.href;
      sendPageLoad();
    } else if (msg.type === 'STOP_RECORDING') {
      isRecording = false;
      sessionId = null;
    } else if (msg.type === 'IS_RECORDING') {
      return { isRecording, sessionId };
    }
  });

  // ─── Attach DOM Listeners ────────────────────────────────────────────────────

  document.addEventListener('click', handleClick, true);
  document.addEventListener('change', handleInput, true);
  document.addEventListener('change', handleChange, true);
  document.addEventListener('blur', handleInput, true);

  // ─── Periodic navigation check (SPA safety net) ──────────────────────────────

  setInterval(checkNavigation, 500);

})();
