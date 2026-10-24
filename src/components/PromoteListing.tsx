import React, { useEffect, useState } from 'react';
import { Check, Copy, Mail, Megaphone, MessageCircle, Share2, Smartphone } from 'lucide-react';
import type { Listing } from '../types/listing';
import { ShareChannel, shareLinks, shareUrl } from '../lib/sharePosts';
import { trackEvent } from '../lib/analytics';

const btn =
  'px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 font-semibold rounded-lg border border-slate-300 inline-flex items-center gap-1.5 cursor-pointer min-h-[40px]';

/** Small dashboard row: a call to action and one-tap share buttons for a live listing. */
export const PromoteListing: React.FC<{ listing: Listing }> = ({ listing }) => {
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  useEffect(() => setCanNativeShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function'), []);

  const shared = (channel: ShareChannel) => trackEvent('share_listing', { channel });
  const links = shareLinks(listing);

  const copyLink = async () => {
    const url = shareUrl(listing.id, 'copy');
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt('Copy your listing link:', url);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
    shared('copy');
  };

  const nativeShare = async () => {
    try {
      await navigator.share({ title: listing.headline, url: shareUrl(listing.id, 'native') });
      shared('native');
    } catch {
      /* cancelled */
    }
  };

  return (
    <div className="px-5 py-4 border-t border-slate-100 bg-white text-xs space-y-2.5">
      <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
        <Megaphone className="w-4 h-4 text-emerald-700" aria-hidden="true" />
        <span>Share your listing to reach more buyers</span>
      </div>
      <p className="text-slate-600 leading-relaxed">
        Post it in your local Facebook groups and send it to friends and neighbours. Your exact address and phone number aren’t included.
      </p>
      <div className="flex flex-wrap gap-2">
        <a href={links.facebook} target="_blank" rel="noopener noreferrer" onClick={() => shared('facebook')} className={btn}>
          <Share2 className="w-3.5 h-3.5 text-[#1877F2]" aria-hidden="true" /> Facebook
        </a>
        <a href={links.whatsapp} target="_blank" rel="noopener noreferrer" onClick={() => shared('whatsapp')} className={btn}>
          <MessageCircle className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" /> WhatsApp
        </a>
        <a href={links.sms} onClick={() => shared('sms')} className={btn}>
          <Smartphone className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" /> Text
        </a>
        <a href={links.email} onClick={() => shared('email')} className={btn}>
          <Mail className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" /> Email
        </a>
        <button type="button" onClick={copyLink} className={btn}>
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" /> : <Copy className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />}
          {copied ? 'Link copied' : 'Copy link'}
        </button>
        {canNativeShare && (
          <button type="button" onClick={nativeShare} className={btn}>
            <Share2 className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" /> More
          </button>
        )}
      </div>
    </div>
  );
};
