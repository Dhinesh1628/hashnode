import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.min.css';

// react-markdown never renders raw HTML from the text, so a post containing
// <script> shows it as text instead of running it (no XSS).
// remark-gfm adds GitHub extras: tables, task lists, ~~strikethrough~~.
// rehype-highlight colors fenced code blocks with highlight.js, using the
// language after the backticks (```js). Blocks without a language stay plain:
// auto-detection guessed wrong too often (SQL came out as "ini").
// It only adds <span class="hljs-…"> tags, so it stays safe.
const components = {
  a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
  img: ({ node, ...props }) => <img {...props} loading="lazy" />,
};

const rehypePlugins = [[rehypeHighlight, { detect: false }]];

export function Markdown({ children }) {
  return (
    <div className="markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={rehypePlugins} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
