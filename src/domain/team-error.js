export function teamErrorCanRetry(error) {
  const status = Number(error?.status);
  return !Number.isFinite(status) || status === 0 || status === 408 || status === 425 || status === 429 || status >= 500;
}
