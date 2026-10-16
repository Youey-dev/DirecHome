import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { ConversationThread, Listing, ListingReport, ListingStatus, UserProfile } from '../types/listing';
import { isListingLive } from '../types/listing';
import { ADMIN_DISPLAY_NAME, db, type AdminUserRow } from '../lib/db';
import { formatCAD } from '../lib/commissionCalc';
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  Flag,
  Home,
  LayoutDashboard,
  MessageSquare,
  Pause,
  Play,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from 'lucide-react';

interface AdminPageProps {
  activeUser: UserProfile;
  onNavigate: (tab: string, listingId?: string) => void;
}

type AdminTab = 'overview' | 'listings' | 'review' | 'people' | 'messages' | 'reports';

/** What the admin is about to do, shown in the dialog. */
type Pending =
  | { kind: 'pause'; listing: Listing }
  | { kind: 'takedown'; listing: Listing; reportId?: string }
  | { kind: 'reject'; listing: Listing }
  | { kind: 'delete'; listing: Listing }
  | { kind: 'message'; listing: Listing };

const STATUS_LABEL: Record<ListingStatus, string> = {
  draft: 'Draft',
  in_review: 'In review',
  live: 'Up',
  paused: 'Paused',
  sold: 'Sold',
  rejected: 'Needs changes',
} as Record<ListingStatus, string>;

const STATUS_STYLE: Record<string, string> = {
  live: 'bg-emerald-100 text-emerald-900',
  paused: 'bg-amber-100 text-amber-900',
  in_review: 'bg-sky-100 text-sky-900',
  rejected: 'bg-rose-100 text-rose-900',
  sold: 'bg-slate-200 text-slate-800',
  draft: 'bg-slate-100 text-slate-600',
};

const BILLING_LABEL: Record<string, string> = {
  active: 'Paying',
  past_due: 'Payment failed',
  complimentary_launch: 'Free (launch)',
  unpaid: 'Not activated',
  canceled: 'Cancelled',
};

const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

const isPaying = (l: Listing) => ['active', 'past_due'].includes(l.paymentStatus ?? '') && !l.cancelAtPeriodEnd;

