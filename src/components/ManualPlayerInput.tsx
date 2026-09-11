import React, { useState, useMemo } from 'react';
import { 
  UserPlus, 
  Trash2, 
  Search, 
  Sparkles, 
  Shield, 
  Check, 
  Plus, 
  X, 
  Star, 
  ChevronDown,
  Layers,
  Award
} from 'lucide-react';
import { TypedPlayerInput } from '../types.ts';
import { EFOOTBALL_MASTER_PLAYERS, EFootballMasterPlayer } from '../lib/efootballDatabase.ts';

interface ManualPlayerInputProps {
  typedPlayers: TypedPlayerInput[];
  onChange: (players: TypedPlayerInput[]) => void;
}

export const ManualPlayerInput: React.FC<ManualPlayerInputProps> = ({
  typedPlayers,
  onChange
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPosition, setSelectedPosition] = useState<string>('ALL');
  const [selectedCardType, setSelectedCardType] = useState<string>('ALL');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customPos, setCustomPos] = useState('CF');
  const [customRating, setCustomRating] = useState(95);
  const [customCardType, setCustomCardType] = useState('Highlight');

  const positions = ['ALL', 'CF', 'SS', 'LWF', 'RWF', 'AMF', 'CMF', 'DMF', 'LB', 'CB', 'RB', 'GK'];
  const cardTypes = ['ALL', 'Epic', 'Show Time', 'Highlight', 'POTW', 'Standard', 'Legendary', 'Big Time'];

  // Predictive search matching
  const predictiveMatches = useMemo(() => {
    if (!searchQuery.trim() && selectedPosition === 'ALL' && selectedCardType === 'ALL') {
      return EFOOTBALL_MASTER_PLAYERS.slice(0, 12);
    }

    const q = searchQuery.toLowerCase().trim();
    return EFOOTBALL_MASTER_PLAYERS.filter((player) => {
      const matchesText = !q || 
        player.commonName.toLowerCase().includes(q) ||
        player.fullName.toLowerCase().includes(q) ||
        player.club.toLowerCase().includes(q) ||
        player.nationality.toLowerCase().includes(q) ||
        player.aliases.some(a => a.toLowerCase().includes(q));

      const matchesPos = selectedPosition === 'ALL' || 
        player.primaryPosition === selectedPosition ||
        player.secondaryPositions.includes(selectedPosition);

      const matchesCard = selectedCardType === 'ALL' || player.cardType === selectedCardType;

      return matchesText && matchesPos && matchesCard;
    }).slice(0, 16);
  }, [searchQuery, selectedPosition, selectedCardType]);

  const addPlayerFromDatabase = (player: EFootballMasterPlayer) => {
    if (typedPlayers.length >= 23) return;
    
    // Check if already in squad
    if (typedPlayers.some(p => p.id === player.id || p.name.toLowerCase() === player.commonName.toLowerCase())) {
      return;
    }

    const newPlayer: TypedPlayerInput = {
      id: player.id + '_' + Date.now(),
      name: player.commonName,
      position: player.primaryPosition,
      rating: player.maxRating,
      cardType: player.cardType,
      playstyle: player.playstyle,
      club: player.club,
      nationality: player.nationality,
      skills: player.skills
    };

    onChange([...typedPlayers, newPlayer]);
    setSearchQuery('');
    setIsDropdownOpen(false);
  };

  const addCustomPlayer = () => {
    if (!customName.trim() || typedPlayers.length >= 23) return;

    const newPlayer: TypedPlayerInput = {
      id: 'custom_' + Date.now(),
      name: customName.trim(),
      position: customPos,
      rating: Number(customRating) || 90,
      cardType: customCardType,
      playstyle: 'Proficient'
    };

    onChange([...typedPlayers, newPlayer]);
    setCustomName('');
  };

  const removePlayer = (id: string) => {
    onChange(typedPlayers.filter(p => p.id !== id));
  };

  const updatePlayerRating = (id: string, newRating: number) => {
    onChange(typedPlayers.map(p => p.id === id ? { ...p, rating: Math.min(105, Math.max(60, newRating)) } : p));
  };

  const updatePlayerPosition = (id: string, newPosition: string) => {
    onChange(typedPlayers.map(p => p.id === id ? { ...p, position: newPosition } : p));
  };

  const autoFillSampleSquad = () => {
    const sampleIds = [
      'courtois_t', // GK
      'robertson_a', // LB
      'vandijk_v', // CB
      'saliba_w', // CB
      'walker_k', // RB
      'rodri_h', // DMF
      'valverde_f', // CMF
      'de_bruyne_k', // AMF
      'vinicius_j', // LWF
      'mbappe_k', // CF
      'messi_l' // RWF
    ];

    const samplePlayers: TypedPlayerInput[] = sampleIds.map(id => {
      const match = EFOOTBALL_MASTER_PLAYERS.find(p => p.id === id);
      if (!match) {
        return {
          id: 'sample_' + id,
          name: 'Player',
          position: 'CMF',
          rating: 95,
          cardType: 'Highlight'
        };
      }
      return {
        id: match.id + '_' + Date.now(),
        name: match.commonName,
        position: match.primaryPosition,
        rating: match.maxRating,
        cardType: match.cardType,
        playstyle: match.playstyle,
        club: match.club,
        nationality: match.nationality,
        skills: match.skills
      };
    });

    onChange(samplePlayers);
  };

  const clearAllPlayers = () => {
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
        return 'bg-gradient-to-r from-amber-500/30 via-yellow-400/20 to-amber-600/30 text-amber-300 border-amber-400/50 shadow-amber-500/10 shadow-sm';
      case 'Show Time':
        return 'bg-gradient-to-r from-cyan-500/30 via-blue-500/20 to-indigo-500/30 text-cyan-300 border-cyan-400/50 shadow-cyan-500/10 shadow-sm';
      case 'Highlight':
      case 'POTW':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'Legendary':
        return 'bg-yellow-600/20 text-yellow-300 border-yellow-500/40';
      default:
        return 'bg-neutral-800 text-neutral-400 border-neutral-700';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header with Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-950/70 p-4 rounded-xl border border-neutral-800">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Search className="w-4 h-4 text-emerald-400" />
            Type & Predict Squad Players
          </h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            Type any player name. The system instantly auto-predicts cards, card types (Epic, Show Time, Highlight), and overall ratings.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={autoFillSampleSquad}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            Auto-Fill Sample XI
          </button>
          {typedPlayers.length > 0 && (
            <button
              type="button"
              onClick={clearAllPlayers}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Search & Auto-Predict Box */}
      <div className="space-y-3">
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search player (e.g., Mbappé, Haaland, Rodri, Cruyff, Van Dijk, Messi, Bellingham)..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsDropdownOpen(true);
              }}
              onFocus={() => setIsDropdownOpen(true)}
              className="w-full bg-neutral-950 border border-neutral-700 rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-3.5 text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2">
            <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider mr-1">Position:</span>
            {positions.slice(0, 8).map((pos) => (
              <button
                key={pos}
                type="button"
                onClick={() => setSelectedPosition(pos)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-colors ${
                  selectedPosition === pos
                    ? 'bg-emerald-500 text-neutral-950'
                    : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-400'
                }`}
              >
                {pos}
              </button>
            ))}
          </div>

          {/* Autocomplete Predictions Panel */}
          {isDropdownOpen && (
            <div className="mt-2 bg-neutral-900 border border-neutral-800 rounded-xl p-3 shadow-2xl space-y-2 max-h-72 overflow-y-auto z-20">
              <div className="flex items-center justify-between px-2 pb-1 border-b border-neutral-800/80">
                <span className="text-xs font-bold text-neutral-400">
                  Predicted Player Cards ({predictiveMatches.length})
                </span>
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(false)}
                  className="text-neutral-500 hover:text-white text-xs"
                >
                  Close
                </button>
              </div>

              {predictiveMatches.length === 0 ? (
                <div className="p-4 text-center text-xs text-neutral-500">
                  No preset card found for "{searchQuery}". You can add a custom player below.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {predictiveMatches.map((player) => {
                    const isAdded = typedPlayers.some(p => p.name.toLowerCase() === player.commonName.toLowerCase());
                    return (
                      <div
                        key={player.id}
                        onClick={() => !isAdded && addPlayerFromDatabase(player)}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                          isAdded
                            ? 'bg-neutral-950/40 border-neutral-800/60 opacity-60 cursor-not-allowed'
                            : 'bg-neutral-950 hover:bg-neutral-800/80 border-neutral-800 hover:border-emerald-500/60 cursor-pointer group'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Position Badge */}
                          <span className={`px-2 py-1 rounded-md text-[11px] font-black border shrink-0 ${getPositionColor(player.primaryPosition)}`}>
                            {player.primaryPosition}
                          </span>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-white truncate group-hover:text-emerald-400 transition-colors">
                                {player.commonName}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-neutral-400">
                              <span className={`px-1.5 py-0.2 rounded border text-[9px] font-bold ${getCardTypeBadgeStyle(player.cardType)}`}>
                                {player.cardType}
                              </span>
                              <span className="truncate">{player.club}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className="text-xs font-black text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                            {player.maxRating} OVR
                          </span>
                          {isAdded ? (
                            <span className="p-1 rounded-md bg-emerald-500/20 text-emerald-400">
                              <Check className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="p-1 rounded-md bg-neutral-800 text-neutral-400 group-hover:bg-emerald-500 group-hover:text-neutral-950 transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Manual / Custom Player Entry Form */}
      <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-xl p-4 space-y-3">
        <span className="text-xs font-bold text-neutral-400 block">
          Can't find a player? Add custom card:
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          <input
            type="text"
            placeholder="Player Name (e.g., Ronaldinho, Pedri)"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            className="sm:col-span-4 bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
          />
          <select
            value={customPos}
            onChange={(e) => setCustomPos(e.target.value)}
            className="sm:col-span-2 bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            {positions.filter(p => p !== 'ALL').map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <select
            value={customCardType}
            onChange={(e) => setCustomCardType(e.target.value)}
            className="sm:col-span-3 bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            {cardTypes.filter(c => c !== 'ALL').map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <input
            type="number"
            min="60"
            max="105"
            placeholder="Rating (OVR)"
            value={customRating}
            onChange={(e) => setCustomRating(Number(e.target.value))}
            className="sm:col-span-2 bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 text-center"
          />
          <button
            type="button"
            onClick={addCustomPlayer}
            disabled={!customName.trim()}
            className={`sm:col-span-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center transition-colors ${
              customName.trim()
                ? 'bg-emerald-500 hover:bg-emerald-400 text-neutral-950'
                : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
            }`}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Selected Squad List Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Selected Squad ({typedPlayers.length} / 23 players)
            </span>
            {typedPlayers.length >= 11 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Full Starting XI Ready
              </span>
            )}
          </div>
          <span className="text-xs text-neutral-500">
            {typedPlayers.length < 11 ? `Add ${11 - typedPlayers.length} more for full Starting XI` : 'Substitutes allowed up to 23'}
          </span>
        </div>

        {typedPlayers.length === 0 ? (
          <div className="border border-dashed border-neutral-800 rounded-xl p-8 text-center bg-neutral-950/40 space-y-2">
            <UserPlus className="w-8 h-8 text-neutral-600 mx-auto" />
            <p className="text-xs text-neutral-400">
              No players added yet. Type player names in the search box above or click "Auto-Fill Sample XI".
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {typedPlayers.map((player, idx) => (
              <div
                key={player.id}
                className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-3 flex items-center justify-between gap-2 shadow-sm hover:border-neutral-700 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-[10px] font-bold text-neutral-500 w-4 text-right shrink-0">
                    {idx + 1}.
                  </span>

                  {/* Editable Position */}
                  <select
                    value={player.position}
                    onChange={(e) => updatePlayerPosition(player.id, e.target.value)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-black border cursor-pointer ${getPositionColor(player.position)}`}
                  >
                    {positions.filter(p => p !== 'ALL').map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>

                  <div className="min-w-0">
                    <span className="text-xs font-bold text-white block truncate">
                      {player.name}
                    </span>
                    <span className={`inline-block px-1.5 py-0.2 rounded border text-[9px] font-bold ${getCardTypeBadgeStyle(player.cardType)}`}>
                      {player.cardType || 'Highlight'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Rating Input */}
                  <div className="flex items-center gap-1 bg-neutral-950 px-2 py-1 rounded-lg border border-neutral-800">
                    <input
                      type="number"
                      min="60"
                      max="105"
                      value={player.rating}
                      onChange={(e) => updatePlayerRating(player.id, Number(e.target.value))}
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
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
