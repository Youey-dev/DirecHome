/**
 * A message a visitor wrote to an owner before having an account. It waits on this device
 * (for up to a day) and is sent once they sign up or sign in.
 */
const KEY = 'om-pending-message';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export interface PendingMessage {
  listingId: string;
  text: string;
  savedAt: number;
}

export function savePendingMessage(listingId: string, text: string) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ listingId, text: text.slice(0, 2000), savedAt: Date.now() }));
  } catch {
    /* storage blocked: the visitor will need to type it again */
  }
}

export function readPendingMessage(): PendingMessage | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as PendingMessage;
    if (!p?.listingId || !p.text || Date.now() - p.savedAt > MAX_AGE_MS) {
      localStorage.removeItem(KEY);
      return null;
    }
    return p;
  } catch {
    return null;
  }
}

export function clearPendingMessage() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
