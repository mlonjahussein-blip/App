import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  X, 
  Sparkles, 
  ChevronRight, 
  ChevronLeft, 
  ShieldCheck, 
  Bot, 
  Sliders, 
  Award, 
  CheckCircle2, 
  Users, 
  Activity,
  Layers,
  ArrowRight
} from 'lucide-react';

interface DemoScene {
  id: number;
  title: string;
  stageBadge: string;
  caption: string;
  voiceScript: string;
  durationSec: number;
  visualState: {
    activeTab: 'mode' | 'squad' | 'manager' | 'diagnostics' | 'results';
    highlightArea: string;
    descriptionPoints: string[];
    simulatedData?: any;
  };
}

const DEMO_SCENES: DemoScene[] = [
  {
    id: 1,
    title: "Welcome & Selecting Analysis Mode",
    stageBadge: "Stage 1 of 5 • Setup",
    caption: "Welcome Manager! Choose between Quick Analysis or the Full 23-Squad deep tactical breakdown.",
    voiceScript: "Welcome, Manager! I'm Coach Marcus, your AI tactical companion. To begin analyzing your squad, head over to the Analyzer. You can choose either Guided Mode to enter your starting eleven, or the Pure 23 Squad Mode to inspect your complete roster including bench players and game changers.",
    durationSec: 9,
    visualState: {
      activeTab: 'mode',
      highlightArea: 'Mode Switcher',
      descriptionPoints: [
        "1. Click 'Squad Analyzer' in your navigation bar.",
        "2. Choose 'Pure 23 Squad' for a full squad evaluation or 'Guided' for starting XI.",
        "3. Quick-load any of your saved squads with a single tap."
      ]
    }
  },
  {
    id: 2,
    title: "Adding Your Starting XI & Bench",
    stageBadge: "Stage 2 of 5 • Squad Input",
    caption: "Add your key players with their positions, ratings, and playstyles.",
    voiceScript: "Next, register your starting eleven and key substitutes. Enter each player's name, registered position, and their unique card playstyle, such as Goal Poacher, Hole Player, or Anchor Man. The AI uses these tactical affinities to determine pitch coverage and link-up synergies.",
    durationSec: 10,
    visualState: {
      activeTab: 'squad',
      highlightArea: 'Starting XI List',
      descriptionPoints: [
        "Position selection (CF, AMF, CMF, DMF, CB, GK, etc.)",
        "Overall Card Rating (e.g. 98, 102 booster)",
        "Card Playstyle affinity for spatial runs & tracking",
        "Automatic validation ensures balance across all thirds"
      ],
      simulatedData: [
        { name: "K. Mbappé", pos: "CF", rating: 102, playstyle: "Goal Poacher" },
        { name: "L. Messi", pos: "RWF", rating: 104, playstyle: "Creative Playmaker" },
        { name: "Vinícius Jr.", pos: "LWF", rating: 101, playstyle: "Roaming Flank" },
        { name: "Rodri", pos: "DMF", rating: 100, playstyle: "Anchor Man" },
        { name: "V. van Dijk", pos: "CB", rating: 101, playstyle: "Build Up" }
      ]
    }
  },
  {
    id: 3,
    title: "Configuring Your Manager & Tactics",
    stageBadge: "Stage 3 of 5 • Manager Calibration",
    caption: "Configure your Manager's tactical style and fluid formation transitions.",
    voiceScript: "Now, configure your manager and team playstyle. Whether you favor Quick Counter with high pressing lines, Possession Game, or Long Ball Counter, specify your manager proficiencies. You can also turn on Fluid Formations to specify separate structures when attacking versus defending.",
    durationSec: 10,
    visualState: {
      activeTab: 'manager',
      highlightArea: 'Manager Proficiencies',
      descriptionPoints: [
        "Manager Playstyle Proficiencies (Quick Counter, Possession, Long Ball Counter)",
        "Optional Fluid Formations (Kickoff, In-Possession, Out-of-Possession)",
        "Link-Up Play configuration (e.g. 1-2 Pass & Go combinations)"
      ],
      simulatedData: {
        manager: "G. Gasperini / Pep Guardiola",
        style: "Quick Counter (88 Affinity)",
        fluid: "Active: 4-2-1-3 Attack / 5-3-2 Defense"
      }
    }
  },
  {
    id: 4,
    title: "AI Analysis Engine at Work",
    stageBadge: "Stage 4 of 5 • Neural Evaluation",
    caption: "The Gemini AI evaluates spatial spacing, playstyle clashes, and defensive coverage.",
    voiceScript: "Once you hit 'Run AI Squad Analysis', our tactical neural engine evaluates over 20 tactical parameters in real-time. It checks for playstyle collisions, midfield cover, stamina drop-offs, and opposition counter vulnerabilities.",
    durationSec: 9,
    visualState: {
      activeTab: 'diagnostics',
      highlightArea: 'Neural Processing',
      descriptionPoints: [
        "Midfield Pivot Integrity & Space Coverage Check",
        "Flank Overload & Fullback Inversion Analysis",
        "Dead-ball specialist & Captaincy selection",
        "Bench Super-sub compatibility scoring"
      ]
    }
  },
  {
    id: 5,
    title: "Reviewing Best XI, Instructions & 2D Simulation",
    stageBadge: "Stage 5 of 5 • Tactical Masterclass",
    caption: "Receive your tailored tactical report, individual player instructions, and 2D play simulations.",
    voiceScript: "And here is your tactical report! You get an optimized Best Starting XI, clear Individual Instructions like Deep Line or Defensive on fullbacks, plus an interactive 2D simulation pitch showing your team moving in sync. You are now ready to dominate Division 1!",
    durationSec: 11,
    visualState: {
      activeTab: 'results',
      highlightArea: 'Tactical Report & 2D Simulation',
      descriptionPoints: [
        "Overall Squad Rating & Sectional Balance Scores",
        "Best XI pitch visualization with tactical rationale",
        "Attack & Defense Individual Instructions",
        "Interactive 2D Pitch Simulation with animated phases",
        "Export to PDF or share with the Community"
      ],
      simulatedData: {
        score: "94 / 100",
        bestFormation: "4-2-1-3 Diamond Pivot",
        keyTip: "Assign 'Defensive' instruction to RB to prevent counter-attack overloads."
      }
    }
  }
];

