console.log('background init')

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

// src/background.js
console.log('Background script initialized');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received:', request);

  if (request.type === 'setReminder') {
    const { id, time, title, message } = request;

    const scheduledTime = Number(time);
    const offset = new Date().getTimezoneOffset();
    const localTime = new Date(new Date().getTime() - offset * 60000).toISOString();

    if (isNaN(scheduledTime)) {
      console.error('Invalid time value:', time);
      sendResponse({ success: false, error: 'Invalid time value' });
      return true;
    }

    if (scheduledTime <= localTime) {
      console.error('Scheduled time is in the past:', scheduledTime);
      sendResponse({ success: false, error: 'Scheduled time must be in the future' });
      return true;
    }

    try {
      console.log(`new Date().getTime(): ${new Date().getTime()}, scheduledTime: ${scheduledTime}, scheduledTime - offset * 60000: ${scheduledTime - offset * 60000}`)
      chrome.alarms.create(`reminder_${id}`, {
        when: scheduledTime + offset * 60000
      });
      console.log('Alarm created for:', new Date(scheduledTime));

      chrome.storage.local.set({ [id]: { title, message } }, () => {
        if (chrome.runtime.lastError) {
          console.error('Storage error:', chrome.runtime.lastError);
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          console.log('Reminder data stored:', { id, title, message });
          sendResponse({ success: true });
        }
      });
    } catch (error) {
      console.error('Error setting alarm:', error);
      sendResponse({ success: false, error: error.message });
    }
  } else {
    sendResponse({ success: false, error: 'Unknown message type' });
  }

  return true; // Keep the channel open for async response
});

chrome.alarms.onAlarm.addListener((alarm) => {
  console.log('Alarm triggered:', alarm.name);
  if (alarm.name.startsWith('reminder_')) {
    const reminderId = alarm.name.split('_')[1];
    console.log('Fetching reminder data for ID:', reminderId);

    chrome.storage.local.get(reminderId, (data) => {
      if (chrome.runtime.lastError) {
        console.error('Storage get error:', chrome.runtime.lastError);
        return;
      }

      console.log('Raw storage data:', data);
      const reminder = data[reminderId];
      console.log('Reminder object:', reminder);

      if (reminder) {
        console.log('Attempting to create notification with:', reminder);
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/128x128.png',
          title: reminder.title || 'Reminder',
          message: reminder.message,
          priority: 2
        }, (notificationId) => {
          if (chrome.runtime.lastError) {
            console.error('Notification creation failed:', chrome.runtime.lastError);
          } else {
            console.log('Notification displayed with ID:', notificationId);
          }
        });
      } else {
        console.error('No reminder data found for ID:', reminderId);
        // Log all storage to diagnose
        chrome.storage.local.get(null, (allData) => {
          console.log('All stored data:', allData);
        });
      }
    });
  } else {
    console.log('Ignoring non-reminder alarm:', alarm.name);
  }
});