import { Link, useParams, useSearchParams } from 'react-router';
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
  const tag = useLoad(() => api(`/tags/${slug}`), [slug]);
  const posts = useLoad(() => api('/posts', { query: { tag: slug, page } }), [slug, page]);
  useTitle(tag.data ? `#${tag.data.tag.name}` : 'Tag');

  if (tag.error?.status === 404) return <NotFound message="That tag doesn't exist." />;

  return (
    <section>
      <div className="page-head">
        <h1>#{tag.data?.tag.name ?? slug}</h1>
        {tag.data && <span className="muted">{plural(tag.data.postCount, 'post')}</span>}
      </div>
      <PostList state={posts} onPage={(p) => setParams({ page: p })} emptyText="No published posts with this tag yet." />
    </section>
  );
}
