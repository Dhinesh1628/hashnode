import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  IconArrowRight, IconCircleCheck, IconDots, IconEdit, IconExternalLink, IconFilePencil,
  IconHeart, IconMessage, IconPencil, IconSearch, IconTrash, IconUsers, IconWorld,
} from '@tabler/icons-react';
import { api } from '../api/client.js';
import { useAuth } from '../auth/useAuth.js';
import { useLoad } from '../lib/useLoad.js';
import { useTitle } from '../lib/useTitle.js';
import { useDismiss } from '../lib/useDismiss.js';
import { formatDate, plural, timeAgo } from '../lib/format.js';
import { Avatar, ErrorBanner, Pagination } from '../components/ui.jsx';

const SORTS = [
  ['newest', 'Recently edited'],
  ['likes', 'Most liked'],
  ['comments', 'Most commented'],
];

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// --- Header and stat cards ------------------------------------------------

function Hero({ user, data }) {
  const parts = [];
  if (data?.stats.drafts) {
    parts.push(<span key="d" className="text-attention">{plural(data.stats.drafts, 'draft')} waiting</span>);
  }
  if (data?.newComments) {
    parts.push(<span key="c" className="text-primary">{plural(data.newComments, 'new comment')} this week</span>);
  }

  return (
    <header className="dash-hero glow-band">
      <div>
        <p className="eyebrow">Your dashboard</p>
        <h1>{greeting()}, {user.name.split(' ')[0]}</h1>
        <p>
          {parts.length
            ? <>You have {parts.reduce((acc, part, i) => (i ? [...acc, ' and ', part] : [part]), [])}.</>
            : "Here's how your writing is doing."}
        </p>
      </div>
      <Link to="/editor/new" className="btn btn-primary">Write a post</Link>
    </header>
  );
}

const STAT_CARDS = [
  ['published', 'Published', IconWorld],
  ['drafts', 'Drafts', IconFilePencil],
  ['likes', 'Total likes', IconHeart],
  ['comments', 'Comments', IconMessage],
  ['followers', 'Followers', IconUsers],
];

function StatCards({ stats }) {
  return (
    <div className="dash-stats">
      {STAT_CARDS.map(([key, label, Icon]) => (
        <div key={key} className={`stat-card${key === 'drafts' && stats?.drafts ? ' stat-attention' : ''}`}>
          <span className="stat-icon"><Icon size={18} aria-hidden="true" /></span>
          {stats ? <strong>{stats[key].toLocaleString()}</strong> : <span className="skeleton skeleton-number" />}
          <span className="stat-label">{label}</span>
        </div>
      ))}
    </div>
  );
}

// --- Posts table ----------------------------------------------------------

function RowMenu({ post, onDelete }) {
  const menu = useRef(null);
  const close = useDismiss(menu);
  return (
    <details className="row-menu" ref={menu}>
      <summary aria-label={`More actions for ${post.title}`}><IconDots size={18} /></summary>
      <div className="row-menu-panel" onClick={close}>
        <Link to={`/post/${post.slug}`}><IconExternalLink size={16} aria-hidden="true" /> {post.status === 'draft' ? 'Preview' : 'View'}</Link>
        <button type="button" className="danger" onClick={() => onDelete(post)}><IconTrash size={16} aria-hidden="true" /> Delete</button>
      </div>
    </details>
  );
}

function PostRow({ post, onDelete }) {
  const published = post.status === 'published';
  return (
    <li className="post-row">
      <div className="post-row-main">
        <Link to={`/editor/${post._id}`} className="post-row-title">{post.title}</Link>
        <span className="post-row-meta">
          {published
            ? <span className="text-primary"><IconCircleCheck size={14} aria-hidden="true" /> Published</span>
            : <span className="text-attention"><IconPencil size={14} aria-hidden="true" /> Draft</span>}
          {' · '}
          {published ? formatDate(post.publishedAt) : `edited ${timeAgo(post.updatedAt)}`}
          {' · '}{post.readingTime} min read
        </span>
      </div>
      <span className="post-row-num" title="Likes">
        {published ? <><IconHeart size={14} aria-hidden="true" /> {post.likeCount ?? 0}</> : '–'}
      </span>
      <span className="post-row-num" title="Comments">
        {published ? <><IconMessage size={14} aria-hidden="true" /> {post.commentCount ?? 0}</> : '–'}
      </span>
      <span className="post-row-actions">
        <Link to={`/editor/${post._id}`} className="icon-btn" aria-label={`Edit ${post.title}`}><IconEdit size={18} /></Link>
        <RowMenu post={post} onDelete={onDelete} />
      </span>
    </li>
  );
}

