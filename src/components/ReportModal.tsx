import React, { useState } from 'react';
import { Listing, ListingReport } from '../types/listing';
import { db } from '../lib/db';
import { X, AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';
import { stripHtml } from '../lib/security';

interface ReportModalProps {
  listing: Listing;
  isOpen: boolean;
  onClose: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({ listing, isOpen, onClose }) => {
  const [reason, setReason] = useState<ListingReport['reason']>('incorrect_info');
  const [details, setDetails] = useState('');
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanDetails = stripHtml(details);
    if (!cleanDetails || cleanDetails.length < 10) {
      setErrorMsg('Please provide a short explanation (at least 10 characters).');
      return;
    }

    setSending(true);
    try {
      // Reports require a signed-in account and are limited to 5 per hour by the server.
      await db.submitReport({ listingId: listing.id, reason, details: cleanDetails.slice(0, 2000) });
      setSubmitted(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Your report could not be sent. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200">
        
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-rose-700 font-bold">
            <AlertTriangle className="w-5 h-5" />
            <span>Report this listing</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="p-6 text-center space-y-3">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-slate-900">Report received</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Thank you for helping keep OwnersMarket safe. Our team will review this listing.
            </p>
            <button
              onClick={onClose}
              className="mt-4 w-full py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label htmlFor="report-reason-select" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Reason for report
              </label>
              <select
                id="report-reason-select"
                value={reason}
                onChange={(e) => setReason(e.target.value as any)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
              >
                <option value="incorrect_info">Incorrect price, address, or details</option>
                <option value="not_homeowner">I suspect the seller is not the registered owner</option>
                <option value="inappropriate_photos">Misleading, blurry, or unauthorized photos</option>
                <option value="scam_suspected">Suspected fraudulent or duplicate listing</option>
                <option value="already_sold">This property has already sold</option>
                <option value="other">Other issue</option>
              </select>
            </div>

            <div>
              <label htmlFor="report-explanation" className="block text-xs font-semibold text-slate-700 mb-1">
                Details or explanation
              </label>
              <textarea
                id="report-explanation"
                required
                rows={3}
                placeholder="Please describe why this listing should be reviewed..."
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700 placeholder:text-slate-400"
              />
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={sending}
                className="px-5 py-2.5 bg-rose-700 hover:bg-rose-800 disabled:opacity-60 text-white rounded-xl text-sm font-semibold min-h-[44px]"
              >
                {sending ? 'Sending…' : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
