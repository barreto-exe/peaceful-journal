/**
 * @typedef {import('firebase/auth').User} FirebaseUser
 */

/**
 * Returns initials for avatar display.
 *
 * @param {FirebaseUser | null | undefined} user
 * @param {string | null | undefined} displayName
 * @returns {string}
 */
export function getUserInitials(user, displayName) {
  const name = (displayName || '').trim();
  if (name) {
    const parts = name.split(/\s+/u).filter(Boolean);
    const first = parts[0]?.[0] || '';
    const second = parts[1]?.[0] || '';
    return (first + second).toUpperCase() || '?';
  }

  const email = user?.email || '';
  return (email[0] || '?').toUpperCase();
}
