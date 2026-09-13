import React, { useState } from 'react';
import { 
  Sparkles, 
  AlertCircle, 
  Info, 
  Keyboard, 
  Zap, 
  Sliders,
  X
} from 'lucide-react';
import { AnalysisResult, TypedPlayerInput, ManagerInputDetails, FluidFormationSettings, LinkUpPlaySettings } from '../types.ts';
import { ManualPlayerInput } from './ManualPlayerInput.tsx';

// All official eFootball formations
export const EFOOTBALL_FORMATIONS = [
  { value: 'Auto-Detect / Balanced', label: 'Auto-Detect / AI Optimal Recommendation', category: 'General' },
  { value: 'Copy from Base Team', label: 'Copy from Base Team (Custom Gameplan Shape)', category: 'General' },
  
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
}

export const SquadAnalyzer: React.FC<AnalyzerProps> = ({ onAnalysisCompleted }) => {
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
      const payload = {
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
        preferredFormation,
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

      if (!resp.ok) {
        let errMessage = '';
        try {
          const errJson = await resp.json();
          errMessage = errJson.error || errJson.message || '';
        } catch {
          errMessage = await resp.text().catch(() => '');
        }
        throw new Error(errMessage || `Analysis service encountered an issue (Status ${resp.status}). Please try again.`);
      }

      const data = await resp.json();
      const analysisResult = data.analysis || (data.squadRatings || data.recommendedFormation ? data : null);
      if (analysisResult) {
        onAnalysisCompleted(analysisResult);
      } else {
        throw new Error('No analysis data was returned by the tactical server.');
      }
    } catch (err: any) {
      clearInterval(interval);
      setIsAnalyzing(false);
      let msg = err?.message || 'Failed to process squad analysis.';
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('Load failed')) {
        msg = 'Network connection interrupted. Please check your internet connection and try again.';
      }
      setErrorMessage(msg);
    }
  };

  return (
    <div id="analyzer-container" className="max-w-4xl mx-auto space-y-8 py-6">
      
      {/* Title */}
      <div>
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
            <Sparkles className="w-5 h-5" />
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            AI Squad Analyzer
          </h1>
        </div>
        <p className="text-sm text-neutral-400 mt-1">
          Enter your Starting XI, substitutes, and manager details for instant AI tactical evaluation and player optimization.
        </p>
      </div>

      {/* User Guidance Banner */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="flex items-start gap-3.5">
          <span className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0 mt-0.5">
            <Info className="w-5 h-5" />
          </span>
          <div className="space-y-2 text-sm text-neutral-300">
            <h2 className="text-base font-bold text-white tracking-tight">Enter Your Squad & Manager Details</h2>
            <p className="text-neutral-400 text-xs sm:text-sm">
              Configure your eFootball Starting XI, bench substitutes, formation, and manager proficiencies below to run comprehensive tactical analysis.
            </p>
            <div className="pt-1">
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                Tips for optimal analysis:
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-neutral-300">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  Add manager proficiency ratings for accurate chemistry scores.
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  Complete your Starting XI (11 players) for full tactical balance.
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  Add substitutes for bench depth and game-changer recommendations.
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  Specify playstyles and card types (e.g. Epic, Show Time, POTW).
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="bg-rose-950/60 border border-rose-800 rounded-xl p-4 flex items-start gap-3 text-rose-200 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">{errorMessage}</div>
          <button 
            onClick={() => setErrorMessage(null)}
            className="text-rose-400 hover:text-rose-200 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
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
                        {EFOOTBALL_FORMATIONS.filter(f => f.value !== 'Auto-Detect / Balanced').map(f => (
                          <option key={`kickoff-${f.value}`} value={f.value}>{f.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-emerald-400 block mb-1">
                        2. When in Possession (Attacking)
                      </label>
                      <select
                        value={fluidFormations.inPossessionFormation || '3-2-4-1'}
                        onChange={(e) => setFluidFormations(prev => ({ ...prev, inPossessionFormation: e.target.value }))}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                      >
                        {EFOOTBALL_FORMATIONS.filter(f => f.value !== 'Auto-Detect / Balanced').map(f => (
                          <option key={`inpos-${f.value}`} value={f.value}>{f.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-amber-400 block mb-1">
                        3. When out of Possession (Defending)
                      </label>
                      <select
                        value={fluidFormations.outOfPossessionFormation || '5-3-2'}
                        onChange={(e) => setFluidFormations(prev => ({ ...prev, outOfPossessionFormation: e.target.value }))}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      >
                        {EFOOTBALL_FORMATIONS.filter(f => f.value !== 'Auto-Detect / Balanced').map(f => (
                          <option key={`outpos-${f.value}`} value={f.value}>{f.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Linked-Up Play Style Toggle & Configuration Block */}
              <div className="md:col-span-2 bg-neutral-950/70 border border-neutral-800 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">Linked-Up Play Style</span>
                        <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-bold">
                          Coach Combination Link
                        </span>
                      </div>
                      <p className="text-xs text-neutral-400">
                        Specify player-to-player link-up movements and combinations based on your coach's special tactical description.
                      </p>
                    </div>
                  </div>
                  
                  {/* Toggle Switch */}
                  <button
                    type="button"
                    onClick={() => setLinkUpPlay(prev => ({ ...prev, enabled: !prev.enabled }))}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      linkUpPlay.enabled ? 'bg-amber-500' : 'bg-neutral-800'
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
                  <div className="pt-3 border-t border-neutral-800/80 space-y-3 animate-fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-neutral-300 block mb-1">
                          From Player (Initiator / Passer)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Kevin De Bruyne (AMF) / Rodri"
                          value={linkUpPlay.fromPlayer || ''}
                          onChange={(e) => setLinkUpPlay(prev => ({ ...prev, fromPlayer: e.target.value }))}
                          className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-neutral-300 block mb-1">
                          To Player (Target / Runner)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Erling Haaland (CF) / Vinícius Jr"
                          value={linkUpPlay.toPlayer || ''}
                          onChange={(e) => setLinkUpPlay(prev => ({ ...prev, toPlayer: e.target.value }))}
                          className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-neutral-300 block mb-1">
                          Link-Up Combination Style
                        </label>
                        <select
                          value={linkUpPlay.linkPattern || 'Give & Go (1-2 Quick Return Pass)'}
                          onChange={(e) => setLinkUpPlay(prev => ({ ...prev, linkPattern: e.target.value }))}
                          className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                        >
                          <option value="Give & Go (1-2 Quick Return Pass)">Give & Go (1-2 Quick Return Pass)</option>
                          <option value="Third-Man Overload Run (eFootball 2027)">Third-Man Overload Run (eFootball 2027)</option>
                          <option value="Target Man Wall Pass & Direct Release">Target Man Wall Pass & Direct Release</option>
                          <option value="Inverted Fullback Central Underlap">Inverted Fullback Central Underlap</option>
                          <option value="Inside Forward Overlap & Far Post Cut">Inside Forward Overlap & Far Post Cut</option>
                          <option value="Custom Coach Combination">Custom Coach Combination</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-neutral-400 block mb-1">
                        Coach's Link-Up Description / Special Instruction (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 'Coach instructs DMF to trigger quick triangle pass to AMF, unlocking CF behind the defensive line.'"
                        value={linkUpPlay.coachInstructionNote || ''}
                        onChange={(e) => setLinkUpPlay(prev => ({ ...prev, coachInstructionNote: e.target.value }))}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Freeform Tactical Objective */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                  Specific Tactical Objective (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g., 'I want to counter opponent 4-3-3s' or 'Struggling with conceding crosses'"
                  value={tacticalPreference}
                  onChange={(e) => setTacticalPreference(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

            </div>
          </div>

          {/* Action Trigger CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 bg-neutral-950 border border-neutral-800 rounded-2xl">
            <div>
              <p className="text-sm font-bold text-white">Ready for comprehensive AI evaluation?</p>
              <p className="text-xs text-neutral-400">
                {typedPlayers.length > 0
                  ? `${typedPlayers.length} player(s) loaded in squad${managerDetails.name ? ` • Manager: ${managerDetails.name}` : ''}.`
                  : 'Enter Starting XI or Substitution players to start analysis.'}
              </p>
            </div>

            <button
              id="start-squad-analysis-btn"
              onClick={handleStartAnalysis}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 shadow-emerald-500/20 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              Analyze My Squad {typedPlayers.length > 0 ? `(${typedPlayers.length} players)` : ''}
            </button>
          </div>

        </div>
      )}

    </div>
  );
};
