import { readFileSync } from 'node:fs';
import { PDFDocument } from 'pdf-lib';
import { makeSignPdf, signUrl } from '../src/lib/signPdf';

export async function runSignTests() {
  console.log('🧪 Testing printable for-sale signs...');
  const id = '3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90';

  if (signUrl(id, 'lawn') !== `https://ownersmarket.ca/listing/${id}?src=lawn-sign`) {
    throw new Error(`Unexpected lawn sign address: ${signUrl(id, 'lawn')}`);
  }

  const sizes = { lawn: [1728, 1296], window: [612, 792] } as const; // 24 × 18 in and Letter, in points
  for (const kind of ['lawn', 'window'] as const) {
    const template = readFileSync(new URL(`../public/signs/${kind}.pdf`, import.meta.url));
    const base = await PDFDocument.load(template);
    if (!JSON.parse(base.getSubject() ?? '{}').qr) throw new Error(`${kind} artwork has no QR position`);

    const bytes = await makeSignPdf(id, kind, template);
    const doc = await PDFDocument.load(bytes);
    const { width, height } = doc.getPage(0).getSize();
    if (doc.getPageCount() !== 1 || Math.round(width) !== sizes[kind][0] || Math.round(height) !== sizes[kind][1]) {
      throw new Error(`${kind} sign has the wrong size: ${width} × ${height}`);
    }
    if (bytes.length <= template.length) throw new Error(`${kind} sign is missing its QR code`);
  }
  console.log('  ✅ Lawn (24 × 18 in) and window (Letter) signs build with a QR code to the listing\n');
}
