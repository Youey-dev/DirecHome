import React, { useState, useEffect } from 'react';
import { AppNotification, Listing, ViewingRequest, ConversationThread, UserProfile } from '../types/listing';
import { db } from '../lib/db';
import { formatCAD } from '../lib/commissionCalc';
import { 
  Building2, 
  Calendar, 
  MessageSquare, 
  Eye, 
  Heart, 
  CheckCircle2, 
  Pause, 
  Play, 
  Trophy, 
  PlusCircle, 
  Edit3, 
  Trash2, 
  Clock, 
  ShieldCheck, 
  ExternalLink,
  Send,
  AlertCircle
} from 'lucide-react';

export interface DashboardIntent {
  tab: 'listings' | 'viewings' | 'messages';
  threadId?: string;
  nonce: number;
}

interface DashboardPageProps {
  activeUser: UserProfile;
  onNavigate: (tab: string, listingId?: string) => void;
  onEditListing: (listing: Listing) => void;
  /** Lets a notification open the right tab (and conversation) when clicked. */
  intent?: DashboardIntent | null;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  activeUser,
  onNavigate,
  onEditListing,
  intent
}) => {
  const [activeTab, setActiveTab] = useState<'listings' | 'viewings' | 'messages'>('listings');
  const [listings, setListings] = useState<Listing[]>([]);
  const [viewings, setViewings] = useState<ViewingRequest[]>([]);
  const [threads, setThreads] = useState<ConversationThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    const load = () => {
      setListings(db.getListings());
      setViewings(db.getViewingRequests());
      setThreads(db.getThreads());
      setNotifications(db.getNotifications());
    };
    load();
    void db.refresh();
    const unsub = db.subscribe(load);
    return unsub;
  }, [activeUser.id, activeUser.role]);

  // RLS Enforced: Sellers see their own listings in the portal; admins see all
  const myListings = listings.filter((l) => l.userId === activeUser.id);
  const myListingIds = new Set(myListings.map((l) => l.id));
  // Requests other people made for MY homes
  const myViewings = viewings.filter((v) => myListingIds.has(v.listingId) && v.buyerId !== activeUser.id);
  // Viewings I asked for on OTHER people's homes
  const myRequests = viewings.filter((v) => v.buyerId === activeUser.id);

  const otherName = (t: ConversationThread) => (t.buyerId === activeUser.id ? t.sellerName : t.buyerName);

  const VIEWING_UPDATE_TYPES = ['viewing_confirmed', 'viewing_declined', 'viewing_cancelled', 'viewing_rescheduled'];
  const unreadViewingUpdates = notifications.filter((n) => !n.read && VIEWING_UPDATE_TYPES.includes(n.type)).length;
  const unreadMessages = threads.reduce((sum, t) => sum + t.unreadCount, 0);
  const unreadListingNews = notifications.filter((n) => !n.read && (n.type === 'listing_live' || n.type === 'listing_rejected')).length;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const run = async (action: () => Promise<void>, successMessage: string) => {
    try {
      await action();
      showToast(successMessage);
    } catch (err: any) {
      showToast(`⚠️ ${err.message || 'Something went wrong. Please try again.'}`);
    }
  };

  const handleTogglePause = (id: string, currentStatus: Listing['status']) => {
    if (currentStatus === 'paused') {
      void run(() => db.updateListingStatus(id, 'live'), 'Listing is live again on the marketplace.');
    } else if (currentStatus === 'live') {
      void run(() => db.updateListingStatus(id, 'paused'), 'Listing paused. It is hidden from search.');
    } else {
      showToast('⚠️ Only live or paused listings can be switched. Listings go live after ownership verification is approved.');
    }
  };

  const handleMarkSold = (id: string) => {
    void run(() => db.updateListingStatus(id, 'sold'), '🎉 Congratulations on selling your home! Marked as Sold.');
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this listing? This cannot be undone.')) {
      void run(() => db.deleteListing(id), 'Listing removed.');
    }
  };

  const handleViewingStatus = (id: string, status: ViewingRequest['status']) => {
    void run(
      () => db.updateViewingStatus(id, status),
      status === 'confirmed'
        ? 'Viewing confirmed. The buyer can now see your exact address on the listing page.'
        : `Viewing request marked ${status}.`
    );
  };

  const handleSendReply = (e: React.FormEvent, thread: ConversationThread) => {
    e.preventDefault();
    const text = replyText.trim();
    if (!text) return;
    setReplyText('');
    void run(() => db.replyToThread(thread.id, text), 'Reply sent.');
  };

  // Opening a conversation marks the buyer's messages as read
  useEffect(() => {
    const t = threads.find((x) => x.id === selectedThreadId) || threads[0];
    if (activeTab === 'messages' && t && t.unreadCount > 0) void db.markThreadRead(t.id);
  }, [activeTab, selectedThreadId, threads]);

  // A clicked notification opens the right tab / conversation
  useEffect(() => {
    if (!intent) return;
    setActiveTab(intent.tab);
    if (intent.threadId) setSelectedThreadId(intent.threadId);
  }, [intent?.nonce]);

  // Opening a tab marks its notifications as seen
  useEffect(() => {
    if (activeTab === 'viewings') {
      void db.markNotificationsReadByType(['viewing_requested', ...VIEWING_UPDATE_TYPES]);
    } else if (activeTab === 'listings') {
      void db.markNotificationsReadByType(['listing_live', 'listing_rejected']);
    }
  }, [activeTab, notifications.length]);

  const activeThread = threads.find((t) => t.id === selectedThreadId) || threads[0];

  // Aggregate Metrics
  const totalViews = myListings.reduce((sum, l) => sum + l.viewsCount, 0);
  const totalSaves = myListings.reduce((sum, l) => sum + l.savesCount, 0);
  const pendingViewings = myViewings.filter((v) => v.status === 'pending').length;

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6 pb-20 space-y-6">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 sm:right-8 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl text-sm flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-800">
            <Building2 className="w-3.5 h-3.5" />
            <span>Your homes, messages & viewings</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 tracking-tight">
            My Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Logged in as <strong>{activeUser.name}</strong> ({activeUser.email})
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onNavigate('privacy')}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors min-h-[44px] flex items-center gap-1.5 cursor-pointer"
            title="Download personal data or manage PIPEDA deletion"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <span>Privacy & Data Tools</span>
          </button>

          <button
            onClick={() => onNavigate('wizard')}
            className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] text-white font-semibold text-sm rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer min-h-[44px]"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create New Listing</span>
          </button>
        </div>
      </div>

      {/* What needs attention */}
      {(unreadMessages > 0 || pendingViewings > 0 || unreadViewingUpdates > 0 || unreadListingNews > 0) && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-emerald-950">
            <AlertCircle className="w-4 h-4 text-emerald-700" />
            <span>Needs your attention</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {unreadMessages > 0 && (
              <button
                onClick={() => setActiveTab('messages')}
                className="px-3 py-2 rounded-xl bg-white border border-emerald-200 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 min-h-[40px] cursor-pointer"
              >
                💬 {unreadMessages} unread {unreadMessages === 1 ? 'message' : 'messages'}
              </button>
            )}
            {pendingViewings > 0 && (
              <button
                onClick={() => setActiveTab('viewings')}
                className="px-3 py-2 rounded-xl bg-white border border-emerald-200 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 min-h-[40px] cursor-pointer"
              >
                📅 {pendingViewings} viewing {pendingViewings === 1 ? 'request needs' : 'requests need'} your answer
              </button>
            )}
            {unreadViewingUpdates > 0 && (
              <button
                onClick={() => setActiveTab('viewings')}
                className="px-3 py-2 rounded-xl bg-white border border-emerald-200 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 min-h-[40px] cursor-pointer"
              >
                ✅ {unreadViewingUpdates} update{unreadViewingUpdates === 1 ? '' : 's'} on your viewing requests
              </button>
            )}
            {unreadListingNews > 0 && (
              <button
                onClick={() => setActiveTab('listings')}
                className="px-3 py-2 rounded-xl bg-white border border-emerald-200 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 min-h-[40px] cursor-pointer"
              >
                🏠 News about your listing
              </button>
            )}
          </div>
        </div>
      )}

      {/* Top Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Marketplace Views</span>
            <Eye className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 tabular-nums">
            {totalViews.toLocaleString()}
          </div>
          <div className="text-[11px] text-emerald-800 font-medium mt-1">Across all properties</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Saved by Buyers</span>
            <Heart className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 tabular-nums">
            {totalSaves.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Direct buyer interest</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Viewing Appointments</span>
            <Calendar className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 tabular-nums">
            {myViewings.length}
          </div>
          <div className="text-[11px] text-emerald-800 font-medium mt-1">
            {pendingViewings} pending confirmation
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Conversations</span>
            <MessageSquare className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 tabular-nums">
            {threads.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">{unreadMessages} unread</div>
        </div>
      </div>

      {/* Segmented Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('listings')}
          className={`px-4 py-2 text-sm font-semibold rounded-xl transition-colors cursor-pointer min-h-[44px] ${
            activeTab === 'listings'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <span className="flex items-center gap-1.5">
            My Homes ({myListings.length})
            {unreadListingNews > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">
                {unreadListingNews}
              </span>
            )}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('viewings')}
          className={`px-4 py-2 text-sm font-semibold rounded-xl transition-colors cursor-pointer min-h-[44px] flex items-center gap-1.5 ${
            activeTab === 'viewings'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <span>Viewings ({myViewings.length + myRequests.length})</span>
          {pendingViewings + unreadViewingUpdates > 0 && (
            <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">
              {pendingViewings + unreadViewingUpdates}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('messages')}
          className={`px-4 py-2 text-sm font-semibold rounded-xl transition-colors cursor-pointer min-h-[44px] ${
            activeTab === 'messages'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <span className="flex items-center gap-1.5">
            Messages ({threads.length})
            {unreadMessages > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">
                {unreadMessages}
              </span>
            )}
          </span>
        </button>
      </div>

      {/* TAB 1: My Listings Management */}
      {activeTab === 'listings' && (
        <div className="space-y-4">
          {myListings.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto space-y-4">
              <Building2 className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="text-lg font-bold text-slate-900">No listings created yet</h3>
              <p className="text-xs text-slate-500">
                You can create a complete listing with direct photos in under 15 minutes.
              </p>
              <button
                onClick={() => onNavigate('wizard')}
                className="px-5 py-2.5 bg-emerald-700 text-white text-sm font-semibold rounded-xl"
              >
                Start Listing
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {myListings.map((listing) => (
                <div
                  key={listing.id}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col justify-between"
                >
                  <div className="p-5 flex gap-4">
                    {/* Cover photo thumbnail */}
                    <div className="w-28 h-24 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                      <img
                        src={listing.photos[0]?.thumbnailUrl || listing.photos[0]?.url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Basic details */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            listing.status === 'live'
                              ? 'bg-emerald-100 text-emerald-900'
                              : listing.status === 'in_review'
                              ? 'bg-amber-100 text-amber-900'
                              : listing.status === 'sold'
                              ? 'bg-purple-100 text-purple-900'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {listing.status === 'in_review' ? 'In Review (Verification)' : listing.status}
                        </span>

                        <span className="text-xs text-slate-400 tabular-nums">
                          {listing.viewsCount} views
                        </span>
                      </div>

                      <div className="text-lg font-bold text-slate-900 tabular-nums">
                        {formatCAD(listing.price)}
                      </div>

                      <div className="text-xs text-slate-600 truncate font-medium">
                        {listing.streetAddress}, {listing.city}
                      </div>

                      <div className="text-[11px] text-slate-400">
                        {listing.bedrooms} bds · {listing.bathrooms} ba · {listing.sqft} sqft
                      </div>
                    </div>
                  </div>

                  {/* Actions Toolbar */}
                  <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap text-xs">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onNavigate('detail', listing.id)}
                        className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-medium rounded-lg border border-slate-200 flex items-center gap-1.5 cursor-pointer min-h-[44px]"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                        <span>Preview</span>
                      </button>

                      <button
                        onClick={() => onEditListing(listing)}
                        className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-medium rounded-lg border border-slate-200 flex items-center gap-1.5 cursor-pointer min-h-[44px]"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                        <span>Edit</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      {listing.status !== 'sold' && (
                        <>
                          <button
                            onClick={() => handleTogglePause(listing.id, listing.status)}
                            className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-medium rounded-lg border border-slate-200 flex items-center gap-1.5 cursor-pointer min-h-[44px]"
                            title={listing.status === 'live' ? 'Hide from buyers' : 'Make live'}
                          >
                            {listing.status === 'live' ? (
                              <>
                                <Pause className="w-3.5 h-3.5 text-slate-500" />
                                <span>Pause</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-3.5 h-3.5 text-emerald-700" />
                                <span>Unpause</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => handleMarkSold(listing.id)}
                            className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-900 font-semibold rounded-lg border border-purple-200 flex items-center gap-1.5 cursor-pointer min-h-[44px]"
                          >
                            <Trophy className="w-3.5 h-3.5 text-purple-700" />
                            <span>Mark Sold</span>
                          </button>
                        </>
                      )}

                      <button
                        onClick={() => handleDelete(listing.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                        title="Delete listing"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Viewing Requests */}
      {activeTab === 'viewings' && (
        <div className="space-y-4">
          {myViewings.length === 0 && myRequests.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto space-y-3">
              <Calendar className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="text-lg font-bold text-slate-900">No viewings yet</h3>
              <p className="text-xs text-slate-500">
                Requests from buyers for your homes will appear here, and so will the viewings you ask for on other homes.
              </p>
            </div>
          )}

          {myViewings.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-slate-900">Requests for your homes</h2>
              {myViewings.map((viewing) => (
                <div
                  key={viewing.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <div className="text-sm font-bold text-slate-900">
                        {viewing.buyerName} ({viewing.buyerEmail} · {viewing.buyerPhone})
                      </div>
                      <div className="text-xs text-slate-500">{viewing.listingAddress}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          viewing.status === 'confirmed'
                            ? 'bg-emerald-100 text-emerald-900'
                            : viewing.status === 'declined'
                            ? 'bg-rose-100 text-rose-900'
                            : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {viewing.status}
                      </span>
                      <span className="text-xs text-slate-400">
                        Requested {new Date(viewing.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                      <div className="font-semibold text-slate-700">Requested Appointment Time:</div>
                      <div className="text-sm font-bold text-slate-900">
                        {viewing.preferredDate} ({viewing.preferredTimeSlot.toUpperCase()})
                      </div>
                    </div>

                    {viewing.notes && (
                      <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                        <div className="font-semibold text-slate-700">Buyer Notes:</div>
                        <div className="text-slate-600 italic">"{viewing.notes}"</div>
                      </div>
                    )}
                  </div>

                  {/* Actions for seller */}
                  {viewing.status === 'pending' && (
                    <div className="pt-2 flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleViewingStatus(viewing.id, 'declined')}
                        className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-rose-700 rounded-xl min-h-[44px]"
                      >
                        Decline
                      </button>
                      <button
                        onClick={() => handleViewingStatus(viewing.id, 'confirmed')}
                        className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl min-h-[44px] shadow-sm flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Confirm Viewing & Unlock Civic Address</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {myRequests.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-slate-900">Viewings you asked for</h2>
              {myRequests.map((v) => {
                const chip =
                  v.status === 'confirmed'
                    ? { text: 'Confirmed ✓', cls: 'bg-emerald-100 text-emerald-900' }
                    : v.status === 'declined'
                    ? { text: 'Declined / cancelled', cls: 'bg-rose-100 text-rose-900' }
                    : v.status === 'rescheduled'
                    ? { text: 'Updated by homeowner', cls: 'bg-sky-100 text-sky-900' }
                    : v.status === 'completed'
                    ? { text: 'Completed', cls: 'bg-slate-200 text-slate-800' }
                    : { text: 'Waiting for homeowner', cls: 'bg-amber-100 text-amber-900' };
                return (
                  <div key={v.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-bold text-slate-900">{v.listingTitle}</div>
                        <div className="text-xs text-slate-500">{v.listingAddress}</div>
                      </div>
                      <span className={`self-start text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${chip.cls}`}>
                        {chip.text}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl text-sm font-bold text-slate-900">
                      {v.preferredDate} ({v.preferredTimeSlot.toUpperCase()})
                    </div>
                    {v.status === 'confirmed' && (
                      <p className="text-xs text-emerald-900 bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                        The homeowner confirmed this viewing. The exact address is shown above and on the listing page.
                      </p>
                    )}
                    {v.status === 'declined' && (
                      <p className="text-xs text-rose-900 bg-rose-50 border border-rose-100 rounded-xl p-3">
                        This request was declined or cancelled. You can request another time or send a message from the listing page.
                      </p>
                    )}
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onNavigate('detail', v.listingId)}
                        className="px-3 py-2 text-xs font-semibold text-emerald-800 hover:underline min-h-[40px] cursor-pointer"
                      >
                        View listing
                      </button>
                      {(v.status === 'pending' || v.status === 'confirmed') && (
                        <button
                          onClick={() => {
                            if (confirm('Cancel this viewing request?')) handleViewingStatus(v.id, 'declined');
                          }}
                          className="px-3 py-2 text-xs font-semibold text-rose-700 border border-rose-200 hover:bg-rose-50 rounded-xl min-h-[40px] cursor-pointer"
                        >
                          Cancel request
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Messages Inbox */}
      {activeTab === 'messages' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm grid grid-cols-1 md:grid-cols-12 min-h-[500px]">
          {/* Threads list (4 cols) */}
          <div className="md:col-span-4 border-r border-slate-200 overflow-y-auto max-h-[600px] divide-y divide-slate-100">
            {threads.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No conversations yet. Messages you send or receive about a home will appear here.
              </div>
            ) : (
              threads.map((thread) => (
                <button
                  key={thread.id}
                  onClick={() => setSelectedThreadId(thread.id)}
                  className={`w-full text-left p-4 transition-colors cursor-pointer block ${
                    activeThread?.id === thread.id ? 'bg-emerald-50/60' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="font-bold text-sm text-slate-900 truncate flex items-center gap-1.5">
                      {thread.unreadCount > 0 && <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0" aria-label="Unread" />}
                      {otherName(thread)}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(thread.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 truncate font-medium">
                    {thread.listingTitle}
                  </div>
                  <div className="text-xs text-slate-400 truncate mt-1">
                    {thread.messages[thread.messages.length - 1]?.content || 'Started chat'}
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Thread messages & reply view (8 cols) */}
          <div className="md:col-span-8 flex flex-col justify-between h-[600px] bg-slate-50/40">
            {activeThread ? (
              <>
                {/* Thread Header */}
                <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-sm text-slate-900">{otherName(activeThread)}</div>
                    <div className="text-xs text-slate-500">
                      About: {activeThread.listingTitle}
                      {activeThread.buyerId !== activeUser.id && activeThread.buyerEmail ? ` · ${activeThread.buyerEmail}` : ''}
                    </div>
                  </div>
                  <button
                    onClick={() => onNavigate('detail', activeThread.listingId)}
                    className="text-xs text-emerald-800 hover:underline font-medium"
                  >
                    View Listing
                  </button>
                </div>

                {/* Messages Body */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3">
                  {activeThread.messages.map((msg) => {
                    const isSellerMe = msg.senderId === activeUser.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isSellerMe ? 'items-end' : 'items-start'}`}
                      >
                        <div className="text-[10px] text-slate-400 mb-0.5 px-1">
                          {msg.senderName} · {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm shadow-sm leading-relaxed ${
                            isSellerMe
                              ? 'bg-emerald-700 text-white rounded-br-none'
                              : 'bg-white text-slate-900 border border-slate-200 rounded-bl-none'
                          }`}
                        >
                          {msg.content}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Reply Input Form */}
                <form
                  onSubmit={(e) => handleSendReply(e, activeThread)}
                  className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
                >
                  <input
                    type="text"
                    placeholder={`Reply to ${otherName(activeThread)}...`}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="flex-1 px-4 py-2.5 bg-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white"
                  />
                  <button
                    type="submit"
                    disabled={!replyText.trim()}
                    className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white font-semibold text-sm rounded-xl min-h-[44px] flex items-center gap-1.5"
                  >
                    <Send className="w-4 h-4" />
                    <span>Send</span>
                  </button>
                </form>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                Select a conversation thread to view messages
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
