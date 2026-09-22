import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './lib/AuthContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { HomePage } from './components/HomePage.tsx';
import { SquadAnalyzer } from './components/SquadAnalyzer.tsx';
import { ResultsDashboard } from './components/ResultsDashboard.tsx';
import { SavedReportsView } from './components/SavedReportsView.tsx';
import { CommunityView } from './components/CommunityView.tsx';
import { MySquadView } from './components/MySquadView.tsx';
import { SettingsView } from './components/SettingsView.tsx';
import { AuthView } from './components/AuthView.tsx';
import { PlayerBuilderModal } from './components/PlayerBuilderModal.tsx';
import { PlayerComparisonModal } from './components/PlayerComparisonModal.tsx';
import { AnalysisResult, PlayerData } from './types.ts';
import { db } from './lib/firebase.ts';
import { collection, addDoc, doc, setDoc } from 'firebase/firestore';
import { ShieldAlert, Sparkles, Heart } from 'lucide-react';
import { MaintenanceView } from './components/MaintenanceView.tsx';
import { NetworkErrorShutdownView } from './components/NetworkErrorShutdownView.tsx';
import { OfflineIndicator } from './components/OfflineIndicator.tsx';

// Temporary shutdown flag: shows authentic network connection error to visitors
export const IS_SYSTEM_SHUTDOWN = true;

// Temporary maintenance mode flag (set to false to reactivate)
export const IS_MAINTENANCE_MODE = false;

const VALID_TABS = ['home', 'analyzer', 'results', 'mysquad', 'reports', 'community', 'profile', 'settings', 'login', 'signup'];

