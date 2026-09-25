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
  LayoutGrid,
  List,
  ArrowUpDown,
  SlidersHorizontal,
  Info,
  Eye,
  Check,
  ChevronRight
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
  targetRoleLabel = "Squad Player"
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'FW' | 'MF' | 'DF' | 'GK'>('ALL');
  const [selectedPosFilter, setSelectedPosFilter] = useState<string>('ALL');
  const [selectedCardTypeFilter, setSelectedCardTypeFilter] = useState<string>('ALL');
  const [selectedPlaystyleFilter, setSelectedPlaystyleFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'maxRating_desc' | 'baseRating_desc' | 'name_asc'>('maxRating_desc');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [inspectingPlayer, setInspectingPlayer] = useState<EFootballMasterPlayer | null>(null);

  // Position Definitions
  const fwPositions = ['CF', 'SS', 'LWF', 'RWF'];
  const mfPositions = ['AMF', 'CMF', 'DMF', 'LMF', 'RMF'];
  const dfPositions = ['CB', 'LB', 'RB', 'LWB', 'RWB'];
  const gkPositions = ['GK'];

  const allPositions = ['ALL', ...fwPositions, ...mfPositions, ...dfPositions, ...gkPositions];

  const cardTypeFilterOptions = [
    'ALL',
    'Big Time',
    'Epic',
    'Show Time',
    'Highlight',
    'POTW',
    'Standard'
  ];

  const playstyleFilterOptions = [
    'ALL',
    'Goal Poacher',
    'Fox in the Box',
    'Target Man',
    'Deep-Lying Forward',
    'Creative Playmaker',
    'Hole Player',
    'Box-to-Box',
    'Anchor Man',
    'The Destroyer',
    'Orchestrator',
    'Prolific Winger',
    'Roaming Flank',
    'Cross Specialist',
    'Build Up',
    'Extra Frontman',
    'Offensive Fullback',
    'Defensive Fullback',
    'Fullback Finisher',
    'Offensive Goalkeeper',
    'Defensive Goalkeeper'
  ];

  // Search & Filtered eFHUB Cards using getAllEfhubCardsForPlayer
  const filteredCards = useMemo(() => {
    let result = getAllEfhubCardsForPlayer(searchQuery);

    // Apply Category Filter (FW, MF, DF, GK)
    if (categoryFilter !== 'ALL') {
      result = result.filter(player => {
        const pos = player.primaryPosition;
        if (categoryFilter === 'FW') return fwPositions.includes(pos);
        if (categoryFilter === 'MF') return mfPositions.includes(pos);
        if (categoryFilter === 'DF') return dfPositions.includes(pos);
        if (categoryFilter === 'GK') return gkPositions.includes(pos);
        return true;
      });
    }

    // Apply Specific Position Filter
    if (selectedPosFilter !== 'ALL') {
      result = result.filter(player => {
        const isPrimary = player.primaryPosition === selectedPosFilter;
        const isSecondary = (player.secondaryPositions || []).includes(selectedPosFilter);
        return isPrimary || isSecondary;
      });
    }

    // Apply Card Theme Filter
    if (selectedCardTypeFilter !== 'ALL') {
      const filterLower = selectedCardTypeFilter.toLowerCase();
      result = result.filter(player => {
        const pCardLower = (player.cardType || '').toLowerCase();
        return pCardLower.includes(filterLower);
      });
    }

    // Apply Playstyle Filter
    if (selectedPlaystyleFilter !== 'ALL') {
      result = result.filter(player => player.playstyle === selectedPlaystyleFilter);
    }

    // Apply Sorting
    return [...result].sort((a, b) => {
      if (sortBy === 'maxRating_desc') {
        return (b.maxRating || 0) - (a.maxRating || 0);
      }
      if (sortBy === 'baseRating_desc') {
        return (b.baseRating || 0) - (a.baseRating || 0);
      }
      if (sortBy === 'name_asc') {
        return a.fullName.localeCompare(b.fullName);
      }
      return 0;
    });
  }, [
    searchQuery, 
    categoryFilter, 
    selectedPosFilter, 
    selectedCardTypeFilter, 
    selectedPlaystyleFilter, 
    sortBy
  ]);

  if (!isOpen) return null;

  // eFHUB Card Frame Theme Styling (Authentic eFootball Visual Foils)
  const getCardThemeConfig = (cardType?: string) => {
    const lower = (cardType || '').toLowerCase();
    
    if (lower.includes('big time') || lower.includes('legendary')) {
      return {
        cardBg: 'bg-gradient-to-b from-indigo-950 via-purple-950 to-neutral-950',
        border: 'border-2 border-purple-400/80 shadow-[0_0_25px_rgba(168,85,247,0.35)]',
        accentGradient: 'from-purple-500 via-indigo-400 to-amber-300',
        badgeBg: 'bg-gradient-to-r from-purple-500 via-pink-500 to-amber-400 text-white font-black',
        glowColor: 'rgba(168, 85, 247, 0.25)',
        themeLabel: 'BIG TIME',
        foilBadge: '★ SPECIAL COMMEMORATIVE'
      };
    }
    if (lower.includes('epic')) {
      return {
        cardBg: 'bg-gradient-to-b from-amber-950/90 via-neutral-950 to-yellow-950/70',
        border: 'border-2 border-amber-400/90 shadow-[0_0_25px_rgba(245,158,11,0.35)]',
        accentGradient: 'from-amber-400 via-yellow-300 to-amber-500',
        badgeBg: 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-neutral-950 font-black',
        glowColor: 'rgba(245, 158, 11, 0.25)',
        themeLabel: 'EPIC',
        foilBadge: '👑 HISTORIC LEGEND'
      };
    }
    if (lower.includes('show time') || lower.includes('showtime')) {
      return {
        cardBg: 'bg-gradient-to-b from-cyan-950 via-teal-950 to-neutral-950',
        border: 'border-2 border-cyan-400/90 shadow-[0_0_25px_rgba(6,182,212,0.35)]',
        accentGradient: 'from-cyan-400 via-teal-300 to-emerald-400',
        badgeBg: 'bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-300 text-neutral-950 font-black',
        glowColor: 'rgba(6, 182, 212, 0.25)',
        themeLabel: 'SHOW TIME',
        foilBadge: '⚡ PHENOMENAL ABILITY'
      };
    }
    if (lower.includes('potw') || lower.includes('potd') || lower.includes('pots')) {
      return {
        cardBg: 'bg-gradient-to-b from-emerald-950 via-green-950 to-neutral-950',
        border: 'border-2 border-emerald-400/80 shadow-[0_0_20px_rgba(16,185,129,0.3)]',
        accentGradient: 'from-emerald-400 via-green-300 to-lime-300',
        badgeBg: 'bg-gradient-to-r from-emerald-400 to-green-300 text-neutral-950 font-black',
        glowColor: 'rgba(16, 185, 129, 0.25)',
        themeLabel: 'POTW',
        foilBadge: '🔥 IN-FORM EDITION'
      };
    }
    if (lower.includes('highlight') || lower.includes('featured')) {
      return {
        cardBg: 'bg-gradient-to-b from-blue-950 via-slate-950 to-neutral-950',
        border: 'border-2 border-blue-400/80 shadow-[0_0_20px_rgba(59,130,246,0.3)]',
        accentGradient: 'from-blue-400 via-sky-300 to-indigo-400',
        badgeBg: 'bg-gradient-to-r from-blue-500 to-sky-400 text-white font-black',
        glowColor: 'rgba(59, 130, 246, 0.2)',
        themeLabel: 'HIGHLIGHT',
        foilBadge: '✦ CLUB SELECTION'
      };
    }
    return {
      cardBg: 'bg-gradient-to-b from-neutral-900 via-neutral-950 to-neutral-950',
      border: 'border border-neutral-700 hover:border-neutral-600',
      accentGradient: 'from-neutral-400 to-neutral-200',
      badgeBg: 'bg-neutral-800 text-neutral-300 font-bold',
      glowColor: 'rgba(255, 255, 255, 0.05)',
      themeLabel: 'STANDARD',
      foilBadge: 'BASE EDITION'
    };
  };

  // eFootball Official Position Badge Colors
  const getPosBadgeColor = (pos: string) => {
    switch (pos) {
      case 'GK': return 'text-amber-300 bg-amber-500/25 border-amber-400/60 font-black';
      case 'CB':
      case 'LB':
      case 'RB':
      case 'LWB':
      case 'RWB': return 'text-sky-300 bg-sky-500/25 border-sky-400/60 font-black';
      case 'DMF':
      case 'CMF':
      case 'AMF':
      case 'LMF':
      case 'RMF': return 'text-emerald-300 bg-emerald-500/25 border-emerald-400/60 font-black';
      case 'CF':
      case 'SS':
      case 'LWF':
      case 'RWF': return 'text-rose-300 bg-rose-500/25 border-rose-400/60 font-black';
      default: return 'text-neutral-300 bg-neutral-800 border-neutral-700 font-bold';
    }
  };

  // Official eFHUB Stat Color Tiers
  const getStatBadgeColor = (val: number) => {
    if (val >= 90) return 'bg-rose-500/25 text-rose-300 border-rose-500/50 font-black';
    if (val >= 80) return 'bg-emerald-500/25 text-emerald-300 border-emerald-500/50 font-black';
    if (val >= 70) return 'bg-amber-500/25 text-amber-300 border-amber-500/50 font-bold';
    return 'bg-neutral-900 text-neutral-400 border-neutral-800 font-medium';
  };

  const getStatProgressBarColor = (val: number) => {
    if (val >= 90) return 'bg-rose-500';
    if (val >= 80) return 'bg-emerald-500';
    if (val >= 70) return 'bg-amber-500';
    return 'bg-neutral-600';
  };

  // Key 6 stats shown on card face based on position archetype
  const getSignatureStats = (player: EFootballMasterPlayer) => {
    const pos = player.primaryPosition;
    const attrs = player.keyAttributes || {};

    if (pos === 'GK') {
      return [
        { label: 'GK.A', name: 'GK Awareness', val: attrs.GKAwareness || 90 },
        { label: 'CAT', name: 'Catching', val: attrs.GKCatching || 88 },
        { label: 'PAR', name: 'Parrying', val: attrs.GKParrying || 89 },
        { label: 'REF', name: 'Reflexes', val: attrs.GKReflexes || 92 },
        { label: 'RCH', name: 'Reach', val: attrs.GKReach || 90 },
        { label: 'JMP', name: 'Jumping', val: attrs.Jumping || 85 }
      ];
    }
    if (['CB', 'LB', 'RB', 'LWB', 'RWB'].includes(pos)) {
      return [
        { label: 'DEF', name: 'Def. Awareness', val: attrs.DefensiveAwareness || 92 },
        { label: 'TCK', name: 'Tackling', val: attrs.Tackling || 91 },
        { label: 'PHY', name: 'Phys. Contact', val: attrs.PhysicalContact || 88 },
        { label: 'SPD', name: 'Speed', val: attrs.Speed || 86 },
        { label: 'AGG', name: 'Aggression', val: attrs.Aggression || 89 },
        { label: 'STA', name: 'Stamina', val: attrs.Stamina || 88 }
      ];
    }
    if (['DMF', 'CMF', 'AMF', 'LMF', 'RMF'].includes(pos)) {
      return [
        { label: 'L.PAS', name: 'Low Pass', val: attrs.LowPass || 90 },
        { label: 'A.PAS', name: 'Lofted Pass', val: attrs.LoftedPass || 88 },
        { label: 'CTR', name: 'Ball Control', val: attrs.BallControl || 91 },
        { label: 'DRI', name: 'Dribbling', val: attrs.Dribbling || 89 },
        { label: 'STA', name: 'Stamina', val: attrs.Stamina || 92 },
        { label: 'DEF', name: 'Def. Awareness', val: attrs.DefensiveAwareness || 80 }
      ];
    }
    // Attackers: CF, SS, LWF, RWF
    return [
      { label: 'OA', name: 'Off. Awareness', val: attrs.OffensiveAwareness || 93 },
      { label: 'FIN', name: 'Finishing', val: attrs.Finishing || 92 },
      { label: 'DRI', name: 'Dribbling', val: attrs.Dribbling || 91 },
      { label: 'SPD', name: 'Speed', val: attrs.Speed || 90 },
      { label: 'ACC', name: 'Acceleration', val: attrs.Acceleration || 92 },
      { label: 'POW', name: 'Kicking Power', val: attrs.KickingPower || 89 }
    ];
  };

  const handleCardChosen = (card: EFootballMasterPlayer) => {
    onSelectPlayer(card);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-6xl bg-neutral-950 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        
        {/* eFHUB Header Bar */}
        <div className="p-4 sm:p-5 border-b border-neutral-800 bg-neutral-900/90 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-400 text-neutral-950 font-black shadow-lg shadow-emerald-500/20">
              <Zap className="w-5 h-5 fill-neutral-950" />
            </span>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-1.5">
                  <span>eFHUB Player Card Database</span>
                </h3>
                <a 
                  href="https://efhub.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded-lg text-[11px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 flex items-center gap-1 transition-colors"
                >
                  <span>efhub.com</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <span className="text-xs text-neutral-400 font-semibold hidden md:inline">
                  • Importing for <span className="text-emerald-400 font-bold">{targetRoleLabel}</span>
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Browse & compare cards exactly as in the official eFHUB database. Select any card to automatically import all ratings, 22+ attribute stats, and skills.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2.5 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition-colors"
            title="Close Database"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Database Navigation & Filtering Controls */}
        <div className="p-3 sm:p-4 bg-neutral-900/50 border-b border-neutral-800 space-y-3">
          
          {/* Search Row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search player name, club, or edition (e.g. Messi, Mbappé, Haaland, Ronaldo, Yamal, Rodri, Cruyff, Madrid)..."
                className="w-full bg-neutral-900 border border-neutral-700/80 rounded-xl pl-10 pr-20 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition-colors"
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

            {/* View Mode Toggle & Sort */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-xl p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                    viewMode === 'grid' 
                      ? 'bg-emerald-500 text-neutral-950 shadow' 
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  title="Card Gallery Grid"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Cards Grid</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                    viewMode === 'table' 
                      ? 'bg-emerald-500 text-neutral-950 shadow' 
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  title="Database Table"
                >
                  <List className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Table</span>
                </button>
              </div>

              {/* Sort By Dropdown */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs rounded-xl px-3 py-2 font-semibold focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="maxRating_desc">Sort: Max OVR (High → Low)</option>
                  <option value="baseRating_desc">Sort: Base Rating (High → Low)</option>
                  <option value="name_asc">Sort: Player Name (A → Z)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Position Category Tabs & Position Filter */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1 border-t border-neutral-800/60 text-xs">
            
            {/* Position Category Group */}
            <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto py-1 scrollbar-none">
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mr-1">
                Category:
              </span>
              {(['ALL', 'FW', 'MF', 'DF', 'GK'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => {
                    setCategoryFilter(cat);
                    setSelectedPosFilter('ALL');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black border transition-colors shrink-0 ${
                    categoryFilter === cat
                      ? 'bg-emerald-500 text-neutral-950 font-black border-emerald-400 shadow-sm'
                      : 'bg-neutral-900 text-neutral-400 hover:text-white border-neutral-800'
                  }`}
                >
                  {cat === 'ALL' ? 'ALL ROLES' : cat}
                </button>
              ))}
            </div>

            {/* Card Theme Filter */}
            <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto py-1 scrollbar-none">
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mr-1">
                Edition:
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

          {/* Specific Position Pills */}
          <div className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-none">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider shrink-0 mr-1">
              Position:
            </span>
            {allPositions.map(pos => (
              <button
                key={pos}
                onClick={() => setSelectedPosFilter(pos)}
                className={`px-2 py-0.5 rounded-md text-[10px] font-black border transition-colors shrink-0 ${
                  selectedPosFilter === pos
                    ? 'bg-cyan-500 text-neutral-950 font-black border-cyan-400 shadow-sm'
                    : 'bg-neutral-900/80 text-neutral-400 hover:text-white border-neutral-800'
                }`}
              >
                {pos}
              </button>
            ))}
          </div>

        </div>

        {/* Database Content Area */}
        <div className="p-3 sm:p-5 overflow-y-auto flex-1 space-y-4 max-h-[64vh]">
          {filteredCards.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-neutral-800 rounded-3xl bg-neutral-900/30 space-y-3">
              <Search className="w-10 h-10 text-neutral-600 mx-auto" />
              <p className="text-sm font-bold text-neutral-300">
                No matching eFHUB cards found for "{searchQuery}"
              </p>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                Try searching for star names like "Messi", "Mbappé", "Haaland", "Ronaldo", "Yamal", "Rodri", "Cruyff", or click "Clear" to browse all cards.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setCategoryFilter('ALL');
                  setSelectedPosFilter('ALL');
                  setSelectedCardTypeFilter('ALL');
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-neutral-800 hover:bg-neutral-700 text-white transition-colors"
              >
                Reset All Filters
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            /* Visual eFHUB Cards Gallery View */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {filteredCards.map((player) => {
                const theme = getCardThemeConfig(player.cardType);
                const sigStats = getSignatureStats(player);
                const efhubUrl = player.efhubUrl || `https://efhub.com/25/players/${player.id}/`;

                return (
                  <div
                    key={player.id}
                    className={`rounded-3xl p-4 flex flex-col justify-between transition-all duration-200 relative overflow-hidden group hover:scale-[1.01] ${theme.cardBg} ${theme.border}`}
                  >
                    {/* Top Radiant Shimmer Accent */}
                    <div 
                      className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-2xl pointer-events-none opacity-60"
                      style={{ backgroundColor: theme.glowColor }}
                    />

                    {/* Card Top Section: OVR, Position, and Card Edition Tag */}
                    <div className="relative z-10">
                      
                      <div className="flex items-center justify-between pb-3 border-b border-neutral-800/80">
                        {/* Rating & Position Lockup */}
                        <div className="flex items-center gap-2">
                          <div className="flex items-baseline gap-1 bg-neutral-950/90 px-2.5 py-1 rounded-xl border border-neutral-800">
                            <span className="text-2xl font-black text-amber-400 leading-none">
                              {player.maxRating}
                            </span>
                            <span className="text-[9px] font-extrabold text-neutral-400 uppercase">
                              OVR
                            </span>
                          </div>

                          <span className={`px-2.5 py-1 rounded-xl text-xs border ${getPosBadgeColor(player.primaryPosition)}`}>
                            {player.primaryPosition}
                          </span>

                          {/* Secondary Playable Positions */}
                          {player.secondaryPositions && player.secondaryPositions.length > 0 && (
                            <div className="hidden sm:flex items-center gap-1">
                              {player.secondaryPositions.slice(0, 2).map(sp => (
                                <span key={sp} className="px-1.5 py-0.5 rounded text-[9px] font-black bg-neutral-900 text-neutral-300 border border-neutral-800">
                                  {sp}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Theme Banner Pill */}
                        <span className={`px-2.5 py-0.5 rounded-lg text-[10px] shadow-sm uppercase ${theme.badgeBg}`}>
                          {theme.themeLabel}
                        </span>
                      </div>

                      {/* Card Center: Player Visual Avatar & Identity */}
                      <div className="my-3 space-y-1.5">
                        
                        {/* Foil Special Badge & Booster */}
                        <div className="flex items-center justify-between gap-1 text-[10px]">
                          <span className="font-extrabold text-neutral-400 uppercase tracking-wider text-[9px]">
                            {theme.foilBadge}
                          </span>
                          {player.boosterName && (
                            <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              {player.boosterName}
                            </span>
                          )}
                        </div>

                        {/* Jersey Name */}
                        <div>
                          <h4 className="text-lg font-black text-white tracking-tight uppercase group-hover:text-amber-300 transition-colors">
                            {player.commonName || player.fullName}
                          </h4>
                          <p className="text-xs font-semibold text-neutral-400">
                            {player.fullName}
                          </p>
                        </div>

                        {/* Special Pack Edition Name */}
                        {player.cardTitle && (
                          <div className="text-[11px] font-bold text-cyan-300/90 truncate">
                            🏆 {player.cardTitle}
                          </div>
                        )}

                        {/* Club, Country & Playstyle */}
                        <div className="pt-1 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <span className="text-neutral-400 font-medium">
                            {player.club} • {player.nationality}
                          </span>
                          <span className="px-2 py-0.5 rounded-lg bg-neutral-900 border border-neutral-800 text-[11px] font-bold text-emerald-300">
                            {player.playstyle}
                          </span>
                        </div>

                      </div>

                      {/* eFHUB Signature 6-Stat Matrix Bar */}
                      <div className="my-3 bg-neutral-950/90 border border-neutral-800/90 p-2.5 rounded-2xl">
                        <div className="text-[9px] font-black text-neutral-500 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                          <span>eFHUB Key Attribute Stats</span>
                          <span className="text-emerald-400 font-bold">Untrained / Max</span>
                        </div>
                        <div className="grid grid-cols-6 gap-1">
                          {sigStats.map((st) => (
                            <div 
                              key={st.label}
                              className={`p-1 rounded-lg text-center border ${getStatBadgeColor(st.val)}`}
                              title={`${st.name}: ${st.val}`}
                            >
                              <span className="text-[8px] block font-black uppercase truncate opacity-80">
                                {st.label}
                              </span>
                              <span className="text-xs font-black">
                                {st.val}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>

                    {/* Card Actions Bottom Row */}
                    <div className="relative z-10 pt-2 border-t border-neutral-800/80 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setInspectingPlayer(player)}
                        className="px-3 py-2 rounded-xl text-xs font-bold text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 transition-colors flex items-center gap-1"
                        title="View Full 22+ Attributes, Radar & Skills"
                      >
                        <Eye className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Inspect</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCardChosen(player)}
                        className="flex-1 py-2 px-3 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-neutral-950 flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4 fill-neutral-950" />
                        <span>Select Card</span>
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          ) : (
            /* Database Table View */
            <div className="overflow-x-auto bg-neutral-900/60 border border-neutral-800 rounded-2xl">
              <table className="w-full text-left text-xs text-neutral-300">
                <thead className="bg-neutral-900 text-neutral-400 uppercase text-[10px] font-black tracking-wider border-b border-neutral-800">
                  <tr>
                    <th className="py-3 px-3">OVR</th>
                    <th className="py-3 px-2">Pos</th>
                    <th className="py-3 px-3">Player Name</th>
                    <th className="py-3 px-3">Edition / Theme</th>
                    <th className="py-3 px-3">Club</th>
                    <th className="py-3 px-3">Playstyle</th>
                    <th className="py-3 px-3">Key Stats</th>
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/80">
                  {filteredCards.map((player) => {
                    const theme = getCardThemeConfig(player.cardType);
                    const sigStats = getSignatureStats(player);

                    return (
                      <tr 
                        key={player.id} 
                        className="hover:bg-neutral-800/40 transition-colors group cursor-pointer"
                        onClick={() => setInspectingPlayer(player)}
                      >
                        <td className="py-3 px-3 font-black text-amber-400 text-sm">
                          {player.maxRating}
                        </td>
                        <td className="py-3 px-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] border ${getPosBadgeColor(player.primaryPosition)}`}>
                            {player.primaryPosition}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-bold text-white group-hover:text-amber-300 transition-colors">
                          <div>
                            <span className="text-sm">{player.commonName || player.fullName}</span>
                            {player.cardTitle && (
                              <p className="text-[10px] text-cyan-400 truncate max-w-xs">{player.cardTitle}</p>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[9px] ${theme.badgeBg}`}>
                            {player.cardType}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-neutral-400 font-medium">
                          {player.club}
                        </td>
                        <td className="py-3 px-3 text-emerald-400 font-semibold">
                          {player.playstyle}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1">
                            {sigStats.slice(0, 4).map(st => (
                              <span key={st.label} className={`px-1.5 py-0.5 rounded text-[9px] border ${getStatBadgeColor(st.val)}`}>
                                {st.label}: {st.val}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleCardChosen(player)}
                            className="px-3 py-1.5 rounded-lg text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-neutral-950 transition-colors"
                          >
                            Select
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer Bar */}
        <div className="p-4 bg-neutral-900 border-t border-neutral-800 text-xs text-neutral-400 flex items-center justify-between">
          <span className="flex items-center gap-2 font-medium">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Showing <strong className="text-white">{filteredCards.length}</strong> official eFHUB card editions</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors"
          >
            Close
          </button>
        </div>

      </div>

      {/* Full eFHUB Card Inspector & Attribute Sheet Modal */}
      {inspectingPlayer && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-black/90 backdrop-blur-lg animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-neutral-950 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            
            {/* Inspector Header */}
            <div className="p-4 sm:p-5 border-b border-neutral-800 bg-neutral-900 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-1 rounded-xl text-xs border ${getPosBadgeColor(inspectingPlayer.primaryPosition)}`}>
                  {inspectingPlayer.primaryPosition}
                </span>
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <span>{inspectingPlayer.fullName}</span>
                    <span className="text-amber-400 text-base font-extrabold">({inspectingPlayer.maxRating} OVR)</span>
                  </h3>
                  <p className="text-xs text-neutral-400">
                    {inspectingPlayer.club} • {inspectingPlayer.nationality} • {inspectingPlayer.cardType} Edition
                  </p>
                </div>
              </div>

              <button
                onClick={() => setInspectingPlayer(null)}
                className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Inspector Body: Full Attribute Ratings Breakdown */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
              
              {/* Top Summary Banner */}
              <div className="p-4 rounded-2xl bg-neutral-900/80 border border-neutral-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-neutral-400">Style:</span>
                    <span className="text-xs font-black text-emerald-400">{inspectingPlayer.playstyle}</span>
                    {inspectingPlayer.boosterName && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        {inspectingPlayer.boosterName}
                      </span>
                    )}
                  </div>
                  {inspectingPlayer.cardTitle && (
                    <p className="text-xs font-bold text-cyan-300">
                      🏆 {inspectingPlayer.cardTitle}
                    </p>
                  )}
                  <p className="text-[11px] text-neutral-500">
                    Secondary Playable Roles: {(inspectingPlayer.secondaryPositions || []).join(', ') || 'None'}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <a
                    href={inspectingPlayer.efhubUrl || `https://efhub.com/25/players/${inspectingPlayer.id}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 rounded-xl text-xs font-bold text-cyan-400 hover:text-cyan-300 bg-neutral-950 border border-neutral-800 flex items-center gap-1.5 transition-colors"
                  >
                    <span>View on efhub.com</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <button
                    type="button"
                    onClick={() => {
                      handleCardChosen(inspectingPlayer);
                      setInspectingPlayer(null);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-neutral-950 flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4 fill-neutral-950" />
                    <span>Select This Card</span>
                  </button>
                </div>
              </div>

              {/* Complete 22+ Attribute Breakdown by Category */}
              <div>
                <h4 className="text-xs font-black text-neutral-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Complete Player Attributes (Official eFHUB Stats Sheet)</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(inspectingPlayer.keyAttributes || {}).map(([attr, rawVal]) => {
                    const val = Number(rawVal) || 0;
                    return (
                      <div 
                        key={attr}
                        className="p-2.5 rounded-xl bg-neutral-900/90 border border-neutral-800 flex items-center justify-between gap-3"
                      >
                        <div className="flex-1">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-bold text-neutral-300">
                              {attr.replace(/([A-Z])/g, ' $1').trim()}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[11px] ${getStatBadgeColor(val)}`}>
                              {val}
                            </span>
                          </div>
                          {/* Progress Bar */}
                          <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${getStatProgressBarColor(val)}`}
                              style={{ width: `${Math.min(100, Math.max(10, val))}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Skills List */}
              {inspectingPlayer.skills && inspectingPlayer.skills.length > 0 && (
                <div>
                  <h4 className="text-xs font-black text-neutral-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                    <span>Player Skills ({inspectingPlayer.skills.length})</span>
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {inspectingPlayer.skills.map((skill, idx) => (
                      <span 
                        key={idx}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-neutral-900 text-neutral-200 border border-neutral-800"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Inspector Footer */}
            <div className="p-4 bg-neutral-900 border-t border-neutral-800 flex items-center justify-between">
              <button
                onClick={() => setInspectingPlayer(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
              >
                Back to Cards
              </button>

              <button
                type="button"
                onClick={() => {
                  handleCardChosen(inspectingPlayer);
                  setInspectingPlayer(null);
                }}
                className="px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-neutral-950 flex items-center gap-2 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 fill-neutral-950" />
                <span>Select & Import All Card Stats</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
