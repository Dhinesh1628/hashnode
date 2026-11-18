import { useCallback, useEffect, useMemo, useState } from 'react';
import { AuthContext } from './context.js';
import { api, tokenStore, setUnauthorizedHandler } from '../api/client.js';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // With a saved token we don't know who the user is until /auth/me answers.
  const [status, setStatus] = useState(() => (tokenStore.get() ? 'loading' : 'ready'));

  useEffect(() => {
    // Any logged-in request that comes back 401 logs the user out everywhere.
    setUnauthorizedHandler(() => {
      tokenStore.clear();
      setUser(null);
    });
    if (!tokenStore.get()) return;
    api('/auth/me')
      .then((data) => setUser(data.user))
      .catch(() => tokenStore.clear())
      .finally(() => setStatus('ready'));
  }, []);

  const startSession = useCallback((data) => {
    tokenStore.set(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const login = useCallback(
    async (email, password) => startSession(await api('/auth/login', { method: 'POST', body: { email, password } })),
    [startSession],
  );

  const register = useCallback(
    async (name, email, password) => startSession(await api('/auth/register', { method: 'POST', body: { name, email, password } })),
    [startSession],
  );

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, status, login, register, logout, updateUser: setUser }),
    [user, status, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