export const AdminPage: React.FC<AdminPageProps> = ({ activeUser, onNavigate }) => {
  const [tab, setTab] = useState<AdminTab>('overview');
  const [listings, setListings] = useState<Listing[]>([]);
  const [reports, setReports] = useState<ListingReport[]>([]);
  const [threads, setThreads] = useState<ConversationThread[]>([]);
  const [people, setPeople] = useState<AdminUserRow[]>([]);
  const [peopleError, setPeopleError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ text: string; bad?: boolean } | null>(null);

  const [pending, setPending] = useState<Pending | null>(null);
  const [text, setText] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);

  // Listings tab filters
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ListingStatus | 'held'>('all');
  const [ownerFilter, setOwnerFilter] = useState<AdminUserRow | null>(null);
  const [peopleQuery, setPeopleQuery] = useState('');

  // Messages tab
  const [threadId, setThreadId] = useState<string | null>(null);
  const [reply, setReply] = useState('');

  useEffect(() => {
    const load = () => {
      // Everyone's listings except the admin's own drafts are what we manage
      setListings(db.getListings());
      setReports(db.getReports());
      setThreads(db.getThreads());
    };
    load();
    void db.refresh();
    const unsub = db.subscribe(load);
    return unsub;
  }, [activeUser.id, activeUser.role]);

  const loadPeople = () => {
    db.adminLoadUsers()
      .then((rows) => {
        setPeople(rows);
        setPeopleError(null);
      })
      .catch((e) => setPeopleError(e?.message || 'Could not load accounts.'));
  };
  useEffect(loadPeople, []);

  const flash = (t: string, bad = false) => {
    setNotice({ text: t, bad });
    setTimeout(() => setNotice(null), 4500);
  };

  const run = async (action: () => Promise<void>, success: string) => {
    setBusy(true);
    try {
      await action();
      flash(success);
      return true;
    } catch (err: any) {
      flash(err?.message || 'Something went wrong.', true);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const open = (p: Pending) => {
    setPending(p);
    setText('');
    setConfirmed(false);
  };
  const close = () => setPending(null);

  // ---------------------------------------------------------------------------
  // Numbers
  // ---------------------------------------------------------------------------
  const count = (s: ListingStatus) => listings.filter((l) => l.status === s).length;
  const reviewQueue = listings.filter((l) => l.status === 'in_review');
  const openReports = reports.filter((r) => r.status === 'pending');
  const adminThreads = threads.filter((t) => t.isAdminThread);
  const unreadAdmin = adminThreads.reduce((n, t) => n + t.unreadCount, 0);
  const listingCountByOwner = useMemo(() => {
    const m = new Map<string, number>();
    listings.forEach((l) => m.set(l.userId, (m.get(l.userId) ?? 0) + 1));
    return m;
  }, [listings]);

  // ---------------------------------------------------------------------------
  // Filtered listings
  // ---------------------------------------------------------------------------
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return listings.filter((l) => {
      if (ownerFilter && l.userId !== ownerFilter.id) return false;
      if (statusFilter === 'held' && !l.adminHold) return false;
      if (statusFilter !== 'all' && statusFilter !== 'held' && l.status !== statusFilter) return false;
      if (!q) return true;
      return [l.headline, l.city, l.neighborhood, l.province, l.sellerName, l.sellerEmail, l.streetAddress ?? '', l.postalCode ?? '']
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [listings, query, statusFilter, ownerFilter]);

  const filteredPeople = useMemo(() => {
    const q = peopleQuery.trim().toLowerCase();
    if (!q) return people;
    return people.filter((p) => `${p.fullName} ${p.email} ${p.phone}`.toLowerCase().includes(q));
  }, [people, peopleQuery]);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pending || busy) return;
    const reason = text.trim();
    const { listing } = pending;

    if (pending.kind === 'delete') {
      if (!confirmed) return flash('Tick the box to confirm.', true);
      if (reason.length < 5) return flash('Give the owner a short reason (at least 5 characters).', true);
      const ok = await run(() => db.adminDeleteListing(listing.id, reason), 'Listing deleted. The owner was told why.');
      if (ok) close();
      return;
    }
    if (pending.kind === 'message') {
      if (reason.length < 2) return flash('Write a message first.', true);
      setBusy(true);
      try {
        const id = await db.adminMessageSeller(listing.id, reason);
        flash(`Message sent to ${listing.sellerName} as ${ADMIN_DISPLAY_NAME}.`);
        setThreadId(id);
        close();
      } catch (err: any) {
        flash(err?.message || 'Could not send.', true);
      } finally {
        setBusy(false);
      }
      return;
    }
    if (reason.length < 5) return flash('Give the owner a reason they can act on (at least 5 characters).', true);

    let ok = false;
    if (pending.kind === 'pause') {
      ok = await run(() => db.adminPauseListing(listing.id, reason), 'Listing paused. The owner sees your reason and can’t put it back up.');
    } else if (pending.kind === 'reject') {
      ok = await run(() => db.rejectListing(listing.id, reason), 'Sent back to the owner with your reason.');
    } else if (pending.kind === 'takedown') {
      const reportId = pending.reportId;
      ok = await run(async () => {
        await db.takeDownListing(listing.id, reason);
        if (reportId) await db.resolveReport(reportId, 'resolved');
      }, 'Listing taken down. The owner must fix it and resubmit. Billing ends at the close of the paid month.');
    }
    if (ok) close();
  };

  const resume = (l: Listing) =>
    void run(() => db.adminResumeListing(l.id), 'Listing is back up. The owner has been told.');

  const approve = (l: Listing) =>
    void run(() => db.approveListing(l.id), 'Approved. The owner can now activate it to publish.');

  const sendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = adminThreads.find((x) => x.id === activeThreadId);
    if (!t || !reply.trim()) return;
    const ok = await run(() => db.replyToThread(t.id, reply.trim()), 'Sent.');
    if (ok) setReply('');
  };

  // ---------------------------------------------------------------------------
  // Messages
  // ---------------------------------------------------------------------------
  const activeThreadId = threadId && adminThreads.some((t) => t.id === threadId) ? threadId : adminThreads[0]?.id ?? null;
  const activeThread = adminThreads.find((t) => t.id === activeThreadId);
  const chatEnd = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (tab === 'messages' && activeThread && activeThread.unreadCount > 0) void db.markThreadRead(activeThread.id);
    chatEnd.current?.scrollIntoView({ block: 'nearest' });
  }, [tab, activeThread?.id, activeThread?.messages.length]);

  // ---------------------------------------------------------------------------
  // Pieces
  // ---------------------------------------------------------------------------
  const tabs: { id: AdminTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'listings', label: 'All listings', icon: <Home className="w-4 h-4" />, badge: listings.length },
    { id: 'review', label: 'Review queue', icon: <ShieldCheck className="w-4 h-4" />, badge: reviewQueue.length },
    { id: 'people', label: 'People', icon: <Users className="w-4 h-4" />, badge: people.length },
    { id: 'messages', label: 'Messages', icon: <MessageSquare className="w-4 h-4" />, badge: unreadAdmin },
    { id: 'reports', label: 'Reports', icon: <Flag className="w-4 h-4" />, badge: openReports.length },
  ];

  const StatusBadge = ({ l }: { l: Listing }) => (
    <span className="flex flex-wrap gap-1">
      <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${STATUS_STYLE[l.status] ?? 'bg-slate-100'}`}>
        {STATUS_LABEL[l.status] ?? l.status}
      </span>
      {l.adminHold && <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-300 text-amber-950">Paused by admin</span>}
      {l.status === 'live' && !isListingLive(l) && (
        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">Hidden: not paid</span>
      )}
    </span>
  );

  const ActionButton = ({
    onClick,
    children,
    tone = 'plain',
    title,
  }: {
    onClick: () => void;
    children: React.ReactNode;
    tone?: 'plain' | 'danger' | 'primary';
    title?: string;
  }) => (
    <button
      type="button"
      title={title}
      disabled={busy}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg min-h-[40px] cursor-pointer disabled:opacity-50 ${
        tone === 'danger'
          ? 'text-rose-700 border border-rose-200 hover:bg-rose-50'
          : tone === 'primary'
            ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
            : 'text-slate-700 border border-slate-200 hover:bg-slate-50'
      }`}
    >
      {children}
    </button>
  );

  const ListingActions = ({ l }: { l: Listing }) => {
    const mine = l.userId === activeUser.id;
    return (
      <div className="flex flex-wrap gap-2">
        <ActionButton onClick={() => onNavigate('detail', l.id)}>
          <Eye className="w-3.5 h-3.5" /> View
        </ActionButton>
        {!mine && (
          <ActionButton onClick={() => open({ kind: 'message', listing: l })}>
            <MessageSquare className="w-3.5 h-3.5" /> Message owner
          </ActionButton>
        )}
        {l.status === 'in_review' && (
          <>
            <ActionButton tone="primary" onClick={() => approve(l)}>
              <CheckCircle2 className="w-3.5 h-3.5" /> Approve
            </ActionButton>
            <ActionButton tone="danger" onClick={() => open({ kind: 'reject', listing: l })}>
              Send back
            </ActionButton>
          </>
        )}
        {(l.status === 'live' || (l.status === 'paused' && !l.adminHold)) && (
          <ActionButton onClick={() => open({ kind: 'pause', listing: l })}>
            <Pause className="w-3.5 h-3.5" /> Pause
          </ActionButton>
        )}
        {l.status === 'paused' && l.adminHold && (
          <ActionButton tone="primary" onClick={() => resume(l)}>
            <Play className="w-3.5 h-3.5" /> Resume
          </ActionButton>
        )}
        {['live', 'paused'].includes(l.status) && (
          <ActionButton tone="danger" onClick={() => open({ kind: 'takedown', listing: l })}>
            Take down
          </ActionButton>
        )}
        <ActionButton tone="danger" onClick={() => open({ kind: 'delete', listing: l })}>
          <Trash2 className="w-3.5 h-3.5" /> Delete
        </ActionButton>
      </div>
    );
  };

  const ListingRow = ({ l }: { l: Listing }) => {
    const cover = l.photos[0];
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col md:flex-row gap-4">
        <div className="w-full md:w-36 aspect-[4/3] md:aspect-auto md:h-24 shrink-0 rounded-lg overflow-hidden bg-slate-100">
          {cover && <img src={cover.thumbnailUrl || cover.url} alt="" className="w-full h-full object-cover" loading="lazy" />}
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <StatusBadge l={l} />
              <h3 className="font-bold text-slate-900 mt-1 truncate">{l.headline || 'Untitled listing'}</h3>
              <div className="text-xs text-slate-600">
                {l.streetAddress ? `${l.streetAddress}${l.unitNumber ? ` #${l.unitNumber}` : ''}, ` : ''}
                {l.neighborhood ? `${l.neighborhood}, ` : ''}
                {l.city}, {l.province}
              </div>
            </div>
            <div className="text-right">
              <div className="font-extrabold text-slate-900 tabular-nums">{formatCAD(l.price)}</div>
              <div className="text-[11px] text-slate-500">{BILLING_LABEL[l.paymentStatus ?? 'unpaid'] ?? l.paymentStatus}</div>
            </div>
          </div>
          <div className="text-xs text-slate-600 flex flex-wrap gap-x-4 gap-y-1">
            <span>
              <strong className="text-slate-800">Owner:</strong> {l.sellerName}
              {l.sellerEmail ? ` · ${l.sellerEmail}` : ''}
              {l.sellerPhone ? ` · ${l.sellerPhone}` : ''}
            </span>
            <span>Created {fmtDate(l.createdAt)}</span>
            <span>
              {l.viewsCount} views · {l.savesCount} saves · {l.inquiriesCount} inquiries
            </span>
          </div>
          {l.reviewNotes && ['paused', 'rejected'].includes(l.status) && (
            <div className="text-xs bg-amber-50 border border-amber-200 text-amber-900 rounded-lg px-3 py-2">
              <strong>Note to owner:</strong> {l.reviewNotes}
            </div>
          )}
          <ListingActions l={l} />
        </div>
      </div>
    );
  };

  const Stat = ({ label, value, onClick, tone }: { label: string; value: number; onClick?: () => void; tone?: string }) => (
    <button
      type="button"
      onClick={onClick}
      className={`text-left bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-400 cursor-pointer ${tone ?? ''}`}
    >
      <div className="text-3xl font-extrabold text-slate-900 tabular-nums">{value}</div>
      <div className="text-xs font-semibold text-slate-600 mt-1">{label}</div>
    </button>
  );

  const showListings = (s: typeof statusFilter) => {
    setStatusFilter(s);
    setOwnerFilter(null);
    setQuery('');
    setTab('listings');
  };

  // ---------------------------------------------------------------------------
  // Dialog text
  // ---------------------------------------------------------------------------
  const dialog = pending && (() => {
    const l = pending.listing;
    const paying = isPaying(l);
    switch (pending.kind) {
      case 'pause':
        return {
          title: `Pause “${l.headline}”`,
          body: `It's hidden from buyers right away. ${l.sellerName} sees your reason and can't put it back up; only an admin can resume it.${
            paying ? ' Their $24.99/month billing keeps running while it is paused. To stop billing, take it down or delete it instead.' : ''
          }`,
          label: 'Reason the owner will see',
          placeholder: 'e.g. Your photos include a phone number. Please message us once you’ve replaced them.',
          button: 'Pause listing',
          danger: false,
        };
      case 'reject':
        return {
          title: `Send back “${l.headline}”`,
          body: 'The owner sees this on their dashboard, fixes the listing and resubmits it for review.',
          label: 'What needs to change',
          placeholder: 'e.g. Please remove the phone number from the description.',
          button: 'Send back',
          danger: true,
        };
      case 'takedown':
        return {
          title: `Take down “${l.headline}”`,
          body: `It's hidden right away and sent back to ${l.sellerName} with your reason. They must fix it and resubmit for review.${
            paying ? ' Their billing ends at the close of the paid month, with no refund.' : ''
          }`,
          label: 'Reason the owner will see',
          placeholder: 'e.g. This listing breaks our listing rules because…',
          button: 'Take down',
          danger: true,
        };
      case 'delete':
        return {
          title: `Delete “${l.headline}”`,
          body: `This removes the listing, its photos, viewings and conversations for good. It can't be undone.${
            paying ? ' Its $24.99/month billing stops today, with no refund for the rest of the month.' : ''
          } ${l.sellerName} gets a notice with your reason.`,
          label: 'Reason the owner will see',
          placeholder: 'e.g. This listing was a duplicate of your other listing.',
          button: 'Delete for good',
          danger: true,
        };
      case 'message':
        return {
          title: `Message ${l.sellerName}`,
          body: `About “${l.headline}”. They'll see it in their dashboard messages from ${ADMIN_DISPLAY_NAME}, and can reply.`,
          label: 'Message',
          placeholder: `Hi ${l.sellerName.split(' ')[0] || 'there'}, this is Charles from OwnersMarket…`,
          button: 'Send message',
          danger: false,
        };
    }
  })();

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6 pb-20 space-y-6">
      {notice && (
        <div
          role="status"
          className={`fixed top-20 right-4 sm:right-8 z-[60] max-w-sm px-4 py-3 rounded-xl shadow-xl text-sm flex items-start gap-2 ${
            notice.bad ? 'bg-rose-700 text-white' : 'bg-slate-900 text-white'
          }`}
        >
          {notice.bad ? <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
          <span>{notice.text}</span>
        </div>
      )}

      <div className="border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-700">
          <ShieldCheck className="w-4 h-4" /> OwnersMarket admin
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">Admin console</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage every listing and account. Messages you send go out as {ADMIN_DISPLAY_NAME}. OwnersMarket does not verify ownership.
        </p>
      </div>

      <nav className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" aria-label="Admin sections">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            aria-current={tab === t.id ? 'page' : undefined}
            className={`shrink-0 inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl cursor-pointer min-h-[44px] ${
              tab === t.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {t.icon}
            {t.label}
            {!!t.badge && (
              <span className={`text-[11px] px-1.5 rounded-full ${tab === t.id ? 'bg-white/20' : 'bg-slate-200 text-slate-700'}`}>{t.badge}</span>
            )}
          </button>
        ))}
      </nav>

      {/* Overview */}
      {tab === 'overview' && (
        <div className="space-y-8">
          {(reviewQueue.length > 0 || openReports.length > 0 || unreadAdmin > 0) && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
              <div className="font-bold text-amber-950">Needs your attention</div>
              <ul className="text-sm text-amber-950 space-y-1">
                {reviewQueue.length > 0 && (
                  <li>
                    <button className="underline cursor-pointer" onClick={() => setTab('review')}>
                      {reviewQueue.length} listing{reviewQueue.length === 1 ? '' : 's'} waiting for review
                    </button>
                  </li>
                )}
                {openReports.length > 0 && (
                  <li>
                    <button className="underline cursor-pointer" onClick={() => setTab('reports')}>
                      {openReports.length} open report{openReports.length === 1 ? '' : 's'}
                    </button>
                  </li>
                )}
                {unreadAdmin > 0 && (
                  <li>
                    <button className="underline cursor-pointer" onClick={() => setTab('messages')}>
                      {unreadAdmin} unread repl{unreadAdmin === 1 ? 'y' : 'ies'} from owners
                    </button>
                  </li>
                )}
              </ul>
            </div>
          )}

          <section className="space-y-3">
            <h2 className="font-bold text-slate-900">Listings</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <Stat label="Up for buyers" value={listings.filter((l) => isListingLive(l)).length} onClick={() => showListings('live')} />
              <Stat label="Paused" value={count('paused')} onClick={() => showListings('paused')} />
              <Stat label="In review" value={reviewQueue.length} onClick={() => setTab('review')} />
              <Stat label="Needs changes" value={count('rejected')} onClick={() => showListings('rejected')} />
              <Stat label="Sold" value={count('sold')} onClick={() => showListings('sold')} />
              <Stat label="Drafts" value={count('draft')} onClick={() => showListings('draft')} />
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="font-bold text-slate-900">Billing and people</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <Stat label="Paying listings" value={listings.filter((l) => l.paymentStatus === 'active').length} onClick={() => showListings('all')} />
              <Stat label="Payment failed" value={listings.filter((l) => l.paymentStatus === 'past_due').length} onClick={() => showListings('all')} />
              <Stat label="Free (launch)" value={listings.filter((l) => l.paymentStatus === 'complimentary_launch').length} onClick={() => showListings('all')} />
              <Stat label="Accounts" value={people.length} onClick={() => setTab('people')} />
              <Stat label="Paused by admin" value={listings.filter((l) => l.adminHold).length} onClick={() => showListings('held')} />
              <Stat label="Open reports" value={openReports.length} onClick={() => setTab('reports')} />
            </div>
            <p className="text-xs text-slate-500">
              Monthly revenue from active subscriptions: about{' '}
              <strong>{formatCAD(listings.filter((l) => l.paymentStatus === 'active').length * 24.99)}</strong>. Stripe is the source of truth for
              money; check refunds and payouts there.
            </p>
          </section>
        </div>
      )}

      {/* All listings */}
      {tab === 'listings' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <label className="flex-1 flex items-center gap-2 bg-white border border-slate-300 rounded-xl px-3 min-h-[44px]">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search headline, city, address, owner name or email"
                className="flex-1 bg-transparent outline-none text-sm py-2"
              />
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="bg-white border border-slate-300 rounded-xl px-3 text-sm min-h-[44px]"
            >
              <option value="all">All statuses</option>
              <option value="live">Up</option>
              <option value="paused">Paused</option>
              <option value="held">Paused by admin</option>
              <option value="in_review">In review</option>
              <option value="rejected">Needs changes</option>
              <option value="sold">Sold</option>
              <option value="draft">Drafts</option>
            </select>
          </div>
          {ownerFilter && (
            <div className="flex items-center gap-2 text-sm">
              <span className="bg-slate-900 text-white rounded-full pl-3 pr-1 py-1 inline-flex items-center gap-2">
                Owner: {ownerFilter.fullName || ownerFilter.email}
                <button aria-label="Clear owner filter" onClick={() => setOwnerFilter(null)} className="rounded-full hover:bg-white/20 p-1 cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            </div>
          )}
          <div className="text-xs text-slate-500">
            Showing {filtered.length} of {listings.length} listings
          </div>
          <div className="space-y-3">
            {filtered.map((l) => (
              <ListingRow key={l.id} l={l} />
            ))}
            {filtered.length === 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-sm text-slate-500">No listings match.</div>
            )}
          </div>
        </div>
      )}

      {/* Review queue */}
      {tab === 'review' && (
        <div className="space-y-4">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs text-slate-600 space-y-1.5">
            <div className="font-bold text-slate-900">Quick review checklist</div>
            <ul className="list-disc pl-5 space-y-0.5">
              <li>Photos show a real home and nothing offensive or copied from another site</li>
              <li>Description has no phone numbers, emails or links trying to move buyers off the site</li>
              <li>Price, size and location look plausible (no obvious scam or placeholder)</li>
              <li>Nothing discriminatory or otherwise against the Terms of Use</li>
            </ul>
          </div>
          {reviewQueue.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-sm text-slate-500">
              Nothing waiting for review.
            </div>
          ) : (
            reviewQueue.map((l) => <ListingRow key={l.id} l={l} />)
          )}
        </div>
      )}

      {/* People */}
      {tab === 'people' && (
        <div className="space-y-4">
          <label className="flex items-center gap-2 bg-white border border-slate-300 rounded-xl px-3 min-h-[44px]">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              value={peopleQuery}
              onChange={(e) => setPeopleQuery(e.target.value)}
              placeholder="Search name, email or phone"
              className="flex-1 bg-transparent outline-none text-sm py-2"
            />
          </label>
          {peopleError && <div className="text-sm text-rose-700">{peopleError}</div>}
          <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Contact</th>
                  <th className="px-4 py-3 font-semibold">Joined</th>
                  <th className="px-4 py-3 font-semibold">Listings</th>
                  <th className="px-4 py-3 font-semibold">Marketing email</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filteredPeople.map((p) => {
                  const n = listingCountByOwner.get(p.id) ?? 0;
                  const theirListings = listings.filter((l) => l.userId === p.id);
                  return (
                    <tr key={p.id} className="border-b border-slate-100 last:border-0 align-top">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{p.fullName || '—'}</div>
                        {p.role === 'admin' && <span className="text-[11px] font-bold text-amber-800">Admin</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        <div>{p.email}</div>
                        {p.phone && <div className="text-xs text-slate-500">{p.phone}</div>}
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{fmtDate(p.createdAt)}</td>
                      <td className="px-4 py-3 tabular-nums">{n}</td>
                      <td className="px-4 py-3 text-slate-600">{p.marketingOptIn ? 'Yes' : 'No'}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 justify-end">
                          {n > 0 && (
                            <ActionButton
                              onClick={() => {
                                setOwnerFilter(p);
                                setStatusFilter('all');
                                setQuery('');
                                setTab('listings');
                              }}
                            >
                              Listings
                            </ActionButton>
                          )}
                          {n > 0 && p.id !== activeUser.id && (
                            <ActionButton onClick={() => open({ kind: 'message', listing: theirListings[0] })}>
                              <MessageSquare className="w-3.5 h-3.5" /> Message
                            </ActionButton>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredPeople.length === 0 && !peopleError && (
              <div className="p-8 text-center text-sm text-slate-500">No accounts match.</div>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Messages are tied to a listing, so you can message anyone who has one. Only email people who ticked “Marketing email” about promotions (CASL).
          </p>
        </div>
      )}

      {/* Messages */}
      {tab === 'messages' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 overflow-hidden">
            {adminThreads.length === 0 ? (
              <div className="p-6 text-sm text-slate-500">
                No conversations yet. Use “Message owner” on any listing to start one.
              </div>
            ) : (
              adminThreads.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setThreadId(t.id)}
                  className={`w-full text-left px-4 py-3 border-b border-slate-100 cursor-pointer ${
                    t.id === activeThreadId ? 'bg-slate-100' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex justify-between gap-2">
                    <span className="font-semibold text-slate-900 truncate">{t.sellerName}</span>
                    {t.unreadCount > 0 && (
                      <span className="text-[11px] font-bold bg-emerald-700 text-white rounded-full px-2">{t.unreadCount}</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 truncate">{t.listingTitle}</div>
                  <div className="text-xs text-slate-600 truncate mt-0.5">{t.messages[t.messages.length - 1]?.content}</div>
                </button>
              ))
            )}
          </div>
          <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 flex flex-col min-h-[420px]">
            {activeThread ? (
              <>
                <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap justify-between gap-2">
                  <div>
                    <div className="font-bold text-slate-900">{activeThread.sellerName}</div>
                    <div className="text-xs text-slate-500">{activeThread.listingTitle}</div>
                  </div>
                  <ActionButton onClick={() => onNavigate('detail', activeThread.listingId)}>
                    <Eye className="w-3.5 h-3.5" /> Listing
                  </ActionButton>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[480px]">
                  {activeThread.messages.map((m) => {
                    const mine = m.senderId === activeUser.id;
                    return (
                      <div key={m.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                        <div className="text-[11px] text-slate-500 mb-0.5">
                          {m.senderName} · {new Date(m.timestamp).toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' })}
                        </div>
                        <div
                          className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm ${
                            mine ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-900'
                          }`}
                        >
                          {m.content}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatEnd} />
                </div>
                <form onSubmit={sendReply} className="border-t border-slate-200 p-3 flex gap-2">
                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    rows={2}
                    maxLength={5000}
                    placeholder={`Reply as ${ADMIN_DISPLAY_NAME}`}
                    className="flex-1 p-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  />
                  <button
                    type="submit"
                    disabled={busy || !reply.trim()}
                    className="self-end inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-lg disabled:opacity-50 cursor-pointer"
                  >
                    <Send className="w-4 h-4" /> Send
                  </button>
                </form>
              </>
            ) : (
              <div className="m-auto text-sm text-slate-500 p-6">Pick a conversation.</div>
            )}
          </div>
        </div>
      )}

      {/* Reports */}
      {tab === 'reports' && (
        <div className="space-y-3">
          {reports.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-sm text-slate-500">No reports yet.</div>
          ) : (
            reports.map((r) => {
              const l = listings.find((x) => x.id === r.listingId);
              return (
                <div key={r.id} className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                  <div className="flex flex-wrap justify-between gap-2">
                    <div>
                      <div className="font-bold text-slate-900">{r.listingTitle}</div>
                      <div className="text-xs text-slate-500">
                        From {r.reporterEmail} · {fmtDate(r.createdAt)}
                      </div>
                    </div>
                    <span
                      className={`self-start text-[11px] font-bold px-2 py-0.5 rounded uppercase ${
                        r.status === 'pending' ? 'bg-rose-100 text-rose-900' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {r.status === 'pending' ? 'Open' : r.status}
                    </span>
                  </div>
                  <div className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <div>
                      <strong>Reason:</strong> {r.reason.replace(/_/g, ' ')}
                    </div>
                    {r.details && <div className="mt-1">“{r.details}”</div>}
                  </div>
                  {r.status === 'pending' && (
                    <div className="flex flex-wrap gap-2 justify-end">
                      {l && (
                        <ActionButton onClick={() => onNavigate('detail', l.id)}>
                          <Eye className="w-3.5 h-3.5" /> View
                        </ActionButton>
                      )}
                      {l && l.userId !== activeUser.id && (
                        <ActionButton onClick={() => open({ kind: 'message', listing: l })}>
                          <MessageSquare className="w-3.5 h-3.5" /> Message owner
                        </ActionButton>
                      )}
                      <ActionButton onClick={() => void run(() => db.resolveReport(r.id, 'dismissed'), 'Report dismissed.')}>
                        Dismiss
                      </ActionButton>
                      {l && ['live', 'paused', 'in_review'].includes(l.status) && (
                        <ActionButton tone="danger" onClick={() => open({ kind: 'takedown', listing: l, reportId: r.id })}>
                          Take down
                        </ActionButton>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Dialog */}
      {pending && dialog && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4"
          onMouseDown={(e) => e.target === e.currentTarget && !busy && close()}
          onKeyDown={(e) => e.key === 'Escape' && !busy && close()}
        >
          <form
            onSubmit={submit}
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-dialog-title"
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4"
          >
            <h3 id="admin-dialog-title" className="text-lg font-bold text-slate-900">
              {dialog.title}
            </h3>
            <p className="text-sm text-slate-600">{dialog.body}</p>
            <label className="block">
              <span className="block text-xs font-semibold text-slate-700 mb-1">{dialog.label}</span>
              <textarea
                autoFocus
                rows={pending.kind === 'message' ? 5 : 3}
                maxLength={pending.kind === 'message' ? 5000 : 500}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={dialog.placeholder}
                className="w-full p-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
            </label>
            {pending.kind === 'delete' && (
              <label className="flex items-start gap-2 text-sm text-slate-800">
                <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-1 w-4 h-4" />
                I understand this deletes the listing for good.
              </label>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={close} disabled={busy} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 cursor-pointer">
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold text-white min-h-[44px] cursor-pointer disabled:opacity-50 ${
                  dialog.danger ? 'bg-rose-700 hover:bg-rose-800' : 'bg-emerald-700 hover:bg-emerald-800'
                }`}
              >
                {busy ? 'Working…' : dialog.button}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
