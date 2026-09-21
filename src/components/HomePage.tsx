import React, { useState } from 'react';
import { 
  Shield, 
  Sparkles, 
  Target, 
  Activity, 
  Users, 
  Compass, 
  Award, 
  Zap,
  FileText,
  AlertCircle,
  Lock,
  CreditCard,
  Play,
  Bot,
  Video,
  Eye
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext.tsx';
import { AiAnalysisDemoModal } from './AiAnalysisDemoModal.tsx';

interface HomePageProps {
  onStartAnalysis: () => void;
  onExploreCommunity: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onStartAnalysis, onExploreCommunity }) => {
  const { user, profile } = useAuth();
  const [activeModal, setActiveModal] = useState<'privacy' | 'disclaimer' | 'terms' | null>(null);
  const [showDemoModal, setShowDemoModal] = useState<boolean>(false);

  // Private gate check: Only visible to user Mr. Who (or mlonjahussein@gmail.com / admin)
  const isAuthorizedViewer = Boolean(
    user && (
      profile?.role === 'admin' ||
      profile?.displayName?.toLowerCase().includes('mr. who') ||
      profile?.displayName?.toLowerCase().includes('mr who') ||
      user.displayName?.toLowerCase().includes('mr. who') ||
      user.displayName?.toLowerCase().includes('mr who') ||
      user.email?.toLowerCase() === 'mlonjahussein@gmail.com'
    )
  );

  return (
    <div className="space-y-16 py-6 sm:py-10">
      
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-neutral-900 via-neutral-950 to-neutral-950 border border-neutral-800 p-8 sm:p-14 text-center shadow-2xl">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neutral-900 border border-emerald-500/30 text-emerald-400 text-xs sm:text-sm font-semibold shadow-inner">
            <Sparkles className="w-4 h-4" />
            <span>Next-Gen eFootball Tactical Intelligence & Squad Analyzer</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-[1.1]">
            Your AI Coach for <br />
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              eFootball
            </span>
          </h1>

          <p className="text-base sm:text-lg text-neutral-300 leading-relaxed font-normal max-w-2xl mx-auto">
            Enter your squad players and manager details, get personalized tactical advice, optimize your players, and learn exactly how to use your setup through interactive 2D simulation.
          </p>

          {/* Primary & Secondary CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <button
              id="hero-analyze-cta"
              onClick={onStartAnalysis}
              className="w-full sm:w-auto px-8 py-4 rounded-xl text-base font-black bg-emerald-500 hover:bg-emerald-400 text-neutral-950 shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              <Sparkles className="w-5 h-5" />
              Enter Your Squad & Analyze
            </button>
            <button
              id="hero-community-cta"
              onClick={onExploreCommunity}
              className="w-full sm:w-auto px-6 py-4 rounded-xl text-base font-semibold bg-neutral-900 hover:bg-neutral-800 text-white border border-neutral-700 flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Users className="w-5 h-5 text-emerald-400" />
              Explore Community
            </button>
          </div>

          <p className="text-xs text-neutral-400 font-medium pt-2">
            1 Free Comprehensive Analysis per week • No credit card required
          </p>
        </div>
      </section>

      {/* Private Admin / Mr. Who Exclusive Preview Area */}
      {isAuthorizedViewer && (
        <section className="relative overflow-hidden rounded-3xl bg-neutral-900 border-2 border-emerald-500/40 p-6 sm:p-8 shadow-2xl">
          <div className="absolute top-0 right-0 px-4 py-1.5 bg-amber-500/20 border-b border-l border-amber-500/30 text-amber-300 font-bold text-xs rounded-bl-2xl flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5" />
            <span>Private Preview Mode • Visible only to Mr. Who</span>
          </div>

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pt-2">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <Bot className="w-4 h-4" />
                <span>AI Character Guided Walkthrough Video</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white">
                Squad Analysis Interactive Demo Video
              </h3>
              <p className="text-sm text-neutral-300 leading-relaxed">
                Watch an AI-voiced coach character (Coach Marcus with an English accent) walk through each stage of the analysis workflow: selecting analysis modes, entering starting eleven and substitutes, setting up manager proficiencies, and reviewing the tactical report and 2D simulation pitch.
              </p>
              <div className="flex items-center gap-3 text-xs text-neutral-400 pt-1">
                <span className="flex items-center gap-1 text-emerald-400">
                  <Sparkles className="w-3.5 h-3.5" /> 5 Interactive Stages
                </span>
                <span>•</span>
                <span>AI Voiceover & Live Captions</span>
                <span>•</span>
                <span>Ready for your inspection</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0 w-full md:w-auto">
              <button
                id="btn-play-admin-demo-video"
                onClick={() => setShowDemoModal(true)}
                className="px-6 py-4 rounded-xl text-sm font-black bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-neutral-950 flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-500/20 transition-all transform hover:-translate-y-0.5 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                Play AI Coach Demo Video
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Feature Cards Grid */}
      <section className="space-y-6">
        <div className="text-center max-w-xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Engineered for Modern eFootball Competitors
          </h2>
          <p className="text-sm text-neutral-400 mt-2">
            Comprehensive tools to evaluate players, balance playstyles, and eliminate tactical blindspots.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          
          <div className="bg-neutral-900/90 border border-neutral-800 hover:border-emerald-500/40 rounded-2xl p-6 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">AI Squad Analysis</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Advanced AI evaluates ratings, positions, playstyles and skills from your structured Starting XI and bench players.
            </p>
          </div>

          <div className="bg-neutral-900/90 border border-neutral-800 hover:border-emerald-500/40 rounded-2xl p-6 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Award className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Best XI Selection</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Calculates your highest-performing starting eleven with in-depth reasoning for every single starter.
            </p>
          </div>

          <div className="bg-neutral-900/90 border border-neutral-800 hover:border-emerald-500/40 rounded-2xl p-6 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Target className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">AI Tactical Coach</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Provides concrete build-up, attacking cutback patterns, and defensive transition directives.
            </p>
          </div>

          <div className="bg-neutral-900/90 border border-neutral-800 hover:border-emerald-500/40 rounded-2xl p-6 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Player Development</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Action plans recommending Level training, Progression point re-allocations, and missing skill badges.
            </p>
          </div>

          <div className="bg-neutral-900/90 border border-neutral-800 hover:border-emerald-500/40 rounded-2xl p-6 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Coach Recommendation</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Evaluates your manager profile or suggests ideal managers like Guardiola or Klopp for maximum affinity.
            </p>
          </div>

          <div className="bg-neutral-900/90 border border-neutral-800 hover:border-emerald-500/40 rounded-2xl p-6 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Compass className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">2D Tactical Simulation</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Interactive 2D pitch with step-by-step animations showing how DMF deep-lines and winger cutbacks function.
            </p>
          </div>

          <div className="bg-neutral-900/90 border border-neutral-800 hover:border-emerald-500/40 rounded-2xl p-6 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Activity className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Player Comparison</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Head-to-head comparison tool evaluating which card provides superior tactical suitability for your XI.
            </p>
          </div>

          <div className="bg-neutral-900/90 border border-neutral-800 hover:border-emerald-500/40 rounded-2xl p-6 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Community Sharing</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Share squads, discover competitive setups from other players, like, and exchange tactical feedback.
            </p>
          </div>

        </div>
      </section>

      {/* How it Works Step-by-Step */}
      <section className="bg-neutral-950 border border-neutral-800 rounded-3xl p-8 sm:p-12">
        <div className="text-center max-w-xl mx-auto mb-10">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">Step-by-Step Workflow</span>
          <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
            How eFootball AI Hub Works
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { step: '1', title: 'Enter Squad Players', desc: 'Add Starting XI, substitutes, and manager details manually.' },
            { step: '2', title: 'AI Tactical Analysis', desc: 'Advanced AI processes ratings, positions & playstyles.' },
            { step: '3', title: 'Squad Evaluation', desc: 'Calculates overall balance, depth, and tactical strengths.' },
            { step: '4', title: 'Best XI & Tactics', desc: 'Receives custom individual instructions and formation advice.' },
            { step: '5', title: '2D Simulation', desc: 'Watch the tactics in motion and learn how to execute them.' },
            { step: '6', title: 'Save & Share', desc: 'Keep your report forever in Firestore or share with community.' }
          ].map((item, idx) => (
            <div key={idx} className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between">
              <div>
                <span className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 font-black text-sm flex items-center justify-center mb-3">
                  {item.step}
                </span>
                <h4 className="font-bold text-white text-sm mb-1">{item.title}</h4>
                <p className="text-xs text-neutral-400 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer with Legal Links & Copyright */}
      <footer className="pt-8 pb-4 border-t border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-400">
        <div className="flex flex-wrap items-center gap-4">
          <button 
            onClick={() => setActiveModal('privacy')}
            className="hover:text-emerald-400 transition-colors cursor-pointer"
          >
            Privacy Policy
          </button>
          <span>•</span>
          <button 
            onClick={() => setActiveModal('disclaimer')}
            className="hover:text-emerald-400 transition-colors cursor-pointer"
          >
            Disclaimer
          </button>
          <span>•</span>
          <button 
            onClick={() => setActiveModal('terms')}
            className="hover:text-emerald-400 transition-colors cursor-pointer"
          >
            Terms of Services
          </button>
        </div>

        <div className="text-neutral-500 font-medium">
          © 2026 eFootball AI Hub. All rights are reserved.
        </div>
      </footer>

      {/* Legal Modals */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                  {activeModal === 'privacy' && <Lock className="w-4 h-4" />}
                  {activeModal === 'disclaimer' && <AlertCircle className="w-4 h-4" />}
                  {activeModal === 'terms' && <FileText className="w-4 h-4" />}
                </span>
                <h3 className="text-base font-black text-white">
                  {activeModal === 'privacy' && 'Privacy Policy'}
                  {activeModal === 'disclaimer' && 'Disclaimer'}
                  {activeModal === 'terms' && 'Terms of Services'}
                </h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="text-neutral-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="text-xs sm:text-sm text-neutral-300 leading-relaxed max-h-80 overflow-y-auto space-y-3">
              {activeModal === 'privacy' && (
                <>
                  <p><strong>eFootball AI Hub</strong> respects your privacy. We store only your saved squad reports and user profile authentication details securely.</p>
                  <p>Your data is never sold, shared with third parties, or used for unsolicited marketing. You have full control to update or delete your saved squad reports at any time.</p>
                </>
              )}
              {activeModal === 'disclaimer' && (
                <>
                  <p><strong>eFootball AI Hub</strong> is an independent tactical analysis tool created by fans and competitors for the eFootball community.</p>
                  <p>Konami and eFootball are registered trademarks of Konami Digital Entertainment. This application is not officially endorsed by, affiliated with, or sponsored by Konami.</p>
                </>
              )}
              {activeModal === 'terms' && (
                <>
                  <p>By using <strong>eFootball AI Hub</strong>, you agree to use our tactical recommendation engine and community sharing features responsibly.</p>
                  <p>All analysis outputs and community tactics are provided as-is for educational and competitive enhancement purposes.</p>
                </>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setActiveModal(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-neutral-950"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Private AI Analysis Demo Modal (Visible exclusively to Mr. Who) */}
      {isAuthorizedViewer && (
        <AiAnalysisDemoModal
          isOpen={showDemoModal}
          onClose={() => setShowDemoModal(false)}
          onNavigateToAnalyzer={onStartAnalysis}
        />
      )}

    </div>
  );
};

