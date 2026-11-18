// Turns Markdown into plain text for excerpts and word counts.
// Not a full parser: it only needs to be good enough for a 200-char preview.

export function markdownToPlainText(md = '') {
  return md
    .replace(/```[\s\S]*?```/g, ' ')          // fenced code blocks
    .replace(/`([^`]*)`/g, '$1')              // inline code
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')    // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')  // links -> link text
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')       // heading markers
    .replace(/^\s{0,3}>\s?/gm, '')            // blockquotes
    .replace(/^\s*([-*+]|\d+\.)\s+/gm, '')    // list markers
    .replace(/(\*\*|__|\*|_|~~)(.*?)\1/g, '$2') // emphasis
    .replace(/<[^>]+>/g, ' ')                 // stray HTML tags
    .replace(/\s+/g, ' ')
    .trim();
}

export function makeExcerpt(md, maxLength = 200) {
  const text = markdownToPlainText(md);
  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : maxLength)}…`;
}

// Technical writing reads slower than prose; 200 wpm is a fair estimate.
export function readingMinutes(md) {
  const words = markdownToPlainText(md).split(' ').filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
