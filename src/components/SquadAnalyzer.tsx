import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Info, 
  Sliders,
  X,
  CreditCard,
  Zap,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { 
  AnalysisResult, 
  TypedPlayerInput, 
  ManagerInputDetails, 
  FluidFormationSettings, 
  LinkUpPlaySettings,
  UserEntitlements
} from '../types.ts';
import { ManualPlayerInput } from './ManualPlayerInput.tsx';
import { useAuth } from '../lib/AuthContext.tsx';

// All official eFootball formations
export const EFOOTBALL_FORMATIONS = [
  { value: 'Auto-Detect / Balanced', label: 'Auto-Detect / AI Optimal Recommendation', category: 'General' },
  { value: 'Custom Gameplan', label: 'Custom Gameplan', category: 'General' },
  
  // 4-Back Formations
  { value: '4-2-1-3', label: '4-2-1-3 (Double Pivot + Central AMF + Wingers)', category: '4-Back' },
  { value: '4-1-4-1', label: '4-1-4-1 (Anchor DMF + Flat 4 Midfield + Lone CF)', category: '4-Back' },
  { value: '4-1-2-3', label: '4-1-2-3 (Single DMF + Twin AMFs + Front 3)', category: '4-Back' },
  { value: '4-4-2', label: '4-4-2 (Classic Flat 4-4-2 / Twin CFs & Wide Midfielders)', category: '4-Back' },
  { value: '4-3-3', label: '4-3-3 (Standard 3 Midfielders + 3 Forwards)', category: '4-Back' },
  { value: '4-3-2-1', label: '4-3-2-1 (Christmas Tree / 3 Midfielders + 2 AMFs + 1 CF)', category: '4-Back' },
  { value: '4-3-1-2', label: '4-3-1-2 (Narrow Diamond / Central Overload)', category: '4-Back' },
  { value: '4-2-3-1', label: '4-2-3-1 (Single Striker / Wide Midfield + Double Pivot)', category: '4-Back' },
  { value: '4-2-2-2', label: '4-2-2-2 (Double AMF / Twin Strikers)', category: '4-Back' },

  // 3-Back Formations
  { value: '3-4-3', label: '3-4-3 (3 CBs + Wide Midfield 4 + Front 3)', category: '3-Back' },
  { value: '3-2-4-1', label: '3-2-4-1 (3 CBs + Double Pivot + 4 Midfielders + 1 CF)', category: '3-Back' },
  { value: '3-2-3-2', label: '3-2-3-2 (3 CBs + Double Pivot + AMF + 2 CFs)', category: '3-Back' },
  { value: '3-1-4-2', label: '3-1-4-2 (3 CBs + 1 DMF + 4 Midfielders + 2 CFs)', category: '3-Back' },

  // 5-Back Formations
  { value: '5-3-2', label: '5-3-2 (5 Defenders + 3 Central Midfielders + 2 CFs)', category: '5-Back' },
  { value: '5-2-2-1', label: '5-2-2-1 (5 Defenders + Double Pivot + 2 AMFs + 1 CF)', category: '5-Back' },
  { value: '5-2-1-2', label: '5-2-1-2 (5 Defenders + Double Pivot + 1 AMF + 2 CFs)', category: '5-Back' },
];

interface AnalyzerProps {
  onAnalysisCompleted: (result: AnalysisResult) => void;
  onNavigateToPayments?: () => void;
}

