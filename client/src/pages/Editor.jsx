import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { api } from '../api/client.js';
import { useAuth } from '../auth/useAuth.js';
import { useLoad } from '../lib/useLoad.js';
import { useTitle } from '../lib/useTitle.js';
import { splitTags } from '../lib/format.js';
import { ErrorBanner, Field, Loading } from '../components/ui.jsx';
import { Markdown } from '../components/Markdown.jsx';
import NotFound from './NotFound.jsx';

function EditorForm({ post }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: post?.title ?? '',
    coverImage: post?.coverImage ?? '',
    tags: post?.tags.map((t) => t.name).join(', ') ?? '',
    content: post?.content ?? '',
  });
  const [view, setView] = useState('write');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(null); // which button is busy: 'draft' | 'published'

  const fields = error?.fields ?? {};
  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const wasPublished = post?.status === 'published';

  async function save(status) {
    setSaving(status);
    setError(null);
    const body = {
      title: form.title,
      content: form.content,
      coverImage: form.coverImage.trim(),
      tags: splitTags(form.tags),
      status,
    };
    try {
      const { post: saved } = post
        ? await api(`/posts/${post._id}`, { method: 'PATCH', body })
        : await api('/posts', { method: 'POST', body });
      navigate(`/post/${saved.slug}`);
    } catch (err) {
      setError(err);
      setSaving(null);
    }
  }

  return (
    <form className="editor" onSubmit={(e) => { e.preventDefault(); save('published'); }} noValidate>
      <div className="page-head">
        <h1>{post ? 'Edit post' : 'Write a new post'}</h1>
        {post && <Link to={`/post/${post.slug}`} className="muted">View post</Link>}
      </div>
      <ErrorBanner error={error && !Object.keys(fields).length ? error : null} />

      <Field label="Title" name="title" value={form.title} onChange={onChange} error={fields.title} maxLength={150} placeholder="A great title" required />
      <Field label="Cover image link (optional)" name="coverImage" type="url" value={form.coverImage} onChange={onChange} error={fields.coverImage} placeholder="https://…" />
      <Field label="Tags (up to 5, comma separated)" name="tags" value={form.tags} onChange={onChange} error={fields.tags} placeholder="javascript, react, webdev" />

      <div className={`field${fields.content ? ' field-invalid' : ''}`}>
        <div className="editor-tabs" role="tablist">
          <label htmlFor="content">Content (Markdown)</label>
          <button type="button" role="tab" aria-selected={view === 'write'} onClick={() => setView('write')}>Write</button>
          <button type="button" role="tab" aria-selected={view === 'preview'} onClick={() => setView('preview')}>Preview</button>
        </div>
        {view === 'write' ? (
          <textarea
            id="content"
            name="content"
            value={form.content}
            onChange={onChange}
            rows={18}
            placeholder={'# Hello\n\nWrite in **Markdown**. Code blocks, lists and links all work.'}
            aria-invalid={Boolean(fields.content)}
          />
        ) : (
          <div className="card editor-preview">
            {form.content.trim() ? <Markdown>{form.content}</Markdown> : <p className="muted">Nothing to preview yet.</p>}
          </div>
        )}
        {fields.content && <p className="field-error">{fields.content}</p>}
      </div>

      <div className="row editor-actions">
        <button type="submit" className="btn btn-primary" disabled={Boolean(saving)}>
          {saving === 'published' ? 'Saving…' : wasPublished ? 'Update' : 'Publish'}
        </button>
        <button type="button" className="btn btn-outline" onClick={() => save('draft')} disabled={Boolean(saving)}>
          {saving === 'draft' ? 'Saving…' : wasPublished ? 'Unpublish (move to drafts)' : 'Save draft'}
        </button>
      </div>
    </form>
  );
}

// /new starts empty; /edit/:slug loads the post (drafts load for their author).
export default function Editor() {
  const { slug } = useParams();
  const { user } = useAuth();
  const existing = useLoad(() => (slug ? api(`/posts/${slug}`) : Promise.resolve(null)), [slug ?? null]);
  useTitle(slug ? 'Edit post' : 'New post');

  if (!slug) return <EditorForm key="new" />;
  if (existing.error?.status === 404) return <NotFound message="That post doesn't exist." />;
  if (existing.error) return <ErrorBanner error={existing.error} />;
  if (!existing.data) return <Loading />;

  const { post } = existing.data;
  if (post.author._id !== user._id) {
    return <div className="banner banner-error">You can only edit your own posts.</div>;
  }
  return <EditorForm key={post._id} post={post} />;
}