function PostsTable({ stats, onChanged }) {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? '';
  const sort = params.get('sort') ?? 'newest';
  const search = params.get('search') ?? '';
  const page = Number(params.get('page')) || 1;
  const [text, setText] = useState(search);
  const [error, setError] = useState(null);
  const list = useLoad(() => api('/posts/mine', { query: { status, sort, search, page } }), [status, sort, search, page]);

  function update(changes) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value === '' || value === null || (key === 'sort' && value === 'newest')) next.delete(key);
      else next.set(key, value);
    }
    if (!('page' in changes)) next.delete('page'); // a new filter starts at page 1
    setParams(next, { replace: true });
  }

  // Search as you type, but wait until typing pauses for a moment.
  useEffect(() => {
    if (text.trim() === search) return undefined;
    const timer = setTimeout(() => update({ search: text.trim() }), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  async function remove(post) {
    if (!window.confirm(`Delete "${post.title}"? Its likes and comments are deleted too. This can't be undone.`)) return;
    setError(null);
    try {
      await api(`/posts/${post._id}`, { method: 'DELETE' });
      list.reload();
      onChanged();
    } catch (err) {
      setError(err);
    }
  }

  const tabs = [
    ['', 'All', stats ? stats.published + stats.drafts : null],
    ['draft', 'Drafts', stats?.drafts],
    ['published', 'Published', stats?.published],
  ];

  return (
    <section className="card posts-table" aria-label="Your posts">
      <div className="posts-toolbar">
        <div className="seg" role="tablist">
          {tabs.map(([value, label, count]) => (
            <button key={value} type="button" role="tab" aria-selected={status === value} onClick={() => update({ status: value })}>
              {label}
              {count != null && <span className={`seg-count${value === 'draft' && count ? ' seg-count-attention' : ''}`}>{count}</span>}
            </button>
          ))}
        </div>
        <label className="toolbar-search">
          <IconSearch size={16} aria-hidden="true" />
          <input type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder="Search your posts" aria-label="Search your posts" />
        </label>
        <select value={sort} onChange={(e) => update({ sort: e.target.value })} aria-label="Sort posts" className="toolbar-sort">
          {SORTS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>

      <ErrorBanner error={error || list.error} />
      {!list.data && !list.error && (
        <ul className="post-rows" aria-hidden="true">
          {[1, 2, 3].map((n) => (
            <li key={n} className="post-row"><div className="post-row-main"><span className="skeleton skeleton-line" /><span className="skeleton skeleton-line short" /></div></li>
          ))}
        </ul>
      )}
      {list.data && !list.data.posts.length && (
        <p className="posts-empty">
          {search ? `No posts match “${search}”.` : status === 'draft' ? 'No drafts. Everything you started is published.' : 'Nothing published yet.'}
        </p>
      )}
      {list.data?.posts.length > 0 && (
        <>
          <ul className={`post-rows${list.loading ? ' is-refreshing' : ''}`}>
            {list.data.posts.map((post) => <PostRow key={post._id} post={post} onDelete={remove} />)}
          </ul>
          <Pagination pagination={list.data.pagination} onPage={(p) => update({ page: p })} />
        </>
      )}
    </section>
  );
}

// --- Sidebar --------------------------------------------------------------

function FinishDrafts({ drafts }) {
  return (
    <section className="card side-card side-card-dark">
      <h2><IconFilePencil size={18} className="text-attention" aria-hidden="true" /> Finish a draft</h2>
      {drafts.length ? (
        <ul>
          {drafts.map((d) => (
            <li key={d._id} className="side-row">
              <span className="side-row-text">
                <span className="truncate">{d.title}</span>
                <span className="muted small">edited {timeAgo(d.updatedAt)}</span>
              </span>
              <Link to={`/editor/${d._id}`} className="side-link">Continue <IconArrowRight size={14} aria-hidden="true" /></Link>
            </li>
          ))}
        </ul>
      ) : <p className="muted small">No drafts waiting. Nice work.</p>}
    </section>
  );
}

function RecentComments({ comments, newCount }) {
  return (
    <section className="card side-card">
      <h2>
        <IconMessage size={18} className="text-primary" aria-hidden="true" /> Recent comments
        {newCount > 0 && <span className="pill-attention">{newCount} new</span>}
      </h2>
      {comments.length ? (
        <ul>
          {comments.map((c) => (
            <li key={c._id} className="side-comment">
              <Avatar user={c.author} size={30} />
              <span className="side-row-text">
                <span><strong>{c.author.name}</strong> <span className="muted">on</span>{' '}
                  <Link to={`/post/${c.post.slug}`}>{c.post.title}</Link></span>
                <span className="muted small truncate">{c.content}</span>
                <span className="muted small">{timeAgo(c.createdAt)}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : <p className="muted small">When readers comment on your posts, you’ll see it here.</p>}
    </section>
  );
}

// --- First-time state -----------------------------------------------------

function Welcome() {
  return (
    <section className="card welcome">
      <h2>Write your first post</h2>
      <p className="muted">Your dashboard fills up as you write. A few tips to get going:</p>
      <ol>
        <li>Start with something you learned this week. Short posts are fine.</li>
        <li>Add a code block with its language (<code>```js</code>) so it gets highlighted.</li>
        <li>Pick 2–3 tags so readers can find it from the tag pages.</li>
      </ol>
      <Link to="/editor/new" className="btn btn-primary">Start writing</Link>
    </section>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const dash = useLoad(() => api('/users/me/dashboard'), []);
  useTitle('Dashboard');

  const data = dash.data;
  const isNew = data && data.stats.published + data.stats.drafts === 0;

  return (
    <div className="dash">
      <Hero user={user} data={data} />
      <StatCards stats={data?.stats} />
      <ErrorBanner error={dash.error} />
      {isNew ? <Welcome /> : (
        <div className="dash-grid">
          <PostsTable stats={data?.stats} onChanged={dash.reload} />
          <aside className="dash-side">
            {data ? (
              <>
                <FinishDrafts drafts={data.drafts} />
                <RecentComments comments={data.recentComments} newCount={data.newComments} />
              </>
            ) : <div className="card side-card"><span className="skeleton skeleton-line" /><span className="skeleton skeleton-line short" /></div>}
          </aside>
        </div>
      )}
    </div>
  );
}
