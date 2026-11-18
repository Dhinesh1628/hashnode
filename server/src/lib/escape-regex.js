// Search text goes into a RegExp. Escaping it means "c++" or "(" are searched
// literally instead of crashing the query or being used as a regex attack.
export function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
