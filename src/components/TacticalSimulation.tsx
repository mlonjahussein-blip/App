import React, { useState, useEffect, useRef } from 'react';
import { SimulationScenarioData } from '../types.ts';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  FastForward, 
  Eye, 
  Info, 
  Sparkles, 
  ChevronRight, 
  Shield, 
  Compass, 
  Activity
} from 'lucide-react';

interface TacticalSimulationProps {
  scenarios: SimulationScenarioData[];
  formation: string;
  playstyle: string;
}

export const TacticalSimulation: React.FC<TacticalSimulationProps> = ({ scenarios, formation, playstyle }) => {
  const [activeScenarioIndex, setActiveScenarioIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState<1 | 2 | 4>(1);
  const [progress, setProgress] = useState(0); // 0 to 100
  const [selectedPlayer, setSelectedPlayer] = useState<{
    name: string;
    position: string;
    instruction?: string;
    note?: string;
  } | null>(null);

  const scenario = scenarios[activeScenarioIndex] || scenarios[0];
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(Date.now());

  // Simulation loop
  useEffect(() => {
    if (!isPlaying) return;

    const loop = () => {
      const now = Date.now();
      const delta = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      // Complete cycle in roughly 7 seconds at 1x speed
      const increment = (100 / 7) * speed * delta;
      setProgress((prev) => {
        const next = prev + increment;
        if (next >= 100) {
          return 0; // loop scenario
        }
        return next;
      });

      animFrameRef.current = requestAnimationFrame(loop);
    };

    lastTimeRef.current = Date.now();
    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, speed, activeScenarioIndex]);

  // Compute interpolated keyframe positions
  const keyFrames = scenario?.keyFrames || [];
  let currentKeyFrame = keyFrames[0];
  let nextKeyFrame = keyFrames[keyFrames.length - 1];
  let factor = 0;

  for (let i = 0; i < keyFrames.length - 1; i++) {
    if (progress >= keyFrames[i].time && progress <= keyFrames[i + 1].time) {
      currentKeyFrame = keyFrames[i];
      nextKeyFrame = keyFrames[i + 1];
      const range = nextKeyFrame.time - currentKeyFrame.time;
      factor = range > 0 ? (progress - currentKeyFrame.time) / range : 0;
      break;
    }
  }

  // Linear interpolation function
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

  const currentBallX = lerp(currentKeyFrame?.ball.x ?? 50, nextKeyFrame?.ball.x ?? 50, factor);
  const currentBallY = lerp(currentKeyFrame?.ball.y ?? 50, nextKeyFrame?.ball.y ?? 50, factor);

  return (
    <div id="simulation-section" className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-6 shadow-2xl">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
              <Compass className="w-5 h-5" />
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              2D Tactical Match Simulation
            </h2>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              Interactive Pitch
            </span>
          </div>
          <p className="text-sm text-neutral-400 mt-1 max-w-2xl">
            Watch the recommended <strong>{formation}</strong> ({playstyle}) tactical principles in real motion. Learn how your players reposition, build up, create space, and recover.
          </p>
        </div>

        {/* Scenario Picker */}
        <div className="flex flex-wrap gap-1.5">
          {scenarios.map((sc, index) => (
            <button
              key={sc.id}
              onClick={() => {
                setActiveScenarioIndex(index);
                setProgress(0);
                setSelectedPlayer(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeScenarioIndex === index
                  ? 'bg-emerald-500 text-neutral-950 shadow-md shadow-emerald-500/20'
                  : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white'
              }`}
            >
              {sc.name.split('.')[0] || `Scenario ${index + 1}`}
            </button>
          ))}
        </div>
      </div>

      {/* Main Simulation Viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
        
        {/* The Pitch (7 cols on lg) */}
        <div className="lg:col-span-7 flex flex-col items-center">
          
          {/* Pitch Container with 2D Canvas Style */}
          <div 
            id="tactical-pitch-canvas"
            className="relative w-full max-w-[440px] aspect-[68/105] rounded-xl overflow-hidden shadow-inner border-2 border-emerald-800/80 bg-gradient-to-b from-[#143820] via-[#0f2e1a] to-[#143820] select-none"
          >
            {/* Pitch Markings */}
            <div className="absolute inset-0 pointer-events-none opacity-40">
              {/* Outer boundary padding */}
              <div className="absolute inset-3 border-2 border-emerald-400/50 rounded-sm" />
              
              {/* Half-way line */}
              <div className="absolute top-1/2 left-3 right-3 h-0.5 bg-emerald-400/50 -translate-y-1/2" />
              {/* Center Circle */}
              <div className="absolute top-1/2 left-1/2 w-28 h-28 -translate-x-1/2 -translate-y-1/2 border-2 border-emerald-400/50 rounded-full" />
              {/* Center Dot */}
              <div className="absolute top-1/2 left-1/2 w-2 h-2 -translate-x-1/2 -translate-y-1/2 bg-emerald-400 rounded-full" />

              {/* Penalty Area Top */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-52 h-24 border-2 border-t-0 border-emerald-400/50" />
              {/* Goal Area Top */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-10 border-2 border-t-0 border-emerald-400/50" />
              {/* Penalty Arc Top */}
              <div className="absolute top-24 left-1/2 -translate-x-1/2 w-20 h-10 border-2 border-t-0 border-emerald-400/50 rounded-b-full" />

              {/* Penalty Area Bottom */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-52 h-24 border-2 border-b-0 border-emerald-400/50" />
              {/* Goal Area Bottom */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-24 h-10 border-2 border-b-0 border-emerald-400/50" />
              {/* Penalty Arc Bottom */}
              <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-20 h-10 border-2 border-b-0 border-emerald-400/50 rounded-t-full" />

              {/* Grass Stripes Effect */}
              <div className="absolute inset-0 flex flex-col pointer-events-none">
                {[...Array(10)].map((_, idx) => (
                  <div key={idx} className={`flex-1 ${idx % 2 === 0 ? 'bg-black/10' : 'bg-transparent'}`} />
                ))}
              </div>
            </div>

            {/* Our Team Players (Home Team - Emerald/Cyan) */}
            {currentKeyFrame?.ourTeam?.map((p, idx) => {
              const nextP = nextKeyFrame?.ourTeam?.find(np => np.id === p.id) || p;
              const posX = lerp(p.x, nextP.x, factor);
              const posY = lerp(p.y, nextP.y, factor);
              const isSelected = selectedPlayer?.name === p.name;

              return (
                <button
                  key={p.id || idx}
                  onClick={() => {
                    setSelectedPlayer({
                      name: p.name,
                      position: p.position,
                      instruction: p.position === 'DMF' ? 'Deep Line (Stays deep to guard central channels)' : p.position === 'CF' ? 'Counter Target (Holds up play for early release)' : 'Positional fluid support',
                      note: `Key tactical role in ${formation}. Moves dynamically according to team pressing cues.`
                    });
                  }}
                  style={{
                    left: `${posX}%`,
                    top: `${posY}%`,
                    transform: 'translate(-50%, -50%)'
                  }}
                  className={`absolute z-20 flex flex-col items-center group focus:outline-none transition-transform duration-75 cursor-pointer`}
                >
                  <div 
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-black text-[10px] sm:text-[11px] shadow-lg transition-all ${
                      p.isHighlight || isSelected
                        ? 'bg-gradient-to-tr from-amber-400 to-yellow-300 text-neutral-950 ring-4 ring-amber-400/50 scale-110'
                        : 'bg-emerald-500 text-neutral-950 border-2 border-white/80'
                    }`}
                  >
                    {p.position}
                  </div>
                  <span className="text-[9px] font-bold text-white bg-neutral-950/80 px-1 rounded mt-0.5 truncate max-w-[65px] border border-neutral-700">
                    {p.name.split(' ').pop()}
                  </span>
                </button>
              );
            })}

            {/* Opponent Team Players (Away Team - Rose/Red) */}
            {currentKeyFrame?.oppTeam?.map((op, idx) => {
              const nextOp = nextKeyFrame?.oppTeam?.find(nop => nop.id === op.id) || op;
              const posX = lerp(op.x, nextOp.x, factor);
              const posY = lerp(op.y, nextOp.y, factor);

              return (
                <div
                  key={op.id || idx}
                  style={{
                    left: `${posX}%`,
                    top: `${posY}%`,
                    transform: 'translate(-50%, -50%)'
                  }}
                  className="absolute z-10 flex flex-col items-center pointer-events-none opacity-80"
                >
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-rose-600 border border-white/70 flex items-center justify-center text-white font-bold text-[8px]">
                    {op.position}
                  </div>
                </div>
              );
            })}

            {/* Ball Marker */}
            <div
              style={{
                left: `${currentBallX}%`,
                top: `${currentBallY}%`,
                transform: 'translate(-50%, -50%)'
              }}
              className="absolute z-30 w-4 h-4 rounded-full bg-white border-2 border-neutral-900 shadow-xl flex items-center justify-center transition-all duration-75"
            >
              <div className="w-1.5 h-1.5 bg-neutral-900 rounded-full" />
            </div>

            {/* Dynamic Real-Time Teaching Note Banner over pitch */}
            <div className="absolute top-4 left-4 right-4 z-40 bg-neutral-950/85 backdrop-blur-md border border-neutral-700 rounded-lg p-2.5 shadow-xl text-center">
              <p className="text-xs sm:text-sm font-semibold text-emerald-300 leading-snug">
                {currentKeyFrame?.teachingNote || 'Executing tactical movement pattern...'}
              </p>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="w-full max-w-[440px] mt-4 flex items-center justify-between bg-neutral-950 border border-neutral-800 rounded-xl p-3">
            
            {/* Play/Pause & Reset */}
            <div className="flex items-center gap-2">
              <button
                id="sim-play-pause-btn"
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-2 rounded-lg bg-emerald-500 text-neutral-950 font-bold hover:bg-emerald-400 transition-colors"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
              </button>
              <button
                id="sim-restart-btn"
                onClick={() => {
                  setProgress(0);
                  setIsPlaying(true);
                }}
                className="p-2 rounded-lg bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-700 transition-colors"
                title="Restart"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Progress Slider */}
            <div className="flex-1 mx-4">
              <input
                type="range"
                min={0}
                max={100}
                value={progress}
                onChange={(e) => {
                  setProgress(Number(e.target.value));
                  setIsPlaying(false);
                }}
                className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            {/* Speed Selector */}
            <div className="flex items-center gap-1 bg-neutral-900 rounded-lg p-0.5 border border-neutral-800">
              {([1, 2, 4] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`px-2 py-1 rounded text-xs font-bold transition-all ${
                    speed === s ? 'bg-emerald-500 text-neutral-950' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tactical Teaching Explanation Panel (5 cols on lg) */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          
          {/* Scenario Overview Card */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                {scenario.name}
              </h3>
              <span className="text-xs text-neutral-400">Step Progression</span>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed">
              {scenario.description}
            </p>
          </div>

          {/* Interactive Player Inspector Card */}
          {selectedPlayer ? (
            <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-2 border-b border-emerald-500/20">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-emerald-500 text-neutral-950 font-black text-xs">
                    {selectedPlayer.position}
                  </span>
                  <h4 className="font-bold text-white text-sm">{selectedPlayer.name}</h4>
                </div>
                <button 
                  onClick={() => setSelectedPlayer(null)}
                  className="text-xs text-neutral-400 hover:text-white"
                >
                  ✕ Close
                </button>
              </div>
              <div className="mt-2 space-y-2 text-xs">
                <div>
                  <span className="text-emerald-400 font-semibold block">Instruction in this sequence:</span>
                  <p className="text-neutral-200">{selectedPlayer.instruction}</p>
                </div>
                <div>
                  <span className="text-neutral-400 font-semibold block">Tactical Explanation:</span>
                  <p className="text-neutral-300">{selectedPlayer.note}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-neutral-950 border border-neutral-800/80 rounded-xl p-3 flex items-center gap-2.5 text-xs text-neutral-400">
              <Info className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Click on any player marker on the pitch to inspect their tactical role and individual instructions during this sequence.</span>
            </div>
          )}

          {/* WHAT YOU ARE LEARNING - Step by Step Breakdown */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 flex-1">
            <h3 className="text-sm font-black tracking-wider uppercase text-neutral-300 pb-3 border-b border-neutral-800 flex items-center justify-between">
              <span>WHAT YOU ARE LEARNING</span>
              <span className="text-emerald-400 text-xs normal-case font-medium">Step-by-step breakdown</span>
            </h3>

            <div className="space-y-3 mt-3">
              {scenario.steps?.map((step, idx) => (
                <div 
                  key={idx}
                  className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800/60 hover:border-emerald-500/40 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-emerald-400">
                      {step.title}
                    </span>
                    <div className="flex gap-1">
                      {step.activePlayers?.map((pos, pIdx) => (
                        <span key={pIdx} className="text-[10px] bg-neutral-800 px-1 rounded text-neutral-300">
                          {pos}
                        </span>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-neutral-300 leading-normal">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
