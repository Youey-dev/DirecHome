import React, { useState } from 'react';
import { X } from 'lucide-react';
import { closePromoBar, promoBarClosed, rememberPromo, type HomepagePromo } from '../lib/promo';

/** One thin line above the menu on the homepage: "Selling your home? Your first 3 months are on us." */
export const PromoBar: React.FC<{ promo: HomepagePromo | null; onStart: () => void }> = ({ promo, onStart }) => {
  const [closedCode, setClosedCode] = useState<string | null>(null);
  if (!promo || closedCode === promo.code || promoBarClosed(promo.code)) return null;
  const { code, months } = promo;
  return (
    <div className="bg-emerald-800 text-white text-sm">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 py-2 flex items-center gap-3">
        <p className="flex-1 text-center leading-snug">
          <span className="hidden sm:inline">Selling your home? </span>
          <strong>{months === 1 ? 'Your first month is on us.' : `Your first ${months} months are on us.`}</strong>{' '}
          <button
            onClick={() => {
              rememberPromo(code);
              onStart();
            }}
            className="underline underline-offset-2 font-semibold cursor-pointer whitespace-nowrap ml-1"
          >
            List it free →
          </button>
        </p>
        <button
          onClick={() => {
            closePromoBar(code);
            setClosedCode(code);
          }}
          aria-label="Close"
          className="p-1 -mr-1 text-white/70 hover:text-white cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
