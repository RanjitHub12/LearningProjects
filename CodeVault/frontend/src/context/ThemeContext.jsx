import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeContextProvider({ children }) {
  const [mode, setMode] = useState(() => localStorage.getItem('cv-theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
    localStorage.setItem('cv-theme', mode);
  }, [mode]);

  const toggle = () => setMode(prev => (prev === 'dark' ? 'light' : 'dark'));

  return (
    <ThemeContext.Provider value={{ mode, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useThemeMode = () => useContext(ThemeContext);
