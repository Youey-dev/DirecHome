import React, { useEffect, useState } from 'react';
import { ChevronDown, ListChecks } from 'lucide-react';
import { SELLER_STEPS, loadChecklist, saveChecklist } from '../lib/sellerChecklist';

/** The seller's step-by-step checklist for one listing, folded away until opened. */
export const SellerChecklist: React.FC<{
  listingId: string;
  userId: string;
  onNavigate: (tab: string) => void;
}> = ({ listingId, userId, onNavigate }) => {
  const [done, setDone] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    loadChecklist(listingId).then((d) => alive && setDone(d));
    return () => {
      alive = false;
    };
  }, [listingId]);

  const toggle = (key: string) => {
    const next = done.includes(key) ? done.filter((k) => k !== key) : [...done, key];
    setDone(next);
    void saveChecklist(listingId, userId, next);
  };

  const count = SELLER_STEPS.filter((s) => done.includes(s.key)).length;
  const pct = Math.round((count / SELLER_STEPS.length) * 100);

  return (
    <div className="px-5 py-3 border-t border-slate-100 bg-white text-xs">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 min-h-[44px] cursor-pointer text-left"
      >
        <ListChecks className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
        <span className="text-sm font-bold text-slate-900">Selling checklist</span>
        <span className="text-slate-500 tabular-nums">
          {count} of {SELLER_STEPS.length} done
        </span>
        <span className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden" aria-hidden="true">
          <span className="block h-full bg-emerald-600 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {open && (
        <ul className="mt-1 pb-1 space-y-0.5">
          {SELLER_STEPS.map((step) => (
            <li key={step.key} className="flex items-center gap-3">
              <label className="flex-1 flex items-start gap-3 cursor-pointer py-1.5 min-h-[40px]">
                <input
                  type="checkbox"
                  checked={done.includes(step.key)}
                  onChange={() => toggle(step.key)}
                  className="mt-0.5 w-[18px] h-[18px] accent-emerald-700 shrink-0"
                />
                <span className={`leading-relaxed text-[13px] ${done.includes(step.key) ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                  {step.label}
                </span>
              </label>
              {step.help && (
                <button
                  type="button"
                  onClick={() => onNavigate(step.help!.tab)}
                  className="shrink-0 font-semibold text-emerald-800 underline underline-offset-2 hover:text-slate-900 cursor-pointer min-h-[36px]"
                >
                  {step.help.label}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
