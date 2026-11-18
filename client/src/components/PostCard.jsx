import { Link } from 'react-router';
import { Avatar, TagChips } from './ui.jsx';
import { formatDate, plural } from '../lib/format.js';

export function PostCard({ post }) {
  return (
    <article className="card post-card">
      <div className="post-card-body">
        <div className="byline">
          <Link to={`/u/${post.author._id}`} className="byline-author">
            <Avatar user={post.author} size={28} />
            {post.author.name}
          </Link>
          <span className="muted">· {formatDate(post.publishedAt)}</span>
        </div>
        <h2 className="post-card-title">
          <Link to={`/post/${post.slug}`}>{post.title}</Link>
        </h2>
        {post.excerpt && <p className="post-card-excerpt">{post.excerpt}</p>}
        <div className="post-card-footer">
          <TagChips tags={post.tags} />
          <span className="muted post-card-stats">
            {post.readingTime} min read · ♥ {post.likeCount ?? 0} · {plural(post.commentCount ?? 0, 'comment')}
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
