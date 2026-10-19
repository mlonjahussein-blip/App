import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Search, 
  Sparkles, 
  ExternalLink, 
  CheckCircle2, 
  Globe, 
  RefreshCw, 
  ArrowLeft, 
  ArrowRight, 
  Lock, 
  Compass,
  Check
} from 'lucide-react';
import { 
  getAllEfhubCardsForPlayer, 
  EFootballMasterPlayer 
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
  // Browser Navigation & Address Bar State (Only 1 Tab Opening efhub.com)
  const [addressBarInput, setAddressBarInput] = useState('https://efhub.com/');
  const [currentWebUrl, setCurrentWebUrl] = useState('https://efhub.com/');
  const [historyStack, setHistoryStack] = useState<string[]>(['https://efhub.com/']);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  const [iframeKey, setIframeKey] = useState(1);
  const [isLoadingIframe, setIsLoadingIframe] = useState(true);
  
  // Selected Card State (Starts empty, no default Messi or player details displayed)
  const [selectedCard, setSelectedCard] = useState<EFootballMasterPlayer | null>(null);
  const [quickSearchQuery, setQuickSearchQuery] = useState('');

  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Sync address bar input when current URL changes
  useEffect(() => {
    setAddressBarInput(currentWebUrl);
  }, [currentWebUrl]);

  // Reset or initialize on open
  useEffect(() => {
    if (isOpen) {
      setIsLoadingIframe(true);
    }
  }, [isOpen]);

  // Listen for navigation messages and card clicks from the embedded proxy window
  useEffect(() => {
    const handleWindowMessage = async (event: MessageEvent) => {
      if (event.data && event.data.source === 'EFHUB_EMBED') {
        const { href, url, pathname, text, playerId: msgPlayerId, player: embeddedPlayer } = event.data;

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
            // Synthesize player from clicked element
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
    const efhubMatch = currentWebUrl.match(/\/(?:efootball\/)?(?:players|player)\/([0-9a-zA-Z_\-]+)/);
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
    } else {
      onClose();
    }
  };

  const proxySrc = `/api/efhub-proxy?url=${encodeURIComponent(currentWebUrl)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md animate-fade-in overflow-hidden">
      
      {/* IN-BUILT SYSTEM BROWSER WINDOW */}
      <div className="relative w-full max-w-7xl h-[94vh] bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans">
        
        {/* 1. BROWSER WINDOW TITLEBAR & SINGLE TAB STRIP */}
        <div className="bg-[#12141a] px-3 pt-2.5 pb-0 border-b border-neutral-800 flex items-center justify-between gap-2 select-none">
          
          {/* Window Control Buttons & ONLY 1 TAB */}
          <div className="flex items-center gap-2 min-w-0 overflow-x-auto scrollbar-none">
            
            {/* Window Dots (macOS style) */}
            <div className="flex items-center gap-1.5 mr-2 shrink-0">
              <button 
                onClick={onClose}
                className="w-3 h-3 rounded-full bg-rose-500 hover:bg-rose-600 transition-colors"
                title="Close Browser Window"
              />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
            </div>

            {/* ONLY 1 Tab Opening efhub.com */}
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-t-xl text-xs font-bold bg-neutral-900 text-white border-t border-x border-neutral-700 shadow-md shrink-0">
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              <span className="truncate max-w-[160px] sm:max-w-[240px]">
                eFHUB.com • Football Database
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" title="Live efhub.com Active" />
            </div>
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
              title="Open efhub.com in external tab"
            >
              <span>External</span>
              <ExternalLink className="w-3 h-3 text-neutral-400" />
            </a>
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
              title="Close"
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

          {/* Search on efhub.com */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (quickSearchQuery.trim()) {
                navigateTo(`https://efhub.com/players?name=${encodeURIComponent(quickSearchQuery.trim())}`);
              }
            }}
            className="relative shrink-0 flex items-center"
          >
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
            <input
              type="text"
              value={quickSearchQuery}
              onChange={(e) => setQuickSearchQuery(e.target.value)}
              placeholder="Search player on efhub..."
              className="bg-neutral-950 border border-neutral-700/80 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 w-full sm:w-48 md:w-56"
            />
          </form>

        </div>

        {/* 3. BOOKMARKS STRIP (Direct URLs on efhub.com) */}
        <div className="px-3 py-1.5 bg-neutral-950 border-b border-neutral-800/80 flex items-center gap-1.5 overflow-x-auto scrollbar-none text-xs select-none">
          <span className="text-[10px] font-black text-neutral-500 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            Quick Links:
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
            onClick={() => navigateTo('https://efhub.com/players?card_type=epic')}
            className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-300 border border-cyan-800/40 transition-colors shrink-0"
          >
            ⭐ Epic & Show Time
          </button>
          <button
            type="button"
            onClick={() => navigateTo('https://efhub.com/players?card_type=potw')}
            className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border border-emerald-800/40 transition-colors shrink-0"
          >
            🔥 POTW & Highlights
          </button>
          <button
            type="button"
            onClick={() => navigateTo('https://efhub.com/managers')}
            className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 border border-amber-800/40 transition-colors shrink-0"
          >
            👔 Managers
          </button>
        </div>

        {/* 4. MAIN BROWSER CONTENT AREA (Single Live efhub.com Web View) */}
        <div className="relative flex-1 bg-neutral-950 overflow-hidden flex flex-col">
          <div className="relative w-full h-full">
            {isLoadingIframe && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-neutral-950/80 backdrop-blur-sm space-y-3">
                <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-bold text-neutral-300">
                  Loading efhub.com...
                </p>
                <p className="text-[11px] text-neutral-500">
                  In-built system browser • Full navigation & search enabled
                </p>
              </div>
            )}

            <iframe
              ref={iframeRef}
              key={iframeKey}
              src={proxySrc}
              title="eFHUB Live Database Browser"
              className="w-full h-full border-0 bg-[#13151d]"
              onLoad={() => setIsLoadingIframe(false)}
              allow="autoplay; camera; microphone; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              sandbox="allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts allow-downloads"
            />
          </div>
        </div>

        {/* 5. BOTTOM SELECTION BAR (Player details and Inspect Stats Sheet button removed) */}
        <div className="p-3 sm:p-4 bg-[#12141a] border-t border-neutral-800 flex items-center justify-between gap-3 shadow-2xl z-30 shrink-0">
          
          <div className="flex items-center gap-2 min-w-0 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="text-neutral-300 font-semibold truncate">
              {selectedCard ? (
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Card ready: <strong>{selectedCard.fullName || selectedCard.commonName}</strong> ({selectedCard.primaryPosition} · {selectedCard.maxRating} OVR)</span>
                </span>
              ) : (
                <span className="text-neutral-400">
                  Navigate or search <strong className="text-neutral-200">efhub.com</strong> and click any player card to select for <strong className="text-emerald-400">{targetRoleLabel}</strong>
                </span>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
            >
              Cancel
            </button>

            {/* THE GREEN "Select the Player" BUTTON */}
            <button
              type="button"
              onClick={handleConfirmSelect}
              className="py-2.5 px-6 rounded-xl text-xs sm:text-sm font-black bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-neutral-950 flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/30 transition-all cursor-pointer ring-2 ring-emerald-400/40 hover:scale-[1.01] active:scale-[0.99]"
            >
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 fill-neutral-950" />
              <span>Select the Player</span>
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};
