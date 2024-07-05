import React, { useEffect, useState } from "react";
import { getStorageData, setStorageData, isExtensionEnvironment } from '../utils/chromeAPI';
import styles from "./hydration.module.css"
import { useTheme } from '../theme.jsx';
function Hydration() {
  const [waterIntake, setWaterIntake] = useState(0);
  const [goal, setGoal] = useState(2000); // 2 liters default
  const [lastResetDate, setLastResetDate] = useState(null);
  const { isDarkMode } = useTheme();
  useEffect(() => {
    getStorageData('waterIntake').then((intake) => setWaterIntake(intake || 0));
    getStorageData('hydrationGoal').then((savedGoal) => setGoal(savedGoal || 2000));
    getStorageData('hydrationLastResetDate').then((date) => setLastResetDate(date));

    const dailyResetInterval = setInterval(() => {
      const now = new Date();
      if (lastResetDate && new Date(lastResetDate).getDate() !== now.getDate()) {
        // Automatic reset at midnight
        resetWaterIntake(false);
      }
    }, 60000);

    // Set up water reminder notification every 1 minute
    const reminderInterval = setInterval(() => {
      showWaterReminder();
    }, 60000); // Every 1 minute (60000 ms)

    return () => {
      clearInterval(dailyResetInterval);
      clearInterval(reminderInterval);
    };
  }, [lastResetDate]);

  const addWater = (amount) => {
    const newIntake = waterIntake + amount;
    setWaterIntake(newIntake);
    setStorageData('waterIntake', newIntake);
  };

  const updateGoal = (newGoal) => {
    setGoal(newGoal);
    setStorageData('hydrationGoal', newGoal);
  };

  const resetWaterIntake = (showConfirmation = true) => {
    const performReset = () => {
      setWaterIntake(0);
      setStorageData('waterIntake', 0);
      const now = new Date().toISOString();
      setLastResetDate(now);
      setStorageData('hydrationLastResetDate', now);
    };

    if (showConfirmation) {
      if (window.confirm("Are you sure you want to reset your water intake?")) {
        performReset();
      }
    } else {
      performReset();
    }
  };

  const showWaterReminder = () => {
    if (isExtensionEnvironment()) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon.png', // Make sure to have an icon file in your extension
        title: 'Hydration Reminder',
        message: 'Time to drink some water!'
      });
    } else {
      // For development environment
      if ('Notification' in window) {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification('Hydration Reminder', {
              body: 'Time to drink some water!'
            });
          }
        });
      } else {
        console.log('Notifications not supported in this environment');
      }
    }
  };

  const progress = (waterIntake / goal) * 100;

    return (
      <div className={`${styles.hydrationTracker} ${isDarkMode ? styles.darkMode : styles.lightMode}`}>
      <h2>Hydration Tracker</h2>
      <p className={styles.hydrationInfo}>Water intake today: {waterIntake} ml / {goal} ml</p>
      <div className={styles.progressBar}>
        <div 
          className={styles.progressFill}
          style={{ width: `${Math.min(progress, 100)}%` }}
        ></div>
      </div>
      <div className={styles.buttonGroup}>
        <button className={styles.button} onClick={() => addWater(250)}>Add 250ml</button>
        <button className={styles.button} onClick={() => addWater(500)}>Add 500ml</button>
        <button className={`${styles.button} ${styles.resetButton}`} onClick={() => resetWaterIntake(true)}>Reset Water Intake</button>
      </div>
      <input 
        className={styles.input}
        type="number" 
        value={goal} 
        onChange={(e) => updateGoal(Number(e.target.value))} 
        placeholder="Set daily goal (ml)"
      />
      <p>Set Daily Goal (ml)</p>
      {!isExtensionEnvironment() && (
        <p className={styles.developmentMode}>Running in development mode</p>
      )}
    </div>
  );
}

export default Hydration;
