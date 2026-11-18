const dateFormat = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' });

export function formatDate(value) {
  return value ? dateFormat.format(new Date(value)) : '';
}

export function plural(count, word) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}
