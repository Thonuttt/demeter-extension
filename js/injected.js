// injected.js
// Runs in the MAIN world — i.e. the page's own JS realm — so it can
// actually override window.fetch and XMLHttpRequest for the page's own
// API calls. It has NO access to chrome.* APIs (that's isolated-world
// only), which is why rules arrive via postMessage from
// content-interceptor.js instead of being read from storage directly.
//
// The matching/outcome logic here intentionally mirrors
// js/services/rule-engine.js. It's duplicated rather than imported
// because a MAIN-world content script can't reach chrome.runtime.getURL
// to resolve the extension's own module path. If this becomes a
// maintenance issue, revisit by injecting the module URL from the
// isolated-world script instead.

let RULES = [];
let GLOBAL_ACTIVE = true;

window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  const msg = event.data;
  if (!msg || msg.source !== 'demeter-isolated' || msg.type !== 'FAULTCRAFT_RULES_UPDATE') return;
  RULES = msg.rules;
  GLOBAL_ACTIVE = msg.globalActive;
});

function reportHit(wasFault) {
  window.postMessage({ source: 'demeter-page', type: 'FAULTCRAFT_HIT', wasFault }, '*');
}

function matchesRule(rule, method, url) {
  if (!rule.enabled) return false;
  if (rule.method !== 'ALL' && rule.method !== method) return false;
  switch (rule.matchType) {
    case 'exact': return rule.pattern === url;
    case 'regex':
      try { return new RegExp(rule.pattern).test(url); } catch { return false; }
    case 'wildcard':
    default: {
      const escaped = rule.pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp('^' + escaped.replace(/\*/g, '.*') + '$').test(url);
    }
  }
}

function findRule(method, url) {
  if (!GLOBAL_ACTIVE) return null;
  return RULES.find(r => matchesRule(r, method, url)) || null;
}

function computeDelay(rule) {
  if (!rule.actions.latency.enabled) return 0;
  let ms = rule.actions.latency.ms;
  if (rule.actions.latency.jitter) {
    ms += ms * 0.3 * (Math.random() - 0.5);
  }
  return Math.max(0, Math.round(ms));
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ---- fetch override ----
const realFetch = window.fetch.bind(window);

window.fetch = async function (input, init = {}) {
  const url = typeof input === 'string' ? input : input.url;
  const method = (init.method || 'GET').toUpperCase();
  const rule = findRule(method, url);

  if (!rule) return realFetch(input, init);

  const delay = computeDelay(rule);
  if (delay > 0) await wait(delay);

  const isFailure = rule.actions.failure.enabled &&
    Math.random() * 100 <= rule.actions.failure.rate;

  if (isFailure) {
    reportHit(true);
    if (rule.actions.failure.type === 'network') {
      throw new TypeError('Failed to fetch (Injected by Demeter)');
    }
    return new Response(JSON.stringify({ error: 'Internal Server Error', code: 500 }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (rule.actions.mock.enabled) {
    reportHit(true);
    let body = rule.actions.mock.body;
    if (rule.actions.malformed.enabled) {
      body = body.substring(0, Math.floor(body.length / 2)) + ' ... [TRUNCATED]';
    }
    return new Response(body, {
      status: rule.actions.mock.status,
      headers: { 'Content-Type': rule.actions.mock.contentType },
    });
  }

  reportHit(delay > 0);
  return realFetch(input, init);
};

// ---- XMLHttpRequest override (delay-only; mocking XHR bodies is out of
// scope for v1 — most modern apps use fetch, and XHR support can be
// filled in later using the same rule/outcome logic above) ----
const realOpen = XMLHttpRequest.prototype.open;
const realSend = XMLHttpRequest.prototype.send;

XMLHttpRequest.prototype.open = function (method, url, ...rest) {
  this.__demeter_method = method?.toUpperCase();
  this.__demeter_url = url;
  return realOpen.call(this, method, url, ...rest);
};

XMLHttpRequest.prototype.send = function (...args) {
  const rule = findRule(this.__demeter_method, this.__demeter_url);
  if (!rule || !rule.actions.latency.enabled) {
    return realSend.apply(this, args);
  }
  const delay = computeDelay(rule);
  reportHit(true);
  setTimeout(() => realSend.apply(this, args), delay);
};
