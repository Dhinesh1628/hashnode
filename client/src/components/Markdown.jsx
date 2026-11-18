import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// react-markdown never renders raw HTML from the text, so a post containing
// <script> shows it as text instead of running it (no XSS).
// remark-gfm adds GitHub extras: tables, task lists, ~~strikethrough~~.
const components = {
  a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
  img: ({ node, ...props }) => <img {...props} loading="lazy" />,
};

export function Markdown({ children }) {
  return (
    <div className="markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
