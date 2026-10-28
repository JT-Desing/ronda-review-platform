export function nextCommentFilterIndex(index, key, count = 3) {
  if (!Number.isInteger(index) || !Number.isInteger(count) || count < 1) return null;
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  if (key === 'ArrowRight') return (index + 1) % count;
  if (key === 'ArrowLeft') return (index - 1 + count) % count;
  return null;
}
