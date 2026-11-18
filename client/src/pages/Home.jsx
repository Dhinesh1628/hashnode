import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../auth/useAuth.js';
import { useLoad } from '../lib/useLoad.js';
import { useTitle } from '../lib/useTitle.js';
import { PostList } from '../components/PostList.jsx';

function PopularTags() {
  const { data } = useLoad(() => api('/tags'), []);
  if (!data?.tags.length) return null;
  return (
    <aside className="card sidebar">
      <h3>Popular tags</h3>
      <ul className="sidebar-tags">
        {data.tags.slice(0, 12).map((tag) => (
          <li key={tag._id}>
            <Link to={`/tag/${tag.slug}`}>#{tag.name}</Link>
            <span className="muted">{tag.postCount}</span>
          </li>
        ))}
      </ul>
      <Link to="/tags" className="sidebar-more">All tags →</Link>
    </aside>
  );
}

export default function Home() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const page = Number(params.get('page')) || 1;
  const tab = user && !q && params.get('tab') === 'following' ? 'following' : 'latest';

  const feed = useLoad(
    () => (tab === 'following'
      ? api('/posts/following', { query: { page } })
      : api('/posts', { query: { page, search: q } })),
    [tab, page, q, user?._id ?? null],
  );
  useTitle(q ? `Search: ${q}` : 'Home');

  function goToPage(next) {
    const copy = new URLSearchParams(params);
    copy.set('page', next);
    setParams(copy);
  }
  function chooseTab(name) {
    setParams(name === 'following' ? { tab: 'following' } : {});
  }

  return (
    <div className="with-sidebar">
      <section>
        {q ? (
          <div className="page-head">
            <h1>Results for “{q}”</h1>
            <Link to="/" className="muted">Clear search</Link>
          </div>
        ) : (
          <div className="tabs" role="tablist">
            <button type="button" role="tab" aria-selected={tab === 'latest'} onClick={() => chooseTab('latest')}>
              Latest
            </button>
            {user && (
              <button type="button" role="tab" aria-selected={tab === 'following'} onClick={() => chooseTab('following')}>
                Following
              </button>
            )}
          </div>
        )}
        <PostList
          state={feed}
          onPage={goToPage}
          emptyText={
            q ? 'No posts match your search.'
              : tab === 'following' ? 'Nothing here yet. Follow some authors to fill this feed.'
                : 'No posts yet. Be the first to write one!'
          }
        />
      </section>
      <PopularTags />
    </div>
  );
}
