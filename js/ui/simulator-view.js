// simulator-view.js — wires the "Live Simulator" tab to simulator-service

import { getState, recordHit } from '../services/state-service.js';
import { runSimulation } from '../services/simulator-service.js';

const el = (id) => document.getElementById(id);
const submitBtn = el('sim-submit-btn');
const outputBox = el('sim-output-container');

function setStatusPill(text, kind) {
  const pill = el('sim-status-code');
  pill.textContent = text;
  pill.className = `status-pill status-${kind}`;
}

submitBtn.addEventListener('click', async () => {
  const method = el('sim-method').value;
  const url = el('sim-url').value.trim();
  if (!url) return;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Intercepting…';

  const state = getState();
  const outcome = await runSimulation(state.rules, state.globalActive, method, url);

  submitBtn.disabled = false;
  submitBtn.textContent = '▶ Dispatch Test Request';
  outputBox.classList.remove('hidden');

  el('sim-latency').textContent = `${outcome.delayMs}ms`;
  const actionsEl = el('sim-actions-executed');
  actionsEl.innerHTML = '';

  if (!outcome.matched) {
    el('sim-rule-match').textContent = 'No Rule Match (Passed Through)';
    setStatusPill('200 OK', 'ok');
    el('sim-response-body').textContent = JSON.stringify(
      { id: 123, name: 'Pass-through API User', createdAt: new Date().toISOString() }, null, 2
    );
    await recordHit(false);
    return;
  }

  el('sim-rule-match').textContent = `Matched: ${outcome.rule.pattern}`;

  if (outcome.kind === 'network-error') {
    setStatusPill('NETWORK ERROR', 'err');
    actionsEl.innerHTML = `<span class="badge badge-fail">Failed to fetch (Network Error)</span>`;
    el('sim-response-body').textContent = 'TypeError: Failed to fetch (Injected by Demeter)';
  } else if (outcome.kind === 'forced-5xx') {
    setStatusPill('500 Internal Error', 'err');
    actionsEl.innerHTML = `<span class="badge badge-fail">Forced 5xx Status</span>`;
    el('sim-response-body').textContent = JSON.stringify({ error: 'Internal Server Error', code: 500 }, null, 2);
  } else if (outcome.kind === 'mock') {
    setStatusPill(`${outcome.status} Mocked`, outcome.status >= 400 ? 'warn' : 'ok');
    actionsEl.innerHTML = `<span class="badge badge-mock">Mock Payload Swapped</span>`;
    if (outcome.malformed) {
      actionsEl.innerHTML += `<span class="badge badge-malformed">Payload Corrupted</span>`;
    }
    el('sim-response-body').textContent = outcome.body;
    } else if (outcome.kind === 'malformed-passthrough') {
    setStatusPill('200 OK (Corrupted)', 'warn');
    actionsEl.innerHTML = `<span class="badge badge-malformed">Real Response Corrupted</span>`;
    el('sim-response-body').textContent = outcome.body;
  } else {
    setStatusPill('200 OK (Real)', 'ok');
    el('sim-response-body').textContent = JSON.stringify(
      { id: 123, name: 'Original Response Data', status: 'unmodified' }, null, 2
    );
  }

  await recordHit(true);
});
