export function calculateBackoff(attempt: number): number {
  // Exponential backoff with jitter
  const base = Math.pow(2, attempt) * 1000;
  const jitter = Math.random() * 500;
  return base + jitter;
}
