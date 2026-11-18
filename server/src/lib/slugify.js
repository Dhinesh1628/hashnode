import { randomBytes } from 'node:crypto';

// "Building a REST API in Express!" -> "building-a-rest-api-in-express"
export function slugify(text) {
  return String(text)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip accents: café -> cafe
    .toLowerCase()
    .replace(/\+/g, '-plus')        // c++ -> c-plus-plus
    .replace(/#/g, '-sharp')         // c#  -> c-sharp
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '');
}

// Post slugs get a short random suffix so two posts titled
// "Hello World" never collide: hello-world-k3f9a
export function uniqueSlug(text) {
  const base = slugify(text) || 'untitled';
  const suffix = randomBytes(4).toString('base64url').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5);
  return `${base}-${suffix || 'x'}`;
}
