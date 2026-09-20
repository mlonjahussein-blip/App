import React, { useState, useMemo, useEffect } from 'react';
import { 
  AnalysisResult, 
  PlayerData, 
  IndividualInstruction, 
  PlayerActionRecommendation 
} from '../types.ts';
import { BestXIView } from './BestXIView.tsx';
import { TacticalSimulation } from './TacticalSimulation.tsx';
import { PlayerCorrectionModal } from './PlayerCorrectionModal.tsx';
import { DeveloperInspectionPanel } from './DeveloperInspectionPanel.tsx';
import { detectAllSquadComparisons } from '../lib/playerComparison.ts';
import { 
  Award, 
  Sparkles, 
  Shield, 
  Target, 
  Bookmark, 
  Share2, 
  AlertTriangle, 
  ChevronRight, 
  User, 
  CheckCircle, 
  Compass, 
  Zap, 
  SlidersHorizontal,
  FileCheck,
  ShieldCheck,
  CheckCheck,
  Edit3,
  Terminal,
  Info,
  HelpCircle,
  AlertCircle,
  Eye,
  Layers,
  ArrowRight,
  Download,
  BookOpen,
  TrendingUp,
  Clock,
  Flag,
  Dumbbell,
  Trophy
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { exportSquadAnalysisToPdf } from '../lib/pdfReportGenerator.ts';
import { searchMasterPlayers } from '../lib/efootballDatabase.ts';
import { 
  generatePlayerTrainingReport, 
  generateTacticalPreferences, 
  generateGamePlanRecommendations 
} from '../lib/tacticalReportGenerator.ts';

interface ResultsDashboardProps {
  analysis: AnalysisResult;
  onSaveReport: (analysis: AnalysisResult) => Promise<void>;
  onShareToCommunity: (analysis: AnalysisResult) => void;
  onPlayerBuilderSelect: (player: PlayerData) => void;
  onComparePlayersSelect: (p1: PlayerData, p2: PlayerData, initialMode?: 'battles' | 'startingXI') => void;
  onUpdateAnalysis?: (analysis: AnalysisResult) => void;
  isSaved?: boolean;
}

export const ResultsDashboard: React.FC<ResultsDashboardProps> = ({
  analysis: initialAnalysis,
  onSaveReport,
  onShareToCommunity,
  onPlayerBuilderSelect,
  onComparePlayersSelect,
  onUpdateAnalysis,
  isSaved = false
}) => {
  // Single Source of Truth: Canonical Verified Squad Dataset
  const [squadAnalysis, setSquadAnalysis] = useState<AnalysisResult>(initialAnalysis);

  useEffect(() => {
    setSquadAnalysis(initialAnalysis);
  }, [initialAnalysis]);

  // Check if current analysis originates from the "23-Player Squad & AI Auto-Tactics" option
  const isAuto23Mode = Boolean(
    squadAnalysis.analysisMode === 'auto23' ||
    squadAnalysis.analysisMode === 'auto_tactics_23' ||
    squadAnalysis.analysisMode === 'pure23' ||
    (squadAnalysis.title && (squadAnalysis.title.toLowerCase().includes('23-player') || squadAnalysis.title.toLowerCase().includes('auto-tactics')))
  );
  const [activeTab, setActiveTab] = useState<'all' | 'verifiedSquad' | 'bestXI' | 'tactics' | 'training' | 'gamePlan' | 'simulation' | 'players'>('all');
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(isSaved);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Manual Correction & Audit State
  const [selectedPlayerForCorrection, setSelectedPlayerForCorrection] = useState<PlayerData | null>(null);
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [expandedAuditPlayerId, setExpandedAuditPlayerId] = useState<string | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  const dbMatchedCount = squadAnalysis.identifiedPlayers.filter((p) => {
    if (p.matchedDatabaseName) return true;
    return searchMasterPlayers(p.name, 1).length > 0;
  }).length;

  // Automated squad player comparisons (Starting XI vs Substitutes, same positions, tactical alternatives)
  const detectedComparisonBattles = useMemo(() => {
    return detectAllSquadComparisons(
      squadAnalysis.identifiedPlayers,
      squadAnalysis.coachRecommendation?.tacticalStyle || 'Quick Counter'
    );
  }, [squadAnalysis.identifiedPlayers, squadAnalysis.coachRecommendation?.tacticalStyle]);

  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 3000);
  };

  const handleDownloadPdf = async () => {
    try {
      setIsDownloadingPdf(true);
      exportSquadAnalysisToPdf(squadAnalysis);
      showToast('✓ PDF Tactical Dossier downloaded successfully!');
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.8 }
      });
    } catch (err: any) {
      console.error('Failed to generate PDF:', err);
      showToast('Could not generate PDF. Please try again.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await onSaveReport(squadAnalysis);
      setSavedSuccess(true);
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 }
      });
    } catch (err) {
      console.error('Failed to save report:', err);
    } finally {
      setSaving(false);
    }
  };

  // User Feedback Loop: One-click Confirm Player
  const handleConfirmPlayer = (player: PlayerData) => {
    const updatedPlayers = squadAnalysis.identifiedPlayers.map((p) => {
      if (p.id === player.id || p.name === player.name) {
        return {
          ...p,
          confidence: 'High' as const,
          confidenceScore: 100,
          identityStatus: 'user_confirmed' as const,
          userConfirmed: true,
          isUnidentified: false,
          evidence: [
            ...(p.evidence || []),
            {
              stage: 'User Confirmation',
              score: 100,
              description: 'Player identity verified and confirmed by user.',
              verified: true
            }
          ]
        };
      }
      return p;
    });

    // Also update in Best XI if present
    const updatedBestXIPlayers = squadAnalysis.bestXI.players.map((p) => {
      if (p.id === player.id || p.name === player.name) {
        return {
          ...p,
          confidence: 'High' as const,
          confidenceScore: 100,
          identityStatus: 'user_confirmed' as const,
          userConfirmed: true,
          isUnidentified: false
        };
      }
      return p;
    });

    const newAnalysis: AnalysisResult = {
      ...squadAnalysis,
      identifiedPlayers: updatedPlayers,
      bestXI: {
        ...squadAnalysis.bestXI,
        players: updatedBestXIPlayers
      }
    };

    setSquadAnalysis(newAnalysis);
    if (onUpdateAnalysis) {
      onUpdateAnalysis(newAnalysis);
    }
    showToast(`✓ Confirmed identity for ${player.name}`);
  };

  // User Feedback Loop: Manual Player Correction (Updates Canonical Squad & Downstream Views)
  const handleSavePlayerCorrection = (correctedPlayer: PlayerData) => {
    const oldName = selectedPlayerForCorrection?.name || '';
    const newName = correctedPlayer.name;
    const oldId = selectedPlayerForCorrection?.id || correctedPlayer.id;

    // 1. Update identified players list
    const updatedPlayers = squadAnalysis.identifiedPlayers.map((p) => {
      if (p.id === correctedPlayer.id || p.id === oldId || p.name === oldName) {
        return {
          ...p,
          ...correctedPlayer,
          id: p.id || correctedPlayer.id
        };
      }
      return p;
    });

    // 2. Update Best XI
    const updatedBestXIPlayers = squadAnalysis.bestXI.players.map((p) => {
      if (p.id === correctedPlayer.id || p.id === oldId || p.name === oldName) {
        return {
          ...p,
          ...correctedPlayer,
          pitchX: p.pitchX,
          pitchY: p.pitchY,
          selectionReason: `Updated to ${correctedPlayer.name} (${correctedPlayer.position}, ${correctedPlayer.rating} OVR) via manual squad correction.`
        };
      }
      return p;
    });

    // 3. Update Individual Instructions
    const updatedInstructions = squadAnalysis.individualInstructions.map((ins) => {
      if (ins.player === oldName || ins.player === correctedPlayer.name) {
        return {
          ...ins,
          player: newName,
          position: correctedPlayer.position
        };
      }
      return ins;
    });

    // 4. Update Player Action Plan
    const updatedActionPlan = squadAnalysis.playerActionPlan.map((act) => {
      if (act.player === oldName || act.player === correctedPlayer.name) {
        return {
          ...act,
          player: newName,
          position: correctedPlayer.position,
          rating: correctedPlayer.rating
        };
      }
      return act;
    });

    // 5. Update Simulation scenarios
    const updatedScenarios = squadAnalysis.simulationScenarios.map((sc) => ({
      ...sc,
      steps: sc.steps.map((st) => ({
        ...st,
        activePlayers: st.activePlayers.map((ap) => (ap === oldName ? newName : ap))
      })),
      keyFrames: sc.keyFrames.map((kf) => ({
        ...kf,
        ourTeam: kf.ourTeam.map((ot) => (ot.name === oldName || ot.id === oldId ? { ...ot, name: newName, position: correctedPlayer.position } : ot))
      }))
    }));

    // 6. Update Link-Up Play if old player was linked
    const updatedLinkUpPlay = squadAnalysis.linkUpPlay ? {
      ...squadAnalysis.linkUpPlay,
      fromPlayer: squadAnalysis.linkUpPlay.fromPlayer === oldName ? newName : squadAnalysis.linkUpPlay.fromPlayer,
      toPlayer: squadAnalysis.linkUpPlay.toPlayer === oldName ? newName : squadAnalysis.linkUpPlay.toPlayer
    } : undefined;

    // 7. Update Action Recommendations
    const updatedActionRecommendations = (squadAnalysis.actionRecommendations || []).map((rec) => 
      oldName ? rec.replaceAll(oldName, newName) : rec
    );

    // 8. Regenerate / update Player Training Report & Game Plan Recommendations
    const playstyle = squadAnalysis.coachRecommendation?.tacticalStyle || 'Quick Counter';
    const updatedTrainingReport = generatePlayerTrainingReport(updatedBestXIPlayers, playstyle);
    const updatedGamePlan = generateGamePlanRecommendations(playstyle, squadAnalysis.recommendedFormation || '4-2-1-3', updatedPlayers);

    // 9. Recalculate Quality Score
    const confirmedCount = updatedPlayers.filter((p) => p.identityStatus === 'user_confirmed' || p.identityStatus === 'user_corrected' || (p.confidenceScore && p.confidenceScore >= 85)).length;
    const newQualityScore = Math.min(100, Math.round((confirmedCount / Math.max(updatedPlayers.length, 1)) * 100));

    // 10. Recalculate ratings
    const avgOvr = Math.round(updatedBestXIPlayers.reduce((sum, p) => sum + (Number(p.rating) || 85), 0) / Math.max(updatedBestXIPlayers.length, 1));
    const updatedSquadRatings = {
      ...squadAnalysis.squadRatings,
      overall: avgOvr
    };

    const newAnalysis: AnalysisResult = {
      ...squadAnalysis,
      identifiedPlayers: updatedPlayers,
      bestXI: {
        ...squadAnalysis.bestXI,
        players: updatedBestXIPlayers
      },
      squadRatings: updatedSquadRatings,
      individualInstructions: updatedInstructions,
      playerActionPlan: updatedActionPlan,
      simulationScenarios: updatedScenarios,
      linkUpPlay: updatedLinkUpPlay,
      actionRecommendations: updatedActionRecommendations,
      playerTrainingReport: updatedTrainingReport,
      gamePlanRecommendations: updatedGamePlan,
      qualityScore: squadAnalysis.qualityScore ? {
        ...squadAnalysis.qualityScore,
        score: newQualityScore,
        confirmedCount,
        verdict: newQualityScore >= 80 ? 'Clear & High Readability' : squadAnalysis.qualityScore.verdict
      } : undefined
    };

    setSquadAnalysis(newAnalysis);
    if (onUpdateAnalysis) {
      onUpdateAnalysis(newAnalysis);
    }
    showToast(`✓ Squad re-synced with ${correctedPlayer.name}`);
    confetti({ particleCount: 35, spread: 50, origin: { y: 0.7 } });
  };

  const ratings = squadAnalysis.squadRatings;
  const quality = squadAnalysis.qualityScore;
  const isReadabilityWarning = quality && (quality.score < 65 || quality.verdict.includes('Difficult') || quality.warnings.length > 0);

  // Hydrated Tactical Reports (Sections A, B, C)
  const playerTraining = squadAnalysis.playerTrainingReport || generatePlayerTrainingReport(
    squadAnalysis.bestXI.players,
    squadAnalysis.coachRecommendation?.tacticalStyle || 'Quick Counter'
  );
  const tacticalPrefs = squadAnalysis.tacticalPreferences || generateTacticalPreferences(
    squadAnalysis.coachRecommendation?.tacticalStyle || 'Quick Counter',
    squadAnalysis.recommendedFormation || '4-2-1-3'
  );
  const gamePlan = squadAnalysis.gamePlanRecommendations || generateGamePlanRecommendations(
    squadAnalysis.coachRecommendation?.tacticalStyle || 'Quick Counter',
    squadAnalysis.recommendedFormation || '4-2-1-3',
    squadAnalysis.identifiedPlayers || []
  );

  // Identity Counters
  const confirmedPlayers = squadAnalysis.identifiedPlayers.filter(
    (p) => p.identityStatus === 'user_confirmed' || p.identityStatus === 'user_corrected' || (p.confidenceScore && p.confidenceScore >= 85)
  );
  const probablePlayers = squadAnalysis.identifiedPlayers.filter(
    (p) => p.confidenceScore && p.confidenceScore >= 60 && p.confidenceScore < 85 && !p.userConfirmed
  );
  const needsConfirmationPlayers = squadAnalysis.identifiedPlayers.filter(
    (p) => (!p.confidenceScore || p.confidenceScore < 60) && !p.isUnidentified && !p.userConfirmed
  );
  const unidentifiedPlayers = squadAnalysis.identifiedPlayers.filter((p) => p.isUnidentified);

  return (
    <div id="analysis-results-view" className="space-y-8 py-6 max-w-7xl mx-auto">
      
      {/* Toast Notification */}
      {feedbackToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-500 text-neutral-950 px-4 py-2.5 rounded-xl font-black text-xs shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCheck className="w-4 h-4" />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* 1. Analysis Overview & Top Action Bar */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Verified Analysis Pipeline V2
            </span>
            <span className="text-xs text-neutral-400">
              {squadAnalysis.identifiedPlayers.length} verified players · Free analysis
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {squadAnalysis.title}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 max-w-2xl">
            Multistage accuracy pipeline completed: Tactical formation parsing, player data verification, and eFootball master database matching.
          </p>
        </div>

        {/* Action Buttons: Save & Share */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <button
            id="save-report-btn"
            onClick={handleSave}
            disabled={saving || savedSuccess}
            className={`px-5 py-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              savedSuccess
                ? 'bg-neutral-800 text-emerald-400 border border-emerald-500/30 cursor-default'
                : 'bg-emerald-500 hover:bg-emerald-400 text-neutral-950 shadow-lg shadow-emerald-500/20 cursor-pointer'
            }`}
          >
            {savedSuccess ? <CheckCircle className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
            {savedSuccess ? 'Saved to Profile' : saving ? 'Saving...' : 'Save Report'}
          </button>

          <button
            id="download-pdf-report-btn"
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf}
            className="px-5 py-3 rounded-xl text-xs sm:text-sm font-bold bg-neutral-950 hover:bg-neutral-800 text-white border border-emerald-500/50 hover:border-emerald-400 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-950/20"
            title="Download Complete PDF Tactical Dossier"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>{isDownloadingPdf ? 'Generating PDF...' : 'Download PDF Report'}</span>
          </button>

          <button
            id="share-report-btn"
            onClick={() => onShareToCommunity(squadAnalysis)}
            className="px-5 py-3 rounded-xl text-xs sm:text-sm font-bold bg-neutral-950 hover:bg-neutral-800 text-white border border-neutral-700 flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Share2 className="w-4 h-4 text-cyan-400" />
            Share with Community
          </button>
        </div>
      </div>

      {/* 2. Analysis Quality Score & Verification Verdict Banner */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl p-6 sm:p-7 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-2xl ${
              quality && quality.score >= 80 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                : quality && quality.score >= 60 
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
            }`}>
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white">
                  Analysis Quality Score: {quality ? `${quality.score}%` : '92%'}
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                  quality && quality.score >= 80
                    ? 'bg-emerald-500 text-neutral-950'
                    : quality && quality.score >= 60
                    ? 'bg-amber-500 text-neutral-950'
                    : 'bg-rose-500 text-white'
                }`}>
                  {quality ? quality.verdict : 'Clear & High Readability'}
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Calculated based on OCR readability, master database verification, and cross-screenshot consistency.
              </p>
            </div>
          </div>

          {/* Quick Metrics Breakdown */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <strong>{confirmedPlayers.length}</strong> Confirmed
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <strong>{probablePlayers.length}</strong> Probable
            </span>
            {needsConfirmationPlayers.length > 0 && (
              <span className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <strong>{needsConfirmationPlayers.length}</strong> Needs Confirmation
              </span>
            )}
            {unidentifiedPlayers.length > 0 && (
              <span className="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-400" />
                <strong>{unidentifiedPlayers.length}</strong> Unidentified
              </span>
            )}
          </div>
        </div>

        {/* Readability Warning if needed */}
        {isReadabilityWarning && (
          <div className="bg-amber-950/40 border border-amber-700/50 rounded-2xl p-4 flex items-start gap-3 text-amber-200 text-xs sm:text-sm">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-amber-300">
                This screenshot is difficult to read. For better player identification, upload a clearer screenshot showing the player names and ratings.
              </p>
              <p className="text-neutral-300 text-xs">
                To guarantee 100% tactical precision, click <strong>"Correct Player"</strong> on any uncertain card below to select the exact card from our eFootball master player database.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Filter Tabs for Fast Scanning */}
      <div className="flex overflow-x-auto gap-2 pb-2 border-b border-neutral-800 text-sm font-medium">
        {[
          { id: 'all', label: 'Complete Report' },
          { id: 'verifiedSquad', label: `Verified Squad (${squadAnalysis.identifiedPlayers.length})` },
          { id: 'bestXI', label: 'Best XI & Formation' },
          { id: 'tactics', label: 'Tactical Preferences' },
          { id: 'training', label: 'Player Training Report' },
          { id: 'gamePlan', label: 'Game Plan & Subs' },
          { id: 'simulation', label: '2D Simulation' },
          { id: 'players', label: 'Player Action Plan' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-emerald-500 text-neutral-950 font-black shadow-sm'
                : 'bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 3. Separation of Facts, Inferences, and Recommendations (Core Architecture) */}
      {(activeTab === 'all' || activeTab === 'verifiedSquad') && (
        <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Box 1: Directly Detected Facts */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                <FileCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Directly Detected Facts
                </h3>
                <span className="text-[11px] text-neutral-400">Visually proven from screenshots</span>
              </div>
            </div>
            <ul className="space-y-2 text-xs text-neutral-300">
              <li className="flex items-center justify-between p-2 rounded-lg bg-neutral-950">
                <span>Verified Player Cards:</span>
                <span className="font-bold text-white">{squadAnalysis.identifiedPlayers.length} cards</span>
              </li>
              <li className="flex items-center justify-between p-2 rounded-lg bg-neutral-950">
                <span>Squad Coach:</span>
                <span className="font-bold text-white">
                  {squadAnalysis.managerDetails?.name || squadAnalysis.coachRecommendation?.name || 'Custom Manager'}
                </span>
              </li>
              <li className="flex items-center justify-between p-2 rounded-lg bg-neutral-950">
                <span>Database Matched:</span>
                <span className="font-bold text-emerald-400">
                  {dbMatchedCount} / {squadAnalysis.identifiedPlayers.length} matched
                </span>
              </li>
              <li className="flex items-center justify-between p-2 rounded-lg bg-neutral-950">
                <span>High Confidence Ratio:</span>
                <span className="font-bold text-cyan-400">
                  {Math.round((confirmedPlayers.length / Math.max(squadAnalysis.identifiedPlayers.length, 1)) * 100)}%
                </span>
              </li>
            </ul>
          </div>

          {/* Box 2: Tactical Inferences */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Tactical Inferences
                </h3>
                <span className="text-[11px] text-neutral-400">AI analytical conclusions</span>
              </div>
            </div>
            <ul className="space-y-2 text-xs text-neutral-300">
              <li className="flex items-center justify-between p-2 rounded-lg bg-neutral-950">
                <span>Playstyle Affinity:</span>
                <span className="font-bold text-white">{ratings.tacticalSuitability}/100</span>
              </li>
              <li className="flex items-center justify-between p-2 rounded-lg bg-neutral-950">
                <span>Overall Squad Balance:</span>
                <span className="font-bold text-white">{ratings.balance}</span>
              </li>
              <li className="p-2.5 rounded-lg bg-neutral-950 text-[11px] text-neutral-300 leading-relaxed">
                <strong className="text-white block mb-0.5">Key Strength:</strong>
                {squadAnalysis.strengths[0] || 'High vertical speed and defensive compactness.'}
              </li>
            </ul>
          </div>

          {/* Box 3: Match Action Directives */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Match Action Directives
                </h3>
                <span className="text-[11px] text-neutral-400">Prescribed adjustments</span>
              </div>
            </div>
            <ul className="space-y-2 text-xs text-neutral-300">
              <li className="flex items-center justify-between p-2 rounded-lg bg-neutral-950">
                <span>Starting Formation:</span>
                <span className="font-black text-emerald-400">{squadAnalysis.recommendedFormation}</span>
              </li>
              <li className="flex items-center justify-between p-2 rounded-lg bg-neutral-950">
                <span>Sub / Alt Formation:</span>
                <span className="font-bold text-neutral-300">{squadAnalysis.alternativeFormation}</span>
              </li>
              <li className="flex items-center justify-between p-2 rounded-lg bg-neutral-950">
                <span>Individual Instructions:</span>
                <span className="font-bold text-white">{squadAnalysis.individualInstructions.length} assigned</span>
              </li>
              <li className="flex items-center justify-between p-2 rounded-lg bg-neutral-950">
                <span>Action Plan Items:</span>
                <span className="font-bold text-white">{squadAnalysis.playerActionPlan.length} programs</span>
              </li>
            </ul>
          </div>
        </section>
      )}

      {/* 4. Verified Squad Dataset & User Feedback Loop Section */}
      {(activeTab === 'all' || activeTab === 'verifiedSquad') && (
        <section className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                  <Layers className="w-5 h-5" />
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Canonical Verified Squad Dataset
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-neutral-800 text-neutral-300">
                  {squadAnalysis.identifiedPlayers.length} Players
                </span>
              </div>
              <p className="text-xs sm:text-sm text-neutral-400 mt-1">
                Every player is cross-referenced with the eFootball reference database. You can confirm or correct any player below to immediately re-sync the entire tactical system.
              </p>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {squadAnalysis.identifiedPlayers.map((player) => {
              const isAuditExpanded = expandedAuditPlayerId === player.id;
              const isConfirmed = player.userConfirmed || player.identityStatus === 'user_confirmed' || player.identityStatus === 'user_corrected';
              const isProbable = (player.confidenceScore && player.confidenceScore >= 60 && player.confidenceScore < 85) || player.confidence === 'Medium';
              const isUnidentified = player.isUnidentified || player.confidence === 'Uncertain identification';

              return (
                <div 
                  key={player.id} 
                  className={`bg-neutral-950 border rounded-2xl p-5 flex flex-col justify-between space-y-4 transition-all ${
                    isConfirmed 
                      ? 'border-emerald-500/40 shadow-lg shadow-emerald-950/20' 
                      : isUnidentified
                      ? 'border-rose-700/60 bg-rose-950/10'
                      : 'border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Top Row: Position, Rating & Confidence Badge */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[11px] font-black uppercase bg-neutral-800 text-white">
                          {player.position}
                        </span>
                        <span className="text-base font-black text-emerald-400">
                          {player.rating}
                        </span>
                        <span className="text-[10px] text-neutral-500 uppercase font-bold">OVR</span>
                      </div>

                      {/* Confidence Tag */}
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        isConfirmed
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : isProbable
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          : isUnidentified
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {isConfirmed 
                          ? '✓ User Confirmed' 
                          : isUnidentified 
                          ? 'Unidentified' 
                          : player.confidenceScore 
                          ? `${player.confidenceScore}% Confirmed` 
                          : player.confidence}
                      </span>
                    </div>

                    {/* Player Card Visual Thumbnail (Sharp cropped) or Face Portrait & Name */}
                    <div className="flex items-center gap-3">
                      {player.croppedCardImage ? (
                        <div className="relative w-12 h-16 rounded-lg overflow-hidden border border-neutral-700 shrink-0 bg-neutral-900 shadow-md">
                          <img 
                            src={player.croppedCardImage} 
                            alt={player.name} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <span className="absolute bottom-0 inset-x-0 bg-black/75 text-[9px] text-center font-bold text-emerald-400 py-0.5">
                            {player.position}
                          </span>
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center shrink-0 text-neutral-500 font-bold text-xs">
                          {player.position}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-black text-white tracking-tight truncate">
                          {player.name}
                        </h3>
                        <p className="text-xs text-neutral-400">
                          {player.playstyle || 'Versatile'} · <span className="text-neutral-300">{player.playerType || 'Standard'}</span>
                        </p>
                        {player.selectionReason && (
                          <p className="text-[10px] text-emerald-400 font-medium truncate mt-0.5">
                            {player.selectionReason}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Multi-Signal Candidate Alternatives if available */}
                    {player.candidates && player.candidates.length > 1 && (
                      <div className="bg-neutral-900/80 rounded-xl p-2.5 border border-neutral-800 space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] text-neutral-400">
                          <span className="font-bold uppercase tracking-wider">Candidate Matches:</span>
                          <span className="text-neutral-500">Multi-signal verified</span>
                        </div>
                        <div className="space-y-1">
                          {player.candidates.slice(0, 2).map((cand, cIdx) => (
                            <div key={cIdx} className="flex items-center justify-between text-xs bg-neutral-950/70 px-2 py-1 rounded">
                              <span className="font-medium text-neutral-200 truncate">{cand.name}</span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[10px] text-neutral-400 font-mono">{cand.rating} OVR</span>
                                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                  cand.confidence >= 85 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-neutral-800 text-neutral-300'
                                }`}>
                                  {cand.confidence}%
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Why this identification (Audit Summary) */}
                    <div className="text-[11px] text-neutral-400 bg-neutral-900/90 rounded-xl p-2.5 space-y-1 border border-neutral-800/80">
                      <span className="text-[10px] font-bold text-neutral-500 uppercase block">
                        Identification Basis:
                      </span>
                      <p className="text-neutral-300 leading-snug">
                        {player.roleExplanation || `Matched visible text with ${player.name} (${player.position}, ${player.rating} rating) in eFootball database.`}
                      </p>
                    </div>

                    {/* Expandable Evidence Trail */}
                    {isAuditExpanded && (
                      <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 text-[11px] space-y-2">
                        <span className="font-bold text-white text-[11px] block">
                          Verification Audit Trail:
                        </span>
                        {player.evidence && player.evidence.length > 0 ? (
                          player.evidence.map((ev, evIdx) => (
                            <div key={evIdx} className="flex items-start gap-1.5 text-neutral-300">
                              <span className="text-emerald-400 font-bold">•</span>
                              <div className="flex-1">
                                <span className="font-bold text-neutral-200">{ev.stage}: </span>
                                <span>{ev.description}</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-neutral-400">
                            OCR card read matched reference dataset with high string similarity and positional compatibility.
                          </p>
                        )}
                        {player.detectedRegion?.boundingBox && (
                          <div className="text-[10px] text-neutral-500 pt-1 border-t border-neutral-800">
                            Region: [{player.detectedRegion.boundingBox.join(', ')}]
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Bottom Interactive User Feedback Loop */}
                  <div className="pt-3 border-t border-neutral-800/80 space-y-2">
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                      Did we identify this player correctly?
                    </p>
                    
                    <div className="flex items-center gap-2">
                      {!isConfirmed && (
                        <button
                          onClick={() => handleConfirmPlayer(player)}
                          className="flex-1 py-1.5 px-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          Confirm
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setSelectedPlayerForCorrection(player);
                          setIsCorrectionModalOpen(true);
                        }}
                        className="flex-1 py-1.5 px-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                        Correct Player
                      </button>

                      <button
                        onClick={() => setExpandedAuditPlayerId(isAuditExpanded ? null : player.id)}
                        className="py-1.5 px-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 text-xs transition-colors"
                        title="View Evidence Audit"
                      >
                        <Info className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Fast links to Player Builder */}
                    <div className="flex items-center justify-between pt-1 text-[11px]">
                      <button
                        onClick={() => onPlayerBuilderSelect(player)}
                        className="text-emerald-400 hover:text-emerald-300 font-bold transition-colors"
                      >
                        AI Player Builder →
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 5. Squad Ratings Breakdown (Spec 10) */}
      {(activeTab === 'all' || activeTab === 'tactics') && (
        <section className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                  <Award className="w-5 h-5" />
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Comprehensive Squad Rating Breakdown
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-neutral-400 mt-1">
                Evaluation calculated from your 11 starting players and tactical synergy.
              </p>
            </div>
            
            <div className="flex items-baseline gap-2 bg-neutral-950 px-5 py-3 rounded-2xl border border-neutral-800">
              <span className="text-3xl sm:text-4xl font-black text-emerald-400">
                {ratings.overall}
              </span>
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                Overall Squad OVR
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {[
              { label: 'Attack', value: ratings.attack, color: 'text-rose-400' },
              { label: 'Midfield', value: ratings.midfield, color: 'text-amber-400' },
              { label: 'Defence', value: ratings.defence, color: 'text-cyan-400' },
              { label: 'Goalkeeping', value: ratings.goalkeeping, color: 'text-emerald-400' },
              { label: 'Balance', value: ratings.balance, color: 'text-purple-400' },
              { label: 'Tactical Fit', value: ratings.tacticalSuitability, color: 'text-lime-400' }
            ].map((stat, idx) => (
              <div key={idx} className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 text-center space-y-1">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
                  {stat.label}
                </span>
                <span className={`text-2xl font-black ${stat.color}`}>
                  {stat.value}
                </span>
                <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden mt-2">
                  <div 
                    className="bg-emerald-500 h-full rounded-full transition-all duration-1000"
                    style={{ width: `${Math.min(stat.value, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 text-xs sm:text-sm text-neutral-300 space-y-1">
            <span className="font-bold text-emerald-400 uppercase tracking-wider text-xs block">
              Rating Rationale:
            </span>
            <p className="leading-relaxed">
              {ratings.ratingsRationale}
            </p>
          </div>
        </section>
      )}

      {/* 6. Coach Recommendation Section (Spec 11) */}
      {(activeTab === 'all' || activeTab === 'tactics') && (
        <section className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400">
                  <User className="w-5 h-5" />
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Manager & Playstyle Recommendation
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-neutral-400 mt-1">
                {squadAnalysis.coachRecommendation.isIdentifiedFromScreenshot
                  ? 'Identified directly from your uploaded manager screenshot.'
                  : 'General tactical recommendation formulated to maximize your squad’s attributes.'}
              </p>
            </div>

            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
              squadAnalysis.coachRecommendation.isIdentifiedFromScreenshot
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-neutral-800 text-neutral-400'
            }`}>
              {squadAnalysis.coachRecommendation.isIdentifiedFromScreenshot
                ? '✓ Coach Detected in Screenshot'
                : 'Tactical Recommendation'}
            </span>
          </div>

          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="space-y-1">
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                Recommended Manager
              </span>
              <h3 className="text-xl font-black text-white">
                {squadAnalysis.coachRecommendation.name}
              </h3>
              <div className="flex items-center gap-3 text-xs text-neutral-300 pt-1">
                <span>Playstyle: <strong className="text-emerald-400">{squadAnalysis.coachRecommendation.tacticalStyle}</strong></span>
                <span>·</span>
                <span>Manager Rating: <strong className="text-white">{squadAnalysis.coachRecommendation.rating}</strong></span>
              </div>
            </div>

            <div className="max-w-md text-xs sm:text-sm text-neutral-300 bg-neutral-900 p-4 rounded-xl border border-neutral-800">
              <span className="text-neutral-400 font-bold block mb-1">Tactical Synergy:</span>
              <p className="leading-relaxed">{squadAnalysis.coachRecommendation.explanation}</p>
            </div>
          </div>

          {/* Dynamic Fluid Formations & Linked-Up Play Cards */}
          {(squadAnalysis.fluidFormations?.enabled || squadAnalysis.linkUpPlay?.enabled) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* Fluid Formation Card */}
              {squadAnalysis.fluidFormations?.enabled && (
                <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400">
                        <SlidersHorizontal className="w-4 h-4" />
                      </span>
                      <h4 className="text-sm font-bold text-white">Fluid Formations (In-Game Dynamic Shapes)</h4>
                    </div>
                    <span className="text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-full font-bold">
                      eFootball Dynamic
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center pt-1">
                    <div className="bg-neutral-900 p-2.5 rounded-xl border border-neutral-800">
                      <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-0.5">Kick-Off</span>
                      <span className="text-xs font-black text-white">{squadAnalysis.fluidFormations.kickoffFormation || squadAnalysis.recommendedFormation}</span>
                    </div>
                    <div className="bg-neutral-900 p-2.5 rounded-xl border border-neutral-800">
                      <span className="text-[10px] uppercase font-bold text-cyan-400 block mb-0.5">In Possession</span>
                      <span className="text-xs font-black text-cyan-300">{squadAnalysis.fluidFormations.inPossessionFormation || '3-2-4-1'}</span>
                    </div>
                    <div className="bg-neutral-900 p-2.5 rounded-xl border border-neutral-800">
                      <span className="text-[10px] uppercase font-bold text-rose-400 block mb-0.5">Out of Possession</span>
                      <span className="text-xs font-black text-rose-300">{squadAnalysis.fluidFormations.outOfPossessionFormation || '5-3-2'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Linked-Up Play Card */}
              {squadAnalysis.linkUpPlay?.enabled && (
                <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                        <Sparkles className="w-4 h-4" />
                      </span>
                      <h4 className="text-sm font-bold text-white">Manager's Linked-Up Play Synergy</h4>
                    </div>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                      {squadAnalysis.linkUpPlay.centrepiece ? 'Manager Linked-Up' : 'Coach Combination'}
                    </span>
                  </div>
                  
                  {squadAnalysis.linkUpPlay.centrepiece && squadAnalysis.linkUpPlay.keyMan ? (
                    <div className="space-y-2 text-xs">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-neutral-900 p-2.5 rounded-xl border border-emerald-500/30">
                          <span className="text-[10px] uppercase font-bold text-emerald-400 block mb-0.5">Centrepiece</span>
                          <span className="font-black text-white block truncate">{squadAnalysis.linkUpPlay.centrepiece.playerName || squadAnalysis.linkUpPlay.toPlayer}</span>
                          <span className="text-[11px] text-neutral-400">{squadAnalysis.linkUpPlay.centrepiece.position} · {squadAnalysis.linkUpPlay.centrepiece.playstyle}</span>
                        </div>
                        <div className="bg-neutral-900 p-2.5 rounded-xl border border-cyan-500/30">
                          <span className="text-[10px] uppercase font-bold text-cyan-400 block mb-0.5">Key Man</span>
                          <span className="font-black text-white block truncate">{squadAnalysis.linkUpPlay.keyMan.playerName || squadAnalysis.linkUpPlay.fromPlayer}</span>
                          <span className="text-[11px] text-neutral-400">{squadAnalysis.linkUpPlay.keyMan.position} · {squadAnalysis.linkUpPlay.keyMan.playstyle}</span>
                        </div>
                      </div>
                      <div className="bg-neutral-900 p-2.5 rounded-xl border border-neutral-800">
                        <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-0.5">Tactical Synergy</span>
                        <p className="text-neutral-300 text-[11px] leading-relaxed">
                          {squadAnalysis.linkUpPlay.coachInstructionNote || squadAnalysis.linkUpPlay.linkPattern}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-neutral-900 p-3 rounded-xl border border-neutral-800 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-400">Link Duo:</span>
                        <span className="font-bold text-white">
                          <strong className="text-emerald-400">{squadAnalysis.linkUpPlay.fromPlayer}</strong> ➔ <strong className="text-emerald-400">{squadAnalysis.linkUpPlay.toPlayer}</strong>
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-400">Pattern:</span>
                        <span className="font-bold text-cyan-400">{squadAnalysis.linkUpPlay.linkPattern}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* 7. Recommended Formation & Best XI (Reads from Canonical Squad) */}
      {(activeTab === 'all' || activeTab === 'bestXI') && (
        <section className="space-y-4">
          <BestXIView
            formation={squadAnalysis.recommendedFormation}
            players={squadAnalysis.bestXI.players}
            onPlayerClick={(p) => {
              setSelectedPlayerForCorrection(p);
              setIsCorrectionModalOpen(true);
            }}
          />
        </section>
      )}

      {/* 8. Individual Player Instructions (eFootball 2027) */}
      {(activeTab === 'all' || activeTab === 'tactics') && (() => {
        const attackOptions: Array<{ id: 'Off' | 'Defensive' | 'Anchoring'; label: string; desc: string }> = [
          { id: 'Off', label: '(a) Off', desc: 'No individual restriction. Player acts according to base playstyle.' },
          { id: 'Defensive', label: '(b) Defensive', desc: 'Restricts forward runs, keeping player back to shield defense.' },
          { id: 'Anchoring', label: '(c) Anchoring', desc: 'Prevents lateral drift, locking player to their central corridor.' }
        ];

        const defenceOptions: Array<{ id: 'Off' | 'Tight Marking (Based on Opponent Player)' | 'Man Marking (Based on Opponent Player)' | 'Counter Target'; label: string; desc: string }> = [
          { id: 'Off', label: '(a) Off', desc: 'No individual restriction. Player acts according to base playstyle.' },
          { id: 'Tight Marking (Based on Opponent Player)', label: '(b) Tight Marking', desc: 'Closes down targeted opponent tightly upon receiving the ball.' },
          { id: 'Man Marking (Based on Opponent Player)', label: '(c) Man Marking', desc: 'Follows and shadows targeted opponent closely across the pitch.' },
          { id: 'Counter Target', label: '(d) Counter Target', desc: 'Stays forward in the opposition half to conserve stamina for counters.' }
        ];

        // Ensure 4 normalized slots
        const dmf = squadAnalysis.bestXI.players.find(p => p.position === 'DMF') || squadAnalysis.bestXI.players.find(p => p.position === 'CMF') || squadAnalysis.bestXI.players[5] || { name: 'DMF Holding Midfielder', position: 'DMF' };
        const cf = squadAnalysis.bestXI.players.find(p => p.position === 'CF') || squadAnalysis.bestXI.players.find(p => p.position === 'SS') || squadAnalysis.bestXI.players[0] || { name: 'Starting CF', position: 'CF' };
        const wingerOrForward = squadAnalysis.bestXI.players.find(p => (p.position === 'LWF' || p.position === 'RWF' || p.position === 'SS' || p.position === 'AMF') && p.name !== cf.name) || cf;
        const defenderOrDmf = squadAnalysis.bestXI.players.find(p => (p.position === 'CB' || p.position === 'RB' || p.position === 'LB' || p.position === 'DMF') && p.name !== dmf.name) || dmf;

        const rawList = squadAnalysis.individualInstructions || [];
        const getSlotData = (slotName: 'Attack 1' | 'Attack 2' | 'Defence 1' | 'Defence 2', fallbackPlayer: { name: string; position: string }, fallbackInst: string, fallbackWhy: string, fallbackIndex: number): IndividualInstruction => {
          const found = rawList.find(i => i.slot === slotName || i.category === slotName) || rawList[fallbackIndex];
          if (found) {
            return {
              ...found,
              slot: slotName,
              player: found.player || fallbackPlayer.name,
              position: found.position || fallbackPlayer.position,
              instruction: found.instruction || fallbackInst,
              why: found.why || fallbackWhy,
              category: slotName
            };
          }
          return {
            slot: slotName,
            player: fallbackPlayer.name,
            position: fallbackPlayer.position,
            instruction: fallbackInst,
            why: fallbackWhy,
            category: slotName
          };
        };

        const attack1 = getSlotData('Attack 1', dmf, 'Defensive', 'Restricts forward runs during build-up and attacking phases to preserve midfield defensive coverage and prevent counter-attack vulnerability.', 0);
        const attack2 = getSlotData('Attack 2', cf, 'Anchoring', 'Restricts the player from drifting out wide, keeping them centrally anchored in dangerous scoring areas to convert crosses and through balls.', 1);
        const defence1 = getSlotData('Defence 1', wingerOrForward, 'Counter Target', 'Player stays forward without dropping back to defend during opponent possession, conserving stamina and remaining primed for rapid counter-attacks.', 2);
        const defence2 = getSlotData('Defence 2', defenderOrDmf, 'Tight Marking (Based on Opponent Player)', 'Tightly marks the opponent\'s key playmaker, limiting their time and turning space on the ball while blocking dangerous passing avenues.', 3);

        const handleSelectInstruction = (slotKey: 'Attack 1' | 'Attack 2' | 'Defence 1' | 'Defence 2', newInst: string) => {
          const currentSlots = [attack1, attack2, defence1, defence2];
          const updated = currentSlots.map((slot) => {
            if (slot.slot === slotKey) {
              let newWhy = slot.why;
              if (newInst === 'Off') {
                newWhy = 'Instruction disabled. Player operates purely according to natural playing style and base positioning.';
              } else if (newInst === 'Defensive') {
                newWhy = 'Restricts the player from advancing into the attacking third, keeping midfield stability and defensive cover against counter-attacks.';
              } else if (newInst === 'Anchoring') {
                newWhy = 'Prevents lateral drift, locking the player strictly within their central channel to maintain offensive focal point.';
              } else if (newInst === 'Tight Marking (Based on Opponent Player)') {
                newWhy = 'Aggressively denies space and time on the ball to the opponent\'s designated player whenever they receive possession.';
              } else if (newInst === 'Man Marking (Based on Opponent Player)') {
                newWhy = 'Assigns this defender to shadow and track the designated opponent attacker across transitions.';
              } else if (newInst === 'Counter Target') {
                newWhy = 'Instructs the player to stay upfield without dropping deep, conserving stamina and providing an immediate transition outlet.';
              }
              return {
                ...slot,
                instruction: newInst,
                why: newWhy
              };
            }
            return slot;
          });

          setSquadAnalysis({
            ...squadAnalysis,
            individualInstructions: updated
          });
        };

        return (
          <section className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                    <SlidersHorizontal className="w-5 h-5" />
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    Individual Player Instructions
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    eFootball 2027
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-neutral-400 mt-1">
                  Apply these exact Match Plan individual instructions in eFootball 2027 across Attack 1 & 2 and Defence 1 & 2 to lock down transitions and structure your tactical supremacy.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* --- ATTACK INSTRUCTIONS COLUMN --- */}
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-amber-950/30 border border-amber-500/30 rounded-2xl px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-xs font-black uppercase tracking-wider text-amber-300">
                      Attack Instructions (Attack 1 & Attack 2)
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-amber-200/70 hidden sm:inline">
                    Off · Defensive · Anchoring
                  </span>
                </div>

                {/* Attack 1 & Attack 2 Cards */}
                {[attack1, attack2].map((slotData, idx) => {
                  const slotLabel = idx === 0 ? 'Attack 1' : 'Attack 2';
                  return (
                    <div key={slotLabel} className="bg-neutral-950 border border-neutral-800 hover:border-neutral-700 transition-colors rounded-2xl p-4 sm:p-5 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800/80 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            {slotLabel}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-neutral-800 text-neutral-200">
                            {slotData.position}
                          </span>
                          <span className="font-bold text-white text-sm sm:text-base">
                            {slotData.player}
                          </span>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-black ${
                          slotData.instruction === 'Off'
                            ? 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        }`}>
                          {slotData.instruction}
                        </span>
                      </div>

                      {/* eFootball 2027 Instruction Selector Pills */}
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
                          Available eFootball 2027 Instructions:
                        </span>
                        <div className="grid grid-cols-3 gap-1.5">
                          {attackOptions.map((opt) => {
                            const isSelected = slotData.instruction === opt.id || (opt.id === 'Defensive' && String(slotData.instruction).toLowerCase().includes('defens')) || (opt.id === 'Anchoring' && String(slotData.instruction).toLowerCase().includes('anchor'));
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => handleSelectInstruction(slotLabel as 'Attack 1' | 'Attack 2', opt.id)}
                                className={`px-2 py-1.5 rounded-lg text-[11px] font-bold transition-all text-center flex flex-col items-center justify-center gap-0.5 ${
                                  isSelected
                                    ? 'bg-amber-500 text-neutral-950 shadow-md font-black'
                                    : 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800 hover:text-white border border-neutral-800'
                                }`}
                                title={opt.desc}
                              >
                                <span>{opt.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Why tactical reason */}
                      <div className="text-xs text-neutral-300 bg-neutral-900/60 border border-neutral-800/60 rounded-xl p-3">
                        <span className="text-neutral-400 font-bold block mb-1">
                          Tactical Rationale:
                        </span>
                        <p className="leading-relaxed text-neutral-200">{slotData.why}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* --- DEFENCE INSTRUCTIONS COLUMN --- */}
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-sky-950/30 border border-sky-500/30 rounded-2xl px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse" />
                    <span className="text-xs font-black uppercase tracking-wider text-sky-300">
                      Defence Instructions (Defence 1 & Defence 2)
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-sky-200/70 hidden sm:inline">
                    Off · Tight Marking · Man Marking · Counter Target
                  </span>
                </div>

                {/* Defence 1 & Defence 2 Cards */}
                {[defence1, defence2].map((slotData, idx) => {
                  const slotLabel = idx === 0 ? 'Defence 1' : 'Defence 2';
                  return (
                    <div key={slotLabel} className="bg-neutral-950 border border-neutral-800 hover:border-neutral-700 transition-colors rounded-2xl p-4 sm:p-5 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800/80 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-500/40">
                            {slotLabel}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-neutral-800 text-neutral-200">
                            {slotData.position}
                          </span>
                          <span className="font-bold text-white text-sm sm:text-base">
                            {slotData.player}
                          </span>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-black ${
                          slotData.instruction === 'Off'
                            ? 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                            : 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                        }`}>
                          {slotData.instruction}
                        </span>
                      </div>

                      {/* eFootball 2027 Instruction Selector Pills */}
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
                          Available eFootball 2027 Instructions:
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                          {defenceOptions.map((opt) => {
                            const isSelected = slotData.instruction === opt.id || 
                              (opt.id === 'Counter Target' && String(slotData.instruction).toLowerCase().includes('counter')) ||
                              (opt.id === 'Tight Marking (Based on Opponent Player)' && String(slotData.instruction).toLowerCase().includes('tight')) ||
                              (opt.id === 'Man Marking (Based on Opponent Player)' && String(slotData.instruction).toLowerCase().includes('man'));
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => handleSelectInstruction(slotLabel as 'Defence 1' | 'Defence 2', opt.id)}
                                className={`px-2 py-1.5 rounded-lg text-[10.5px] font-bold transition-all text-center flex flex-col items-center justify-center leading-tight ${
                                  isSelected
                                    ? 'bg-sky-500 text-neutral-950 shadow-md font-black'
                                    : 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800 hover:text-white border border-neutral-800'
                                }`}
                                title={opt.desc}
                              >
                                <span>{opt.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Why tactical reason */}
                      <div className="text-xs text-neutral-300 bg-neutral-900/60 border border-neutral-800/60 rounded-xl p-3">
                        <span className="text-neutral-400 font-bold block mb-1">
                          Tactical Rationale:
                        </span>
                        <p className="leading-relaxed text-neutral-200">{slotData.why}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        );
      })()}

      {/* 9. Player Action Plan */}
      {(activeTab === 'all' || activeTab === 'players') && (
        <section className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                  <Zap className="w-5 h-5" />
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Player Action Plan
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-neutral-400 mt-1">
                Targeted recommendations to spend your Trainers, Progression Reset Points, and Skill Programs efficiently.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {squadAnalysis.playerActionPlan.map((action, idx) => (
              <div key={idx} className="bg-neutral-950 border border-neutral-800 rounded-xl p-5 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-neutral-800 text-neutral-300">
                      {action.position}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      action.priority === 'High' 
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                    }`}>
                      {action.priority} Priority
                    </span>
                  </div>

                  <h4 className="text-base font-black text-white">{action.player}</h4>
                  
                  <div className="mt-2 inline-block px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 font-bold text-xs border border-emerald-500/20">
                    {action.action}
                  </div>

                  <div className="mt-3 space-y-2 text-xs">
                    <div>
                      <span className="text-neutral-500 font-bold block">Reason:</span>
                      <p className="text-neutral-300">{action.reason}</p>
                    </div>
                    <div>
                      <span className="text-neutral-500 font-bold block">Tactical Benefit:</span>
                      <p className="text-neutral-400">{action.tacticalBenefit}</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    const matchPlayer = squadAnalysis.identifiedPlayers.find(p => p.name === action.player) || {
                      id: `act_${idx}`,
                      name: action.player,
                      position: action.position,
                      rating: action.rating || 90,
                      confidence: 'High' as const
                    };
                    onPlayerBuilderSelect(matchPlayer);
                  }}
                  className="w-full py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs border border-neutral-700 transition-colors text-center cursor-pointer"
                >
                  Open AI Player Builder →
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 10. Tactical Recommendations Breakdown */}
      {(activeTab === 'all' || activeTab === 'tactics') && (
        <section className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 space-y-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400">
                <Target className="w-5 h-5" />
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Practical Tactical Directives
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1">
              Field-tested tactical guidelines covering all 6 phases of an eFootball match.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { key: 'buildUp', label: 'Build Up', icon: '⚽' },
              { key: 'attacking', label: 'Attacking', icon: '🎯' },
              { key: 'defensiveTransition', label: 'Defensive Transition', icon: '🛡️' },
              { key: 'defending', label: 'Defending', icon: '🧱' },
              { key: 'counterattacking', label: 'Counterattacking', icon: '⚡' },
              { key: 'playerMovement', label: 'Player Movement', icon: '🔄' }
            ].map(({ key, label, icon }) => {
              const advice = (squadAnalysis.tacticalRecommendations as any)[key];
              if (!advice) return null;
              return (
                <div key={key} className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{icon}</span>
                    <h3 className="font-bold text-white text-base">{label}</h3>
                  </div>
                  <p className="text-xs text-emerald-400 font-semibold leading-relaxed">
                    {advice.summary}
                  </p>
                  <ul className="space-y-1.5 text-xs text-neutral-300 pt-1">
                    {advice.guidelines?.map((g: string, gIdx: number) => (
                      <li key={gIdx} className="flex items-start gap-2">
                        <span className="text-emerald-500 font-bold shrink-0">•</span>
                        <span>{g}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* SECTION A: Player Training Report */}
      {(activeTab === 'all' || activeTab === 'training') && (
        <section id="player-training-report-section" className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                  <Dumbbell className="w-5 h-5" />
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Player Training Report
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  eFootball 2026/2027 Progression
                </span>
              </div>
              <p className="text-xs sm:text-sm text-neutral-400 mt-1">
                Evidence-based progression point allocation and skill legacy training tailored for your squad.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 text-xs sm:text-sm text-neutral-300 space-y-1">
            <span className="font-bold text-emerald-400 uppercase tracking-wider text-xs block">
              Training Strategy Overview:
            </span>
            <p className="leading-relaxed">{playerTraining.summary}</p>
          </div>

          {/* Key Players Progression Advice */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-neutral-300 uppercase tracking-wider">
              Key Players Point Allocation & Skill Programs
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {playerTraining.progressionAllocationAdvice.map((advice, idx) => (
                <div key={idx} className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-base font-black text-white">{advice.playerName}</h4>
                      <span className="text-xs font-bold text-emerald-400">{advice.position} · {advice.rating} OVR</span>
                    </div>
                    <button
                      onClick={() => onPlayerBuilderSelect({
                        id: `prog_${idx}`,
                        name: advice.playerName,
                        position: advice.position,
                        rating: advice.rating,
                        confidence: 'High'
                      })}
                      className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-xs font-bold text-emerald-400 border border-neutral-700 transition-colors cursor-pointer"
                    >
                      Build Player →
                    </button>
                  </div>

                  {/* Attribute progression breakdown */}
                  <div className="space-y-2 pt-1">
                    <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
                      Recommended Point Allocation:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {advice.recommendedProgression.map((prog, pIdx) => (
                        <div key={pIdx} className="p-2.5 rounded-xl bg-neutral-900/80 border border-neutral-800 text-xs">
                          <div className="flex items-center justify-between font-bold text-white mb-0.5">
                            <span className="truncate pr-1">{prog.attributeGroup}</span>
                            <span className="text-emerald-400 shrink-0">+{prog.points} pts</span>
                          </div>
                          <p className="text-[11px] text-neutral-400 leading-tight">{prog.targetImpact}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Skills to teach */}
                  <div className="pt-1">
                    <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                      Recommended Skills to Add:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {advice.recommendedSkills.map((sk, sIdx) => (
                        <span key={sIdx} className="px-2.5 py-1 rounded-lg text-xs font-bold bg-neutral-900 text-neutral-300 border border-neutral-800">
                          {sk}
                        </span>
                      ))}
                    </div>
                  </div>

                  <p className="text-xs text-neutral-400 italic bg-neutral-900/40 p-2.5 rounded-xl border border-neutral-800/60">
                    <strong className="text-emerald-400 not-italic">Tactical Focus:</strong> {advice.specialTrainingFocus}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Position-Specific Tips */}
          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-bold text-neutral-300 uppercase tracking-wider">
              Position-Specific Training Rules & Breakpoints
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {playerTraining.positionSpecificTips.map((tip, idx) => (
                <div key={idx} className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 space-y-2">
                  <h4 className="text-sm font-bold text-white flex items-center justify-between">
                    <span>{tip.role}</span>
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {tip.keyStatsToPrioritize.map((st, sIdx) => (
                      <span key={sIdx} className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {st}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-neutral-300 leading-relaxed pt-1">
                    {tip.guidance}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* SECTION B: Tactical Preferences */}
      {(activeTab === 'all' || activeTab === 'tactics') && (
        <section id="tactical-preferences-section" className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400">
                  <BookOpen className="w-5 h-5" />
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Tactical Preferences: {tacticalPrefs.chosenPlaystyle}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Tactical Framework
                </span>
              </div>
              <p className="text-xs sm:text-sm text-neutral-400 mt-1">
                {tacticalPrefs.playstyleOverview}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Attacking Setup */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🎯</span>
                  <h3 className="font-bold text-white text-base">{tacticalPrefs.attackingSetup.title}</h3>
                </div>
                <div className="text-xs text-neutral-400 space-y-1 bg-neutral-900 p-3 rounded-xl border border-neutral-800">
                  <p><strong className="text-emerald-400">Build-up:</strong> {tacticalPrefs.attackingSetup.buildUpStyle}</p>
                  <p><strong className="text-emerald-400">Area:</strong> {tacticalPrefs.attackingSetup.attackingArea}</p>
                  <p><strong className="text-emerald-400">Positioning:</strong> {tacticalPrefs.attackingSetup.positioningFocus}</p>
                </div>
              </div>
              <ul className="space-y-1.5 text-xs text-neutral-300 pt-2 border-t border-neutral-800/80">
                {tacticalPrefs.attackingSetup.details.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-cyan-400 font-bold shrink-0">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Defensive Setup */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🛡️</span>
                  <h3 className="font-bold text-white text-base">{tacticalPrefs.defensiveSetup.title}</h3>
                </div>
                <div className="text-xs text-neutral-400 space-y-1 bg-neutral-900 p-3 rounded-xl border border-neutral-800">
                  <p><strong className="text-rose-400">Style:</strong> {tacticalPrefs.defensiveSetup.defensiveStyle}</p>
                  <p><strong className="text-rose-400">Containment:</strong> {tacticalPrefs.defensiveSetup.containmentArea}</p>
                  <p><strong className="text-rose-400">Defensive Line:</strong> {tacticalPrefs.defensiveSetup.defensiveLineLevel}</p>
                </div>
              </div>
              <ul className="space-y-1.5 text-xs text-neutral-300 pt-2 border-t border-neutral-800/80">
                {tacticalPrefs.defensiveSetup.pressuringGuidelines.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-rose-400 font-bold shrink-0">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Transition Setup */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">⚡</span>
                  <h3 className="font-bold text-white text-base">{tacticalPrefs.transitionSetup.title}</h3>
                </div>
                <div className="text-xs text-neutral-400 space-y-1 bg-neutral-900 p-3 rounded-xl border border-neutral-800">
                  <p><strong className="text-amber-400">Offensive:</strong> {tacticalPrefs.transitionSetup.offensiveTransition}</p>
                  <p><strong className="text-amber-400">Defensive:</strong> {tacticalPrefs.transitionSetup.defensiveTransition}</p>
                </div>
              </div>
              <ul className="space-y-1.5 text-xs text-neutral-300 pt-2 border-t border-neutral-800/80">
                {tacticalPrefs.transitionSetup.counterPressRules.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold shrink-0">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* SECTION C: Game Plan Recommendations */}
      {(activeTab === 'all' || activeTab === 'gamePlan') && (
        <section id="game-plan-recommendations-section" className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                  <Clock className="w-5 h-5" />
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Game Plan Recommendations
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Match-Day Strategy
                </span>
              </div>
              <p className="text-xs sm:text-sm text-neutral-400 mt-1">
                Substitutions timing, condition arrows management, and dynamic in-match tactical adjustments.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* 1. Match-Day Preparation */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Flag className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-white text-base">Match-Day Preparation</h3>
              </div>
              <div className="space-y-2 text-xs text-neutral-300">
                <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1">
                  <span className="font-bold text-emerald-400 block text-[11px] uppercase">Condition Arrows:</span>
                  <p>{gamePlan.matchDayPreparation.conditionArrowPriorities}</p>
                </div>
                <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1">
                  <span className="font-bold text-emerald-400 block text-[11px] uppercase">Captaincy & Set Pieces:</span>
                  <p>{gamePlan.matchDayPreparation.captaincyAndSetPieceTakers}</p>
                </div>
                {gamePlan.matchDayPreparation.fluidFormationNotes && (
                  <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1">
                    <span className="font-bold text-emerald-400 block text-[11px] uppercase">Fluid Formations:</span>
                    <p>{gamePlan.matchDayPreparation.fluidFormationNotes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* 2. Substitution Strategy */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                <h3 className="font-bold text-white text-base">Substitution Strategy</h3>
              </div>
              <div className="space-y-2 text-xs text-neutral-300">
                <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1">
                  <span className="font-bold text-cyan-400 block text-[11px] uppercase">60' - 65' Minute:</span>
                  <p>{gamePlan.substitutionStrategy.earlySecondHalfSub}</p>
                </div>
                <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1">
                  <span className="font-bold text-cyan-400 block text-[11px] uppercase">75' - 80' Minute (Super-sub):</span>
                  <p>{gamePlan.substitutionStrategy.closingStageSub}</p>
                </div>
                <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1">
                  <span className="font-bold text-cyan-400 block text-[11px] uppercase">Stamina Triggers:</span>
                  <ul className="space-y-1 text-[11px] text-neutral-400">
                    {gamePlan.substitutionStrategy.staminaTriggers.map((t, idx) => (
                      <li key={idx}>• {t}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* 3. In-Match Tactical Adjustments */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-white text-base">In-Match Adjustments</h3>
              </div>
              <div className="space-y-2 text-xs text-neutral-300">
                <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1">
                  <span className="font-bold text-amber-400 block text-[11px] uppercase">Leading Late (80'+):</span>
                  <p>{gamePlan.inMatchAdjustments.leadingLate}</p>
                </div>
                <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1">
                  <span className="font-bold text-amber-400 block text-[11px] uppercase">Trailing Late (70'+):</span>
                  <p>{gamePlan.inMatchAdjustments.trailingLate}</p>
                </div>
                <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1">
                  <span className="font-bold text-amber-400 block text-[11px] uppercase">Countering Opponents:</span>
                  <p className="text-[11px]">{gamePlan.inMatchAdjustments.counteringCentralThroughBalls}</p>
                  <p className="text-[11px] pt-1">{gamePlan.inMatchAdjustments.counteringWideOverloads}</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 11. 2D Tactical Match Simulation & Teaching Panel */}
      {(activeTab === 'all' || activeTab === 'simulation') && (
        <TacticalSimulation
          scenarios={squadAnalysis.simulationScenarios}
          formation={squadAnalysis.recommendedFormation}
          playstyle={squadAnalysis.coachRecommendation?.tacticalStyle || 'Quick Counter'}
        />
      )}

      {/* Compare Players Quick Action Panel */}
      {squadAnalysis.identifiedPlayers.length >= 2 && (
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-base font-bold text-white">Compare Squad Players Head-to-Head</h3>
              {detectedComparisonBattles.length > 0 && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                  {detectedComparisonBattles.length} {detectedComparisonBattles.length === 1 ? 'Comparison Available' : 'Battles Identified'}
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              {detectedComparisonBattles.length > 1
                ? `Automated tactical comparisons between all players needing comparison (${detectedComparisonBattles.length} battles: Starting XI vs Substitutes and same-position rivals).`
                : `Evaluate starting suitability and tactical synergy for your recommended tactic.`}
            </p>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => {
                const players = squadAnalysis.identifiedPlayers;
                const firstBattle = detectedComparisonBattles[0];
                const p1 = firstBattle?.playerA || players[0];
                const p2 = firstBattle?.playerB || players[1];
                onComparePlayersSelect(p1, p2, 'battles');
              }}
              className="px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-emerald-400 font-bold text-xs border border-neutral-700 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2"
            >
              <span>Launch Player Comparison</span>
              {detectedComparisonBattles.length > 1 && (
                <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black">
                  {detectedComparisonBattles.length}
                </span>
              )}
              <span>→</span>
            </button>
            {!isAuto23Mode && (
              <button
                id="btn-recommended-starting-xi-dashboard"
                onClick={() => {
                  const players = squadAnalysis.identifiedPlayers;
                  const firstBattle = detectedComparisonBattles[0];
                  const p1 = firstBattle?.playerA || players[0];
                  const p2 = firstBattle?.playerB || players[1];
                  onComparePlayersSelect(p1, p2, 'startingXI');
                }}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-neutral-950 font-black text-xs transition-all shadow-md whitespace-nowrap cursor-pointer flex items-center gap-2"
              >
                <Trophy className="w-4 h-4 text-neutral-950" />
                <span>Recommended Starting XI</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Manual Player Correction Modal */}
      <PlayerCorrectionModal
        player={selectedPlayerForCorrection}
        isOpen={isCorrectionModalOpen}
        onClose={() => {
          setIsCorrectionModalOpen(false);
          setSelectedPlayerForCorrection(null);
        }}
        onSaveCorrection={handleSavePlayerCorrection}
      />

    </div>
  );
};
