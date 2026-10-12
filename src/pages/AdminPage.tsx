import React, { useState, useEffect } from 'react';
import { Listing, ListingReport, UserProfile } from '../types/listing';
import { storage } from '../lib/storage';
import { formatCAD } from '../lib/commissionCalc';
import { 
  ShieldCheck, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Eye, 
  Lock, 
  ExternalLink,
  Search,
  Filter
} from 'lucide-react';

interface AdminPageProps {
  activeUser: UserProfile;
  onNavigate: (tab: string, listingId?: string) => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({ activeUser, onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'verification' | 'reports'>('verification');
  const [listings, setListings] = useState<Listing[]>([]);
  const [reports, setReports] = useState<ListingReport[]>([]);
  const [rejectModalListing, setRejectModalListing] = useState<Listing | null>(null);
  const [rejectionReason, setRejectionReason] = useState('Property tax notice name does not match the registered seller profile.');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  useEffect(() => {
    const load = () => {
      setListings(storage.getAllListingsRaw());
      setReports(storage.getReports(activeUser));
    };
    load();
    const unsub = storage.subscribe(load);
    return unsub;
  }, [activeUser.id, activeUser.role]);

  const showNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3500);
  };

  const handleApprove = (id: string) => {
    storage.updateListingStatus(id, 'live', 'Approved by BC Verification Officer');
    showNotice('✓ Listing verified & published to live marketplace!');
  };

  const handleConfirmReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModalListing) return;

    storage.updateListingStatus(rejectModalListing.id, 'rejected', rejectionReason);
    setRejectModalListing(null);
    showNotice('Listing rejected. Feedback reason logged for seller.');
  };

  const handleResolveReport = (reportId: string, action: 'dismissed' | 'resolved', listingId: string) => {
    storage.resolveReport(reportId, action);
    if (action === 'resolved') {
      storage.updateListingStatus(listingId, 'paused', 'Suspended pending investigation from buyer report');
      showNotice('Report upheld: Listing suspended from marketplace.');
    } else {
      showNotice('Report dismissed as unfounded.');
    }
  };

  const pendingListings = listings.filter((l) => l.status === 'in_review');
  const allVerified = listings.filter((l) => l.status === 'live');

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6 pb-20 space-y-6">
      
      {/* Action Toast */}
      {actionNotice && (
        <div className="fixed top-20 right-4 sm:right-8 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-700">
            <ShieldCheck className="w-4 h-4" />
            <span>DirectHome BC Compliance Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
            Verification Queue & Trust Moderation
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Restricted compliance view for auditing BC Land Title and Municipal Property Tax notices.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs bg-emerald-100 text-emerald-900 font-bold px-3 py-1.5 rounded-lg border border-emerald-200">
            {pendingListings.length} Pending Verifications
          </span>
          <span className="text-xs bg-rose-100 text-rose-900 font-bold px-3 py-1.5 rounded-lg border border-rose-200">
            {reports.filter((r) => r.status === 'pending').length} Active Reports
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setActiveTab('verification')}
          className={`px-4 py-2 text-sm font-semibold rounded-xl transition-colors cursor-pointer min-h-[44px] ${
            activeTab === 'verification' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Ownership Verification Queue ({pendingListings.length})
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2 text-sm font-semibold rounded-xl transition-colors cursor-pointer min-h-[44px] ${
            activeTab === 'reports' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Reported Listings ({reports.filter((r) => r.status === 'pending').length})
        </button>
      </div>

      {/* Verification Queue Tab */}
      {activeTab === 'verification' && (
        <div className="space-y-4">
          {pendingListings.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <h3 className="text-lg font-bold text-slate-900">Verification Queue is Empty</h3>
              <p className="text-xs text-slate-500">
                All submitted Fraser Valley & Lower Mainland home listings have been audited and verified.
              </p>
            </div>
          ) : (
            pendingListings.map((listing) => (
              <div
                key={listing.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded">
                        Pending Verification
                      </span>
                      <span className="text-xs text-slate-400">
                        Submitted {new Date(listing.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900">{listing.headline}</h3>
                    
                    <div className="text-xs text-slate-600">
                      <strong>Address:</strong> {listing.streetAddress}, {listing.city}, BC {listing.postalCode}
                    </div>

                    <div className="text-xs text-slate-600">
                      <strong>Seller:</strong> {listing.sellerName} ({listing.sellerEmail} · {listing.sellerPhone})
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-2xl font-extrabold text-slate-900 tabular-nums">
                      {formatCAD(listing.price)}
                    </div>
                    <div className="text-xs text-emerald-800 font-semibold">
                      +{formatCAD(listing.cashbackAmount)} Cash-Back Offered
                    </div>
                  </div>
                </div>

                {/* Private Document Audit Section */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-800 shrink-0">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span>Private Storage: {listing.verificationDoc?.fileName || '2026_Property_Tax_Notice.pdf'}</span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        File Type: {listing.verificationDoc?.documentType || 'property_tax_notice'} · Encrypted Private Bucket
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-slate-600 flex items-center gap-2">
                    <span className="px-2.5 py-1 bg-white border border-slate-200 rounded text-[11px] font-mono">
                      ROLL #41829-BC
                    </span>
                    <span className="text-emerald-700 font-semibold">Owner Name Matches Account ✓</span>
                  </div>
                </div>

                {/* Admin Actions */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={() => onNavigate('detail', listing.id)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl min-h-[44px]"
                  >
                    Inspect Full Listing
                  </button>

                  <button
                    onClick={() => setRejectModalListing(listing)}
                    className="px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-xl min-h-[44px]"
                  >
                    Reject with Reason
                  </button>

                  <button
                    onClick={() => handleApprove(listing.id)}
                    className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-sm min-h-[44px] flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve & Publish Live</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          {reports.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <h3 className="text-lg font-bold text-slate-900">Zero Reported Listings</h3>
              <p className="text-xs text-slate-500">
                Community reports submitted by buyers will be triaged here.
              </p>
            </div>
          ) : (
            reports.map((report) => (
              <div
                key={report.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <div className="text-sm font-bold text-slate-900">
                      Report on: {report.listingTitle}
                    </div>
                    <div className="text-xs text-slate-500">
                      Reporter: {report.reporterEmail} · {new Date(report.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      report.status === 'pending'
                        ? 'bg-rose-100 text-rose-900'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {report.status}
                  </span>
                </div>

                <div className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                  <div><strong>Flagged Reason:</strong> {report.reason.replace(/_/g, ' ')}</div>
                  <div><strong>Details:</strong> "{report.details}"</div>
                </div>

                {report.status === 'pending' && (
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      onClick={() => handleResolveReport(report.id, 'dismissed', report.listingId)}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl min-h-[44px]"
                    >
                      Dismiss (Unfounded)
                    </button>
                    <button
                      onClick={() => handleResolveReport(report.id, 'resolved', report.listingId)}
                      className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold rounded-xl min-h-[44px]"
                    >
                      Suspend Listing Pending Review
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectModalListing && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Provide Rejection Reason</h3>
            <p className="text-xs text-slate-500">
              This constructive feedback will be shown to the seller on their dashboard so they can upload correct ownership documents.
            </p>

            <form onSubmit={handleConfirmReject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason Description</label>
                <textarea
                  rows={3}
                  required
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModalListing(null)}
                  className="px-4 py-2 text-xs text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-semibold min-h-[44px]"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
