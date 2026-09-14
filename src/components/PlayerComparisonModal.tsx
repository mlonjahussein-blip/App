import React, { useState, useMemo } from 'react';
import { PlayerData } from '../types.ts';
import { Award, Zap, ShieldCheck, Users, ArrowRightLeft, Check, Sparkles, ChevronRight, ChevronLeft, SlidersHorizontal } from 'lucide-react';
import { 
  ComparisonBattle, 
  detectAllSquadComparisons, 
  generateTacticalComparisonVerdict,
  isPlayerStarter 
} from '../lib/playerComparison.ts';

interface PlayerComparisonModalProps {
  playerA?: PlayerData;
  playerB?: PlayerData;
  allPlayers?: PlayerData[];
  onClose: () => void;
  tacticalPlaystyle?: string;
  formation?: string;
}

export const PlayerComparisonModal: React.FC<PlayerComparisonModalProps> = ({
  playerA,
  playerB,
  allPlayers = [],
  onClose,
  tacticalPlaystyle = 'Quick Counter',
  formation = '4-3-3'
}) => {
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

  // View mode: 'all' (if > 1) or specific battle id or 'custom'
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
  // If only 1 battle exists, we strictly show that single result (no multi-tab toggle)
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

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-4xl w-full p-5 sm:p-7 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 my-auto max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-800 shrink-0">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                <Award className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
                Squad Head-to-Head Comparisons
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                {tacticalPlaystyle} • {formation}
              </span>
              {detectedBattles.length > 0 && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-neutral-800 text-neutral-300 font-semibold">
                  {detectedBattles.length} {detectedBattles.length === 1 ? 'Comparison' : 'Battles Identified'}
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              {isSingleComparison
                ? `1 positional comparison evaluated for starting suitability in ${tacticalPlaystyle}.`
                : `Comprehensive tactical comparisons between Starting XI players and Substitutes, position competitors, and rotational depth.`}
            </p>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="self-end sm:self-auto p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Multi-Comparison Navigation Bar (rendered ONLY when there are multiple comparisons) */}
        {!isSingleComparison && (
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
                  <strong>{samePositionCount}</strong> Same-Position Duels (LB & LB, CB & CB)
                </span>
              </div>
              <span className="text-neutral-500 italic hidden sm:inline">
                Click any battle tab to focus or view all simultaneously
              </span>
            </div>

            {/* Battle Selection Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-neutral-700">
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

              {detectedBattles.map((battle, bIdx) => {
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
        )}

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

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-neutral-800 shrink-0">
          <span className="text-xs text-neutral-500 hidden sm:inline">
            Showing {activeBattlesToRender.length} of {detectedBattles.length} detected position comparisons
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-xs transition-all shadow-md cursor-pointer ml-auto"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
