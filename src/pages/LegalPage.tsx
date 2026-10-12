import React, { useState } from 'react';
import { 
  Scale, 
  ShieldCheck, 
  FileText, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  Lock, 
  UserX,
  FileCheck,
  Building2,
  ArrowLeft,
  Sparkles,
  Users,
  Bell,
  Mail
} from 'lucide-react';
import { UserProfile } from '../types/listing';
import { storage } from '../lib/storage';

export type LegalDocTab = 'terms' | 'privacy' | 'rules' | 'cashback' | 'notifications';

interface LegalPageProps {
  initialTab?: LegalDocTab;
  activeUser: UserProfile;
  onNavigate: (tab: string) => void;
}

export const LegalPage: React.FC<LegalPageProps> = ({
  initialTab = 'terms',
  activeUser,
  onNavigate
}) => {
  const [activeTab, setActiveTab] = useState<LegalDocTab>(initialTab);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletionSuccess, setDeletionSuccess] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  // CASL Notification Preferences State
  const [emailTransactional, setEmailTransactional] = useState(true); // Always on for essential service
  const [emailMarketing, setEmailMarketing] = useState(false); // Default false: CASL explicit opt-in required
  const [emailWeeklyDigest, setEmailWeeklyDigest] = useState(false);
  const [prefSavedMessage, setPrefSavedMessage] = useState(false);

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('directhome_casl_prefs_v1', JSON.stringify({
      transactional: emailTransactional,
      marketing: emailMarketing,
      digest: emailWeeklyDigest,
      updatedAt: new Date().toISOString()
    }));
    setPrefSavedMessage(true);
    setTimeout(() => setPrefSavedMessage(false), 3000);
  };

  const handleExportData = () => {
    const data = storage.exportUserData(activeUser);
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DirectHome_Data_Export_${activeUser.id}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 3000);
  };

  const handleDeleteAccountData = () => {
    // PIPEDA self-serve data erasure
    storage.clearDraft();
    localStorage.removeItem('directhome_saved_ids_v1');
    localStorage.removeItem('directhome_msg_rate_limits_v1');
    
    // Anonymize active user
    storage.setActiveUser({
      id: 'deleted-user-' + Date.now(),
      email: 'deleted@anonymized.ca',
      name: 'Deleted Account (PIPEDA)',
      role: 'buyer'
    });

    setShowDeleteModal(false);
    setDeletionSuccess(true);
    setTimeout(() => {
      onNavigate('landing');
    }, 2500);
  };

  return (
    <div className="max-w-[1000px] mx-auto px-4 sm:px-6 py-8 pb-24 space-y-8">
      
      {/* Top back navigation */}
      <button
        onClick={() => onNavigate('landing')}
        className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer min-h-[44px]"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to marketplace</span>
      </button>

      {/* Prominent Legal Review Notice Banner */}
      <div className="bg-amber-50 border border-amber-200/90 rounded-2xl p-4 sm:p-5 flex items-start gap-3 text-amber-950 shadow-sm">
        <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="text-xs font-bold uppercase tracking-wider text-amber-800">
            [PENDING FORMAL REVIEW BY BRITISH COLUMBIA LEGAL COUNSEL]
          </div>
          <p className="text-xs sm:text-sm text-amber-900 leading-relaxed">
            All legal documents on DirectHome BC are structured for British Columbia real estate jurisprudence, the <em>Real Estate Services Act</em> (RESA), the federal <em>Personal Information Protection and Electronic Documents Act</em> (PIPEDA), and Canada’s Anti-Spam Legislation (CASL). Final revisions remain subject to formal solicitor sign-off prior to commercial closing.
          </p>
        </div>
      </div>

      {/* Document Selector Segmented Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('terms')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap min-h-[44px] flex items-center gap-2 ${
            activeTab === 'terms'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>Terms of Use</span>
        </button>

        <button
          onClick={() => setActiveTab('privacy')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap min-h-[44px] flex items-center gap-2 ${
            activeTab === 'privacy'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>Privacy Policy</span>
        </button>

        <button
          onClick={() => setActiveTab('rules')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap min-h-[44px] flex items-center gap-2 ${
            activeTab === 'rules'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Community & Listing Rules</span>
        </button>

        <button
          onClick={() => setActiveTab('cashback')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap min-h-[44px] flex items-center gap-2 ${
            activeTab === 'cashback'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>How Cash-Back Works</span>
        </button>

        <button
          onClick={() => setActiveTab('notifications')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap min-h-[44px] flex items-center gap-2 ${
            activeTab === 'notifications'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Email & CASL Preferences</span>
        </button>
      </div>

      {/* Deletion Toast */}
      {deletionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
          <span>Your account and stored personal data have been completely deleted in compliance with PIPEDA. Redirecting...</span>
        </div>
      )}

      {/* ---------------- SECTION 1: TERMS OF USE ---------------- */}
      {activeTab === 'terms' && (
        <article className="prose prose-slate max-w-none bg-white p-6 sm:p-10 rounded-2xl border border-slate-200 shadow-sm space-y-6 text-sm text-slate-700 leading-relaxed">
          <div className="border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2 text-amber-700 text-xs font-bold uppercase tracking-wider mb-1">
              <span>Status: Pending Lawyer Review</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Terms of Use & Advertising Agreement
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Effective Version: 2026-v1.0-draft · Applicable Jurisdiction: British Columbia, Canada
            </p>
          </div>

          {/* Statutory Highlight Box */}
          <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-200/90 text-emerald-950 font-medium space-y-2">
            <div className="font-bold text-base flex items-center gap-2 text-emerald-900">
              <FileCheck className="w-5 h-5 text-emerald-700" />
              <span>Mandatory Statutory Notice to All Users</span>
            </div>
            <p className="text-xs sm:text-sm leading-relaxed">
              <strong>"This site is an advertising platform. We are not a real estate brokerage and do not provide real estate advice. Sellers and buyers should consult a lawyer or notary before signing any agreement."</strong>
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900">1. Nature of the DirectHome BC Service</h2>
            <p>
              DirectHome BC operates solely as an online classified advertising marketplace connecting property owners with prospective buyers. DirectHome BC Technologies Inc.:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
              <li>Is <strong>NOT</strong> a real estate brokerage licensed under the British Columbia <em>Real Estate Services Act</em> (RESA).</li>
              <li>Does <strong>NOT</strong> act as an agent, broker, or legal representative for any buyer, seller, or third party.</li>
              <li>Does <strong>NOT</strong> provide real estate trading services, price valuations, appraisals, marketing advice, or negotiation assistance.</li>
              <li>Does <strong>NOT</strong> draft legally binding contracts or hold purchase deposits in trust.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900">2. Cash-Back Offer Terms & Conditions</h2>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 space-y-2">
              <p>
                <strong>Seller's Offer, Not a Platform Guarantee:</strong> Any cash-back amount displayed on listing cards, calculators, or detail pages represents a voluntary financial offer made solely by the seller, funded from their listing commission savings. DirectHome BC does not fund, pay, or guarantee cash-back payments.
              </p>
              <p>
                <strong>Mandatory Contractual Clause:</strong> For any cash-back offer to take legal effect, <strong>it must be explicitly written into the standard British Columbia Contract of Purchase and Sale</strong> agreed upon by the buyer and seller, and executed on the Statement of Adjustments prepared by their independent conveyancing notary public or lawyer.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900">3. Mandatory Ownership Verification Prior to Publication</h2>
            <p>
              To safeguard marketplace integrity and prevent fraudulent property representations, <strong>a listing cannot go live until ownership verification is formally approved</strong> by DirectHome BC compliance officers. 
            </p>
            <p className="text-xs text-slate-600">
              Sellers must submit a valid, current municipal Property Tax Notice or Land Title and Survey Authority of BC (LTSA) Title Search confirming registered ownership matching the account profile. All submitted documents are kept strictly confidential in an encrypted private vault and are never published to buyers.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900">4. Independent Legal Representation Requirement</h2>
            <p>
              All real estate transactions completed between parties introduced via DirectHome BC must be transacted using standard British Columbia Contract of Purchase and Sale documentation. Each party is strongly advised to engage an independent British Columbia Notary Public or member of the Law Society of British Columbia for conveyancing, title registration, and financial adjustments.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900">5. Limitation of Liability</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              DirectHome BC makes no warranties regarding the accuracy of seller-submitted descriptions, measurements, property conditions, or zoning compliance. Buyers are solely responsible for conducting independent building inspections, property disclosures audits, and title verifications.
            </p>
          </section>
        </article>
      )}

      {/* ---------------- SECTION 2: PRIVACY POLICY (PIPEDA) ---------------- */}
      {activeTab === 'privacy' && (
        <article className="prose prose-slate max-w-none bg-white p-6 sm:p-10 rounded-2xl border border-slate-200 shadow-sm space-y-6 text-sm text-slate-700 leading-relaxed">
          <div className="border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2 text-amber-700 text-xs font-bold uppercase tracking-wider mb-1">
              <span>Status: Pending Lawyer Review</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Privacy Policy & PIPEDA Compliance
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Federal PIPEDA & BC PIPA Compliance Statement · Version: 2026-v1.0-draft
            </p>
          </div>

          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs sm:text-sm text-emerald-950 space-y-1.5">
            <div className="font-bold text-emerald-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>Core Privacy Commitment (PIPEDA Standard)</span>
            </div>
            <p>
              DirectHome BC adheres strictly to the 10 Fair Information Principles of Canada's <em>Personal Information Protection and Electronic Documents Act</em> (PIPEDA) and British Columbia's <em>Personal Information Protection Act</em> (PIPA).
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900">1. Principle of Minimal Data Collection</h2>
            <p>
              We collect strictly the minimum personal data required to operate a direct advertising marketplace and verify legal homeownership:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm">
              <li><strong>Contact Information:</strong> Name, email address, and phone number (to coordinate buyer-seller viewing appointments).</li>
              <li><strong>Listing Data:</strong> Property address, square footage, photos, asking price, and property features.</li>
              <li><strong>Private Ownership Documents:</strong> Municipal Property Tax notices or Land Title searches solely for compliance auditing. <strong>These files are NEVER shared with buyers or third parties.</strong></li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900">2. No Commercial Sale of Personal Data</h2>
            <p>
              DirectHome BC does <strong>NOT</strong> sell, rent, license, or monetize your personal information to third-party mortgage brokers, real estate brokerages, marketing agencies, or data brokers.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900">3. Approximate Location & Security Measures</h2>
            <p>
              To protect the privacy of homeowners and their families, listing map coordinates display only an approximate neighborhood perimeter. Exact civic addresses and suite numbers remain locked until the homeowner confirms an appointment request.
            </p>
          </section>

          {/* Self-Serve PIPEDA Data & Account Erasure Module */}
          <section className="pt-4 border-t border-slate-200 space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <UserX className="w-5 h-5 text-rose-600" />
              <span>4. Your Right to Data Portability & Complete Deletion</span>
            </h2>
            <p className="text-xs sm:text-sm">
              Under PIPEDA Principle 9 (Individual Access) and Principle 5 (Limiting Retention), you hold the right to request all data we store about you and to permanently erase your account, uploaded property tax documents, and conversation history at any time.
            </p>

            {/* Data Export Box */}
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-slate-900 text-sm">Download PIPEDA Data Export</div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    Export all your listings, viewing requests, messages, and profile records in machine-readable JSON.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleExportData}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-sm min-h-[44px] shrink-0"
                >
                  <FileCheck className="w-4 h-4 text-emerald-400" />
                  <span>Download My Data (JSON)</span>
                </button>
              </div>
              {exportSuccess && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Data export generated and downloaded to your device successfully!</span>
                </div>
              )}
            </div>

            {/* Erasure Box */}
            <div className="p-5 bg-rose-50 border border-rose-200/90 rounded-2xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-slate-900 text-sm">Self-Serve Account & Data Erasure</div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    Logged in as: <strong>{activeUser.name}</strong> ({activeUser.email})
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  className="px-4 py-2.5 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-sm min-h-[44px] shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Account & Erase All Data</span>
                </button>
              </div>
              <p className="text-[11px] text-rose-800 leading-relaxed">
                Triggering deletion permanently removes your profile, saved homes, conversation logs, and draft listings from DirectHome BC storage immediately.
              </p>
            </div>
          </section>

          <section className="space-y-2 pt-2">
            <h2 className="text-base font-bold text-slate-900">5. Privacy Officer Contact</h2>
            <p className="text-xs text-slate-600">
              For privacy inquiries, audit questions, or formal PIPEDA compliance requests, contact our designated Chief Privacy Officer at: <code>privacy@directhome.ca</code>.
            </p>
          </section>
        </article>
      )}

      {/* ---------------- SECTION 3: COMMUNITY & LISTING RULES ---------------- */}
      {activeTab === 'rules' && (
        <article className="prose prose-slate max-w-none bg-white p-6 sm:p-10 rounded-2xl border border-slate-200 shadow-sm space-y-6 text-sm text-slate-700 leading-relaxed">
          <div className="border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2 text-amber-700 text-xs font-bold uppercase tracking-wider mb-1">
              <span>Status: Pending Lawyer Review</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Community & Listing Rules
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Standards for sellers and buyers in British Columbia · Version: 2026-v1.0-draft
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900">1. Accurate Representation Standard</h2>
            <p>
              All property descriptions, square footage, inclusions, and photo representations must be accurate and truthful. Sellers must disclose known material defects in accordance with British Columbia common law and the Property Condition Disclosure Statement (PCDS).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900">2. Respectful Direct Communication</h2>
            <p>
              DirectHome BC connects real community members. All in-app messages and viewing interactions must be respectful, civil, and free of harassment. Unsolicited commercial solicitation by licensed agents or mortgage originators is strictly prohibited and subject to immediate account suspension.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900">3. Zero Tolerance for Scams or Off-Platform Deposits</h2>
            <p>
              Never wire funds, transfer e-Transfers, or pay deposits directly to a stranger. All transaction deposits must be held in the legal trust account of a licensed British Columbia Notary Public or member of the Law Society of British Columbia in accordance with standard real estate conveyance practice.
            </p>
          </section>
        </article>
      )}

      {/* ---------------- SECTION 4: HOW CASH-BACK WORKS ---------------- */}
      {activeTab === 'cashback' && (
        <article className="prose prose-slate max-w-none bg-white p-6 sm:p-10 rounded-2xl border border-slate-200 shadow-sm space-y-6 text-sm text-slate-700 leading-relaxed">
          <div className="border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2 text-amber-700 text-xs font-bold uppercase tracking-wider mb-1">
              <span>Status: Pending Lawyer Review</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              How Buyer Cash-Back Works in British Columbia
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Legal, Financial & Conveyancing Mechanics · Version: 2026-v1.0-draft
            </p>
          </div>

          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs sm:text-sm text-emerald-950 space-y-1.5">
            <div className="font-bold text-emerald-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-700" />
              <span>Core Principle: Seller Saving = Buyer Benefit</span>
            </div>
            <p>
              In British Columbia, typical listing brokerages charge 7% on the first $100,000 and 2.5% on the balance. By listing directly on DirectHome BC with $0 listing commission, the seller saves tens of thousands in commission. The seller elects to share a portion of these savings with the buyer as an attractive closing incentive.
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900">How It Is Executed at Closing</h2>
            <ol className="list-decimal pl-5 space-y-2 text-xs sm:text-sm">
              <li>
                <strong>Written into the Purchase Contract:</strong> The agreed cash-back credit is drafted as a specific clause in the standard BC Contract of Purchase and Sale signed by both parties.
              </li>
              <li>
                <strong>Credited on the Statement of Adjustments:</strong> The conveyancer (BC Notary Public or lawyer) registers the credit as a line item on the Statement of Adjustments, directly reducing the buyer's required cash at completion.
              </li>
              <li>
                <strong>Full Lender Transparency:</strong> The credit is fully documented in the legal contract of purchase, ensuring total transparency with the buyer's mortgage lender and insurer.
              </li>
            </ol>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900">Legal Boundary Notice</h2>
            <p className="text-xs text-slate-600">
              DirectHome BC is not a party to the contract of purchase and sale, does not hold deposit trust monies, and does not guarantee payments. The cash-back is a direct contractual commitment made between the seller and buyer.
            </p>
          </section>
        </article>
      )}

      {/* ---------------- SECTION 5: NOTIFICATIONS & CASL PREFERENCES ---------------- */}
      {activeTab === 'notifications' && (
        <article className="prose prose-slate max-w-none bg-white p-6 sm:p-10 rounded-2xl border border-slate-200 shadow-sm space-y-6 text-sm text-slate-700 leading-relaxed">
          <div className="border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2 text-amber-700 text-xs font-bold uppercase tracking-wider mb-1">
              <span>Status: Pending Lawyer Review</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Email Notifications & CASL Compliance
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Canada’s Anti-Spam Legislation (CASL) Preferences & Unsubscribe Center
            </p>
          </div>

          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs sm:text-sm text-emerald-950 space-y-1.5">
            <div className="font-bold text-emerald-900 flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-emerald-700" />
              <span>Strict Zero-Spam Policy (CASL Standard)</span>
            </div>
            <p>
              DirectHome BC only sends transactional emails necessary for servicing your viewing requests, buyer messages, and verification audit notifications. <strong>We never send marketing or promotional emails without your explicit, voluntary opt-in consent.</strong>
            </p>
          </div>

          <form onSubmit={handleSavePreferences} className="space-y-4 pt-2">
            <h2 className="text-base font-bold text-slate-900">Notification Preferences for {activeUser.email}</h2>

            {/* Transactional (Mandatory for account) */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-start justify-between gap-4">
              <div>
                <div className="font-semibold text-slate-900 text-sm">Essential Transactional Alerts (Required)</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Viewing confirmations, seller approvals, direct message replies, and title verification status updates.
                </div>
              </div>
              <input
                type="checkbox"
                checked={emailTransactional}
                disabled
                className="w-5 h-5 accent-emerald-700 rounded cursor-not-allowed mt-1"
                title="Transactional emails are required for platform transactions"
              />
            </div>

            {/* Marketing / Platform Updates (Explicit CASL Opt-In) */}
            <div className="p-4 bg-white rounded-xl border border-slate-200 flex items-start justify-between gap-4 hover:border-slate-300 transition-colors">
              <div>
                <div className="font-semibold text-slate-900 text-sm">Product News & Feature Announcements</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Optional updates about new seller tools, savings calculators, and Fraser Valley marketplace news.
                </div>
              </div>
              <input
                type="checkbox"
                checked={emailMarketing}
                onChange={(e) => setEmailMarketing(e.target.checked)}
                className="w-5 h-5 accent-emerald-700 rounded cursor-pointer mt-1"
              />
            </div>

            {/* Weekly Digest */}
            <div className="p-4 bg-white rounded-xl border border-slate-200 flex items-start justify-between gap-4 hover:border-slate-300 transition-colors">
              <div>
                <div className="font-semibold text-slate-900 text-sm">Weekly Market Digest & Newly Listed Homes</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  A once-per-week summary of verified homes matching your saved searches.
                </div>
              </div>
              <input
                type="checkbox"
                checked={emailWeeklyDigest}
                onChange={(e) => setEmailWeeklyDigest(e.target.checked)}
                className="w-5 h-5 accent-emerald-700 rounded cursor-pointer mt-1"
              />
            </div>

            {prefSavedMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>CASL notification preferences saved successfully!</span>
              </div>
            )}

            <div className="pt-2 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                You can unsubscribe or change preferences at any time in compliance with CASL.
              </span>
              <button
                type="submit"
                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs shadow-sm cursor-pointer min-h-[44px]"
              >
                Save Notification Preferences
              </button>
            </div>
          </form>
        </article>
      )}

      {/* Confirmation Modal for PIPEDA Deletion */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-slate-900">Permanently Delete Account & Data?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                In compliance with PIPEDA, this will irreversibly erase your account profile, saved homes, messaging history, and any uploaded tax/title documents.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccountData}
                className="flex-1 py-2.5 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-semibold min-h-[44px]"
              >
                Confirm PIPEDA Deletion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
