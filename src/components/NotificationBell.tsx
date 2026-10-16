import React, { useEffect, useRef, useState } from 'react';
import { Bell, CalendarCheck, CalendarX, CheckCheck, FileCheck2, FileWarning, Flag, MessageSquare, ShieldCheck } from 'lucide-react';
import { db } from '../lib/db';
import type { AppNotification } from '../types/listing';

interface NotificationBellProps {
  onOpenNotification: (n: AppNotification) => void;
}

const timeAgo = (iso: string): string => {
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'yesterday' : `${days} days ago`;
};

export const notificationIcon = (type: string) => {
  switch (type) {
    case 'new_message':
      return <MessageSquare className="w-4 h-4 text-sky-600" />;
    case 'viewing_confirmed':
    case 'listing_live':
      return type === 'listing_live' ? (
        <FileCheck2 className="w-4 h-4 text-emerald-600" />
      ) : (
        <CalendarCheck className="w-4 h-4 text-emerald-600" />
      );
    case 'viewing_declined':
    case 'viewing_cancelled':
      return <CalendarX className="w-4 h-4 text-rose-600" />;
    case 'listing_rejected':
    case 'listing_paused_admin':
    case 'listing_deleted_admin':
      return <FileWarning className="w-4 h-4 text-amber-600" />;
    case 'listing_in_review':
    case 'listing_rereview':
      return <ShieldCheck className="w-4 h-4 text-violet-600" />;
    case 'new_report':
      return <Flag className="w-4 h-4 text-rose-600" />;
    default:
      return <CalendarCheck className="w-4 h-4 text-slate-500" />;
  }
};

export const NotificationBell: React.FC<NotificationBellProps> = ({ onOpenNotification }) => {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>(db.getNotifications());
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sync = () => setItems([...db.getNotifications()]);
    sync();
    return db.subscribe(sync);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const unread = items.filter((n) => !n.read).length;
  const visible = items.slice(0, 12);

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-expanded={open}
        className="relative p-2.5 rounded-xl text-slate-600 hover:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[min(92vw,380px)] bg-white rounded-2xl shadow-2xl border border-slate-200 z-[70] overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Notifications</h3>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => void db.markAllNotificationsRead()}
                className="text-xs font-semibold text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-[60vh] overflow-y-auto divide-y divide-slate-100">
            {visible.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-slate-500">
                You’re all caught up. New messages and viewing updates will appear here.
              </div>
            ) : (
              visible.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    void db.markNotificationRead(n.id);
                    onOpenNotification(n);
                  }}
                  className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-slate-50 cursor-pointer ${
                    n.read ? '' : 'bg-emerald-50/50'
                  }`}
                >
                  <span className="mt-0.5 shrink-0 w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center">
                    {notificationIcon(n.type)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                      <span className={`text-[13px] ${n.read ? 'text-slate-700' : 'font-bold text-slate-900'}`}>{n.title}</span>
                      {!n.read && <span className="mt-1 w-2 h-2 rounded-full bg-emerald-600 shrink-0" aria-label="Unread" />}
                    </span>
                    <span className="block text-xs text-slate-600 line-clamp-2 mt-0.5">{n.body}</span>
                    <span className="block text-[10px] text-slate-400 mt-1">{timeAgo(n.createdAt)}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
