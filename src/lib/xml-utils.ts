/**
 * Shared XML utilities used by both SAF-T and EHF generators.
 */

/** Escape special XML characters in text content. */
export function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

/** Format a Date as YYYY-MM-DD for XML date fields. */
export function formatXmlDate(date: Date): string {
  return date.toISOString().split("T")[0]
}
