// main.js — entry point. Initializes state, wires top-level chrome (tabs,
// global toggle, footer, import/export), then hands off to the UI modules.

import { initState, getState, setGlobalActive, subscribe, replaceRules } from './services/state-service.js';
import { exportStateToFile, importStateFromFile } from './services/storage-service.js';
import { renderRules } from './ui/rules-view.js';
import { showToast } from './ui/toast.js';
import './ui/rule-editor.js';
import './ui/simulator-view.js';

const el = (id) => document.getElementById(id);

function renderGlobalToggle() {
  const { globalActive } = getState();
  const btn = el('global-toggle-btn');
  const dot = el('global-dot');
  const text = el('global-status-text');
  btn.classList.toggle('paused', !globalActive);
  dot.classList.toggle('paused', !globalActive);
  text.textContent = globalActive ? 'Active' : 'Paused';
}

function renderFooter() {
  const { stats } = getState();
  el('stat-intercepted').textContent = stats.intercepted;
  el('stat-faults').textContent = stats.faults;
  el('last-hit-time').textContent = stats.lastHit || '—';
}

function renderAll() {
  renderRules();
  renderGlobalToggle();
  renderFooter();
}

function wireTabs() {
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.tab;
      el('view-rules').classList.toggle('hidden', target !== 'rules');
      el('view-simulator').classList.toggle('hidden', target !== 'simulator');
    });
  });
}

function wireGlobalToggle() {
  el('global-toggle-btn').addEventListener('click', async () => {
    const { globalActive } = getState();
    await setGlobalActive(!globalActive);
    showToast(globalActive ? 'Global Interceptor Paused' : 'Global Interceptor Enabled');
  });
}

function wireImportExport() {
  el('export-btn').addEventListener('click', () => {
    exportStateToFile(getState());
    showToast('Rules exported to JSON');
  });

  el('import-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const imported = await importStateFromFile(file);
      await replaceRules(imported);
      showToast('Rules imported successfully!');
    } catch {
      showToast('Failed to parse JSON file');
    }
    e.target.value = '';
  });
}

async function init() {
  await initState();
  subscribe(renderAll);
  wireTabs();
  wireGlobalToggle();
  wireImportExport();
  renderAll();
}

init();
