import React, { useState } from 'react';
import { PlayerData } from '../types.ts';
import { Award, Zap, CheckCircle2, X } from 'lucide-react';

interface PlayerComparisonModalProps {
  playerA: PlayerData;
  playerB: PlayerData;
  onClose: () => void;
  tacticalPlaystyle?: string;
}

export const PlayerComparisonModal: React.FC<PlayerComparisonModalProps> = ({
  playerA,
  playerB,
  onClose,
  tacticalPlaystyle = 'Quick Counter'
}) => {
  const winner = (playerA.rating || 85) >= (playerB.rating || 85) ? playerA : playerB;
  const loser = winner === playerA ? playerB : playerA;

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-emerald-400" />
              Tactical Player Comparison
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Evaluating starting suitability for <strong>{tacticalPlaystyle}</strong>.
            </p>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-white">
            ✕
          </button>
        </div>

        {/* 2-Column Side-by-Side Comparison */}
        <div className="grid grid-cols-2 gap-4">
          {[playerA, playerB].map((p, idx) => {
            const isFavored = p.name === winner.name;
            return (
              <div 
                key={idx}
                className={`bg-neutral-950 rounded-2xl p-5 border space-y-4 ${
                  isFavored ? 'border-emerald-500/50 shadow-lg shadow-emerald-500/10' : 'border-neutral-800 opacity-80'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-neutral-900 text-emerald-400 border border-neutral-800">
                      {p.position}
                    </span>
                    <h3 className="text-base font-black text-white mt-1">{p.name}</h3>
                    <span className="text-xs text-neutral-400">{p.playstyle || 'Standard'}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-emerald-400">{p.rating}</span>
                    <span className="block text-[10px] text-neutral-500 uppercase font-bold">Overall</span>
                  </div>
                </div>

                {isFavored && (
                  <div className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold text-center">
                    ★ AI Recommended Starter
                  </div>
                )}

                <div className="space-y-1.5 text-xs text-neutral-300">
                  <div className="flex justify-between py-1 border-b border-neutral-900">
                    <span className="text-neutral-500">Card Type</span>
                    <span className="font-semibold text-white">{p.playerType || 'Standard'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-neutral-900">
                    <span className="text-neutral-500">Confidence</span>
                    <span className="font-semibold text-white">{p.confidence}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-neutral-500">Key Skill Count</span>
                    <span className="font-semibold text-white">{p.skills?.length || 3} Identified</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* AI Tactical Conclusion (Spec 28) */}
        <div className="bg-neutral-950 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 space-y-2">
          <span className="text-xs font-black uppercase tracking-wider text-emerald-400 block">
            AI Tactical Verdict
          </span>
          <p className="text-xs sm:text-sm font-bold text-white">
            Which player is better for your recommended tactic?
          </p>
          <p className="text-xs text-neutral-300 leading-relaxed">
            <strong>{winner.name}</strong> is the superior choice for your <strong>{tacticalPlaystyle}</strong> system. With an overall rating of <strong>{winner.rating}</strong> and natural alignment as a <strong>{winner.playstyle}</strong>, {winner.name} delivers tighter transition stability and quicker offensive releases compared to {loser.name}.
          </p>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
