import React, { useState, useMemo } from 'react';
import { 
  X, 
  Search, 
  Sparkles, 
  ExternalLink, 
  CheckCircle2, 
  Award,
  Zap,
  Filter,
  Shield,
  Layers,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { 
  getAllEfhubCardsForPlayer,
  EFootballMasterPlayer, 
  normalizeString 
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
    'Big Time',
    'Epic',
    'Show Time',
    'Highlight',
    'POTW',
    'Standard'
  ];

  // Search & Filtered eFHUB Cards using getAllEfhubCardsForPlayer
  const filteredCards = useMemo(() => {
    let result = getAllEfhubCardsForPlayer(searchQuery);

    // Apply Position Filter
    if (selectedPosFilter !== 'ALL') {
      result = result.filter(player => {
        const isPrimary = player.primaryPosition === selectedPosFilter;
        const isSecondary = (player.secondaryPositions || []).includes(selectedPosFilter);
        return isPrimary || isSecondary;
      });
    }

    // Apply Card Type Filter
    if (selectedCardTypeFilter !== 'ALL') {
      const filterLower = selectedCardTypeFilter.toLowerCase();
      result = result.filter(player => {
        const pCardLower = (player.cardType || '').toLowerCase();
        return pCardLower.includes(filterLower);
      });
    }

    return result;
  }, [searchQuery, selectedPosFilter, selectedCardTypeFilter]);

  if (!isOpen) return null;

  // eFHUB Card Frame Theme Styling
  const getCardFrameStyle = (cardType?: string) => {
    if (!cardType) return 'bg-neutral-950 border-neutral-800';
    const lower = cardType.toLowerCase();
    if (lower.includes('big time') || lower.includes('legendary')) {
      return 'bg-gradient-to-br from-purple-950/70 via-neutral-950 to-indigo-950/60 border-2 border-purple-500/80 shadow-[0_0_20px_rgba(168,85,247,0.25)]';
    }
    if (lower.includes('epic')) {
      return 'bg-gradient-to-br from-amber-950/70 via-neutral-950 to-yellow-950/50 border-2 border-amber-500/80 shadow-[0_0_20px_rgba(245,158,11,0.25)]';
    }
    if (lower.includes('show time') || lower.includes('showtime')) {
      return 'bg-gradient-to-br from-cyan-950/70 via-neutral-950 to-teal-950/50 border-2 border-cyan-400/80 shadow-[0_0_20px_rgba(6,182,212,0.25)]';
    }
    if (lower.includes('potw') || lower.includes('potd') || lower.includes('pots')) {
      return 'bg-gradient-to-br from-emerald-950/70 via-neutral-950 to-green-950/50 border-2 border-emerald-500/80 shadow-[0_0_18px_rgba(16,185,129,0.25)]';
    }
    if (lower.includes('highlight') || lower.includes('featured')) {
      return 'bg-gradient-to-br from-blue-950/70 via-neutral-950 to-slate-950/50 border-2 border-blue-500/80 shadow-[0_0_18px_rgba(59,130,246,0.2)]';
    }
    return 'bg-neutral-950 border border-neutral-800 hover:border-neutral-700';
  };

  const getCardTypeBadgeStyle = (cardType?: string) => {
    if (!cardType) return 'bg-neutral-800 text-neutral-300';
    const lower = cardType.toLowerCase();
    if (lower.includes('big time') || lower.includes('legendary')) {
      return 'bg-gradient-to-r from-purple-500 to-indigo-400 text-white font-black';
    }
    if (lower.includes('epic')) {
      return 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-neutral-950 font-black';
    }
    if (lower.includes('show time') || lower.includes('showtime')) {
      return 'bg-gradient-to-r from-cyan-400 to-teal-300 text-neutral-950 font-black';
    }
    if (lower.includes('potw') || lower.includes('potd') || lower.includes('pots')) {
      return 'bg-gradient-to-r from-emerald-400 to-green-300 text-neutral-950 font-black';
    }
    if (lower.includes('highlight') || lower.includes('featured')) {
      return 'bg-gradient-to-r from-blue-500 to-sky-400 text-white font-black';
    }
    return 'bg-neutral-800 text-neutral-300 font-bold';
  };

  const getPosBadgeColor = (pos: string) => {
    switch (pos) {
      case 'GK': return 'text-amber-300 bg-amber-500/20 border-amber-500/40 font-black';
      case 'CB':
      case 'LB':
      case 'RB':
      case 'LWB':
      case 'RWB': return 'text-cyan-300 bg-cyan-500/20 border-cyan-500/40 font-black';
      case 'DMF':
      case 'CMF':
      case 'AMF':
      case 'LMF':
      case 'RMF': return 'text-emerald-300 bg-emerald-500/20 border-emerald-500/40 font-black';
      case 'CF':
      case 'SS':
      case 'LWF':
      case 'RWF': return 'text-rose-300 bg-rose-500/20 border-rose-500/40 font-black';
      default: return 'text-neutral-300 bg-neutral-800 border-neutral-700 font-bold';
    }
  };

  const getStatBadgeColor = (val: number) => {
    if (val >= 90) return 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-black';
    if (val >= 80) return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold';
    if (val >= 70) return 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold';
    return 'bg-neutral-900 text-neutral-400 border-neutral-800';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-neutral-800 bg-gradient-to-r from-neutral-900 via-neutral-900 to-emerald-950/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-neutral-950 font-bold shadow-lg shadow-emerald-500/20">
              <Zap className="w-5 h-5 fill-neutral-950" />
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-black text-white tracking-tight">
                  Official eFHUB Card Database Search
                </h3>
                <a 
                  href="https://efhub.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 flex items-center gap-1 transition-colors"
                >
                  <span>efhub.com</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Search any player to view all official card editions (Big Time, Epic, Show Time, POTW, Highlight). Selecting a card automatically imports full stats & skills for {targetRoleLabel}.
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
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search player name (e.g. Messi, Mbappé, Haaland, Ronaldo, Yamal, Rodri, Bellingham, Neymar, Suarez, Van Dijk, Cruyff)..."
              className="w-full bg-neutral-900 border border-neutral-700 rounded-xl pl-10 pr-20 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition-colors"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded bg-neutral-800 text-[10px] font-bold text-neutral-400 hover:text-white"
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
        <div className="p-4 overflow-y-auto flex-1 space-y-4 max-h-[60vh]">
          {filteredCards.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-neutral-800 rounded-2xl bg-neutral-950/40 space-y-3">
              <Search className="w-10 h-10 text-neutral-600 mx-auto" />
              <p className="text-sm font-bold text-neutral-300">
                No matching eFHUB player card found for "{searchQuery}"
              </p>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                Try searching for star names like "Messi", "Mbappe", "Ronaldo", "Haaland", "Yamal", "Rodri", or reset filters.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredCards.map((player) => {
                const isExpanded = expandedCardId === player.id;
                const efhubUrl = player.efhubUrl || `https://efhub.com/25/players/${player.id}/`;

                return (
                  <div
                    key={player.id}
                    className={`rounded-2xl p-4 flex flex-col justify-between space-y-3 transition-all duration-200 shadow-xl relative overflow-hidden group ${getCardFrameStyle(player.cardType)}`}
                  >
                    
                    {/* Top Shield Header: OVR, Position, Card Type Badge */}
                    <div>
                      <div className="flex items-center justify-between pb-2.5 border-b border-neutral-800/80">
                        
                        {/* Rating & Position Block */}
                        <div className="flex items-center gap-2">
                          <div className="flex items-baseline gap-1 bg-neutral-950/90 px-2.5 py-1 rounded-xl border border-neutral-800">
                            <span className="text-2xl font-black text-amber-400 leading-none">
                              {player.maxRating}
                            </span>
                            <span className="text-[9px] font-extrabold text-neutral-400 uppercase">
                              OVR
                            </span>
                          </div>

                          {/* Primary Position */}
                          <span className={`px-2.5 py-1 rounded-xl text-xs border ${getPosBadgeColor(player.primaryPosition)}`}>
                            {player.primaryPosition}
                          </span>

                          {/* Secondary Positions */}
                          {player.secondaryPositions && player.secondaryPositions.length > 0 && (
                            <div className="hidden sm:flex items-center gap-1">
                              {player.secondaryPositions.slice(0, 3).map(sp => (
                                <span key={sp} className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-neutral-900/90 text-neutral-300 border border-neutral-800">
                                  {sp}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Card Type Badge */}
                        <span className={`px-2.5 py-1 rounded-xl text-[10px] uppercase shadow-md ${getCardTypeBadgeStyle(player.cardType)}`}>
                          {player.cardType}
                        </span>

                      </div>

                      {/* Main Player Title & Special Edition Info */}
                      <div className="mt-3 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="text-base font-black text-white group-hover:text-amber-300 transition-colors">
                              {player.fullName}
                            </h4>
                            {player.cardTitle && (
                              <p className="text-[11px] font-bold text-cyan-300/90">
                                🏆 {player.cardTitle}
                              </p>
                            )}
                            <p className="text-xs font-semibold text-neutral-400 mt-0.5">
                              {player.club} • {player.nationality}
                            </p>
                          </div>

                          {player.boosterName && (
                            <span className="px-2 py-0.5 rounded-lg text-[9px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                              {player.boosterName}
                            </span>
                          )}
                        </div>

                        <div className="pt-1 flex items-center gap-2 text-xs">
                          <span className="text-emerald-400 font-bold">
                            Style: <span className="text-neutral-200 font-medium">{player.playstyle}</span>
                          </span>
                        </div>
                      </div>

                      {/* eFHUB Key Attribute Stats Grid */}
                      {player.keyAttributes && Object.keys(player.keyAttributes).length > 0 && (
                        <div className="mt-3 bg-neutral-950/90 border border-neutral-800/80 p-3 rounded-xl space-y-2">
                          <div className="flex items-center justify-between text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                            <span>Key eFHUB Attribute Stats</span>
                            <span className="text-emerald-400 flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              Original Card Sheet
                            </span>
                          </div>

                          <div className="grid grid-cols-4 gap-1.5">
                            {Object.entries(player.keyAttributes).slice(0, 8).map(([attr, val]) => (
                              <div key={attr} className={`px-2 py-1 rounded text-center border ${getStatBadgeColor(val)}`}>
                                <span className="text-[8px] block font-extrabold uppercase truncate opacity-80">{attr.replace(/([A-Z])/g, ' $1').trim()}</span>
                                <span className="text-xs font-black">{val}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Expandable Full Card Stats Sheet & Skills */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-neutral-800 space-y-3 text-xs animate-fade-in">
                          
                          {/* All Attributes Grid */}
                          <div>
                            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">
                              Complete Player Attribute Ratings:
                            </span>
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                              {Object.entries(player.keyAttributes).map(([attr, val]) => (
                                <div key={attr} className={`px-2 py-1 rounded text-center border ${getStatBadgeColor(val)}`}>
                                  <span className="text-[8px] block font-extrabold uppercase truncate opacity-80">{attr.replace(/([A-Z])/g, ' $1').trim()}</span>
                                  <span className="text-xs font-black">{val}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Skills List */}
                          {player.skills && player.skills.length > 0 && (
                            <div>
                              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                                Player Skills ({player.skills.length}):
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {player.skills.map((s, idx) => (
                                  <span key={idx} className="px-2 py-0.5 rounded text-[10px] bg-neutral-900 text-neutral-300 border border-neutral-800 font-medium">
                                    {s}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* eFHUB Direct Link */}
                          <div className="flex items-center justify-between text-[11px] bg-neutral-950 p-2.5 rounded-xl border border-neutral-800">
                            <span className="text-neutral-400 font-medium">View original eFHUB card page:</span>
                            <a
                              href={efhubUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span>efhub.com card link</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>

                        </div>
                      )}

                    </div>

                    {/* Bottom Action Bar */}
                    <div className="flex items-center gap-2 pt-2 border-t border-neutral-800/80">
                      <button
                        type="button"
                        onClick={() => setExpandedCardId(isExpanded ? null : player.id)}
                        className="px-3 py-2 rounded-xl text-xs font-bold text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 transition-colors flex items-center gap-1"
                      >
                        <span>{isExpanded ? 'Hide Stats' : 'Full Card Stats'}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onSelectPlayer(player);
                          onClose();
                        }}
                        className="flex-1 py-2 px-4 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-neutral-950 flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4 fill-neutral-950" />
                        Select This eFHUB Card
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-neutral-950 border-t border-neutral-800 text-xs text-neutral-400 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            Showing {filteredCards.length} eFHUB player card options
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
