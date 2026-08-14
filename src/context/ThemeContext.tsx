import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { ConfigProvider, theme as antdTheme, App as AntdApp } from 'antd';

export type ThemeType = 'green' | 'blue' | 'purple' | 'rose' | 'orange' | 'teal';
export type SchemeType = 'light' | 'dark';

interface ThemeContextType {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  scheme: SchemeType;
  setScheme: (scheme: SchemeType) => void;
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

  const [scheme, setSchemeState] = useState<SchemeType>(() => {
    // Check system preference as default, fallback to light
    const saved = localStorage.getItem('splitwisely_scheme');
    if (saved) return saved as SchemeType;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    // 1. Update the CSS Variables and Scheme
    if (theme === 'green') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
    
    document.documentElement.setAttribute('data-scheme', scheme);
    
    // 2. Update the PWA Mobile Status Bar Color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', scheme === 'dark' ? '#0f172a' : themeHexMap[theme]);
    }
  }, [theme, scheme]);

  const setTheme = (newTheme: ThemeType) => {
    localStorage.setItem('splitwisely_theme', newTheme);
    setThemeState(newTheme);
  };

  const setScheme = (newScheme: SchemeType) => {
    localStorage.setItem('splitwisely_scheme', newScheme);
    setSchemeState(newScheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, scheme, setScheme, primaryHex: themeHexMap[theme] }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function ThemeConfigWrapper({ children }: { children: ReactNode }) {
  const { primaryHex, scheme } = useTheme();
  return (
    <ConfigProvider
      theme={{
        algorithm: scheme === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: primaryHex,
          colorInfo: primaryHex,
        },
      }}
    >
      <AntdApp>
        {children}
      </AntdApp>
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
