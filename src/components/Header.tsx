import React, { useState } from 'react';
import { 
  Building2, 
  Heart, 
  UserCheck, 
  ShieldCheck, 
  Menu, 
  X, 
  PlusCircle, 
  Compass, 
  Calculator,
  LayoutDashboard,
  LogOut,
  ChevronDown,
  User,
  MessageSquare,
  BookOpen
} from 'lucide-react';
import { AppNotification, UserProfile } from '../types/listing';
import { useAuth } from '../context/AuthContext';
import { NotificationBell } from './NotificationBell';
import { NavLink } from './NavLink';

interface HeaderProps {
  currentTab: string;
  onNavigate: (tab: string, listingId?: string) => void;
  activeUser: UserProfile;
  savedCount: number;
  hasDraft: boolean;
  onOpenAuth: (mode?: 'signin' | 'signup') => void;
  onOpenNotification: (n: AppNotification) => void;
  /** Number of things waiting for the person in their dashboard (unread messages, viewing updates). */
  dashboardBadge?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onNavigate,
  activeUser,
  savedCount,
  hasDraft,
  onOpenAuth,
  onOpenNotification,
  dashboardBadge = 0
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const isGuest = activeUser.isGuest || activeUser.role === 'guest' || !activeUser.email;

  const handleNav = (tab: string) => {
    onNavigate(tab);
    setMobileMenuOpen(false);
  };

  const { signOut } = useAuth();

