export const isExtensionEnvironment = () => {
  return typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;
};

export const getStorageData = (key) => {
  return new Promise((resolve) => {
    if (isExtensionEnvironment()) {
      chrome.storage.local.get([key], (result) => {
        resolve(result[key]);
      });
    } else {
      // For development, use localStorage
      const value = localStorage.getItem(key);
      resolve(value ? JSON.parse(value) : null);
    }
  });
};

export const setStorageData = (key, value) => {
  if (isExtensionEnvironment()) {
    chrome.storage.local.set({ [key]: value });
  } else {
    // For development, use localStorage
    localStorage.setItem(key, JSON.stringify(value));
  }
};

export const createNotification = (title, message) => {
  if (isExtensionEnvironment()) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon.png',
      title: title,
      message: message
    });
  } else {
    // For development, use browser notification
    if ('Notification' in window) {
      Notification.requestPermission().then(function (permission) {
        if (permission === 'granted') {
          new Notification(title, { body: message });
        }
      });
    }
  }
};