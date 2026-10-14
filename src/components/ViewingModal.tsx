import React, { useState } from 'react';
import { Listing, UserProfile } from '../types/listing';
import { db } from '../lib/db';
import { Calendar, Clock, X, CheckCircle2, ShieldCheck, Mail, AlertCircle } from 'lucide-react';
import { stripHtml, validateEmail, validatePhone } from '../lib/security';

interface ViewingModalProps {
  listing: Listing;
  activeUser: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ViewingModal: React.FC<ViewingModalProps> = ({
  listing,
  activeUser,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [preferredDate, setPreferredDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  });
  const [preferredTimeSlot, setPreferredTimeSlot] = useState<'morning' | 'afternoon' | 'evening'>('afternoon');
  const [buyerName, setBuyerName] = useState(activeUser.name || '');
  const [buyerEmail, setBuyerEmail] = useState(activeUser.email || '');
  const [buyerPhone, setBuyerPhone] = useState(activeUser.phone || '');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      if (activeUser.name) setBuyerName(activeUser.name);
      if (activeUser.email) setBuyerEmail(activeUser.email);
      if (activeUser.phone) setBuyerPhone(activeUser.phone);
      setSubmitted(false);
      setErrorMsg(null);
    }
  }, [isOpen, activeUser]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validate inputs
    const cleanName = stripHtml(buyerName);
    const cleanEmail = stripHtml(buyerEmail);
    const cleanPhone = stripHtml(buyerPhone);
    const cleanNotes = stripHtml(notes);

    if (!cleanName || !cleanEmail || !cleanPhone) {
      setErrorMsg('Please complete all contact fields.');
      return;
    }

    if (!validateEmail(cleanEmail)) {
      setErrorMsg('Please enter a valid email address for confirmation.');
      return;
    }

    if (!validatePhone(cleanPhone)) {
      setErrorMsg('Please enter a valid 10-digit Canadian phone number.');
      return;
    }

    setSubmitting(true);
    try {
      // Rate limits (6 per hour) are enforced by the server, not the browser.
      await db.addViewingRequest({
        listingId: listing.id,
        buyerName: cleanName,
        buyerEmail: cleanEmail,
        buyerPhone: cleanPhone,
        preferredDate,
        preferredTimeSlot,
        notes: cleanNotes
      });
      setSubmitted(true);
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Your request could not be sent. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Request a Private Viewing</h3>
            <p className="text-xs text-slate-500 truncate max-w-xs">{listing.headline}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-xl font-bold text-slate-900">Viewing Request Sent!</h4>
            <p className="text-sm text-slate-600 max-w-sm mx-auto leading-relaxed">
              Your request was sent to the homeowner. Once they confirm a time, the exact street address will appear on this listing and in your viewing details.
            </p>
            <div className="pt-2">
              <button
                onClick={onClose}
                className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl transition-colors min-h-[44px]"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* DirectHome zero-commission reminder */}
            <div className="bg-emerald-50 text-emerald-900 p-3 rounded-xl text-xs flex items-center gap-2 border border-emerald-200/80">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>DirectHome connects you directly with the verified homeowner with zero broker pressure.</span>
            </div>

            {/* Date selection */}
            <div>
              <label htmlFor="viewing-preferred-date" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Preferred Date
              </label>
              <div className="relative">
                <input
                  id="viewing-preferred-date"
                  type="date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>
            </div>

            {/* Time Slot */}
            <div>
              <span className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Preferred Time of Day
              </span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'morning', label: 'Morning', time: '9am - 12pm' },
                  { id: 'afternoon', label: 'Afternoon', time: '12pm - 4pm' },
                  { id: 'evening', label: 'Evening', time: '4pm - 7pm' }
                ].map((slot) => (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => setPreferredTimeSlot(slot.id as any)}
                    className={`p-2.5 rounded-xl text-xs border text-center transition-all cursor-pointer min-h-[44px] ${
                      preferredTimeSlot === slot.id
                        ? 'border-emerald-700 bg-emerald-50 text-emerald-900 font-semibold ring-1 ring-emerald-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-semibold">{slot.label}</div>
                    <div className="text-[10px] text-slate-500">{slot.time}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Contact details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="viewing-buyer-name" className="block text-xs font-semibold text-slate-700 mb-1">Your Full Name</label>
                <input
                  id="viewing-buyer-name"
                  type="text"
                  required
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>
              <div>
                <label htmlFor="viewing-buyer-phone" className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                <input
                  id="viewing-buyer-phone"
                  type="tel"
                  required
                  value={buyerPhone}
                  onChange={(e) => setBuyerPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>
            </div>

            <div>
              <label htmlFor="viewing-buyer-email" className="block text-xs font-semibold text-slate-700 mb-1">Email for Confirmation</label>
              <input
                id="viewing-buyer-email"
                type="email"
                required
                value={buyerEmail}
                onChange={(e) => setBuyerEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="viewing-buyer-notes" className="block text-xs font-semibold text-slate-700 mb-1">
                Note for Homeowner (Optional)
              </label>
              <textarea
                id="viewing-buyer-notes"
                rows={2}
                placeholder="e.g., Pre-approved buyer, flexible on schedule, have a question about the lot..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
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



            {/* Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-900 rounded-xl min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] text-white font-semibold text-sm rounded-xl transition-all shadow-sm min-h-[44px] flex items-center gap-2 cursor-pointer"
              >
                {submitting ? 'Sending...' : 'Send Viewing Request'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
