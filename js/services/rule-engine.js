// rule-engine.js
// Pure logic: no DOM, no chrome.* APIs. Matches a request against rules
// and computes the fault outcome. Shared by the side panel simulator
// AND the real content-script interceptor, so behavior stays identical
// between "testing a rule" and "actually applying it".

export function matchesRule(rule, method, url) {
  if (!rule.enabled) return false;
  if (rule.method !== 'ALL' && rule.method !== method) return false;

  switch (rule.matchType) {
    case 'exact':
      return rule.pattern === url;
    case 'regex':
      try { return new RegExp(rule.pattern).test(url); }
      catch { return false; }
    case 'wildcard':
    default: {
      const escaped = rule.pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
      const regexStr = '^' + escaped.replace(/\*/g, '.*') + '$';
      return new RegExp(regexStr).test(url);
    }
  }
}

export function findMatchingRule(rules, method, url) {
  return rules.find(r => matchesRule(r, method, url)) || null;
}

export function computeDelay(rule) {
  if (!rule?.actions?.latency?.enabled) return 12; // baseline roundtrip
  let ms = rule.actions.latency.ms;
  if (rule.actions.latency.jitter) {
    const jitter = ms * 0.3 * (Math.random() - 0.5);
    ms = Math.round(ms + jitter);
  }
  return Math.max(0, ms);
}

export function rollFailure(rule) {
  if (!rule?.actions?.failure?.enabled) return false;
  return Math.random() * 100 <= rule.actions.failure.rate;
}

export function applyMalformation(bodyText) {
  const cut = Math.floor(bodyText.length / 2);
  return bodyText.substring(0, cut) + ' ... [TRUNCATED_JSON_MALFORMED]';
}

// Resolves the full outcome for a given (method, url) against the rule set.
// Returns a plain object describing what should happen — the caller
// (simulator or real interceptor) decides how to act on it.
export function resolveOutcome(rules, method, url, globalActive) {
  if (!globalActive) {
    return { matched: false, passthrough: true };
  }

  const rule = findMatchingRule(rules, method, url);
  if (!rule) {
    return { matched: false, passthrough: true };
  }

  const delayMs = computeDelay(rule);
  const isFailure = rollFailure(rule);

  if (isFailure) {
    return {
      matched: true,
      rule,
      delayMs,
      kind: rule.actions.failure.type === 'network' ? 'network-error' : 'forced-5xx',
    };
  }

  if (rule.actions.mock.enabled) {
    let body = rule.actions.mock.body;
    let malformed = false;
    if (rule.actions.malformed.enabled) {
      body = applyMalformation(body);
      malformed = true;
    }
    return {
      matched: true,
      rule,
      delayMs,
      kind: 'mock',
      status: rule.actions.mock.status,
      contentType: rule.actions.mock.contentType,
      body,
      malformed,
    };
  }

  return { matched: true, rule, delayMs, kind: 'passthrough-delayed' };
}
