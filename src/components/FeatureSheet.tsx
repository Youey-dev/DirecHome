import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import QRCode from 'qrcode';
import { Printer, X } from 'lucide-react';
import type { Listing } from '../types/listing';
import { formatCAD } from '../lib/commissionCalc';
import { CASHBACK_LENDER_NOTICE, CASHBACK_SELLER_OFFER_NOTICE } from '../lib/legalText';

/**
 * One-page feature sheet (US Letter) for sellers to hand out at viewings and open houses.
 * Shown as a preview over the page; "Print" uses the browser's print dialog, where sellers
 * can print or choose "Save as PDF". Nothing is uploaded or stored.
 *
 * Privacy: shows the neighbourhood and city, never the street address. Neighbourhood highlights
 * stay on the listing page (one scan away) to keep the sheet to a single page.
 */
const SITE = 'https://ownersmarket.ca';

const Fact: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, borderBottom: '1px solid #D5DED7', padding: '4px 0', fontSize: 11.5 }}>
    <span style={{ color: '#4A5950' }}>{label}</span>
    <b style={{ textAlign: 'right' }}>{value}</b>
  </div>
);

const List: React.FC<{ title: string; items: string[] }> = ({ title, items }) =>
  items.length ? (
    <div>
      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, marginBottom: 2 }}>{title}</div>
      <ul style={{ margin: 0, paddingLeft: 15, fontSize: 11, lineHeight: 1.4 }}>
        {items.slice(0, 4).map((it) => (
          <li key={it}>{it}</li>
        ))}
      </ul>
    </div>
  ) : null;

