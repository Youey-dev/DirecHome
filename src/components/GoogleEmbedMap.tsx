import React from 'react';
import { Listing } from '../types/listing';

// Google Maps Embed API: free, no usage limit, but it needs a key.
// Create it in Google Cloud, enable only "Maps Embed API", and restrict it to ownersmarket.ca.
// While this is empty, listing pages keep using the OpenStreetMap map.
export const GOOGLE_EMBED_KEY = String(import.meta.env.VITE_GOOGLE_MAPS_EMBED_KEY ?? '').trim();

interface GoogleEmbedMapProps {
  listing: Listing;
  approximate: boolean; // true until the owner shares the exact address
  heightClass?: string;
}

export const GoogleEmbedMap: React.FC<GoogleEmbedMapProps> = ({ listing, approximate, heightClass = 'h-[340px]' }) => {
  const at = `${listing.lat},${listing.lng}`;
  const params = new URLSearchParams({ key: GOOGLE_EMBED_KEY });
  let src: string;
  if (approximate) {
    // "view" mode draws no pin, so the map shows the neighbourhood, not a house.
    params.set('center', at);
    params.set('zoom', '14');
    src = `https://www.google.com/maps/embed/v1/view?${params.toString()}`;
  } else {
    params.set('q', at);
    params.set('zoom', '16');
    src = `https://www.google.com/maps/embed/v1/place?${params.toString()}`;
  }

  return (
    <div className={`relative w-full rounded-2xl overflow-hidden border border-hairline bg-slate-100 ${heightClass}`}>
      <iframe
        title={approximate ? `Map of the area around this home in ${listing.city}` : `Map showing this home in ${listing.city}`}
        src={src}
        className="w-full h-full border-0"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
      <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:max-w-[420px] bg-white/95 px-3.5 py-2.5 rounded-xl border border-hairline text-[13px] leading-snug text-slate-700">
        {approximate ? (
          <>The map is centred on the neighbourhood. The owner shares the exact address once a viewing is confirmed.</>
        ) : listing.showAddress ? (
          <>Exact location, shown by the owner.</>
        ) : (
          <>Exact location, shared with you by the owner.</>
        )}
      </div>
    </div>
  );
};
