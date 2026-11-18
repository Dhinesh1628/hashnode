import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth.js';
import { useTitle } from '../lib/useTitle.js';
import { ErrorBanner, Field } from '../components/ui.jsx';

// Shared by login and register: form state, submit, errors, redirect back.
function useAuthForm(initial, submit) {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from;
  const target = from ? `${from.pathname}${from.search ?? ''}` : '/';
  const [form, setForm] = useState(initial);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await submit(form);
      navigate(target, { replace: true });
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  }

  return { form, error, busy, onChange, onSubmit, target, fields: error?.fields ?? {} };
}

export function Login() {
  const { user, login } = useAuth();
  useTitle('Log in');
  const location = useLocation();
  const f = useAuthForm({ email: '', password: '' }, (form) => login(form.email, form.password));
  if (user && !f.busy) return <Navigate to={f.target} replace />;

  return (
    <div className="auth-page card">
      <h1>Welcome back</h1>
      <form onSubmit={f.onSubmit} noValidate>
        <ErrorBanner error={f.error && !Object.keys(f.fields).length ? f.error : null} />
        <Field label="Email" name="email" type="email" autoComplete="email" value={f.form.email} onChange={f.onChange} error={f.fields.email} required />
        <Field label="Password" name="password" type="password" autoComplete="current-password" value={f.form.password} onChange={f.onChange} error={f.fields.password} required />
        <button type="submit" className="btn btn-primary btn-block" disabled={f.busy}>
          {f.busy ? 'Logging in…' : 'Log in'}
        </button>
      </form>
      <p className="muted auth-switch">New here? <Link to="/register" state={{ from: location.state?.from }}>Create an account</Link></p>
    </div>
  );
}

export function Register() {
  const { user, register } = useAuth();
  useTitle('Sign up');
  const location = useLocation();
  const f = useAuthForm({ name: '', email: '', password: '' }, (form) => register(form.name, form.email, form.password));
  if (user && !f.busy) return <Navigate to={f.target} replace />;

  return (
    <div className="auth-page card">
      <h1>Create your account</h1>
      <form onSubmit={f.onSubmit} noValidate>
        <ErrorBanner error={f.error && !Object.keys(f.fields).length ? f.error : null} />
        <Field label="Name" name="name" autoComplete="name" value={f.form.name} onChange={f.onChange} error={f.fields.name} required />
        <Field label="Email" name="email" type="email" autoComplete="email" value={f.form.email} onChange={f.onChange} error={f.fields.email} required />
        <Field label="Password" name="password" type="password" autoComplete="new-password" value={f.form.password} onChange={f.onChange} error={f.fields.password} hint="At least 8 characters." required />
        <button type="submit" className="btn btn-primary btn-block" disabled={f.busy}>
          {f.busy ? 'Creating account…' : 'Sign up'}
        </button>
      </form>
      <p className="muted auth-switch">Already have an account? <Link to="/login" state={{ from: location.state?.from }}>Log in</Link></p>
    </div>
  );
}
