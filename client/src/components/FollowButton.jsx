import { useState } from 'react';
import { api } from '../api/client.js';
import { useAuth, useLoginRedirect } from '../auth/useAuth.js';

// onChange receives the API answer: { following, followerCount }.
export function FollowButton({ userId, following, onChange }) {
  const { user } = useAuth();
  const goLogin = useLoginRedirect();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  if (user && user._id === userId) return null;

  async function toggle() {
    if (!user) return goLogin();
    setBusy(true);
    setError(null);
    try {
      onChange(await api(`/users/${userId}/follow`, { method: following ? 'DELETE' : 'POST' }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="follow">
      <button
        type="button"
        className={`btn ${following ? 'btn-outline' : 'btn-primary'} btn-sm`}
        onClick={toggle}
        disabled={busy}
        aria-pressed={following}
      >
        {following ? 'Following' : 'Follow'}
      </button>
      {error && <span className="field-error"> {error}</span>}
    </span>
  );
}