export const SquadAnalyzer: React.FC<AnalyzerProps> = ({ onAnalysisCompleted, onNavigateToPayments }) => {
  const { user } = useAuth();
  const [typedPlayers, setTypedPlayers] = useState<TypedPlayerInput[]>([]);
  const [managerDetails, setManagerDetails] = useState<ManagerInputDetails>({
    name: '',
    nationality: '',
    team: '',
    playstyleProficiencies: {
      possessionGame: 85,
      quickCounter: 87,
      longBallCounter: 85,
      outWide: 80,
      longBall: 75,
      overload: 86
    }
  });
  const [preferredPlaystyle, setPreferredPlaystyle] = useState('Quick Counter');
  const [preferredFormation, setPreferredFormation] = useState('4-2-1-3');
  const [customGameplan, setCustomGameplan] = useState('');
  const [tacticalPreference, setTacticalPreference] = useState('');

  // Fluid Formations state
  const [fluidFormations, setFluidFormations] = useState<FluidFormationSettings>({
    enabled: false,
    kickoffFormation: '4-2-1-3',
    inPossessionFormation: '3-2-4-1',
    outOfPossessionFormation: '5-3-2'
  });

  // Linked-Up Play Style state
  const [linkUpPlay, setLinkUpPlay] = useState<LinkUpPlaySettings>({
    enabled: false,
    fromPlayer: '',
    toPlayer: '',
    linkPattern: 'Give & Go (1-2 Quick Return Pass)',
    coachInstructionNote: ''
  });

  // Analysis State & Progress
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Payment Entitlements
  const [entitlements, setEntitlements] = useState<UserEntitlements | null>(null);

  const fetchEntitlements = async () => {
    const uid = user?.uid || 'guest';
    try {
      const res = await fetch(`/api/user/entitlements?userId=${encodeURIComponent(uid)}`);
      if (res.ok) {
        const data: UserEntitlements = await res.json();
        setEntitlements(data);
      }
    } catch (err) {
      console.warn('Could not fetch entitlements:', err);
    }
  };

  useEffect(() => {
    fetchEntitlements();
  }, [user?.uid]);

  const analysisSteps = [
    'Stage 1: Validating Starting XI and substitute player configurations...',
    'Stage 2: Evaluating manager playstyle proficiencies and team chemistry...',
    'Stage 3: Cross-verifying player positions, OVR ratings and playstyles...',
    'Stage 4: Computing tactical synergy, balance and tactical weaknesses...',
    'Stage 5: Assembling verified Best XI, action plan & 2D tactical simulation...'
  ];

  const handleStartAnalysis = async () => {
    if (typedPlayers.length === 0) {
      setErrorMessage('Please enter at least one squad player (Starting XI recommended) before analyzing your squad.');
      return;
    }

    // Backend Source of Truth pre-check: If user has neither free quota nor paid credits, navigate to Payment Architecture & History
    if (entitlements && !entitlements.canAnalyze) {
      if (onNavigateToPayments) {
        onNavigateToPayments();
      }
      return;
    }

    setIsAnalyzing(true);
    setErrorMessage(null);
    setCurrentStepIndex(0);

    // Step progress ticker
    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev < analysisSteps.length - 1) return prev + 1;
        return prev;
      });
    }, 1200);

    try {
      const finalFormation = preferredFormation === 'Custom Gameplan' 
        ? `Custom Gameplan: ${customGameplan.trim() || 'Custom Formation'}` 
        : preferredFormation;

      const payload = {
        userId: user?.uid || 'guest',
        images: [],
        typedPlayers: typedPlayers.map(p => ({
          id: p.id,
          name: p.name,
          position: p.position,
          rating: p.rating,
          cardType: p.cardType,
          playstyle: p.playstyle,
          club: p.club,
          nationality: p.nationality,
          skills: p.skills
        })),
        managerDetails: managerDetails.name.trim() ? managerDetails : undefined,
        preferredPlaystyle,
        preferredFormation: finalFormation,
        fluidFormations: fluidFormations.enabled ? fluidFormations : undefined,
        linkUpPlay: linkUpPlay.enabled ? linkUpPlay : undefined,
        tacticalPreference,
        hasCoachScreenshot: false
      };

      const resp = await fetch('/api/analyze-squad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      clearInterval(interval);

      if (resp.status === 402) {
        setIsAnalyzing(false);
        await fetchEntitlements();
        if (onNavigateToPayments) {
          onNavigateToPayments();
        }
        return;
      }

      if (!resp.ok) {
        let errMessage = '';
        try {
          const errJson = await resp.json();
          if (errJson.paymentRequired) {
            setIsAnalyzing(false);
            await fetchEntitlements();
            if (onNavigateToPayments) {
              onNavigateToPayments();
            }
            return;
          }
          errMessage = errJson.error || errJson.message || '';
        } catch {
          errMessage = await resp.text().catch(() => '');
        }
        throw new Error(errMessage || `Server responded with status ${resp.status}`);
      }

      const result: AnalysisResult = await resp.json();
      setIsAnalyzing(false);
      // Refresh entitlement state so counter updates in real time
      fetchEntitlements();
      onAnalysisCompleted(result);
    } catch (err: any) {
      clearInterval(interval);
      console.error('Squad analysis error:', err);
      setErrorMessage(err?.message || 'Failed to analyze squad. Please check your connection and try again.');
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-neutral-900 via-neutral-900 to-emerald-950/40 border border-neutral-800 rounded-2xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              eFootball 2027 AI Squad Engine
            </div>

            {/* Entitlement Quota Pill */}
            {entitlements?.weeklyFreeAnalysisAvailable ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                1 Free Analysis Available This Week
              </div>
            ) : (entitlements?.paidAnalysisCredits || 0) > 0 ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-bold">
                <Zap className="w-3 h-3 text-cyan-400" />
                {entitlements?.paidAnalysisCredits} Paid Analysis Credit{(entitlements?.paidAnalysisCredits || 0) > 1 ? 's' : ''} Available
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold">
                <CreditCard className="w-3 h-3 text-amber-400" />
                Weekly Free Analysis Used
              </div>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            AI Squad Analyzer & Tactical Advisor
          </h1>
          <p className="text-sm text-neutral-400 max-w-2xl">
            Input your squad players and manager details manually. Our AI engine computes chemistry, tactical suitability, Best XI formation, and match-winning instructions.
          </p>
        </div>

        <button
          type="button"
          onClick={handleStartAnalysis}
          disabled={isAnalyzing || typedPlayers.length === 0}
          className={`px-6 py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] ${
            isAnalyzing || typedPlayers.length === 0
              ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed shadow-none'
              : entitlements && !entitlements.canAnalyze
              ? 'bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-amber-500/20 cursor-pointer'
              : 'bg-emerald-500 hover:bg-emerald-400 text-neutral-950 shadow-emerald-500/20 cursor-pointer'
          }`}
        >
          {isAnalyzing ? (
            <>
              <span className="w-4 h-4 rounded-full border-2 border-neutral-950 border-t-transparent animate-spin" />
              Analyzing Squad...
            </>
          ) : entitlements && !entitlements.canAnalyze ? (
            <>
              <CreditCard className="w-4 h-4" />
              Buy Credits in Payment & History
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Analyze Squad ({typedPlayers.length} Players)
            </>
          )}
        </button>
      </div>

      {/* Out of credit guidance card */}
      {entitlements && !entitlements.canAnalyze && (
        <div className="bg-neutral-900/90 border border-amber-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
          <div className="flex items-start sm:items-center gap-3">
            <span className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 shrink-0 mt-0.5 sm:mt-0">
              <CreditCard className="w-5 h-5" />
            </span>
            <div>
              <h4 className="text-sm font-bold text-white">Free Weekly Analysis Used</h4>
              <p className="text-xs text-neutral-400 mt-0.5">
                You have reached your 1 free analysis for this week. Visit Payment Architecture & History to purchase additional credits.
              </p>
            </div>
          </div>
          {onNavigateToPayments && (
            <button
              type="button"
              onClick={onNavigateToPayments}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs flex items-center gap-2 transition-all self-start sm:self-auto cursor-pointer shadow-md shadow-emerald-500/20 shrink-0"
            >
              <span>Payment Architecture & History</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div className="bg-rose-950/40 border border-rose-800/80 rounded-xl p-4 text-rose-300 text-sm flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2.5">
            <X className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button 
            onClick={() => setErrorMessage(null)}
            className="text-rose-400 hover:text-white font-bold text-xs px-2 py-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Loading Progress State */}
      {isAnalyzing ? (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 sm:p-12 text-center space-y-6 shadow-2xl">
          <div className="inline-flex p-4 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse">
            <Sparkles className="w-10 h-10" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h2 className="text-xl sm:text-2xl font-black text-white">
              Analyzing Your Squad...
            </h2>
            <p className="text-xs text-neutral-400">
              Evaluating player positions, playstyles, chemistry proficiencies, and tactical balance.
            </p>
          </div>

          {/* Step Progress Checklist */}
          <div className="max-w-lg mx-auto bg-neutral-950 border border-neutral-800 rounded-xl p-5 text-left space-y-3">
            {analysisSteps.map((stepText, idx) => {
              const isDone = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              return (
                <div key={idx} className="flex items-center gap-3 text-xs sm:text-sm">
                  {isDone ? (
                    <span className="w-5 h-5 rounded-full bg-emerald-500 text-neutral-950 flex items-center justify-center font-bold text-xs shrink-0">
                      ✓
                    </span>
                  ) : isCurrent ? (
                    <span className="w-5 h-5 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin shrink-0" />
                  ) : (
                    <span className="w-5 h-5 rounded-full bg-neutral-800 text-neutral-500 flex items-center justify-center font-semibold text-xs shrink-0">
                      {idx + 1}
                    </span>
                  )}
                  <span className={isCurrent ? 'font-bold text-emerald-400' : isDone ? 'text-neutral-300' : 'text-neutral-600'}>
                    {stepText}
                  </span>
                </div>
              );
            })}
          </div>

          <p className="text-[11px] text-neutral-500 italic">
            This typically takes 4 to 8 seconds.
          </p>
        </div>
      ) : (
        /* Enter Squad Players & Configuration Form */
        <div className="space-y-8">
          
          {/* Enter Squad Players Component */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl space-y-6">
            <ManualPlayerInput
              typedPlayers={typedPlayers}
              onChange={setTypedPlayers}
              managerDetails={managerDetails}
              onManagerChange={setManagerDetails}
            />
          </div>

          {/* Tactical Preferences & Advanced System Controls */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-cyan-400" />
                <h2 className="text-lg font-bold text-white">
                  Tactical Preferences & Gameplan Setup
                </h2>
              </div>
              <span className="text-xs text-neutral-400 font-medium">
                eFootball 2027 Supported
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Preferred Playstyle */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                    Preferred Playstyle
                  </label>
                  {preferredPlaystyle === 'Overload' && (
                    <span className="text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-1.5 py-0.2 rounded font-bold">
                      2027 New
                    </span>
                  )}
                </div>
                <select
                  value={preferredPlaystyle}
                  onChange={(e) => setPreferredPlaystyle(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Quick Counter">Quick Counter (Gegenpress & fast vertical breakout)</option>
                  <option value="Possession Game">Possession Game (Patient short passing build-up)</option>
                  <option value="Long Ball Counter">Long Ball Counter (Deep low block & direct outlet balls)</option>
                  <option value="Out Wide">Out Wide (Wing overlaps & high-percentage crosses)</option>
                  <option value="Long Ball">Long Ball (Target man flick-ons & second balls)</option>
                  <option value="Overload">Overload (eFootball 2027 • Half-space channel overload & numerical superiority)</option>
                </select>
              </div>

              {/* Preferred Formation */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                  Formation Preference
                </label>
                <select
                  value={preferredFormation}
                  onChange={(e) => setPreferredFormation(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  {EFOOTBALL_FORMATIONS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>

                {/* Custom Gameplan Input Area */}
                {preferredFormation === 'Custom Gameplan' && (
                  <div className="mt-3 animate-fade-in">
                    <label className="text-[11px] font-bold text-emerald-400 block mb-1">
                      Enter Your Custom Gameplan / Shape:
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 3-1-3-3 Asymmetrical Build-up with Floating AMF"
                      value={customGameplan}
                      onChange={(e) => setCustomGameplan(e.target.value)}
                      className="w-full bg-neutral-950 border border-emerald-500/60 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                )}
              </div>

              {/* Fluid Formations Toggle & Configuration Block */}
              <div className="md:col-span-2 bg-neutral-950/70 border border-neutral-800 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                      <Sliders className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">Fluid Formations</span>
                        <span className="text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-full font-bold">
                          In-Game Dynamic Shape
                        </span>
                      </div>
                      <p className="text-xs text-neutral-400">
                        Automatically transform formation shape across match phases (Kick-Off, Attacking in Possession, Defending out of Possession).
                      </p>
                    </div>
                  </div>
                  
                  {/* Toggle Switch */}
                  <button
                    type="button"
                    onClick={() => setFluidFormations(prev => ({ ...prev, enabled: !prev.enabled }))}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      fluidFormations.enabled ? 'bg-cyan-500' : 'bg-neutral-800'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        fluidFormations.enabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {fluidFormations.enabled && (
                  <div className="pt-3 border-t border-neutral-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-fade-in">
                    <div>
                      <label className="text-[11px] font-bold text-cyan-400 block mb-1">
                        1. When Kick-Off Formation
                      </label>
                      <select
                        value={fluidFormations.kickoffFormation || '4-2-1-3'}
                        onChange={(e) => setFluidFormations(prev => ({ ...prev, kickoffFormation: e.target.value }))}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                      >
                        {EFOOTBALL_FORMATIONS.filter(f => f.value !== 'Auto-Detect / Balanced' && f.value !== 'Custom Gameplan').map(f => (
                          <option key={f.value} value={f.value}>{f.label.split(' ')[0]}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-cyan-400 block mb-1">
                        2. In Possession (Attacking)
                      </label>
                      <select
                        value={fluidFormations.inPossessionFormation || '3-2-4-1'}
                        onChange={(e) => setFluidFormations(prev => ({ ...prev, inPossessionFormation: e.target.value }))}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                      >
                        {EFOOTBALL_FORMATIONS.filter(f => f.value !== 'Auto-Detect / Balanced' && f.value !== 'Custom Gameplan').map(f => (
                          <option key={f.value} value={f.value}>{f.label.split(' ')[0]}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-cyan-400 block mb-1">
                        3. Out of Possession (Defending)
                      </label>
                      <select
                        value={fluidFormations.outOfPossessionFormation || '5-3-2'}
                        onChange={(e) => setFluidFormations(prev => ({ ...prev, outOfPossessionFormation: e.target.value }))}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                      >
                        {EFOOTBALL_FORMATIONS.filter(f => f.value !== 'Auto-Detect / Balanced' && f.value !== 'Custom Gameplan').map(f => (
                          <option key={f.value} value={f.value}>{f.label.split(' ')[0]}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Linked-Up Play Style Configuration Block */}
              <div className="md:col-span-2 bg-neutral-950/70 border border-neutral-800 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">Linked-Up Play Style</span>
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                          Synergy Combo
                        </span>
                      </div>
                      <p className="text-xs text-neutral-400">
                        Designate specific passing triangles or combination play between two key players (e.g. AMF to CF Give & Go).
                      </p>
                    </div>
                  </div>
                  
                  {/* Toggle Switch */}
                  <button
                    type="button"
                    onClick={() => setLinkUpPlay(prev => ({ ...prev, enabled: !prev.enabled }))}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      linkUpPlay.enabled ? 'bg-emerald-500' : 'bg-neutral-800'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        linkUpPlay.enabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {linkUpPlay.enabled && (
                  <div className="pt-3 border-t border-neutral-800/80 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fade-in">
                    <div>
                      <label className="text-[11px] font-bold text-emerald-400 block mb-1">
                        Player A (Initiator)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Wirtz or De Bruyne"
                        value={linkUpPlay.fromPlayer}
                        onChange={(e) => setLinkUpPlay(prev => ({ ...prev, fromPlayer: e.target.value }))}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-emerald-400 block mb-1">
                        Player B (Receiver / Target)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Mbappé or Haaland"
                        value={linkUpPlay.toPlayer}
                        onChange={(e) => setLinkUpPlay(prev => ({ ...prev, toPlayer: e.target.value }))}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-bold text-emerald-400 block mb-1">
                        Link Pattern & Coach Instruction
                      </label>
                      <select
                        value={linkUpPlay.linkPattern}
                        onChange={(e) => setLinkUpPlay(prev => ({ ...prev, linkPattern: e.target.value }))}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="Give & Go (1-2 Quick Return Pass)">Give & Go (1-2 Quick Return Pass)</option>
                        <option value="Overlapping Fullback & Winger Combination">Overlapping Fullback & Winger Combination</option>
                        <option value="Third-Man Run through Half-Space">Third-Man Run through Half-Space</option>
                        <option value="Target Man Hold-Up & Runner Off-Ball">Target Man Hold-Up & Runner Off-Ball</option>
                        <option value="Inverted Winger Cut Inside & AMF Late Surge">Inverted Winger Cut Inside & AMF Late Surge</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Bottom Analysis Action Bar */}
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleStartAnalysis}
              disabled={isAnalyzing || typedPlayers.length === 0}
              className={`px-8 py-4 rounded-xl font-black text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] ${
                isAnalyzing || typedPlayers.length === 0
                  ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed shadow-none'
                  : entitlements && !entitlements.canAnalyze
                  ? 'bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-amber-500/30 cursor-pointer'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-neutral-950 shadow-emerald-500/30 cursor-pointer'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <span className="w-5 h-5 rounded-full border-2 border-neutral-950 border-t-transparent animate-spin" />
                  <span>Analyzing Squad...</span>
                </>
              ) : entitlements && !entitlements.canAnalyze ? (
                <>
                  <CreditCard className="w-5 h-5" />
                  <span>Buy Credits in Payment Architecture & History</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Analyze Squad & Generate Match Strategy ({typedPlayers.length} Players)</span>
                </>
              )}
            </button>
          </div>

        </div>
      )}

    </div>
  );
};
