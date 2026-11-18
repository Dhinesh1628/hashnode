import { Route, Routes } from 'react-router';
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
        <Route path="u/:id" element={<Profile />} />

        {/* Pages that need a logged-in user */}
        <Route element={<RequireAuth />}>
          <Route path="new" element={<Editor />} />
          <Route path="edit/:slug" element={<Editor />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="bookmarks" element={<Bookmarks />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
