import React, { useEffect, useRef, useState } from 'react';
import { Check, Mail, MessageCircle, Smartphone, X } from 'lucide-react';
import type { Listing } from '../types/listing';
import { communityPost, FACEBOOK_GROUPS_URL, postShareLinks, type ShareChannel } from '../lib/sharePosts';
import { trackEvent } from '../lib/analytics';

/** Shown once per listing, the first time the seller opens their dashboard after it goes live. */
const seenKey = (id: string) => `om-share-prompt:${id}`;

export function sharePromptSeen(id: string): boolean {
  try {
    return localStorage.getItem(seenKey(id)) !== null;
  } catch {
    return true; // no storage (private window): don't nag on every visit
  }
}

function markSeen(id: string) {
  try {
    localStorage.setItem(seenKey(id), new Date().toISOString());
  } catch {
    /* ignore */
  }
}

const pill =
  'inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-[15px] font-semibold border-[1.5px] min-h-[48px] cursor-pointer';

export const SharePromptModal: React.FC<{ listing: Listing; onClose: () => void }> = ({ listing, onClose }) => {
  const post = communityPost(listing);
  const links = postShareLinks(listing);
  const [copied, setCopied] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const photo = listing.photos[0]?.url || listing.photos[0]?.thumbnailUrl;

  const closeFn = useRef(onClose);
  closeFn.current = onClose;

  useEffect(() => {
    markSeen(listing.id);
    trackEvent('share_prompt_shown');
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeFn.current();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [listing.id]);

  const shared = (channel: ShareChannel) => trackEvent('share_listing', { channel, from: 'live_prompt' });

  const copy = (text: string) => {
    // Starts inside the click, so the browser allows it
    navigator.clipboard?.writeText(text).catch(() => window.prompt('Copy your post:', text));
    setCopied(true);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 flex items-end sm:items-center justify-center sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-prompt-title"
        className="relative outline-none bg-white text-slate-900 w-full sm:max-w-[760px] max-h-[94vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl shadow-2xl grid sm:grid-cols-[300px_1fr]"
      >
        <div
          className="relative h-40 sm:h-auto bg-slate-200 bg-cover bg-center"
          style={photo ? { backgroundImage: `url(${photo})` } : undefined}
          aria-hidden="true"
        >
          <span className="absolute left-3.5 bottom-3.5 inline-flex items-center gap-1.5 bg-white rounded-full px-3 py-1.5 text-[13px] font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-600" /> Live now
          </span>
        </div>

        <div className="p-6 sm:p-7 flex flex-col gap-3.5">
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-3 right-3 w-10 h-10 rounded-full bg-white/90 flex items-center justify-center text-slate-500 hover:text-slate-900 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <p className="text-[12px] font-bold tracking-[0.06em] uppercase text-emerald-700">🎉 Your home is live</p>
          <h2 id="share-prompt-title" className="text-[28px] font-semibold leading-[1.1] tracking-[-0.02em]">
            Now tell your neighbours
          </h2>
          <p className="text-[15px] text-slate-600 leading-relaxed">
            Share it in your town’s community groups and with friends today. We wrote your post, so it takes 30 seconds.
          </p>
          <pre className="whitespace-pre-wrap font-[inherit] text-[14px] leading-relaxed bg-slate-50 border-[1.5px] border-slate-200 rounded-xl px-4 py-3 max-h-44 overflow-y-auto">
            {post}
          </pre>
          <div className="flex flex-wrap gap-2.5">
            <a
              href={FACEBOOK_GROUPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                copy(post);
                shared('community');
              }}
              className={`${pill} bg-[#1877F2] border-[#1877F2] text-white hover:bg-[#166FE5]`}
            >
              {copied ? <Check className="w-4 h-4" aria-hidden="true" /> : null}
              Copy post &amp; open Facebook
            </a>
            <a href={links.whatsapp} target="_blank" rel="noopener noreferrer" onClick={() => shared('whatsapp')} className={`${pill} bg-white border-slate-300 hover:bg-slate-50`}>
              <MessageCircle className="w-4 h-4 text-emerald-600" aria-hidden="true" /> WhatsApp
            </a>
            <a href={links.sms} onClick={() => shared('sms')} className={`${pill} bg-white border-slate-300 hover:bg-slate-50`}>
              <Smartphone className="w-4 h-4 text-slate-500" aria-hidden="true" /> Text
            </a>
            <a href={links.email} onClick={() => shared('email')} className={`${pill} bg-white border-slate-300 hover:bg-slate-50`}>
              <Mail className="w-4 h-4 text-slate-500" aria-hidden="true" /> Email
            </a>
          </div>
          <p className="text-[13px] text-slate-600" aria-live="polite">
            {copied ? (
              <span className="font-semibold text-emerald-800">Post copied. In your group, tap “Write something”, paste it and add 3 or 4 photos.</span>
            ) : (
              <>Your street address and phone number aren’t included. </>
            )}{' '}
            <button onClick={onClose} className="underline underline-offset-2 cursor-pointer">
              {copied ? 'Done' : 'I’ll do it later'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