export const FeatureSheet: React.FC<{ listing: Listing; onClose: () => void }> = ({ listing, onClose }) => {
  const [qrSvg, setQrSvg] = useState('');
  const url = `${SITE}/listing/${listing.id}?src=feature-sheet`;

  useEffect(() => {
    QRCode.toString(url, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#16261D', light: '#FFFFFF' } }).then(setQrSvg);
  }, [url]);

  // While the preview is open, printing shows only the sheet
  useEffect(() => {
    document.body.classList.add('om-printing');
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.classList.remove('om-printing');
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const photos = [...listing.photos].sort((a, b) => Number(b.isCover) - Number(a.isCover));
  const cover = photos[0];
  const more = photos.slice(1, 4);
  const place = [listing.neighborhood, listing.city, listing.province].filter(Boolean).join(', ');
  const lot = listing.lotAcres ? `${listing.lotAcres} acres` : listing.lotSqft ? `${listing.lotSqft.toLocaleString()} sq ft` : '';

  const facts: [string, string][] = [
    ['Bedrooms', String(listing.bedrooms)],
    ['Bathrooms', String(listing.bathrooms)],
    ['Floor area', listing.sqft ? `${listing.sqft.toLocaleString()} sq ft` : ''],
    ['Year built', listing.yearBuilt ? String(listing.yearBuilt) : ''],
    ['Home type', listing.propertyType],
    ['Lot', lot],
    ['Parking', listing.parkingSpaces ? `${listing.parkingSpaces} ${listing.parkingSpaces === 1 ? 'space' : 'spaces'}` : ''],
    ['Property taxes', listing.propertyTaxesAnnual ? `${formatCAD(listing.propertyTaxesAnnual)} / yr` : ''],
    ['Strata fee', listing.strataFee ? `${formatCAD(listing.strataFee)} / mo` : ''],
  ].filter(([, v]) => v) as [string, string][];

  const cashback =
    listing.offersCashback && listing.cashbackAmount > 0
      ? listing.cashbackType === 'percentage'
        ? `${listing.cashbackAmount}% of the price`
        : formatCAD(listing.cashbackAmount)
      : '';

  return createPortal(
    <div
      className="om-print-sheet fixed inset-0 z-[100] overflow-auto bg-slate-900/70 py-6 px-3"
      role="dialog"
      aria-modal="true"
      aria-label="Feature sheet preview"
    >
      <div className="om-print-toolbar mx-auto mb-4 flex max-w-[816px] flex-wrap items-center justify-between gap-3 rounded-xl bg-white px-4 py-3">
        <div className="text-sm text-slate-700">
          <b className="text-slate-900">Your feature sheet.</b> Print copies for viewings, or choose “Save as PDF” in the print window.
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="flex min-h-[44px] items-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            <Printer className="h-4 w-4" aria-hidden="true" />
            Print or save as PDF
          </button>
          <button
            onClick={onClose}
            className="flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            Close
          </button>
        </div>
      </div>

      {/* The page: US Letter with 0.4 in margins = 7.7 × 10.2 in printable */}
      <div className="mx-auto overflow-x-auto">
        <article
          className="om-sheet-page mx-auto bg-white shadow-xl"
          style={{
            width: '7.7in',
            height: '10.2in',
            boxSizing: 'border-box',
            padding: '0.15in',
            color: '#16261D',
            fontFamily: "'Public Sans', system-ui, sans-serif",
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            overflow: 'hidden',
          }}
        >
          {/* Brand */}
          <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <img src="/logo.png" alt="" width={34} height={34} />
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 24, color: '#0F5A40' }}>OwnersMarket</span>
            </div>
            <span style={{ background: '#F2C14E', fontWeight: 700, fontSize: 12, padding: '5px 12px', borderRadius: 999 }}>For sale by owner</span>
          </header>

          {/* Headline and price */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ minWidth: 0 }}>
              <h1 style={{ margin: 0, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 30, lineHeight: 1.02, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {listing.headline}
              </h1>
              <div style={{ fontSize: 13, color: '#4A5950', marginTop: 3 }}>{place}</div>
            </div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 40, lineHeight: 1, whiteSpace: 'nowrap', color: '#0F5A40' }}>
              {formatCAD(listing.price)}
            </div>
          </div>

          {/* Photos */}
          {cover && (
            <img
              src={cover.url}
              alt="Front photo of the home"
              referrerPolicy="no-referrer"
              style={{ width: '100%', height: '2.85in', objectFit: 'cover', borderRadius: 6, display: 'block', flex: 'none' }}
            />
          )}
          {more.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${more.length}, minmax(0, 1fr))`, gap: 8 }}>
              {more.map((p) => (
                <img key={p.id} src={p.url} alt="" referrerPolicy="no-referrer" style={{ width: '100%', height: '0.9in', objectFit: 'cover', borderRadius: 4, display: 'block' }} />
              ))}
            </div>
          )}

          {/* Description and lists on the left, key facts on the right */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 2.4in', gap: 20, flex: 1, minHeight: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0, overflow: 'hidden' }}>
              <p
                style={{
                  margin: 0,
                  fontSize: 11.5,
                  lineHeight: 1.5,
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: cashback ? 8 : 11,
                  WebkitBoxOrient: 'vertical',
                  whiteSpace: 'pre-line',
                }}
              >
                {listing.description}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}>
                <List title="Recent upgrades" items={listing.recentUpgrades ?? []} />
                <List title="Included" items={listing.inclusions ?? []} />
              </div>
            </div>
            <div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, marginBottom: 2 }}>Key facts</div>
              {facts.map(([label, value]) => (
                <Fact key={label} label={label} value={value} />
              ))}
            </div>
          </div>

          {cashback && (
            <div style={{ background: '#EEF4EF', borderRadius: 6, padding: '6px 10px', fontSize: 9, lineHeight: 1.4, flex: 'none' }}>
              <b style={{ fontSize: 11 }}>The seller offers {cashback} cash back to the buyer at closing.</b> {CASHBACK_SELLER_OFFER_NOTICE} {CASHBACK_LENDER_NOTICE}
            </div>
          )}

          {/* Footer: QR and disclaimer */}
          <footer style={{ display: 'flex', alignItems: 'center', gap: 14, borderTop: '1px solid #D5DED7', paddingTop: 10, flex: 'none' }}>
            <div style={{ width: '1.05in', height: '1.05in', flex: 'none' }} dangerouslySetInnerHTML={{ __html: qrSvg }} aria-label="QR code to this listing" role="img" />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 20, lineHeight: 1.05 }}>
                Scan to see every photo and book a viewing
              </div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, color: '#0F5A40' }}>ownersmarket.ca</div>
              <div style={{ fontSize: 8.5, lineHeight: 1.4, color: '#4A5950' }}>
                Information provided by the seller and not verified by OwnersMarket. OwnersMarket is an advertising service, not a real estate brokerage. Buyers should confirm details with their own lawyer or notary and a home inspector.
              </div>
            </div>
          </footer>
        </article>
      </div>
    </div>,
    document.body,
  );
};

export default FeatureSheet;
