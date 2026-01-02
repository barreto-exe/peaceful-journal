import { db } from '../firebase.js';
import {
  onValue,
  push,
  ref,
  remove,
  set,
  update,
} from 'firebase/database';

/**
 * @typedef {{
 *  displayName?: string,
 *  locale?: string,
 * }} Profile
 */

/**
 * @typedef {{
 *  title?: string,
 *  body?: string,
 *  createdAt?: number,
 *  updatedAt?: number,
 * }} Entry
 */

export function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * @param {string} uid
 * @param {(profile: Profile | null) => void} onChange
 * @returns {import('firebase/database').Unsubscribe}
 */
export function subscribeProfile(uid, onChange) {
  const profileRef = ref(db, `profiles/${uid}`);
  return onValue(profileRef, (snapshot) => {
    onChange(snapshot.val() || null);
  });
}

/**
 * @param {string} uid
 * @param {Partial<Profile>} partialProfile
 * @returns {Promise<void>}
 */
export async function upsertProfile(uid, partialProfile) {
  const profileRef = ref(db, `profiles/${uid}`);
  await update(profileRef, partialProfile);
}

/**
 * @param {string} uid
 * @param {string} dateKey
 * @param {(entries: Array<{id: string} & Entry>) => void} onChange
 * @returns {import('firebase/database').Unsubscribe}
 */
export function subscribeEntriesForDate(uid, dateKey, onChange) {
  const dateRef = ref(db, `entries/${uid}/${dateKey}`);
  return onValue(dateRef, (snapshot) => {
    const val = snapshot.val();
    if (!val || typeof val !== 'object') {
      onChange([]);
      return;
    }

    const ids = Object.keys(val);
    const entries = new Array(ids.length);
    for (let i = 0; i < ids.length; i += 1) {
      const id = ids[i];
      entries[i] = {
        id,
        ...(val[id] || {}),
      };
    }

    if (entries.length > 1) {
      entries.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }

    onChange(entries);
  });
}

/**
 * @param {string} uid
 * @param {string} dateKey
 * @returns {Promise<{id: string} & Required<Pick<Entry,'title'|'body'|'createdAt'|'updatedAt'>>}
 */
export async function createEntry(uid, dateKey) {
  const dateRef = ref(db, `entries/${uid}/${dateKey}`);
  const newRef = push(dateRef);
  const now = Date.now();
  const entry = {
    title: '',
    body: '',
    createdAt: now,
    updatedAt: now,
  };
  await set(newRef, entry);
  return { id: newRef.key, ...entry };
}

/**
 * @param {string} uid
 * @param {string} dateKey
 * @param {string} entryId
 * @param {Partial<Entry>} patch
 * @returns {Promise<void>}
 */
export async function saveEntry(uid, dateKey, entryId, patch) {
  const entryRef = ref(db, `entries/${uid}/${dateKey}/${entryId}`);
  await update(entryRef, {
    ...patch,
    updatedAt: Date.now(),
  });
}

/**
 * @param {string} uid
 * @param {string} dateKey
 * @param {string} entryId
 * @returns {Promise<void>}
 */
export async function deleteEntry(uid, dateKey, entryId) {
  const entryRef = ref(db, `entries/${uid}/${dateKey}/${entryId}`);
  await remove(entryRef);
}

/**
 * Import many entries at once.
 *
 * Notes:
 * - Entries are grouped by day using the same dateKey strategy as the app.
 * - This uses a single multi-location update for efficiency.
 *
 * @param {string} uid
 * @param {Array<Required<Pick<Entry,'title'|'body'|'createdAt'>> & Partial<Pick<Entry,'updatedAt'>>>} entries
 * @returns {Promise<{imported: number}>}
 */
export async function importEntries(uid, entries) {
  if (!uid) throw new Error('Missing uid.');
  if (!Array.isArray(entries) || entries.length === 0) return { imported: 0 };

  /** @type {Record<string, any>} */
  const updates = {};

  for (const entry of entries) {
    const createdAt = Number(entry.createdAt);
    if (!Number.isFinite(createdAt)) continue;

    const dateKey = formatDateKey(new Date(createdAt));
    const dateRef = ref(db, `entries/${uid}/${dateKey}`);
    const newRef = push(dateRef);
    if (!newRef.key) continue;

    updates[`entries/${uid}/${dateKey}/${newRef.key}`] = {
      title: String(entry.title || ''),
      body: String(entry.body || ''),
      createdAt,
      updatedAt: Number.isFinite(Number(entry.updatedAt)) ? Number(entry.updatedAt) : createdAt,
    };
  }

  const rootRef = ref(db);
  await update(rootRef, updates);
  return { imported: Object.keys(updates).length };
}
