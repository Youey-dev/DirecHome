import React, { useState } from 'react';
import { Listing, ListingReport } from '../types/listing';
import { storage } from '../lib/storage';
import { X, AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';
import { TurnstileBadge } from './TurnstileBadge';
import { stripHtml, validateEmail, checkActionRateLimit, recordActionRateLimit } from '../lib/security';

interface ReportModalProps {
  listing: Listing;
  isOpen: boolean;
  onClose: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({ listing, isOpen, onClose }) => {
  const [reason, setReason] = useState<ListingReport['reason']>('incorrect_info');
  const [details, setDetails] = useState('');
  const [reporterEmail, setReporterEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanDetails = stripHtml(details);
    const cleanEmail = reporterEmail ? stripHtml(reporterEmail) : '';

    if (!cleanDetails || cleanDetails.length < 10) {
      setErrorMsg('Please provide a short explanation (at least 10 characters).');
      return;
    }

    if (cleanEmail && !validateEmail(cleanEmail)) {
      setErrorMsg('Please provide a valid email format or leave it blank.');
      return;
    }

    // Rate-limiting check: max 5 reports per hour per IP/client
    const rateCheck = checkActionRateLimit('directhome_reports_rate_v1', 5);
    if (!rateCheck.allowed) {
      setErrorMsg(`To prevent abuse, reports are limited to 5 per hour. Please wait ${rateCheck.resetMinutes} minutes.`);
      return;
    }

    recordActionRateLimit('directhome_reports_rate_v1');

    storage.submitReport({
      listingId: listing.id,
      listingTitle: listing.headline,
      reporterEmail: cleanEmail || 'anonymous@buyer.ca',
      reason,
      details: cleanDetails
    });
    setSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200">
        
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-rose-700 font-bold">
            <AlertTriangle className="w-5 h-5" />
            <span>Report This Listing</span>
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
            <h4 className="text-lg font-bold text-slate-900">Report Received</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Thank you for helping keep DirectHome BC safe. Our compliance officers will audit the land title and ownership documents for this property.
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
              <label htmlFor="report-reason-select" className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
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
                Details or Explanation
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

            <div>
              <label htmlFor="report-email" className="block text-xs font-semibold text-slate-700 mb-1">
                Your Email (optional, for follow-up)
              </label>
              <input
                id="report-email"
                type="email"
                placeholder="your.email@example.ca"
                value={reporterEmail}
                onChange={(e) => setReporterEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Cloudflare Turnstile Bot Challenge */}
            <div className="pt-1">
              <TurnstileBadge action="report_listing" />
            </div>

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
                className="px-5 py-2.5 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-sm font-semibold min-h-[44px]"
              >
                Submit Report
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
