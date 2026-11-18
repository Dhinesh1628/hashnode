import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { api } from '../api/client.js';
import { useLoad } from '../lib/useLoad.js';
import { useTitle } from '../lib/useTitle.js';
import { formatDate } from '../lib/format.js';
import { Empty, ErrorBanner, Loading, Pagination } from '../components/ui.jsx';

const FILTERS = [
  ['', 'All'],
  ['draft', 'Drafts'],
  ['published', 'Published'],
];

export default function Dashboard() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? '';
  const page = Number(params.get('page')) || 1;
  const list = useLoad(() => api('/posts/me', { query: { status, page } }), [status, page]);
  const [error, setError] = useState(null);
  useTitle('My posts');

  async function remove(post) {
    if (!window.confirm(`Delete "${post.title}"? Its likes and comments are deleted too. This can't be undone.`)) return;
    setError(null);
    try {
      await api(`/posts/${post._id}`, { method: 'DELETE' });
      list.reload();
    } catch (err) {
      setError(err);
    }
  }

  return (
    <section>
      <div className="page-head">
        <h1>My posts</h1>
        <Link to="/new" className="btn btn-primary">New post</Link>
      </div>
      <div className="tabs" role="tablist">
        {FILTERS.map(([value, label]) => (
          <button key={value} type="button" role="tab" aria-selected={status === value} onClick={() => setParams(value ? { status: value } : {})}>
            {label}
          </button>
        ))}
      </div>
      <ErrorBanner error={error || list.error} />
      {!list.data && !list.error && <Loading />}
      {list.data && !list.data.posts.length && (
        <Empty>{status === 'draft' ? 'No drafts.' : status === 'published' ? 'Nothing published yet.' : <>You haven&apos;t written anything yet. <Link to="/new">Start a post</Link>.</>}</Empty>
      )}
      {list.data?.posts.length > 0 && (
        <>
          <ul className="card dash-list">
            {list.data.posts.map((post) => (
              <li key={post._id} className="dash-row">
                <div className="dash-main">
                  <Link to={`/post/${post.slug}`} className="dash-title">{post.title}</Link>
                  <span className="muted">
                    <span className={`badge badge-${post.status}`}>{post.status === 'draft' ? 'Draft' : 'Published'}</span>
                    {' '}Updated {formatDate(post.updatedAt)}
                    {post.status === 'published' && ` · ♥ ${post.likeCount} · ${post.commentCount} comments`}
                  </span>
                </div>
                <div className="row">
                  <Link to={`/edit/${post.slug}`} className="btn btn-outline btn-sm">Edit</Link>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => remove(post)}>Delete</button>
                </div>
              </li>
            ))}
          </ul>
          <Pagination
            pagination={list.data.pagination}
            onPage={(p) => setParams(status ? { status, page: p } : { page: p })}
          />
        </>
      )}
    </section>
  );
}
