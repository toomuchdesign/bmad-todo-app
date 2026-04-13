/**
 * Formats an ISO date string as a short, human-readable date
 * (e.g. "Apr 12, 2026") using the en-US locale — the app's UI language.
 */
function formatShortDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export { formatShortDate };
