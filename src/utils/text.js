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

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeHref(href) {
  const trimmed = String(href || '').trim();
  if (!trimmed) return '';

  try {
    const url = new window.URL(trimmed, window.location.href);
    // Only allow safe protocols.
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
    return url.href;
  } catch {
    return '';
  }
}

/**
 * Convert TipTap HTML into a safe, minimal HTML snippet for list previews.
 * Keeps inline formatting (bold/italic/underline/strike), links and bullet lists.
 *
 * @param {unknown} input
 * @returns {string}
 */
export function htmlToPreviewHtml(input) {
  if (!input) return '';
  const asString = String(input);

  try {
    if (typeof window === 'undefined' || !window.DOMParser) return '';
    const doc = new window.DOMParser().parseFromString(asString, 'text/html');
    const root = doc.body;
    if (!root) return '';

    /** @type {string[]} */
    const lines = [];

    const renderInline = (node) => {
      if (!node) return '';

      // Text
      if (node.nodeType === window.Node.TEXT_NODE) {
        return escapeHtml(node.nodeValue || '');
      }

      // Element
      if (node.nodeType !== window.Node.ELEMENT_NODE) return '';
      const el = /** @type {HTMLElement} */ (node);
      const tag = el.tagName.toLowerCase();

      if (tag === 'br') return '<br />';

      const childrenHtml = Array.from(el.childNodes).map(renderInline).join('');

      if (tag === 'strong' || tag === 'b') return `<strong>${childrenHtml}</strong>`;
      if (tag === 'em' || tag === 'i') return `<em>${childrenHtml}</em>`;
      if (tag === 'u') return `<u>${childrenHtml}</u>`;
      if (tag === 's' || tag === 'strike') return `<s>${childrenHtml}</s>`;
      if (tag === 'a') {
        const safeHref = sanitizeHref(el.getAttribute('href'));
        if (!safeHref) return childrenHtml;
        return `<a href="${escapeHtml(safeHref)}" target="_blank" rel="noopener noreferrer">${childrenHtml}</a>`;
      }

      // Drop unknown tags but keep their text/children.
      return childrenHtml;
    };

    const pushLineFromNode = (node, prefix = '') => {
      const html = Array.from(node.childNodes).map(renderInline).join('');
      const trimmed = html.replace(/^(<br \/>)+/u, '').replace(/(<br \/>)+$/u, '');
      if (!trimmed) return;
      lines.push(prefix + trimmed);
    };

    const walkBlocks = (node) => {
      if (!node) return;
      if (node.nodeType === window.Node.TEXT_NODE) {
        const t = (node.nodeValue || '').trim();
        if (t) lines.push(escapeHtml(t));
        return;
      }

      if (node.nodeType !== window.Node.ELEMENT_NODE) return;
      const el = /** @type {HTMLElement} */ (node);
      const tag = el.tagName.toLowerCase();

      if (tag === 'p' || tag === 'div') {
        pushLineFromNode(el);
        return;
      }

      if (tag === 'ul') {
        for (const li of Array.from(el.querySelectorAll(':scope > li'))) {
          pushLineFromNode(li, '• ');
        }
        return;
      }

      if (tag === 'li') {
        pushLineFromNode(el, '• ');
        return;
      }

      // Fallback: keep walking.
      for (const child of Array.from(el.childNodes)) walkBlocks(child);
    };

    for (const child of Array.from(root.childNodes)) {
      walkBlocks(child);
    }

    return lines.join('<br />');
  } catch {
    return '';
  }
}
