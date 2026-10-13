import React, { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import type { Listing } from './types/listing';
import { db, isGuestUser } from './lib/db';
import { isSupabaseConfigured } from './lib/supabase';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { LandingPage } from './pages/LandingPage';
import { BrowsePage } from './pages/BrowsePage';
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
const AdminPage = lazy(() => import('./pages/AdminPage').then((m) => ({ default: m.AdminPage })));
const LegalPage = lazy(() => import('./pages/LegalPage').then((m) => ({ default: m.LegalPage })));

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
};

const TAB_TITLES: Record<string, string> = {
  landing: 'DirectHome BC · Fraser Valley & Lower Mainland Home Marketplace',
  browse: 'Browse homes for sale by owner · DirectHome BC',
  wizard: 'List your home · DirectHome BC',
  dashboard: 'Your dashboard · DirectHome BC',
  admin: 'Admin · DirectHome BC',
  saved: 'Saved homes · DirectHome BC',
  'how-it-works': 'How it works · DirectHome BC',
  terms: 'Terms of Use · DirectHome BC',
  privacy: 'Privacy Policy · DirectHome BC',
  rules: 'Listing Rules · DirectHome BC',
  cashback: 'Cash-Back Policy · DirectHome BC',
  notifications: 'Notification Preferences · DirectHome BC',
  calculator: 'Commission Savings Calculator · DirectHome BC',
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
  const { user: activeUser, initializing, recoveryMode, becomeSeller } = useAuth();

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
  const [authModalRole, setAuthModalRole] = useState<'buyer' | 'seller'>('buyer');

  // Keep the screen in sync with the database cache
  useEffect(() => {
    const sync = () => {
      setListings(db.getListings());
      setSavedIds(db.getSavedIds());
      setHasDraft(!!db.getDraft());
      setDataReady(db.isLoaded());
      setLoadError(db.getLoadError());
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
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    document.title = TAB_TITLES[currentTab] ?? TAB_TITLES.landing;
  }, [currentTab]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 4500);
  }, []);

  const handleNavigate = useCallback((tab: string, listingId?: string) => {
    const nextListing = tab === 'detail' ? listingId ?? null : null;
    setSelectedListingId(nextListing);
    setCurrentTab(tab);
    const path = pathFor(tab, nextListing);
    if (window.location.pathname !== path) window.history.pushState({}, '', path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleOpenAuth = (mode: 'signin' | 'signup' = 'signin', role: 'buyer' | 'seller' = 'buyer') => {
    setAuthModalMode(mode);
    setAuthModalRole(role);
    setAuthModalOpen(true);
  };

  const handleToggleFavorite = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (isGuestUser(activeUser)) {
      handleOpenAuth('signup', 'buyer');
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
  if (initializing) return <Loading label="Loading DirectHome BC…" />;

  const signedIn = !isGuestUser(activeUser);
  const needsSignIn = (
    <Gate
      title="Please sign in to continue"
      text="You need a free account to see this page."
      action={{ label: 'Sign in', onClick: () => handleOpenAuth('signin', 'buyer') }}
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
              listings={listings.filter((l) => l.status === 'live')}
              savedIds={savedIds}
              onToggleFavorite={handleToggleFavorite}
              onSelectListing={handleSelectListing}
              onNavigate={handleNavigate}
            />
          )}

          {currentTab === 'browse' &&
            (dataReady ? (
              <BrowsePage
                listings={listings.filter((l) => l.status === 'live')}
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
                text="Create a free homeowner account to start your listing."
                action={{ label: 'Create homeowner account', onClick: () => handleOpenAuth('signup', 'seller') }}
              />
            ) : activeUser.role === 'buyer' ? (
              <Gate
                title="Switch to a homeowner account"
                text="Your account is currently a buyer account. You can switch to a homeowner account to list a home — you will still be able to browse and save homes."
                action={{
                  label: 'Switch to homeowner account',
                  onClick: async () => {
                    const res = await becomeSeller();
                    if (!res.success) showToast(res.error || 'Could not switch your account.');
                  },
                }}
              />
            ) : (
              <WizardPage
                activeUser={activeUser}
                onListingCreated={() => handleNavigate('dashboard')}
                onCancel={() => handleNavigate('dashboard')}
              />
            ))}

          {currentTab === 'dashboard' &&
            (signedIn && activeUser.role === 'buyer' ? (
              <Gate
                title="The dashboard is for homeowners"
                text="Your account is a buyer account. To follow a home you asked about, open its listing page — your messages and viewing status appear there. To list a home, switch to a homeowner account."
                action={{
                  label: 'Switch to homeowner account',
                  onClick: async () => {
                    const res = await becomeSeller();
                    if (!res.success) showToast(res.error || 'Could not switch your account.');
                  },
                }}
              />
            ) : signedIn ? (
              <DashboardPage
                activeUser={activeUser}
                onNavigate={handleNavigate}
                onEditListing={(listing) => {
                  db.saveDraft(listing as unknown as Record<string, any>);
                  handleNavigate('wizard');
                }}
              />
            ) : (
              needsSignIn
            ))}

          {currentTab === 'admin' &&
            (activeUser.role === 'admin' ? (
              <AdminPage activeUser={activeUser} onNavigate={handleNavigate} />
            ) : (
              <Gate title="Restricted area" text="This page is only available to DirectHome administrators." />
            ))}

          {currentTab === 'saved' &&
            (signedIn ? (
              <SavedPage
                listings={listings.filter((l) => l.status === 'live')}
                savedIds={savedIds}
                onToggleFavorite={handleToggleFavorite}
                onSelectListing={handleSelectListing}
                onNavigate={handleNavigate}
              />
            ) : (
              needsSignIn
            ))}

          {currentTab === 'how-it-works' && <HowItWorksPage onNavigate={handleNavigate} />}

          {['terms', 'privacy', 'rules', 'cashback', 'notifications'].includes(currentTab) && (
            <LegalPage initialTab={currentTab as any} activeUser={activeUser} onNavigate={handleNavigate} />
          )}

          {currentTab === 'calculator' && (
            <div className="max-w-[1000px] mx-auto px-4 sm:px-6 py-8">
              <div className="mb-6">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                  BC Real Estate Commission Savings Calculator
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Calculate standard 7%/2.5% BC commission savings and simulate how much closing cash-back you can offer
                  to buyers.
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
        initialRole={authModalRole}
        onSuccess={(role) => {
          if (role === 'seller') handleNavigate('dashboard');
        }}
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
