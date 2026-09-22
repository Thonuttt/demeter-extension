// background.js — minimal MV3 service worker.
// Only job: let the toolbar icon open the side panel.

chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});
