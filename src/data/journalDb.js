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
 *  tags?: string[],
 *  mood?: string,
 *  draft?: Entry,
  *  autosaves?: Record<string, Entry>,
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
      entries.sort((a, b) => {
        const aCreated = (a?.draft?.createdAt ?? a?.createdAt ?? 0);
        const bCreated = (b?.draft?.createdAt ?? b?.createdAt ?? 0);
        return bCreated - aCreated;
      });
    }

    onChange(entries);
  });
}

/**
 * Subscribes to the full entries tree for a user.
 * Useful for lightweight metadata (e.g. tag lists, day markers).
 *
 * Data shape: entries/{uid}/{YYYY-MM-DD}/{entryId}
 *
 * @param {string} uid
 * @param {(tree: any | null) => void} onChange
 * @returns {import('firebase/database').Unsubscribe}
 */
export function subscribeEntriesTree(uid, onChange) {
  const rootRef = ref(db, `entries/${uid}`);
  return onValue(rootRef, (snapshot) => {
    const val = snapshot.val();
    onChange(val && typeof val === 'object' ? val : null);
  });
}

/**
 * Subscribes to the set of days (dateKeys) that have at least one entry.
 *
 * Data shape: entries/{uid}/{YYYY-MM-DD}/{entryId}
 *
 * @param {string} uid
 * @param {(dateKeys: string[]) => void} onChange
 * @returns {import('firebase/database').Unsubscribe}
 */
