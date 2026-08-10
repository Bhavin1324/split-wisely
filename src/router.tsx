import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { lazy, Suspense } from 'react';
import { PageLoader } from './components/ui/PageLoader';

const DashboardPage = lazy(() => import('./pages/DashboardPage').then(module => ({ default: module.DashboardPage })));
const GroupDetailPage = lazy(() => import('./pages/GroupDetailPage').then(module => ({ default: module.GroupDetailPage })));
const FriendsPage = lazy(() => import('./pages/FriendsPage').then(module => ({ default: module.FriendsPage })));
const FriendDetailPage = lazy(() => import('./pages/FriendDetailPage').then(module => ({ default: module.FriendDetailPage })));
const SpendingPage = lazy(() => import('./pages/SpendingPage').then(module => ({ default: module.SpendingPage })));
const SearchPage = lazy(() => import('./pages/SearchPage').then(module => ({ default: module.SearchPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(module => ({ default: module.SettingsPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then(module => ({ default: module.LoginPage })));
const JoinGroupPage = lazy(() => import('./pages/JoinGroupPage').then(module => ({ default: module.JoinGroupPage })));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage').then(module => ({ default: module.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage').then(module => ({ default: module.ResetPasswordPage })));
const AuthRoute = lazy(() => import('./components/AuthRoute').then(module => ({ default: module.AuthRoute })));

const withSuspense = (Component: React.ComponentType) => (
  <Suspense fallback={<PageLoader />}>
    <Component />
  </Suspense>
);

/**
 * Data-based router definition using createBrowserRouter (React Router v7).
 */
export const router = createBrowserRouter([
  {
    path: '/login',
    element: withSuspense(LoginPage),
  },
  {
    path: '/join',
    element: withSuspense(JoinGroupPage),
  },
  {
    path: '/forgot-password',
    element: withSuspense(ForgotPasswordPage),
  },
  {
    path: '/reset-password',
    element: withSuspense(ResetPasswordPage),
  },
  {
    path: '/',
    element: withSuspense(AuthRoute),
    children: [
      {
        path: '/',
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: 'dashboard', element: withSuspense(DashboardPage) },
          { path: 'groups/:groupId', element: withSuspense(GroupDetailPage) },
          { path: 'friends', element: withSuspense(FriendsPage) },
          { path: 'friends/:friendId', element: withSuspense(FriendDetailPage) },
          { path: 'spending', element: withSuspense(SpendingPage) },
          { path: 'search', element: withSuspense(SearchPage) },
          { path: 'settings', element: withSuspense(SettingsPage) },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
]);

