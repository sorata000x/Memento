chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'openSidePanel',
    title: 'Open side panel',
    contexts: ['all']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'openSidePanel') {
    // This will open the panel in all the pages on the current window.
    chrome.sidePanel.open({ windowId: tab.windowId });
  }
});

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    // Open the onboarding page in a new tab
    chrome.tabs.create({ url: "https://www.memento-note.com/onboarding" });
  }
});
  
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "openSetting") {
    chrome.tabs.create({ url: chrome.runtime.getURL("setting.html") });
  }
});

// Firefox

browser.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
      browser.tabs.create({ url: "https://memento-note.com" });
  }
});