  const handleSignOut = async () => {
    setUserDropdownOpen(false);
    await signOut();
    handleNav('landing');
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 h-[68px] flex items-center justify-between gap-4 sm:gap-6">
        
        {/* Zone 1: Brand Wordmark */}
        <NavLink
          to="landing"
          onNavigate={handleNav}
          className="flex items-center gap-2 cursor-pointer shrink-0 text-left"
          aria-label="OwnersMarket home"
        >
          <img src="/logo.png" alt="" width={40} height={40} className="w-10 h-10 -my-1" />
          <span className="font-display font-bold text-slate-900 text-[26px] leading-none">
            OwnersMarket
          </span>
        </NavLink>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden lg:flex items-center gap-5 text-sm font-medium text-slate-600">
          <NavLink
            to="browse"
            onNavigate={handleNav}
            className={`cursor-pointer transition-colors whitespace-nowrap shrink-0 hover:text-slate-900 py-1 ${
              currentTab === 'browse' ? 'text-emerald-700 font-semibold' : ''
            }`}
          >
            Browse homes
          </NavLink>

          <NavLink
            to="calculator"
            onNavigate={handleNav}
            className={`cursor-pointer transition-colors whitespace-nowrap shrink-0 hover:text-slate-900 py-1 ${
              currentTab === 'calculator' ? 'text-emerald-700 font-semibold' : ''
            }`}
          >
            Savings estimator
          </NavLink>

          <NavLink
            to="how-it-works"
            onNavigate={handleNav}
            className={`cursor-pointer transition-colors whitespace-nowrap shrink-0 hover:text-slate-900 py-1 ${
              currentTab === 'how-it-works' ? 'text-emerald-700 font-semibold' : ''
            }`}
          >
            How it works
          </NavLink>

          <NavLink
            to="guide-selling"
            onNavigate={handleNav}
            className={`cursor-pointer transition-colors whitespace-nowrap shrink-0 hover:text-slate-900 py-1 ${
              currentTab.startsWith('guide-') ? 'text-emerald-700 font-semibold' : ''
            }`}
          >
            Guides
          </NavLink>

          <button
            onClick={() => handleNav('dashboard')}
            className={`cursor-pointer transition-colors whitespace-nowrap shrink-0 hover:text-slate-900 py-1 ${
              currentTab === 'dashboard' ? 'text-emerald-700 font-semibold' : ''
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              My dashboard
              {dashboardBadge > 0 && (
                <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold inline-flex items-center justify-center">
                  {dashboardBadge > 9 ? '9+' : dashboardBadge}
                </span>
              )}
            </span>
          </button>

          <button
            onClick={() => handleNav('saved')}
            className={`cursor-pointer transition-colors whitespace-nowrap shrink-0 hover:text-slate-900 py-1 relative flex items-center gap-1.5 ${
              currentTab === 'saved' ? 'text-emerald-700 font-semibold' : ''
            }`}
            aria-label="Saved homes"
          >
            <span>Saved</span>
            {savedCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center">
                {savedCount}
              </span>
            )}
          </button>
        </nav>

        {/* Zone 3: Auth Controls & Primary Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          
          {/* Guest State: Explicit Sign In / Create Account buttons */}
          {isGuest ? (
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={() => onOpenAuth('signin')}
                className="px-3 py-2 text-[15px] font-medium text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer min-h-[44px]"
              >
                Sign in
              </button>
              <button
                onClick={() => onOpenAuth('signup')}
                className="px-4 py-2 text-[15px] font-semibold text-slate-900 bg-white hover:bg-slate-50 border-[1.5px] border-slate-900 rounded-md transition-colors cursor-pointer min-h-[44px]"
              >
                Create account
              </button>
            </div>
          ) : (
            /* Logged-In: notification bell + profile menu */
            <>
            <NotificationBell onOpenNotification={onOpenNotification} />
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200/80 rounded-xl transition-all border border-slate-200/80 cursor-pointer min-h-[38px]"
                title="Account menu"
              >
                <div className="w-6 h-6 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                  {activeUser.name ? activeUser.name.substring(0, 1).toUpperCase() : 'U'}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="font-bold text-slate-900 max-w-[120px] truncate leading-tight">
                    {activeUser.name}
                  </div>
                  <div className="text-[10px] text-slate-500 font-semibold">
                    {activeUser.role === 'admin' ? 'Admin' : 'Member'}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {userDropdownOpen && (
                <div 
                  className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2.5 z-50 text-xs"
                  onMouseLeave={() => setUserDropdownOpen(false)}
                >
                  {/* Account Summary Header */}
                  <div className="px-4 py-2 border-b border-slate-100">
                    <div className="font-bold text-slate-900 text-sm">{activeUser.name}</div>
                    <div className="text-slate-500 text-[11px] truncate">{activeUser.email}</div>
                    <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      <ShieldCheck className="w-3 h-3" />
                      <span>{activeUser.role === 'admin' ? 'Administrator' : 'Member account'}</span>
                    </div>
                  </div>

                  {/* Navigation Links inside Dropdown */}
                  <div className="py-1.5 border-b border-slate-100">
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        handleNav('dashboard');
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-slate-50 text-slate-700 flex items-center gap-2.5 cursor-pointer font-medium"
                    >
                      <LayoutDashboard className="w-4 h-4 text-slate-400" />
                      <span>My dashboard: homes, messages and viewings</span>
                    </button>

                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        handleNav('saved');
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-slate-50 text-slate-700 flex items-center justify-between cursor-pointer font-medium"
                    >
                      <div className="flex items-center gap-2.5">
                        <Heart className="w-4 h-4 text-slate-400" />
                        <span>Saved homes</span>
                      </div>
                      {savedCount > 0 && (
                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold">
                          {savedCount}
                        </span>
                      )}
                    </button>
                  </div>

                  {activeUser.role === 'admin' && (
                    <div className="px-2 pt-1">
                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          handleNav('admin');
                        }}
                        className="w-full px-2 py-2 text-left rounded-lg hover:bg-slate-50 text-slate-700 flex items-center gap-2.5 cursor-pointer font-medium"
                      >
                        <ShieldCheck className="w-4 h-4 text-slate-400" />
                        <span>Admin console</span>
                      </button>
                    </div>
                  )}

                  {/* Sign Out CTA */}
                  <div className="pt-2 border-t border-slate-100 mt-1 px-2">
                    <button
                      onClick={handleSignOut}
                      className="w-full py-1.5 px-3 text-left rounded-lg text-rose-700 hover:bg-rose-50 font-semibold flex items-center gap-2 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
            </>
          )}

          {/* Primary CTA Button: List Your Home */}
          <button
            onClick={() => {
              if (isGuest) {
                onOpenAuth('signup');
              } else {
                handleNav('wizard');
              }
            }}
            className="flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2 text-xs sm:text-[15px] font-semibold text-white bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] rounded-md transition-all whitespace-nowrap shrink-0 min-h-[44px] cursor-pointer"
          >
            <span>{hasDraft ? 'Resume listing' : 'List your home'}</span>
          </button>

          {/* Mobile Menu Hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-3 shadow-xl animate-fade-in">
          
          {/* User Info Bar if logged in */}
          {!isGuest && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-slate-900">{activeUser.name}</div>
                <div className="text-xs text-slate-500">{activeUser.email}</div>
              </div>
              <button
                onClick={handleSignOut}
                className="text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg"
              >
                Sign out
              </button>
            </div>
          )}

          {/* Guest Sign In / Create Account in Mobile Menu */}
          {isGuest && (
            <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-100">
              <button
                onClick={() => { setMobileMenuOpen(false); onOpenAuth('signin'); }}
                className="py-2.5 px-3 text-center border border-slate-300 text-slate-800 rounded-xl text-xs font-semibold hover:bg-slate-50 min-h-[44px]"
              >
                Sign in
              </button>
              <button
                onClick={() => { setMobileMenuOpen(false); onOpenAuth('signup'); }}
                className="py-2.5 px-3 text-center bg-emerald-700 text-white rounded-xl text-xs font-bold hover:bg-emerald-800 min-h-[44px]"
              >
                Create account
              </button>
            </div>
          )}

          <NavLink
            to="browse"
            onNavigate={handleNav}
            className="w-full text-left py-2.5 px-3 rounded-lg text-slate-700 hover:bg-slate-50 flex items-center gap-3 font-medium min-h-[44px]"
          >
            <Compass className="w-5 h-5 text-slate-400" />
            <span>Browse homes</span>
          </NavLink>

          <NavLink
            to="calculator"
            onNavigate={handleNav}
            className="w-full text-left py-2.5 px-3 rounded-lg text-slate-700 hover:bg-slate-50 flex items-center gap-3 font-medium min-h-[44px]"
          >
            <Calculator className="w-5 h-5 text-slate-400" />
            <span>Savings estimator</span>
          </NavLink>

          <NavLink
            to="how-it-works"
            onNavigate={handleNav}
            className="w-full text-left py-2.5 px-3 rounded-lg text-slate-700 hover:bg-slate-50 flex items-center gap-3 font-medium min-h-[44px]"
          >
            <Building2 className="w-5 h-5 text-slate-400" />
            <span>How OwnersMarket works</span>
          </NavLink>

          <NavLink
            to="guide-selling"
            onNavigate={handleNav}
            className="w-full text-left py-2.5 px-3 rounded-lg text-slate-700 hover:bg-slate-50 flex items-center gap-3 font-medium min-h-[44px]"
          >
            <BookOpen className="w-5 h-5 text-slate-400" />
            <span>Seller guide</span>
          </NavLink>

          <NavLink
            to="guide-buying"
            onNavigate={handleNav}
            className="w-full text-left py-2.5 px-3 rounded-lg text-slate-700 hover:bg-slate-50 flex items-center gap-3 font-medium min-h-[44px]"
          >
            <BookOpen className="w-5 h-5 text-slate-400" />
            <span>Buyer guide</span>
          </NavLink>

          <button
            onClick={() => handleNav('dashboard')}
            className="w-full text-left py-2.5 px-3 rounded-lg text-slate-700 hover:bg-slate-50 flex items-center gap-3 font-medium min-h-[44px]"
          >
            <LayoutDashboard className="w-5 h-5 text-slate-400" />
            <span className="inline-flex items-center gap-2">My dashboard{dashboardBadge > 0 && <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold inline-flex items-center justify-center">{dashboardBadge > 9 ? '9+' : dashboardBadge}</span>}</span>
          </button>

          <button
            onClick={() => handleNav('saved')}
            className="w-full text-left py-2.5 px-3 rounded-lg text-slate-700 hover:bg-slate-50 flex items-center justify-between font-medium min-h-[44px]"
          >
            <div className="flex items-center gap-3">
              <Heart className="w-5 h-5 text-slate-400" />
              <span>Saved homes</span>
            </div>
            {savedCount > 0 && (
              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full text-xs font-bold">
                {savedCount}
              </span>
            )}
          </button>

          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                if (isGuest) {
                  onOpenAuth('signup');
                } else {
                  handleNav('wizard');
                }
              }}
              className="w-full py-3 bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 min-h-[48px]"
            >
              <PlusCircle className="w-5 h-5" />
              <span>{hasDraft ? 'Resume Your Listing' : 'List Your Home'}</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
