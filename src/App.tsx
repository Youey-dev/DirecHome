import React, { useState, useEffect } from 'react';
import { Listing, UserProfile } from './types/listing';
import { storage } from './lib/storage';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { LandingPage } from './pages/LandingPage';
import { BrowsePage } from './pages/BrowsePage';
import { ListingDetailPage } from './pages/ListingDetailPage';
import { WizardPage } from './pages/WizardPage';
import { DashboardPage } from './pages/DashboardPage';
import { AdminPage } from './pages/AdminPage';
import { SavedPage } from './pages/SavedPage';
import { HowItWorksPage } from './pages/HowItWorksPage';
import { LegalPage } from './pages/LegalPage';
import { SavingsCalculator } from './components/SavingsCalculator';
import { CookieConsentBanner } from './components/CookieConsentBanner';
import { AuthModal } from './components/AuthModal';
import { AuthProvider, useAuth } from './context/AuthContext';

function MainApp() {
  const [currentTab, setCurrentTab] = useState<string>('landing');
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [activeUser, setActiveUser] = useState<UserProfile>(storage.getActiveUser());
  const [hasDraft, setHasDraft] = useState<boolean>(false);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin');
  const [authModalRole, setAuthModalRole] = useState<'buyer' | 'seller'>('buyer');

  // Sync state with storage (RLS scoped to active user)
  useEffect(() => {
    const updateFromStorage = () => {
      const user = storage.getActiveUser();
      setListings(storage.getListings(user));
      setSavedIds(storage.getSavedIds());
      setActiveUser((prev) => (prev.id === user.id && prev.role === user.role ? prev : user));
      setHasDraft(!!storage.getDraft());
    };

    updateFromStorage();
    const unsub = storage.subscribe(updateFromStorage);
    return unsub;
  }, []);

  // Navigation handler
  const handleNavigate = (tab: string, listingId?: string) => {
    if (listingId) {
      setSelectedListingId(listingId);
    }
    setCurrentTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Toggle favorite
  const handleToggleFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    storage.toggleFavorite(id);
  };

  // Select a listing to view detail PDP
  const handleSelectListing = (id: string) => {
    setSelectedListingId(id);
    setCurrentTab('detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Switch demo persona
  const handleSwitchUser = (user: UserProfile) => {
    storage.setActiveUser(user);
    setActiveUser(user);
  };

  const [authModalTitle, setAuthModalTitle] = useState<string | undefined>(undefined);
  const [authModalSubtitle, setAuthModalSubtitle] = useState<string | undefined>(undefined);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // Open Auth Modal handler
  const handleOpenAuth = (
    mode: 'signin' | 'signup' = 'signin', 
    role: 'buyer' | 'seller' = 'buyer',
    title?: string,
    subtitle?: string,
    onSuccessAction?: () => void
  ) => {
    setAuthModalMode(mode);
    setAuthModalRole(role);
    setAuthModalTitle(title);
    setAuthModalSubtitle(subtitle);
    setPendingAction(() => onSuccessAction || null);
    setAuthModalOpen(true);
  };

  // Selected listing for PDP
  const currentListing = selectedListingId 
    ? storage.getListingById(selectedListingId) || listings[0]
    : listings[0];

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900">
      
      {/* Sticky Header with Top Bar Contract */}
      <Header
        currentTab={currentTab}
        onNavigate={handleNavigate}
        activeUser={activeUser}
        onSwitchUser={handleSwitchUser}
        savedCount={savedIds.length}
        hasDraft={hasDraft}
        onOpenAuth={handleOpenAuth}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {currentTab === 'landing' && (
          <LandingPage
            listings={listings}
            savedIds={savedIds}
            onToggleFavorite={handleToggleFavorite}
            onSelectListing={handleSelectListing}
            onNavigate={handleNavigate}
          />
        )}

        {currentTab === 'browse' && (
          <BrowsePage
            listings={listings}
            savedIds={savedIds}
            onToggleFavorite={handleToggleFavorite}
            onSelectListing={handleSelectListing}
          />
        )}

        {currentTab === 'detail' && currentListing && (
          <ListingDetailPage
            listing={currentListing}
            activeUser={activeUser}
            isFavorited={savedIds.includes(currentListing.id)}
            onToggleFavorite={handleToggleFavorite}
            onBack={() => handleNavigate('browse')}
          />
        )}

        {currentTab === 'wizard' && (
          <WizardPage
            activeUser={activeUser}
            onListingCreated={(newListing) => {
              setSelectedListingId(newListing.id);
              handleNavigate('dashboard');
            }}
            onCancel={() => handleNavigate('dashboard')}
          />
        )}

        {currentTab === 'dashboard' && (
          <DashboardPage
            activeUser={activeUser}
            onNavigate={handleNavigate}
            onEditListing={(listing) => {
              storage.saveDraft(listing);
              handleNavigate('wizard');
            }}
          />
        )}

        {currentTab === 'admin' && (
          <AdminPage
            activeUser={activeUser}
            onNavigate={handleNavigate}
          />
        )}

        {currentTab === 'saved' && (
          <SavedPage
            listings={listings}
            savedIds={savedIds}
            onToggleFavorite={handleToggleFavorite}
            onSelectListing={handleSelectListing}
            onNavigate={handleNavigate}
          />
        )}

        {currentTab === 'how-it-works' && (
          <HowItWorksPage onNavigate={handleNavigate} />
        )}

        {['terms', 'privacy', 'rules', 'cashback', 'notifications'].includes(currentTab) && (
          <LegalPage
            initialTab={currentTab as any}
            activeUser={activeUser}
            onNavigate={handleNavigate}
          />
        )}

        {currentTab === 'calculator' && (
          <div className="max-w-[1000px] mx-auto px-4 sm:px-6 py-8">
            <div className="mb-6">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                BC Real Estate Commission Savings Calculator
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Calculate standard 7%/2.5% BC commission savings and simulate how much closing cash-back you can offer to buyers.
              </p>
            </div>
            <SavingsCalculator onApplyToListing={() => handleNavigate('wizard')} />
          </div>
        )}
      </main>

      {/* Footer */}
      <Footer onNavigate={handleNavigate} />

      {/* Cookie & Privacy Consent Banner */}
      <CookieConsentBanner onNavigateLegal={handleNavigate} />

      {/* Sign In & Create Account Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authModalMode}
        initialRole={authModalRole}
        onSuccess={() => {
          const user = storage.getActiveUser();
          setActiveUser(user);
          if (authModalRole === 'seller' || user.role === 'seller') {
            handleNavigate('dashboard');
          }
        }}
      />
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