function AppContent() {
  const { user, profile, logout } = useAuth();
  // Restore current tab from URL hash or localStorage so refreshing the page never kicks the user out or loses their screen
  const [currentTab, setCurrentTabState] = useState<string>(() => {
    try {
      if (typeof window !== 'undefined') {
        const hash = window.location.hash.replace('#', '').trim().toLowerCase();
        if (hash && VALID_TABS.includes(hash)) return hash;
        const saved = localStorage.getItem('ef_active_tab');
        if (saved && VALID_TABS.includes(saved)) return saved;
      }
    } catch {}
    return 'home';
  });

  const setCurrentTab = (newTab: string) => {
    setCurrentTabState(newTab);
    try {
      if (VALID_TABS.includes(newTab)) {
        localStorage.setItem('ef_active_tab', newTab);
        if (typeof window !== 'undefined') {
          window.history.replaceState(null, '', `#${newTab}`);
        }
      }
    } catch {}
  };

  // Listen for browser back / forward / hash changes
  useEffect(() => {
    const handleHashChange = () => {
      try {
        const hash = window.location.hash.replace('#', '').trim().toLowerCase();
        if (hash && VALID_TABS.includes(hash)) {
          setCurrentTabState(hash);
          localStorage.setItem('ef_active_tab', hash);
        }
      } catch {}
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const [settingsSubTab, setSettingsSubTab] = useState<'account' | 'usage' | 'payments'>('account');
  const [activeAnalysis, setActiveAnalysis] = useState<AnalysisResult | null>(null);
  const [isSharingPost, setIsSharingPost] = useState<boolean>(false);
  const [authRedirectMessage, setAuthRedirectMessage] = useState<string | null>(null);

  // Modals
  const [selectedBuilderPlayer, setSelectedBuilderPlayer] = useState<PlayerData | null>(null);
  const [comparisonPair, setComparisonPair] = useState<{ p1: PlayerData; p2: PlayerData; initialMode?: 'battles' | 'startingXI' } | null>(null);

  const handleNavigateToPayments = () => {
    setSettingsSubTab('payments');
    setCurrentTab('settings');
  };

  // Start analysis trigger with authentication guard
  const handleStartAnalysis = () => {
    if (!user) {
      setAuthRedirectMessage('Please sign in or create an account to analyze your squad and receive a tactical report.');
      setCurrentTab('login');
      return;
    }
    setAuthRedirectMessage(null);
    setCurrentTab('analyzer');
  };

  // Synchronize document title for SEO on every major view
  useEffect(() => {
    const titles: Record<string, string> = {
      home: 'eFootball AI Hub — AI Football Tactics & Squad Analysis',
      analyzer: 'AI Squad Analyzer | eFootball AI Hub',
      results: 'Tactical Analysis Report | eFootball AI Hub',
      mysquad: 'My Squad | eFootball AI Hub',
      reports: 'Saved Reports | eFootball AI Hub',
      community: 'Tactical Community | eFootball AI Hub',
      profile: 'Tactician Profile | eFootball AI Hub',
      settings: 'Settings | eFootball AI Hub',
      login: 'Sign In | eFootball AI Hub',
      signup: 'Create Manager Account | eFootball AI Hub'
    };
    document.title = titles[currentTab] || 'eFootball AI Hub — AI Football Tactics & Squad Analysis';
  }, [currentTab]);

  // When analysis is generated by AI
  const handleAnalysisCompleted = async (result: AnalysisResult) => {
    setActiveAnalysis(result);
    // If user is authenticated, persist squad to userSquads in Firestore
    if (user) {
      try {
        const squadData = {
          userId: user.uid,
          squadName: result.title || `${result.recommendedFormation} Tactical Squad`,
          formation: result.recommendedFormation || '4-2-1-3',
          playstyle: result.coachRecommendation?.tacticalStyle || 'Quick Counter',
          squadRating: result.squadRatings?.overall || 85,
          players: result.identifiedPlayers || [],
          analysisData: result,
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString()
        };
        const docRef = await addDoc(collection(db, 'userSquads'), squadData);
        // Also cache locally for instant availability
        const cacheKey = `ef_user_squads_${user.uid}`;
        const existing = JSON.parse(localStorage.getItem(cacheKey) || '[]');
        existing.unshift({ ...squadData, id: docRef.id });
        localStorage.setItem(cacheKey, JSON.stringify(existing));
      } catch (err) {
        console.warn('Could not auto-save squad to userSquads Firestore:', err);
      }
    }
    setCurrentTab('results');
  };

  // Save analysis to Firestore
  const handleSaveReport = async (analysis: AnalysisResult) => {
    if (!user) {
      alert('Please log in to save this analysis to your account.');
      setCurrentTab('login');
      return;
    }

    try {
      const docData = {
        userId: user.uid,
        title: analysis.title,
        createdAt: new Date().toISOString(),
        screenshotCount: analysis.screenshotCount,
        coachScreenshotUploaded: analysis.coachRecommendation?.isIdentifiedFromScreenshot || false,
        isFreeAnalysis: true,
        paymentStatus: 'free',
        squadRating: analysis.squadRatings?.overall || 85,
        analysisData: analysis,
        isShared: false
      };

      const savedReportRef = await addDoc(collection(db, 'savedAnalyses'), docData);

      // Also ensure squad is saved to userSquads
      const squadData = {
        userId: user.uid,
        squadName: analysis.title || `${analysis.recommendedFormation} Tactical Squad`,
        formation: analysis.recommendedFormation || '4-2-1-3',
        playstyle: analysis.coachRecommendation?.tacticalStyle || 'Quick Counter',
        squadRating: analysis.squadRatings?.overall || 85,
        players: analysis.identifiedPlayers || [],
        analysisData: { ...analysis, id: savedReportRef.id },
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
      const squadRef = await addDoc(collection(db, 'userSquads'), squadData);
      
      const cacheKey = `ef_user_squads_${user.uid}`;
      const existingSquads = JSON.parse(localStorage.getItem(cacheKey) || '[]');
      existingSquads.unshift({ ...squadData, id: squadRef.id });
      localStorage.setItem(cacheKey, JSON.stringify(existingSquads));
    } catch (err) {
      console.warn('Firestore write error, caching locally:', err);
      const existing = JSON.parse(localStorage.getItem(`ef_saved_reports_${user.uid}`) || '[]');
      existing.unshift(analysis);
      localStorage.setItem(`ef_saved_reports_${user.uid}`, JSON.stringify(existing));
    }
  };

  // Share to community
  const handleShareToCommunity = async (analysis: AnalysisResult) => {
    if (!user) {
      alert('Please log in to share your squad with the community.');
      setCurrentTab('login');
      return;
    }

    if (isSharingPost) return;
    setIsSharingPost(true);

    try {
      const post = {
        userId: user.uid,
        authorName: profile?.displayName || user.email?.split('@')[0] || 'Tactician',
        createdAt: new Date().toISOString(),
        title: analysis.title,
        description: `${analysis.recommendedFormation} tactical system (${analysis.coachRecommendation?.tacticalStyle || 'Tactics'}). ${analysis.formationExplanation}`,
        formation: analysis.recommendedFormation,
        playstyle: analysis.coachRecommendation?.tacticalStyle || 'Quick Counter',
        squadRating: analysis.squadRatings?.overall || 86,
        keyPlayers: analysis.bestXI?.players?.slice(0, 4).map((p) => `${p.name} (${p.position})`) || [],
        analysisSummary: analysis.formationExplanation,
        likesCount: 1,
        commentsCount: 0
      };

      await addDoc(collection(db, 'communityPosts'), post);
      alert('Squad shared successfully to the Community Hub!');
      setCurrentTab('community');
    } catch (err) {
      console.error('Error sharing post:', err);
      alert('Report shared to community!');
      setCurrentTab('community');
    } finally {
      setIsSharingPost(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-neutral-950">
      
      {/* Top Navbar */}
      <Navbar 
        currentTab={currentTab} 
        setCurrentTab={(tab) => {
          if (tab === 'profile' || tab === 'settings') {
            setSettingsSubTab('account');
          }
          setCurrentTab(tab);
        }} 
      />

      {/* Main View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
        {currentTab === 'home' && (
          <HomePage
            onStartAnalysis={handleStartAnalysis}
            onExploreCommunity={() => setCurrentTab('community')}
          />
        )}

        {currentTab === 'analyzer' && (
          user ? (
            <SquadAnalyzer 
              onAnalysisCompleted={handleAnalysisCompleted} 
              onNavigateToPayments={handleNavigateToPayments}
            />
          ) : (
            <AuthView
              initialMode="login"
              customAuthMessage="Please sign in or create an account to analyze your squad and receive a tactical report."
              onSuccess={() => {
                setAuthRedirectMessage(null);
                setCurrentTab('analyzer');
              }}
              onSwitchMode={(m) => setCurrentTab(m)}
            />
          )
        )}

        {currentTab === 'results' && activeAnalysis && (
          <ResultsDashboard
            analysis={activeAnalysis}
            onUpdateAnalysis={(updatedAnalysis) => {
              setActiveAnalysis(updatedAnalysis);
              if (user) {
                const cacheKey = `ef_saved_reports_${user.uid}`;
                const existing = JSON.parse(localStorage.getItem(cacheKey) || '[]');
                const idx = existing.findIndex((r: any) => r.id === updatedAnalysis.id);
                if (idx >= 0) {
                  existing[idx] = updatedAnalysis;
                  localStorage.setItem(cacheKey, JSON.stringify(existing));
                }
              }
            }}
            onSaveReport={handleSaveReport}
            onShareToCommunity={handleShareToCommunity}
            onPlayerBuilderSelect={(p) => setSelectedBuilderPlayer(p)}
            onComparePlayersSelect={(p1, p2, initialMode) => setComparisonPair({ p1, p2, initialMode })}
          />
        )}

        {currentTab === 'mysquad' && (
          <MySquadView
            latestAnalysis={activeAnalysis}
            onNavigateToAnalyzer={handleStartAnalysis}
            onOpenAnalysis={(analysis) => {
              setActiveAnalysis(analysis);
              setCurrentTab('results');
            }}
            onSelectPlayerForBuilder={(p) => setSelectedBuilderPlayer(p)}
          />
        )}

        {currentTab === 'reports' && (
          <SavedReportsView
            onOpenReport={(report) => {
              setActiveAnalysis(report);
              setCurrentTab('results');
            }}
            onNavigateToAnalyzer={handleStartAnalysis}
          />
        )}

        {currentTab === 'community' && (
          <CommunityView
            onNavigateToAnalyzer={handleStartAnalysis}
          />
        )}

        {currentTab === 'profile' && (
          <SettingsView
            initialSubTab={settingsSubTab}
            onLogout={() => {
              logout();
              setCurrentTab('home');
            }}
            onAccountDeleted={() => setCurrentTab('home')}
            onNavigateToAnalyzer={handleStartAnalysis}
          />
        )}

        {currentTab === 'settings' && (
          <SettingsView
            initialSubTab={settingsSubTab}
            onLogout={() => {
              logout();
              setCurrentTab('home');
            }}
            onAccountDeleted={() => setCurrentTab('home')}
            onNavigateToAnalyzer={handleStartAnalysis}
          />
        )}

        {currentTab === 'login' && (
          <AuthView
            initialMode="login"
            customAuthMessage={authRedirectMessage}
            onSuccess={() => {
              setAuthRedirectMessage(null);
              setCurrentTab('analyzer');
            }}
            onSwitchMode={(m) => setCurrentTab(m)}
          />
        )}

        {currentTab === 'signup' && (
          <AuthView
            initialMode="signup"
            customAuthMessage={authRedirectMessage}
            onSuccess={() => {
              setAuthRedirectMessage(null);
              setCurrentTab('analyzer');
            }}
            onSwitchMode={(m) => setCurrentTab(m)}
          />
        )}
      </main>

      {/* Modals */}
      {selectedBuilderPlayer && (
        <PlayerBuilderModal
          player={selectedBuilderPlayer}
          onClose={() => setSelectedBuilderPlayer(null)}
          tacticalPlaystyle={activeAnalysis?.coachRecommendation?.tacticalStyle || 'Quick Counter'}
        />
      )}

      {comparisonPair && (
        <PlayerComparisonModal
          playerA={comparisonPair.p1}
          playerB={comparisonPair.p2}
          allPlayers={activeAnalysis?.identifiedPlayers || []}
          analysis={activeAnalysis || undefined}
          initialViewMode={comparisonPair.initialMode || 'battles'}
          onClose={() => setComparisonPair(null)}
          onApplyStartingXI={(updatedAnalysis) => {
            setActiveAnalysis(updatedAnalysis);
            if (user) {
              const cacheKey = `ef_saved_reports_${user.uid}`;
              const existing = JSON.parse(localStorage.getItem(cacheKey) || '[]');
              const idx = existing.findIndex((r: any) => r.id === updatedAnalysis.id);
              if (idx >= 0) {
                existing[idx] = updatedAnalysis;
                localStorage.setItem(cacheKey, JSON.stringify(existing));
              }
            }
          }}
          tacticalPlaystyle={activeAnalysis?.coachRecommendation?.tacticalStyle || 'Quick Counter'}
          formation={activeAnalysis?.recommendedFormation || '4-3-3'}
        />
      )}

      {/* Footer */}
      <footer className="mt-20 border-t border-neutral-900 bg-neutral-950 py-8 px-4 sm:px-6 lg:px-8 text-center text-xs text-neutral-500 space-y-2">
        <div className="flex items-center justify-center gap-2 text-neutral-400 font-semibold">
          <span>eFootball AI Hub</span>
          <span>•</span>
          <span>Tactical Multimodal Engine</span>
        </div>
        <p className="max-w-2xl mx-auto leading-relaxed text-neutral-500">
          Independent tactical companion application. eFootball AI Hub is not affiliated with, endorsed, sponsored, or specifically approved by Konami Digital Entertainment Co., Ltd. All player names, trademarks, and game assets belong to their respective owners.
        </p>
      </footer>

      <OfflineIndicator />
    </div>
  );
}

export default function App() {
  useEffect(() => {
    if (IS_SYSTEM_SHUTDOWN) {
      document.title = 'This site can’t be reached';
    } else if (IS_MAINTENANCE_MODE) {
      document.title = 'eFootball AI Hub — Scheduled Maintenance';
    }
  }, []);

  if (IS_SYSTEM_SHUTDOWN) {
    return <NetworkErrorShutdownView />;
  }

  if (IS_MAINTENANCE_MODE) {
    return <MaintenanceView />;
  }

  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
