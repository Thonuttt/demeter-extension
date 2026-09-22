// storage-service.js
// Owns all reads/writes to chrome.storage.local. Nothing else in the
// codebase should call chrome.storage directly — keeps the storage
// schema in one place if it ever needs to change.

const STORAGE_KEY = 'demeter_state_v1';

const DEFAULT_STATE = {
  globalActive: true,
  stats: { intercepted: 0, faults: 0, lastHit: null },
  rules: [
    {
      id: 'rule_1',
      enabled: true,
      pattern: '/api/users/*',
      method: 'GET',
      matchType: 'wildcard',
      actions: {
        mock: { enabled: true, status: 500, contentType: 'application/json', body: '{\n  "error": "Internal Error",\n  "message": "Database pool exhausted."\n}' },
        latency: { enabled: true, ms: 350, jitter: false },
        failure: { enabled: true, rate: 100, type: '5xx' },
        malformed: { enabled: false }
      }
    },
    {
      id: 'rule_2',
      enabled: true,
      pattern: '/api/checkout',
      method: 'POST',
      matchType: 'exact',
      actions: {
        mock: { enabled: false, status: 200, contentType: 'application/json', body: '{"status":"ok"}' },
        latency: { enabled: true, ms: 1500, jitter: true },
        failure: { enabled: true, rate: 25, type: 'network' },
        malformed: { enabled: false }
      }
    }
  ]
};

export async function loadState() {
  return new Promise((resolve) => {
    chrome.storage.local.get(STORAGE_KEY, (result) => {
      resolve(result[STORAGE_KEY] || structuredClone(DEFAULT_STATE));
    });
  });
}

export async function saveState(state) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEY]: state }, resolve);
  });
}

export function exportStateToFile(state) {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state, null, 2));
  const a = document.createElement('a');
  a.href = dataStr;
  a.download = 'demeter-rules.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function importStateFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        if (!Array.isArray(imported.rules)) throw new Error('Missing rules array');
        resolve(imported);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}