export function subscribeEntryDayKeys(uid, onChange) {
  const rootRef = ref(db, `entries/${uid}`);
  return onValue(rootRef, (snapshot) => {
    const val = snapshot.val();
    if (!val || typeof val !== 'object') {
      onChange([]);
      return;
    }

    const dateKeys = Object.keys(val).filter((dateKey) => {
      const dayBucket = val[dateKey];
      if (!dayBucket || typeof dayBucket !== 'object') return false;
      return Object.keys(dayBucket).length > 0;
    });

    dateKeys.sort();
    onChange(dateKeys);
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
    tags: [],
    mood: '',
    createdAt: now,
    updatedAt: now,
  };
  await set(newRef, entry);
  return { id: newRef.key, ...entry };
}

/**
 * Saves entry progress to a per-session autosave.
 *
 * @param {string} uid
 * @param {string} dateKey
 * @param {string} entryId
 * @param {string} sessionId
 * @param {Partial<Entry>} patch
 * @returns {Promise<void>}
 */
export async function saveEntryAutosave(uid, dateKey, entryId, sessionId, patch) {
  const entryRef = ref(db, `entries/${uid}/${dateKey}/${entryId}`);
  const now = Date.now();
  const safeSessionId = String(sessionId || '').trim();
  if (!safeSessionId) throw new Error('Missing sessionId');

  /** @type {Record<string, any>} */
  const updates = {
    [`autosaves/${safeSessionId}/updatedAt`]: now,
  };

  for (const [key, value] of Object.entries(patch || {})) {
    if (key === 'draft' || key === 'autosaves') continue;
    updates[`autosaves/${safeSessionId}/${key}`] = value;
  }

  await update(entryRef, updates);
}

/**
 * Deletes a per-session autosave.
 *
 * @param {string} uid
 * @param {string} dateKey
 * @param {string} entryId
 * @param {string} sessionId
 * @returns {Promise<void>}
 */
export async function deleteEntryAutosave(uid, dateKey, entryId, sessionId) {
  const safeSessionId = String(sessionId || '').trim();
  if (!safeSessionId) return;
  const autosaveRef = ref(db, `entries/${uid}/${dateKey}/${entryId}/autosaves/${safeSessionId}`);
  await remove(autosaveRef);
}

/**
 * Promotes the current session autosave (or provided patch) to the shared draft.
 *
 * @param {string} uid
 * @param {string} dateKey
 * @param {string} entryId
 * @param {string} sessionId
 * @param {Partial<Entry>} draft
 * @returns {Promise<void>}
 */
export async function promoteToDraft(uid, dateKey, entryId, sessionId, draft) {
  const entryRef = ref(db, `entries/${uid}/${dateKey}/${entryId}`);
  await update(entryRef, {
    draft: {
      ...draft,
      updatedAt: Date.now(),
    },
    draftBy: String(sessionId || ''),
    draftAt: Date.now(),
  });
}

/**
 * Finalizes a draft: copies the provided fields to the main entry and clears draft.
 *
 * @param {string} uid
 * @param {string} dateKey
 * @param {string} entryId
 * @param {Partial<Entry>} patch
 * @returns {Promise<void>}
 */
export async function finalizeEntryDraft(uid, dateKey, entryId, patch) {
  const entryRef = ref(db, `entries/${uid}/${dateKey}/${entryId}`);
  await update(entryRef, {
    ...patch,
    draft: null,
    updatedAt: Date.now(),
  });
}

/**
 * Discards a draft without touching the saved entry fields.
 *
 * @param {string} uid
 * @param {string} dateKey
 * @param {string} entryId
 * @returns {Promise<void>}
 */
export async function discardEntryDraft(uid, dateKey, entryId) {
  const entryRef = ref(db, `entries/${uid}/${dateKey}/${entryId}`);
  await update(entryRef, {
    draft: null,
    updatedAt: Date.now(),
  });
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

function normalizeTagValue(tag) {
  const v = String(tag || '').trim();
  if (!v) return '';
  return v.startsWith('#') ? v.slice(1).trim() : v;
}

function renameTagInList(tags, fromLower, toTag) {
  if (!Array.isArray(tags) || tags.length === 0) return { next: Array.isArray(tags) ? tags : [], changed: false };

  /** @type {string[]} */
  const replaced = [];
  let hadMatch = false;

  for (const raw of tags) {
    const cleaned = normalizeTagValue(raw);
    if (!cleaned) continue;
    if (cleaned.toLowerCase() === fromLower) {
      replaced.push(toTag);
      hadMatch = true;
    } else {
      replaced.push(cleaned);
    }
  }

  if (!hadMatch) return { next: replaced, changed: false };

  // Deduplicate case-insensitively while preserving first casing.
  const seen = new Set();
  /** @type {string[]} */
  const deduped = [];
  for (const t of replaced) {
    const k = String(t).toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    deduped.push(t);
  }

  return { next: deduped, changed: true };
}

/**
 * Renames a tag across all entries for a user.
 *
 * Updates:
 * - entries/{uid}/{dateKey}/{entryId}/tags
 * - entries/{uid}/{dateKey}/{entryId}/draft/tags
 * - entries/{uid}/{dateKey}/{entryId}/autosaves/{sessionId}/tags
 *
 * @param {string} uid
 * @param {any | null} entriesTree
 * @param {string} fromTag
 * @param {string} toTag
 * @returns {Promise<{updated: number}>}
 */
export async function renameEntryTag(uid, entriesTree, fromTag, toTag) {
  if (!uid) throw new Error('Missing uid.');
  if (!entriesTree || typeof entriesTree !== 'object') return { updated: 0 };

  const fromClean = normalizeTagValue(fromTag);
  const toClean = normalizeTagValue(toTag);

  if (!fromClean || !toClean) throw new Error('Missing tag value.');
  if (fromClean.toLowerCase() === toClean.toLowerCase()) return { updated: 0 };

  const fromLower = fromClean.toLowerCase();

  /** @type {Record<string, any>} */
  const updates = {};
  let touched = 0;

  for (const dateKey of Object.keys(entriesTree)) {
    const dayBucket = entriesTree[dateKey];
    if (!dayBucket || typeof dayBucket !== 'object') continue;

    for (const entryId of Object.keys(dayBucket)) {
      const entry = dayBucket[entryId];
      if (!entry || typeof entry !== 'object') continue;

      // Main tags
      if (Array.isArray(entry.tags)) {
        const { next, changed } = renameTagInList(entry.tags, fromLower, toClean);
        if (changed) {
          updates[`entries/${uid}/${dateKey}/${entryId}/tags`] = next;
          touched += 1;
        }
      }

      // Draft tags
      if (entry.draft && typeof entry.draft === 'object' && Array.isArray(entry.draft.tags)) {
        const { next, changed } = renameTagInList(entry.draft.tags, fromLower, toClean);
        if (changed) {
          updates[`entries/${uid}/${dateKey}/${entryId}/draft/tags`] = next;
          touched += 1;
        }
      }

      // Autosave tags
      if (entry.autosaves && typeof entry.autosaves === 'object') {
        for (const sessionId of Object.keys(entry.autosaves)) {
          const autosave = entry.autosaves[sessionId];
          if (!autosave || typeof autosave !== 'object') continue;
          if (!Array.isArray(autosave.tags)) continue;

          const { next, changed } = renameTagInList(autosave.tags, fromLower, toClean);
          if (changed) {
            updates[`entries/${uid}/${dateKey}/${entryId}/autosaves/${sessionId}/tags`] = next;
            touched += 1;
          }
        }
      }
    }
  }

  if (touched === 0) return { updated: 0 };
  const rootRef = ref(db);
  await update(rootRef, updates);
  return { updated: touched };
}
