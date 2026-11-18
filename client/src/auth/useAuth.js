import { useCallback, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from './context.js';

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

// Sends a logged-out visitor to /login, remembering where to come back to.
export function useLoginRedirect() {
  const navigate = useNavigate();
  const location = useLocation();
  return useCallback(() => navigate('/login', { state: { from: location } }), [navigate, location]);
}
