import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  X, 
  Search, 
  Sparkles, 
  ExternalLink, 
  CheckCircle2, 
  Award,
  Zap,
  Globe,
  RefreshCw,
  ArrowLeft,
  ArrowRight,
  Maximize2,
  Check,
  ChevronRight,
  LayoutGrid,
  Eye,
  SlidersHorizontal,
  Info,
  Lock,
  Compass,
  Layers,
  Flame,
  Shield,
  Target,
  Plus
} from 'lucide-react';
import { 
  getAllEfhubCardsForPlayer,
  EFootballMasterPlayer, 
  normalizeString,
  EFOOTBALL_MASTER_PLAYERS 
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
  // Browser Navigation & Address Bar State
  const [addressBarInput, setAddressBarInput] = useState('https://efhub.com/');
  const [currentWebUrl, setCurrentWebUrl] = useState('https://efhub.com/');
  const [historyStack, setHistoryStack] = useState<string[]>(['https://efhub.com/']);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  const [iframeKey, setIframeKey] = useState(1);
  const [isLoadingIframe, setIsLoadingIframe] = useState(true);
  const [activeTab, setActiveTab] = useState<'live_browser' | 'cards_catalog'>('live_browser');
  
  // Selected Card & Quick Search State
  const [selectedCard, setSelectedCard] = useState<EFootballMasterPlayer | null>(null);
  const [quickSearchQuery, setQuickSearchQuery] = useState('');
  const [filterPosition, setFilterPosition] = useState<string>('ALL');
  const [filterCardType, setFilterCardType] = useState<string>('ALL');
  const [inspectingPlayer, setInspectingPlayer] = useState<EFootballMasterPlayer | null>(null);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Set default initial star player
  useEffect(() => {
    if (!selectedCard) {
      const topCards = getAllEfhubCardsForPlayer('');
      if (topCards.length > 0) {
        setSelectedCard(topCards[0]);
      }
    }
  }, [selectedCard]);

  // Sync address bar input when current URL changes
  useEffect(() => {
    setAddressBarInput(currentWebUrl);
  }, [currentWebUrl]);

  // Listen for navigation messages and card clicks from the embedded proxy window
  useEffect(() => {
    const handleWindowMessage = async (event: MessageEvent) => {
      if (event.data && event.data.source === 'EFHUB_EMBED') {
        const { type, href, url, pathname, text, playerId: msgPlayerId, player: embeddedPlayer } = event.data;

        if (url && url !== currentWebUrl) {
          setCurrentWebUrl(url);
          setHistoryStack(prev => {
            if (prev[prev.length - 1] === url) return prev;
            return [...prev.slice(0, historyIndex + 1), url];
          });
          setHistoryIndex(prev => prev + 1);
        }

        // Direct player data sent from DOM detection
        if (embeddedPlayer && embeddedPlayer.fullName) {
          const matched = getAllEfhubCardsForPlayer(embeddedPlayer.fullName);
          if (matched.length > 0) {
            const found = matched[0];
            setSelectedCard({
              ...found,
              primaryPosition: embeddedPlayer.primaryPosition || found.primaryPosition,
              maxRating: embeddedPlayer.maxRating || found.maxRating,
              cardType: embeddedPlayer.cardType || found.cardType,
              playstyle: embeddedPlayer.playstyle || found.playstyle
            });
            return;
          } else {
            // Synthesize player
            const synthesized: EFootballMasterPlayer = {
              id: `efhub_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
              fullName: embeddedPlayer.fullName,
              commonName: embeddedPlayer.commonName || embeddedPlayer.fullName,
              aliases: [embeddedPlayer.fullName.toUpperCase()],
              primaryPosition: embeddedPlayer.primaryPosition || 'CF',
              secondaryPositions: embeddedPlayer.primaryPosition === 'CF' ? ['SS'] : embeddedPlayer.primaryPosition === 'CB' ? ['RB'] : ['CMF'],
              baseRating: embeddedPlayer.baseRating || 88,
              maxRating: embeddedPlayer.maxRating || 98,
              playstyle: embeddedPlayer.playstyle || 'Goal Poacher',
              club: embeddedPlayer.club || 'eFootball Club',
              nationality: embeddedPlayer.nationality || 'International',
              cardType: embeddedPlayer.cardType || 'Highlight',
              keyAttributes: {
                OffensiveAwareness: embeddedPlayer.maxRating ? embeddedPlayer.maxRating - 3 : 92,
                BallControl: 90,
                Dribbling: 92,
                TightPossession: 90,
                LowPass: 86,
                LoftedPass: 82,
                Finishing: 92,
                Speed: 93,
                Acceleration: 92,
                KickingPower: 90,
                PhysicalContact: 85,
                Stamina: 88
              },
              skills: ['Double Touch', 'First-time Shot', 'One-touch Pass', 'Through Passing']
            };
            setSelectedCard(synthesized);
            return;
          }
        }

        // Detect player ID from URL or message
        const efhubMatch = (href || pathname || url || '').match(/\/(?:efootball\/)?(?:players|player)\/([0-9a-zA-Z_\-]+)/);
        const pesdbMatch = (href || pathname || url || '').match(/player\.php\?id=([0-9]+)/);
        const playerId = msgPlayerId || (efhubMatch && efhubMatch[1]) || (pesdbMatch && pesdbMatch[1]);
        
        if (playerId) {
          try {
            const res = await fetch(`/api/efhub-player?id=${encodeURIComponent(playerId)}`);
            if (res.ok) {
              const data = await res.json();
              if (data.success && data.player) {
                setSelectedCard(data.player);
                return;
              }
            }
          } catch (e) {
            console.warn('API fetch error for player ID:', e);
          }
        }

        // Fallback: match by card name/text
        if (text) {
          const matched = getAllEfhubCardsForPlayer(text);
          if (matched.length > 0) {
            setSelectedCard(matched[0]);
          }
        }
      }
    };

    window.addEventListener('message', handleWindowMessage);
    return () => window.removeEventListener('message', handleWindowMessage);
  }, [currentWebUrl, historyIndex]);

  // Filtered Cards for Catalog View
  const catalogCards = useMemo(() => {
    let list = getAllEfhubCardsForPlayer(quickSearchQuery);
    if (filterPosition !== 'ALL') {
      list = list.filter(p => p.primaryPosition === filterPosition || (p.secondaryPositions && p.secondaryPositions.includes(filterPosition)));
    }
    if (filterCardType !== 'ALL') {
      list = list.filter(p => (p.cardType || '').toLowerCase().includes(filterCardType.toLowerCase()));
    }
    return list.slice(0, 48);
  }, [quickSearchQuery, filterPosition, filterCardType]);

  if (!isOpen) return null;

  // Browser navigation handlers
  const navigateTo = (url: string) => {
    let target = url.trim();
    if (!target.startsWith('http://') && !target.startsWith('https://')) {
      target = 'https://' + target;
    }
    setCurrentWebUrl(target);
    setHistoryStack(prev => [...prev.slice(0, historyIndex + 1), target]);
    setHistoryIndex(prev => prev + 1);
    setIsLoadingIframe(true);
    setIframeKey(k => k + 1);
  };

  const handleBack = () => {
    if (historyIndex > 0) {
      const prevUrl = historyStack[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setCurrentWebUrl(prevUrl);
      setIsLoadingIframe(true);
      setIframeKey(k => k + 1);
    }
  };

  const handleForward = () => {
    if (historyIndex < historyStack.length - 1) {
      const nextUrl = historyStack[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setCurrentWebUrl(nextUrl);
      setIsLoadingIframe(true);
      setIframeKey(k => k + 1);
    }
  };

  const handleReload = () => {
    setIsLoadingIframe(true);
    setIframeKey(k => k + 1);
  };

  const handleConfirmSelect = async () => {
    let cardToSelect = selectedCard;

    // Check if current URL in address bar is a player card page
    const efhubMatch = currentWebUrl.match(/\/(?:efootball\/)?players\/([0-9a-zA-Z_\-]+)/);
    const pesdbMatch = currentWebUrl.match(/player\.php\?id=([0-9]+)/);
    const playerId = (efhubMatch && efhubMatch[1]) || (pesdbMatch && pesdbMatch[1]);

    if (playerId) {
      try {
        setIsLoadingIframe(true);
        const res = await fetch(`/api/efhub-player?id=${encodeURIComponent(playerId)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.player) {
            cardToSelect = data.player;
          }
        }
      } catch (e) {
        console.warn('Could not load card from URL:', e);
      } finally {
        setIsLoadingIframe(false);
      }
    }

    if (cardToSelect) {
      onSelectPlayer(cardToSelect);
      onClose();
    }
  };

  const getPosBadgeColor = (pos: string) => {
    switch (pos) {
      case 'GK': return 'text-amber-300 bg-amber-500/20 border-amber-400/50 font-black';
      case 'CB':
      case 'LB':
      case 'RB':
      case 'LWB':
      case 'RWB': return 'text-sky-300 bg-sky-500/20 border-sky-400/50 font-black';
      case 'DMF':
      case 'CMF':
      case 'AMF':
      case 'LMF':
      case 'RMF': return 'text-emerald-300 bg-emerald-500/20 border-emerald-400/50 font-black';
      case 'CF':
      case 'SS':
      case 'LWF':
      case 'RWF': return 'text-rose-300 bg-rose-500/20 border-rose-400/50 font-black';
      default: return 'text-neutral-300 bg-neutral-800 border-neutral-700 font-bold';
    }
  };

  const getStatBadgeColor = (val: number) => {
    if (val >= 90) return 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-black';
    if (val >= 80) return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-black';
    if (val >= 70) return 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold';
    return 'bg-neutral-900 text-neutral-400 border-neutral-800 font-medium';
  };

  const proxySrc = `/api/efhub-proxy?url=${encodeURIComponent(currentWebUrl)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md animate-fade-in overflow-hidden">
      
      {/* IN-BUILT SYSTEM BROWSER WINDOW */}
      <div className="relative w-full max-w-7xl h-[94vh] bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans">
        
        {/* 1. BROWSER WINDOW TITLEBAR & TAB STRIP */}
        <div className="bg-[#12141a] px-3 pt-2.5 pb-0 border-b border-neutral-800 flex items-center justify-between gap-2 select-none">
          
          {/* Window Control Buttons & Active Tabs */}
          <div className="flex items-center gap-2 min-w-0 overflow-x-auto scrollbar-none">
            
            {/* Window Dots (macOS/Modern Browser style) */}
            <div className="flex items-center gap-1.5 mr-2 shrink-0">
              <button 
                onClick={onClose}
                className="w-3 h-3 rounded-full bg-rose-500 hover:bg-rose-600 transition-colors"
                title="Close Browser Window"
              />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
            </div>

            {/* Browser Tab 1: Live Web View */}
            <button
              type="button"
              onClick={() => setActiveTab('live_browser')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-t-xl text-xs font-bold transition-all border-t border-x shrink-0 ${
                activeTab === 'live_browser'
                  ? 'bg-neutral-900 text-white border-neutral-700 shadow-md'
                  : 'bg-neutral-950/60 text-neutral-400 hover:text-neutral-200 border-transparent hover:bg-neutral-900/50'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              <span className="truncate max-w-[140px] sm:max-w-[200px]">
                eFHUB.com Live Browser
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </button>

            {/* Browser Tab 2: Visual Card Catalog */}
            <button
              type="button"
              onClick={() => setActiveTab('cards_catalog')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-t-xl text-xs font-bold transition-all border-t border-x shrink-0 ${
                activeTab === 'cards_catalog'
                  ? 'bg-neutral-900 text-white border-neutral-700 shadow-md'
                  : 'bg-neutral-950/60 text-neutral-400 hover:text-neutral-200 border-transparent hover:bg-neutral-900/50'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 text-cyan-400" />
              <span className="truncate max-w-[140px] sm:max-w-[200px]">
                eFHUB Player Cards Catalog
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-800 text-amber-300 font-black">
                100+ OVR
              </span>
            </button>
          </div>

          {/* Right Header Status & Close */}
          <div className="flex items-center gap-2 pb-1.5 shrink-0">
            <span className="text-xs text-neutral-400 font-semibold hidden md:inline">
              Target: <strong className="text-emerald-400">{targetRoleLabel}</strong>
            </span>
            <a
              href="https://efhub.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors"
              title="Open efhub.com in separate browser window"
            >
              <span>External</span>
              <ExternalLink className="w-3 h-3 text-neutral-400" />
            </a>
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. BROWSER NAVIGATION BAR & OMNIBOX (ADDRESS BAR) */}
        <div className="px-3 py-2 bg-neutral-900 border-b border-neutral-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 text-xs shadow-inner">
          
          {/* Nav Buttons: Back, Forward, Reload, Home */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleBack}
              disabled={historyIndex <= 0}
              className="p-1.5 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed text-neutral-300 transition-colors"
              title="Back"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleForward}
              disabled={historyIndex >= historyStack.length - 1}
              className="p-1.5 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed text-neutral-300 transition-colors"
              title="Forward"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleReload}
              className="p-1.5 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 transition-colors"
              title="Refresh / Reload Page"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingIframe ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => navigateTo('https://efhub.com/')}
              className="px-2 py-1.5 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 font-bold text-[11px] transition-colors flex items-center gap-1"
              title="Go to eFHUB Home"
            >
              <Compass className="w-3 h-3 text-emerald-400" />
              <span>efhub.com</span>
            </button>
          </div>

          {/* Browser Address Bar (Omnibox) */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              navigateTo(addressBarInput);
            }}
            className="flex items-center gap-2 bg-neutral-950 border border-neutral-700/80 focus-within:border-emerald-500 rounded-xl px-3 py-1.5 flex-1 min-w-0 transition-colors"
          >
            <Lock className="w-3 h-3 text-emerald-400 shrink-0" />
            <input
              type="text"
              value={addressBarInput}
              onChange={(e) => setAddressBarInput(e.target.value)}
              placeholder="Enter database URL (e.g. https://efhub.com/players)..."
              className="bg-transparent text-xs text-neutral-200 w-full focus:outline-none font-mono truncate"
            />
            {addressBarInput && (
              <button
                type="button"
                onClick={() => setAddressBarInput('')}
                className="text-neutral-500 hover:text-neutral-300 text-xs px-1"
              >
                ✕
              </button>
            )}
          </form>

          {/* Quick Player Search in Browser Toolbar */}
          <div className="relative shrink-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
            <input
              type="text"
              value={quickSearchQuery}
              onChange={(e) => setQuickSearchQuery(e.target.value)}
              placeholder="Quick search player card..."
              className="bg-neutral-950 border border-neutral-700/80 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 w-full sm:w-48 md:w-56"
            />
          </div>

        </div>

        {/* 3. BOOKMARKS / QUICK NAVIGATION SHORTCUT STRIP */}
        <div className="px-3 py-1.5 bg-neutral-950 border-b border-neutral-800/80 flex items-center gap-1.5 overflow-x-auto scrollbar-none text-xs select-none">
          <span className="text-[10px] font-black text-neutral-500 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            Bookmarks:
          </span>
          <button
            type="button"
            onClick={() => navigateTo('https://efhub.com/players')}
            className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 transition-colors shrink-0"
          >
            ⚽ Players Database
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('cards_catalog');
              setFilterCardType('Show Time');
            }}
            className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-300 border border-cyan-800/40 transition-colors shrink-0"
          >
            ⭐ Show Time & Epic Cards
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('cards_catalog');
              setFilterCardType('POTW');
            }}
            className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border border-emerald-800/40 transition-colors shrink-0"
          >
            🔥 POTW & Highlights
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('cards_catalog');
              setFilterPosition('CF');
            }}
            className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-800/40 transition-colors shrink-0"
          >
            ⚡ Forwards (CF/SS/W)
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('cards_catalog');
              setFilterPosition('CB');
            }}
            className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-sky-950/40 hover:bg-sky-900/50 text-sky-300 border border-sky-800/40 transition-colors shrink-0"
          >
            🛡️ Defenders (CB/FB)
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('cards_catalog');
              setFilterPosition('GK');
            }}
            className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 border border-amber-800/40 transition-colors shrink-0"
          >
            🧤 Goalkeepers (GK)
          </button>
        </div>

        {/* 4. MAIN BROWSER CONTENT AREA */}
        <div className="relative flex-1 bg-neutral-950 overflow-hidden flex flex-col">
          
          {activeTab === 'live_browser' ? (
            /* LIVE WEB VIEW (Proxy iframe with unblocked navigation) */
            <div className="relative w-full h-full">
              {isLoadingIframe && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-neutral-950/80 backdrop-blur-sm space-y-3">
                  <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-bold text-neutral-300">
                    Loading live website {currentWebUrl}...
                  </p>
                  <p className="text-[11px] text-neutral-500">
                    Open access browsing window • Navigating freely
                  </p>
                </div>
              )}

              <iframe
                ref={iframeRef}
                key={iframeKey}
                src={proxySrc}
                title="eFHUB Live Browser Window"
                className="w-full h-full border-0 bg-[#13151d]"
                onLoad={() => setIsLoadingIframe(false)}
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
              />
            </div>
          ) : (
            /* VISUAL CARDS CATALOG & STATS GRID */
            <div className="p-4 overflow-y-auto h-full space-y-4">
              
              {/* Position and Category Filters */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-neutral-400">Position:</span>
                {['ALL', 'CF', 'SS', 'LWF', 'RWF', 'AMF', 'CMF', 'DMF', 'LB', 'CB', 'RB', 'GK'].map(pos => (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => setFilterPosition(pos)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                      filterPosition === pos
                        ? 'bg-emerald-500 text-neutral-950 border-emerald-400 font-black'
                        : 'bg-neutral-900 text-neutral-400 hover:text-white border-neutral-800'
                    }`}
                  >
                    {pos}
                  </button>
                ))}
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                {catalogCards.map((player) => {
                  const isSelected = selectedCard?.id === player.id;
                  return (
                    <div
                      key={player.id}
                      onClick={() => setSelectedCard(player)}
                      className={`rounded-2xl p-3.5 border transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-3 ${
                        isSelected
                          ? 'bg-neutral-900 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)] ring-1 ring-emerald-500'
                          : 'bg-neutral-900/80 border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-black text-amber-400">
                              {player.maxRating} <span className="text-[10px] text-neutral-500">OVR</span>
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs border ${getPosBadgeColor(player.primaryPosition)}`}>
                              {player.primaryPosition}
                            </span>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-800 text-neutral-300">
                            {player.cardType}
                          </span>
                        </div>

                        <div className="mt-2.5">
                          <h4 className="text-sm font-black text-white">
                            {player.fullName}
                          </h4>
                          <p className="text-xs text-neutral-400 mt-0.5">
                            {player.club} • {player.nationality}
                          </p>
                          <p className="text-xs font-semibold text-emerald-400 mt-1">
                            Style: {player.playstyle}
                          </p>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-neutral-800 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectingPlayer(player);
                          }}
                          className="text-[11px] font-bold text-cyan-400 hover:underline flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Inspect Stats</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCard(player);
                            onSelectPlayer(player);
                            onClose();
                          }}
                          className="px-3 py-1 rounded-lg text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-neutral-950 transition-colors"
                        >
                          Select
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* 5. BOTTOM SELECTION BAR & FLOATING GREEN "Select the Player" BUTTON */}
        <div className="p-3.5 sm:p-4 bg-[#12141a] border-t border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xl z-30">
          
          {/* Active Player Card Detection Information */}
          <div className="flex items-center gap-3 min-w-0">
            {selectedCard ? (
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex items-baseline gap-1 bg-neutral-950 px-3 py-1.5 rounded-xl border border-neutral-800 shrink-0">
                  <span className="text-2xl font-black text-amber-400 leading-none">
                    {selectedCard.maxRating}
                  </span>
                  <span className="text-[9px] font-bold text-neutral-500 uppercase">
                    OVR
                  </span>
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded text-[11px] border shrink-0 ${getPosBadgeColor(selectedCard.primaryPosition)}`}>
                      {selectedCard.primaryPosition}
                    </span>
                    <h4 className="text-sm font-black text-white truncate">
                      {selectedCard.fullName || selectedCard.commonName}
                    </h4>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-800 text-neutral-300 shrink-0">
                      {selectedCard.cardType}
                    </span>
                    {selectedCard.cardTitle && (
                      <span className="text-xs font-semibold text-cyan-300 truncate hidden md:inline">
                        🏆 {selectedCard.cardTitle}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-emerald-400 font-semibold mt-0.5 flex items-center gap-1.5 truncate">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Selected Player Card Ready • Captures all stats, ratings & skills into {targetRoleLabel}</span>
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-xs text-neutral-400">
                Navigate or click on any player card in the eFHUB website above.
              </div>
            )}
          </div>

          {/* Action Buttons: Inspect Stats & GREEN "Select the Player" Button */}
          <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
            {selectedCard && (
              <button
                type="button"
                onClick={() => setInspectingPlayer(selectedCard)}
                className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors flex items-center gap-1.5"
              >
                <Eye className="w-4 h-4 text-cyan-400" />
                <span className="hidden sm:inline">Inspect Stats Sheet</span>
              </button>
            )}

            {/* THE GREEN "Select the Player" BUTTON */}
            <button
              type="button"
              onClick={handleConfirmSelect}
              className="py-2.5 px-6 rounded-xl text-xs sm:text-sm font-black bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-neutral-950 flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/30 transition-all cursor-pointer ring-2 ring-emerald-400/40"
            >
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 fill-neutral-950" />
              <span>Select the Player</span>
            </button>
          </div>

        </div>

      </div>

      {/* STATS SHEET MODAL */}
      {inspectingPlayer && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-black/90 backdrop-blur-lg animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-neutral-950 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            
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

            <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
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
                          <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${val >= 90 ? 'bg-rose-500' : val >= 80 ? 'bg-emerald-500' : val >= 70 ? 'bg-amber-500' : 'bg-neutral-600'}`}
                              style={{ width: `${Math.min(100, Math.max(10, val))}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

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

            <div className="p-4 bg-neutral-900 border-t border-neutral-800 flex items-center justify-between">
              <button
                onClick={() => setInspectingPlayer(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
              >
                Back
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedCard(inspectingPlayer);
                  onSelectPlayer(inspectingPlayer);
                  setInspectingPlayer(null);
                  onClose();
                }}
                className="px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-400 text-neutral-950 flex items-center gap-2 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
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
