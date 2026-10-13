import React, { useState, useEffect } from 'react';
import { Listing, ViewingRequest, ConversationThread, UserProfile } from '../types/listing';
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

interface DashboardPageProps {
  activeUser: UserProfile;
  onNavigate: (tab: string, listingId?: string) => void;
  onEditListing: (listing: Listing) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  activeUser,
  onNavigate,
  onEditListing
}) => {
  const [activeTab, setActiveTab] = useState<'listings' | 'viewings' | 'messages'>('listings');
  const [listings, setListings] = useState<Listing[]>([]);
  const [viewings, setViewings] = useState<ViewingRequest[]>([]);
  const [threads, setThreads] = useState<ConversationThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = () => {
      setListings(db.getListings());
      setViewings(db.getViewingRequests());
      setThreads(db.getThreads().filter((t) => t.sellerId === activeUser.id));
    };
    load();
    void db.refresh();
    const unsub = db.subscribe(load);
    return unsub;
  }, [activeUser.id, activeUser.role]);

  // RLS Enforced: Sellers see their own listings in the portal; admins see all
  const myListings = listings.filter((l) => l.userId === activeUser.id);
  const myListingIds = new Set(myListings.map((l) => l.id));
  const myViewings = viewings.filter((v) => myListingIds.has(v.listingId));

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
            <span>Direct Homeowner Control Center</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 tracking-tight">
            Seller Dashboard
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
            <span>Buyer Messages</span>
            <MessageSquare className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 tabular-nums">
            {threads.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Active conversation threads</div>
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
          My Listings ({myListings.length})
        </button>

        <button
          onClick={() => setActiveTab('viewings')}
          className={`px-4 py-2 text-sm font-semibold rounded-xl transition-colors cursor-pointer min-h-[44px] flex items-center gap-1.5 ${
            activeTab === 'viewings'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <span>Viewing Requests ({myViewings.length})</span>
          {pendingViewings > 0 && (
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
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
          Buyer Messages ({threads.length})
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
          {myViewings.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto space-y-3">
              <Calendar className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="text-lg font-bold text-slate-900">No viewing requests yet</h3>
              <p className="text-xs text-slate-500">
                When interested buyers request a walk-through, their appointment requests will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
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
        </div>
      )}

      {/* TAB 3: Messages Inbox */}
      {activeTab === 'messages' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm grid grid-cols-1 md:grid-cols-12 min-h-[500px]">
          {/* Threads list (4 cols) */}
          <div className="md:col-span-4 border-r border-slate-200 overflow-y-auto max-h-[600px] divide-y divide-slate-100">
            {threads.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No active buyer conversations yet.
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
                    <span className="font-bold text-sm text-slate-900 truncate">
                      {thread.buyerName}
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
                    <div className="font-bold text-sm text-slate-900">{activeThread.buyerName}</div>
                    <div className="text-xs text-slate-500">{activeThread.buyerEmail}</div>
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
                    const isSellerMe = msg.senderRole === 'seller';
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
                    placeholder={`Reply to ${activeThread.buyerName}...`}
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
