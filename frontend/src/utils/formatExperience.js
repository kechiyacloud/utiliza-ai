export function formatYears(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return '—';
  // If anything > 80 leaks through (legacy/un-migrated row), assume months
  const years = n > 80 ? n / 12 : n;
  return `${years.toFixed(1)} Yrs`;
}
