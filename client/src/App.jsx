import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { Layout } from './components/Layout.jsx';
import { RequireAuth } from './components/RequireAuth.jsx';
import Home from './pages/Home.jsx';
import { Login, Register } from './pages/AuthForms.jsx';
import PostPage from './pages/PostPage.jsx';
import Editor from './pages/Editor.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Bookmarks from './pages/Bookmarks.jsx';
import Profile from './pages/Profile.jsx';
import Settings from './pages/Settings.jsx';
import { TagsPage, TagPage } from './pages/Tags.jsx';
import NotFound from './pages/NotFound.jsx';

// Older URLs from before the routes matched the PRD keep working.
function RedirectProfile() {
  const { id } = useParams();
  return <Navigate to={`/profile/${id}`} replace />;
}
function RedirectEdit() {
  const { id } = useParams();
  return <Navigate to={`/editor/${id}`} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="post/:slug" element={<PostPage />} />
        <Route path="tags" element={<TagsPage />} />
        <Route path="tag/:slug" element={<TagPage />} />
        <Route path="profile/:id" element={<Profile />} />
        <Route path="u/:id" element={<RedirectProfile />} />

        {/* Pages that need a logged-in user */}
        <Route element={<RequireAuth />}>
          <Route path="editor/new" element={<Editor />} />
          <Route path="editor/:id" element={<Editor />} />
          <Route path="new" element={<Navigate to="/editor/new" replace />} />
          <Route path="edit/:id" element={<RedirectEdit />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="bookmarks" element={<Bookmarks />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
