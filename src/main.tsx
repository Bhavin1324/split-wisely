import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppDataProvider } from './context/AppDataContext';
import { ThemeProvider, ThemeConfigWrapper } from './context/ThemeContext';
import { router } from './router';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <ThemeConfigWrapper>
        <AuthProvider>
          <AppDataProvider>
            <RouterProvider router={router} />
          </AppDataProvider>
        </AuthProvider>
      </ThemeConfigWrapper>
    </ThemeProvider>
  </StrictMode>,
);
