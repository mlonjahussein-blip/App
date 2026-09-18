import React, { useState, useMemo } from 'react';
import { PlayerData, AnalysisResult } from '../types.ts';
import { 
  Award, 
  Zap, 
  ShieldCheck, 
  Users, 
  ArrowRightLeft, 
  Check, 
  Sparkles, 
  ChevronRight, 
  ChevronLeft, 
  SlidersHorizontal,
  Trophy,
  Shield,
  Target,
  Activity,
  Flame,
  CheckCircle2,
  Compass,
  ArrowUpRight
} from 'lucide-react';
import { 
  ComparisonBattle, 
  detectAllSquadComparisons, 
  generateTacticalComparisonVerdict,
  isPlayerStarter,
  ComparisonStartingXIResult,
  ComparisonStartingPlayer,
  generateComparisonStartingXI,
  applyComparisonStartingXIToAnalysis
} from '../lib/playerComparison.ts';

interface PlayerComparisonModalProps {
  playerA?: PlayerData;
  playerB?: PlayerData;
  allPlayers?: PlayerData[];
  analysis?: AnalysisResult;
  onClose: () => void;
  onApplyStartingXI?: (updatedAnalysis: AnalysisResult) => void;
  tacticalPlaystyle?: string;
  formation?: string;
  initialViewMode?: 'battles' | 'startingXI';
}

