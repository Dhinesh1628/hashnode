import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../auth/useAuth.js';
import { useTitle } from '../lib/useTitle.js';
import { Avatar, ErrorBanner, Field } from '../components/ui.jsx';

export default function Settings() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({ name: user.name, bio: user.bio ?? '', avatarUrl: user.avatarUrl ?? '' });
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  useTitle('Settings');

  const fields = error?.fields ?? {};
  const onChange = (e) => {
    setSaved(false);
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { user: updated } = await api('/users/me', { method: 'PATCH', body: form });
      updateUser(updated);
      setSaved(true);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="narrow">
      <div className="page-head">
        <h1>Settings</h1>
        <Link to={`/profile/${user._id}`} className="muted">View my profile</Link>
      </div>
      <form className="card settings" onSubmit={onSubmit} noValidate>
        <div className="settings-preview">
          <Avatar user={{ ...user, ...form }} size={72} />
          <span className="muted">{user.email}</span>
        </div>
        <ErrorBanner error={error && !Object.keys(fields).length ? error : null} />
        {saved && <div className="banner banner-success" role="status">Profile saved.</div>}
        <Field label="Name" name="name" value={form.name} onChange={onChange} error={fields.name} maxLength={60} required />
        <Field label="Bio" name="bio" as="textarea" rows={3} value={form.bio} onChange={onChange} error={fields.bio} maxLength={200} hint={`${form.bio.length}/200`} />
        <Field label="Avatar image link" name="avatarUrl" type="url" value={form.avatarUrl} onChange={onChange} error={fields.avatarUrl} placeholder="https://…" />
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save profile'}</button>
      </form>
    </section>
  );
}
