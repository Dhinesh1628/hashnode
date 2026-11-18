import { lazy, Suspense } from 'react';
import { Loading } from './ui.jsx';

// The Markdown renderer with syntax highlighting is the biggest part of the
// app (highlight.js knows ~40 languages). Loading it only when a page shows
// Markdown keeps the feed, tags and dashboard pages fast.
const MarkdownImpl = lazy(() => import('./Markdown.jsx').then((m) => ({ default: m.Markdown })));

export function Markdown(props) {
  return (
    <Suspense fallback={<Loading label="Loading post…" />}>
      <MarkdownImpl {...props} />
    </Suspense>
  );
}
