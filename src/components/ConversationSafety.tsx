import React, { useState } from 'react';
import { Ban, Flag, Loader2, X } from 'lucide-react';
import { db, USER_REPORT_REASONS, type UserReportReason } from '../lib/db';

/**
 * "Report" and "Block" for the other person in a conversation, plus the notices that go with them.
 * The database enforces blocks and suspensions (migration 20261044); this is the interface.
 */
export const ConversationSafetyActions: React.FC<{
  conversationId: string;
  otherUserId: string;
  otherName: string;
  /** Show a short confirmation (toast) in the page. */
  onDone?: (text: string) => void;
}> = ({ conversationId, otherUserId, otherName, onDone }) => {
  const [reporting, setReporting] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const blocked = db.isBlocked(otherUserId);

  const toggleBlock = async () => {
    setBusy(true);
    setError(null);
    try {
      if (blocked) {
        await db.unblockUser(otherUserId);
        onDone?.(`${otherName} is unblocked.`);
      } else {
        await db.blockUser(otherUserId);
        onDone?.(`${otherName} is blocked and can’t message you anymore.`);
      }
      setConfirmBlock(false);
    } catch (e: any) {
      setError(e?.message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setReporting(true)}
          className="inline-flex items-center gap-1 px-2 py-1.5 text-[11px] font-semibold text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer min-h-[36px]"
        >
          <Flag className="w-3.5 h-3.5" /> Report
        </button>
        <button
          type="button"
          onClick={() => (blocked ? void toggleBlock() : setConfirmBlock(true))}
          disabled={busy}
          className="inline-flex items-center gap-1 px-2 py-1.5 text-[11px] font-semibold text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer min-h-[36px] disabled:opacity-50"
        >
          <Ban className="w-3.5 h-3.5" /> {blocked ? 'Unblock' : 'Block'}
        </button>
      </div>

      {confirmBlock && (
        <Dialog title={`Block ${otherName}?`} onClose={() => setConfirmBlock(false)}>
          <p className="text-sm text-slate-700">
            They won’t be able to message you, make offers on your listings or request viewings. They aren’t told that you blocked
            them. You can unblock them here at any time.
          </p>
          {error && <p className="mt-3 text-xs text-rose-700">{error}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirmBlock(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 text-sm font-semibold cursor-pointer min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void toggleBlock()}
              disabled={busy}
              className="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-sm font-semibold cursor-pointer min-h-[44px] disabled:opacity-50"
            >
              {busy ? 'Blocking…' : 'Block'}
            </button>
          </div>
        </Dialog>
      )}

      {reporting && (
        <ReportPersonDialog
          conversationId={conversationId}
          otherUserId={otherUserId}
          otherName={otherName}
          onClose={() => setReporting(false)}
          onDone={(t) => {
            setReporting(false);
            onDone?.(t);
          }}
        />
      )}
    </>
  );
};

const ReportPersonDialog: React.FC<{
  conversationId: string;
  otherUserId: string;
  otherName: string;
  onClose: () => void;
  onDone: (text: string) => void;
}> = ({ conversationId, otherUserId, otherName, onClose, onDone }) => {
  const [reason, setReason] = useState<UserReportReason>('scam');
  const [details, setDetails] = useState('');
  const [alsoBlock, setAlsoBlock] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await db.reportPerson({ conversationId, userId: otherUserId, reason, details });
      if (alsoBlock && !db.isBlocked(otherUserId)) await db.blockUser(otherUserId);
      onDone(
        alsoBlock
          ? `Thanks. Our team will review ${otherName}, and they can’t message you anymore.`
          : `Thanks. Our team will review ${otherName}.`
      );
    } catch (err: any) {
      setError(err?.message || 'We couldn’t send your report. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog title={`Report ${otherName}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <fieldset>
          <legend className="text-xs font-semibold text-slate-700 mb-2">What happened?</legend>
          <div className="space-y-1.5">
            {USER_REPORT_REASONS.map((r) => (
              <label key={r.value} className="flex items-center gap-2 text-sm text-slate-800 cursor-pointer">
                <input
                  type="radio"
                  name="report-reason"
                  value={r.value}
                  checked={reason === r.value}
                  onChange={() => setReason(r.value)}
                  className="accent-emerald-700"
                />
                {r.label}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="block">
          <span className="text-xs font-semibold text-slate-700">Details (optional)</span>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="For example: asked me to download an app to join a Teams call."
            className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-800 cursor-pointer">
          <input type="checkbox" checked={alsoBlock} onChange={(e) => setAlsoBlock(e.target.checked)} className="accent-emerald-700" />
          Also block {otherName}
        </label>
        <p className="text-[11px] text-slate-500">Our team can read this conversation to review your report. {otherName} isn’t told who reported them.</p>
        {error && <p className="text-xs text-rose-700">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-300 text-sm font-semibold cursor-pointer min-h-[44px]">
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-sm font-semibold cursor-pointer min-h-[44px] disabled:opacity-50 inline-flex items-center gap-2"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />} Send report
          </button>
        </div>
      </form>
    </Dialog>
  );
};

const Dialog: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60" role="dialog" aria-modal="true" aria-label={title}>
    <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl">
      <div className="flex items-start justify-between gap-3 mb-3">
        <h2 className="text-base font-bold text-slate-900">{title}</h2>
        <button type="button" onClick={onClose} aria-label="Close" className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
          <X className="w-5 h-5" />
        </button>
      </div>
      {children}
    </div>
  </div>
);

/** Under a message the sender wrote that is waiting for a safety check. */
export const HeldMessageNote: React.FC = () => (
  <div className="text-[10px] text-amber-800 mt-0.5 px-1 max-w-[80%] text-right">
    Waiting for a quick safety check before it’s delivered (it mentions another app and contact details).
  </div>
);

/** Shown instead of the message box when sending isn't possible. */
export const MessagingBlockedNotice: React.FC<{ kind: 'suspended' | 'blocked'; otherName?: string }> = ({ kind, otherName }) => (
  <div role="status" className="p-3 bg-slate-100 border-t border-slate-200 text-xs text-slate-700 text-center">
    {kind === 'suspended' ? (
      <>
        Your account can’t send messages right now. If you think this is a mistake, email{' '}
        <a href="mailto:hello@ownersmarket.ca" className="underline font-semibold">
          hello@ownersmarket.ca
        </a>
        .
      </>
    ) : (
      <>You blocked {otherName || 'this person'}. Unblock them to send a message.</>
    )}
  </div>
);
