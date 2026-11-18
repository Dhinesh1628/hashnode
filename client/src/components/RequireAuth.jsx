import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/useAuth.js';
import { Loading } from './ui.jsx';

// Wraps routes that need a logged-in user. Visitors go to /login and come
// back here afterwards. The real protection is on the API; this is for UX.
export function RequireAuth() {
  const { user, status } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <Loading label="Checking your session…" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}
