import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../auth/useAuth.js';
import { useLoad } from '../lib/useLoad.js';
import { useTitle } from '../lib/useTitle.js';
import { formatDate } from '../lib/format.js';
import { Avatar, Empty, ErrorBanner, Loading, Pagination, UserRow } from '../components/ui.jsx';
import { PostList } from '../components/PostList.jsx';
import { FollowButton } from '../components/FollowButton.jsx';
import NotFound from './NotFound.jsx';

const TABS = ['posts', 'followers', 'following'];

function PeopleList({ state, emptyText, onPage }) {
  if (state.error) return <ErrorBanner error={state.error} />;
  if (!state.data) return <Loading />;
  if (!state.data.users.length) return <Empty>{emptyText}</Empty>;
  return (
    <>
      <ul className="card user-list">
        {state.data.users.map((u) => <UserRow key={u._id} user={u} />)}
      </ul>
      <Pagination pagination={state.data.pagination} onPage={onPage} />
    </>
  );
}

export default function Profile() {
  const { id } = useParams();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = TABS.includes(params.get('tab')) ? params.get('tab') : 'posts';
  const page = Number(params.get('page')) || 1;

  const profile = useLoad(() => api(`/users/${id}`), [id, user?._id ?? null]);
  const list = useLoad(
    () => (tab === 'posts'
      ? api('/posts', { query: { author: id, page } })
      : api(`/users/${id}/${tab}`, { query: { page } })),
    [id, tab, page],
  );
  useTitle(profile.data?.user.name ?? 'Profile');

  if (profile.error?.status === 404) return <NotFound message="This user doesn't exist." />;
  if (profile.error) return <ErrorBanner error={profile.error} />;
  if (!profile.data) return <Loading />;

  const { user: person, stats, isFollowing } = profile.data;
  const isMe = user?._id === person._id;
  const counts = { posts: stats.posts, followers: stats.followers, following: stats.following };

  function onFollowChange(result) {
    profile.setData((d) => ({
      ...d,
      isFollowing: result.following,
      stats: { ...d.stats, followers: result.followerCount },
    }));
    if (tab === 'followers') list.reload();
  }

  return (
    <section>
      <div className="card profile-head">
        <Avatar user={person} size={88} />
        <div className="profile-info">
          <h1>{person.name}</h1>
          {person.bio && <p>{person.bio}</p>}
          <p className="muted">Joined {formatDate(person.createdAt)}</p>
        </div>
        <div className="profile-action">
          {isMe
            ? <Link to="/settings" className="btn btn-outline btn-sm">Edit profile</Link>
            : <FollowButton userId={person._id} following={isFollowing} onChange={onFollowChange} />}
        </div>
      </div>

      <div className="tabs" role="tablist">
        {TABS.map((name) => (
          <button key={name} type="button" role="tab" aria-selected={tab === name} onClick={() => setParams(name === 'posts' ? {} : { tab: name })}>
            {name[0].toUpperCase() + name.slice(1)} <span className="muted">{counts[name]}</span>
          </button>
        ))}
      </div>

      {tab === 'posts' ? (
        <PostList
          state={list}
          onPage={(p) => setParams({ page: p })}
          emptyText={isMe ? 'You haven’t published anything yet.' : 'No published posts yet.'}
        />
      ) : (
        <PeopleList
          state={list}
          onPage={(p) => setParams({ tab, page: p })}
          emptyText={tab === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
        />
      )}
    </section>
  );
}
