# Demeter — MV3 Extension (v1 skeleton)

## Load it in Chrome
1. `chrome://extensions` → enable **Developer mode**
2. **Load unpacked** → select this folder
3. Click the extension icon to open the side panel

## Module map (service-style split)

```
manifest.json
sidepanel.html              UI shell — no inline handlers, no CDN scripts
css/
  theme.css                 CSS variables (replaces Tailwind CDN)
  components.css            Component styles
js/
  main.js                   Entry point — wires everything together
  background.js             MV3 service worker (opens side panel)
  content-interceptor.js    ISOLATED-world bridge: storage <-> page
  injected.js                MAIN-world: actual fetch/XHR override
  services/
    rule-engine.js           Pure matching + fault logic (side panel's
                              source of truth — shared shape with injected.js)
    state-service.js          In-memory store + pub/sub for the panel
    storage-service.js        chrome.storage.local wrapper, JSON import/export
    simulator-service.js      Runs a fake request through rule-engine
  ui/
    rules-view.js              Rule list rendering + card actions
    rule-editor.js             Create/edit modal
    simulator-view.js          Live Simulator tab
    toast.js                   Notifications
```

## Why it's split this way
- **services/** never touch the DOM — testable in isolation, and
  `rule-engine.js` is the logic both the panel's simulator and (in
  spirit) the real interceptor are built around.
- **ui/** never talks to `chrome.storage` directly — always through
  `state-service.js`, so there's one source of truth per session.
- **injected.js** duplicates a small slice of the matching logic
  (see comment at the top of that file) because MAIN-world content
  scripts can't reach `chrome.runtime` to import the shared module.
  If that becomes annoying to maintain, the fix is to pass the
  resolved module URL over from `content-interceptor.js`.

## Known v1 limitations (carried over from the docs)
- XHR support only does latency injection for now, not full mocking —
  fetch is fully supported (mock, delay, fail, malformed)
- No true network-layer interception — page-level `fetch`/XHR override
  only, so it won't catch requests from iframes or other extensions
- Icons in `/icons` are placeholders — swap before shipping
