import React, { useState, useEffect } from 'react';
import { PlayerData } from '../types.ts';
import { UserCheck, HelpCircle, Shield, Zap, Sparkles, Award } from 'lucide-react';

interface BestXIProps {
  formation: string;
  players: (PlayerData & { pitchX: number; pitchY: number; selectionReason: string })[];
  onPlayerClick?: (player: PlayerData) => void;
}

export const BestXIView: React.FC<BestXIProps> = ({ formation, players, onPlayerClick }) => {
  const [filterMode, setFilterMode] = useState<'overall' | 'playstyle' | 'formation'>('overall');
  const [selectedPlayer, setSelectedPlayer] = useState<(PlayerData & { selectionReason: string }) | null>(players[0] || null);

  useEffect(() => {
    if (selectedPlayer) {
      const match = players.find(p => p.id === selectedPlayer.id || p.name === selectedPlayer.name);
      if (match) {
        setSelectedPlayer(match);
      } else {
        setSelectedPlayer(players[0] || null);
      }
    } else {
      setSelectedPlayer(players[0] || null);
    }
  }, [players]);

  return (
    <div id="best-xi-section" className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-6">
      
      {/* Header with Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
              <Award className="w-5 h-5" />
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Recommended Starting XI
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500 text-neutral-950">
              {formation}
            </span>
          </div>
          <p className="text-sm text-neutral-400 mt-1">
            Carefully selected based on tactical playstyle chemistry, physical profile, and optimal positional synergy.
          </p>
        </div>

        {/* Filter / View Switcher */}
        <div className="flex bg-neutral-950 p-1 rounded-xl border border-neutral-800">
          <button
            onClick={() => setFilterMode('overall')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterMode === 'overall'
                ? 'bg-neutral-800 text-emerald-400 font-bold shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Best Overall
          </button>
          <button
            onClick={() => setFilterMode('playstyle')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterMode === 'playstyle'
                ? 'bg-neutral-800 text-emerald-400 font-bold shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            By Playstyle Fit
          </button>
          <button
            onClick={() => setFilterMode('formation')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterMode === 'formation'
                ? 'bg-neutral-800 text-emerald-400 font-bold shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            By Formation
          </button>
        </div>
      </div>

      {/* Grid: Pitch on Left, Selected Player Intel on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
        
        {/* Pitch Display */}
        <div className="lg:col-span-7 flex justify-center">
          <div className="relative w-full max-w-[420px] aspect-[68/100] rounded-xl overflow-hidden shadow-2xl border-2 border-emerald-900 bg-gradient-to-b from-[#11311b] via-[#0d2816] to-[#11311b]">
            
            {/* Pitch Lines */}
            <div className="absolute inset-0 pointer-events-none opacity-30">
              <div className="absolute inset-3 border-2 border-white" />
              <div className="absolute top-1/2 left-3 right-3 h-0.5 bg-white -translate-y-1/2" />
              <div className="absolute top-1/2 left-1/2 w-24 h-24 -translate-x-1/2 -translate-y-1/2 border-2 border-white rounded-full" />
              {/* Penalty Boxes */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-48 h-20 border-2 border-t-0 border-white" />
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-48 h-20 border-2 border-b-0 border-white" />
            </div>

            {/* Players on pitch */}
            {players.map((player) => {
              const isSelected = selectedPlayer?.name === player.name;
              return (
                <button
                  key={player.id}
                  onClick={() => {
                    setSelectedPlayer(player);
                    if (onPlayerClick) onPlayerClick(player);
                  }}
                  style={{
                    left: `${player.pitchX}%`,
                    top: `${player.pitchY}%`,
                    transform: 'translate(-50%, -50%)'
                  }}
                  className={`absolute z-20 flex flex-col items-center group focus:outline-none transition-all duration-200 cursor-pointer ${
                    isSelected ? 'scale-110' : 'hover:scale-105'
                  }`}
                >
                  {/* Rating / Position Badge */}
                  <div 
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex flex-col items-center justify-center font-black shadow-xl transition-all border-2 ${
                      isSelected
                        ? 'bg-amber-400 text-neutral-950 border-white ring-4 ring-amber-400/40'
                        : 'bg-neutral-950/90 text-white border-emerald-400'
                    }`}
                  >
                    <span className="text-[11px] leading-none text-emerald-400 font-extrabold">
                      {player.rating}
                    </span>
                    <span className="text-[9px] leading-tight font-black uppercase">
                      {player.position}
                    </span>
                  </div>

                  {/* Player Name Tag */}
                  <div className="mt-1 px-1.5 py-0.5 rounded bg-neutral-950/90 border border-neutral-700/80 shadow-md">
                    <p className="text-[10px] sm:text-xs font-bold text-white truncate max-w-[80px]">
                      {player.name.split(' ').pop()}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Player Details & "Why Selected" Panel */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          {selectedPlayer ? (
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5 flex-1 flex flex-col justify-between shadow-xl">
              <div>
                <div className="flex items-start justify-between pb-4 border-b border-neutral-800">
                  <div>
                    <span className="px-2 py-0.5 rounded text-xs font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {selectedPlayer.position} · {selectedPlayer.playstyle || 'Versatile'}
                    </span>
                    <h3 className="text-xl font-black text-white mt-1.5">{selectedPlayer.name}</h3>
                    <p className="text-xs text-neutral-400 font-medium">
                      Card Type: <span className="text-neutral-200 font-semibold">{selectedPlayer.playerType || 'Standard'}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-black text-emerald-400 leading-none">
                      {selectedPlayer.rating}
                    </span>
                    <span className="block text-[10px] text-neutral-400 uppercase font-bold tracking-wider">
                      Overall
                    </span>
                  </div>
                </div>

                {/* AI Confidence Status */}
                <div className="my-4 flex items-center justify-between p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 text-xs">
                  <span className="text-neutral-400 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-cyan-400" />
                    Identity Confidence:
                  </span>
                  <span className={`font-bold px-2 py-0.5 rounded ${
                    selectedPlayer.userConfirmed || selectedPlayer.identityStatus === 'user_confirmed' || selectedPlayer.identityStatus === 'user_corrected'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      : (selectedPlayer.confidenceScore && selectedPlayer.confidenceScore >= 85) || selectedPlayer.confidence === 'High'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : selectedPlayer.confidence === 'Medium' || (selectedPlayer.confidenceScore && selectedPlayer.confidenceScore >= 60)
                      ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}>
                    {selectedPlayer.userConfirmed
                      ? '✓ User Confirmed'
                      : selectedPlayer.confidenceScore
                      ? `${selectedPlayer.confidenceScore}% Confirmed`
                      : selectedPlayer.confidence}
                  </span>
                </div>

                {/* Quick Correct / Change Action */}
                {onPlayerClick && (
                  <button
                    onClick={() => onPlayerClick(selectedPlayer)}
                    className="w-full mb-3 py-1.5 px-3 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-cyan-400 hover:text-cyan-300 border border-neutral-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>✎ Correct / Verify this Player</span>
                  </button>
                )}

                {/* Why this player was selected */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Why this player was selected
                  </h4>
                  <div className="p-3.5 rounded-xl bg-neutral-900/90 border border-neutral-800 text-xs text-neutral-200 leading-relaxed">
                    {selectedPlayer.selectionReason || selectedPlayer.roleExplanation || 'Selected as the most balanced option based on defensive work rate, physical profile, and playstyle chemistry.'}
                  </div>
                </div>

                {/* Skills Preview */}
                {selectedPlayer.skills && selectedPlayer.skills.length > 0 && (
                  <div className="mt-4">
                    <h5 className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-2">
                      Key Skills Identified
                    </h5>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedPlayer.skills.map((skill, sIdx) => (
                        <span key={sIdx} className="text-xs px-2 py-1 rounded-md bg-neutral-900 text-neutral-300 border border-neutral-800">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-neutral-800/80 text-[11px] text-neutral-400 flex items-center justify-between">
                <span>Part of recommended XI</span>
                <span className="text-emerald-400 font-semibold">Active in tactical plan</span>
              </div>
            </div>
          ) : (
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-6 text-center text-neutral-400 text-xs flex items-center justify-center">
              Click any player on the pitch to inspect detailed selection rationale.
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
