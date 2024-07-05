// Create alarms for screen time and eyestrain tracking
chrome.alarms.create("screenTimeTracker", { periodInMinutes: 1 });
chrome.alarms.create("eyestrainTracker", { periodInMinutes: 1 / 60 }); // Run every second

// Listen for alarm events
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "screenTimeTracker") {
    updateScreenTime();
  } else if (alarm.name === "eyestrainTracker") {
    updateEyestrainTimer();
  }
});

function updateScreenTime() {
  chrome.storage.local.get(["screenTime", "lastResetDate"], (result) => {
    let screenTime = result.screenTime || 0;
    let lastResetDate = result.lastResetDate
      ? new Date(result.lastResetDate)
      : new Date();
    const now = new Date();

    // Check if it's a new day
    if (
      now.getDate() !== lastResetDate.getDate() ||
      now.getMonth() !== lastResetDate.getMonth() ||
      now.getFullYear() !== lastResetDate.getFullYear()
    ) {
      screenTime = 0;
      lastResetDate = now;
      console.log("New day detected. Resetting screen time.");
    }

    screenTime++;

    chrome.storage.local.set(
      {
        screenTime: screenTime,
        lastResetDate: lastResetDate.toISOString(),
      },
      () => {
        console.log(`Screen time updated: ${screenTime} minutes`);
      }
    );
  });
}

function updateEyestrainTimer() {
  chrome.storage.local.get(["nextBreak", "isOnBreak"], (result) => {
    let nextBreak = result.nextBreak ?? 20 * 60;
    let isOnBreak = result.isOnBreak ?? false;

    if (nextBreak <= 0) {
      if (!isOnBreak) {
        console.log("Break time started");
        showEyeBreakNotification();
        isOnBreak = true;
        nextBreak = 20; // 20 seconds break time
        chrome.storage.local.set({ shouldPlayAlarm: true });
      } else {
        console.log("Break time ended");
        isOnBreak = false;
        nextBreak = 20 * 60; // Back to 20 minutes
        chrome.storage.local.set({ shouldPlayAlarm: true }); // Play alarm at end of break too
      }
    } else {
      nextBreak--;
    }

    chrome.storage.local.set({ nextBreak, isOnBreak }, () => {
      console.log(
        `Timer updated: ${nextBreak} seconds, isOnBreak: ${isOnBreak}`
      );
    });
  });
}

function showEyeBreakNotification() {
  chrome.notifications.create(
    {
      type: "basic",
      iconUrl: "icon.png",
      title: "Eye Break",
      message: "Look at something 20 feet away for 20 seconds",
    },
    (notificationId) => {
      console.log("Notification shown with ID:", notificationId);
    }
  );
}
// Add this to your existing background.js file

let hydrationReminderInterval;

function startHydrationReminders() {
  // Clear any existing interval
  if (hydrationReminderInterval) {
    clearInterval(hydrationReminderInterval);
  }

  // Set up a new interval
  hydrationReminderInterval = setInterval(() => {
    chrome.storage.local.get(["waterIntake", "hydrationGoal"], (result) => {
      const waterIntake = result.waterIntake || 0;
      const goal = result.hydrationGoal || 2000;

      if (waterIntake < goal) {
        showHydrationNotification();
      }
    });
  }, 60000); // Every 1 minute
}

function showHydrationNotification() {
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icon.png",
    title: "Hydration Reminder",
    message: "Time to drink some water!",
  });
}

// Start the reminders when the extension is installed or updated
chrome.runtime.onInstalled.addListener(startHydrationReminders);

// Restart the reminders when Chrome starts
chrome.runtime.onStartup.addListener(startHydrationReminders);

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "restartHydrationReminders") {
    startHydrationReminders();
    sendResponse({ success: true });
  }
});
// Listen for messages from the popup or content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Message received:", request);
  switch (request.action) {
    case "getScreenTime":
      chrome.storage.local.get("screenTime", (result) => {
        sendResponse({ screenTime: result.screenTime || 0 });
      });
      break;
    case "resetScreenTime":
      chrome.storage.local.set(
        {
          screenTime: 0,
          lastResetDate: new Date().toISOString(),
        },
        () => {
          console.log("Screen time reset");
          sendResponse({ success: true });
        }
      );
      break;
    case "takeBreakNow":
      chrome.storage.local.set(
        {
          nextBreak: 20,
          isOnBreak: true,
          shouldPlayAlarm: true,
        },
        () => {
          showEyeBreakNotification();
          sendResponse({ success: true });
        }
      );
      break;
    case "startEyestrainTimer":
      // You might want to add any initialization logic here if needed
      sendResponse({ success: true });
      break;
    case "showEyeBreakNotification":
      showEyeBreakNotification();
      sendResponse({ success: true });
      break;
    case "playAlarm":
      chrome.storage.local.set({ shouldPlayAlarm: true }, () => {
        console.log("Alarm flag set to true");
        sendResponse({ success: true });
      });
      break;
    default:
      console.log("Unknown action:", request.action);
      sendResponse({ error: "Unknown action" });
  }
  return true; // Indicates we will send a response asynchronously
});

// Ensure alarms are created when Chrome starts
chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create("screenTimeTracker", { periodInMinutes: 1 });
  chrome.alarms.create("eyestrainTracker", { periodInMinutes: 1 / 60 });
  initializeStorage();
});

function initializeStorage() {
  chrome.storage.local.get(
    ["screenTime", "lastResetDate", "nextBreak", "isOnBreak", "dailyGoal"],
    (result) => {
      const now = new Date();
      const updates = {};

      if (
        !result.screenTime ||
        !result.lastResetDate ||
        new Date(result.lastResetDate).getDate() !== now.getDate()
      ) {
        updates.screenTime = 0;
        updates.lastResetDate = now.toISOString();
      }

      if (result.nextBreak === undefined) {
        updates.nextBreak = 20 * 60;
        updates.isOnBreak = false;
        updates.shouldPlayAlarm = false;
      }

      if (result.dailyGoal === undefined) {
        updates.dailyGoal = 480; // 8 hours default
      }

      if (Object.keys(updates).length > 0) {
        chrome.storage.local.set(updates, () => {
          console.log("Storage initialized:", updates);
        });
      }
    }
  );
}

// Initialize when the extension is installed or updated
chrome.runtime.onInstalled.addListener(initializeStorage);

console.log("Background script loaded");
