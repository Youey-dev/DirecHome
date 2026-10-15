/**
 * Builds the artwork for the printable for-sale signs: public/signs/lawn.pdf and window.pdf.
 * Everything except the QR code is drawn here, once, with the brand fonts. In the seller's
 * browser, src/lib/signPdf.ts only adds the listing's QR code into the empty box, so the
 * browser never has to load fonts or the large font library.
 *
 * Run after changing the design:  npm run signs   (then commit the two PDFs)
 *
 *  - Lawn sign: 24 × 18 in, landscape. Print on coroplast (corrugated plastic) with a wire stake.
 *  - Window sign: US Letter, portrait. Print at home on plain paper.
 *
 * Fonts: Barlow Condensed Bold and Public Sans Bold (SIL Open Font License, see scripts/fonts).
 */
import { PDFDocument, PDFFont, PDFPage, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { writeFileSync, readFileSync } from 'node:fs';

const GREEN = rgb(15 / 255, 90 / 255, 64 / 255);
const INK = rgb(22 / 255, 38 / 255, 29 / 255);
const SIGN_YELLOW = rgb(242 / 255, 193 / 255, 78 / 255);
const WHITE = rgb(1, 1, 1);

const IN = 72; // PDF points per inch

const PUBLIC = new URL('../public/', import.meta.url);
const load = async (path: string) => readFileSync(new URL(path.replace(/^\//, ''), PUBLIC));

interface Kit {
  doc: PDFDocument;
  display: PDFFont;
  bold: PDFFont;
  logo: Awaited<ReturnType<PDFDocument['embedPng']>>;
}

async function start(): Promise<Kit> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const [displayBytes, boldBytes, logoBytes] = await Promise.all([
    readFileSync(new URL('fonts/BarlowCondensed-Bold.ttf', import.meta.url)),
    readFileSync(new URL('fonts/PublicSans-Bold.ttf', import.meta.url)),
    load('/logo.png'),
  ]);
  const [display, bold, logo] = await Promise.all([
    doc.embedFont(displayBytes, { subset: true }),
    doc.embedFont(boldBytes, { subset: true }),
    doc.embedPng(logoBytes),
  ]);
  doc.setTitle('OwnersMarket for-sale sign');
  doc.setAuthor('OwnersMarket');
  doc.setCreator('ownersmarket.ca');
  return { doc, display, bold, logo };
}

/** Largest font size (up to max) at which every line fits the width. */
function fitSize(font: PDFFont, lines: string[], maxWidth: number, max: number): number {
  const widest = Math.max(...lines.map((l) => font.widthOfTextAtSize(l, max)));
  return widest <= maxWidth ? max : (max * maxWidth) / widest;
}

/**
 * Draws the white, bordered box the QR code goes in, and records where the code itself goes
 * (in PDF points from the bottom-left), so the browser can fill it in.
 * (x, top) is the box's top-left corner, measured from the top of the page.
 */
function drawQrBox(doc: PDFDocument, page: PDFPage, x: number, top: number, box: number, border: number, pad: number) {
  const { height } = page.getSize();
  const y = height - top - box;
  page.drawRectangle({ x, y, width: box, height: box, color: WHITE, borderColor: INK, borderWidth: border });
  const inner = box - 2 * (border + pad);
  doc.setSubject(JSON.stringify({ qr: { x: x + border + pad, y: y + border + pad, size: inner } }));
}

/** Text drawn from the top of the page, so layouts read top-down. */
function text(page: PDFPage, s: string, font: PDFFont, size: number, x: number, baselineFromTop: number, color = INK) {
  page.drawText(s, { x, y: page.getSize().height - baselineFromTop, size, font, color });
}

function centred(page: PDFPage, s: string, font: PDFFont, size: number, centreX: number, baselineFromTop: number, color = INK) {
  text(page, s, font, size, centreX - font.widthOfTextAtSize(s, size) / 2, baselineFromTop, color);
}

// ---------------------------------------------------------------------------
// Lawn sign: 24 × 18 in
// ---------------------------------------------------------------------------
async function lawnSign(): Promise<Uint8Array> {
  const { doc, display, bold, logo } = await start();
  const W = 24 * IN;
  const H = 18 * IN;
  const page = doc.addPage([W, H]);

  const frame = 0.5 * IN; // green border
  const band = 3.1 * IN; // yellow band at the bottom
  const padX = 0.85 * IN;

  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: GREEN });
  page.drawRectangle({ x: frame, y: frame, width: W - 2 * frame, height: H - 2 * frame, color: WHITE });
  page.drawRectangle({ x: frame, y: frame, width: W - 2 * frame, height: band, color: SIGN_YELLOW });

  // Brand
  const logoSize = 1.55 * IN;
  const brandTop = frame + 0.65 * IN;
  page.drawImage(logo, { x: frame + padX, y: H - brandTop - logoSize, width: logoSize, height: logoSize });
  text(page, 'OwnersMarket', display, 1.25 * IN, frame + padX + logoSize + 0.3 * IN, brandTop + logoSize * 0.74, GREEN);

  // QR code with its caption on the right, centred in the space between the brand and the band
  const regionTop = brandTop + logoSize + 0.2 * IN;
  const regionBottom = H - frame - band - 0.2 * IN;
  const qrBox = 6.4 * IN;
  const capSize = 0.46 * IN;
  const blockH = qrBox + 0.62 * IN + capSize * 1.2 + 0.1 * IN;
  const qrTop = regionTop + (regionBottom - regionTop - blockH) / 2;
  const qrX = W - frame - padX - qrBox;
  drawQrBox(doc, page, qrX, qrTop, qrBox, 0.06 * IN, 0.3 * IN);
  centred(page, 'Scan for photos, price', bold, capSize, qrX + qrBox / 2, qrTop + qrBox + 0.62 * IN);
  centred(page, 'and to book a viewing', bold, capSize, qrX + qrBox / 2, qrTop + qrBox + 0.62 * IN + capSize * 1.2);

  // FOR SALE / BY OWNER, as large as fits beside the code, centred on the same middle
  const lines = ['FOR SALE', 'BY OWNER'];
  const textX = frame + padX;
  const room = qrX - textX - 0.8 * IN;
  const size = fitSize(display, lines, room, 3.8 * IN);
  const lead = size * 0.9;
  const capH = size * 0.7;
  const mid = qrTop + blockH / 2;
  const first = mid + (capH - lead) / 2;
  text(page, lines[0], display, size, textX, first);
  text(page, lines[1], display, size, textX, first + lead);

  // Yellow band: web address and how viewings work
  const bandMidFromTop = H - frame - band / 2;
  const urlSize = fitSize(display, ['ownersmarket.ca'], 11.5 * IN, 1.75 * IN);
  text(page, 'ownersmarket.ca', display, urlSize, frame + padX, bandMidFromTop + urlSize * 0.36);
  const rightSize = fitSize(display, ['Viewings by appointment'], 8.6 * IN, 1.05 * IN);
  const right = 'Viewings by appointment';
  text(page, right, display, rightSize, W - frame - padX - display.widthOfTextAtSize(right, rightSize), bandMidFromTop + rightSize * 0.36);

  return doc.save();
}

// ---------------------------------------------------------------------------
// Window sign: US Letter, portrait
// ---------------------------------------------------------------------------
async function windowSign(): Promise<Uint8Array> {
  const { doc, display, bold, logo } = await start();
  const W = 8.5 * IN;
  const H = 11 * IN;
  const page = doc.addPage([W, H]);
  const mid = W / 2;

  const frame = 0.25 * IN;
  const band = 1.25 * IN;

  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: GREEN });
  page.drawRectangle({ x: frame, y: frame, width: W - 2 * frame, height: H - 2 * frame, color: WHITE });
  page.drawRectangle({ x: frame, y: frame, width: W - 2 * frame, height: band, color: SIGN_YELLOW });

  // Brand, centred
  const logoSize = 0.62 * IN;
  const brandSize = 0.48 * IN;
  const brandWidth = logoSize + 0.12 * IN + display.widthOfTextAtSize('OwnersMarket', brandSize);
  const brandX = mid - brandWidth / 2;
  const brandTop = frame + 0.45 * IN;
  page.drawImage(logo, { x: brandX, y: H - brandTop - logoSize, width: logoSize, height: logoSize });
  text(page, 'OwnersMarket', display, brandSize, brandX + logoSize + 0.12 * IN, brandTop + logoSize * 0.72, GREEN);

  // FOR SALE / BY OWNER
  const lines = ['FOR SALE', 'BY OWNER'];
  const size = fitSize(display, lines, W - 2 * frame - 0.9 * IN, 1.6 * IN);
  const firstBaseline = brandTop + logoSize + 0.35 * IN + size * 0.78;
  centred(page, lines[0], display, size, mid, firstBaseline);
  centred(page, lines[1], display, size, mid, firstBaseline + size * 0.88);

  // QR code and caption
  const qrBox = 3.1 * IN;
  const qrTop = firstBaseline + size * 0.88 + 0.4 * IN;
  drawQrBox(doc, page, mid - qrBox / 2, qrTop, qrBox, 0.04 * IN, 0.17 * IN);
  centred(page, 'Scan for photos, price and to book a viewing', bold, 0.21 * IN, mid, qrTop + qrBox + 0.38 * IN);

  // Yellow band
  const bandTop = H - frame - band;
  centred(page, 'ownersmarket.ca', display, 0.62 * IN, mid, bandTop + 0.68 * IN);
  centred(page, 'Viewings by appointment', bold, 0.2 * IN, mid, bandTop + 1.0 * IN);

  return doc.save();
}

for (const [kind, make] of [
  ['lawn', lawnSign],
  ['window', windowSign],
] as const) {
  const bytes = await make();
  writeFileSync(new URL(`signs/${kind}.pdf`, PUBLIC), bytes);
  console.log(`public/signs/${kind}.pdf`, bytes.length, 'bytes');
}
