import React, { useState } from 'react';
import { 
  UserPlus, 
  Trash2, 
  Plus, 
  UserCheck, 
  Layers, 
  Users
} from 'lucide-react';
import { TypedPlayerInput, ManagerInputDetails } from '../types.ts';
import { ManagerDetailsInput } from './ManagerDetailsInput.tsx';

interface ManualPlayerInputProps {
  typedPlayers: TypedPlayerInput[];
  onChange: (players: TypedPlayerInput[]) => void;
  managerDetails: ManagerInputDetails;
  onManagerChange: (manager: ManagerInputDetails) => void;
}

export const ManualPlayerInput: React.FC<ManualPlayerInputProps> = ({
  typedPlayers,
  onChange,
  managerDetails,
  onManagerChange
}) => {
  // Starting XI Form State
  const [xiName, setXiName] = useState('');
  const [xiPos, setXiPos] = useState('CF');
  const [xiCardType, setXiCardType] = useState('Highlight');
  const [xiPlaystyle, setXiPlaystyle] = useState('Goal Poacher');
  const [xiRating, setXiRating] = useState<number>(95);
  const [xiTeam, setXiTeam] = useState('');

  // Substitute Form State
  const [subName, setSubName] = useState('');
  const [subPos, setSubPos] = useState('CF');
  const [subCardType, setSubCardType] = useState('Highlight');
  const [subPlaystyle, setSubPlaystyle] = useState('Goal Poacher');
  const [subRating, setSubRating] = useState<number>(92);
  const [subTeam, setSubTeam] = useState('');

  const positions = ['CF', 'SS', 'LWF', 'RWF', 'AMF', 'CMF', 'DMF', 'LMF', 'RMF', 'LB', 'CB', 'RB', 'GK'];
  const cardTypes = ['Epic', 'Show Time', 'Highlight', 'POTW', 'Standard', 'Legendary', 'Big Time', 'Booster', 'Featured'];
  const playstyles = [
    'Goal Poacher',
    'Fox in the Box',
    'Target Man',
    'Creative Playmaker',
    'Hole Player',
    'Box-to-Box',
    'Anchor Man',
    'Orchestrator',
    'Destroyer',
    'Build Up',
    'Offensive Fullback',
    'Defensive Fullback',
    'Roaming Flank',
    'Prolific Winger',
    'Cross Specialist',
    'Extra Frontman',
    'Deep-Lying Forward',
    'Full-back Finisher',
    'Counter Target',
    'Offensive Goalkeeper',
    'Defensive Goalkeeper',
    'Classic No. 10',
    'No Playstyle'
  ];

  const startingXI = typedPlayers.filter(p => p.role === 'starting_xi' || !p.role);
  const substitutes = typedPlayers.filter(p => p.role === 'substitute');

  const addStartingXIPlayer = () => {
    if (!xiName.trim()) return;
    if (startingXI.length >= 11) return;

    const newPlayer: TypedPlayerInput = {
      id: 'xi_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      name: xiName.trim(),
      position: xiPos,
      cardType: xiCardType,
      playstyle: xiPlaystyle,
      rating: Math.min(110, Math.max(60, Number(xiRating) || 90)),
      club: xiTeam.trim() || undefined,
      role: 'starting_xi'
    };

    onChange([...typedPlayers, newPlayer]);
    setXiName('');
    setXiTeam('');
  };

  const addSubstitutePlayer = () => {
    if (!subName.trim()) return;
    if (substitutes.length >= 12) return;

    const newPlayer: TypedPlayerInput = {
      id: 'sub_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      name: subName.trim(),
      position: subPos,
      cardType: subCardType,
      playstyle: subPlaystyle,
      rating: Math.min(110, Math.max(60, Number(subRating) || 90)),
      club: subTeam.trim() || undefined,
      role: 'substitute'
    };

    onChange([...typedPlayers, newPlayer]);
    setSubName('');
    setSubTeam('');
  };

  const removePlayer = (id: string) => {
    onChange(typedPlayers.filter(p => p.id !== id));
  };

  const updatePlayerRating = (id: string, newRating: number) => {
    onChange(typedPlayers.map(p => p.id === id ? { ...p, rating: Math.min(110, Math.max(60, newRating)) } : p));
  };

  const updatePlayerPosition = (id: string, newPosition: string) => {
    onChange(typedPlayers.map(p => p.id === id ? { ...p, position: newPosition } : p));
  };

  const updatePlayerPlaystyle = (id: string, newPlaystyle: string) => {
    onChange(typedPlayers.map(p => p.id === id ? { ...p, playstyle: newPlaystyle } : p));
  };

  const clearAllSquad = () => {
    onChange([]);
  };

  const getPositionColor = (pos: string) => {
    switch (pos) {
      case 'CF':
      case 'SS':
      case 'LWF':
      case 'RWF':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'AMF':
      case 'CMF':
      case 'DMF':
      case 'LMF':
      case 'RMF':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'CB':
      case 'LB':
      case 'RB':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'GK':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      default:
        return 'bg-neutral-800 text-neutral-300 border-neutral-700';
    }
  };

  const getCardTypeBadgeStyle = (cardType?: string) => {
    switch (cardType) {
      case 'Epic':
      case 'Big Time':
      case 'Booster':
        return 'bg-gradient-to-r from-amber-500/30 via-yellow-400/20 to-amber-600/30 text-amber-300 border-amber-400/50';
      case 'Show Time':
        return 'bg-gradient-to-r from-cyan-500/30 via-blue-500/20 to-indigo-500/30 text-cyan-300 border-cyan-400/50';
      case 'Highlight':
      case 'POTW':
      case 'Featured':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'Legendary':
        return 'bg-yellow-600/20 text-yellow-300 border-yellow-500/40';
      default:
        return 'bg-neutral-800 text-neutral-400 border-neutral-700';
    }
  };

  return (
    <div className="space-y-8">

      {/* 1. Manager / Coach Details Section */}
      <ManagerDetailsInput
        managerDetails={managerDetails}
        onManagerChange={onManagerChange}
      />

      {/* 2. Enter the XI Player's Details */}
      <div className="bg-neutral-950/70 border border-neutral-800 rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm sm:text-base font-bold text-white">
              Enter the XI Player's Details:
            </h3>
          </div>
          <span className={`text-xs font-black px-3 py-1 rounded-full self-start sm:self-auto ${
            startingXI.length === 11 
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'bg-neutral-800 text-neutral-300'
          }`}>
            Starting XI: {startingXI.length} / 11 Players
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-13 gap-2.5">
          {/* Player Name */}
          <div className="sm:col-span-3">
            <label className="text-[10px] font-bold text-neutral-400 block mb-1">Player Name</label>
            <input
              type="text"
              placeholder="e.g. K. Mbappé, Haaland"
              value={xiName}
              onChange={(e) => setXiName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addStartingXIPlayer(); }}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Team / Club */}
          <div className="sm:col-span-2">
            <label className="text-[10px] font-bold text-neutral-400 block mb-1">Team / Club</label>
            <input
              type="text"
              placeholder="e.g. Real Madrid, Man City"
              value={xiTeam}
              onChange={(e) => setXiTeam(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addStartingXIPlayer(); }}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Position */}
          <div className="sm:col-span-1">
            <label className="text-[10px] font-bold text-neutral-400 block mb-1">Pos</label>
            <select
              value={xiPos}
              onChange={(e) => setXiPos(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              {positions.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Card Type */}
          <div className="sm:col-span-2">
            <label className="text-[10px] font-bold text-neutral-400 block mb-1">Card Type</label>
            <select
              value={xiCardType}
              onChange={(e) => setXiCardType(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              {cardTypes.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Player Playing Style */}
          <div className="sm:col-span-2">
            <label className="text-[10px] font-bold text-neutral-400 block mb-1">Playing Style</label>
            <select
              value={xiPlaystyle}
              onChange={(e) => setXiPlaystyle(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              {playstyles.map(ps => (
                <option key={ps} value={ps}>{ps}</option>
              ))}
            </select>
          </div>

          {/* Rating (OVR) */}
          <div className="sm:col-span-1">
            <label className="text-[10px] font-bold text-neutral-400 block mb-1 text-center">OVR</label>
            <input
              type="number"
              min="60"
              max="110"
              value={xiRating}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') {
                  setXiRating(60);
                  return;
                }
                const num = parseInt(val, 10);
                if (!isNaN(num)) {
                  setXiRating(num);
                }
              }}
              onBlur={(e) => {
                const num = parseInt(e.target.value, 10);
                setXiRating(isNaN(num) ? 90 : Math.min(110, Math.max(60, num)));
              }}
              onKeyDown={(e) => { if (e.key === 'Enter') addStartingXIPlayer(); }}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-1.5 py-2 text-xs font-black text-amber-300 placeholder-neutral-500 focus:outline-none focus:border-emerald-500 text-center"
            />
          </div>

          {/* Add XI Button */}
          <div className="sm:col-span-2 flex items-end">
            <button
              type="button"
              onClick={addStartingXIPlayer}
              disabled={!xiName.trim() || startingXI.length >= 11}
              className={`w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors ${
                xiName.trim() && startingXI.length < 11
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-neutral-950 shadow-md cursor-pointer'
                  : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
              }`}
              title={startingXI.length >= 11 ? 'Starting XI full (11 players maximum)' : 'Add player to Starting XI'}
            >
              <Plus className="w-4 h-4" />
              <span>Add XI</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Enter the Substitution Player's Details */}
      <div className="bg-neutral-950/70 border border-neutral-800 rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm sm:text-base font-bold text-white">
              Enter the Substitution Player's Details:
            </h3>
          </div>
          <span className={`text-xs font-black px-3 py-1 rounded-full self-start sm:self-auto ${
            substitutes.length === 12 
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
              : 'bg-neutral-800 text-neutral-300'
          }`}>
            Substitutions: {substitutes.length} / 12 Players
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-13 gap-2.5">
          {/* Player Name */}
          <div className="sm:col-span-3">
            <label className="text-[10px] font-bold text-neutral-400 block mb-1">Player Name</label>
            <input
              type="text"
              placeholder="e.g. Rodrygo, Camavinga"
              value={subName}
              onChange={(e) => setSubName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addSubstitutePlayer(); }}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Team / Club */}
          <div className="sm:col-span-2">
            <label className="text-[10px] font-bold text-neutral-400 block mb-1">Team / Club</label>
            <input
              type="text"
              placeholder="e.g. Arsenal, Bayern"
              value={subTeam}
              onChange={(e) => setSubTeam(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addSubstitutePlayer(); }}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Position */}
          <div className="sm:col-span-1">
            <label className="text-[10px] font-bold text-neutral-400 block mb-1">Pos</label>
            <select
              value={subPos}
              onChange={(e) => setSubPos(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
            >
              {positions.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Card Type */}
          <div className="sm:col-span-2">
            <label className="text-[10px] font-bold text-neutral-400 block mb-1">Card Type</label>
            <select
              value={subCardType}
              onChange={(e) => setSubCardType(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
            >
              {cardTypes.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Player Playing Style */}
          <div className="sm:col-span-2">
            <label className="text-[10px] font-bold text-neutral-400 block mb-1">Playing Style</label>
            <select
              value={subPlaystyle}
              onChange={(e) => setSubPlaystyle(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
            >
              {playstyles.map(ps => (
                <option key={ps} value={ps}>{ps}</option>
              ))}
            </select>
          </div>

          {/* Rating (OVR) */}
          <div className="sm:col-span-1">
            <label className="text-[10px] font-bold text-neutral-400 block mb-1 text-center">OVR</label>
            <input
              type="number"
              min="60"
              max="110"
              value={subRating}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') {
                  setSubRating(60);
                  return;
                }
                const num = parseInt(val, 10);
                if (!isNaN(num)) {
                  setSubRating(num);
                }
              }}
              onBlur={(e) => {
                const num = parseInt(e.target.value, 10);
                setSubRating(isNaN(num) ? 90 : Math.min(110, Math.max(60, num)));
              }}
              onKeyDown={(e) => { if (e.key === 'Enter') addSubstitutePlayer(); }}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-1.5 py-2 text-xs font-black text-amber-300 placeholder-neutral-500 focus:outline-none focus:border-cyan-500 text-center"
            />
          </div>

          {/* Add Substitute Button */}
          <div className="sm:col-span-2 flex items-end">
            <button
              type="button"
              onClick={addSubstitutePlayer}
              disabled={!subName.trim() || substitutes.length >= 12}
              className={`w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors ${
                subName.trim() && substitutes.length < 12
                  ? 'bg-cyan-500 hover:bg-cyan-400 text-neutral-950 shadow-md cursor-pointer'
                  : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
              }`}
              title={substitutes.length >= 12 ? 'Substitutes full (12 players maximum)' : 'Add player to Substitutes'}
            >
              <Plus className="w-4 h-4" />
              <span>Add Sub</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. Selected Squad (0 / 23 players) Area */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-950/70 p-4 rounded-xl border border-neutral-800">
          <div className="flex items-center gap-3">
            <Layers className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                Selected Squad ({typedPlayers.length} / 23 players)
              </h3>
              <p className="text-xs text-neutral-400">
                Starting XI: <span className="text-emerald-400 font-bold">{startingXI.length}/11</span> • Substitutes: <span className="text-cyan-400 font-bold">{substitutes.length}/12</span>
              </p>
            </div>
          </div>

          {typedPlayers.length > 0 && (
            <button
              type="button"
              onClick={clearAllSquad}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 transition-colors self-start sm:self-auto"
            >
              Clear All Players
            </button>
          )}
        </div>

        {typedPlayers.length === 0 ? (
          <div className="border border-dashed border-neutral-800 rounded-2xl p-10 text-center bg-neutral-950/40 space-y-2">
            <UserPlus className="w-10 h-10 text-neutral-600 mx-auto" />
            <p className="text-sm font-semibold text-neutral-300">
              No players added to squad yet
            </p>
            <p className="text-xs text-neutral-500 max-w-md mx-auto">
              Add up to 11 Starting XI players and up to 12 Substitutes using the detail forms above.
            </p>
          </div>
        ) : (
          <div className="space-y-6">

            {/* Starting XI Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4" />
                  Starting XI ({startingXI.length} / 11)
                </span>
                {startingXI.length === 11 && (
                  <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Full XI Complete
                  </span>
                )}
              </div>

              {startingXI.length === 0 ? (
                <p className="text-xs text-neutral-500 italic p-3 bg-neutral-950/40 rounded-xl border border-neutral-800/60">
                  No Starting XI players added yet.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {startingXI.map((player, idx) => (
                    <div
                      key={player.id}
                      className="bg-neutral-900/90 border border-neutral-800 hover:border-emerald-500/40 rounded-xl p-3 flex flex-col gap-2 shadow-sm transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] font-bold text-neutral-500 w-4 text-right shrink-0">
                            {idx + 1}.
                          </span>

                          {/* Editable Position */}
                          <select
                            value={player.position}
                            onChange={(e) => updatePlayerPosition(player.id, e.target.value)}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-black border cursor-pointer ${getPositionColor(player.position)}`}
                          >
                            {positions.map(p => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                          </select>

                          <div className="min-w-0">
                            <span className="text-xs font-bold text-white block truncate">
                              {player.name}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {/* Rating Input */}
                          <div className="flex items-center gap-1 bg-neutral-950 px-2 py-1 rounded-lg border border-neutral-800">
                            <input
                              type="number"
                              min="60"
                              max="110"
                              value={player.rating}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === '') {
                                  updatePlayerRating(player.id, 60);
                                  return;
                                }
                                const num = parseInt(val, 10);
                                if (!isNaN(num)) {
                                  updatePlayerRating(player.id, num);
                                }
                              }}
                              onBlur={(e) => {
                                const num = parseInt(e.target.value, 10);
                                updatePlayerRating(player.id, isNaN(num) ? 90 : Math.min(110, Math.max(60, num)));
                              }}
                              className="w-8 bg-transparent text-xs font-black text-amber-300 text-center focus:outline-none"
                            />
                            <span className="text-[9px] font-bold text-neutral-500">OVR</span>
                          </div>

                          {/* Remove Button */}
                          <button
                            type="button"
                            onClick={() => removePlayer(player.id)}
                            className="p-1.5 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                            title="Remove player"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Card Type & Editable Playstyle */}
                      <div className="flex items-center justify-between pt-1 border-t border-neutral-800/60 text-[10px]">
                        <span className={`inline-block px-1.5 py-0.2 rounded border text-[9px] font-bold ${getCardTypeBadgeStyle(player.cardType)}`}>
                          {player.cardType || 'Highlight'}
                        </span>
                        
                        <select
                          value={player.playstyle || 'Goal Poacher'}
                          onChange={(e) => updatePlayerPlaystyle(player.id, e.target.value)}
                          className="bg-neutral-950 border border-neutral-700 text-neutral-300 rounded px-2 py-1 text-[10px] focus:outline-none focus:border-emerald-500"
                        >
                          {playstyles.map(ps => (
                            <option key={ps} value={ps}>{ps}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Substitutes Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  Substitution Players ({substitutes.length} / 12)
                </span>
                {substitutes.length === 12 && (
                  <span className="text-[11px] font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                    Max Substitutes Added (12)
                  </span>
                )}
              </div>

              {substitutes.length === 0 ? (
                <p className="text-xs text-neutral-500 italic p-3 bg-neutral-950/40 rounded-xl border border-neutral-800/60">
                  No Substitutes added yet.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {substitutes.map((player, idx) => (
                    <div
                      key={player.id}
                      className="bg-neutral-900/90 border border-neutral-800 hover:border-cyan-500/40 rounded-xl p-3 flex flex-col gap-2 shadow-sm transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] font-bold text-neutral-500 w-4 text-right shrink-0">
                            {idx + 1}.
                          </span>

                          {/* Editable Position */}
                          <select
                            value={player.position}
                            onChange={(e) => updatePlayerPosition(player.id, e.target.value)}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-black border cursor-pointer ${getPositionColor(player.position)}`}
                          >
                            {positions.map(p => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                          </select>

                          <div className="min-w-0">
                            <span className="text-xs font-bold text-white block truncate">
                              {player.name}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {/* Rating Input */}
                          <div className="flex items-center gap-1 bg-neutral-950 px-2 py-1 rounded-lg border border-neutral-800">
                            <input
                              type="number"
                              min="60"
                              max="110"
                              value={player.rating}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === '') {
                                  updatePlayerRating(player.id, 60);
                                  return;
                                }
                                const num = parseInt(val, 10);
                                if (!isNaN(num)) {
                                  updatePlayerRating(player.id, num);
                                }
                              }}
                              onBlur={(e) => {
                                const num = parseInt(e.target.value, 10);
                                updatePlayerRating(player.id, isNaN(num) ? 90 : Math.min(110, Math.max(60, num)));
                              }}
                              className="w-8 bg-transparent text-xs font-black text-amber-300 text-center focus:outline-none"
                            />
                            <span className="text-[9px] font-bold text-neutral-500">OVR</span>
                          </div>

                          {/* Remove Button */}
                          <button
                            type="button"
                            onClick={() => removePlayer(player.id)}
                            className="p-1.5 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                            title="Remove player"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Card Type & Editable Playstyle */}
                      <div className="flex items-center justify-between pt-1 border-t border-neutral-800/60 text-[10px]">
                        <span className={`inline-block px-1.5 py-0.2 rounded border text-[9px] font-bold ${getCardTypeBadgeStyle(player.cardType)}`}>
                          {player.cardType || 'Highlight'}
                        </span>
                        
                        <select
                          value={player.playstyle || 'Goal Poacher'}
                          onChange={(e) => updatePlayerPlaystyle(player.id, e.target.value)}
                          className="bg-neutral-950 border border-neutral-700 text-neutral-300 rounded px-2 py-1 text-[10px] focus:outline-none focus:border-cyan-500"
                        >
                          {playstyles.map(ps => (
                            <option key={ps} value={ps}>{ps}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}
      </div>

    </div>
  );
};
