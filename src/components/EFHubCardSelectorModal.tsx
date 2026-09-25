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
  Info
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
  // Navigation & Browser State for the inner window
  const [currentWebUrl, setCurrentWebUrl] = useState('https://efhub.com/');
  const [iframeKey, setIframeKey] = useState(1);
  const [isLoadingIframe, setIsLoadingIframe] = useState(true);
  const [activeTab, setActiveTab] = useState<'live_web' | 'cards_gallery'>('live_web');
  
  // Card Selection & Quick Search State
  const [selectedCard, setSelectedCard] = useState<EFootballMasterPlayer | null>(null);
  const [quickSearchQuery, setQuickSearchQuery] = useState('');
  const [inspectingPlayer, setInspectingPlayer] = useState<EFootballMasterPlayer | null>(null);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Default pre-select a top star player so "Select This Card" is ready immediately
  useEffect(() => {
    if (!selectedCard) {
      const topCards = getAllEfhubCardsForPlayer('');
      if (topCards.length > 0) {
        setSelectedCard(topCards[0]); // e.g. Messi 104 Big Time
      }
    }
  }, [selectedCard]);

  // Listen for messages from the embedded inner window (the eFHUB website frame)
  useEffect(() => {
    const handleWindowMessage = async (event: MessageEvent) => {
      // Check message from our injected proxy script
      if (event.data && event.data.source === 'EFHUB_EMBED') {
        const { type, href, url, pathname, text } = event.data;

        if (url) {
          setCurrentWebUrl(url);
        }

        // If user clicked or navigated to a specific player page: e.g. /efootball/players/... or /players/...
        const playerMatch = (href || pathname || url || '').match(/\/(?:efootball\/)?players\/([0-9a-zA-Z_\-]+)/);
        if (playerMatch && playerMatch[1]) {
          const playerId = playerMatch[1];
          try {
            // Fetch live parsed player card data from backend endpoint
            const res = await fetch(`/api/efhub-player?id=${encodeURIComponent(playerId)}`);
            if (res.ok) {
              const data = await res.json();
              if (data.success && data.player) {
                setSelectedCard(data.player);
                return;
              }
            }
          } catch (e) {
            console.warn('Could not fetch exact player via API, falling back to name match:', e);
          }

          // If text or name is present in click
          if (text) {
            const matchedCards = getAllEfhubCardsForPlayer(text);
            if (matchedCards.length > 0) {
              setSelectedCard(matchedCards[0]);
            }
          }
        }
      }
    };

    window.addEventListener('message', handleWindowMessage);
    return () => window.removeEventListener('message', handleWindowMessage);
  }, []);

  // Quick matching cards based on quick search
  const quickCards = useMemo(() => {
    return getAllEfhubCardsForPlayer(quickSearchQuery).slice(0, 12);
  }, [quickSearchQuery]);

  if (!isOpen) return null;

  // Reload the embedded second window
  const reloadEmbed = () => {
    setIsLoadingIframe(true);
    setIframeKey(k => k + 1);
  };

  // Navigate inner window to a specific player or search query on efhub.com
  const navigateInnerWindow = (targetUrl: string) => {
    setCurrentWebUrl(targetUrl);
    reloadEmbed();
  };

  const handleConfirmSelect = () => {
    if (selectedCard) {
      onSelectPlayer(selectedCard);
      onClose();
    }
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

  const getStatBadgeColor = (val: number) => {
    if (val >= 90) return 'bg-rose-500/25 text-rose-300 border-rose-500/50 font-black';
    if (val >= 80) return 'bg-emerald-500/25 text-emerald-300 border-emerald-500/50 font-black';
    if (val >= 70) return 'bg-amber-500/25 text-amber-300 border-amber-500/50 font-bold';
    return 'bg-neutral-900 text-neutral-400 border-neutral-800 font-medium';
  };

  const proxySrc = `/api/efhub-proxy?url=${encodeURIComponent(currentWebUrl)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-hidden">
      
      {/* FIRST WINDOW: Official eFHUB Card Database Search Window */}
      <div className="relative w-full max-w-7xl h-[94vh] bg-neutral-950 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* First Window Header Bar */}
        <div className="p-3.5 sm:p-4 border-b border-neutral-800 bg-neutral-900/90 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-400 text-neutral-950 font-black shadow-md shadow-emerald-500/20">
              <Zap className="w-5 h-5 fill-neutral-950" />
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
                  <span>Official eFootball Card Database Search</span>
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>pesdb.net Live Window</span>
                </span>
                <span className="text-xs text-neutral-400 font-semibold hidden md:inline">
                  • Target: <strong className="text-emerald-400">{targetRoleLabel}</strong>
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                External websites block iframe embedding. Click <strong className="text-emerald-400">"Open in New Tab"</strong> to browse pesdb.net / efhub.com, or select any card instantly below!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://pesdb.net/efootball/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-neutral-950 shadow-lg shadow-emerald-500/20 transition-all"
              title="Open pesdb.net in separate tab"
            >
              <span>Open in New Tab</span>
              <ExternalLink className="w-4 h-4" />
            </a>

            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition-colors"
              title="Close Database Window"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Browser Navigation Toolbar for the Second Window */}
        <div className="px-3 py-2 bg-neutral-900/60 border-b border-neutral-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 text-xs">
          
          {/* Inner Browser Navigation Controls & Address Bar */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={reloadEmbed}
                className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors"
                title="Refresh Live Database Window"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingIframe ? 'animate-spin text-emerald-400' : ''}`} />
              </button>
              <button
                type="button"
                onClick={() => navigateInnerWindow('https://pesdb.net/efootball/')}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                  currentWebUrl.includes('pesdb.net/efootball')
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                }`}
                title="Go to pesdb.net Homepage"
              >
                pesdb.net
              </button>
              <button
                type="button"
                onClick={() => navigateInnerWindow('https://pesdb.net/efootball/players/')}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                  currentWebUrl.includes('/players')
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                }`}
                title="Go to pesdb.net Players Search"
              >
                Players DB
              </button>
              <button
                type="button"
                onClick={() => navigateInnerWindow('https://efhub.com/')}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                  currentWebUrl.includes('efhub.com')
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                }`}
                title="Go to efhub.com"
              >
                efhub.com
              </button>
            </div>

            {/* Simulated Address Bar */}
            <div className="flex items-center gap-2 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-1.5 flex-1 min-w-0">
              <Globe className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <input
                type="text"
                value={currentWebUrl}
                onChange={(e) => setCurrentWebUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && reloadEmbed()}
                className="bg-transparent text-xs text-neutral-200 w-full focus:outline-none font-mono truncate"
              />
            </div>
          </div>

          {/* Quick Jump Search Box & View Toggle */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
              <input
                type="text"
                value={quickSearchQuery}
                onChange={(e) => setQuickSearchQuery(e.target.value)}
                placeholder="Quick card jump (e.g. Messi, Haaland, Mbappé)..."
                className="bg-neutral-950 border border-neutral-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 w-44 sm:w-64"
              />
            </div>

            {/* Toggle between Live Web View and Grid View */}
            <div className="flex items-center bg-neutral-950 border border-neutral-800 rounded-xl p-0.5">
              <button
                type="button"
                onClick={() => setActiveTab('live_web')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors ${
                  activeTab === 'live_web' ? 'bg-emerald-500 text-neutral-950 shadow' : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Globe className="w-3 h-3" />
                <span>eFHUB Web</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('cards_gallery')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors ${
                  activeTab === 'cards_gallery' ? 'bg-emerald-500 text-neutral-950 shadow' : 'text-neutral-400 hover:text-white'
                }`}
              >
                <LayoutGrid className="w-3 h-3" />
                <span>Cards Grid</span>
              </button>
            </div>
          </div>

        </div>

        {/* Quick Star Cards Selector Strip */}
        <div className="px-3 py-1.5 bg-neutral-950/80 border-b border-neutral-800/80 flex items-center gap-1.5 overflow-x-auto scrollbar-none text-xs">
          <span className="text-[10px] font-black text-neutral-500 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            Quick Cards:
          </span>
          {quickCards.map((player) => {
            const isSelected = selectedCard?.id === player.id;
            return (
              <button
                key={player.id}
                type="button"
                onClick={() => {
                  setSelectedCard(player);
                  if (player.efhubUrl) {
                    setCurrentWebUrl(player.efhubUrl);
                  }
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all shrink-0 flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-emerald-500 text-neutral-950 font-black border-emerald-400 shadow-md'
                    : 'bg-neutral-900 text-neutral-300 hover:text-white border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <span className={`px-1 py-0.2 rounded text-[9px] ${isSelected ? 'bg-neutral-950 text-amber-300' : 'text-amber-400'}`}>
                  {player.maxRating}
                </span>
                <span>{player.commonName || player.fullName}</span>
                <span className={`text-[9px] ${isSelected ? 'text-neutral-900 font-extrabold' : 'text-neutral-400'}`}>
                  {player.primaryPosition}
                </span>
              </button>
            );
          })}
        </div>

        {/* SECOND WINDOW: Embedded Within the First Window */}
        <div className="relative flex-1 bg-neutral-950 overflow-hidden">
          
          {activeTab === 'live_web' ? (
            /* Live Web Window (The second window that automatically opens efhub.com) */
            <div className="relative w-full h-full">
              {isLoadingIframe && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-neutral-950/80 backdrop-blur-sm space-y-3">
                  <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-bold text-neutral-300">
                    Loading live website {currentWebUrl}...
                  </p>
                  <p className="text-[11px] text-neutral-500">
                    Connecting to official eFootball database
                  </p>
                </div>
              )}

              <iframe
                ref={iframeRef}
                key={iframeKey}
                src={proxySrc}
                title="eFHUB Official Website Frame"
                className="w-full h-full border-0 bg-[#13151d]"
                onLoad={() => setIsLoadingIframe(false)}
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
              />
            </div>
          ) : (
            /* Pre-cached Cards Grid View */
            <div className="p-4 overflow-y-auto h-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {quickCards.map((player) => {
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
          )}

        </div>

        {/* BOTTOM SELECTION BAR IN THE FIRST WINDOW: "Select This Card" Request */}
        <div className="p-3.5 sm:p-4 bg-neutral-900 border-t border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xl z-30">
          
          {/* Active Card Detection Preview */}
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
                    <span>Selected eFHUB Card ready • Imports full untrained & max stats into {targetRoleLabel}</span>
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-xs text-neutral-400">
                Click any player card in the eFHUB website above to select.
              </div>
            )}
          </div>

          {/* Action Buttons: "Select This Card" */}
          <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
            {selectedCard && (
              <button
                type="button"
                onClick={() => setInspectingPlayer(selectedCard)}
                className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors flex items-center gap-1.5"
              >
                <Eye className="w-4 h-4 text-cyan-400" />
                <span className="hidden sm:inline">View Stats Sheet</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleConfirmSelect}
              disabled={!selectedCard}
              className="py-2.5 px-6 rounded-xl text-xs sm:text-sm font-black bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-neutral-950 flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/30 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 fill-neutral-950" />
              <span>Select This Card</span>
            </button>
          </div>

        </div>

      </div>

      {/* Inspect Card Stats Sheet Modal */}
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