export const PlayerComparisonModal: React.FC<PlayerComparisonModalProps> = ({
  playerA,
  playerB,
  allPlayers = [],
  analysis,
  onClose,
  onApplyStartingXI,
  tacticalPlaystyle = 'Quick Counter',
  formation = '4-2-1-3',
  initialViewMode = 'battles'
}) => {
  // Top-level view mode: 'battles' (head-to-head comparison cards) or 'startingXI' (recommended starting XI from comparison)
  const [viewMode, setViewMode] = useState<'battles' | 'startingXI'>(initialViewMode);

  // Compute all battles that need comparison
  const detectedBattles: ComparisonBattle[] = useMemo(() => {
    // If allPlayers are provided with >= 2 players, run automated squad comparison detector
    if (allPlayers && allPlayers.length >= 2) {
      return detectAllSquadComparisons(allPlayers, tacticalPlaystyle);
    }
    
    // Fallback if only playerA and playerB provided
    if (playerA && playerB) {
      const { recommendedStarter, verdictReason, secondaryRole } = generateTacticalComparisonVerdict(
        playerA,
        playerB,
        tacticalPlaystyle,
        'same_position'
      );
      return [{
        id: 'battle_single',
        playerA,
        playerB,
        position: playerA.position || playerB.position || 'FOCUSED',
        category: 'same_position',
        title: `${playerA.position || 'Player'} Head-to-Head Comparison`,
        context: `${playerA.name} vs ${playerB.name}`,
        recommendedStarter,
        substitutePlayer: recommendedStarter === playerA ? playerB : playerA,
        verdictReason,
        secondaryRole
      }];
    }

    return [];
  }, [allPlayers, playerA, playerB, tacticalPlaystyle]);

  // Compute the Recommended Starting XI derived from this comparison
  const comparisonStartingXIResult: ComparisonStartingXIResult = useMemo(() => {
    return generateComparisonStartingXI(
      allPlayers,
      detectedBattles,
      formation,
      tacticalPlaystyle,
      analysis?.bestXI?.players
    );
  }, [allPlayers, detectedBattles, formation, tacticalPlaystyle, analysis?.bestXI?.players]);

  // Selected player for the Starting XI Pitch Inspector
  const [selectedXIPlayer, setSelectedXIPlayer] = useState<ComparisonStartingPlayer | null>(
    comparisonStartingXIResult.startingXI[0] || null
  );

  // Subtab within the Starting XI results view
  const [startingXISubTab, setStartingXISubTab] = useState<'pitch' | 'battles_summary' | 'bench' | 'instructions' | 'ratings'>('pitch');

  // Notification when changes applied to main dashboard
  const [appliedToast, setAppliedToast] = useState(false);

  // View mode for battles: 'all' or specific battle id or 'custom'
  const [selectedBattleId, setSelectedBattleId] = useState<string>('all');

  // Custom player selection state
  const [customPlayerAId, setCustomPlayerAId] = useState<string>(
    allPlayers[0]?.id || allPlayers[0]?.name || ''
  );
  const [customPlayerBId, setCustomPlayerBId] = useState<string>(
    allPlayers[1]?.id || allPlayers[1]?.name || ''
  );

  // Custom comparison calculation
  const customBattle: ComparisonBattle | null = useMemo(() => {
    if (selectedBattleId !== 'custom' || allPlayers.length < 2) return null;
    const p1 = allPlayers.find(p => (p.id || p.name) === customPlayerAId) || allPlayers[0];
    const p2 = allPlayers.find(p => (p.id || p.name) === customPlayerBId) || allPlayers[1];
    if (!p1 || !p2 || (p1.id === p2.id && p1.name === p2.name)) return null;

    const cat = (p1.position || '').toUpperCase() === (p2.position || '').toUpperCase() 
      ? 'same_position' 
      : 'tactical_alternative';
    const { recommendedStarter, verdictReason, secondaryRole } = generateTacticalComparisonVerdict(
      p1,
      p2,
      tacticalPlaystyle,
      cat
    );

    return {
      id: 'custom_battle',
      playerA: p1,
      playerB: p2,
      position: `${p1.position}/${p2.position}`,
      category: cat,
      title: `Custom Head-to-Head: ${p1.name} vs ${p2.name}`,
      context: `User-selected tactical matchup in ${tacticalPlaystyle}`,
      recommendedStarter,
      substitutePlayer: recommendedStarter === p1 ? p2 : p1,
      verdictReason,
      secondaryRole
    };
  }, [selectedBattleId, customPlayerAId, customPlayerBId, allPlayers, tacticalPlaystyle]);

  // Determine battles to display
  const isSingleComparison = detectedBattles.length <= 1;

  const activeBattlesToRender: ComparisonBattle[] = useMemo(() => {
    if (isSingleComparison) {
      return detectedBattles;
    }
    if (selectedBattleId === 'custom' && customBattle) {
      return [customBattle];
    }
    if (selectedBattleId !== 'all') {
      const match = detectedBattles.find(b => b.id === selectedBattleId);
      return match ? [match] : detectedBattles;
    }
    return detectedBattles;
  }, [isSingleComparison, detectedBattles, selectedBattleId, customBattle]);

  // Metrics for quick summary
  const starterVsSubCount = detectedBattles.filter(b => b.category === 'starter_vs_sub').length;
  const samePositionCount = detectedBattles.filter(b => b.category === 'same_position').length;

  // Handle applying Starting XI to Main Dashboard
  const handleApplyToMainDashboard = () => {
    if (!analysis || !onApplyStartingXI) return;
    const updated = applyComparisonStartingXIToAnalysis(analysis, comparisonStartingXIResult);
    onApplyStartingXI(updated);
    setAppliedToast(true);
    setTimeout(() => setAppliedToast(false), 4500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-5xl w-full p-5 sm:p-7 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 my-auto max-h-[92vh] flex flex-col">
        
        {/* Main Header & View Mode Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-800 shrink-0">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                {viewMode === 'battles' ? (
                  <>
                    <Award className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
                    <span>Squad Head-to-Head Comparisons</span>
                  </>
                ) : (
                  <>
                    <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
                    <span>Recommended Starting XI from Comparison</span>
                  </>
                )}
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                {tacticalPlaystyle} • {formation}
              </span>
              {viewMode === 'startingXI' && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/20 font-bold">
                  {comparisonStartingXIResult.averageRating} Avg OVR
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              {viewMode === 'battles'
                ? `Automated tactical comparisons between all players in direct position battles. Check the Recommended Starting XI formulated from these duels.`
                : `AI-formulated Starting XI derived directly from head-to-head comparison victories, tactical fit, and positional chemistry.`}
            </p>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
            {/* Primary Action: Toggle between Head-to-Head Comparisons and Recommended Starting XI */}
            {viewMode === 'battles' ? (
              <button
                type="button"
                id="btn-switch-to-starting-xi-header"
                onClick={() => setViewMode('startingXI')}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-neutral-950 font-black text-xs shadow-lg shadow-emerald-500/20 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Sparkles className="w-4 h-4 text-neutral-950" />
                <span>Show Recommended Starting XI from Comparison</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                id="btn-switch-to-battles-header"
                onClick={() => setViewMode('battles')}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-xs border border-neutral-700 cursor-pointer transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back to Comparisons</span>
              </button>
            )}

            <button 
              type="button"
              onClick={onClose} 
              className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Applied Toast Notification */}
        {appliedToast && (
          <div className="p-3 bg-emerald-500/20 border border-emerald-500/50 rounded-2xl flex items-center justify-between text-emerald-300 text-xs font-semibold animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Starting XI from this comparison successfully applied to your Main Tactical Dashboard!</span>
            </div>
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Active in Report</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW MODE 1: HEAD-TO-HEAD BATTLES (Existing and enhanced view)              */}
        {/* ========================================================================= */}
        {viewMode === 'battles' && (
          <>
            {/* Multi-Comparison Navigation & Starting XI Promotion Callout */}
            <div className="space-y-2.5 shrink-0">
              {/* Context Metrics Summary Banner */}
              <div className="flex items-center justify-between flex-wrap gap-2 text-[11px] text-neutral-400 bg-neutral-950/70 border border-neutral-800/80 px-3 py-2 rounded-xl">
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="flex items-center gap-1.5 text-neutral-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <strong>{starterVsSubCount}</strong> Starter vs Substitution Battles
                  </span>
                  <span className="flex items-center gap-1.5 text-neutral-300">
                    <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                    <strong>{samePositionCount}</strong> Same-Position Duels
                  </span>
                  {comparisonStartingXIResult.promotionsCount > 0 && (
                    <span className="flex items-center gap-1.5 text-amber-300">
                      <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                      <strong>{comparisonStartingXIResult.promotionsCount}</strong> Upgrades for Starting XI
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  id="btn-banner-link-starting-xi"
                  onClick={() => setViewMode('startingXI')}
                  className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>View Starting XI from this Comparison</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Battle Selection Tabs Row */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-neutral-700">
                {/* RECOMMENDED STARTING XI TAB BUTTON */}
                <button
                  type="button"
                  id="tab-btn-recommended-starting-xi"
                  onClick={() => setViewMode('startingXI')}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-black transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 text-emerald-300 border border-emerald-500/40 shadow-sm"
                >
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  <span>Recommended Starting XI</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-emerald-500 text-neutral-950">
                    11
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedBattleId('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    selectedBattleId === 'all'
                      ? 'bg-emerald-500 text-neutral-950 shadow-md'
                      : 'bg-neutral-950 text-neutral-400 hover:text-white hover:bg-neutral-800 border border-neutral-800'
                  }`}
                >
                  <span>All Comparisons</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    selectedBattleId === 'all' ? 'bg-neutral-900 text-emerald-300' : 'bg-neutral-800 text-neutral-300'
                  }`}>
                    {detectedBattles.length}
                  </span>
                </button>

                {detectedBattles.map((battle) => {
                  const isActive = selectedBattleId === battle.id;
                  const p1Short = battle.playerA.name.split(' ').pop();
                  const p2Short = battle.playerB.name.split(' ').pop();
                  return (
                    <button
                      key={battle.id}
                      type="button"
                      onClick={() => setSelectedBattleId(battle.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                        isActive
                          ? 'bg-cyan-500 text-neutral-950 shadow-md font-black'
                          : 'bg-neutral-950 text-neutral-400 hover:text-white hover:bg-neutral-800 border border-neutral-800'
                      }`}
                    >
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-neutral-900/60">
                        {battle.position}
                      </span>
                      <span>{p1Short} vs {p2Short}</span>
                    </button>
                  );
                })}

                {allPlayers.length >= 2 && (
                  <button
                    type="button"
                    onClick={() => setSelectedBattleId('custom')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                      selectedBattleId === 'custom'
                        ? 'bg-purple-500 text-white shadow-md'
                        : 'bg-neutral-950 text-purple-400 hover:text-purple-300 hover:bg-neutral-800 border border-purple-500/30'
                    }`}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>Custom Matchup</span>
                  </button>
                )}
              </div>
            </div>

            {/* Custom Matchup Selector Panel (When in 'custom' tab) */}
            {selectedBattleId === 'custom' && allPlayers.length >= 2 && (
              <div className="bg-neutral-950 border border-purple-500/30 rounded-2xl p-4 space-y-3 shrink-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    Select Any Two Squad Players to Compare:
                  </span>
                  <span className="text-[11px] text-neutral-500">Live AI Tactical Scoring</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-neutral-400 uppercase font-bold block mb-1">Player 1</label>
                    <select
                      value={customPlayerAId}
                      onChange={(e) => setCustomPlayerAId(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-purple-500 cursor-pointer"
                    >
                      {allPlayers.map((p) => (
                        <option key={p.id || p.name} value={p.id || p.name}>
                          [{p.position}] {p.name} ({p.rating} OVR) — {isPlayerStarter(p, allPlayers) ? 'Starting XI' : 'Sub'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 uppercase font-bold block mb-1">Player 2</label>
                    <select
                      value={customPlayerBId}
                      onChange={(e) => setCustomPlayerBId(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-purple-500 cursor-pointer"
                    >
                      {allPlayers.map((p) => (
                        <option key={p.id || p.name} value={p.id || p.name}>
                          [{p.position}] {p.name} ({p.rating} OVR) — {isPlayerStarter(p, allPlayers) ? 'Starting XI' : 'Sub'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Scrollable Container for Comparisons */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-6 scrollbar-thin scrollbar-thumb-neutral-800">
              
              {/* Highlighted Starting XI Recommendation Banner Box */}
              <div className="bg-gradient-to-r from-emerald-950/60 via-neutral-900 to-teal-950/60 border border-emerald-500/40 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400">
                      <Sparkles className="w-4 h-4" />
                    </span>
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                      Recommended Starting XI Formulated From These Comparisons
                    </span>
                    {comparisonStartingXIResult.promotionsCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                        {comparisonStartingXIResult.promotionsCount} Upgrades
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-300 max-w-xl leading-relaxed">
                    Based on these {detectedBattles.length} positional contests, the system has constructed your optimized Starting XI with full formation pitch coordinates, tactical player roles, and bench strategies.
                  </p>
                </div>
                <button
                  type="button"
                  id="btn-show-starting-xi-body-cta"
                  onClick={() => setViewMode('startingXI')}
                  className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-xs transition-all shadow-md flex items-center gap-2 whitespace-nowrap cursor-pointer hover:scale-[1.02] shrink-0"
                >
                  <Trophy className="w-3.5 h-3.5" />
                  <span>Show Recommended Starting XI</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {activeBattlesToRender.length === 0 ? (
                <div className="text-center py-12 bg-neutral-950 rounded-2xl border border-neutral-800 text-neutral-400 text-xs">
                  No comparison battles found. Select two players in the squad or choose Custom Matchup.
                </div>
              ) : (
                activeBattlesToRender.map((battle, index) => {
                  const pA = battle.playerA;
                  const pB = battle.playerB;
                  const isStarterA = isPlayerStarter(pA, allPlayers);
                  const isStarterB = isPlayerStarter(pB, allPlayers);
                  const winner = battle.recommendedStarter;
                  const isFavoredA = winner.name === pA.name;
                  const isFavoredB = winner.name === pB.name;

                  // Badge category label
                  let categoryBadge = 'Head-to-Head Comparison';
                  let badgeColor = 'bg-neutral-800 text-neutral-300 border-neutral-700';

                  if (battle.category === 'starter_vs_sub') {
                    categoryBadge = 'Starting XI vs Substitution Battle';
                    badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
                  } else if (battle.category === 'same_position') {
                    categoryBadge = 'Same Position Dual Contenders';
                    badgeColor = 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
                  } else if (battle.category === 'tactical_alternative') {
                    categoryBadge = 'Tactical Role Alternative';
                    badgeColor = 'bg-purple-500/10 text-purple-400 border-purple-500/30';
                  }

                  return (
                    <div 
                      key={battle.id || index}
                      className="bg-neutral-950 rounded-3xl border border-neutral-800 p-5 sm:p-6 space-y-5 shadow-lg"
                    >
                      {/* Battle Title Bar */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-neutral-900">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-lg text-xs font-black uppercase bg-neutral-900 text-emerald-400 border border-neutral-800">
                            {battle.position}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold border ${badgeColor}`}>
                            {categoryBadge}
                          </span>
                          <h3 className="text-sm sm:text-base font-black text-white">
                            {battle.title}
                          </h3>
                        </div>
                        <span className="text-[11px] text-neutral-400 italic">
                          {battle.context}
                        </span>
                      </div>

                      {/* 2-Column Side-by-Side Comparison Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Player A Card */}
                        <div 
                          className={`bg-neutral-900/90 rounded-2xl p-4 sm:p-5 border space-y-4 transition-all ${
                            isFavoredA 
                              ? 'border-emerald-500/60 shadow-lg shadow-emerald-500/10 bg-gradient-to-b from-neutral-900 to-emerald-950/20' 
                              : 'border-neutral-800 opacity-85'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-neutral-800 text-emerald-400 border border-neutral-700">
                                  {pA.position}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  isStarterA 
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                                    : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                }`}>
                                  {isStarterA ? 'Starting XI' : 'Sub / Bench'}
                                </span>
                              </div>
                              <h4 className="text-base font-black text-white mt-1.5">{pA.name}</h4>
                              <span className="text-xs text-neutral-400 font-medium">{pA.playstyle || 'Standard'}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-3xl font-black text-emerald-400">{pA.rating}</span>
                              <span className="block text-[10px] text-neutral-500 uppercase font-bold">Overall</span>
                            </div>
                          </div>

                          {isFavoredA ? (
                            <div className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold text-center flex items-center justify-center gap-1.5">
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span>★ AI Recommended Starter</span>
                            </div>
                          ) : (
                            <div className="px-3 py-1.5 rounded-xl bg-neutral-800/80 border border-neutral-700 text-neutral-300 text-xs font-semibold text-center flex items-center justify-center gap-1.5">
                              <ArrowRightLeft className="w-3 h-3 text-cyan-400" />
                              <span>Role: {battle.secondaryRole}</span>
                            </div>
                          )}

                          <div className="space-y-1.5 text-xs text-neutral-300 bg-neutral-950/60 rounded-xl p-3 border border-neutral-900">
                            <div className="flex justify-between py-1 border-b border-neutral-900">
                              <span className="text-neutral-500 font-medium">Card Archetype</span>
                              <span className="font-semibold text-white">{pA.playerType || 'Standard'}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-neutral-900">
                              <span className="text-neutral-500 font-medium">Identification Confidence</span>
                              <span className="font-semibold text-emerald-400">{pA.confidence || 'High'}</span>
                            </div>
                            <div className="flex justify-between py-1">
                              <span className="text-neutral-500 font-medium">Tactical Skills Count</span>
                              <span className="font-semibold text-white">{pA.skills?.length || 3} Registered</span>
                            </div>
                            {pA.skills && pA.skills.length > 0 && (
                              <div className="pt-1.5 flex flex-wrap gap-1">
                                {pA.skills.slice(0, 3).map((sk, sIdx) => (
                                  <span key={sIdx} className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-900 text-neutral-400 border border-neutral-800">
                                    {sk}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Player B Card */}
                        <div 
                          className={`bg-neutral-900/90 rounded-2xl p-4 sm:p-5 border space-y-4 transition-all ${
                            isFavoredB 
                              ? 'border-emerald-500/60 shadow-lg shadow-emerald-500/10 bg-gradient-to-b from-neutral-900 to-emerald-950/20' 
                              : 'border-neutral-800 opacity-85'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-neutral-800 text-emerald-400 border border-neutral-700">
                                  {pB.position}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  isStarterB 
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                                    : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                }`}>
                                  {isStarterB ? 'Starting XI' : 'Sub / Bench'}
                                </span>
                              </div>
                              <h4 className="text-base font-black text-white mt-1.5">{pB.name}</h4>
                              <span className="text-xs text-neutral-400 font-medium">{pB.playstyle || 'Standard'}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-3xl font-black text-emerald-400">{pB.rating}</span>
                              <span className="block text-[10px] text-neutral-500 uppercase font-bold">Overall</span>
                            </div>
                          </div>

                          {isFavoredB ? (
                            <div className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold text-center flex items-center justify-center gap-1.5">
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span>★ AI Recommended Starter</span>
                            </div>
                          ) : (
                            <div className="px-3 py-1.5 rounded-xl bg-neutral-800/80 border border-neutral-700 text-neutral-300 text-xs font-semibold text-center flex items-center justify-center gap-1.5">
                              <ArrowRightLeft className="w-3 h-3 text-cyan-400" />
                              <span>Role: {battle.secondaryRole}</span>
                            </div>
                          )}

                          <div className="space-y-1.5 text-xs text-neutral-300 bg-neutral-950/60 rounded-xl p-3 border border-neutral-900">
                            <div className="flex justify-between py-1 border-b border-neutral-900">
                              <span className="text-neutral-500 font-medium">Card Archetype</span>
                              <span className="font-semibold text-white">{pB.playerType || 'Standard'}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-neutral-900">
                              <span className="text-neutral-500 font-medium">Identification Confidence</span>
                              <span className="font-semibold text-emerald-400">{pB.confidence || 'High'}</span>
                            </div>
                            <div className="flex justify-between py-1">
                              <span className="text-neutral-500 font-medium">Tactical Skills Count</span>
                              <span className="font-semibold text-white">{pB.skills?.length || 3} Registered</span>
                            </div>
                            {pB.skills && pB.skills.length > 0 && (
                              <div className="pt-1.5 flex flex-wrap gap-1">
                                {pB.skills.slice(0, 3).map((sk, sIdx) => (
                                  <span key={sIdx} className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-900 text-neutral-400 border border-neutral-800">
                                    {sk}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* AI Tactical Verdict Box */}
                      <div className="bg-neutral-900/90 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                            AI Tactical Match Verdict
                          </span>
                          <span className="text-[10px] font-mono text-neutral-400">
                            Target System: {tacticalPlaystyle}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-neutral-200 leading-relaxed">
                          {battle.verdictReason}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        {/* ========================================================================= */}
        {/* VIEW MODE 2: RECOMMENDED STARTING XI FROM COMPARISON (Full Results View)  */}
        {/* ========================================================================= */}
        {viewMode === 'startingXI' && (
          <div className="flex-1 overflow-y-auto pr-1 space-y-5 scrollbar-thin scrollbar-thumb-neutral-800">
            
            {/* Action Bar with Subtabs & Main Results Sync Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-950/80 border border-neutral-800 p-3 sm:p-4 rounded-2xl">
              
              {/* Internal Subtabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-thin scrollbar-thumb-neutral-700">
                <button
                  type="button"
                  onClick={() => setStartingXISubTab('pitch')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    startingXISubTab === 'pitch'
                      ? 'bg-emerald-500 text-neutral-950 shadow-md font-black'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                  }`}
                >
                  <Trophy className="w-3.5 h-3.5" />
                  <span>2D Pitch & Lineup</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStartingXISubTab('battles_summary')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    startingXISubTab === 'battles_summary'
                      ? 'bg-emerald-500 text-neutral-950 shadow-md font-black'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Duel Outcomes ({comparisonStartingXIResult.startingXI.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStartingXISubTab('bench')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    startingXISubTab === 'bench'
                      ? 'bg-emerald-500 text-neutral-950 shadow-md font-black'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                  }`}
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>Impact Bench ({comparisonStartingXIResult.benchPlayers.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStartingXISubTab('instructions')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    startingXISubTab === 'instructions'
                      ? 'bg-emerald-500 text-neutral-950 shadow-md font-black'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Tactical Instructions</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStartingXISubTab('ratings')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    startingXISubTab === 'ratings'
                      ? 'bg-emerald-500 text-neutral-950 shadow-md font-black'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Squad Ratings</span>
                </button>
              </div>

              {/* Sync Button: Applies this Starting XI to Main Report */}
              {onApplyStartingXI && analysis && (
                <button
                  type="button"
                  id="btn-apply-comparison-starting-xi"
                  onClick={handleApplyToMainDashboard}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-neutral-950 font-black text-xs shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer transition-all hover:scale-[1.02] shrink-0"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Apply to Main Results Dashboard</span>
                </button>
              )}
            </div>

            {/* Subtab 1: 2D Pitch & Selected Player Intel */}
            {startingXISubTab === 'pitch' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                
                {/* 2D Interactive Pitch (Left side) */}
                <div className="lg:col-span-7 flex flex-col items-center">
                  <div className="relative w-full max-w-[420px] aspect-[68/100] rounded-2xl overflow-hidden shadow-2xl border-2 border-emerald-800/80 bg-gradient-to-b from-[#0d2a17] via-[#091f11] to-[#0d2a17]">
                    
                    {/* Pitch Lines */}
                    <div className="absolute inset-0 pointer-events-none opacity-25">
                      <div className="absolute inset-3 border-2 border-white" />
                      <div className="absolute top-1/2 left-3 right-3 h-0.5 bg-white -translate-y-1/2" />
                      <div className="absolute top-1/2 left-1/2 w-24 h-24 -translate-x-1/2 -translate-y-1/2 border-2 border-white rounded-full" />
                      <div className="absolute top-3 left-1/2 -translate-x-1/2 w-48 h-20 border-2 border-t-0 border-white" />
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-48 h-20 border-2 border-b-0 border-white" />
                    </div>

                    {/* 11 Starting Players on Pitch */}
                    {comparisonStartingXIResult.startingXI.map((player) => {
                      const isSelected = selectedXIPlayer?.name === player.name;
                      return (
                        <button
                          key={player.id || player.name}
                          type="button"
                          onClick={() => setSelectedXIPlayer(player)}
                          style={{
                            left: `${player.pitchX}%`,
                            top: `${player.pitchY}%`
                          }}
                          className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer transition-transform hover:scale-110 active:scale-95 z-10"
                        >
                          {/* Player Token */}
                          <div 
                            className={`relative px-2 py-1 rounded-xl flex items-center gap-1.5 shadow-lg backdrop-blur-md transition-all ${
                              isSelected 
                                ? 'bg-amber-400 text-neutral-950 ring-4 ring-amber-400/50 scale-105 font-black' 
                                : player.isPromotedFromBattle
                                  ? 'bg-emerald-500 text-neutral-950 font-black ring-2 ring-emerald-300'
                                  : 'bg-neutral-900/90 text-white border border-neutral-700 hover:border-emerald-400'
                            }`}
                          >
                            <span className="text-[10px] font-black uppercase tracking-tight">
                              {player.position}
                            </span>
                            <span className={`text-[11px] font-black ${isSelected ? 'text-neutral-950' : player.isPromotedFromBattle ? 'text-neutral-950' : 'text-emerald-400'}`}>
                              {player.rating}
                            </span>
                            {player.isPromotedFromBattle && (
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-ping"></span>
                            )}
                          </div>

                          {/* Player Name Tag */}
                          <span 
                            className={`mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm max-w-[80px] truncate ${
                              isSelected 
                                ? 'bg-amber-400 text-neutral-950 font-black' 
                                : 'bg-neutral-950/80 text-neutral-200 border border-neutral-800'
                            }`}
                          >
                            {player.name.split(' ').pop()}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Pitch Legend */}
                  <div className="flex items-center gap-4 mt-3 text-[11px] text-neutral-400 flex-wrap justify-center">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                      Promoted from Comparison Duel
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-neutral-800 border border-neutral-600"></span>
                      Confirmed Starter
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                      Selected on Pitch
                    </span>
                  </div>
                </div>

                {/* Selected Player Tactical Intel (Right side) */}
                <div className="lg:col-span-5 space-y-4">
                  {selectedXIPlayer ? (
                    <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 space-y-4">
                      
                      {/* Player Header */}
                      <div className="flex items-start justify-between pb-3 border-b border-neutral-900">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-neutral-800 text-emerald-400 border border-neutral-700">
                              {selectedXIPlayer.position}
                            </span>
                            {selectedXIPlayer.isPromotedFromBattle ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                                ★ Promoted from Battle
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                ★ Confirmed Starter
                              </span>
                            )}
                          </div>
                          <h3 className="text-lg font-black text-white mt-1.5">{selectedXIPlayer.name}</h3>
                          <span className="text-xs text-neutral-400">{selectedXIPlayer.playstyle || 'Versatile'}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-3xl font-black text-emerald-400">{selectedXIPlayer.rating}</span>
                          <span className="block text-[10px] text-neutral-500 uppercase font-bold">Overall</span>
                        </div>
                      </div>

                      {/* Head-to-Head Duel Record */}
                      {selectedXIPlayer.h2hRivalName && (
                        <div className="bg-neutral-900/80 border border-emerald-500/30 rounded-xl p-3 space-y-1.5">
                          <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            Head-to-Head Comparison Outcome:
                          </span>
                          <p className="text-xs text-neutral-300">
                            Prevailed in direct tactical comparison against <strong>{selectedXIPlayer.h2hRivalName}</strong> ({selectedXIPlayer.h2hRivalRating} OVR).
                          </p>
                        </div>
                      )}

                      {/* Selection Reason */}
                      <div className="space-y-1">
                        <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                          Tactical Selection Rationale:
                        </span>
                        <p className="text-xs text-neutral-200 leading-relaxed bg-neutral-900/60 p-3 rounded-xl border border-neutral-900">
                          {selectedXIPlayer.selectionReason}
                        </p>
                      </div>

                      {/* Tactical Skills */}
                      <div className="space-y-2">
                        <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                          Registered Player Skills ({selectedXIPlayer.skills?.length || 0}):
                        </span>
                        {selectedXIPlayer.skills && selectedXIPlayer.skills.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {selectedXIPlayer.skills.map((skill, idx) => (
                              <span key={idx} className="text-[10px] px-2 py-1 rounded-lg bg-neutral-900 text-neutral-300 border border-neutral-800">
                                {skill}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-neutral-500 italic">Standard skillset configured for position.</span>
                        )}
                      </div>

                      {/* Instructions Hint */}
                      <div className="text-[11px] text-neutral-400 bg-neutral-900/40 p-2.5 rounded-xl border border-neutral-900 flex items-center justify-between">
                        <span>Position Coordinates:</span>
                        <span className="font-mono text-emerald-400">X: {selectedXIPlayer.pitchX}%, Y: {selectedXIPlayer.pitchY}%</span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-8 text-center text-neutral-500 text-xs">
                      Click any player token on the pitch to view their tactical comparison profile.
                    </div>
                  )}

                  {/* Summary of Starting XI Chemistry */}
                  <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 space-y-2">
                    <span className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-emerald-400" />
                      Starting XI Composition Overview:
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-neutral-900 p-2.5 rounded-xl border border-neutral-800">
                        <span className="text-neutral-500 block text-[10px]">Starters Rating</span>
                        <span className="text-base font-black text-white">{comparisonStartingXIResult.averageRating} OVR</span>
                      </div>
                      <div className="bg-neutral-900 p-2.5 rounded-xl border border-neutral-800">
                        <span className="text-neutral-500 block text-[10px]">Head-to-Head Upgrades</span>
                        <span className="text-base font-black text-amber-400">{comparisonStartingXIResult.promotionsCount} Promoted</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Subtab 2: Duel Outcomes Table */}
            {startingXISubTab === 'battles_summary' && (
              <div className="space-y-4">
                <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 sm:p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                      <Users className="w-4 h-4 text-emerald-400" />
                      <span>Starting XI Position Battle Results</span>
                    </h3>
                    <span className="text-xs text-neutral-400">11 Starting Spots Resolved</span>
                  </div>
                  <p className="text-xs text-neutral-400">
                    Review how each spot was assigned between starters and challenger substitutes.
                  </p>

                  <div className="space-y-2.5 pt-2">
                    {comparisonStartingXIResult.changesSummary.map((item, idx) => (
                      <div 
                        key={idx}
                        className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          item.type === 'promoted'
                            ? 'bg-amber-500/10 border-amber-500/30'
                            : item.type === 'confirmed'
                              ? 'bg-neutral-900 border-neutral-800'
                              : 'bg-neutral-900/60 border-neutral-900'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="px-2 py-1 rounded-lg text-xs font-black uppercase bg-neutral-950 text-emerald-400 border border-neutral-800 min-w-[42px] text-center">
                            {item.position}
                          </span>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-black text-white">{item.starterName}</span>
                              <span className="text-xs text-emerald-400 font-bold">({item.starterRating} OVR)</span>
                              {item.type === 'promoted' && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-400 text-neutral-950">
                                  ★ Promoted from Bench
                                </span>
                              )}
                              {item.type === 'confirmed' && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-neutral-800 text-neutral-300">
                                  ★ Won Position Contest
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-neutral-400 mt-0.5">{item.reason}</p>
                          </div>
                        </div>

                        {item.rivalName && (
                          <div className="text-right sm:text-right text-xs text-neutral-400 shrink-0 bg-neutral-950/60 px-3 py-1.5 rounded-lg border border-neutral-800">
                            <span className="text-[10px] text-neutral-500 block uppercase">Sub Relegated</span>
                            <span className="font-semibold text-neutral-300">{item.rivalName}</span>
                            <span className="text-neutral-500 ml-1">({item.rivalRating} OVR)</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Subtab 3: Impact Bench & Substitutes */}
            {startingXISubTab === 'bench' && (
              <div className="space-y-4">
                <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 sm:p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                      <ArrowRightLeft className="w-4 h-4 text-cyan-400" />
                      <span>Impact Substitutes & Rotational Strategy</span>
                    </h3>
                    <span className="text-xs text-neutral-400 font-bold">{comparisonStartingXIResult.benchPlayers.length} Squad Reserves</span>
                  </div>
                  <p className="text-xs text-neutral-400">
                    Players who were designated to the bench from the comparisons, with their specific entry minute (65'-70') and tactical rotation role.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    {comparisonStartingXIResult.benchPlayers.map((sub, sIdx) => (
                      <div key={sub.id || sIdx} className="bg-neutral-900 border border-neutral-800 rounded-xl p-3.5 space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-neutral-800 text-cyan-400 border border-neutral-700">
                                {sub.position}
                              </span>
                              <span className="text-xs font-black text-white">{sub.name}</span>
                            </div>
                            <span className="text-[11px] text-neutral-400">{sub.playstyle || 'Versatile'}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-lg font-black text-cyan-400">{sub.rating}</span>
                            <span className="text-[9px] text-neutral-500 block uppercase font-bold">OVR</span>
                          </div>
                        </div>

                        <div className="bg-neutral-950/80 p-2 rounded-lg border border-neutral-900 text-xs space-y-1">
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-neutral-500 font-medium">Assigned Role:</span>
                            <span className="font-bold text-cyan-300">{sub.secondaryRole}</span>
                          </div>
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-neutral-500 font-medium">Entry Minute:</span>
                            <span className="font-mono font-bold text-emerald-400">{sub.impactMinute}</span>
                          </div>
                        </div>

                        <p className="text-[11px] text-neutral-400 leading-tight">
                          {sub.rotationNote}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Subtab 4: Calibrated Tactical Instructions */}
            {startingXISubTab === 'instructions' && (
              <div className="space-y-4">
                <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 sm:p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>Calibrated Individual Instructions for this Lineup</span>
                    </h3>
                    <span className="text-xs text-neutral-400 font-bold">eFootball 2027 Guidelines</span>
                  </div>
                  <p className="text-xs text-neutral-400">
                    Preset attack and defence instructions designed to extract maximum performance from this Starting XI lineup.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                    {comparisonStartingXIResult.individualInstructions.map((inst, iIdx) => (
                      <div key={iIdx} className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-2">
                        <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                          <span className="text-xs font-black uppercase text-emerald-400">
                            {inst.slot}
                          </span>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            {inst.instruction}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-white">{inst.player}</span>
                          <span className="text-xs font-black text-neutral-400 uppercase">({inst.position})</span>
                        </div>
                        <p className="text-xs text-neutral-300 leading-relaxed pt-1">
                          {inst.why}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* In-Match Tactical Adjustments */}
                  <div className="mt-4 bg-neutral-900/60 border border-neutral-800 rounded-xl p-4 space-y-3">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5 text-emerald-400" />
                      In-Match Tactical Triggers for this Starting XI:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                      <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-900">
                        <strong className="text-emerald-400 block mb-1">When Protecting a Late Lead (75'+)</strong>
                        <span className="text-neutral-300">{comparisonStartingXIResult.inMatchAdjustments.leadingLate}</span>
                      </div>
                      <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-900">
                        <strong className="text-amber-400 block mb-1">When Chasing a Goal (Trailing at 65'+)</strong>
                        <span className="text-neutral-300">{comparisonStartingXIResult.inMatchAdjustments.trailingLate}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Subtab 5: Squad Ratings Breakdown */}
            {startingXISubTab === 'ratings' && (
              <div className="space-y-4">
                <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 sm:p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                      <Activity className="w-4 h-4 text-emerald-400" />
                      <span>Squad Ratings Recalculated for this Starting XI</span>
                    </h3>
                    <span className="text-xs text-neutral-400">Tactical Playstyle: {tacticalPlaystyle}</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-neutral-900 p-3 rounded-xl border border-neutral-800 text-center">
                      <span className="text-[10px] uppercase font-bold text-neutral-400 block">Overall OVR</span>
                      <span className="text-2xl font-black text-emerald-400">{comparisonStartingXIResult.squadRatings.overall}</span>
                    </div>
                    <div className="bg-neutral-900 p-3 rounded-xl border border-neutral-800 text-center">
                      <span className="text-[10px] uppercase font-bold text-neutral-400 block">Attack Rating</span>
                      <span className="text-2xl font-black text-rose-400">{comparisonStartingXIResult.squadRatings.attack}</span>
                    </div>
                    <div className="bg-neutral-900 p-3 rounded-xl border border-neutral-800 text-center">
                      <span className="text-[10px] uppercase font-bold text-neutral-400 block">Midfield Rating</span>
                      <span className="text-2xl font-black text-amber-400">{comparisonStartingXIResult.squadRatings.midfield}</span>
                    </div>
                    <div className="bg-neutral-900 p-3 rounded-xl border border-neutral-800 text-center">
                      <span className="text-[10px] uppercase font-bold text-neutral-400 block">Defence Rating</span>
                      <span className="text-2xl font-black text-cyan-400">{comparisonStartingXIResult.squadRatings.defence}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-neutral-900 p-3 rounded-xl border border-neutral-800 text-center">
                      <span className="text-[10px] uppercase font-bold text-neutral-400 block">Goalkeeping</span>
                      <span className="text-2xl font-black text-teal-400">{comparisonStartingXIResult.squadRatings.goalkeeping}</span>
                    </div>
                    <div className="bg-neutral-900 p-3 rounded-xl border border-neutral-800 text-center">
                      <span className="text-[10px] uppercase font-bold text-neutral-400 block">Tactical Balance</span>
                      <span className="text-2xl font-black text-purple-400">{comparisonStartingXIResult.squadRatings.balance}</span>
                    </div>
                    <div className="bg-neutral-900 p-3 rounded-xl border border-neutral-800 text-center">
                      <span className="text-[10px] uppercase font-bold text-neutral-400 block">Bench Depth</span>
                      <span className="text-2xl font-black text-blue-400">{comparisonStartingXIResult.squadRatings.depth}</span>
                    </div>
                    <div className="bg-neutral-900 p-3 rounded-xl border border-neutral-800 text-center">
                      <span className="text-[10px] uppercase font-bold text-neutral-400 block">Tactical Fit</span>
                      <span className="text-2xl font-black text-emerald-400">{comparisonStartingXIResult.squadRatings.tacticalSuitability}</span>
                    </div>
                  </div>

                  <p className="text-xs text-neutral-400 leading-relaxed bg-neutral-900/60 p-3 rounded-xl border border-neutral-800">
                    {comparisonStartingXIResult.squadRatings.ratingsRationale}
                  </p>
                </div>
              </div>
            )}

          </div>
        )}

        {/* Modal Footer Bar */}
        <div className="flex items-center justify-between pt-3 border-t border-neutral-800 shrink-0">
          <div className="flex items-center gap-3">
            {viewMode === 'startingXI' ? (
              <button
                type="button"
                onClick={() => setViewMode('battles')}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Return to Duels</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setViewMode('startingXI')}
                className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-emerald-400 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>Show Recommended Starting XI</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-xs transition-all shadow-md cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
