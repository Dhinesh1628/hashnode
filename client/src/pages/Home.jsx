import { Link, useSearchParams } from 'react-router-dom';
import {
  IconClock, IconFlame, IconPencil, IconTrendingUp, IconUserPlus, IconUsers,
} from '@tabler/icons-react';
import { api } from '../api/client.js';
import { useAuth } from '../auth/useAuth.js';
import { useLoad } from '../lib/useLoad.js';
import { useTitle } from '../lib/useTitle.js';
import { plural } from '../lib/format.js';
import { Avatar } from '../components/ui.jsx';
import { PostList } from '../components/PostList.jsx';
import { FollowButton } from '../components/FollowButton.jsx';

const TABS = [
  ['latest', 'Latest', IconClock],
  ['popular', 'Popular', IconFlame],
  ['following', 'Following', IconUsers], // logged-in only
];

// --- Top band ---------------------------------------------------------------

function HomeHero({ tags }) {
  return (
    <header className="band home-hero">
      <h1>Where developers share what they learn</h1>
      <p>Read practical posts from the community, or write your own.</p>
      {tags?.length > 0 && (
        <nav className="topic-chips" aria-label="Popular topics">
          {tags.slice(0, 6).map((tag) => (
            <Link key={tag._id} to={`/tag/${tag.slug}`}>#{tag.name}</Link>
          ))}
          <Link to="/tags" className="topic-more">All topics →</Link>
        </nav>
      )}
    </header>
  );
}

// --- Sidebar ---------------------------------------------------------------

function WriteCard() {
  const { user } = useAuth();
  const drafts = useLoad(
    () => (user ? api('/posts/mine', { query: { status: 'draft', limit: 1 } }) : Promise.resolve(null)),
    [user?._id ?? null],
  );
  const draftCount = drafts.data?.pagination.total ?? 0;

  if (!user) {
    return (
      <section className="card side-card">
        <h2><IconPencil size={18} className="text-primary" aria-hidden="true" /> Join Hashnode</h2>
        <p className="muted small">Write about what you build, follow developers you like, and save posts for later.</p>
        <div className="side-actions">
          <Link to="/register" className="btn btn-primary btn-block">Create account</Link>
          <Link to="/login" className="btn btn-outline btn-block">Log in</Link>
        </div>
      </section>
    );
  }
  return (
    <section className="card side-card">
      <h2><IconPencil size={18} className="text-primary" aria-hidden="true" /> Share what you learned</h2>
      <p className="muted small">
        {draftCount
          ? <>You have <Link to="/dashboard?status=draft" className="text-attention strong">{plural(draftCount, 'draft')}</Link> in progress.</>
          : 'Short, practical posts help other developers the most.'}
      </p>
      <div className="side-actions">
        <Link to="/editor/new" className="btn btn-primary btn-block">Write a post</Link>
      </div>
    </section>
  );
}

function TrendingTags({ tags }) {
  if (!tags?.length) return null;
  return (
    <section className="card side-card">
      <h2><IconTrendingUp size={18} className="text-primary" aria-hidden="true" /> Trending tags</h2>
      <ul>
        {tags.slice(0, 5).map((tag) => (
          <li key={tag._id} className="side-row">
            <Link to={`/tag/${tag.slug}`} className="side-row-text">#{tag.name}</Link>
            <span className="muted small">{plural(tag.postCount, 'post')}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function AuthorsToFollow() {
  const { user } = useAuth();
  const state = useLoad(() => api('/users/suggested', { query: { limit: 4 } }), [user?._id ?? null]);
  const authors = state.data?.users ?? [];
  if (!authors.length) return null;

  // Once followed, the author leaves the list (they'll show in the Following tab).
  const followed = (id) => state.setData((d) => ({ ...d, users: d.users.filter((u) => u._id !== id) }));

  return (
    <section className="card side-card">
      <h2><IconUserPlus size={18} className="text-primary" aria-hidden="true" /> Authors to follow</h2>
      <ul>
        {authors.map((author) => (
          <li key={author._id} className="side-row">
            <Link to={`/profile/${author._id}`} className="side-author">
              <Avatar user={author} size={30} />
              <span className="side-row-text">
                <span className="truncate strong">{author.name}</span>
                <span className="muted small">{plural(author.postCount, 'post')}</span>
              </span>
            </Link>
            <FollowButton userId={author._id} following={false} onChange={(r) => r.following && followed(author._id)} />
          </li>
        ))}
      </ul>
    </section>
  );
}

// --- Page -----------------------------------------------------------------

export default function Home() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const page = Number(params.get('page')) || 1;
  const requested = params.get('tab');
  const tab = q ? 'latest'
    : requested === 'popular' ? 'popular'
      : requested === 'following' && user ? 'following'
        : 'latest';

  const tags = useLoad(() => api('/tags'), []);
  const feed = useLoad(
    () => (tab === 'following'
      ? api('/posts/following', { query: { page } })
      : api('/posts', { query: { page, search: q, sort: tab === 'popular' ? 'popular' : undefined } })),
    [tab, page, q, user?._id ?? null],
  );
  useTitle(q ? `Search: ${q}` : 'Home');

  function goToPage(next) {
    const copy = new URLSearchParams(params);
    copy.set('page', next);
    setParams(copy);
  }

  const emptyText = q ? `No posts match “${q}”. Try a shorter word.`
    : tab === 'following' ? 'Nothing here yet. Follow a few authors and their new posts show up here.'
      : 'No posts yet. Be the first to write one!';

  return (
    <div className="home">
      {!q && <HomeHero tags={tags.data?.tags} />}
      <div className="with-sidebar">
        <section aria-label="Posts">
          {q ? (
            <div className="page-head">
              <h1>Results for “{q}”</h1>
              <Link to="/" className="muted">Clear search</Link>
            </div>
          ) : (
            <div className="seg seg-boxed" role="tablist" aria-label="Feed">
              {TABS.filter(([name]) => name !== 'following' || user).map(([name, label, Icon]) => (
                <button
                  key={name}
                  type="button"
                  role="tab"
                  aria-selected={tab === name}
                  onClick={() => setParams(name === 'latest' ? {} : { tab: name })}
                >
                  <Icon size={16} aria-hidden="true" /> {label}
                </button>
              ))}
            </div>
          )}
          <PostList state={feed} onPage={goToPage} emptyText={emptyText} />
        </section>
        <aside className="home-side">
          <WriteCard />
          <TrendingTags tags={tags.data?.tags} />
          <AuthorsToFollow />
        </aside>
      </div>
    </div>
  );
}
