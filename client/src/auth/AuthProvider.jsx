import { useCallback, useEffect, useMemo, useState } from 'react';
import { AuthContext } from './context.js';
import { api, setUnauthorizedHandler } from '../api/client.js';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // The session cookie is invisible to JavaScript, so on every page load we
  // ask the API who we are. Until it answers, status is 'loading'.
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    // Any request that comes back 401 means the session is gone.
    setUnauthorizedHandler(() => setUser(null));
    api('/auth/session')
      .then((data) => setUser(data.user)) // null when not logged in
      .catch(() => setUser(null))
      .finally(() => setStatus('ready'));
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await api('/auth/login', { method: 'POST', body: { email, password } });
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const data = await api('/auth/register', { method: 'POST', body: { name, email, password } });
    setUser(data.user);
    return data.user;
  }, []);

  // The cookie is httpOnly, so only the server can delete it.
  const logout = useCallback(async () => {
    try {
      await api('/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, status, login, register, logout, updateUser: setUser }),
    [user, status, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
