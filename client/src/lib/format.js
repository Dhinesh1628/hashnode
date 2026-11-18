const dateFormat = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' });

export function formatDate(value) {
  return value ? dateFormat.format(new Date(value)) : '';
}

export function plural(count, word) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

// "just now", "5 minutes ago", "3 days ago", then a date after a month.
export function timeAgo(value) {
  const seconds = Math.round((Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const steps = [[60, 'minute'], [24, 'hour'], [30, 'day']];
  let amount = Math.floor(seconds / 60);
  for (const [size, unit] of steps) {
    if (amount < size) return `${amount} ${unit}${amount === 1 ? '' : 's'} ago`;
    amount = Math.floor(amount / size);
  }
  return formatDate(value);
}
