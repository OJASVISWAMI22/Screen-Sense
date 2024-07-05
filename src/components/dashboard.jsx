import React, { useEffect, useState } from "react";
import Eyestrain from "./eyestrain.jsx";
import Hydration from "./hydration.jsx";
import ThemeToggle from "./toggle.jsx";
import { useTheme } from '../theme.jsx';
import styles from "./dashboard.module.css"
function Dashboard() {
  const [screenTime, setScreenTime] = useState(0);
  const [dailyGoal, setDailyGoal] = useState(480);
  const [lastResetDate, setLastResetDate] = useState(null);
  const [isExtension, setIsExtension] = useState(false);
  const { isDarkMode } = useTheme();
  useEffect(() => {
    // Check if we're in a Chrome extension environment
    setIsExtension(!!window.chrome && !!window.chrome.runtime && !!window.chrome.runtime.id);
  }, []);

  useEffect(() => {
    let intervalId;

    function loadData() {
      if (isExtension) {
        // Extension environment
        chrome.storage.local.get(['screenTime', 'dailyGoal', 'lastResetDate'], (result) => {
          console.log('Loaded data:', result);
          setScreenTime(result.screenTime || 0);
          setDailyGoal(result.dailyGoal || 480);
          setLastResetDate(result.lastResetDate);
        });
      } else {
        // Web environment - use localStorage
        const storedScreenTime = parseInt(localStorage.getItem('screenTime') || '0', 10);
        const storedDailyGoal = parseInt(localStorage.getItem('dailyGoal') || '480', 10);
        const storedLastResetDate = localStorage.getItem('lastResetDate');
        
        setScreenTime(storedScreenTime);
        setDailyGoal(storedDailyGoal);
        setLastResetDate(storedLastResetDate);

        // Increment screen time every minute for web version
        setScreenTime(prevTime => {
          const newTime = prevTime + 1;
          localStorage.setItem('screenTime', newTime.toString());
          return newTime;
        });
      }
    }

    loadData();
    intervalId = setInterval(loadData, 60000); // Update every minute

    return () => clearInterval(intervalId);
  }, [isExtension]);

  useEffect(() => {
    const checkMidnightReset = () => {
      const now = new Date();
      if (lastResetDate && new Date(lastResetDate).getDate() !== now.getDate()) {
        resetScreenTime(false);
      }
    };

    const interval = setInterval(checkMidnightReset, 60000);
    return () => clearInterval(interval);
  }, [lastResetDate]);

  const updateDailyGoal = (newGoal) => {
    setDailyGoal(newGoal);
    if (isExtension) {
      chrome.storage.local.set({ dailyGoal: newGoal });
    } else {
      localStorage.setItem('dailyGoal', newGoal.toString());
    }
  };

  const resetScreenTime = (showConfirmation = true) => {
    const performReset = () => {
      const now = new Date().toISOString();
      if (isExtension) {
        chrome.storage.local.set({
          screenTime: 0,
          lastResetDate: now
        }, () => {
          setScreenTime(0);
          setLastResetDate(now);
          console.log('Screen time reset');
        });
      } else {
        localStorage.setItem('screenTime', '0');
        localStorage.setItem('lastResetDate', now);
        setScreenTime(0);
        setLastResetDate(now);
      }
    };

    if (showConfirmation && !window.confirm("Are you sure you want to reset your screen time?")) {
      return;
    }
    performReset();
  };

  const screenTimeHours = Math.floor(screenTime / 60);
  const screenTimeMinutes = screenTime % 60;
  const progress = (screenTime / dailyGoal) * 100;

  return (
    <div className={`${styles.dashboard} ${isDarkMode ? styles.darkMode : styles.lightMode}`}>
    <h1>Screensense Dashboard</h1>
    <div className={styles.screenTimeSection}>
      <h2>Screen Time</h2>
      <p>
        Today: {screenTimeHours}h {screenTimeMinutes}m / {dailyGoal / 60}h Goal
      </p>
      <div className={styles.progressBar}>
        <div 
          className={styles.progressFill}
          style={{
            width: `${Math.min(progress, 100)}%`,
            backgroundColor: progress > 100 ? "#ff4444" : "#4CAF50",
          }}
        ></div>
      </div>
      <button className={styles.button} onClick={() => resetScreenTime(true)}>Reset Screen Time</button>
      <input
        className={styles.input}
        type="number"
        value={dailyGoal / 60}
        onChange={(e) => updateDailyGoal(Number(e.target.value) * 60)}
        placeholder="Daily goal (hours)"
        />
        </div>
        <Eyestrain />
        <Hydration />
      </div>
  );
}

export default Dashboard;
