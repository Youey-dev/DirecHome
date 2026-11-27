import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Ban, CheckCircle2, Loader2, MessageSquare, RotateCcw, Trash2 } from 'lucide-react';
import {
  db,
  USER_REPORT_REASONS,
  type AdminUserRow,
  type MessagingSuspension,
  type ScamSignal,
  type UserReport,
} from '../lib/db';
import type { ConversationThread } from '../types/listing';

const when = (iso: string) => new Date(iso).toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' });
const reasonLabel = (r: string) => USER_REPORT_REASONS.find((x) => x.value === r)?.label ?? r;

/**
 * Admin console → Safety: messages held for a safety check, people reported from conversations,
 * accounts with warning signs (same text to many people, held messages, reports), and
 * accounts whose messaging is suspended. Everything here is enforced by migration 20261044.
 */
export const AdminSafety: React.FC<{
  otherThreads: ConversationThread[];
  people: AdminUserRow[];
  onOpenConversation: (conversationId: string) => void;
  /** Called after a suspension changes, so the People tab stays in step. */
  onSuspensionsChanged?: () => void;
}> = ({ otherThreads, people, onOpenConversation, onSuspensionsChanged }) => {
  const [signals, setSignals] = useState<ScamSignal[] | null>(null);
  const [reports, setReports] = useState<UserReport[]>([]);
  const [suspensions, setSuspensions] = useState<MessagingSuspension[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [suspendFor, setSuspendFor] = useState<string | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [showClosed, setShowClosed] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await db.adminLoadSafety();
      setSignals(d.signals);
      setReports(d.reports);
      setSuspensions(d.suspensions);
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Could not load safety data.');
      setSignals([]);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const byId = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const nameOf = (id: string | null) => {
    if (!id) return 'Deleted account';
    const p = byId.get(id);
    return p ? `${p.fullName || 'No name'} (${p.email})` : 'Unknown account';
  };
  const suspendedIds = useMemo(() => new Set(suspensions.map((s) => s.userId)), [suspensions]);

  const held = useMemo(
    () =>
      otherThreads
        .flatMap((t) => t.messages.filter((m) => m.held).map((m) => ({ t, m })))
        .sort((a, b) => a.m.timestamp.localeCompare(b.m.timestamp)),
    [otherThreads]
  );

  const act = async (action: () => Promise<void>, done: string, reload = true) => {
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      await action();
      setNotice(done);
      if (reload) await load();
    } catch (e: any) {
      setError(e?.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const suspend = (userId: string) =>
    act(async () => {
      await db.adminSuspendMessaging(userId, suspendReason);
      setSuspendFor(null);
      setSuspendReason('');
      onSuspensionsChanged?.();
    }, 'Messaging suspended. They can’t contact anyone until you allow it again.');

  const restore = (userId: string) =>
    act(async () => {
      await db.adminRestoreMessaging(userId);
      onSuspensionsChanged?.();
    }, 'They can message people again.');

  const suspendButton = (userId: string) =>
    suspendedIds.has(userId) ? (
      <Btn onClick={() => void restore(userId)} disabled={busy}>
        <RotateCcw className="w-3.5 h-3.5" /> Allow messaging
      </Btn>
    ) : suspendFor === userId ? (
      <span className="inline-flex flex-wrap items-center gap-2">
        <input
          autoFocus
          value={suspendReason}
          onChange={(e) => setSuspendReason(e.target.value)}
          placeholder="Reason (only admins see it)"
          className="px-2 py-1.5 border border-slate-300 rounded-lg text-xs w-48"
        />
        <Btn tone="danger" onClick={() => void suspend(userId)} disabled={busy}>
          Suspend
        </Btn>
        <Btn onClick={() => setSuspendFor(null)}>Cancel</Btn>
      </span>
    ) : (
      <Btn
        tone="danger"
        onClick={() => {
          setSuspendFor(userId);
          setSuspendReason('');
        }}
      >
        <Ban className="w-3.5 h-3.5" /> Suspend messaging
      </Btn>
    );

  const openReports = reports.filter((r) => r.status === 'pending');
  const shownReports = showClosed ? reports : openReports;

  if (signals === null) {
    return (
      <div className="p-8 flex justify-center text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {(notice || error) && (
        <div
          role="status"
          className={`px-4 py-3 rounded-xl text-sm flex items-start gap-2 ${error ? 'bg-rose-50 text-rose-800' : 'bg-emerald-50 text-emerald-900'}`}
        >
          {error ? <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> : <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />}
          {error || notice}
        </div>
      )}

      {/* Held messages */}
      <Section
        title={`Waiting for a safety check (${held.length})`}
        hint="Messages that name another app (Teams, WhatsApp, Telegram…) and include an email or phone number. The other person doesn’t see them until you deliver them."
      >
        {held.length === 0 ? (
          <Empty>Nothing waiting.</Empty>
        ) : (
          held.map(({ t, m }) => {
            const toName = m.senderId === t.buyerId ? t.sellerName : t.buyerName;
            return (
              <div key={m.id} className="p-4 border-b border-slate-100 last:border-0 space-y-2">
                <div className="text-xs text-slate-600">
                  <strong className="text-slate-900">{m.senderName}</strong> → {toName} · {t.listingTitle} · {when(m.timestamp)}
                </div>
                <div className="whitespace-pre-wrap break-words text-sm bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">{m.content}</div>
                <div className="flex flex-wrap gap-2">
                  <Btn tone="primary" disabled={busy} onClick={() => void act(() => db.adminReleaseMessage(m.id), 'Delivered.')}>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Deliver
                  </Btn>
                  <Btn tone="danger" disabled={busy} onClick={() => void act(() => db.adminDeleteMessage(m.id), 'Message deleted.')}>
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </Btn>
                  <Btn onClick={() => onOpenConversation(t.id)}>
                    <MessageSquare className="w-3.5 h-3.5" /> Conversation
                  </Btn>
                  {suspendButton(m.senderId)}
                </div>
              </div>
            );
          })
        )}
      </Section>

      {/* Reported people */}
      <Section
        title={`Reported people (${openReports.length} open)`}
        hint="Reported from a conversation with “Report”. The reported person isn’t told who reported them."
        action={
          <label className="text-xs text-slate-600 flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} /> Show closed
          </label>
        }
      >
        {shownReports.length === 0 ? (
          <Empty>No reports.</Empty>
        ) : (
          shownReports.map((r) => (
            <div key={r.id} className="p-4 border-b border-slate-100 last:border-0 space-y-2">
              <div className="text-sm">
                <strong className="text-slate-900">{nameOf(r.reportedUserId)}</strong>
                {suspendedIds.has(r.reportedUserId) && <Tag tone="red">Suspended</Tag>}
                {r.status !== 'pending' && <Tag>{r.status}</Tag>}
              </div>
              <div className="text-xs text-slate-600">
                {reasonLabel(r.reason)} · reported by {nameOf(r.reporterId)} · {when(r.createdAt)}
              </div>
              {r.details && <div className="text-sm whitespace-pre-wrap bg-slate-50 rounded-xl px-3 py-2">{r.details}</div>}
              <div className="flex flex-wrap gap-2">
                {r.conversationId && (
                  <Btn onClick={() => onOpenConversation(r.conversationId!)}>
                    <MessageSquare className="w-3.5 h-3.5" /> Read conversation
                  </Btn>
                )}
                {suspendButton(r.reportedUserId)}
                {r.status === 'pending' && (
                  <>
                    <Btn disabled={busy} onClick={() => void act(() => db.adminResolveUserReport(r.id, 'resolved'), 'Report resolved.')}>
                      Resolved
                    </Btn>
                    <Btn disabled={busy} onClick={() => void act(() => db.adminResolveUserReport(r.id, 'dismissed'), 'Report dismissed.')}>
                      Dismiss
                    </Btn>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </Section>

      {/* Warning signs */}
      <Section
        title={`Accounts with warning signs (${signals.length})`}
        hint="Last 7 days: the same message sent to 3+ people, messages held for review, open reports, or 4+ new conversations in 24 hours. Riskiest first."
      >
        {signals.length === 0 ? (
          <Empty>No warning signs right now.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2 font-semibold">Account</th>
                  <th className="px-4 py-2 font-semibold">Warning signs</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {signals.map((s) => (
                  <tr key={s.userId} className="border-b border-slate-100 last:border-0 align-top">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{s.fullName || 'No name'}</div>
                      <div className="text-xs text-slate-600">{s.email}</div>
                      <div className="text-[11px] text-slate-500">
                        Joined {new Date(s.joinedAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })} ·{' '}
                        {s.messages7d} messages this week
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {s.suspended && <Tag tone="red">Suspended</Tag>}
                        {s.sameTextPeople >= 3 && <Tag tone="amber">Same message to {s.sameTextPeople} people</Tag>}
                        {s.heldMessages > 0 && <Tag tone="amber">{s.heldMessages} held</Tag>}
                        {s.openReports > 0 && <Tag tone="red">{s.openReports} open report{s.openReports === 1 ? '' : 's'}</Tag>}
                        {s.newPeople24h >= 4 && <Tag tone="amber">{s.newPeople24h} new conversations in 24 h</Tag>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {suspendButton(s.userId)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Suspended */}
      <Section
        title={`Suspended from messaging (${suspensions.length})`}
        hint="They can still sign in and browse, but can’t send messages, start conversations, make offers or request viewings."
      >
        {suspensions.length === 0 ? (
          <Empty>Nobody is suspended.</Empty>
        ) : (
          suspensions.map((s) => (
            <div key={s.userId} className="p-4 border-b border-slate-100 last:border-0 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm font-semibold text-slate-900">{nameOf(s.userId)}</div>
                <div className="text-xs text-slate-600">
                  Since {when(s.createdAt)}
                  {s.reason ? ` · ${s.reason}` : ''}
                </div>
              </div>
              {suspendButton(s.userId)}
            </div>
          ))
        )}
      </Section>
    </div>
  );
};

const Section: React.FC<{ title: string; hint: string; action?: React.ReactNode; children: React.ReactNode }> = ({
  title,
  hint,
  action,
  children,
}) => (
  <section>
    <div className="flex items-end justify-between gap-2 mb-2">
      <div>
        <h2 className="text-base font-bold text-slate-900">{title}</h2>
        <p className="text-xs text-slate-500">{hint}</p>
      </div>
      {action}
    </div>
    <div className="bg-white rounded-xl border border-slate-200">{children}</div>
  </section>
);

const Empty: React.FC<{ children: React.ReactNode }> = ({ children }) => <div className="p-6 text-sm text-slate-500">{children}</div>;

const Tag: React.FC<{ tone?: 'red' | 'amber'; children: React.ReactNode }> = ({ tone, children }) => (
  <span
    className={`ml-1 text-[11px] font-bold px-2 py-0.5 rounded ${
      tone === 'red' ? 'bg-rose-100 text-rose-800' : tone === 'amber' ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-700'
    }`}
  >
    {children}
  </span>
);

const Btn: React.FC<{
  onClick: () => void;
  disabled?: boolean;
  tone?: 'plain' | 'danger' | 'primary';
  children: React.ReactNode;
}> = ({ onClick, disabled, tone = 'plain', children }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer min-h-[36px] disabled:opacity-50 ${
      tone === 'danger'
        ? 'bg-rose-700 text-white hover:bg-rose-800'
        : tone === 'primary'
          ? 'bg-emerald-700 text-white hover:bg-emerald-800'
          : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
    }`}
  >
    {children}
  </button>
);
