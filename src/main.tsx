import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppDataProvider } from './context/AppDataContext';
import { ThemeProvider, ThemeConfigWrapper } from './context/ThemeContext';
import { registerSW } from 'virtual:pwa-register';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { router } from './router';
import './index.css';

// Register PWA Service Worker for offline capability & Web Push
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  registerSW({ immediate: true });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ThemeConfigWrapper>
          <AuthProvider>
            <AppDataProvider>
              <RouterProvider router={router} />
            </AppDataProvider>
          </AuthProvider>
        </ThemeConfigWrapper>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