interface AiAnalysisDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToAnalyzer: () => void;
}

export const AiAnalysisDemoModal: React.FC<AiAnalysisDemoModalProps> = ({
  isOpen,
  onClose,
  onNavigateToAnalyzer
}) => {
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [availableVoiceName, setAvailableVoiceName] = useState<string>('');
  
  const timerRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const scene = DEMO_SCENES[currentSceneIndex];

  // Initialize Speech Synthesis
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
      setSpeechSupported(true);

      const findVoice = () => {
        if (!synthRef.current) return;
        const voices = synthRef.current.getVoices();
        // Look for natural English male voices (Google UK English Male, Daniel, George, Guy, etc.)
        const maleVoice = voices.find(v => 
          v.lang.startsWith('en') && 
          (v.name.toLowerCase().includes('male') || 
           v.name.toLowerCase().includes('george') || 
           v.name.toLowerCase().includes('daniel') || 
           v.name.toLowerCase().includes('guy') || 
           v.name.toLowerCase().includes('david') ||
           v.name.toLowerCase().includes('uk english'))
        ) || voices.find(v => v.lang.startsWith('en-GB')) || voices.find(v => v.lang.startsWith('en'));

        if (maleVoice) {
          setAvailableVoiceName(maleVoice.name);
        }
      };

      findVoice();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = findVoice;
      }
    }
  }, []);

  // Speak Current Scene
  const speakCurrentScene = (text: string) => {
    if (!synthRef.current || isMuted || !speechSupported) return;

    try {
      synthRef.current.cancel(); // Stop any pending utterances
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 0.95; // Slightly deeper, authoritative coach pitch

      const voices = synthRef.current.getVoices();
      const selectedVoice = voices.find(v => v.name === availableVoiceName) || 
                            voices.find(v => v.lang.startsWith('en-GB')) || 
                            voices.find(v => v.lang.startsWith('en'));
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      utteranceRef.current = utterance;
      synthRef.current.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }
  };

  // Trigger speech and timer whenever current scene or play status changes
  useEffect(() => {
    if (!isOpen) {
      if (synthRef.current) synthRef.current.cancel();
      clearInterval(timerRef.current);
      return;
    }

    if (isPlaying) {
      speakCurrentScene(scene.voiceScript);

      setAudioProgress(0);
      const stepIntervalMs = 100;
      const totalSteps = (scene.durationSec * 1000) / stepIntervalMs;
      let stepCount = 0;

      clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        stepCount += 1;
        const pct = Math.min(100, Math.round((stepCount / totalSteps) * 100));
        setAudioProgress(pct);

        if (stepCount >= totalSteps) {
          clearInterval(timerRef.current);
          if (currentSceneIndex < DEMO_SCENES.length - 1) {
            setCurrentSceneIndex(prev => prev + 1);
          } else {
            setIsPlaying(false);
          }
        }
      }, stepIntervalMs);
    } else {
      if (synthRef.current) synthRef.current.cancel();
      clearInterval(timerRef.current);
    }

    return () => {
      clearInterval(timerRef.current);
      if (synthRef.current) synthRef.current.cancel();
    };
  }, [isOpen, currentSceneIndex, isPlaying, isMuted]);

  // Handle Mute Toggle
  const toggleMute = () => {
    setIsMuted(prev => {
      const next = !prev;
      if (next && synthRef.current) {
        synthRef.current.cancel();
      } else if (!next && isPlaying) {
        speakCurrentScene(scene.voiceScript);
      }
      return next;
    });
  };

  const handleNext = () => {
    if (currentSceneIndex < DEMO_SCENES.length - 1) {
      setCurrentSceneIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentSceneIndex > 0) {
      setCurrentSceneIndex(prev => prev - 1);
    }
  };

  const handleRestart = () => {
    setCurrentSceneIndex(0);
    setIsPlaying(true);
    setAudioProgress(0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-neutral-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-neutral-900 border border-neutral-700/80 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[92vh]">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-black text-white">AI Coach Guided Tour</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  Admin Preview • Mr. Who
                </span>
              </div>
              <p className="text-xs text-neutral-400">Step-by-step interactive walkthrough with AI voiceover</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleMute}
              title={isMuted ? "Unmute Voice" : "Mute Voice"}
              className={`p-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                isMuted 
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' 
                  : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-700'
              }`}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Video Canvas Stage */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-y-auto">
          
          {/* Main Visual Display (Simulated App State) */}
          <div className="lg:col-span-8 p-5 sm:p-6 bg-neutral-950 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-neutral-800">
            
            {/* Stage Title and Progress Dots */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 tracking-wider uppercase">
                  {scene.stageBadge}
                </span>
                <div className="flex gap-1.5">
                  {DEMO_SCENES.map((s, idx) => (
                    <button
                      key={s.id}
                      onClick={() => setCurrentSceneIndex(idx)}
                      className={`h-1.5 rounded-full transition-all cursor-pointer ${
                        idx === currentSceneIndex 
                          ? 'w-6 bg-emerald-400' 
                          : idx < currentSceneIndex 
                          ? 'w-2 bg-emerald-700' 
                          : 'w-2 bg-neutral-800'
                      }`}
                      title={s.title}
                    />
                  ))}
                </div>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {scene.title}
              </h2>
            </div>

            {/* Interactive Screen Simulation Frame */}
            <div className="relative rounded-2xl border border-neutral-800 bg-neutral-900/90 p-4 sm:p-5 shadow-inner min-h-[260px] sm:min-h-[300px] flex flex-col justify-center">
              
              {/* Scene 1: Mode Switcher */}
              {scene.visualState.activeTab === 'mode' && (
                <div className="space-y-4">
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Sliders className="w-5 h-5 text-emerald-400" />
                      <div>
                        <div className="text-xs font-bold text-white">Mode 1: Pure 23 Squad Mode (Recommended)</div>
                        <div className="text-[11px] text-neutral-400">Full match squad analysis with substitutes & game changers</div>
                      </div>
                    </div>
                    <span className="px-2 py-1 rounded bg-emerald-500 text-neutral-950 text-xs font-black">
                      Selected
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-neutral-800/60 border border-neutral-700/60 flex items-center justify-between opacity-70">
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-neutral-400" />
                      <div>
                        <div className="text-xs font-bold text-white">Mode 2: Guided Tactics (Starting XI Only)</div>
                        <div className="text-[11px] text-neutral-400">Quick 11-player setup with position recommendations</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-neutral-700 text-neutral-300 text-xs font-semibold">
                      Option
                    </span>
                  </div>
                </div>
              )}

              {/* Scene 2: Squad Input */}
              {scene.visualState.activeTab === 'squad' && (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-neutral-400 flex items-center justify-between pb-1">
                    <span>Sample Starting XI Roster</span>
                    <span className="text-emerald-400">5 / 11 Loaded</span>
                  </div>
                  <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                    {scene.visualState.simulatedData?.map((p: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-neutral-950/80 border border-neutral-800 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-7 text-center font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                            {p.pos}
                          </span>
                          <span className="font-semibold text-white">{p.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-neutral-400 text-[11px]">{p.playstyle}</span>
                          <span className="font-black text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">
                            {p.rating}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Scene 3: Manager Setup */}
              {scene.visualState.activeTab === 'manager' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-neutral-400">Manager & Playstyle:</span>
                      <span className="font-bold text-white">{scene.visualState.simulatedData.manager}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-neutral-400">Primary Tactical Affinity:</span>
                      <span className="font-bold text-emerald-400">{scene.visualState.simulatedData.style}</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-xs space-y-1">
                    <div className="font-bold text-cyan-300 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5" /> Fluid Formations Activated
                    </div>
                    <p className="text-[11px] text-neutral-300">
                      Kickoff: 4-2-1-3 • In-Possession: 3-2-4-1 (Inverting Fullback) • Defensive: 5-3-2 Block
                    </p>
                  </div>
                </div>
              )}

              {/* Scene 4: Diagnostics Processing */}
              {scene.visualState.activeTab === 'diagnostics' && (
                <div className="flex flex-col items-center justify-center space-y-3 py-6 text-center">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-emerald-500/20 border-t-emerald-400 animate-spin" />
                    <Sparkles className="w-6 h-6 text-emerald-400 absolute inset-0 m-auto" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-black text-white">AI Engine Processing Tactical Profile</h4>
                    <p className="text-xs text-neutral-400 max-w-sm">
                      Evaluating 20+ meta parameters: Double pivot stability, Anchor Man anchoring, winger cut-ins, and build-up transitions.
                    </p>
                  </div>
                </div>
              )}

              {/* Scene 5: Results & Report */}
              {scene.visualState.activeTab === 'results' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40">
                    <div>
                      <div className="text-[11px] uppercase font-bold text-emerald-400">Squad Tactical Rating</div>
                      <div className="text-xl font-black text-white">{scene.visualState.simulatedData.score}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] uppercase font-bold text-neutral-400">Optimal System</div>
                      <div className="text-xs font-bold text-white">{scene.visualState.simulatedData.bestFormation}</div>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-xs">
                    <span className="font-bold text-amber-400">Key AI Directive: </span>
                    <span className="text-neutral-300">{scene.visualState.simulatedData.keyTip}</span>
                  </div>
                </div>
              )}

              {/* Animated Progress Bar */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-neutral-800 rounded-b-2xl overflow-hidden">
                <div 
                  className="h-full bg-emerald-400 transition-all duration-100 ease-linear"
                  style={{ width: `${audioProgress}%` }}
                />
              </div>

            </div>

            {/* Subtitles / Audio Captions Area */}
            <div className="mt-4 p-3 rounded-xl bg-neutral-900 border border-neutral-800 flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-400">Coach Marcus (AI Audio)</span>
                  <span className="text-[10px] text-neutral-500">English Accent</span>
                </div>
                <p className="text-xs text-neutral-200 leading-relaxed italic">
                  "{scene.caption}"
                </p>
              </div>
            </div>

            {/* Video Controls Bar */}
            <div className="flex items-center justify-between pt-4 mt-2 border-t border-neutral-800">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPlaying(prev => !prev)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-3.5 h-3.5" /> Pause
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" /> Play
                    </>
                  )}
                </button>
                <button
                  onClick={handleRestart}
                  title="Restart from beginning"
                  className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrev}
                  disabled={currentSceneIndex === 0}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-neutral-300 flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Back
                </button>
                <span className="text-xs text-neutral-400 px-1 font-mono">
                  {currentSceneIndex + 1} / {DEMO_SCENES.length}
                </span>
                <button
                  onClick={handleNext}
                  disabled={currentSceneIndex === DEMO_SCENES.length - 1}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-neutral-300 flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
                >
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>

          {/* Right Sidebar: Step Details & Quick Jump */}
          <div className="lg:col-span-4 p-5 sm:p-6 bg-neutral-900/60 flex flex-col justify-between space-y-6">
            
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                <span className="text-xs font-bold text-white uppercase tracking-wider">Scene Highlights</span>
                <span className="text-[11px] text-emerald-400 font-semibold">{scene.visualState.highlightArea}</span>
              </div>

              <div className="space-y-2.5">
                {scene.visualState.descriptionPoints.map((point, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-neutral-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{point}</span>
                  </div>
                ))}
              </div>

              {/* All Steps Index */}
              <div className="pt-4 border-t border-neutral-800 space-y-2">
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">All 5 Stages</span>
                <div className="space-y-1">
                  {DEMO_SCENES.map((s, idx) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setCurrentSceneIndex(idx);
                        setIsPlaying(true);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                        idx === currentSceneIndex 
                          ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30' 
                          : 'text-neutral-400 hover:bg-neutral-800/80 hover:text-neutral-200'
                      }`}
                    >
                      <span className="truncate">{idx + 1}. {s.title}</span>
                      <span className="text-[10px] text-neutral-500 font-mono ml-2 shrink-0">{s.durationSec}s</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Call to Action for Admin testing */}
            <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
              <div className="text-xs font-semibold text-neutral-300">
                Ready to test the live analyzer yourself?
              </div>
              <button
                onClick={() => {
                  onClose();
                  onNavigateToAnalyzer();
                }}
                className="w-full py-2.5 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-neutral-950 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                <Sparkles className="w-4 h-4" /> Go to Squad Analyzer
              </button>
              <div className="text-[10px] text-neutral-500 text-center">
                This preview banner is currently restricted to your account (<span className="text-neutral-400 font-semibold">Mr. Who</span>).
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
