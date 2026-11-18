import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { api } from '../api/client.js';
import { useAuth, useLoginRedirect } from '../auth/useAuth.js';
import { useLoad } from '../lib/useLoad.js';
import { useTitle } from '../lib/useTitle.js';
import { formatDate } from '../lib/format.js';
import { Avatar, ErrorBanner, Loading, TagChips } from '../components/ui.jsx';
import { Markdown } from '../components/Markdown.jsx';
import { FollowButton } from '../components/FollowButton.jsx';
import { Comments } from '../components/Comments.jsx';
import NotFound from './NotFound.jsx';

export default function PostPage() {
  const { slug } = useParams();
  const { user } = useAuth();
  const goLogin = useLoginRedirect();
  // Reload when the viewer changes: likes/bookmarks/follow are per person.
  const state = useLoad(() => api(`/posts/${slug}`), [slug, user?._id ?? null]);
  const [actionError, setActionError] = useState(null);
  const [busy, setBusy] = useState(false);
  useTitle(state.data?.post.title ?? 'Post');

  if (state.error?.status === 404) {
    return <NotFound message="This post doesn't exist, or it isn't published." />;
  }
  if (state.error) return <ErrorBanner error={state.error} />;
  if (!state.data) return <Loading />;

  const { post, viewer } = state.data;
  const isOwner = user?._id === post.author._id;
  const isPublished = post.status === 'published';

  async function react(kind, active) {
    if (!user) return goLogin();
    setBusy(true);
    setActionError(null);
    try {
      const result = await api(`/posts/${post._id}/${kind}`, { method: active ? 'DELETE' : 'POST' });
      state.setData((d) => ({
        ...d,
        post: kind === 'like' ? { ...d.post, likeCount: result.likeCount } : d.post,
        viewer: kind === 'like' ? { ...d.viewer, liked: result.liked } : { ...d.viewer, bookmarked: result.bookmarked },
      }));
    } catch (err) {
      setActionError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="post">
      {!isPublished && (
        <div className="banner banner-info">
          This is a <strong>draft</strong>. Only you can see it. <Link to={`/edit/${post.slug}`}>Continue editing</Link>
        </div>
      )}
      {post.coverImage && <img className="post-cover" src={post.coverImage} alt="" />}

      <h1 className="post-title">{post.title}</h1>

      <div className="post-meta">
        <Link to={`/u/${post.author._id}`} className="byline-author">
          <Avatar user={post.author} size={44} />
          <span>
            <strong>{post.author.name}</strong>
            <span className="muted post-meta-sub">
              {isPublished ? formatDate(post.publishedAt) : 'Not published'} · {post.readingTime} min read
            </span>
          </span>
        </Link>
        <FollowButton
          userId={post.author._id}
          following={viewer.followingAuthor}
          onChange={(r) => state.setData((d) => ({ ...d, viewer: { ...d.viewer, followingAuthor: r.following } }))}
        />
      </div>

      <TagChips tags={post.tags} />
      <Markdown>{post.content}</Markdown>

      <div className="post-actions">
        {isPublished && (
          <>
            <button
              type="button"
              className={`btn btn-ghost${viewer.liked ? ' is-active' : ''}`}
              onClick={() => react('like', viewer.liked)}
              disabled={busy}
              aria-pressed={viewer.liked}
            >
              {viewer.liked ? '♥' : '♡'} {post.likeCount} {post.likeCount === 1 ? 'like' : 'likes'}
            </button>
            <button
              type="button"
              className={`btn btn-ghost${viewer.bookmarked ? ' is-active' : ''}`}
              onClick={() => react('bookmark', viewer.bookmarked)}
              disabled={busy}
              aria-pressed={viewer.bookmarked}
            >
              {viewer.bookmarked ? '★ Saved' : '☆ Save'}
            </button>
          </>
        )}
        {isOwner && <Link to={`/edit/${post.slug}`} className="btn btn-outline">Edit post</Link>}
      </div>
      <ErrorBanner error={actionError} />

      {isPublished && <Comments postId={post._id} postAuthorId={post.author._id} />}
    </article>
  );
}
