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
import { CASHBACK_LENDER_NOTICE, CASHBACK_SELLER_OFFER_NOTICE, CONTRACT_NOTICE, SUPABASE_REGION, PRIVACY_VERSION } from '../lib/legalText';
import { db, isGuestUser } from '../lib/db';
import { useAuth } from '../context/AuthContext';

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
  const { signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<LegalDocTab>(initialTab);
  const [deleting, setDeleting] = useState(false);
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

  const handleExportData = async () => {
    if (isGuestUser(activeUser)) {
      alert('Please sign in to download your data.');
      return;
    }
    try {
      const data = await db.exportUserData();
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `OwnersMarket_Data_Export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Your data could not be exported. Please try again.');
    }
  };

  const handleDeleteAccountData = async () => {
    // Self-serve erasure (Canadian privacy law): removes the account, listings, photos, messages and favourites
    if (isGuestUser(activeUser)) {
      setShowDeleteModal(false);
      alert('Please sign in to delete your account.');
      return;
    }
    setDeleting(true);
    try {
      await db.deleteAccount();
      setShowDeleteModal(false);
      setDeletionSuccess(true);
      try {
        await signOut();
      } catch {
        /* the account no longer exists; local sign-out is enough */
      }
      setTimeout(() => onNavigate('landing'), 2500);
    } catch (err: any) {
      setShowDeleteModal(false);
      alert(err.message || 'Your account could not be deleted. Please contact support.');
    } finally {
      setDeleting(false);
    }
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
          <span>Your account and stored personal data have been deleted. Redirecting...</span>
        </div>
      )}

      {/* ---------------- SECTION 1: TERMS OF USE ---------------- */}
      {activeTab === 'terms' && (
        <article className="prose prose-slate max-w-none bg-white p-6 sm:p-10 rounded-2xl border border-slate-200 shadow-sm space-y-6 text-sm text-slate-700 leading-relaxed">
          <div className="border-b border-slate-100 pb-4">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Terms of Use & Advertising Agreement
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Last updated: October 14, 2026 · Applies across Canada
            </p>
          </div>

          {/* Statutory Highlight Box */}
          <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-200/90 text-emerald-950 font-medium space-y-2">
            <div className="font-bold text-base flex items-center gap-2 text-emerald-900">
              <FileCheck className="w-5 h-5 text-emerald-700" />
              <span>Important notice to all users</span>
            </div>
            <p className="text-xs sm:text-sm leading-relaxed">
              <strong>"This site is an advertising platform. We are not a real estate brokerage and do not provide real estate advice. Sellers and buyers should consult a lawyer or notary before signing any agreement."</strong>
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900">1. What OwnersMarket is</h2>
            <p>
              OwnersMarket is an online advertising service. Property owners in every Canadian province and territory except Quebec pay a flat fee to advertise their own homes for sale, and buyers can browse those ads and contact owners directly. OwnersMarket ("we", "us") is operated from British Columbia. OwnersMarket:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
              <li>Is <strong>NOT</strong> a real estate brokerage and is not licensed or registered to provide real estate services in any province or territory, including under British Columbia's <em>Real Estate Services Act</em>, Alberta's <em>Real Estate Act</em>, Ontario's <em>Trust in Real Estate Services Act, 2002</em>, or Quebec's <em>Real Estate Brokerage Act</em>.</li>
              <li>Does <strong>NOT</strong> act as an agent, broker, or legal representative for any buyer, seller, or third party.</li>
              <li>Does <strong>NOT</strong> provide real estate trading services, price valuations, appraisals, marketing advice, or negotiation assistance.</li>
              <li>Does <strong>NOT</strong> present, receive or negotiate offers on anyone's behalf.</li>
              <li>Does <strong>NOT</strong> provide, draft, review or fill in contracts or contract forms, and does <strong>NOT</strong> hold deposits or any other money for buyers or sellers.</li>
              <li>Charges a flat advertising fee that does <strong>not</strong> depend on whether a property sells or on its sale price. OwnersMarket receives no commission, referral fee or other payment connected to any sale.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900">2. Cash-Back Offer Terms & Conditions</h2>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 space-y-2">
              <p>
                <strong>Seller's Offer, Not a Platform Guarantee:</strong> Any cash-back amount displayed on listing cards, estimators, or detail pages is a voluntary offer made solely by the seller. OwnersMarket does not fund, pay, or guarantee cash-back payments.
              </p>
              <p>
                <strong>Written Into the Contract by Your Lawyer or Notary:</strong> For a cash-back offer to take effect, it must be included in the purchase contract. {CONTRACT_NOTICE}
              </p>
              <p className="font-semibold text-slate-900">
                Lender disclosure: {CASHBACK_LENDER_NOTICE}
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900">3. Seller Representations; No Ownership Verification</h2>
            <p>
              By submitting a listing, the seller represents and warrants that they are the registered owner of the property, or are legally authorized by all registered owners to advertise it for sale, and that the listing is accurate. <strong>OwnersMarket does not verify property ownership, title, or the seller's authority to sell.</strong>
            </p>
            <p className="text-xs text-slate-600">
              OwnersMarket reviews listings only for spam, scams and inappropriate content before they can be published; this review is not a check of ownership or title. Buyers are responsible for confirming who the registered owner is (for example, through a search at the land titles or land registry office in the property's province or territory) and should use their own lawyer, or a notary in provinces where notaries handle real estate, before signing any agreement or paying any money. Sellers are solely responsible for their listings and agree to indemnify OwnersMarket for claims arising from inaccurate or unauthorized listings.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900">4. Independent Legal Representation Requirement</h2>
            <p>
              {CONTRACT_NOTICE} Each party should hire their own independent lawyer, or a notary in provinces where notaries handle real estate transactions (such as British Columbia), to prepare the contract and handle the closing, title transfer and money adjustments.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900">5. Limitation of Liability</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              OwnersMarket makes no warranties regarding the accuracy of seller-submitted descriptions, measurements, property conditions, or zoning compliance. Buyers are solely responsible for arranging independent building inspections, reviewing any seller disclosures, confirming zoning and permits with the local municipality, and verifying title.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900">6. Fees</h2>
            <p>
              OwnersMarket charges no commission. Sellers pay a flat listing fee of $24.99 CAD per month for each active listing, billed through Stripe, until cancelled. Any savings figures shown on the site are estimates only and use an example commission rate; actual commissions are negotiable and vary by brokerage.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900">7. Where OwnersMarket is available</h2>
            <p>
              OwnersMarket does not currently accept listings for properties in Quebec. We plan to open in Quebec once our site and terms are available in French. Any Quebec listing submitted in the meantime will be declined.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900">8. Governing law</h2>
            <p>
              These Terms are governed by the laws of the Province of British Columbia and the federal laws of Canada that apply there. Any dispute about these Terms will be heard in the courts of British Columbia, unless the law of your province or territory gives you the right to bring it where you live. Nothing in these Terms limits any rights you have under the consumer protection laws of your province or territory, including Quebec's <em>Consumer Protection Act</em>.
            </p>
          </section>
        </article>
      )}

      {/* ---------------- SECTION 2: PRIVACY POLICY (CANADA) ---------------- */}
      {activeTab === 'privacy' && (
        <article className="prose prose-slate max-w-none bg-white p-6 sm:p-10 rounded-2xl border border-slate-200 shadow-sm space-y-6 text-sm text-slate-700 leading-relaxed">
          <div className="border-b border-slate-100 pb-4">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Privacy Policy
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Applies across Canada · Last updated: October 14, 2026
            </p>
          </div>

          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs sm:text-sm text-emerald-950 space-y-1.5">
            <div className="font-bold text-emerald-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>Which privacy laws apply</span>
            </div>
            <p>
              OwnersMarket serves people across Canada. Our handling of personal information is governed by Canada's federal <em>Personal Information Protection and Electronic Documents Act</em> (PIPEDA) and, where they apply, by British Columbia's and Alberta's <em>Personal Information Protection Act</em>s and Quebec's <em>Act respecting the protection of personal information in the private sector</em> (as updated by Law 25). We follow the same privacy practices for every user, wherever they live in Canada. Canada's federal <em>Personal Information Protection and Electronic Documents Act</em> (PIPEDA) also applies when personal information is transferred across provincial or national borders, including to the service providers described below.
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900">1. What we collect</h2>
            <p>We collect only what is needed to run the marketplace:</p>
            <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm">
              <li><strong>Account:</strong> your name, email address, phone number (optional), password (stored only in encrypted, hashed form by our sign-in provider), and the date and version of the Terms you accepted.</li>
              <li><strong>Listings (sellers):</strong> the property address, property details, photos, description, asking price and any cash-back offer. The exact street address is kept private and is only shown to a buyer after you confirm their viewing.</li>
              <li><strong>Viewing requests:</strong> the requesting buyer's name, email, phone number, preferred date and time, and any note.</li>
              <li><strong>Messages</strong> sent between buyers and sellers on the site.</li>
              <li><strong>Saved homes, reports</strong> you file about listings, and the <strong>notifications</strong> we show you.</li>
              <li><strong>Billing (sellers):</strong> your Stripe customer and subscription reference numbers, payment status and next billing date. <strong>Your card details are entered on Stripe's page and are never received or stored by OwnersMarket.</strong></li>
              <li><strong>Technical information:</strong> our hosting and sign-in providers automatically log technical data such as IP address, browser type and sign-in times, for security and to keep the site working.</li>
              <li><strong>On your device:</strong> your browser stores your sign-in session, an unfinished listing draft, and your cookie and email preferences. We do not use advertising or analytics trackers.</li>
            </ul>
            <p className="text-xs text-slate-600">
              We do <strong>not</strong> collect ownership documents, property tax notices, land title searches, government ID, or payment card numbers.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900">2. How we use it</h2>
            <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm">
              <li>To create and secure your account and show your listings, messages, viewings and notifications.</li>
              <li>To review listings for spam, scams and inappropriate content, and to handle reports.</li>
              <li>To bill sellers the monthly listing fee and keep the required financial records.</li>
              <li>To send account emails you need, such as sign-up confirmation and password resets.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900">3. Who can see it, and who we share it with</h2>
            <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm">
              <li><strong>Other users:</strong> anyone can see a published listing (without its exact address) and the seller's name shown on it. A seller sees the contact details a buyer includes in a viewing request. Message contents are visible only to the two people in the conversation and, when needed to handle a report, to our administrators.</li>
              <li><strong>Supabase</strong> stores our database, files and sign-in system (account data, listings, photos, messages).</li>
              <li><strong>Stripe</strong> processes listing-fee payments.</li>
              <li><strong>Netlify</strong> hosts the website.</li>
              <li><strong>The Government of British Columbia's address service</strong> (geocoder.api.gov.bc.ca) receives the address you type when creating a BC listing, to place it on the map.</li>
              <li><strong>OpenStreetMap's Nominatim address service</strong> (nominatim.openstreetmap.org) receives the address you type when creating a listing outside BC, or when the BC service cannot find it, to place it on the map.</li>
              <li><strong>OpenStreetMap</strong> map servers deliver the map images and receive your IP address when a map loads.</li>
            </ul>
            <p>
              We do <strong>not</strong> sell, rent or trade your personal information to mortgage brokers, real estate brokerages, marketing agencies, data brokers or anyone else.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900">4. Where your data is stored</h2>
            <p>
              Account data, listings, photos and messages are stored with <strong>Supabase</strong> (data region: <strong>{SUPABASE_REGION}</strong>). Payments are processed by <strong>Stripe</strong>, and the website is hosted by <strong>Netlify</strong>.
            </p>
            <p>
              <strong>This data may be stored or processed outside Canada, including in the United States, and may be subject to the laws of those countries</strong>, which may allow governments, courts or law enforcement there to access it.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900">5. How long we keep it</h2>
            <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm">
              <li>We keep your account data, listings and messages until you delete your account.</li>
              <li>When you delete your account, your data is erased within 30 days (this allows time for it to clear from backups), except for records we must keep for tax or legal reasons, such as billing and payment records.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900">6. Approximate location & security</h2>
            <p>
              To protect homeowners and their families, the map shows only an approximate location. The exact address and unit number stay hidden until the homeowner confirms a viewing. Access to data is restricted by account, and connections to the site are encrypted.
            </p>
          </section>

          {/* Self-serve access & deletion */}
          <section className="pt-4 border-t border-slate-200 space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <UserX className="w-5 h-5 text-rose-600" />
              <span>7. Your right to access, correct and delete your data</span>
            </h2>
            <p className="text-xs sm:text-sm">
              Under Canadian privacy law, you can ask to see the personal information we hold about you, ask how it has been used and who it has been shared with, ask us to correct it, and withdraw your consent (which may mean closing your account). We will respond within 30 days. You can also download a copy below, or permanently delete your account, listings, photos and conversations at any time.
            </p>

            {/* Data Export Box */}
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-slate-900 text-sm">Download your data</div>
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
                Deleting your account removes your profile, listings, photos, saved homes and conversations from the live site immediately. Remaining copies (such as backups) are erased within 30 days, except records we must keep for tax or legal reasons. Cancel any active listing subscription first.
              </p>
            </div>
          </section>

          <section className="space-y-2 pt-2">
            <h2 className="text-base font-bold text-slate-900">8. Contact our privacy officer</h2>
            <p className="text-xs text-slate-600">
              For privacy questions, access or correction requests, or complaints, contact our privacy officer at <code>privacy@ownersmarket.ca</code>. If you are not satisfied with our response, you can complain to the Office of the Privacy Commissioner of Canada (priv.gc.ca). If you live in British Columbia, Alberta or Quebec, you can also contact your provincial privacy regulator: the Office of the Information and Privacy Commissioner for British Columbia, the Office of the Information and Privacy Commissioner of Alberta, or the Commission d'accès à l'information du Québec.
            </p>
          </section>
        </article>
      )}

      {/* ---------------- SECTION 3: COMMUNITY & LISTING RULES ---------------- */}
      {activeTab === 'rules' && (
        <article className="prose prose-slate max-w-none bg-white p-6 sm:p-10 rounded-2xl border border-slate-200 shadow-sm space-y-6 text-sm text-slate-700 leading-relaxed">
          <div className="border-b border-slate-100 pb-4">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Community & Listing Rules
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Standards for sellers and buyers across Canada · Last updated: October 14, 2026
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900">1. Accurate Representation Standard</h2>
            <p>
              All property descriptions, square footage, inclusions and photos must be accurate and truthful. Sellers must not hide or misrepresent known problems with the property, and must give buyers any disclosure the law of their province or territory requires. These duties vary across Canada. In most provinces, sellers must disclose known hidden defects that make a home dangerous or unfit to live in, and some provinces use standard disclosure forms (such as British Columbia's Property Condition Disclosure Statement). Sellers should ask their lawyer or notary what they are required to disclose.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900">2. Respectful Direct Communication</h2>
            <p>
              OwnersMarket connects real community members. All in-app messages and viewing interactions must be respectful, civil, and free of harassment. Unsolicited commercial solicitation by licensed agents or mortgage originators is strictly prohibited and subject to immediate account suspension.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900">3. Zero Tolerance for Scams or Off-Platform Deposits</h2>
            <p>
              Never wire money, send an e-Transfer or pay a deposit directly to a stranger. Deposits should be paid only into the trust account of a lawyer, or of a notary in provinces where notaries handle real estate, as set out in the purchase contract. OwnersMarket never asks for, holds or handles deposits or any other money between buyers and sellers.
            </p>
          </section>
        </article>
      )}

      {/* ---------------- SECTION 4: HOW CASH-BACK WORKS ---------------- */}
      {activeTab === 'cashback' && (
        <article className="prose prose-slate max-w-none bg-white p-6 sm:p-10 rounded-2xl border border-slate-200 shadow-sm space-y-6 text-sm text-slate-700 leading-relaxed">
          <div className="border-b border-slate-100 pb-4">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              How Buyer Cash-Back Works
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              General information only, not legal or financial advice · Last updated: October 14, 2026
            </p>
          </div>

          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs sm:text-sm text-emerald-950 space-y-1.5">
            <div className="font-bold text-emerald-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-700" />
              <span>The Basics</span>
            </div>
            <p>
              OwnersMarket charges no commission — sellers pay a flat $24.99/month per active listing. A seller who would otherwise pay a listing commission could save a significant amount (any figures shown on this site are estimates using an example commission rate; commissions are negotiable). A seller may choose to offer part of that amount to the buyer as a credit at closing. {CASHBACK_SELLER_OFFER_NOTICE}
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900">How It Works at Closing</h2>
            <ol className="list-decimal pl-5 space-y-2 text-xs sm:text-sm">
              <li>
                <strong>Agreed in writing:</strong> If the buyer and seller agree to a cash-back, it must be included in the purchase contract. {CONTRACT_NOTICE}
              </li>
              <li>
                <strong>Handled by the lawyers or notaries:</strong> How the credit is shown and applied at completion is decided by the buyer's and seller's own lawyers or notaries.
              </li>
            </ol>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900">Mortgage Lender & Insurer Disclosure</h2>
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs sm:text-sm text-amber-950 font-medium">
              {CASHBACK_LENDER_NOTICE}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900">Legal Boundary Notice</h2>
            <p className="text-xs text-slate-600">
              OwnersMarket is not a party to the purchase contract, does not provide, draft or review contracts, does not hold deposit trust monies, and does not fund, pay or guarantee cash-back payments. Any cash-back is a commitment made directly between the seller and buyer.
            </p>
          </section>
        </article>
      )}

      {/* ---------------- SECTION 5: NOTIFICATIONS & CASL PREFERENCES ---------------- */}
      {activeTab === 'notifications' && (
        <article className="prose prose-slate max-w-none bg-white p-6 sm:p-10 rounded-2xl border border-slate-200 shadow-sm space-y-6 text-sm text-slate-700 leading-relaxed">
          <div className="border-b border-slate-100 pb-4">
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
              OwnersMarket only sends transactional emails necessary for servicing your viewing requests, buyer messages, and listing review notifications. <strong>We never send marketing or promotional emails without your explicit, voluntary opt-in consent.</strong>
            </p>
          </div>

          <form onSubmit={handleSavePreferences} className="space-y-4 pt-2">
            <h2 className="text-base font-bold text-slate-900">Notification Preferences for {activeUser.email}</h2>

            {/* Transactional (Mandatory for account) */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-start justify-between gap-4">
              <div>
                <div className="font-semibold text-slate-900 text-sm">Essential Transactional Alerts (Required)</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Viewing confirmations, seller approvals, direct message replies, and listing review status updates.
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
                  Optional updates about new seller tools, savings estimators and OwnersMarket news across Canada.
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
                  A once-per-week summary of homes matching your saved searches.
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

      {/* Confirmation modal for account deletion */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-slate-900">Permanently Delete Account & Data?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                This will permanently erase your account profile, saved homes, messages, listings and photos. Cancel any active listing subscription first so you are not billed again.
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
                disabled={deleting}
                className="flex-1 py-2.5 bg-rose-700 hover:bg-rose-800 disabled:opacity-60 text-white rounded-xl text-xs font-semibold min-h-[44px]"
              >
                {deleting ? 'Deleting…' : 'Delete my account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
