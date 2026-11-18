import { PostCard } from './PostCard.jsx';
import { Empty, ErrorBanner, Loading, Pagination } from './ui.jsx';

// Renders a useLoad() result of { posts, pagination } as cards with paging.
export function PostList({ state, emptyText = 'No posts yet.', onPage }) {
  const { data, error, loading } = state;
  if (error) return <ErrorBanner error={error} />;
  if (!data) return <Loading />;
  if (!data.posts.length) return <Empty>{emptyText}</Empty>;

  return (
    <div className={loading ? 'is-refreshing' : undefined}>
      <div className="post-list">
        {data.posts.map((post) => <PostCard key={post._id} post={post} />)}
      </div>
      <Pagination pagination={data.pagination} onPage={onPage} />
    </div>
  );
}
