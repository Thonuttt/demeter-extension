// rules-view.js — renders the rule card list and wires per-card actions

import { getState, toggleRule, deleteRule, duplicateRule } from '../services/state-service.js';
import { showToast } from './toast.js';

const container = document.getElementById('rules-container');
const countBadge = document.getElementById('rules-count-badge');
const searchInput = document.getElementById('search-rules');

let openEditorFn = null; // injected by rule-editor.js to avoid a circular import

export function bindRuleEditorOpener(fn) {
  openEditorFn = fn;
}

function badgesFor(rule) {
  const badges = [];
  if (rule.actions.mock.enabled) badges.push(`<span class="badge badge-mock">Mock ${rule.actions.mock.status}</span>`);
  if (rule.actions.latency.enabled) badges.push(`<span class="badge badge-delay">${rule.actions.latency.ms}ms Delay</span>`);
  if (rule.actions.failure.enabled) badges.push(`<span class="badge badge-fail">${rule.actions.failure.rate}% Fail</span>`);
  if (rule.actions.malformed.enabled) badges.push(`<span class="badge badge-malformed">Malformed</span>`);
  return badges.length ? badges.join('') : '<span class="badge-empty">No fault actions enabled</span>';
}

export function renderRules() {
  const state = getState();
  const query = searchInput.value.toLowerCase();
  const filtered = state.rules.filter(r =>
    r.pattern.toLowerCase().includes(query) || r.method.toLowerCase().includes(query)
  );

  countBadge.textContent = state.rules.length;
  container.innerHTML = '';

  if (filtered.length === 0) {
    container.innerHTML = `<div class="empty-state">No matching rules found.</div>`;
    return;
  }

  filtered.forEach(rule => {
    const card = document.createElement('div');
    card.className = `rule-card${rule.enabled ? '' : ' disabled'}`;
    card.innerHTML = `
      <div class="rule-top">
        <div class="rule-left">
          <button class="switch${rule.enabled ? ' on' : ''}" data-action="toggle" data-id="${rule.id}">
            <span class="switch-knob"></span>
          </button>
          <span class="method-tag method-${rule.method}">${rule.method}</span>
          <span class="rule-pattern" title="${rule.pattern}">${rule.pattern}</span>
        </div>
        <div class="rule-actions">
          <button class="icon-btn" data-action="edit" data-id="${rule.id}" title="Edit">✎</button>
          <button class="icon-btn" data-action="duplicate" data-id="${rule.id}" title="Duplicate">⧉</button>
          <button class="icon-btn" data-action="delete" data-id="${rule.id}" title="Delete">🗑</button>
        </div>
      </div>
      <div class="rule-badges">${badgesFor(rule)}</div>
    `;
    container.appendChild(card);
  });
}

// Event delegation: one listener for the whole list instead of per-card binds
container.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const { action, id } = btn.dataset;

  if (action === 'toggle') {
    await toggleRule(id);
    showToast('Rule updated');
  } else if (action === 'delete') {
    await deleteRule(id);
    showToast('Rule deleted');
  } else if (action === 'duplicate') {
    await duplicateRule(id);
    showToast('Rule duplicated');
  } else if (action === 'edit') {
    openEditorFn?.(id);
  }
});

searchInput.addEventListener('input', renderRules);
