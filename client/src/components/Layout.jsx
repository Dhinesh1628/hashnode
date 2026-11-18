import { useEffect, useRef } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router';
import { useAuth } from '../auth/useAuth.js';
import { Avatar, Loading } from './ui.jsx';

function SearchBox() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const q = params.get('q') ?? '';

  function onSubmit(e) {
    e.preventDefault();
    const text = new FormData(e.currentTarget).get('q').trim();
    navigate(text ? `/?q=${encodeURIComponent(text)}` : '/');
  }

  return (
    <form className="search" role="search" onSubmit={onSubmit}>
      <input key={q} name="q" type="search" defaultValue={q} placeholder="Search posts…" aria-label="Search posts" />
    </form>
  );
}

function UserMenu({ user, logout }) {
  const menu = useRef(null);
  const close = () => { if (menu.current) menu.current.open = false; };

  // Close when clicking anywhere outside the menu, or pressing Escape.
  useEffect(() => {
    const onPointerDown = (e) => { if (menu.current && !menu.current.contains(e.target)) close(); };
    const onKeyDown = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return (
    <details className="user-menu" ref={menu}>
      <summary aria-label="Account menu">
        <Avatar user={user} size={34} />
      </summary>
      <div className="user-menu-panel" onClick={close}>
        <div className="user-menu-name">
          <strong>{user.name}</strong>
          <span className="muted">{user.email}</span>
        </div>
        <Link to={`/u/${user._id}`}>My profile</Link>
        <Link to="/dashboard">My posts</Link>
        <Link to="/bookmarks">Bookmarks</Link>
        <Link to="/settings">Settings</Link>
        <button type="button" onClick={logout}>Log out</button>
      </div>
    </details>
  );
}

export function Layout() {
  const { user, status, logout } = useAuth();
  const { pathname } = useLocation();
  // While a saved login is being checked, wait instead of rendering the page
  // as a visitor first (that would flash "Log in" and load everything twice).
  const checking = status === 'loading';

  // A new page starts at the top, like a normal website.
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  return (
    <>
      <header className="navbar">
        <div className="container navbar-inner">
          <Link to="/" className="logo" aria-label="Hashnode home">
            <img src="/favicon.svg" alt="" width="28" height="28" />
            <span>hashnode</span>
          </Link>
          <SearchBox />
          <nav className="nav-links">
            <NavLink to="/tags">Tags</NavLink>
            {checking ? null : user ? (
              <>
                <Link to="/new" className="btn btn-primary btn-sm">Write</Link>
                <UserMenu user={user} logout={logout} />
              </>
            ) : (
              <>
                <NavLink to="/login">Log in</NavLink>
                <Link to="/register" className="btn btn-primary btn-sm">Sign up</Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="container main">
        {checking ? <Loading /> : <Outlet />}
      </main>
      <footer className="footer">
        <div className="container muted">Hashnode · a blogging platform for developers</div>
      </footer>
    </>
  );
}
