import React, { useCallback, useEffect, useState } from 'react';
import { Bell, Loader2, Search } from 'lucide-react';
import { db } from '../lib/db';
import type { ListingAlert } from '../lib/alerts';
import type { BrowseFilters } from '../pages/BrowsePage';

const shortDate = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });

/** Dashboard → Alerts: the person's new-listing alerts, each with "See homes" and "Stop". */
export const AlertsPanel: React.FC<{
  onBrowse: (filters: BrowseFilters) => void;
  onToast: (msg: string) => void;
}> = ({ onBrowse, onToast }) => {
  const [alerts, setAlerts] = useState<ListingAlert[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setAlerts(await db.loadAlerts());
    } catch {
      setAlerts([]);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const stop = async (a: ListingAlert) => {
    setBusy(a.id);
    try {
      await db.deleteAlert(a.id);
      onToast('Alert stopped. You won’t get emails for it any more.');
      await load();
    } catch (e: any) {
      onToast(`⚠️ ${e?.message || 'Could not stop the alert.'}`);
    } finally {
      setBusy(null);
    }
  };

  if (alerts === null) {
    return <div className="p-8 text-center text-slate-500 text-sm">Loading your alerts…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="font-bold text-slate-900">Home alerts</h2>
            <p className="text-sm text-slate-600">We email you new homes that match, once a day at most.</p>
          </div>
          <button
            onClick={() => onBrowse({})}
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer min-h-[44px]"
          >
            <Search className="w-4 h-4" /> New alert from a search
          </button>
        </div>
        {alerts.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <Bell className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="font-semibold text-slate-800">No alerts yet</p>
            <p className="text-sm text-slate-600">
              Search for homes, then tap “Email me” to hear about new ones as soon as they’re listed.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {alerts.map((a) => (
              <li key={a.id} className="px-5 py-4 flex items-center gap-4 flex-wrap">
                <div className="flex-1 min-w-[14rem]">
                  <div className="font-semibold text-slate-900">{a.label}</div>
                  <div className="text-xs text-slate-500">
                    Since {shortDate(a.createdAt)} · {a.lastSentAt ? `last email ${shortDate(a.lastSentAt)}` : 'nothing new yet'}
                  </div>
                </div>
                <button
                  onClick={() =>
                    onBrowse({
                      query: a.query ?? undefined,
                      province: a.province ?? undefined,
                      propertyType: a.propertyType ?? undefined,
                      minPrice: a.minPrice ?? undefined,
                      maxPrice: a.maxPrice ?? undefined,
                      minBeds: a.minBeds ?? undefined,
                      minBaths: a.minBaths ?? undefined,
                    })
                  }
                  className="px-3 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold cursor-pointer min-h-[44px]"
                >
                  See homes
                </button>
                <button
                  onClick={() => void stop(a)}
                  disabled={busy === a.id}
                  className="px-2 py-2 text-sm font-medium text-rose-700 underline cursor-pointer min-h-[44px] flex items-center gap-1 disabled:opacity-60"
                >
                  {busy === a.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Stop
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
