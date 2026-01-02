/**
 * Best-effort HTML -> plain text.
 *
 * @param {unknown} input
 * @returns {string}
 */
export function stripHtmlToText(input) {
  if (!input) return '';

  const asString = String(input);

  try {
    if (typeof window === 'undefined' || !window.DOMParser) return asString;
    const doc = new window.DOMParser().parseFromString(asString, 'text/html');
    return (doc.body?.textContent || '').replace(/\s+$/u, '');
  } catch {
    return asString;
  }
}
