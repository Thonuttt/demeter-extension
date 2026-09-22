// rule-editor.js — modal for creating/editing a single rule

import { getState, upsertRule } from '../services/state-service.js';
import { renderRules, bindRuleEditorOpener } from './rules-view.js';
import { showToast } from './toast.js';

const modal = document.getElementById('rule-editor-modal');
const form = document.getElementById('rule-form');
const modalTitle = document.getElementById('modal-title');

const el = (id) => document.getElementById(id);

function toggleSection(name) {
  const checkbox = el(`enable-${name}`);
  const section = el(`section-${name}`);
  section.classList.toggle('hidden', !checkbox.checked);
}

['mock', 'latency', 'failure'].forEach(name => {
  el(`enable-${name}`).addEventListener('change', () => toggleSection(name));
});

el('failure-rate').addEventListener('input', (e) => {
  el('failure-rate-val').textContent = e.target.value + '%';
});

function openEditor(ruleId = null) {
  form.reset();
  if (ruleId) {
    modalTitle.textContent = 'Edit Fault Rule';
    const rule = getState().rules.find(r => r.id === ruleId);
    if (!rule) return;

    el('edit-rule-id').value = rule.id;
    el('form-method').value = rule.method;
    el('form-pattern').value = rule.pattern;
    document.querySelector(`input[name="matchType"][value="${rule.matchType}"]`).checked = true;

    el('enable-mock').checked = rule.actions.mock.enabled;
    el('mock-status').value = rule.actions.mock.status;
    el('mock-content-type').value = rule.actions.mock.contentType;
    el('mock-body').value = rule.actions.mock.body;

    el('enable-latency').checked = rule.actions.latency.enabled;
    el('latency-ms').value = rule.actions.latency.ms;
    el('latency-jitter').checked = rule.actions.latency.jitter;

    el('enable-failure').checked = rule.actions.failure.enabled;
    el('failure-rate').value = rule.actions.failure.rate;
    el('failure-rate-val').textContent = rule.actions.failure.rate + '%';
    document.querySelector(`input[name="failType"][value="${rule.actions.failure.type}"]`).checked = true;

    el('enable-malformed').checked = rule.actions.malformed.enabled;
  } else {
    modalTitle.textContent = 'Create New Fault Rule';
    el('edit-rule-id').value = '';
    el('failure-rate-val').textContent = '50%';
  }

  ['mock', 'latency', 'failure'].forEach(toggleSection);
  modal.classList.remove('hidden');
}

function closeEditor() {
  modal.classList.add('hidden');
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const ruleId = el('edit-rule-id').value;

  const rule = {
    id: ruleId || 'rule_' + Date.now(),
    enabled: true,
    pattern: el('form-pattern').value.trim(),
    method: el('form-method').value,
    matchType: document.querySelector('input[name="matchType"]:checked').value,
    actions: {
      mock: {
        enabled: el('enable-mock').checked,
        status: parseInt(el('mock-status').value, 10),
        contentType: el('mock-content-type').value,
        body: el('mock-body').value,
      },
      latency: {
        enabled: el('enable-latency').checked,
        ms: parseInt(el('latency-ms').value, 10) || 0,
        jitter: el('latency-jitter').checked,
      },
      failure: {
        enabled: el('enable-failure').checked,
        rate: parseInt(el('failure-rate').value, 10),
        type: document.querySelector('input[name="failType"]:checked').value,
      },
      malformed: {
        enabled: el('enable-malformed').checked,
      },
    },
  };

  await upsertRule(rule);
  renderRules();
  closeEditor();
  showToast('Rule configuration saved!');
});

el('close-modal-btn').addEventListener('click', closeEditor);
el('cancel-modal-btn').addEventListener('click', closeEditor);
el('new-rule-btn').addEventListener('click', () => openEditor(null));

// rules-view.js calls this when a card's "edit" button is clicked
bindRuleEditorOpener(openEditor);
