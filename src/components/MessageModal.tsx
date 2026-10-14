import React, { useState, useEffect, useRef } from 'react';
import { Listing, UserProfile, ConversationThread } from '../types/listing';
import { db } from '../lib/db';
import { Send, X, ShieldAlert, Sparkles, AlertCircle } from 'lucide-react';
import { stripHtml } from '../lib/security';

interface MessageModalProps {
  listing: Listing;
  activeUser: UserProfile;
  isOpen: boolean;
  onClose: () => void;
}

export const MessageModal: React.FC<MessageModalProps> = ({
  listing,
  activeUser,
  isOpen,
  onClose
}) => {
  const [inputText, setInputText] = useState('');
  const [threads, setThreads] = useState<ConversationThread[]>([]);
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const unsub = db.subscribe(() => setThreads(db.getThreads()));
    setThreads(db.getThreads());
    void db.refresh();
    return unsub;
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [threads]);

  const currentThread = threads.find((t) => t.listingId === listing.id && t.buyerId === activeUser.id);

  // Mark the homeowner's replies as read once the buyer opens the conversation
  useEffect(() => {
    if (isOpen && currentThread && currentThread.unreadCount > 0) void db.markThreadRead(currentThread.id);
  }, [isOpen, currentThread?.id, currentThread?.unreadCount]);

  // IMPORTANT: every hook must run before this line, otherwise React crashes when the window opens
  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanText = stripHtml(inputText);
    if (!cleanText || sending) return;

    setSending(true);
    setRateLimitError(null);
    try {
      // Spam limits (5 new conversations per hour) are enforced by the server.
      await db.sendMessageToSeller(listing, cleanText);
      setInputText('');
    } catch (err: any) {
      setRateLimitError(err.message || 'Your message could not be sent. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-lg w-full h-[600px] flex flex-col overflow-hidden shadow-2xl border border-slate-200">
        
        {/* Header */}
        <div className="px-6 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center text-sm shadow-sm">
              {(listing.sellerName || 'H').charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>{listing.sellerName}</span>
                <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                  Homeowner
                </span>
              </div>
              <div className="text-xs text-slate-500 truncate max-w-[220px]">
                {listing.neighborhood}, {listing.city}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Rate limit status alert if approaching limit */}
        {!currentThread && (
          <div className="px-4 py-2 bg-slate-100/80 border-b border-slate-200 text-[11px] text-slate-600 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-slate-500" />
              <span>Messages go directly to the homeowner. To prevent spam, new conversations are limited to 5 per hour.</span>
            </span>
          </div>
        )}

        {rateLimitError && (
          <div className="p-3 bg-rose-50 border-b border-rose-200 text-xs text-rose-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <p>{rateLimitError}</p>
          </div>
        )}

        {/* Messages Body */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/50">
          {(!currentThread || currentThread.messages.length === 0) ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="text-sm font-semibold text-slate-700">Start a direct conversation</div>
              <p className="text-xs text-slate-500 max-w-xs">
                Ask about heating bills, recent upgrades, strata rules, or preferred possession dates directly.
              </p>
            </div>
          ) : (
            currentThread.messages.map((msg) => {
              const isMe = msg.senderId === activeUser.id;

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <div className="text-[10px] text-slate-400 mb-1 px-1">
                    {msg.senderName} · {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                      isMe
                        ? 'bg-emerald-700 text-white rounded-br-none'
                        : 'bg-white text-slate-900 border border-slate-200 rounded-bl-none'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Active Account Identity */}
        <div className="px-4 py-1.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5 truncate">
            <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0"></span>
            <span>Sending as: <strong className="text-slate-800">{activeUser.name}</strong> ({activeUser.email || 'Verified Account'})</span>
          </span>
          <span className="text-[10px] text-slate-400 shrink-0">Direct to Owner</span>
        </div>

        {/* Input Footer */}
        <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
          <input
            type="text"
            placeholder={`Message ${listing.sellerName}...`}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 px-4 py-2.5 bg-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white transition-all min-h-[44px]"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || sending}
            className="w-11 h-11 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white flex items-center justify-center transition-all cursor-pointer shrink-0"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
