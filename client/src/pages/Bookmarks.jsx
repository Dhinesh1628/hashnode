import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { useLoad } from '../lib/useLoad.js';
import { useTitle } from '../lib/useTitle.js';
import { PostList } from '../components/PostList.jsx';

export default function Bookmarks() {
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('page')) || 1;
  const list = useLoad(() => api('/users/me/bookmarks', { query: { page } }), [page]);
  useTitle('Bookmarks');

  return (
    <section>
      <div className="page-head"><h1>Bookmarks</h1></div>
      <PostList
        state={list}
        onPage={(p) => setParams({ page: p })}
        emptyText="Nothing saved yet. Press ☆ Save on a post to read it later."
      />
    </section>
  );
}
