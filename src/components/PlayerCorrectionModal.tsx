import React, { useState, useMemo } from 'react';
import { PlayerData } from '../types.ts';
import { EFOOTBALL_MASTER_PLAYERS, searchMasterPlayers } from '../lib/efootballDatabase.ts';
import { X, Search, Check, AlertTriangle, ShieldCheck, Sparkles, User, Sliders } from 'lucide-react';

interface PlayerCorrectionModalProps {
  player: PlayerData | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveCorrection: (updatedPlayer: PlayerData) => void;
}

const POSITIONS = ['GK', 'CB', 'LB', 'RB', 'DMF', 'CMF', 'AMF', 'LWF', 'RWF', 'SS', 'CF'];

const PLAYSTYLES = [
  'Goal Poacher',
  'Fox in the Box',
  'Target Man',
  'Deep-Lying Forward',
  'Prolific Winger',
  'Roaming Flank',
  'Creative Playmaker',
  'Hole Player',
  'Box-to-Box',
  'Orchestrator',
  'Anchor Man',
  'The Destroyer',
  'Build Up',
  'Extra Frontman',
  'Offensive Fullback',
  'Defensive Fullback',
  'Fullback Finisher',
  'Offensive Goalkeeper',
  'Defensive Goalkeeper',
  'Classic No. 10'
];

const CARD_TYPES = ['Epic', 'Highlight', 'Standard', 'POTW', 'Show Time', 'Big Time', 'Legendary'];

export const PlayerCorrectionModal: React.FC<PlayerCorrectionModalProps> = ({
  player,
  isOpen,
  onClose,
  onSaveCorrection
}) => {
  if (!isOpen || !player) return null;

  const [searchQuery, setSearchQuery] = useState('');
  const [name, setName] = useState(player.name.replace(/^Unidentified Player.*$/, ''));
  const [position, setPosition] = useState(player.position || 'CMF');
  const [rating, setRating] = useState(player.rating || 90);
  const [playstyle, setPlaystyle] = useState(player.playstyle || 'Box-to-Box');
  const [playerType, setPlayerType] = useState(player.playerType || 'Highlight');
  const [notes, setNotes] = useState(player.roleExplanation || '');

  // Instant fuzzy suggestions from eFootball master database
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) {
      // Default to top players in the same position
      return EFOOTBALL_MASTER_PLAYERS.filter((p) => p.primaryPosition === position).slice(0, 6);
    }
    return searchMasterPlayers(searchQuery, 8);
  }, [searchQuery, position]);

  const handleSelectMasterPlayer = (p: typeof EFOOTBALL_MASTER_PLAYERS[0]) => {
    setName(p.commonName);
    setPosition(p.primaryPosition);
    setRating(p.maxRating);
    setPlaystyle(p.playstyle);
    setPlayerType(p.cardType);
  };

  const handleSave = () => {
    const finalName = name.trim() || `Player (${position}, ${rating})`;
    const updated: PlayerData = {
      ...player,
      name: finalName,
      position,
      rating: Number(rating) || 85,
      playstyle,
      playerType,
      confidence: 'High',
      confidenceScore: 100,
      identityStatus: 'user_corrected',
      isUnidentified: false,
      userConfirmed: true,
      roleExplanation: notes.trim() || `User manually verified and confirmed identity as ${finalName}.`,
      evidence: [
        ...(player.evidence || []),
        {
          stage: 'Manual User Verification',
          score: 100,
          description: `User manually confirmed identity as ${finalName} (${position}, ${rating} OVR, ${playstyle}).`,
          verified: true
        }
      ]
    };

    onSaveCorrection(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-sm overflow-y-auto">
      <div 
        id="player-correction-modal"
        className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-700 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-neutral-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                <Sliders className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-black text-white">
                Correct Player Identity
              </h2>
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              Override or refine the AI's detection with a verified player from the official database.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Detection Info */}
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">
              Original AI Detection
            </span>
            <p className="text-sm font-bold text-neutral-200">
              {player.name} · {player.position} · {player.rating} OVR
            </p>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
            player.confidenceScore && player.confidenceScore >= 85
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : player.confidenceScore && player.confidenceScore >= 60
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
          }`}>
            {player.confidenceScore ? `${player.confidenceScore}% Confidence` : player.confidence}
          </span>
        </div>

        {/* Database Fast Search */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5 text-emerald-400" />
            Search eFootball Master Database
          </label>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by player name (e.g. Mbappé, Haaland, Rodri, Bellingham)..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-700 text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-emerald-500"
            />
            <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3.5" />
          </div>

          {/* Master Player Quick Suggestions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 max-h-48 overflow-y-auto pr-1">
            {searchResults.map((masterP) => (
              <button
                key={masterP.id}
                type="button"
                onClick={() => handleSelectMasterPlayer(masterP)}
                className="text-left p-2.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 hover:border-emerald-500/50 transition-all flex items-center justify-between group"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-neutral-800 text-emerald-400">
                      {masterP.primaryPosition}
                    </span>
                    <span className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">
                      {masterP.commonName}
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-400 block mt-0.5">
                    {masterP.playstyle} · {masterP.cardType}
                  </span>
                </div>
                <span className="text-xs font-black text-emerald-400 bg-neutral-900 px-2 py-1 rounded-lg">
                  {masterP.maxRating}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Manual Editable Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-neutral-800">
          <div>
            <label className="text-xs font-bold text-neutral-300 block mb-1">
              Player Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-700 text-white text-sm focus:outline-none focus:border-emerald-500"
              placeholder="e.g. K. De Bruyne"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-neutral-300 block mb-1">
              Position
            </label>
            <select
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-700 text-white text-sm focus:outline-none focus:border-emerald-500"
            >
              {POSITIONS.map((pos) => (
                <option key={pos} value={pos}>
                  {pos}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-neutral-300 block mb-1">
              Overall Rating ({rating})
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="70"
                max="105"
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
                className="flex-1 accent-emerald-500"
              />
              <input
                type="number"
                min="70"
                max="105"
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
                className="w-16 px-2 py-1 rounded-lg bg-neutral-950 border border-neutral-700 text-white text-sm text-center font-bold"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-neutral-300 block mb-1">
              Playstyle
            </label>
            <select
              value={playstyle}
              onChange={(e) => setPlaystyle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-700 text-white text-sm focus:outline-none focus:border-emerald-500"
            >
              {PLAYSTYLES.map((ps) => (
                <option key={ps} value={ps}>
                  {ps}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-neutral-300 block mb-1">
              Card Type
            </label>
            <select
              value={playerType}
              onChange={(e) => setPlayerType(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-700 text-white text-sm focus:outline-none focus:border-emerald-500"
            >
              {CARD_TYPES.map((ct) => (
                <option key={ct} value={ct}>
                  {ct}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-neutral-300 block mb-1">
              Tactical Role Note
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Primary deep playmaker"
              className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-700 text-white text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-xs transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-emerald-500/20"
          >
            <Check className="w-4 h-4" />
            Save Correction & Re-sync Squad
          </button>
        </div>
      </div>
    </div>
  );
};
