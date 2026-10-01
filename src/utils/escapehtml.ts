/**
 * Escapes HTML special characters in a string to prevent XSS attacks and ensure proper rendering in HTML.
 *
 * @param {string} str - The string to escape
 *
 * @returns {string} - The escaped string
 */
export function escapeHTML(str: string): string {
  return String(str).replace(/[&<>"']/g, (char: string) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return char;
    }
  });
}
