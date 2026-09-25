import React, { useState, useEffect } from 'react';
import { 
  UserPlus, 
  Trash2, 
  Plus, 
  UserCheck, 
  Layers, 
  Users,
  ShieldAlert,
  Sparkles,
  Award,
  Zap,
  ExternalLink,
  Search
} from 'lucide-react';
import { TypedPlayerInput, ManagerInputDetails, AnalysisResult, SavedSquad, ALL_EFOOTBALL_PLAYSTYLES } from '../types.ts';
import { ManagerDetailsInput } from './ManagerDetailsInput.tsx';
import { EFHubCardSelectorModal } from './EFHubCardSelectorModal.tsx';
import { EFootballMasterPlayer } from '../lib/efootballDatabase.ts';
import { useAuth } from '../lib/AuthContext.tsx';
import { db } from '../lib/firebase.ts';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface ManualPlayerInputProps {
  typedPlayers: TypedPlayerInput[];
  onChange: (players: TypedPlayerInput[]) => void;
  managerDetails: ManagerInputDetails;
  coaches?: ManagerInputDetails[];
  onManagerChange: (manager: ManagerInputDetails) => void;
  onCoachesChange?: (coaches: ManagerInputDetails[]) => void;
  mode?: 'guided' | 'pure23';
}

export const ManualPlayerInput: React.FC<ManualPlayerInputProps> = ({
  typedPlayers,
  onChange,
  managerDetails,
  coaches,
  onManagerChange,
  onCoachesChange,
  mode = 'guided'
}) => {
  const { user } = useAuth();
  const [savedSquadsList, setSavedSquadsList] = useState<Array<AnalysisResult | (SavedSquad & { identifiedPlayers?: any[] })>>([]);

  useEffect(() => {
    if (!user) return;
    async function loadSaved() {
      try {
        const list: Array<any> = [];

        // 1. Fetch from savedAnalyses collection
        try {
          const q = query(collection(db, 'savedAnalyses'), where('userId', '==', user.uid));
          const snap = await getDocs(q);
          snap.forEach((d) => {
            const data = d.data();
            if (data.analysisData) {
              list.push({ ...data.analysisData, id: d.id, sourceCollection: 'savedAnalyses' });
            }
          });
        } catch (e) {
          console.warn('Could not query savedAnalyses:', e);
        }

        // 2. Fetch from userSquads collection
        try {
          const q2 = query(collection(db, 'userSquads'), where('userId', '==', user.uid));
          const snap2 = await getDocs(q2);
          snap2.forEach((d) => {
            const data = d.data() as SavedSquad;
            if (data && data.players && data.players.length > 0) {
              list.push({
                id: d.id,
                title: data.squadName || 'Saved Squad',
                identifiedPlayers: data.players,
                managerDetails: (data.analysisData && data.analysisData.managerDetails) ? data.analysisData.managerDetails : undefined,
                ...data
              });
            }
          });
        } catch (e) {
          console.warn('Could not query userSquads:', e);
        }

        // 3. Fallback to localStorage
        const cached = localStorage.getItem(`ef_saved_reports_${user.uid}`);
        if (cached) {
          try {
            const cachedReports: AnalysisResult[] = JSON.parse(cached);
            cachedReports.forEach(r => {
              if (!list.some(item => item.id === r.id)) {
                list.push(r);
              }
            });
          } catch (err) {}
        }

        setSavedSquadsList(list);
      } catch (e) {
        console.error('Error loading saved squads:', e);
      }
    }
    loadSaved();
  }, [user]);

  // Pure 23 Squad Form State (Mode 2)
  const [squadPlayerName, setSquadPlayerName] = useState('');
  const [squadPlayerPos, setSquadPlayerPos] = useState('CF');
  const [squadSecondaryPositions, setSquadSecondaryPositions] = useState<string[]>([]);
  const [squadPlayerCardType, setSquadPlayerCardType] = useState('Highlight');
  const [squadPlayerPlaystyle, setSquadPlayerPlaystyle] = useState('Goal Poacher');
  const [squadPlayerRating, setSquadPlayerRating] = useState<number | string>(95);
  const [squadPlayerTeam, setSquadPlayerTeam] = useState('');
  const [squadPlayerLiveUpdate, setSquadPlayerLiveUpdate] = useState<'A' | 'B' | 'C' | 'D' | 'E'>('C');

  // Starting XI Form State (Mode 1)
  const [xiName, setXiName] = useState('');
  const [xiPos, setXiPos] = useState('CF');
  const [xiSecondaryPositions, setXiSecondaryPositions] = useState<string[]>([]);
  const [xiCardType, setXiCardType] = useState('Highlight');
  const [xiPlaystyle, setXiPlaystyle] = useState('Goal Poacher');
  const [xiRating, setXiRating] = useState<number | string>(95);
  const [xiTeam, setXiTeam] = useState('');
  const [xiLiveUpdate, setXiLiveUpdate] = useState<'A' | 'B' | 'C' | 'D' | 'E'>('C');

  // Substitute Form State (Mode 1)
  const [subName, setSubName] = useState('');
  const [subPos, setSubPos] = useState('CF');
  const [subSecondaryPositions, setSubSecondaryPositions] = useState<string[]>([]);
  const [subCardType, setSubCardType] = useState('Highlight');
  const [subPlaystyle, setSubPlaystyle] = useState('Goal Poacher');
  const [subRating, setSubRating] = useState<number | string>(92);
  const [subTeam, setSubTeam] = useState('');
  const [subLiveUpdate, setSubLiveUpdate] = useState<'A' | 'B' | 'C' | 'D' | 'E'>('C');

  // eFHUB Card Selection Modal State
  const [isEfhubModalOpen, setIsEfhubModalOpen] = useState(false);
  const [efhubModalTarget, setEfhubModalTarget] = useState<'pure23' | 'xi' | 'sub'>('pure23');

  const handleSelectEfhubCard = (card: EFootballMasterPlayer) => {
    if (efhubModalTarget === 'pure23') {
      setSquadPlayerName(card.fullName || card.commonName);
      setSquadPlayerPos(card.primaryPosition);
      setSquadSecondaryPositions(card.secondaryPositions || []);
      setSquadPlayerCardType(card.cardType);
      setSquadPlayerPlaystyle(card.playstyle);
      setSquadPlayerRating(card.maxRating || card.baseRating);
      setSquadPlayerTeam(card.club);
    } else if (efhubModalTarget === 'xi') {
      setXiName(card.fullName || card.commonName);
      setXiPos(card.primaryPosition);
      setXiSecondaryPositions(card.secondaryPositions || []);
      setXiCardType(card.cardType);
      setXiPlaystyle(card.playstyle);
      setXiRating(card.maxRating || card.baseRating);
      setXiTeam(card.club);
    } else if (efhubModalTarget === 'sub') {
      setSubName(card.fullName || card.commonName);
      setSubPos(card.primaryPosition);
      setSubSecondaryPositions(card.secondaryPositions || []);
      setSubCardType(card.cardType);
      setSubPlaystyle(card.playstyle);
      setSubRating(card.maxRating || card.baseRating);
      setSubTeam(card.club);
    }
  };

  // Quick Inline Editing State
  const [editingSecondaryForId, setEditingSecondaryForId] = useState<string | null>(null);

  const liveUpdateOptions = ['A', 'B', 'C', 'D', 'E'] as const;

  const positions = ['CF', 'SS', 'LWF', 'RWF', 'AMF', 'CMF', 'DMF', 'LMF', 'RMF', 'LB', 'CB', 'RB', 'GK'];
  
  const cardTypes = [
    'Epic',
    'Show Time',
    'Highlight',
    'Highlight-Showtime',
    'Epic-Showtime',
    'POTW',
    'Booster-POTW',
    'POTD',
    'Booster-POTD',
    'POTS',
    'Trending',
    'Epic-Bigtime',
    'Booster-POTS',
    'Booster',
    'Big Time',
    'Legendary',
    'Featured',
    'Standard'
  ];

  const playstyles = ALL_EFOOTBALL_PLAYSTYLES;

  const startingXI = typedPlayers.filter(p => p.role === 'starting_xi' || !p.role);
  const substitutes = typedPlayers.filter(p => p.role === 'substitute');

  // Add Pure 23 Squad Player (Mode 2)
  const addSquadPlayer = () => {
    if (!squadPlayerName.trim()) return;
    if (typedPlayers.length >= 23) return;

    const newPlayer: TypedPlayerInput = {
      id: 'sq_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      name: squadPlayerName.trim(),
      position: squadPlayerPos,
      secondaryPositions: squadSecondaryPositions.length > 0 ? squadSecondaryPositions : undefined,
      playablePositions: [squadPlayerPos, ...squadSecondaryPositions],
      cardType: squadPlayerCardType,
      playstyle: squadPlayerPlaystyle,
      rating: Math.min(110, Math.max(20, Number(squadPlayerRating) || 90)),
      club: squadPlayerTeam.trim() || undefined,
      role: typedPlayers.length < 11 ? 'starting_xi' : 'substitute',
      liveUpdate: squadPlayerLiveUpdate
    };

    onChange([...typedPlayers, newPlayer]);
    setSquadPlayerName('');
    setSquadPlayerTeam('');
    setSquadSecondaryPositions([]);
    setSquadPlayerLiveUpdate('C');
  };

  // Add Starting XI Player (Mode 1)
  const addStartingXIPlayer = () => {
    if (!xiName.trim()) return;
    if (startingXI.length >= 11) return;

    const newPlayer: TypedPlayerInput = {
      id: 'xi_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      name: xiName.trim(),
      position: xiPos,
      secondaryPositions: xiSecondaryPositions.length > 0 ? xiSecondaryPositions : undefined,
      playablePositions: [xiPos, ...xiSecondaryPositions],
      cardType: xiCardType,
      playstyle: xiPlaystyle,
      rating: Math.min(110, Math.max(20, Number(xiRating) || 90)),
      club: xiTeam.trim() || undefined,
      role: 'starting_xi',
      liveUpdate: xiLiveUpdate
    };

    onChange([...typedPlayers, newPlayer]);
    setXiName('');
    setXiTeam('');
    setXiSecondaryPositions([]);
    setXiLiveUpdate('C');
  };

  // Add Substitute Player (Mode 1)
  const addSubstitutePlayer = () => {
    if (!subName.trim()) return;
    if (substitutes.length >= 12) return;

    const newPlayer: TypedPlayerInput = {
      id: 'sub_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      name: subName.trim(),
      position: subPos,
      secondaryPositions: subSecondaryPositions.length > 0 ? subSecondaryPositions : undefined,
      playablePositions: [subPos, ...subSecondaryPositions],
      cardType: subCardType,
      playstyle: subPlaystyle,
      rating: Math.min(110, Math.max(20, Number(subRating) || 90)),
      club: subTeam.trim() || undefined,
      role: 'substitute',
      liveUpdate: subLiveUpdate
    };

    onChange([...typedPlayers, newPlayer]);
    setSubName('');
    setSubTeam('');
    setSubSecondaryPositions([]);
    setSubLiveUpdate('C');
  };

  const updatePlayerSecondaryPositions = (id: string, newSecondaries: string[]) => {
    onChange(typedPlayers.map(p => p.id === id ? {
      ...p,
      secondaryPositions: newSecondaries,
      playablePositions: [p.position, ...newSecondaries]
    } : p));
  };

  const removePlayer = (id: string) => {
    onChange(typedPlayers.filter(p => p.id !== id));
  };

  const updatePlayerPosition = (id: string, newPos: string) => {
    onChange(typedPlayers.map(p => p.id === id ? { ...p, position: newPos } : p));
  };

  const updatePlayerRating = (id: string, newRating: number | string) => {
    onChange(typedPlayers.map(p => p.id === id ? { ...p, rating: newRating } : p));
  };

  const updatePlayerCardType = (id: string, newCardType: string) => {
    onChange(typedPlayers.map(p => p.id === id ? { ...p, cardType: newCardType } : p));
  };

  const updatePlayerPlaystyle = (id: string, newPlaystyle: string) => {
    onChange(typedPlayers.map(p => p.id === id ? { ...p, playstyle: newPlaystyle } : p));
  };

  const updatePlayerLiveUpdate = (id: string, newLiveUpdate: string) => {
    onChange(typedPlayers.map(p => p.id === id ? { ...p, liveUpdate: newLiveUpdate } : p));
  };

  const updatePlayerClub = (id: string, newClub: string) => {
    onChange(typedPlayers.map(p => p.id === id ? { ...p, club: newClub } : p));
  };

  const clearAllSquad = () => {
    onChange([]);
  };

  const handleLoadSavedSquad = (sId: string) => {
    if (!sId) return;
    const found: any = savedSquadsList.find(s => s.id === sId);
    if (found) {
      const playersSource: any[] = found.identifiedPlayers || (found.bestXI && found.bestXI.players) || found.players || [];
      if (playersSource && playersSource.length > 0) {
        const mapped: TypedPlayerInput[] = playersSource.map((p, i) => {
          const cardTypeVal = p.cardType || p.playerType || (p.extractedVisuals && p.extractedVisuals.cardType) || p.cardEdition || 'Highlight';
          const clubVal = p.club || p.team || '';
          return {
            id: p.id || `loaded_${i}_${Date.now()}`,
            name: p.name || `Player ${i + 1}`,
            position: p.position || 'CF',
            rating: p.rating || 90,
            cardType: cardTypeVal,
            playstyle: p.playstyle || 'Goal Poacher',
            club: clubVal,
            nationality: p.nationality,
            skills: Array.isArray(p.skills) ? p.skills : [],
            role: p.role || (i < 11 ? 'starting_xi' : 'substitute'),
            liveUpdate: p.liveUpdate || 'C'
          };
        });
        onChange(mapped);
        if (found.coaches && Array.isArray(found.coaches) && onCoachesChange) {
          onCoachesChange(found.coaches);
        }
        if (found.managerDetails && onManagerChange) {
          onManagerChange(found.managerDetails);
        }
      }
    }
  };

  const getPositionColor = (pos: string) => {
    switch (pos) {
      case 'GK': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'CB':
      case 'LB':
      case 'RB': return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
      case 'DMF':
      case 'CMF':
      case 'AMF':
      case 'LMF':
      case 'RMF': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'CF':
      case 'SS':
      case 'LWF':
      case 'RWF': return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      default: return 'text-neutral-400 bg-neutral-800 border-neutral-700';
    }
  };

  const getLiveUpdateBadgeStyle = (condition?: string) => {
    switch (condition?.toUpperCase()) {
      case 'A': return 'text-emerald-300 bg-emerald-950/80 border-emerald-500/60 font-black';
      case 'B': return 'text-cyan-300 bg-cyan-950/80 border-cyan-500/60 font-black';
      case 'C': return 'text-amber-300 bg-neutral-900 border-amber-500/40 font-bold';
      case 'D': return 'text-orange-400 bg-orange-950/80 border-orange-500/60 font-black';
      case 'E': return 'text-rose-400 bg-rose-950/80 border-rose-500/60 font-black';
      default: return 'text-neutral-400 bg-neutral-900 border-neutral-700 font-medium';
    }
  };

  const getCardTypeBadgeStyle = (ct?: string) => {
    if (!ct) return 'text-neutral-300 border-neutral-700 bg-neutral-900';
    const lower = ct.toLowerCase();
    if (lower.includes('epic')) return 'text-amber-300 border-amber-500/40 bg-amber-950/40';
    if (lower.includes('show time') || lower.includes('showtime')) return 'text-cyan-300 border-cyan-500/40 bg-cyan-950/40';
    if (lower.includes('potw') || lower.includes('potd') || lower.includes('pots')) return 'text-emerald-300 border-emerald-500/40 bg-emerald-950/40';
    if (lower.includes('big time') || lower.includes('legendary')) return 'text-purple-300 border-purple-500/40 bg-purple-950/40';
    if (lower.includes('highlight') || lower.includes('featured')) return 'text-blue-300 border-blue-500/40 bg-blue-950/40';
    return 'text-neutral-400 border-neutral-700 bg-neutral-900';
  };

  const renderPlayerSecondaryPosFooter = (player: TypedPlayerInput) => {
    const isEditing = editingSecondaryForId === player.id;
    const secondaries = player.secondaryPositions || [];

    return (
      <div className="pt-1.5 border-t border-neutral-800/60 space-y-1">
        <div className="flex items-center justify-between text-[10px]">
          <div className="flex items-center gap-1 overflow-x-auto py-0.5">
            <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider shrink-0">
              Alt Pos:
            </span>
            {secondaries.length > 0 ? (
              secondaries.map(sp => (
                <span key={sp} className="px-1.5 py-0.2 rounded text-[9px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                  {sp}
                </span>
              ))
            ) : (
              <span className="text-[9px] text-neutral-600 italic shrink-0">None</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setEditingSecondaryForId(isEditing ? null : player.id)}
            className="text-[9px] font-bold text-neutral-400 hover:text-emerald-400 bg-neutral-950 px-1.5 py-0.5 rounded border border-neutral-800 hover:border-emerald-500/40 transition-colors shrink-0 ml-1"
          >
            {isEditing ? 'Done' : '+ Alt Pos'}
          </button>
        </div>

        {isEditing && (
          <div className="p-2 bg-neutral-950 rounded-xl border border-emerald-500/30 space-y-1 mt-1">
            <span className="text-[9px] font-bold text-emerald-400 block">Select alternate positions for {player.name}:</span>
            <div className="flex flex-wrap gap-1">
              {positions.filter(p => p !== player.position).map(p => {
                const isSel = secondaries.includes(p);
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      const updated = isSel ? secondaries.filter(x => x !== p) : [...secondaries, p];
                      updatePlayerSecondaryPositions(player.id, updated);
                    }}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold border transition-colors ${
                      isSel
                        ? 'bg-emerald-500 text-neutral-950 font-black border-emerald-400'
                        : 'bg-neutral-900 text-neutral-400 hover:text-white border-neutral-800'
                    }`}
                  >
                    {isSel ? `✓ ${p}` : `+ ${p}`}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderSecondaryPosSelector = (
    primaryPos: string,
    selectedSecondaries: string[],
    setSelectedSecondaries: (pos: string[]) => void,
    accentColor: 'emerald' | 'cyan' = 'emerald'
  ) => {
    const activeClass = accentColor === 'emerald'
      ? 'bg-emerald-500 text-neutral-950 font-black border-emerald-400'
      : 'bg-cyan-500 text-neutral-950 font-black border-cyan-400';

    return (
      <div className="space-y-1.5 pt-1.5 col-span-full">
        <div className="flex items-center justify-between">
          <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
            Secondary / Alternate Playable Positions <span className="text-neutral-500 font-normal lowercase">(optional)</span>
          </label>
          {selectedSecondaries.length > 0 && (
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${accentColor === 'emerald' ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : 'text-cyan-400 bg-cyan-500/10 border border-cyan-500/20'}`}>
              {selectedSecondaries.length} selected ({selectedSecondaries.join(', ')})
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1 bg-neutral-950 p-2 rounded-xl border border-neutral-800">
          {positions.filter(p => p !== primaryPos).map(p => {
            const isSelected = selectedSecondaries.includes(p);
            return (
              <button
                key={p}
                type="button"
                onClick={() => {
                  if (isSelected) {
                    setSelectedSecondaries(selectedSecondaries.filter(x => x !== p));
                  } else {
                    setSelectedSecondaries([...selectedSecondaries, p]);
                  }
                }}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition-all border ${
                  isSelected
                    ? activeClass
                    : 'bg-neutral-900 text-neutral-400 hover:text-white border-neutral-800 hover:border-neutral-700'
                }`}
              >
                {isSelected ? `✓ ${p}` : `+ ${p}`}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">

      {/* 1. Manager Details Section */}
      <ManagerDetailsInput
        managerDetails={managerDetails}
        coaches={coaches}
        onManagerChange={onManagerChange}
        onCoachesChange={onCoachesChange}
        onChange={onManagerChange}
      />

      {/* 2. Mode-Specific Player Input Form */}
      {mode === 'pure23' ? (
        /* MODE 2: Unified 23-Player Input Form */
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                <Users className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base font-black text-white">
                  Add Squad Player ({typedPlayers.length} / 23)
                </h3>
                <p className="text-xs text-neutral-400">
                  Enter up to 23 squad players manually or pick from official eFHUB database.
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
              <button
                type="button"
                onClick={() => {
                  setEfhubModalTarget('pure23');
                  setIsEfhubModalOpen(true);
                }}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-neutral-950 flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
              >
                <Zap className="w-4 h-4 fill-neutral-950" />
                Select Card from eFHUB Database (efhub.com)
              </button>

              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                typedPlayers.length >= 23 
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' 
                  : typedPlayers.length >= 11
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-neutral-800 text-neutral-400 border-neutral-700'
              }`}>
                {typedPlayers.length}/23 Players Entered
              </span>
            </div>
          </div>

          {/* Unified Add Player Input Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3 items-end">
            
            {/* Player's Name */}
            <div className="lg:col-span-2">
              <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
                Player's Name *
              </label>
              <input
                type="text"
                value={squadPlayerName}
                onChange={(e) => setSquadPlayerName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addSquadPlayer()}
                placeholder="e.g. L. Messi"
                className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Team / Club */}
            <div className="lg:col-span-1">
              <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
                Team / Club
              </label>
              <input
                type="text"
                value={squadPlayerTeam}
                onChange={(e) => setSquadPlayerTeam(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addSquadPlayer()}
                placeholder="e.g. Inter Miami"
                className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Pos */}
            <div>
              <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
                Pos
              </label>
              <select
                value={squadPlayerPos}
                onChange={(e) => setSquadPlayerPos(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-2.5 py-2 text-xs text-white font-bold focus:outline-none focus:border-emerald-500"
              >
                {positions.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Card Type */}
            <div>
              <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
                Card Type
              </label>
              <select
                value={squadPlayerCardType}
                onChange={(e) => setSquadPlayerCardType(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                {cardTypes.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Playing Style */}
            <div>
              <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
                Playing Style
              </label>
              <select
                value={squadPlayerPlaystyle}
                onChange={(e) => setSquadPlayerPlaystyle(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                {playstyles.map(ps => (
                  <option key={ps} value={ps}>{ps}</option>
                ))}
              </select>
            </div>

            {/* OVR & Live Update */}
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
                  OVR
                </label>
                <input
                  type="number"
                  min="20"
                  max="110"
                  value={squadPlayerRating}
                  onChange={(e) => setSquadPlayerRating(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-2 py-2 text-xs text-amber-300 font-black text-center focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
                  Live
                </label>
                <select
                  value={squadPlayerLiveUpdate}
                  onChange={(e) => setSquadPlayerLiveUpdate(e.target.value as any)}
                  className={`w-full border rounded-xl px-1 py-2 text-xs text-center font-black focus:outline-none ${getLiveUpdateBadgeStyle(squadPlayerLiveUpdate)}`}
                >
                  {liveUpdateOptions.map(lu => (
                    <option key={lu} value={lu}>{lu}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Secondary Positions Selector */}
            {renderSecondaryPosSelector(squadPlayerPos, squadSecondaryPositions, setSquadSecondaryPositions, 'emerald')}

          </div>

          {/* Add Player Button */}
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={addSquadPlayer}
              disabled={!squadPlayerName.trim() || typedPlayers.length >= 23}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              <Plus className="w-4 h-4" />
              Add Player to Squad ({typedPlayers.length} / 23)
            </button>
          </div>
        </div>
      ) : (
        /* MODE 1: Guided XI + Substitutes Forms */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Starting XI Form */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                  <UserPlus className="w-4 h-4" />
                </span>
                <h3 className="text-sm font-bold text-white">
                  Add Starting XI Player
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEfhubModalTarget('xi');
                    setIsEfhubModalOpen(true);
                  }}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-neutral-950 flex items-center gap-1 shadow-sm transition-all cursor-pointer shrink-0"
                >
                  <Zap className="w-3.5 h-3.5 fill-neutral-950" />
                  Select Card from eFHUB
                </button>

                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${startingXI.length >= 11 ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                  {startingXI.length} / 11 XI
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  Player's Name *
                </label>
                <input
                  type="text"
                  value={xiName}
                  onChange={(e) => setXiName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addStartingXIPlayer()}
                  placeholder="e.g. Lionel Messi"
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  Position
                </label>
                <select
                  value={xiPos}
                  onChange={(e) => setXiPos(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {positions.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  Card Type
                </label>
                <select
                  value={xiCardType}
                  onChange={(e) => setXiCardType(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {cardTypes.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  Playing Style
                </label>
                <select
                  value={xiPlaystyle}
                  onChange={(e) => setXiPlaystyle(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {playstyles.map(ps => (
                    <option key={ps} value={ps}>{ps}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                    OVR
                  </label>
                  <input
                    type="number"
                    min="20"
                    max="110"
                    value={xiRating}
                    onChange={(e) => setXiRating(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-2 py-2 text-xs text-amber-300 font-black text-center focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                    Live
                  </label>
                  <select
                    value={xiLiveUpdate}
                    onChange={(e) => setXiLiveUpdate(e.target.value as any)}
                    className={`w-full border rounded-xl px-1 py-2 text-xs text-center font-black focus:outline-none ${getLiveUpdateBadgeStyle(xiLiveUpdate)}`}
                  >
                    {liveUpdateOptions.map(lu => (
                      <option key={lu} value={lu}>{lu}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  Team / Club
                </label>
                <input
                  type="text"
                  value={xiTeam}
                  onChange={(e) => setXiTeam(e.target.value)}
                  placeholder="e.g. Inter Miami"
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Secondary Positions Selector */}
              {renderSecondaryPosSelector(xiPos, xiSecondaryPositions, setXiSecondaryPositions, 'emerald')}
            </div>

            <button
              type="button"
              onClick={addStartingXIPlayer}
              disabled={!xiName.trim() || startingXI.length >= 11}
              className="w-full py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5 shadow-md"
            >
              <Plus className="w-4 h-4" />
              Add to Starting XI ({startingXI.length}/11)
            </button>
          </div>

          {/* Substitutes Form */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400">
                  <UserPlus className="w-4 h-4" />
                </span>
                <h3 className="text-sm font-bold text-white">
                  Add Substitute Player
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEfhubModalTarget('sub');
                    setIsEfhubModalOpen(true);
                  }}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-neutral-950 flex items-center gap-1 shadow-sm transition-all cursor-pointer shrink-0"
                >
                  <Zap className="w-3.5 h-3.5 fill-neutral-950" />
                  Select Card from eFHUB
                </button>

                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${substitutes.length >= 12 ? 'bg-rose-500/20 text-rose-300' : 'bg-cyan-500/20 text-cyan-300'}`}>
                  {substitutes.length} / 12 Subs
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  Player's Name *
                </label>
                <input
                  type="text"
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addSubstitutePlayer()}
                  placeholder="e.g. Erling Haaland"
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  Position
                </label>
                <select
                  value={subPos}
                  onChange={(e) => setSubPos(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  {positions.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  Card Type
                </label>
                <select
                  value={subCardType}
                  onChange={(e) => setSubCardType(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  {cardTypes.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  Playing Style
                </label>
                <select
                  value={subPlaystyle}
                  onChange={(e) => setSubPlaystyle(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  {playstyles.map(ps => (
                    <option key={ps} value={ps}>{ps}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                    OVR
                  </label>
                  <input
                    type="number"
                    min="20"
                    max="110"
                    value={subRating}
                    onChange={(e) => setSubRating(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-2 py-2 text-xs text-amber-300 font-black text-center focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                    Live
                  </label>
                  <select
                    value={subLiveUpdate}
                    onChange={(e) => setSubLiveUpdate(e.target.value as any)}
                    className={`w-full border rounded-xl px-1 py-2 text-xs text-center font-black focus:outline-none ${getLiveUpdateBadgeStyle(subLiveUpdate)}`}
                  >
                    {liveUpdateOptions.map(lu => (
                      <option key={lu} value={lu}>{lu}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  Team / Club
                </label>
                <input
                  type="text"
                  value={subTeam}
                  onChange={(e) => setSubTeam(e.target.value)}
                  placeholder="e.g. Manchester City"
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Secondary Positions Selector */}
              {renderSecondaryPosSelector(subPos, subSecondaryPositions, setSubSecondaryPositions, 'cyan')}
            </div>

            <button
              type="button"
              onClick={addSubstitutePlayer}
              disabled={!subName.trim() || substitutes.length >= 12}
              className="w-full py-2.5 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-neutral-950 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5 shadow-md"
            >
              <Plus className="w-4 h-4" />
              Add to Substitutes ({substitutes.length}/12)
            </button>
          </div>

        </div>
      )}

      {/* 3. Selected Squad (0 / 23 players) Area */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
              <Layers className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-black text-white">
                Selected Squad ({typedPlayers.length} / 23 players)
              </h3>
              <p className="text-xs text-neutral-400">
                Starting XI: <span className="text-emerald-400 font-bold">{startingXI.length}/11</span> • Substitutes: <span className="text-cyan-400 font-bold">{substitutes.length}/12</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Load Saved Squad Dropdown */}
            {savedSquadsList.length > 0 && (
              <select
                onChange={(e) => {
                  handleLoadSavedSquad(e.target.value);
                  e.target.value = '';
                }}
                defaultValue=""
                className="bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-emerald-400 font-bold focus:outline-none focus:border-emerald-500 cursor-pointer shadow-sm"
              >
                <option value="" disabled>📂 Load Saved Squad...</option>
                {savedSquadsList.map((s, idx) => (
                  <option key={s.id || idx} value={s.id}>
                    {s.title || (s as any).squadName || 'Saved Squad'} ({s.identifiedPlayers?.length || (s as any).players?.length || 0} players)
                  </option>
                ))}
              </select>
            )}

            {typedPlayers.length > 0 && (
              <button
                type="button"
                onClick={clearAllSquad}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 transition-colors shadow-sm"
              >
                Clear All Players
              </button>
            )}
          </div>
        </div>

        {typedPlayers.length === 0 ? (
          <div className="border border-dashed border-neutral-800 rounded-2xl p-10 text-center bg-neutral-950/40 space-y-2">
            <UserPlus className="w-10 h-10 text-neutral-600 mx-auto" />
            <p className="text-sm font-semibold text-neutral-300">
              No players added to squad yet
            </p>
            <p className="text-xs text-neutral-500 max-w-md mx-auto">
              Add players using the form above or load a previously saved squad.
            </p>
          </div>
        ) : (
          <div className="space-y-6">

            {/* In Pure23 mode: render single unified list. In Guided mode: render XI and Subs separated */}
            {mode === 'pure23' ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    Squad Players ({typedPlayers.length} / 23)
                  </span>
                  {typedPlayers.length >= 23 && (
                    <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      Full 23-Player Squad Complete
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {typedPlayers.map((player, idx) => (
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
                            {player.club && (
                              <span className="text-[10px] text-neutral-400 block truncate">
                                {player.club}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Live Update Condition */}
                          <select
                            value={player.liveUpdate || 'C'}
                            onChange={(e) => updatePlayerLiveUpdate(player.id, e.target.value)}
                            className={`px-1.5 py-1 rounded text-[10px] font-black border cursor-pointer ${getLiveUpdateBadgeStyle(player.liveUpdate)}`}
                            title="Live Update Condition (A to E)"
                          >
                            {liveUpdateOptions.map(lu => (
                              <option key={lu} value={lu} className="bg-neutral-900 text-white font-bold">
                                {lu}
                              </option>
                            ))}
                          </select>

                          {/* Rating Input */}
                          <div className="flex items-center gap-1 bg-neutral-950 px-2 py-1 rounded-lg border border-neutral-800">
                            <input
                              type="number"
                              min="20"
                              max="110"
                              value={player.rating === '' ? '' : player.rating}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === '') {
                                  updatePlayerRating(player.id, '');
                                  return;
                                }
                                const num = parseInt(val, 10);
                                updatePlayerRating(player.id, isNaN(num) ? val : num);
                              }}
                              onBlur={(e) => {
                                const num = parseInt(e.target.value, 10);
                                updatePlayerRating(player.id, isNaN(num) ? 90 : Math.min(110, Math.max(20, num)));
                              }}
                              className="w-12 bg-transparent text-xs font-black text-amber-300 text-center focus:outline-none"
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
                        <select
                          value={player.cardType || 'Highlight'}
                          onChange={(e) => updatePlayerCardType(player.id, e.target.value)}
                          className={`bg-neutral-950 border border-neutral-700 text-[9px] font-bold rounded px-1.5 py-0.5 focus:outline-none focus:border-emerald-500 cursor-pointer ${getCardTypeBadgeStyle(player.cardType)}`}
                        >
                          {cardTypes.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        
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

                      {/* Alternate Positions Badge & Quick Editor */}
                      {renderPlayerSecondaryPosFooter(player)}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
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
                                {player.club && (
                                  <span className="text-[10px] text-neutral-400 block truncate">
                                    {player.club}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {/* Live Update Condition */}
                              <select
                                value={player.liveUpdate || 'C'}
                                onChange={(e) => updatePlayerLiveUpdate(player.id, e.target.value)}
                                className={`px-1.5 py-1 rounded text-[10px] font-black border cursor-pointer ${getLiveUpdateBadgeStyle(player.liveUpdate)}`}
                                title="Live Update Condition (A to E)"
                              >
                                {liveUpdateOptions.map(lu => (
                                  <option key={lu} value={lu} className="bg-neutral-900 text-white font-bold">
                                    {lu}
                                  </option>
                                ))}
                              </select>

                              {/* Rating Input */}
                              <div className="flex items-center gap-1 bg-neutral-950 px-2 py-1 rounded-lg border border-neutral-800">
                                <input
                                  type="number"
                                  min="20"
                                  max="110"
                                  value={player.rating === '' ? '' : player.rating}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === '') {
                                      updatePlayerRating(player.id, '');
                                      return;
                                    }
                                    const num = parseInt(val, 10);
                                    updatePlayerRating(player.id, isNaN(num) ? val : num);
                                  }}
                                  onBlur={(e) => {
                                    const num = parseInt(e.target.value, 10);
                                    updatePlayerRating(player.id, isNaN(num) ? 90 : Math.min(110, Math.max(20, num)));
                                  }}
                                  className="w-12 bg-transparent text-xs font-black text-amber-300 text-center focus:outline-none"
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
                            <select
                              value={player.cardType || 'Highlight'}
                              onChange={(e) => updatePlayerCardType(player.id, e.target.value)}
                              className={`bg-neutral-950 border border-neutral-700 text-[9px] font-bold rounded px-1.5 py-0.5 focus:outline-none focus:border-emerald-500 cursor-pointer ${getCardTypeBadgeStyle(player.cardType)}`}
                            >
                              {cardTypes.map(c => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                            
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

                          {/* Alternate Positions Badge & Quick Editor */}
                          {renderPlayerSecondaryPosFooter(player)}
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
                                {player.club && (
                                  <span className="text-[10px] text-neutral-400 block truncate">
                                    {player.club}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {/* Live Update Condition */}
                              <select
                                value={player.liveUpdate || 'C'}
                                onChange={(e) => updatePlayerLiveUpdate(player.id, e.target.value)}
                                className={`px-1.5 py-1 rounded text-[10px] font-black border cursor-pointer ${getLiveUpdateBadgeStyle(player.liveUpdate)}`}
                                title="Live Update Condition (A to E)"
                              >
                                {liveUpdateOptions.map(lu => (
                                  <option key={lu} value={lu} className="bg-neutral-900 text-white font-bold">
                                    {lu}
                                  </option>
                                ))}
                              </select>

                              {/* Rating Input */}
                              <div className="flex items-center gap-1 bg-neutral-950 px-2 py-1 rounded-lg border border-neutral-800">
                                <input
                                  type="number"
                                  min="20"
                                  max="110"
                                  value={player.rating === '' ? '' : player.rating}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === '') {
                                      updatePlayerRating(player.id, '');
                                      return;
                                    }
                                    const num = parseInt(val, 10);
                                    updatePlayerRating(player.id, isNaN(num) ? val : num);
                                  }}
                                  onBlur={(e) => {
                                    const num = parseInt(e.target.value, 10);
                                    updatePlayerRating(player.id, isNaN(num) ? 90 : Math.min(110, Math.max(20, num)));
                                  }}
                                  className="w-12 bg-transparent text-xs font-black text-amber-300 text-center focus:outline-none"
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
                            <select
                              value={player.cardType || 'Highlight'}
                              onChange={(e) => updatePlayerCardType(player.id, e.target.value)}
                              className={`bg-neutral-950 border border-neutral-700 text-[9px] font-bold rounded px-1.5 py-0.5 focus:outline-none focus:border-cyan-500 cursor-pointer ${getCardTypeBadgeStyle(player.cardType)}`}
                            >
                              {cardTypes.map(c => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                            
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

                          {/* Alternate Positions Badge & Quick Editor */}
                          {renderPlayerSecondaryPosFooter(player)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

          </div>
        )}
      </div>

      {/* eFHUB Card Selector Modal */}
      <EFHubCardSelectorModal
        isOpen={isEfhubModalOpen}
        onClose={() => setIsEfhubModalOpen(false)}
        onSelectPlayer={handleSelectEfhubCard}
        targetRoleLabel={efhubModalTarget === 'pure23' ? 'Squad Player' : efhubModalTarget === 'xi' ? 'Starting XI Player' : 'Substitute Player'}
      />

    </div>
  );
};
