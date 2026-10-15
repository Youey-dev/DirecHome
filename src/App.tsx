import React, { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import type { AppNotification, Listing } from './types/listing';
import { isListingLive } from './types/listing';
import { db, isGuestUser } from './lib/db';
import { isSupabaseConfigured } from './lib/supabase';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { LandingPage } from './pages/LandingPage';
import { BrowsePage, BrowseFilters } from './pages/BrowsePage';
import { ListingDetailPage } from './pages/ListingDetailPage';
import { SavedPage } from './pages/SavedPage';
import { HowItWorksPage } from './pages/HowItWorksPage';
import { SavingsCalculator } from './components/SavingsCalculator';
import { CookieConsentBanner } from './components/CookieConsentBanner';
import { AuthModal } from './components/AuthModal';
import { PasswordRecoveryModal } from './components/PasswordRecoveryModal';
import { SetupNotice } from './components/SetupNotice';
import { AuthProvider, useAuth } from './context/AuthContext';

// Heavier pages load only when visited (keeps the first page load fast)
const WizardPage = lazy(() => import('./pages/WizardPage').then((m) => ({ default: m.WizardPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
type DashboardIntent = { tab: 'listings' | 'viewings' | 'messages'; threadId?: string; nonce: number };
const AdminPage = lazy(() => import('./pages/AdminPage').then((m) => ({ default: m.AdminPage })));
const LegalPage = lazy(() => import('./pages/LegalPage').then((m) => ({ default: m.LegalPage })));
const GuideRoute = lazy(() =>
  Promise.all([import('./pages/GuidePage'), import('./data/guides')]).then(([page, data]) => ({
    default: ({ tab, onNavigate }: { tab: string; onNavigate: (tab: string) => void }) => (
      <page.GuidePage guide={tab === 'guide-buying' ? data.BUYER_GUIDE : data.SELLER_GUIDE} onNavigate={onNavigate} />
    ),
  })),
);

// ---------------------------------------------------------------------------
// Real page addresses (so links can be shared and the back button works)
// ---------------------------------------------------------------------------
const TAB_PATHS: Record<string, string> = {
  landing: '/',
  browse: '/browse',
  wizard: '/sell',
  dashboard: '/dashboard',
  admin: '/admin',
  saved: '/saved',
  'how-it-works': '/how-it-works',
  terms: '/terms',
  privacy: '/privacy',
  rules: '/rules',
  cashback: '/cashback',
  notifications: '/notifications',
  calculator: '/calculator',
  'guide-selling': '/guides/selling-your-home',
  'guide-buying': '/guides/buying-a-home',
};

const TAB_TITLES: Record<string, string> = {
  landing: 'OwnersMarket · Sell your home yourself, no commission',
  browse: 'Browse homes for sale by owner · OwnersMarket',
  wizard: 'List your home · OwnersMarket',
  dashboard: 'Your dashboard · OwnersMarket',
  admin: 'Admin · OwnersMarket',
  saved: 'Saved homes · OwnersMarket',
  'how-it-works': 'How it works · OwnersMarket',
  terms: 'Terms of Use · OwnersMarket',
  privacy: 'Privacy Policy · OwnersMarket',
  rules: 'Listing Rules · OwnersMarket',
  cashback: 'Cash-Back Policy · OwnersMarket',
  notifications: 'Notification Preferences · OwnersMarket',
  calculator: 'Savings estimator · OwnersMarket',
  'guide-selling': 'How to sell your home yourself in Canada · OwnersMarket',
  'guide-buying': 'How to buy a home sold by owner in Canada · OwnersMarket',
};

function parsePath(pathname: string): { tab: string; listingId: string | null } {
  const clean = pathname.replace(/\/+$/, '') || '/';
  const detail = clean.match(/^\/listing\/([0-9a-fA-F-]{36})$/);
  if (detail) return { tab: 'detail', listingId: detail[1] };
  const found = Object.entries(TAB_PATHS).find(([, p]) => p === clean);
  return { tab: found ? found[0] : 'landing', listingId: null };
}

function pathFor(tab: string, listingId?: string | null): string {
  if (tab === 'detail' && listingId) return `/listing/${listingId}`;
  return TAB_PATHS[tab] ?? '/';
}

const Loading: React.FC<{ label?: string }> = ({ label = 'Loading…' }) => (
  <div className="flex items-center justify-center py-32 text-sm text-slate-500">{label}</div>
);

const Gate: React.FC<{ title: string; text: string; action?: { label: string; onClick: () => void } }> = ({
  title,
  text,
  action,
}) => (
  <div className="max-w-xl mx-auto px-4 py-24 text-center">
    <h1 className="text-2xl font-extrabold text-slate-900">{title}</h1>
    <p className="mt-3 text-slate-600">{text}</p>
    {action && (
      <button
        onClick={action.onClick}
        className="mt-6 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
      >
        {action.label}
      </button>
    )}
  </div>
);

function MainApp() {
  const { user: activeUser, initializing, recoveryMode } = useAuth();

  const initial = parsePath(window.location.pathname);
  const [currentTab, setCurrentTab] = useState<string>(initial.tab);
  const [selectedListingId, setSelectedListingId] = useState<string | null>(initial.listingId);
  const [listings, setListings] = useState<Listing[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [hasDraft, setHasDraft] = useState<boolean>(false);
  const [dataReady, setDataReady] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin');
  // The listing being edited. Null means the wizard creates a brand-new listing.
  const [editListing, setEditListing] = useState<Listing | null>(null);
  const [dashboardIntent, setDashboardIntent] = useState<DashboardIntent | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  // Filters from the homepage search box, handed to the browse page
  const [browseFilters, setBrowseFilters] = useState<BrowseFilters | undefined>(undefined);
  const [dashboardBadge, setDashboardBadge] = useState(0);

  // Keep the screen in sync with the database cache
  useEffect(() => {
    const sync = () => {
      setListings(db.getListings());
      setSavedIds(db.getSavedIds());
      setHasDraft(!!db.getDraft());
      setDataReady(db.isLoaded());
      setLoadError(db.getLoadError());
      setUnreadCount(db.getUnreadNotificationCount());
      const me = db.getListings().filter((l) => l.userId === activeUser.id).map((l) => l.id);
      const pendingForMe = db
        .getViewingRequests()
        .filter((v) => me.includes(v.listingId) && v.buyerId !== activeUser.id && v.status === 'pending').length;
      const updates = db
        .getNotifications()
        .filter((n) => !n.read && ['viewing_confirmed', 'viewing_declined', 'viewing_cancelled', 'viewing_rescheduled', 'listing_live', 'listing_rejected'].includes(n.type)).length;
      setDashboardBadge(db.getUnreadMessageCount() + pendingForMe + updates);
    };
    sync();
    return db.subscribe(sync);
  }, [activeUser.id]);

  // Browser back / forward buttons
  useEffect(() => {
    const onPop = () => {
      const { tab, listingId } = parsePath(window.location.pathname);
      setCurrentTab(tab);
      setSelectedListingId(listingId);
      setEditListing(null);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    const base = TAB_TITLES[currentTab] ?? TAB_TITLES.landing;
    document.title = unreadCount > 0 ? `(${unreadCount}) ${base}` : base;
  }, [currentTab, unreadCount]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 4500);
  }, []);

  // Pop-up banner when something new arrives while the site is open
  useEffect(() => {
    return db.onIncomingNotification((n) => showToast(`🔔 ${n.title}`));
  }, [showToast]);

  const handleNavigate = useCallback((tab: string, listingId?: string) => {
    const nextListing = tab === 'detail' ? listingId ?? null : null;
    setSelectedListingId(nextListing);
    setEditListing(null); // every normal "List your home" starts a NEW listing
    setCurrentTab(tab);
    const path = pathFor(tab, nextListing);
    if (window.location.pathname !== path) window.history.pushState({}, '', path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleOpenAuth = (mode: 'signin' | 'signup' = 'signin') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };

  // Clicking a notification takes the person straight to the right place
  const handleOpenNotification = (n: AppNotification) => {
    const nonce = Date.now();
    if (n.type === 'new_message') {
      setDashboardIntent({ tab: 'messages', threadId: n.conversationId, nonce });
      handleNavigate('dashboard');
    } else if (n.type.startsWith('viewing_')) {
      setDashboardIntent({ tab: 'viewings', nonce });
      handleNavigate('dashboard');
    } else if (n.type === 'listing_live' || n.type === 'listing_rejected') {
      setDashboardIntent({ tab: 'listings', nonce });
      handleNavigate('dashboard');
    } else if (n.type === 'listing_in_review' || n.type === 'new_report') {
      handleNavigate('admin');
    } else {
      handleNavigate('dashboard');
    }
  };

  const handleToggleFavorite = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (isGuestUser(activeUser)) {
      handleOpenAuth('signup');
      return;
    }
    try {
      await db.toggleFavorite(id);
    } catch (err: any) {
      showToast(err.message || 'Could not update your saved homes.');
    }
  };

  const handleSelectListing = (id: string) => handleNavigate('detail', id);

  const currentListing = selectedListingId ? db.getListingById(selectedListingId) : undefined;

  if (!isSupabaseConfigured) return <SetupNotice />;
  if (initializing) return <Loading label="Loading OwnersMarket…" />;

  const signedIn = !isGuestUser(activeUser);
  const needsSignIn = (
    <Gate
      title="Please sign in to continue"
      text="You need a free account to see this page."
      action={{ label: 'Sign in', onClick: () => handleOpenAuth('signin') }}
    />
  );

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900">
      <Header
        currentTab={currentTab}
        onNavigate={handleNavigate}
        activeUser={activeUser}
        savedCount={savedIds.length}
        hasDraft={hasDraft}
        onOpenAuth={handleOpenAuth}
        onOpenNotification={handleOpenNotification}
        dashboardBadge={dashboardBadge}
      />

      {loadError && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-center text-sm text-red-700">
          We couldn’t load the latest listings. Please refresh the page. If this keeps happening, try again in a few minutes.
        </div>
      )}

      <main className="flex-1">
        <Suspense fallback={<Loading />}>
          {currentTab === 'landing' && (
            <LandingPage
              listings={listings.filter((l) => isListingLive(l))}
              savedIds={savedIds}
              onToggleFavorite={handleToggleFavorite}
              onSelectListing={handleSelectListing}
              onNavigate={handleNavigate}
              onSearch={(filters) => {
                setBrowseFilters(filters);
                handleNavigate('browse');
              }}
            />
          )}

          {currentTab === 'browse' &&
            (dataReady ? (
              <BrowsePage
                key={JSON.stringify(browseFilters ?? {})}
                initialFilters={browseFilters}
                listings={listings.filter((l) => isListingLive(l))}
                savedIds={savedIds}
                onToggleFavorite={handleToggleFavorite}
                onSelectListing={handleSelectListing}
              />
            ) : (
              <Loading label="Loading homes…" />
            ))}

          {currentTab === 'detail' &&
            (currentListing ? (
              <ListingDetailPage
                listing={currentListing}
                activeUser={activeUser}
                isFavorited={savedIds.includes(currentListing.id)}
                onToggleFavorite={handleToggleFavorite}
                onBack={() => handleNavigate('browse')}
                onOpenAuth={handleOpenAuth}
              />
            ) : dataReady ? (
              <Gate
                title="This listing isn’t available"
                text="It may have been sold, paused, or removed by the owner."
                action={{ label: 'Browse homes', onClick: () => handleNavigate('browse') }}
              />
            ) : (
              <Loading label="Loading home…" />
            ))}

          {currentTab === 'wizard' &&
            (!signedIn ? (
              <Gate
                title="Sign in to list your home"
                text="Create a free account to start your listing. The same account lets you browse, message owners and book viewings."
                action={{ label: 'Create free account', onClick: () => handleOpenAuth('signup') }}
              />
            ) : (
              <WizardPage
                key={editListing?.id ?? 'new'}
                editListing={editListing}
                activeUser={activeUser}
                onListingCreated={() => handleNavigate('dashboard')}
                onCancel={() => handleNavigate('dashboard')}
              />
            ))}

          {currentTab === 'dashboard' &&
            (signedIn ? (
              <DashboardPage
                activeUser={activeUser}
                onNavigate={handleNavigate}
                intent={dashboardIntent}
                onEditListing={(listing) => {
                  handleNavigate('wizard');
                  setEditListing(listing);
                }}
              />
            ) : (
              needsSignIn
            ))}

          {currentTab === 'admin' &&
            (activeUser.role === 'admin' ? (
              <AdminPage activeUser={activeUser} onNavigate={handleNavigate} />
            ) : (
              <Gate title="Restricted area" text="This page is only available to OwnersMarket administrators." />
            ))}

          {currentTab === 'saved' &&
            (signedIn ? (
              <SavedPage
                listings={listings.filter((l) => isListingLive(l))}
                savedIds={savedIds}
                onToggleFavorite={handleToggleFavorite}
                onSelectListing={handleSelectListing}
                onNavigate={handleNavigate}
              />
            ) : (
              needsSignIn
            ))}

          {currentTab === 'how-it-works' && <HowItWorksPage onNavigate={handleNavigate} />}

          {(currentTab === 'guide-selling' || currentTab === 'guide-buying') && (
            <GuideRoute key={currentTab} tab={currentTab} onNavigate={handleNavigate} />
          )}

          {['terms', 'privacy', 'rules', 'cashback', 'notifications'].includes(currentTab) && (
            <LegalPage initialTab={currentTab as any} activeUser={activeUser} onNavigate={handleNavigate} />
          )}

          {currentTab === 'calculator' && (
            <div className="max-w-[1000px] mx-auto px-4 sm:px-6 py-8">
              <div className="mb-6">
                <h1 className="font-display text-5xl font-bold text-slate-900 leading-none">
                  Savings estimator
                </h1>
                <p className="text-base text-slate-600 mt-3 max-w-[40em]">
                  Estimate what you could save using an example commission rate, and how much closing cash back you could offer. Commission rates vary by province and are negotiable. All figures are estimates.
                </p>
              </div>
              <SavingsCalculator onApplyToListing={() => handleNavigate('wizard')} />
            </div>
          )}
        </Suspense>
      </main>

      <Footer onNavigate={handleNavigate} />
      <CookieConsentBanner onNavigateLegal={handleNavigate} />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authModalMode}
      />

      {recoveryMode && <PasswordRecoveryModal />}

      {toast && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-[90] -translate-x-1/2 rounded-lg bg-slate-900 px-4 py-3 text-sm text-white shadow-xl"
        >
          {toast}
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
