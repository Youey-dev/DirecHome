import React, { useState } from 'react';
import { Heart, ShieldCheck, LayoutDashboard, LogOut, ChevronDown } from 'lucide-react';
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

  const linkClass = (active: boolean) =>
    `inline-flex items-center min-h-[44px] whitespace-nowrap text-[16px] transition-colors cursor-pointer ${
      active ? 'text-emerald-700 underline underline-offset-[6px] decoration-[1.5px]' : 'text-slate-900 hover:text-emerald-700'
    }`;

  const drawerItem =
    'w-full text-left py-2.5 px-1 text-slate-900 hover:text-emerald-700 flex items-center justify-between gap-3 min-h-[44px] text-[16px]';

  return (
    <header className="relative z-40 w-full bg-white">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-3 sm:py-5 flex flex-wrap items-center justify-between gap-x-7 gap-y-1">
        {/* Brand */}
        <NavLink
          to="landing"
          onNavigate={handleNav}
          className="flex items-center gap-2.5 min-h-[44px] shrink-0 text-slate-900 text-[20px] font-semibold tracking-[-0.01em] leading-none"
          aria-label="OwnersMarket home"
        >
          <img src="/logo.png" alt="" width={30} height={30} className="w-[30px] h-[30px]" />
          <span>OwnersMarket</span>
        </NavLink>

        {/* Signed in: bell and account menu sit beside the logo on phones, at the end of the row on wider screens */}
        <nav aria-label="Main" className="order-last sm:order-none w-full sm:w-auto sm:ml-auto flex flex-wrap items-center gap-x-6 sm:gap-x-7 -mt-1 sm:mt-0">
          <NavLink to="browse" onNavigate={handleNav} className={linkClass(currentTab === 'browse')}>
            Browse
          </NavLink>
          <NavLink to="wizard" onNavigate={handleNav} className={linkClass(currentTab === 'wizard')}>
            {hasDraft ? 'Resume listing' : 'Sell'}
          </NavLink>
          <NavLink to="pricing" onNavigate={handleNav} className={linkClass(currentTab === 'pricing')}>
            Pricing
          </NavLink>
          {!isGuest && (
            <button onClick={() => handleNav('dashboard')} className={`${linkClass(currentTab === 'dashboard')} hidden md:inline-flex gap-1.5`}>
              Dashboard
              {dashboardBadge > 0 && (
                <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-rose-700 text-white text-[11px] font-semibold inline-flex items-center justify-center">
                  {dashboardBadge > 9 ? '9+' : dashboardBadge}
                  <span className="sr-only"> waiting</span>
                </span>
              )}
            </button>
          )}
          {isGuest && (
            <button onClick={() => onOpenAuth('signin')} className={linkClass(false)}>
              Sign in
            </button>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`${linkClass(mobileMenuOpen)} gap-1`}
            aria-expanded={mobileMenuOpen}
            aria-controls="site-menu"
          >
            More
            <ChevronDown className={`w-4 h-4 transition-transform ${mobileMenuOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
        </nav>

        {!isGuest && (
          <div className="flex items-center gap-1.5 shrink-0">
            <NotificationBell onOpenNotification={onOpenNotification} />
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-1.5 pl-1 pr-1.5 rounded-full hover:bg-mist cursor-pointer min-h-[44px]"
                aria-label="Account menu"
                aria-expanded={userDropdownOpen}
              >
                <span className="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center font-semibold text-[13px] shrink-0">
                  {activeUser.name ? activeUser.name.substring(0, 1).toUpperCase() : 'U'}
                </span>
                <ChevronDown className="w-4 h-4 text-slate-600" aria-hidden="true" />
              </button>

              {userDropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-hairline py-2 z-50 text-sm"
                  onMouseLeave={() => setUserDropdownOpen(false)}
                >
                  <div className="px-4 py-2.5 border-b border-hairline">
                    <div className="font-semibold text-slate-900">{activeUser.name}</div>
                    <div className="text-slate-600 text-[13px] truncate">{activeUser.email}</div>
                    <div className="text-slate-600 text-[13px] mt-0.5">
                      {activeUser.role === 'admin' ? 'Administrator' : 'Member account'}
                    </div>
                  </div>

                  <div className="py-1.5 border-b border-hairline">
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        handleNav('dashboard');
                      }}
                      className="w-full px-4 py-2.5 text-left hover:bg-mist text-slate-900 flex items-center gap-2.5 cursor-pointer"
                    >
                      <LayoutDashboard className="w-4 h-4 text-slate-500" aria-hidden="true" />
                      <span>My dashboard: homes, messages and viewings</span>
                    </button>

                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        handleNav('saved');
                      }}
                      className="w-full px-4 py-2.5 text-left hover:bg-mist text-slate-900 flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center gap-2.5">
                        <Heart className="w-4 h-4 text-slate-500" aria-hidden="true" />
                        <span>Saved homes</span>
                      </span>
                      {savedCount > 0 && <span className="text-slate-600 tabular-nums">{savedCount}</span>}
                    </button>

                    {activeUser.role === 'admin' && (
                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          handleNav('admin');
                        }}
                        className="w-full px-4 py-2.5 text-left hover:bg-mist text-slate-900 flex items-center gap-2.5 cursor-pointer"
                      >
                        <ShieldCheck className="w-4 h-4 text-slate-500" aria-hidden="true" />
                        <span>Admin console</span>
                      </button>
                    )}
                  </div>

                  <div className="pt-1.5 px-2">
                    <button
                      onClick={handleSignOut}
                      className="w-full py-2 px-2 text-left rounded-lg text-rose-700 hover:bg-rose-50 font-semibold flex items-center gap-2 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" aria-hidden="true" />
                      <span>Sign out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* "More": everything else, at every screen size */}
      {mobileMenuOpen && (
        <div id="site-menu" className="max-w-[1200px] mx-auto px-4 sm:px-6 pb-6">
          <div className="border-t border-hairline pt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8">
            {isGuest && (
              <button onClick={() => { setMobileMenuOpen(false); onOpenAuth('signup'); }} className={drawerItem}>
                <span>Create an account</span>
              </button>
            )}
            {!isGuest && (
              <button onClick={() => handleNav('dashboard')} className={drawerItem}>
                <span className="inline-flex items-center gap-2">
                  My dashboard
                  {dashboardBadge > 0 && (
                    <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-rose-700 text-white text-[11px] font-semibold inline-flex items-center justify-center">
                      {dashboardBadge > 9 ? '9+' : dashboardBadge}
                    </span>
                  )}
                </span>
              </button>
            )}
            <button onClick={() => handleNav('saved')} className={drawerItem}>
              <span>Saved homes</span>
              {savedCount > 0 && <span className="text-slate-600 tabular-nums">{savedCount}</span>}
            </button>
            <NavLink to="how-it-works" onNavigate={handleNav} className={drawerItem}>
              How it works
            </NavLink>
            <NavLink to="calculator" onNavigate={handleNav} className={drawerItem}>
              Savings estimator
            </NavLink>
            <NavLink to="guides" onNavigate={handleNav} className={drawerItem}>
              Seller guides
            </NavLink>
            <NavLink to="guide-buying" onNavigate={handleNav} className={drawerItem}>
              Buyer guide
            </NavLink>
            <NavLink to="about" onNavigate={handleNav} className={drawerItem}>
              About and contact
            </NavLink>
            {!isGuest && (
              <button onClick={handleSignOut} className={`${drawerItem} text-rose-700 hover:text-rose-800`}>
                <span>Sign out</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
