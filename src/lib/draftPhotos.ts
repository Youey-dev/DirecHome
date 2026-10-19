/**
 * Keeps the photos of an unfinished listing on this device (the browser's IndexedDB), so a
 * draft survives a page reload, and a visitor can create their account at the end without
 * losing their photos. Nothing here is sent anywhere. Every call is best-effort: if the browser
 * blocks storage (private mode, full disk), drafts simply keep their text only.
 */
import type { PhotoItem } from '../types/listing';

const DB_NAME = 'ownersmarket-drafts';
const STORE = 'photos';

function open(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null);
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<any> | void): Promise<T | undefined> {
  const db = await open();
  if (!db) return undefined;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      tx.oncomplete = () => {
        db.close();
        resolve(req ? (req.result as T) : undefined);
      };
      tx.onerror = tx.onabort = () => {
        db.close();
        resolve(undefined);
      };
    } catch {
      db.close();
      resolve(undefined);
    }
  });
}

export async function loadDraftPhotos(key: string): Promise<PhotoItem[]> {
  const v = await run<PhotoItem[]>('readonly', (s) => s.get(key));
  return Array.isArray(v) ? v : [];
}

export async function saveDraftPhotos(key: string, photos: PhotoItem[]): Promise<void> {
  await run('readwrite', (s) => (photos.length ? s.put(photos, key) : s.delete(key)));
}

export async function deleteDraftPhotos(key: string): Promise<void> {
  await run('readwrite', (s) => s.delete(key));
}

/** Moves photos saved while signed out to the account that just signed in (if it has none). */
export async function moveDraftPhotos(fromKey: string, toKey: string): Promise<void> {
  const from = await loadDraftPhotos(fromKey);
  if (!from.length) return;
  const existing = await loadDraftPhotos(toKey);
  if (!existing.length) await saveDraftPhotos(toKey, from);
  await deleteDraftPhotos(fromKey);
}
