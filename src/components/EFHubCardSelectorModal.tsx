import React, { useState, useMemo } from 'react';
import { 
  X, 
  Search, 
  Sparkles, 
  ExternalLink, 
  CheckCircle2, 
  ShieldAlert, 
  Award,
  Zap,
  Filter
} from 'lucide-react';
import { 
  EFOOTBALL_MASTER_PLAYERS, 
  EFootballMasterPlayer, 
  normalizeString, 
  stringSimilarity 
} from '../lib/efootballDatabase.ts';

interface EFHubCardSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlayer: (player: EFootballMasterPlayer) => void;
  targetRoleLabel?: string; // e.g. "Squad Player", "Starting XI Player", "Substitute Player"
}

export const EFHubCardSelectorModal: React.FC<EFHubCardSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelectPlayer,
  targetRoleLabel = "Player"
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPosFilter, setSelectedPosFilter] = useState<string>('ALL');
  const [selectedCardTypeFilter, setSelectedCardTypeFilter] = useState<string>('ALL');
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  const positionFilterOptions = ['ALL', 'CF', 'SS', 'LWF', 'RWF', 'AMF', 'CMF', 'DMF', 'LMF', 'RMF', 'LB', 'CB', 'RB', 'GK'];
  
  const cardTypeFilterOptions = [
    'ALL',
    'Epic',
    'Show Time',
    'Highlight',
    'POTW',
    'Big Time',
    'Legendary',
    'Standard'
  ];

  // Search & Filtered eFHUB Cards
  const filteredCards = useMemo(() => {
    const query = normalizeString(searchQuery.trim());

    let result = EFOOTBALL_MASTER_PLAYERS.filter(player => {
      // Position Filter
      if (selectedPosFilter !== 'ALL') {
        const isPrimary = player.primaryPosition === selectedPosFilter;
        const isSecondary = player.secondaryPositions.includes(selectedPosFilter);
        if (!isPrimary && !isSecondary) return false;
      }

      // Card Type Filter
      if (selectedCardTypeFilter !== 'ALL') {
        const playerCardLower = (player.cardType || '').toLowerCase();
        const filterLower = selectedCardTypeFilter.toLowerCase();
        if (!playerCardLower.includes(filterLower)) return false;
      }

      // Text Query Match
      if (!query) return true;

      const normName = normalizeString(player.fullName);
      const normCommon = normalizeString(player.commonName);
      const normClub = normalizeString(player.club);
      const normNat = normalizeString(player.nationality);
      const normPlaystyle = normalizeString(player.playstyle);

      if (
        normName.includes(query) ||
        normCommon.includes(query) ||
        normClub.includes(query) ||
        normNat.includes(query) ||
        normPlaystyle.includes(query)
      ) {
        return true;
      }

      // Alias check
      return player.aliases.some(a => normalizeString(a).includes(query));
    });

    // If query was typed, rank by similarity
    if (query) {
      result = result.map(player => {
        let maxSim = Math.max(
          stringSimilarity(query, player.commonName),
          stringSimilarity(query, player.fullName)
        );
        for (const alias of player.aliases) {
          maxSim = Math.max(maxSim, stringSimilarity(query, alias));
        }
        return { player, sim: maxSim };
      })
      .sort((a, b) => b.sim - a.sim)
      .map(item => item.player);
    }

    return result;
  }, [searchQuery, selectedPosFilter, selectedCardTypeFilter]);

  if (!isOpen) return null;

  const getCardTypeBadgeStyle = (cardType?: string) => {
    if (!cardType) return 'bg-neutral-800 text-neutral-300 border-neutral-700';
    const lower = cardType.toLowerCase();
    if (lower.includes('epic')) return 'bg-amber-950/80 text-amber-300 border-amber-500/60 ring-1 ring-amber-500/30';
    if (lower.includes('show time') || lower.includes('showtime')) return 'bg-cyan-950/80 text-cyan-300 border-cyan-500/60 ring-1 ring-cyan-500/30';
    if (lower.includes('potw') || lower.includes('potd') || lower.includes('pots')) return 'bg-emerald-950/80 text-emerald-300 border-emerald-500/60 ring-1 ring-emerald-500/30';
    if (lower.includes('big time') || lower.includes('legendary')) return 'bg-purple-950/80 text-purple-300 border-purple-500/60 ring-1 ring-purple-500/30';
    if (lower.includes('highlight') || lower.includes('featured')) return 'bg-blue-950/80 text-blue-300 border-blue-500/60 ring-1 ring-blue-500/30';
    return 'bg-neutral-900 text-neutral-300 border-neutral-700';
  };

  const getPosBadgeColor = (pos: string) => {
    switch (pos) {
      case 'GK': return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'CB':
      case 'LB':
      case 'RB': return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
      case 'DMF':
      case 'CMF':
      case 'AMF':
      case 'LMF':
      case 'RMF': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'CF':
      case 'SS':
      case 'LWF':
      case 'RWF': return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
      default: return 'text-neutral-400 bg-neutral-800 border-neutral-700';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-neutral-800 bg-gradient-to-r from-neutral-900 via-neutral-900 to-emerald-950/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Zap className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white">
                  Select Card from eFHUB Database
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  https://efhub.com/
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Search official eFootball card database to auto-import original stats, secondary positions & skills for {targetRoleLabel}.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar & Filters */}
        <div className="p-4 bg-neutral-950 border-b border-neutral-800 space-y-3">
          
          {/* Query Input */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search player by name (e.g. Mbappe, Messi, Haaland, Yamal, Rodri), club, or nationality..."
              className="w-full bg-neutral-900 border border-neutral-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition-colors"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-500 hover:text-neutral-300"
              >
                Clear
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1 text-xs">
            
            {/* Position Filter */}
            <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto py-1 scrollbar-none">
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider shrink-0 flex items-center gap-1 mr-1">
                <Filter className="w-3 h-3 text-emerald-400" />
                Pos:
              </span>
              {positionFilterOptions.map(p => (
                <button
                  key={p}
                  onClick={() => setSelectedPosFilter(p)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-colors shrink-0 ${
                    selectedPosFilter === p
                      ? 'bg-emerald-500 text-neutral-950 font-black border-emerald-400 shadow-sm'
                      : 'bg-neutral-900 text-neutral-400 hover:text-white border-neutral-800'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Card Type Filter */}
            <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto py-1 scrollbar-none">
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider shrink-0 mr-1">
                Theme:
              </span>
              {cardTypeFilterOptions.map(ct => (
                <button
                  key={ct}
                  onClick={() => setSelectedCardTypeFilter(ct)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-colors shrink-0 ${
                    selectedCardTypeFilter === ct
                      ? 'bg-purple-500 text-white font-black border-purple-400 shadow-sm'
                      : 'bg-neutral-900 text-neutral-400 hover:text-white border-neutral-800'
                  }`}
                >
                  {ct}
                </button>
              ))}
            </div>

          </div>

        </div>

        {/* Cards Result Grid */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3 max-h-[58vh]">
          {filteredCards.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-neutral-800 rounded-2xl bg-neutral-950/40 space-y-3">
              <Search className="w-10 h-10 text-neutral-600 mx-auto" />
              <p className="text-sm font-bold text-neutral-300">
                No matching eFHUB player card found
              </p>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                Try searching for common names like "Mbappe", "Messi", "Rodri", "Vinicius", or clear your position/card filters.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredCards.map((player) => {
                const isExpanded = expandedCardId === player.id;
                const efhubUrl = player.efhubUrl || `https://efhub.com/25/players/${player.id}/`;

                return (
                  <div
                    key={player.id}
                    className="bg-neutral-950 border border-neutral-800 hover:border-emerald-500/50 rounded-2xl p-4 flex flex-col justify-between space-y-3 transition-all duration-200 shadow-lg group"
                  >
                    <div>
                      {/* Top Bar: Position, Card Type, OVR */}
                      <div className="flex items-center justify-between pb-2 border-b border-neutral-800/80">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Primary Pos */}
                          <span className={`px-2 py-0.5 rounded text-[11px] font-black border ${getPosBadgeColor(player.primaryPosition)}`}>
                            {player.primaryPosition}
                          </span>
                          
                          {/* Secondary Playable Positions */}
                          {player.secondaryPositions && player.secondaryPositions.length > 0 && (
                            <div className="flex items-center gap-1">
                              <span className="text-[9px] text-neutral-500 font-bold">ALT:</span>
                              {player.secondaryPositions.map(sp => (
                                <span key={sp} className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  {sp}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Card Type Badge */}
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${getCardTypeBadgeStyle(player.cardType)}`}>
                          {player.cardType}
                        </span>
                      </div>

                      {/* Main Player Info */}
                      <div className="flex items-start justify-between gap-3 mt-3">
                        <div>
                          <h4 className="text-base font-black text-white group-hover:text-emerald-300 transition-colors">
                            {player.fullName}
                          </h4>
                          <p className="text-xs font-semibold text-neutral-400 mt-0.5">
                            {player.club} • {player.nationality}
                          </p>
                          <p className="text-[11px] text-emerald-400 font-bold mt-1">
                            Playstyle: <span className="text-neutral-200 font-medium">{player.playstyle}</span>
                          </p>
                        </div>

                        {/* OVR Rating Pill */}
                        <div className="text-right shrink-0 bg-neutral-900 border border-neutral-800 p-2 rounded-xl">
                          <span className="text-xl font-black text-amber-400 leading-none">
                            {player.maxRating}
                          </span>
                          <span className="block text-[8px] text-neutral-500 uppercase font-black tracking-wider mt-0.5">
                            Max OVR
                          </span>
                        </div>
                      </div>

                      {/* Key Stats Preview */}
                      {player.keyAttributes && Object.keys(player.keyAttributes).length > 0 && (
                        <div className="mt-3 bg-neutral-900/90 border border-neutral-800/80 p-2.5 rounded-xl space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                            <span>Key Untrained Attributes</span>
                            <span className="text-emerald-400">eFHUB Card Data</span>
                          </div>
                          <div className="grid grid-cols-3 gap-1.5 pt-1">
                            {Object.entries(player.keyAttributes).slice(0, 6).map(([attr, val]) => (
                              <div key={attr} className="bg-neutral-950 px-2 py-1 rounded text-center border border-neutral-800/60">
                                <span className="text-[9px] text-neutral-400 block font-medium truncate">{attr}</span>
                                <span className="text-xs font-black text-amber-300">{val}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Expand Details (Skills & All Stats) */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-neutral-800/80 space-y-3 animate-fade-in text-xs">
                          {/* Skills List */}
                          {player.skills && player.skills.length > 0 && (
                            <div>
                              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                                Player Skills ({player.skills.length}):
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {player.skills.map((s, idx) => (
                                  <span key={idx} className="px-1.5 py-0.5 rounded text-[10px] bg-neutral-900 text-neutral-300 border border-neutral-800">
                                    {s}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* eFHUB Direct Link */}
                          <div className="flex items-center justify-between text-[11px] bg-neutral-900 p-2 rounded-xl border border-neutral-800">
                            <span className="text-neutral-400 font-medium">Original eFHUB database card link:</span>
                            <a
                              href={efhubUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span>View on efhub.com</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bottom Action Buttons */}
                    <div className="flex items-center gap-2 pt-2 border-t border-neutral-800/80">
                      <button
                        type="button"
                        onClick={() => setExpandedCardId(isExpanded ? null : player.id)}
                        className="px-3 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 transition-colors"
                      >
                        {isExpanded ? 'Hide Details' : 'Full Card Stats'}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onSelectPlayer(player);
                          onClose();
                        }}
                        className="flex-1 py-2 px-4 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Select Exact eFHUB Card
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-4 bg-neutral-950 border-t border-neutral-800 text-xs text-neutral-400 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            Showing {filteredCards.length} verified eFootball card records
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-bold bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 transition-colors"
          >
            Cancel
          </button>
        </div>

      </div>
    </div>
  );
};
