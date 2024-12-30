// Log when the service worker is registered
console.log('Background script running');

// Handle installation or update of the extension
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Extension installed for the first time!');
  } else if (details.reason === 'update') {
    console.log('Extension updated to a new version!');
  }
});

// Example: Listening for messages from the side panel or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received in background:', message);

  if (message.type === 'FETCH_NOTES') {
    // Example logic to fetch notes from Supabase (if needed in the background)
    // fetchNotesFromSupabase().then(notes => sendResponse({ notes }));
    sendResponse({ notes: ['Sample Note 1', 'Sample Note 2'] }); // Mock response
  }

  if (message.type === 'SEARCH_NOTES') {
    // Example logic to search notes or process user input
    sendResponse({ results: ['Search Result 1', 'Search Result 2'] }); // Mock response
  }

  // Return true to indicate an asynchronous response will be sent
  return true;
});

// Example: Context menu setup (if you want to add a right-click menu)
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'add-note',
    title: 'Add Note',
    contexts: ['selection'], // Only show when text is selected
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'add-note') {
    console.log('Add note triggered for:', info.selectionText);
    // Send the selected text to the side panel or save it as a note
    chrome.runtime.sendMessage({ type: 'ADD_NOTE', text: info.selectionText });
  }
});

// Example: Action triggered when the extension's icon is clicked
chrome.action.onClicked.addListener((tab) => {
  console.log('Extension icon clicked in tab:', tab);
  chrome.runtime.openOptionsPage(); // Open the options page if you have one
});
