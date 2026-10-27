import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function AuthPage({ mode }) {
  const isLogin = mode === 'login';
  const { user, login, register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (isLogin) await login(form.email, form.password);
      else await register(form.name, form.email, form.password);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-card card">
      <h1>{isLogin ? 'Welcome back' : 'Create your account'}</h1>
      <p className="muted">
        {isLogin ? 'Log in to see your groups and balances.' : 'Start splitting expenses with friends in a minute.'}
      </p>

      <form onSubmit={handleSubmit} className="stack">
        {!isLogin && (
          <label>
            Name
            <input name="name" value={form.name} onChange={update} autoComplete="name" required />
          </label>
        )}
        <label>
          Email
          <input name="email" type="email" value={form.email} onChange={update} autoComplete="email" required />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={update}
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            minLength={6}
            required
          />
        </label>

        {error && <p className="alert alert-error">{error}</p>}

        <button className="btn btn-primary" disabled={busy}>
          {busy ? 'Please wait…' : isLogin ? 'Log in' : 'Create account'}
        </button>
      </form>

      <p className="muted switch">
        {isLogin ? (
          <>New here? <Link to="/register">Create an account</Link></>
        ) : (
          <>Already have an account? <Link to="/login">Log in</Link></>
        )}
      </p>
    </div>
  );
}
