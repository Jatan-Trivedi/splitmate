import { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(localStorage.getItem('token')));

  // Restore the session on page load
  useEffect(() => {
    if (!localStorage.getItem('token')) return;
    api('/auth/me')
      .then((data) => setUser(data.user))
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setLoading(false));
  }, []);

  // api.js fires this when the server says the token is no longer valid
  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener('auth-expired', onExpired);
    return () => window.removeEventListener('auth-expired', onExpired);
  }, []);

  async function authenticate(path, body) {
    const data = await api(path, { method: 'POST', body });
    localStorage.setItem('token', data.token);
    setUser(data.user);
  }

  const login = (email, password) => authenticate('/auth/login', { email, password });
  const register = (name, email, password) =>
    authenticate('/auth/register', { name, email, password });

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
