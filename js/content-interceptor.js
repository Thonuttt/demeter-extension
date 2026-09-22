// content-interceptor.js
// Runs in the ISOLATED world (has chrome.storage access, but cannot see
// or override the page's own window.fetch — that's a separate JS realm).
// Job: read the rule set, hand it to injected.js (which runs in the
// MAIN world and does the actual interception) via postMessage, and
// relay stats back from injected.js into storage.

const STORAGE_KEY = 'demeter_state_v1';

function postRulesToPage(state) {
  window.postMessage({
    source: 'demeter-isolated',
    type: 'FAULTCRAFT_RULES_UPDATE',
    rules: state?.rules || [],
    globalActive: state?.globalActive ?? true,
  }, '*');
}

async function loadAndPost() {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  postRulesToPage(result[STORAGE_KEY]);
}

// Initial load
loadAndPost();

// Keep the page's copy of rules live if the user edits them in the side
// panel while this tab is open.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes[STORAGE_KEY]) {
    postRulesToPage(changes[STORAGE_KEY].newValue);
  }
});

// Receive hit/fault stats from the MAIN-world interceptor and persist them,
// so the side panel's footer counters stay accurate even when it's closed.
window.addEventListener('message', async (event) => {
  if (event.source !== window) return;
  const msg = event.data;
  if (!msg || msg.source !== 'demeter-page' || msg.type !== 'FAULTCRAFT_HIT') return;

  const result = await chrome.storage.local.get(STORAGE_KEY);
  const state = result[STORAGE_KEY];
  if (!state) return;

  state.stats.intercepted += 1;
  if (msg.wasFault) state.stats.faults += 1;
  state.stats.lastHit = new Date().toTimeString().split(' ')[0];

  await chrome.storage.local.set({ [STORAGE_KEY]: state });
});
