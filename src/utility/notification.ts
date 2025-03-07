// src/utils/notifications.js
export class NotificationManager {
  static async setReminder(message: string, time: string, title = 'Memento Reminder') {
    return new Promise((resolve, reject) => {
      const reminderId = Date.now().toString();
      let scheduledTime;

      try {
        scheduledTime = new Date(time).getTime();
        if (isNaN(scheduledTime)) {
          throw new Error('Invalid time format');
        }
      } catch (error) {
        console.error('Invalid time provided:', time, error);
        reject(new Error('Invalid time format. Use a valid Date string or timestamp.'));
        return;
      }

      console.log('Attempting to set reminder:', { reminderId, message, time });

      if (scheduledTime <= Date.now()) {
        console.error('Time is in the past:', time);
        reject(new Error('Scheduled time must be in the future'));
        return;
      }

      chrome.runtime.sendMessage({
        type: 'setReminder',
        id: reminderId,
        time: scheduledTime,
        title,
        message
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Runtime error:', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
          return;
        }

        if (!response) {
          console.error('No response from background script');
          reject(new Error('No response from background script'));
          return;
        }

        if (response.success) {
          console.log('Reminder set successfully:', reminderId);
          resolve(reminderId);
        } else {
          console.error('Background script error:', response.error);
          reject(new Error(response.error || 'Failed to set reminder'));
        }
      });
    });
  }
}