import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth, useLoginRedirect } from '../auth/useAuth.js';
import { useLoad } from '../lib/useLoad.js';
import { formatDate } from '../lib/format.js';
import { Avatar, ErrorBanner, Loading, Pagination } from './ui.jsx';

function CommentItem({ comment, canEdit, canDelete, onChanged }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(comment.content);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function run(action) {
    setBusy(true);
    setError(null);
    try {
      await action();
      onChanged();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  const save = () => run(async () => {
    await api(`/comments/${comment._id}`, { method: 'PATCH', body: { content: text } });
    setEditing(false);
  });
  const remove = () => {
    if (window.confirm('Delete this comment?')) run(() => api(`/comments/${comment._id}`, { method: 'DELETE' }));
  };

  return (
    <li className="comment">
      <Link to={`/profile/${comment.author._id}`}><Avatar user={comment.author} size={32} /></Link>
      <div className="comment-body">
        <div className="comment-meta">
          <Link to={`/profile/${comment.author._id}`}><strong>{comment.author.name}</strong></Link>
          <span className="muted"> · {formatDate(comment.createdAt)}</span>
          {comment.updatedAt !== comment.createdAt && <span className="muted"> · edited</span>}
        </div>
        {editing ? (
          <div className="comment-edit">
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={2000} aria-label="Edit comment" />
            <div className="row">
              <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={busy}>Save</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setEditing(false); setText(comment.content); }}>Cancel</button>
            </div>
          </div>
        ) : (
          <p className="comment-text">{comment.content}</p>
        )}
        <ErrorBanner error={error} />
        {!editing && (canEdit || canDelete) && (
          <div className="row comment-actions">
            {canEdit && <button type="button" className="link-btn" onClick={() => setEditing(true)}>Edit</button>}
            {canDelete && <button type="button" className="link-btn danger" onClick={remove} disabled={busy}>Delete</button>}
          </div>
        )}
      </div>
    </li>
  );
}

// Comments under a post. The post's author may delete any of them (moderation).
export function Comments({ postId, postAuthorId }) {
  const { user } = useAuth();
  const goLogin = useLoginRedirect();
  const [page, setPage] = useState(1);
  const list = useLoad(() => api(`/posts/${postId}/comments`, { query: { page, limit: 20 } }), [postId, page]);
  const [text, setText] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const total = list.data?.pagination.total;

  async function add(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api(`/posts/${postId}/comments`, { method: 'POST', body: { content: text } });
      setText('');
      // New comments go at the end, so jump to the last page to show it.
      const lastPage = Math.max(1, Math.ceil(((total ?? 0) + 1) / 20));
      if (lastPage !== page) setPage(lastPage); else list.reload();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="comments" aria-labelledby="comments-title">
      <h2 id="comments-title">Comments{total !== undefined ? ` (${total})` : ''}</h2>

      {user ? (
        <form className="comment-form" onSubmit={add}>
          <Avatar user={user} size={32} />
          <div className="comment-body">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Write a comment…"
              rows={3}
              maxLength={2000}
              aria-label="Write a comment"
              aria-invalid={Boolean(error?.fields?.content)}
            />
            {error?.fields?.content ? <p className="field-error">{error.fields.content}</p> : <ErrorBanner error={error} />}
            <button type="submit" className="btn btn-primary btn-sm" disabled={busy || !text.trim()}>
              {busy ? 'Posting…' : 'Comment'}
            </button>
          </div>
        </form>
      ) : (
        <p className="card comment-login">
          <button type="button" className="link-btn" onClick={goLogin}>Log in</button> to join the discussion.
        </p>
      )}

      {list.error && <ErrorBanner error={list.error} />}
      {!list.data && !list.error && <Loading />}
      {list.data && (
        <>
          <ul className="comment-list">
            {list.data.comments.map((c) => (
              <CommentItem
                key={c._id}
                comment={c}
                canEdit={user?._id === c.author._id}
                canDelete={user?._id === c.author._id || user?._id === postAuthorId}
                onChanged={list.reload}
              />
            ))}
          </ul>
          <Pagination pagination={list.data.pagination} onPage={setPage} />
        </>
      )}
    </section>
  );
}
