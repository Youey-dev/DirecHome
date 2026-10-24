import React, { useEffect, useState } from 'react';
import { Check, ChevronDown, Copy, Mail, Megaphone, MessageCircle, Share2, Smartphone } from 'lucide-react';
import type { Listing } from '../types/listing';
import {
  REPOST_DAYS,
  SHARE_PLACES,
  ShareChannel,
  friendMessage,
  groupPost,
  marketplacePost,
  readShareState,
  shareLinks,
  shareNudge,
  shareUrl,
  writeShareState,
} from '../lib/sharePosts';
import { trackEvent } from '../lib/analytics';

type Tab = 'group' | 'marketplace' | 'friends';

const btn =
  'px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 font-semibold rounded-lg border border-slate-300 inline-flex items-center gap-1.5 cursor-pointer min-h-[44px]';

/**
 * Dashboard panel that makes sharing a live listing quick: ready-made posts, one-tap share
 * buttons, a checklist of places to share, and a weekly "share it again" reminder.
 */
export const PromoteListing: React.FC<{ listing: Listing }> = ({ listing }) => {
  const [state, setState] = useState(() => readShareState(listing.id));
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('group');
  const [copied, setCopied] = useState<string | null>(null);
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    setCanNativeShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
  }, []);

  const nudge = shareNudge(state.lastSharedAt);
  // Open the panel by itself when a share is due, so the reminder can't be missed
  useEffect(() => {
    if (nudge.due) setOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = (next: typeof state) => {
    setState(next);
    writeShareState(listing.id, next);
  };
  const markShared = (channel: ShareChannel | string) => {
    save({ ...state, lastSharedAt: new Date().toISOString() });
    trackEvent('share_listing', { channel });
  };
  const togglePlace = (key: string) => {
    const has = state.done.includes(key);
    save({
      done: has ? state.done.filter((k) => k !== key) : [...state.done, key],
      lastSharedAt: has ? state.lastSharedAt : new Date().toISOString(),
    });
    if (!has) trackEvent('share_listing', { channel: key });
  };

  const copy = async (id: string, text: string, channel: ShareChannel) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Older browsers: select-and-copy fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
      } catch {
        /* the text is still visible to copy by hand */
      }
      ta.remove();
    }
    setCopied(id);
    setTimeout(() => setCopied((c) => (c === id ? null : c)), 2500);
    markShared(channel);
  };

  const nativeShare = async () => {
    try {
      await navigator.share({ title: listing.headline, text: friendMessage(listing, 'native').replace(/ https?:\S+$/, ''), url: shareUrl(listing.id, 'native') });
      markShared('native');
    } catch {
      /* cancelled */
    }
  };

  const links = shareLinks(listing);
  const mp = marketplacePost(listing);
  const posts: Record<Tab, { label: string; text: string; channel: ShareChannel; hint: string }> = {
    group: {
      label: 'Facebook group post',
      text: groupPost(listing),
      channel: 'facebook',
      hint: 'Paste this in local buy-and-sell and community groups, or on your own page. Facebook shows your cover photo from the link.',
    },
    marketplace: {
      label: 'Marketplace / Kijiji',
      text: `${mp.title}\n\n${mp.body}`,
      channel: 'marketplace',
      hint: 'Use the first line as the title and the rest as the description. Add 5–10 of your best photos there too. If a site removes links, write “Find it on ownersmarket.ca” instead.',
    },
    friends: {
      label: 'Message to friends',
      text: friendMessage(listing, 'copy'),
      channel: 'copy',
      hint: 'For family, friends, neighbours and coworkers. Ask them to pass it on.',
    },
  };
  const post = posts[tab];
  const placesDone = SHARE_PLACES.filter((p) => state.done.includes(p.key)).length;

  return (
    <div className={`px-5 py-3 border-t text-xs ${nudge.due ? 'bg-amber-50/60 border-amber-200' : 'bg-white border-slate-100'}`}>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="w-full flex items-center gap-3 min-h-[44px] cursor-pointer text-left">
        <Megaphone className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
        <span className="text-sm font-bold text-slate-900">Share your listing</span>
        <span className={`flex-1 ${nudge.due ? 'text-amber-900 font-semibold' : 'text-slate-500'}`}>
          {nudge.days === null
            ? 'Not shared yet: start with 2–3 local Facebook groups'
            : nudge.due
              ? `Last shared ${nudge.days} days ago. Time to share it again`
              : `Shared ${nudge.days === 0 ? 'today' : nudge.days === 1 ? 'yesterday' : `${nudge.days} days ago`} · ${placesDone} of ${SHARE_PLACES.length} places`}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {open && (
        <div className="pt-2 pb-2 space-y-4">
          <p className="text-slate-600 leading-relaxed">
            Most private sales start with someone local. Sharing your listing where your neighbours already look is free and brings more views. Your
            exact address and phone number are never in these posts: buyers message you on OwnersMarket.
          </p>

          {/* One-tap share */}
          <div className="flex flex-wrap gap-2">
            <a href={links.facebook} target="_blank" rel="noopener noreferrer" onClick={() => markShared('facebook')} className={btn}>
              <Share2 className="w-3.5 h-3.5 text-[#1877F2]" aria-hidden="true" /> Share on Facebook
            </a>
            <a href={links.whatsapp} target="_blank" rel="noopener noreferrer" onClick={() => markShared('whatsapp')} className={btn}>
              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" /> WhatsApp
            </a>
            <a href={links.sms} onClick={() => markShared('sms')} className={btn}>
              <Smartphone className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" /> Text message
            </a>
            <a href={links.email} onClick={() => markShared('email')} className={btn}>
              <Mail className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" /> Email
            </a>
            <button type="button" onClick={() => copy('link', shareUrl(listing.id, 'copy'), 'copy')} className={btn}>
              {copied === 'link' ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              {copied === 'link' ? 'Link copied' : 'Copy link'}
            </button>
            {canNativeShare && (
              <button type="button" onClick={nativeShare} className={btn}>
                <Share2 className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" /> More…
              </button>
            )}
          </div>
          <p className="text-slate-500 leading-relaxed -mt-2">
            On Facebook, choose <b>Share to a group</b> in the share window to post straight into a group you’re in.
          </p>

          {/* Ready-made posts */}
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <div className="flex overflow-x-auto bg-slate-50 border-b border-slate-200" role="tablist">
              {(Object.keys(posts) as Tab[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={tab === t}
                  onClick={() => setTab(t)}
                  className={`shrink-0 px-3 py-2.5 font-semibold min-h-[44px] cursor-pointer ${
                    tab === t ? 'bg-white text-emerald-800 border-b-2 border-emerald-700' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {posts[t].label}
                </button>
              ))}
            </div>
            <div className="p-3 space-y-2 bg-white">
              <p className="text-slate-600 leading-relaxed">{post.hint}</p>
              <textarea
                readOnly
                value={post.text}
                rows={Math.min(14, post.text.split("\n").length + 3)}
                onFocus={(e) => e.currentTarget.select()}
                aria-label={post.label}
                className="w-full p-3 rounded-lg border border-slate-200 bg-slate-50 text-[13px] leading-relaxed text-slate-800 font-sans resize-none"
              />
              <button
                type="button"
                onClick={() => copy(tab, post.text, post.channel)}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer min-h-[44px]"
              >
                {copied === tab ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied === tab ? 'Copied: now paste it' : 'Copy text'}
              </button>
            </div>
          </div>

          {/* Where to share */}
          <div>
            <div className="text-sm font-bold text-slate-900 mb-1">Where to share</div>
            <ul className="space-y-0.5">
              {SHARE_PLACES.map((p) => (
                <li key={p.key}>
                  <label className="flex items-start gap-3 cursor-pointer py-1.5 min-h-[40px]">
                    <input
                      type="checkbox"
                      checked={state.done.includes(p.key)}
                      onChange={() => togglePlace(p.key)}
                      className="mt-0.5 w-[18px] h-[18px] accent-emerald-700 shrink-0"
                    />
                    <span>
                      <span className={state.done.includes(p.key) ? 'text-slate-500 line-through' : 'text-slate-800 font-medium'}>{p.label}</span>
                      {p.tip && <span className="block text-slate-500">{p.tip}</span>}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-slate-500 leading-relaxed">
            <b>Tips:</b> share again about once a week ({REPOST_DAYS} days), since group posts get buried; we’ll remind you here. Reply to comments
            quickly, and invite people to message you through the listing rather than sharing your phone number.
          </p>
        </div>
      )}
    </div>
  );
};
