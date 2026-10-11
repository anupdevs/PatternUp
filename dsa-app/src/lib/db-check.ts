/**
 * Determines if a valid production/live database connection is configured.
 * Returns false for placeholder, dummy, or missing connection strings.
 */
export function isLiveDb(): boolean {
  const url = process.env.DATABASE_URL;
  if (!url) return false;
  if (
    url.includes('placeholder') ||
    url.includes('dummy') ||
    url.includes('ep-placeholder-123456')
  ) {
    return false;
  }
  return true;
}
