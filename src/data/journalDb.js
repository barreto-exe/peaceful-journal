import { db } from '../firebase.js';
import {
  onValue,
  push,
  ref,
  remove,
  set,
  update,
} from 'firebase/database';

export function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function subscribeProfile(uid, onChange) {
  const profileRef = ref(db, `profiles/${uid}`);
  return onValue(profileRef, (snapshot) => {
    onChange(snapshot.val() || null);
  });
}

export async function upsertProfile(uid, partialProfile) {
  const profileRef = ref(db, `profiles/${uid}`);
  await update(profileRef, partialProfile);
}

export function subscribeEntriesForDate(uid, dateKey, onChange) {
  const dateRef = ref(db, `entries/${uid}/${dateKey}`);
  return onValue(dateRef, (snapshot) => {
    const val = snapshot.val() || {};
    const entries = Object.entries(val).map(([id, entry]) => ({
      id,
      ...entry,
    }));

    entries.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    onChange(entries);
  });
}

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

export async function saveEntry(uid, dateKey, entryId, patch) {
  const entryRef = ref(db, `entries/${uid}/${dateKey}/${entryId}`);
  await update(entryRef, {
    ...patch,
    updatedAt: Date.now(),
  });
}

export async function deleteEntry(uid, dateKey, entryId) {
  const entryRef = ref(db, `entries/${uid}/${dateKey}/${entryId}`);
  await remove(entryRef);
}
