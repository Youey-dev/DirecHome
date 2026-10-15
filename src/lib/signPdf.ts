/**
 * Printable for-sale signs, made in the seller's browser.
 *
 * Nothing is uploaded or stored. The sign artwork is a ready-made PDF (public/signs, built by
 * scripts/make-sign-templates.mts); when the seller clicks download, this adds a QR code that
 * opens their own listing and saves the PDF to their device. This file and the libraries it
 * uses load only when someone asks for a sign.
 *
 *  - Lawn sign: 24 × 18 in, landscape. Print on coroplast (corrugated plastic) with a wire stake.
 *  - Window sign: US Letter, portrait. Print at home on plain paper.
 */
import { PDFDocument, rgb } from 'pdf-lib';
import QRCode from 'qrcode';

export type SignKind = 'lawn' | 'window';

const SITE = 'https://ownersmarket.ca';
const INK = rgb(22 / 255, 38 / 255, 29 / 255);

/** The address the QR code opens. The src tag shows which sign brought each visit. */
export const signUrl = (listingId: string, kind: SignKind) =>
  `${SITE}/listing/${listingId}?src=${kind === 'lawn' ? 'lawn-sign' : 'window-sign'}`;

export async function makeSignPdf(listingId: string, kind: SignKind, template?: ArrayBuffer | Uint8Array): Promise<Uint8Array> {
  const bytes = template ?? (await (await fetch(`/signs/${kind}.pdf`)).arrayBuffer());
  const doc = await PDFDocument.load(bytes);
  const page = doc.getPage(0);

  // Where the code goes, recorded in the artwork when it was built
  const { qr: area } = JSON.parse(doc.getSubject() ?? '{}') as { qr: { x: number; y: number; size: number } };
  if (!area) throw new Error('Sign artwork is missing its QR position');

  const qr = QRCode.create(signUrl(listingId, kind), { errorCorrectionLevel: 'M' });
  const n = qr.modules.size;
  const cell = area.size / n;
  const top = area.y + area.size;
  for (let r = 0; r < n; r++) {
    let c = 0;
    while (c < n) {
      if (!qr.modules.get(r, c)) {
        c++;
        continue;
      }
      let run = 1;
      while (c + run < n && qr.modules.get(r, c + run)) run++;
      // A hair of overlap so neighbouring squares never show a seam when printed.
      page.drawRectangle({ x: area.x + c * cell, y: top - (r + 1) * cell, width: run * cell + 0.2, height: cell + 0.2, color: INK });
      c += run;
    }
  }

  doc.setSubject(kind === 'lawn' ? 'For-sale lawn sign, 24 × 18 in' : 'For-sale window sign, Letter');
  return doc.save();
}

/** Builds the sign and saves it to the seller's device. */
export async function downloadSign(listingId: string, kind: SignKind): Promise<void> {
  const bytes = await makeSignPdf(listingId, kind);
  const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = kind === 'lawn' ? 'ownersmarket-lawn-sign-24x18.pdf' : 'ownersmarket-window-sign-letter.pdf';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
