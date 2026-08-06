import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { GroupDetailPage } from './pages/GroupDetailPage';
import { FriendsPage } from './pages/FriendsPage';
import { FriendDetailPage } from './pages/FriendDetailPage';
import { SpendingPage } from './pages/SpendingPage';
import { SearchPage } from './pages/SearchPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';

/**
 * Data-based router definition using createBrowserRouter (React Router v7).
 */
export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'groups/:groupId', element: <GroupDetailPage /> },
      { path: 'friends', element: <FriendsPage /> },
      { path: 'friends/:friendId', element: <FriendDetailPage /> },
      { path: 'spending', element: <SpendingPage /> },
      { path: 'search', element: <SearchPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
]);
