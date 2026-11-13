import React, { useEffect, useState } from 'react';
import { db, type RecentlySold as Sold } from '../lib/db';
import { formatCAD } from '../lib/commissionCalc';

const TYPE_LABEL: Record<string, string> = {
  'Single Family Detached': 'house',
  Townhouse: 'townhouse',
  'Condo / Apartment': 'condo',
  'Duplex / Half-Duplex': 'duplex',
  'Acreage / Farm': 'acreage',
};

const soldMonth = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { month: 'short', year: 'numeric' });

/** A small "Sold" label in the sign yellow. */
const SoldRider = () => (
  <div className="absolute top-3 left-3 bg-sign text-slate-900 font-semibold text-[14px] leading-none px-3 py-1.5 rounded-full">
    Sold
  </div>
);

const SoldCard: React.FC<{ home: Sold }> = ({ home }) => {
  const place = [home.neighborhood, home.city, home.province].filter(Boolean).join(', ');
  const type = TYPE_LABEL[home.propertyType] ?? home.propertyType.toLowerCase();
  return (
    <article className="flex flex-col gap-3.5 text-slate-900">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[14px] bg-fern">
        {home.photoUrl && (
          <img
            src={home.photoUrl}
            alt={`${home.headline}, ${home.city}`}
            referrerPolicy="no-referrer"
            loading="lazy"
            className="w-full h-full object-cover saturate-[.85]"
          />
        )}
        <SoldRider />
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-[24px] font-semibold tracking-[-0.02em] leading-tight">Sold</span>
        <span className="text-[15px] text-slate-600 pt-1">Listed at {formatCAD(home.price)}</span>
        <span className="text-[15px] font-medium pt-1">
          {home.bedrooms} bed, {home.bathrooms} bath {type}
          {home.sqft ? `, ${home.sqft.toLocaleString('en-CA')} sq ft` : ''}
        </span>
        <span className="text-[15px] text-slate-600 truncate">{place}</span>
        <span className="text-[14px] font-medium text-emerald-700 pt-1">Sold by the owner · {soldMonth(home.soldAt)}</span>
      </div>
    </article>
  );
};

/**
 * "Recently sold by owners": up to three real homes their owners marked sold in the last
 * 90 days (and chose to show). Hidden when there are none. Never shows a sale price.
 */
export const RecentlySold: React.FC = () => {
  const [homes, setHomes] = useState<Sold[]>([]);
  useEffect(() => {
    let alive = true;
    void db.loadRecentlySold().then((h) => alive && setHomes(h.slice(0, 3)));
    return () => {
      alive = false;
    };
  }, []);
  if (homes.length === 0) return null;
  return (
    <section className="mt-16 border-t border-hairline pt-12" aria-labelledby="recently-sold">
      <h2 id="recently-sold" className="text-[28px] sm:text-[34px] font-semibold tracking-[-0.03em] leading-[1.1] text-slate-900">
        Recently sold by owners
      </h2>
      <p className="mt-2 mb-6 text-base text-slate-600 max-w-[60ch]">Homes their owners sold themselves, listed on OwnersMarket.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-7 gap-y-10">
        {homes.map((h) => (
          <SoldCard key={h.id} home={h} />
        ))}
      </div>
    </section>
  );
};

export default RecentlySold;
