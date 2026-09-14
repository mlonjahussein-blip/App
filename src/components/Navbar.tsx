import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext.tsx';
import { 
  ShieldAlert, 
  Menu, 
  X, 
  Sparkles, 
  LayoutDashboard, 
  FileText, 
  Users, 
  User as UserIcon, 
  Settings, 
  LogOut, 
  LogIn, 
  UserPlus, 
  Layers,
  CreditCard
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, setCurrentTab }) => {
  const { user, profile, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNav = (tab: string) => {
    setCurrentTab(tab);
    setMobileMenuOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    setCurrentTab('home');
    setMobileMenuOpen(false);
  };

  return (
    <nav id="main-navigation" className="sticky top-0 z-50 bg-neutral-950/90 backdrop-blur-md border-b border-neutral-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand Logo & Disclaimer indicator */}
          <div className="flex items-center gap-3">
            <button
              id="brand-logo-btn"
              onClick={() => handleNav('home')}
              className="flex items-center gap-2 text-left group focus:outline-none"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 p-0.5 shadow-lg shadow-emerald-500/20">
                <div className="w-full h-full bg-neutral-950 rounded-[10px] flex items-center justify-center">
                  <span className="font-black text-xl tracking-tighter bg-gradient-to-r from-emerald-400 to-cyan-300 bg-clip-text text-transparent">
                    eF
                  </span>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-black tracking-tight text-lg text-white group-hover:text-emerald-400 transition-colors">
                    eFootball AI Hub
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    AI Coach
                  </span>
                </div>
                <p className="text-[10px] text-neutral-400 font-medium truncate max-w-[190px] sm:max-w-none">
                  Independent Tactical Companion
                </p>
              </div>
            </button>
          </div>

          {/* Desktop Navigation links */}
          <div className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {!user ? (
              <>
                <button
                  id="nav-home"
                  onClick={() => handleNav('home')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentTab === 'home'
                      ? 'bg-neutral-800 text-emerald-400 font-semibold'
                      : 'text-neutral-300 hover:bg-neutral-900 hover:text-white'
                  }`}
                >
                  Home
                </button>
                <button
                  id="nav-community"
                  onClick={() => handleNav('community')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentTab === 'community'
                      ? 'bg-neutral-800 text-emerald-400 font-semibold'
                      : 'text-neutral-300 hover:bg-neutral-900 hover:text-white'
                  }`}
                >
                  Community
                </button>
                <div className="h-5 w-px bg-neutral-800 mx-2" />
                <button
                  id="nav-login"
                  onClick={() => handleNav('login')}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium text-neutral-200 hover:bg-neutral-800 transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  Login
                </button>
                <button
                  id="nav-signup"
                  onClick={() => handleNav('signup')}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 shadow-md shadow-emerald-500/20 transition-all"
                >
                  <UserPlus className="w-4 h-4" />
                  Sign Up
                </button>
              </>
            ) : (
              <>
                <button
                  id="nav-home-auth"
                  onClick={() => handleNav('home')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentTab === 'home'
                      ? 'bg-neutral-800 text-emerald-400 font-semibold'
                      : 'text-neutral-300 hover:bg-neutral-900 hover:text-white'
                  }`}
                >
                  Home
                </button>
                <button
                  id="nav-analyzer-auth"
                  onClick={() => handleNav('analyzer')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentTab === 'analyzer'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold'
                      : 'text-neutral-300 hover:bg-neutral-900 hover:text-white'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  AI Squad Analyzer
                </button>
                <button
                  id="nav-mysquad"
                  onClick={() => handleNav('mysquad')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentTab === 'mysquad'
                      ? 'bg-neutral-800 text-emerald-400 font-semibold'
                      : 'text-neutral-300 hover:bg-neutral-900 hover:text-white'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  My Squad
                </button>
                <button
                  id="nav-reports"
                  onClick={() => handleNav('reports')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentTab === 'reports'
                      ? 'bg-neutral-800 text-emerald-400 font-semibold'
                      : 'text-neutral-300 hover:bg-neutral-900 hover:text-white'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  Saved Reports
                </button>
                <button
                  id="nav-community-auth"
                  onClick={() => handleNav('community')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentTab === 'community'
                      ? 'bg-neutral-800 text-emerald-400 font-semibold'
                      : 'text-neutral-300 hover:bg-neutral-900 hover:text-white'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  Community
                </button>
                <button
                  id="nav-profile"
                  onClick={() => handleNav('profile')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentTab === 'profile' || currentTab === 'settings'
                      ? 'bg-neutral-800 text-emerald-400 font-semibold'
                      : 'text-neutral-300 hover:bg-neutral-900 hover:text-white'
                  }`}
                >
                  <UserIcon className="w-4 h-4" />
                  Profile
                </button>

                <div className="h-5 w-px bg-neutral-800 mx-2" />

                <div className="flex items-center gap-3">
                  <div className="text-right hidden xl:block">
                    <p className="text-xs font-semibold text-white leading-tight">
                      {profile?.displayName || user.email?.split('@')[0]}
                    </p>
                    <p className={`text-[10px] font-medium ${(profile?.freeAnalysesRemaining ?? 1) > 0 ? 'text-emerald-400' : 'text-neutral-400'}`}>
                      {(profile?.freeAnalysesRemaining ?? 1) > 0 ? `${profile?.freeAnalysesRemaining ?? 1} Free ${(profile?.freeAnalysesRemaining ?? 1) === 1 ? 'Analysis' : 'Analyses'} Left` : '0 Free Analysis Left'}
                    </p>
                  </div>
                  <button
                    id="nav-logout-btn"
                    onClick={handleLogout}
                    title="Sign Out"
                    className="p-2 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-neutral-900 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center">
            <button
              id="mobile-menu-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-900"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div id="mobile-nav-drawer" className="md:hidden bg-neutral-950 border-b border-neutral-800 px-4 pt-2 pb-6 space-y-2">
          {!user ? (
            <>
              <button
                onClick={() => handleNav('home')}
                className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-neutral-200 hover:bg-neutral-900"
              >
                Home
              </button>
              <button
                onClick={() => handleNav('community')}
                className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-neutral-200 hover:bg-neutral-900"
              >
                Community
              </button>
              <div className="pt-2 border-t border-neutral-800 flex gap-2">
                <button
                  onClick={() => handleNav('login')}
                  className="flex-1 py-2.5 rounded-lg text-center text-sm font-medium bg-neutral-900 text-white"
                >
                  Login
                </button>
                <button
                  onClick={() => handleNav('signup')}
                  className="flex-1 py-2.5 rounded-lg text-center text-sm font-semibold bg-emerald-500 text-neutral-950"
                >
                  Sign Up
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="p-3 bg-neutral-900 rounded-lg mb-2">
                <p className="text-sm font-bold text-white">{profile?.displayName || user.email}</p>
                <p className={`text-xs ${(profile?.freeAnalysesRemaining ?? 1) > 0 ? 'text-emerald-400' : 'text-neutral-400'}`}>
                  {(profile?.freeAnalysesRemaining ?? 1) > 0 ? `${profile?.freeAnalysesRemaining ?? 1} Free ${(profile?.freeAnalysesRemaining ?? 1) === 1 ? 'Analysis' : 'Analyses'} Available` : '0 Free Analysis Available'}
                </p>
              </div>
              <button
                onClick={() => handleNav('home')}
                className="w-full text-left px-3 py-2 rounded-lg text-sm text-neutral-200 hover:bg-neutral-900"
              >
                Home
              </button>
              <button
                onClick={() => handleNav('analyzer')}
                className="w-full text-left px-3 py-2 rounded-lg text-sm text-emerald-400 font-semibold bg-emerald-500/10"
              >
                AI Squad Analyzer
              </button>
              <button
                onClick={() => handleNav('mysquad')}
                className="w-full text-left px-3 py-2 rounded-lg text-sm text-neutral-200 hover:bg-neutral-900"
              >
                My Squad
              </button>
              <button
                onClick={() => handleNav('reports')}
                className="w-full text-left px-3 py-2 rounded-lg text-sm text-neutral-200 hover:bg-neutral-900"
              >
                Saved Reports
              </button>
              <button
                onClick={() => handleNav('community')}
                className="w-full text-left px-3 py-2 rounded-lg text-sm text-neutral-200 hover:bg-neutral-900"
              >
                Community
              </button>
              <button
                onClick={() => handleNav('profile')}
                className="w-full text-left px-3 py-2 rounded-lg text-sm text-neutral-200 hover:bg-neutral-900"
              >
                Profile & Settings
              </button>
              <button
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 rounded-lg text-sm text-rose-400 font-medium hover:bg-rose-500/10"
              >
                Logout
              </button>
            </>
          )}
        </div>
      )}

      {/* Mandatory Third-Party Disclaimer strip */}
      <div className="bg-neutral-900/90 py-1 px-4 text-center border-t border-neutral-800/80">
        <p className="text-[11px] text-neutral-400 inline-flex items-center gap-1.5">
          <ShieldAlert className="w-3 h-3 text-emerald-500 inline" />
          <span>
            eFootball AI Hub is an independent third-party project and is not affiliated with or endorsed by Konami.
          </span>
        </p>
      </div>
    </nav>
  );
};
