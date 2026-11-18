import { Link } from 'react-router-dom';

// Small presentational pieces used across pages.

export function Avatar({ user, size = 36 }) {
  const style = { width: size, height: size, fontSize: size * 0.42 };
  if (user?.avatarUrl) {
    return <img className="avatar" src={user.avatarUrl} alt="" style={style} loading="lazy" />;
  }
  const initials = (user?.name ?? '?').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return <span className="avatar avatar-fallback" style={style} aria-hidden="true">{initials}</span>;
}

export function Loading({ label = 'Loading…' }) {
  return (
    <div className="loading" role="status">
      <span className="spinner" aria-hidden="true" />
      {label}
    </div>
  );
}

export function ErrorBanner({ error }) {
  if (!error) return null;
  return <div className="banner banner-error" role="alert">{error.message || 'Something went wrong'}</div>;
}

export function Empty({ children }) {
  return <div className="empty">{children}</div>;
}

// A labelled input with its error message underneath. Pass as="textarea" for multi-line.
export function Field({ label, error, hint, as: Tag = 'input', id, ...props }) {
  const fieldId = id ?? props.name;
  return (
    <div className={`field${error ? ' field-invalid' : ''}`}>
      <label htmlFor={fieldId}>{label}</label>
      <Tag id={fieldId} aria-invalid={Boolean(error)} aria-describedby={error ? `${fieldId}-error` : undefined} {...props} />
      {error ? <p className="field-error" id={`${fieldId}-error`}>{error}</p> : hint && <p className="field-hint">{hint}</p>}
    </div>
  );
}

export function Pagination({ pagination, onPage }) {
  if (!pagination || pagination.totalPages <= 1) return null;
  const { page, totalPages } = pagination;
  return (
    <nav className="pagination" aria-label="Pages">
      <button type="button" className="btn btn-ghost" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        ← Newer
      </button>
      <span>Page {page} of {totalPages}</span>
      <button type="button" className="btn btn-ghost" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
        Older →
      </button>
    </nav>
  );
}

export function TagChips({ tags }) {
  if (!tags?.length) return null;
  return (
    <ul className="tag-chips">
      {tags.map((tag) => (
        <li key={tag._id}><Link to={`/tag/${tag.slug}`}>#{tag.name}</Link></li>
      ))}
    </ul>
  );
}

export function UserRow({ user }) {
  return (
    <li className="user-row">
      <Link to={`/profile/${user._id}`} className="user-row-link">
        <Avatar user={user} size={40} />
        <span>
          <strong>{user.name}</strong>
          {user.bio && <span className="muted user-row-bio">{user.bio}</span>}
        </span>
      </Link>
    </li>
  );
}
