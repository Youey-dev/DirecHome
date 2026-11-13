import React, { useState } from 'react';
import { X } from 'lucide-react';
import { closePromoBar, promoBarClosed, rememberPromo, type HomepagePromo } from '../lib/promo';

/** One thin line above the menu on the homepage: "Selling your home? Your first 3 months are on us." */
export const PromoBar: React.FC<{ promo: HomepagePromo | null; onStart: () => void }> = ({ promo, onStart }) => {
  const [closedCode, setClosedCode] = useState<string | null>(null);
  if (!promo || closedCode === promo.code || promoBarClosed(promo.code)) return null;
  const { code, months } = promo;
  return (
    <div className="bg-mist text-slate-900 text-[13px] border-b border-hairline">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-1 flex items-center gap-2">
        <p className="flex-1 text-center leading-snug py-1">
          <span className="hidden sm:inline">Selling your home? </span>
          <span className="font-medium">{months === 1 ? 'Your first month is on us.' : `Your first ${months} months are on us.`}</span>{' '}
          <button
            onClick={() => {
              rememberPromo(code);
              onStart();
            }}
            className="text-emerald-700 hover:text-slate-900 underline underline-offset-2 font-semibold cursor-pointer whitespace-nowrap ml-1"
          >
            List it free
          </button>
        </p>
        <button
          onClick={() => {
            closePromoBar(code);
            setClosedCode(code);
          }}
          aria-label="Close this offer"
          className="w-10 h-10 -my-2 -mr-2 flex items-center justify-center rounded-full text-slate-600 hover:text-slate-900 cursor-pointer"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};
