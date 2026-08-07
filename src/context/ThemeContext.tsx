import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { ConfigProvider } from 'antd';

export type ThemeType = 'green' | 'blue' | 'purple' | 'rose' | 'orange' | 'teal';

interface ThemeContextType {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  primaryHex: string;
}

const themeHexMap: Record<ThemeType, string> = {
  green: '#10b981',
  blue: '#3b82f6',
  purple: '#a855f7',
  rose: '#f43f5e',
  orange: '#f97316',
  teal: '#14b8a6'
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeType>(() => {
    const saved = localStorage.getItem('splitwisely_theme');
    return (saved as ThemeType) || 'green';
  });

  useEffect(() => {
    if (theme === 'green') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, [theme]);

  const setTheme = (newTheme: ThemeType) => {
    localStorage.setItem('splitwisely_theme', newTheme);
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, primaryHex: themeHexMap[theme] }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function ThemeConfigWrapper({ children }: { children: ReactNode }) {
  const { primaryHex } = useTheme();
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: primaryHex,
          colorInfo: primaryHex,
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
