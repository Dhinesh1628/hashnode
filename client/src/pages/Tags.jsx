import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { useLoad } from '../lib/useLoad.js';
import { useTitle } from '../lib/useTitle.js';
import { plural } from '../lib/format.js';
import { Empty, ErrorBanner, Loading } from '../components/ui.jsx';
import { PostList } from '../components/PostList.jsx';
import NotFound from './NotFound.jsx';

export function TagsPage() {
  const { data, error } = useLoad(() => api('/tags'), []);
  useTitle('Tags');

  return (
    <section>
      <div className="page-head"><h1>Tags</h1></div>
      <ErrorBanner error={error} />
      {!data && !error && <Loading />}
      {data && !data.tags.length && <Empty>No tags yet. Tags appear once a published post uses them.</Empty>}
      {data?.tags.length > 0 && (
        <ul className="tag-grid">
          {data.tags.map((tag) => (
            <li key={tag._id}>
              <Link to={`/tag/${tag.slug}`} className="card tag-tile">
                <strong>#{tag.name}</strong>
                <span className="muted">{plural(tag.postCount, 'post')}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function TagPage() {
  const { slug } = useParams();
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('page')) || 1;
  // One request returns the tag and its published posts.
  const state = useLoad(() => api(`/tags/${slug}/posts`, { query: { page } }), [slug, page]);
  const tag = state.data?.tag;
  useTitle(tag ? `#${tag.name}` : 'Tag');

  if (state.error?.status === 404) return <NotFound message="That tag doesn't exist." />;

  return (
    <section>
      <div className="page-head">
        <h1>#{tag?.name ?? slug}</h1>
        {state.data && <span className="muted">{plural(state.data.pagination.total, 'post')}</span>}
      </div>
      <PostList state={state} onPage={(p) => setParams({ page: p })} emptyText="No published posts with this tag yet." />
    </section>
  );
}
