import React, { useEffect, useState, useCallback, useRef } from "react";
import { isExtensionEnvironment } from '../utils/chromeAPI';
import { useTheme } from '../theme.jsx';
import styles from "./eyestrain.module.css";
function Eyestrain() {
  const [nextBreak, setNextBreak] = useState(20 * 60); // 20 minutes in seconds
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [screenTime, setScreenTime] = useState(0);
  const audioContextRef = useRef(null);
  const { isDarkMode } = useTheme();
  const playAlarm = useCallback(() => {
    console.log("playAlarm function called");
    if (!audioContextRef.current) {
      console.log("Creating new AudioContext");
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    try {
      const oscillator = audioContextRef.current.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(440, audioContextRef.current.currentTime); // 440 Hz
      
      const gainNode = audioContextRef.current.createGain();
      gainNode.gain.setValueAtTime(0.5, audioContextRef.current.currentTime);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);
      
      oscillator.start();
      oscillator.stop(audioContextRef.current.currentTime + 1); // Beep for 1 second
      console.log("Alarm sound played successfully");
    } catch (error) {
      console.error("Error playing alarm:", error);
    }
  }, []);

  const showNotification = useCallback(() => {
    if (isExtensionEnvironment()) {
      chrome.runtime.sendMessage({ action: "showEyeBreakNotification" });
    } else if ('Notification' in window) {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification('Eye Break', {
            body: 'Look at something 20 feet away for 20 seconds',
          });
        }
      });
    }
  }, []);

  const updateTimer = useCallback(() => {
    setNextBreak(prevTime => {
      if (prevTime <= 0) {
        console.log("Timer reached zero");
        if (!isOnBreak) {
          console.log("Starting break");
          playAlarm();
          showNotification();
          setIsOnBreak(true);
          return 20; // 20 seconds break time
        } else {
          console.log("Ending break");
          playAlarm();
          showNotification();
          setIsOnBreak(false);
          return 20 * 60; // Back to 20 minutes
        }
      }
      return prevTime - 1;
    });
  }, [isOnBreak, playAlarm, showNotification]);

  useEffect(() => {
    console.log("Eyestrain component mounted");
    console.log("Is extension environment:", isExtensionEnvironment());

    let interval;

    if (isExtensionEnvironment()) {
      const fetchData = () => {
        console.log("Fetching data from chrome.storage");
        chrome.storage.local.get(['nextBreak', 'isOnBreak', 'screenTime', 'shouldPlayAlarm'], (result) => {
          console.log("Fetched data:", result);
          setNextBreak(result.nextBreak ?? 20 * 60);
          setIsOnBreak(result.isOnBreak ?? false);
          setScreenTime(result.screenTime ?? 0);
          
          if (result.shouldPlayAlarm) {
            playAlarm();
            showNotification();
            chrome.storage.local.set({ shouldPlayAlarm: false });
          }
        });
      };

      fetchData(); // Initial fetch
      interval = setInterval(fetchData, 1000);

      chrome.runtime.sendMessage({ action: "startEyestrainTimer" }, (response) => {
        console.log("startEyestrainTimer response:", response);
      });

      // Check for alarm flag
      const checkAlarmFlag = () => {
        chrome.storage.local.get(['shouldPlayAlarm'], (result) => {
          if (result.shouldPlayAlarm) {
            playAlarm();
            showNotification();
            chrome.storage.local.set({ shouldPlayAlarm: false });
          }
        });
      };

      const alarmCheckInterval = setInterval(checkAlarmFlag, 1000);

      return () => {
        clearInterval(interval);
        clearInterval(alarmCheckInterval);
      };
    } else {
      console.log("Running in development mode");
      interval = setInterval(() => {
        updateTimer();
        setScreenTime(prevTime => prevTime + 1);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [updateTimer, playAlarm, showNotification]);

  const takeBreakNow = () => {
    console.log("takeBreakNow called");
    if (!isOnBreak) {
      if (isExtensionEnvironment()) {
        chrome.runtime.sendMessage({ action: "takeBreakNow" }, (response) => {
          console.log("takeBreakNow response:", response);
          playAlarm();
          showNotification();
        });
      } else {
        setIsOnBreak(true);
        setNextBreak(20);
        playAlarm();
        showNotification();
      }
    }
  };

  const minutes = Math.floor(nextBreak / 60);
  const seconds = nextBreak % 60;

  return (
    <div className={`${styles.eyestrainReducer} ${isDarkMode ? styles.darkMode : styles.lightMode}`}>
      <h2>Eye Strain Reducer</h2>
      {isOnBreak ? (
        <p className={`${styles.timerInfo} ${styles.onBreak}`}>On break! Look away for: {seconds} seconds</p>
      ) : (
        <p className={styles.timerInfo}>Next break in: {minutes}:{seconds.toString().padStart(2, '0')}</p>
      )}
      <button 
        className={styles.button} 
        onClick={takeBreakNow} 
        disabled={isOnBreak}
        >
        {isOnBreak ? "Taking a break" : "Take Break Now"}
      </button>
      <p className={styles.screenTime}>Screen time: {Math.floor(screenTime / 60)} minutes</p>
    </div>
  );
}

export default Eyestrain;