import { useState } from 'react';
import { Link } from 'react-router-dom';
import { IconBookmark, IconBookmarkFilled, IconHeart, IconMessage } from '@tabler/icons-react';
import { api } from '../api/client.js';
import { useAuth, useLoginRedirect } from '../auth/useAuth.js';
import { Avatar, TagChips } from './ui.jsx';
import { formatDate } from '../lib/format.js';

// Save for later straight from the feed. Lists give each post a `bookmarked`
// flag for the logged-in reader; visitors are sent to log in first.
function BookmarkButton({ post }) {
  const { user } = useAuth();
  const goLogin = useLoginRedirect();
  const [saved, setSaved] = useState(Boolean(post.bookmarked));
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (!user) return goLogin();
    setBusy(true);
    try {
      const res = await api(`/posts/${post._id}/bookmark`, { method: saved ? 'DELETE' : 'POST' });
      setSaved(res.bookmarked);
    } catch {
      // Leave the icon as it was; the post page shows errors in full.
    } finally {
      setBusy(false);
    }
  }

  const Icon = saved ? IconBookmarkFilled : IconBookmark;
  return (
    <button
      type="button"
      className={`icon-btn${saved ? ' is-saved' : ''}`}
      onClick={toggle}
      disabled={busy}
      aria-pressed={saved}
      aria-label={saved ? `Remove "${post.title}" from bookmarks` : `Save "${post.title}" for later`}
      title={saved ? 'Saved' : 'Save for later'}
    >
      <Icon size={18} />
    </button>
  );
}

export function PostCard({ post }) {
  return (
    <article className="card post-card">
      <div className="post-card-body">
        <div className="byline">
          <Link to={`/profile/${post.author._id}`} className="byline-author">
            <Avatar user={post.author} size={24} />
            {post.author.name}
          </Link>
          <span className="muted">· {formatDate(post.publishedAt)} · {post.readingTime} min read</span>
        </div>
        <h2 className="post-card-title">
          <Link to={`/post/${post.slug}`}>{post.title}</Link>
        </h2>
        {post.excerpt && <p className="post-card-excerpt">{post.excerpt}</p>}
        <div className="post-card-footer">
          <TagChips tags={post.tags?.slice(0, 3)} />
          <span className="post-card-stats">
            <span title="Likes"><IconHeart size={16} aria-hidden="true" /> {post.likeCount ?? 0}</span>
            <span title="Comments"><IconMessage size={16} aria-hidden="true" /> {post.commentCount ?? 0}</span>
            <BookmarkButton post={post} />
          </span>
        </div>
      </div>
      {post.coverImage && (
        <Link to={`/post/${post.slug}`} className="post-card-cover" tabIndex={-1} aria-hidden="true">
          <img src={post.coverImage} alt="" loading="lazy" />
        </Link>
      )}
    </article>
  );
}
