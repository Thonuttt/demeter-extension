// simulator-service.js
// Bridges the "Live Simulator" tab to the shared rule-engine, so testing
// a rule in the panel exercises the exact same logic the real
// content-script interceptor uses.

import { resolveOutcome } from './rule-engine.js';

export function runSimulation(rules, globalActive, method, url) {
  const outcome = resolveOutcome(rules, method, url, globalActive);
  return new Promise((resolve) => {
    const delay = outcome.delayMs ?? 12;
    setTimeout(() => resolve({ ...outcome, delayMs: delay }), delay);
  });
}
