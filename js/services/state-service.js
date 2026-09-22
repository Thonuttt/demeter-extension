// state-service.js
// Single in-memory source of truth for the side panel session.
// UI modules subscribe to changes instead of reaching into a global.
// Persists to storage-service on every mutation.

import { loadState, saveState } from './storage-service.js';

let state = null;
const listeners = new Set();

export async function initState() {
  state = await loadState();
  return state;
}

export function getState() {
  return state;
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  listeners.forEach(fn => fn(state));
}

async function persistAndNotify() {
  await saveState(state);
  notify();
}

export async function setGlobalActive(active) {
  state.globalActive = active;
  await persistAndNotify();
}

export async function upsertRule(rule) {
  const idx = state.rules.findIndex(r => r.id === rule.id);
  if (idx !== -1) state.rules[idx] = rule;
  else state.rules.unshift(rule);
  await persistAndNotify();
}

export async function deleteRule(id) {
  state.rules = state.rules.filter(r => r.id !== id);
  await persistAndNotify();
}

export async function duplicateRule(id) {
  const rule = state.rules.find(r => r.id === id);
  if (!rule) return;
  const copy = structuredClone(rule);
  copy.id = 'rule_' + Date.now();
  copy.pattern = copy.pattern + '_copy';
  state.rules.push(copy);
  await persistAndNotify();
}

export async function toggleRule(id) {
  const rule = state.rules.find(r => r.id === id);
  if (!rule) return;
  rule.enabled = !rule.enabled;
  await persistAndNotify();
}

export async function recordHit(wasFault) {
  state.stats.intercepted += 1;
  if (wasFault) state.stats.faults += 1;
  state.stats.lastHit = new Date().toTimeString().split(' ')[0];
  await persistAndNotify();
}

export async function replaceRules(newState) {
  state.rules = newState.rules;
  await persistAndNotify();
}
