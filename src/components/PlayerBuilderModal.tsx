import React, { useState } from 'react';
import { PlayerData } from '../types.ts';
import { Zap, Sparkles, Check, ArrowRight, ShieldAlert, BookOpen, Layers } from 'lucide-react';

interface PlayerBuilderModalProps {
  player: PlayerData;
  onClose: () => void;
  tacticalPlaystyle?: string;
}

export const PlayerBuilderModal: React.FC<PlayerBuilderModalProps> = ({
  player,
  onClose,
  tacticalPlaystyle = 'Quick Counter'
}) => {
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<any | null>(null);

  React.useEffect(() => {
    const fetchPlan = async () => {
      setLoading(true);
      try {
        const resp = await fetch('/api/player-builder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ player, tacticalPlaystyle })
        });
        const data = await resp.json();
        if (data.builderPlan) {
          setPlan(data.builderPlan);
        }
      } catch (err) {
        console.warn('Player builder error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPlan();
  }, [player, tacticalPlaystyle]);

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in-95">
        
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-4 border-b border-neutral-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                <Zap className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-black text-white">
                AI Player Builder & Progression
              </h2>
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              "How should I develop <strong>{player.name}</strong> for {tacticalPlaystyle}?"
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 text-sm"
          >
            ✕
          </button>
        </div>

        {/* Player Snapshot Card */}
        <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-black text-sm border border-emerald-500/20">
              {player.position}
            </div>
            <div>
              <h3 className="font-bold text-white text-base">{player.name}</h3>
              <span className="text-xs text-neutral-400">{player.playstyle || 'Versatile'} · {player.playerType || 'Card'}</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black text-emerald-400 leading-none">{player.rating}</span>
            <span className="block text-[10px] text-neutral-500 uppercase font-bold">Overall</span>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin mx-auto" />
            <p className="text-xs text-neutral-400">Computing optimal point progression and skill additions...</p>
          </div>
        ) : plan ? (
          <div className="space-y-5 text-xs sm:text-sm">
            
            {/* Level Training Recommendation */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                1. Level Training Target
              </span>
              <p className="text-neutral-200">
                Max level recommendation: <strong>Level {plan.levelTraining?.recommendedLevels}</strong> ({plan.levelTraining?.estimatedExpRequired}).
              </p>
              <p className="text-neutral-400 text-xs">{plan.levelTraining?.keyTargetMilestones}</p>
            </div>

            {/* Progression Allocation Breakdown */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 block">
                2. Player Progression Points Allocation
              </span>
              <div className="space-y-2">
                {plan.playerProgression?.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-neutral-900 border border-neutral-800/80">
                    <div className="space-y-0.5">
                      <span className="font-bold text-white text-xs block">{item.attributeGroup}</span>
                      <span className="text-[11px] text-neutral-400">{item.rationale}</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-300 font-black text-xs">
                      +{item.points} pts
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Skills Training */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 block">
                3. Essential Skills to Train (Skill Programs)
              </span>
              <div className="space-y-1.5">
                {plan.skillsToTeach?.map((s: any, idx: number) => (
                  <div key={idx} className="flex items-start gap-2 text-xs">
                    <span className="text-emerald-400 font-bold shrink-0">✓</span>
                    <span className="text-white font-bold">{s.skill}:</span>
                    <span className="text-neutral-400">{s.why}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tactical Advice */}
            <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 leading-relaxed">
              <span className="font-bold text-emerald-400 block mb-1">In-Match Deployment Directive:</span>
              {plan.tacticalAdvice}
            </div>

          </div>
        ) : null}

        <div className="pt-3 border-t border-neutral-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs"
          >
            Close Plan
          </button>
        </div>

      </div>
    </div>
  );
};
