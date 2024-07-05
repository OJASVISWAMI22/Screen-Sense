import React from 'react'
import Dashboard from './components/dashboard.jsx'
import styles from "./App.module.css"
import ThemeToggle from './components/toggle.jsx';
import { ThemeProvider, useTheme } from './theme.jsx';

const AppContent = () => {
  const { isDarkMode } = useTheme();

  return (
    <div className={`${styles.app} ${isDarkMode ? styles.darkMode : styles.lightMode}`}>
      <header className={styles.header}>
        <h1>ScreenSense</h1>
        <ThemeToggle />
      </header>
      <main className={styles.main}>
        <Dashboard />
      </main>
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;