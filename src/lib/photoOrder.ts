/**
 * Photo order in the listing form. The first photo is the cover (the one shown in search and at
 * the top of the listing), so "make cover" simply moves a photo to the front.
 */
import type { PhotoItem } from '../types/listing';

/** Marks the first photo as the cover and no other. */
export const coverFirst = (photos: PhotoItem[]): PhotoItem[] => photos.map((p, i) => ({ ...p, isCover: i === 0 }));

/** Moves the photo at `from` to position `to` (both counted from 0). Out-of-range moves change nothing. */
export function movePhoto(photos: PhotoItem[], from: number, to: number): PhotoItem[] {
  if (from === to || from < 0 || to < 0 || from >= photos.length || to >= photos.length) return photos;
  const next = photos.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return coverFirst(next);
}

/** Puts the cover photo first (listings saved before the order could be changed may have it elsewhere). */
export function withCoverFirst(photos: PhotoItem[]): PhotoItem[] {
  const i = photos.findIndex((p) => p.isCover);
  return coverFirst(i > 0 ? movePhoto(photos, i, 0) : photos);
}
