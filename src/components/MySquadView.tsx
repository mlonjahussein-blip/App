import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext.tsx';
import { db } from '../lib/firebase.ts';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  deleteDoc, 
  doc,
  updateDoc
} from 'firebase/firestore';
import { PlayerData, AnalysisResult, SavedSquad } from '../types.ts';
import { 
  Shield, 
  Sparkles, 
  Trash2, 
  ExternalLink,
  Edit2,
  AlertTriangle,
  X,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Users
} from 'lucide-react';

interface MySquadProps {
  latestAnalysis: AnalysisResult | null;
  onNavigateToAnalyzer: () => void;
  onOpenAnalysis: (analysis: AnalysisResult) => void;
  onSelectPlayerForBuilder: (player: PlayerData) => void;
}

export const MySquadView: React.FC<MySquadProps> = ({
  latestAnalysis,
  onNavigateToAnalyzer,
  onOpenAnalysis,
  onSelectPlayerForBuilder
}) => {
  const { user, profile } = useAuth();
  
  // State for squads
  const [squads, setSquads] = useState<SavedSquad[]>([]);
  const [selectedSquadId, setSelectedSquadId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Deletion modal state
  const [squadToDelete, setSquadToDelete] = useState<SavedSquad | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Toast notification
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Rename squad state
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');

  // Default fallback players if completely empty and no analysis
  const defaultFallbackPlayers: PlayerData[] = [
    { id: 'm1', name: 'T. Courtois', position: 'GK', rating: 96, playstyle: 'Defensive Goalkeeper', confidence: 'High' as const },
    { id: 'm2', name: 'V. van Dijk', position: 'CB', rating: 97, playstyle: 'Build Up', confidence: 'High' as const },
    { id: 'm3', name: 'A. Rüdiger', position: 'CB', rating: 96, playstyle: 'Destroyer', confidence: 'High' as const },
    { id: 'm4', name: 'K. Walker', position: 'RB', rating: 94, playstyle: 'Defensive Fullback', confidence: 'High' as const },
    { id: 'm5', name: 'T. Hernández', position: 'LB', rating: 95, playstyle: 'Offensive Fullback', confidence: 'High' as const },
    { id: 'm6', name: 'Rodri', position: 'DMF', rating: 97, playstyle: 'Anchor Man', confidence: 'High' as const },
    { id: 'm7', name: 'L. Modrić', position: 'CMF', rating: 96, playstyle: 'Orchestrator', confidence: 'High' as const },
    { id: 'm8', name: 'K. De Bruyne', position: 'AMF', rating: 98, playstyle: 'Hole Player', confidence: 'High' as const },
    { id: 'm9', name: 'V. Júnior', position: 'LWF', rating: 97, playstyle: 'Roaming Flank', confidence: 'High' as const },
    { id: 'm10', name: 'M. Salah', position: 'RWF', rating: 97, playstyle: 'Prolific Winger', confidence: 'High' as const },
    { id: 'm11', name: 'E. Haaland', position: 'CF', rating: 99, playstyle: 'Goal Poacher', confidence: 'High' as const }
  ];

  // Fetch squads from Firestore
  const fetchUserSquads = async () => {
    if (!user) {
      // If not logged in, but latestAnalysis is present, display as single squad
      if (latestAnalysis) {
        const localSessionSquad: SavedSquad = {
          id: latestAnalysis.id || 'session-analysis',
          userId: 'guest',
          squadName: latestAnalysis.title || 'Recent Analyzed Squad',
          formation: latestAnalysis.recommendedFormation || '4-2-1-3',
          playstyle: latestAnalysis.coachRecommendation?.tacticalStyle || 'Quick Counter',
          squadRating: latestAnalysis.squadRatings?.overall || 85,
          players: latestAnalysis.identifiedPlayers || [],
          analysisData: latestAnalysis,
          updatedAt: latestAnalysis.createdAt || new Date().toISOString()
        };
        setSquads([localSessionSquad]);
        setSelectedSquadId(localSessionSquad.id);
      } else {
        setSquads([]);
      }
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const fetchedSquads: SavedSquad[] = [];
      const seenIds = new Set<string>();

      // 1. Query userSquads collection
      try {
        const qSquads = query(collection(db, 'userSquads'), where('userId', '==', user.uid));
        const squadsSnap = await getDocs(qSquads);
        squadsSnap.forEach((docSnap) => {
          const data = docSnap.data();
          seenIds.add(docSnap.id);
          fetchedSquads.push({
            id: docSnap.id,
            userId: data.userId,
            squadName: data.squadName || 'Saved Squad',
            formation: data.formation || '4-2-1-3',
            playstyle: data.playstyle || 'Quick Counter',
            squadRating: data.squadRating || 85,
            players: data.players || [],
            analysisData: data.analysisData,
            updatedAt: data.updatedAt || data.createdAt || new Date().toISOString(),
            createdAt: data.createdAt,
            sourceCollection: 'userSquads'
          });
        });
      } catch (err) {
        console.warn('Could not query userSquads collection:', err);
      }

      // 2. Query savedAnalyses collection for any analyses not yet in userSquads
      try {
        const qAnalyses = query(collection(db, 'savedAnalyses'), where('userId', '==', user.uid));
        const analysesSnap = await getDocs(qAnalyses);
        analysesSnap.forEach((docSnap) => {
          const data = docSnap.data();
          const analysisResult: AnalysisResult = data.analysisData;
          if (analysisResult && !seenIds.has(docSnap.id)) {
            // Check if this report's title or analysis id is already covered
            const alreadyPresent = fetchedSquads.some(
              (s) => s.analysisData?.id === docSnap.id || s.id === docSnap.id
            );
            if (!alreadyPresent) {
              fetchedSquads.push({
                id: docSnap.id,
                userId: data.userId,
                squadName: data.title || analysisResult.title || 'Saved Analysis Squad',
                formation: analysisResult.recommendedFormation || '4-2-1-3',
                playstyle: analysisResult.coachRecommendation?.tacticalStyle || 'Quick Counter',
                squadRating: data.squadRating || analysisResult.squadRatings?.overall || 85,
                players: analysisResult.identifiedPlayers || [],
                analysisData: { ...analysisResult, id: docSnap.id },
                updatedAt: data.createdAt || new Date().toISOString(),
                createdAt: data.createdAt,
                sourceCollection: 'savedAnalyses'
              });
            }
          }
        });
      } catch (err) {
        console.warn('Could not query savedAnalyses collection:', err);
      }

      // 3. Fallback to localStorage cache if network is offline
      if (fetchedSquads.length === 0) {
        const cached = localStorage.getItem(`ef_user_squads_${user.uid}`);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              fetchedSquads.push(...parsed);
            }
          } catch (e) {}
        }
      }

      // Sort newest first
      fetchedSquads.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      setSquads(fetchedSquads);
      if (fetchedSquads.length > 0) {
        setSelectedSquadId((prev) => (prev && fetchedSquads.some((s) => s.id === prev) ? prev : fetchedSquads[0].id));
      } else {
        setSelectedSquadId(null);
      }
    } catch (err) {
      console.error('Error fetching squads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserSquads();
  }, [user, latestAnalysis]);

  // Handle Escape key listener to cancel delete modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) {
        setSquadToDelete(null);
        setDeleteError(null);
      }
    };
    if (squadToDelete) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [squadToDelete, isDeleting]);

  // Permanent Backend Deletion in Firestore
  const handleConfirmDelete = async () => {
    if (!squadToDelete) return;

    // 1. Authentication check
    if (!user) {
      setDeleteError('You must be logged in to delete a squad.');
      return;
    }

    // 2. Ownership check: squad's userId must match the currently authenticated user's uid
    if (squadToDelete.userId && squadToDelete.userId !== user.uid) {
      setDeleteError('Unauthorized: You can only delete your own squad.');
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      // 3. Firestore Document Deletion
      if (squadToDelete.id && squadToDelete.id !== 'session-analysis') {
        if (squadToDelete.sourceCollection === 'savedAnalyses') {
          await deleteDoc(doc(db, 'savedAnalyses', squadToDelete.id));
        } else {
          await deleteDoc(doc(db, 'userSquads', squadToDelete.id));
          // If there is an associated savedAnalyses report, also clean it up
          if (squadToDelete.analysisData?.id) {
            try {
              await deleteDoc(doc(db, 'savedAnalyses', squadToDelete.analysisData.id));
            } catch (ignore) {}
          }
        }
      }

      // 4. Update localStorage cache
      const cacheKey = `ef_user_squads_${user.uid}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          const filtered = parsed.filter((s: SavedSquad) => s.id !== squadToDelete.id);
          localStorage.setItem(cacheKey, JSON.stringify(filtered));
        } catch (e) {}
      }

      // 5. Immediate UI update: remove card and update count
      const deletedId = squadToDelete.id;
      setSquads((prev) => {
        const remaining = prev.filter((s) => s.id !== deletedId);
        if (selectedSquadId === deletedId) {
          setSelectedSquadId(remaining.length > 0 ? remaining[0].id : null);
        }
        return remaining;
      });

      // 6. Show confirmation toast
      setSuccessToast('Squad deleted successfully');
      setTimeout(() => setSuccessToast(null), 3500);

      // 7. Close confirmation modal
      setSquadToDelete(null);
    } catch (err: any) {
      console.error('Failed to delete squad from Firestore:', err);
      // As required: show error message, do not remove card from UI, re-enable buttons
      setDeleteError('Unable to delete squad. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Find the currently active squad
  const activeSquad = squads.find((s) => s.id === selectedSquadId) || squads[0] || null;
  const currentPlayers = activeSquad?.players && activeSquad.players.length > 0 
    ? activeSquad.players 
    : (latestAnalysis?.identifiedPlayers || defaultFallbackPlayers);

  // Handle renaming active squad
  const handleSaveName = async () => {
    if (!editedName.trim() || !activeSquad) {
      setIsEditingName(false);
      return;
    }

    const newName = editedName.trim();
    setSquads((prev) =>
      prev.map((s) => (s.id === activeSquad.id ? { ...s, squadName: newName } : s))
    );
    setIsEditingName(false);

    if (user && activeSquad.id && activeSquad.id !== 'session-analysis') {
      try {
        const targetCol = activeSquad.sourceCollection === 'savedAnalyses' ? 'savedAnalyses' : 'userSquads';
        const docRef = doc(db, targetCol, activeSquad.id);
        await updateDoc(docRef, { 
          squadName: newName,
          title: newName,
          updatedAt: new Date().toISOString() 
        });
      } catch (err) {
        console.warn('Could not update squad name in Firestore:', err);
      }
    }
  };

  return (
    <div id="my-squad-view" className="max-w-6xl mx-auto space-y-8 py-6">
      
      {/* Toast Feedback */}
      {successToast && (
        <div 
          id="squad-delete-success-toast"
          className="fixed bottom-6 right-6 z-50 bg-emerald-500 text-neutral-950 font-bold px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-5 duration-300"
        >
          <CheckCircle2 className="w-5 h-5 text-neutral-950" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <Shield className="w-5 h-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              My Squad
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-neutral-900 border border-neutral-800 text-xs font-bold text-neutral-300">
              {squads.length} {squads.length === 1 ? 'Saved Squad' : 'Saved Squads'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1.5">
            Manage your saved division squads, review active formations, and delete past tactical configurations.
          </p>
        </div>

        <button
          onClick={onNavigateToAnalyzer}
          className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all shrink-0"
        >
          <Sparkles className="w-4 h-4" />
          Run New Analysis
        </button>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="py-20 text-center space-y-4">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin mx-auto" />
          <p className="text-xs text-neutral-400">Loading your saved squads...</p>
        </div>
      ) : squads.length === 0 ? (
        /* Empty State: Mandated text & button */
        <div id="no-saved-squads-empty-state" className="bg-neutral-900 border border-neutral-800 rounded-3xl p-12 text-center space-y-5 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-neutral-800 text-neutral-400 flex items-center justify-center mx-auto">
            <Shield className="w-8 h-8 text-neutral-500" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-xl font-bold text-white">No Saved Squads Found</h3>
            <p className="text-xs sm:text-sm text-neutral-400">
              No saved squads found. Run an analysis to save a squad.
            </p>
          </div>
          <button
            onClick={onNavigateToAnalyzer}
            className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-xs sm:text-sm shadow-lg shadow-emerald-500/20 transition-all inline-flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Go to AI Analyzer
          </button>
        </div>
      ) : (
        /* Saved Squads Cards Grid */
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                Saved Squads ({squads.length})
              </h2>
              <span className="text-xs text-neutral-500">
                Click a squad card to select or use Delete to remove
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {squads.map((squad) => {
                const isSelected = activeSquad?.id === squad.id;
                const formattedDate = squad.updatedAt 
                  ? new Date(squad.updatedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })
                  : 'Saved';

                return (
                  <div
                    key={squad.id}
                    id={`squad-card-${squad.id}`}
                    onClick={() => {
                      setSelectedSquadId(squad.id);
                      setIsEditingName(false);
                    }}
                    className={`rounded-2xl p-5 transition-all cursor-pointer border flex flex-col justify-between group relative shadow-lg ${
                      isSelected
                        ? 'bg-neutral-900/90 border-emerald-500 ring-1 ring-emerald-500/50'
                        : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-850'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded bg-neutral-950 border border-neutral-800 text-[11px] font-black text-emerald-400">
                            {squad.formation || '4-2-1-3'}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-neutral-950 border border-neutral-800 text-[11px] font-semibold text-neutral-300">
                            {squad.playstyle || 'Quick Counter'}
                          </span>
                        </div>

                        {squad.squadRating && (
                          <div className="text-right">
                            <span className="text-lg font-black text-emerald-400 leading-none">
                              {squad.squadRating}
                            </span>
                            <span className="block text-[9px] text-neutral-500 font-bold uppercase">
                              OVR
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Squad Name */}
                      <div>
                        <h3 className="text-base font-black text-white group-hover:text-emerald-400 transition-colors line-clamp-1">
                          {squad.squadName}
                        </h3>
                        <p className="text-[11px] text-neutral-400 mt-0.5 flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-neutral-500" />
                          <span>{formattedDate}</span>
                          <span>•</span>
                          <span>{squad.players?.length || 0} players</span>
                        </p>
                      </div>

                      {/* Key Players Preview Chips */}
                      {squad.players && squad.players.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {squad.players.slice(0, 3).map((p, idx) => (
                            <span
                              key={p.id || idx}
                              className="text-[10px] px-2 py-0.5 rounded-md bg-neutral-950/70 border border-neutral-800/80 text-neutral-400"
                            >
                              {p.name}
                            </span>
                          ))}
                          {squad.players.length > 3 && (
                            <span className="text-[10px] px-1.5 py-0.5 text-neutral-500">
                              +{squad.players.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Card Actions Footer */}
                    <div className="pt-4 mt-3 border-t border-neutral-800/70 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {isSelected ? (
                          <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Active Selection
                          </span>
                        ) : (
                          <span className="text-[11px] text-neutral-500 group-hover:text-neutral-300 transition-colors">
                            Click to View
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {squad.analysisData && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenAnalysis(squad.analysisData!);
                            }}
                            className="p-1.5 rounded-lg bg-neutral-950 hover:bg-neutral-800 text-cyan-400 border border-neutral-800 hover:border-neutral-700 text-xs transition-colors"
                            title="View Tactical Report"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* DELETE ACTION BUTTON ON CARD */}
                        <button
                          type="button"
                          id={`delete-squad-btn-${squad.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteError(null);
                            setSquadToDelete(squad);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-neutral-950 hover:bg-rose-950/50 text-neutral-400 hover:text-rose-400 border border-neutral-800 hover:border-rose-800/60 text-xs font-bold transition-all flex items-center gap-1 group/btn"
                          title="Delete this squad"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-neutral-400 group-hover/btn:text-rose-400 transition-colors" />
                          <span className="hidden sm:inline">Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Squad Detail & Roster Banner */}
          {activeSquad && (
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {isEditingName ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        className="bg-neutral-950 border border-emerald-500 rounded-lg px-2.5 py-1 text-lg font-black text-white focus:outline-none"
                        autoFocus
                      />
                      <button
                        onClick={handleSaveName}
                        className="px-3 py-1 rounded bg-emerald-500 text-neutral-950 text-xs font-black"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setIsEditingName(false)}
                        className="px-2 py-1 rounded bg-neutral-800 text-neutral-300 text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                        {activeSquad.squadName}
                      </h1>
                      <button
                        onClick={() => {
                          setEditedName(activeSquad.squadName);
                          setIsEditingName(true);
                        }}
                        className="text-neutral-500 hover:text-white p-1 rounded hover:bg-neutral-800 transition-colors"
                        title="Rename Squad"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-neutral-400">
                  Managed by <strong>{profile?.displayName || user?.email || 'Tactician'}</strong> · Active Formation: <span className="text-emerald-400 font-bold">{activeSquad.formation || '4-2-1-3'}</span> · Playstyle: <span className="text-neutral-200 font-semibold">{activeSquad.playstyle || 'Quick Counter'}</span>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {activeSquad.analysisData && (
                  <button
                    onClick={() => onOpenAnalysis(activeSquad.analysisData!)}
                    className="px-4 py-2.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-white border border-neutral-700 font-bold text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4 text-cyan-400" />
                    View Tactical Report
                  </button>
                )}

                {/* DELETE BUTTON IN ACTIVE SQUAD BANNER */}
                <button
                  type="button"
                  onClick={() => {
                    setDeleteError(null);
                    setSquadToDelete(activeSquad);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-neutral-950 hover:bg-rose-950/40 text-neutral-300 hover:text-rose-400 border border-neutral-800 hover:border-rose-900 font-bold text-xs flex items-center gap-1.5 transition-all"
                  title="Delete this squad"
                >
                  <Trash2 className="w-4 h-4 text-rose-500" />
                  <span>Delete Squad</span>
                </button>
              </div>
            </div>
          )}

          {/* Squad Roster Table */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-5 border-b border-neutral-800 flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                Active Squad Registry ({currentPlayers.length} Players)
              </h2>
              <span className="text-xs text-neutral-400">
                Click any player to launch AI Player Builder
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-800 bg-neutral-950/60 text-[11px] uppercase tracking-wider text-neutral-400 font-bold">
                    <th className="py-3 px-4">Pos</th>
                    <th className="py-3 px-4">Player Name</th>
                    <th className="py-3 px-4 text-center">Rating</th>
                    <th className="py-3 px-4">Playstyle</th>
                    <th className="py-3 px-4">Vision Confidence</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60 text-xs">
                  {currentPlayers.map((p, idx) => (
                    <tr 
                      key={p.id || idx}
                      className="hover:bg-neutral-850 transition-colors group cursor-pointer"
                      onClick={() => onSelectPlayerForBuilder(p)}
                    >
                      <td className="py-3.5 px-4 font-black">
                        <span className="px-2 py-0.5 rounded bg-neutral-950 border border-neutral-800 text-emerald-400">
                          {p.position}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-white group-hover:text-emerald-400 transition-colors">
                        {p.name}
                      </td>
                      <td className="py-3.5 px-4 text-center font-black text-emerald-400 text-sm">
                        {p.rating}
                      </td>
                      <td className="py-3.5 px-4 text-neutral-300">
                        {p.playstyle || 'Standard'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          p.confidence === 'High'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : p.confidence === 'Medium'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-rose-500/20 text-rose-400'
                        }`}>
                          {p.confidence}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectPlayerForBuilder(p);
                          }}
                          className="px-3 py-1 rounded-lg bg-neutral-950 hover:bg-neutral-800 text-emerald-400 font-bold border border-neutral-700 text-xs inline-flex items-center gap-1 transition-colors"
                        >
                          AI Builder →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG / MODAL */}
      {squadToDelete && (
        <div 
          id="delete-squad-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeleting) {
              setSquadToDelete(null);
              setDeleteError(null);
            }
          }}
        >
          <div 
            id="delete-squad-modal"
            className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-md w-full p-6 sm:p-7 space-y-6 shadow-2xl relative animate-in zoom-in-95 duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-squad-title"
          >
            {/* Close icon */}
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => {
                setSquadToDelete(null);
                setDeleteError(null);
              }}
              className="absolute top-5 right-5 text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header with warning icon */}
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 id="delete-squad-title" className="text-xl font-black text-white">
                  Delete Squad?
                </h3>
                <p className="text-xs text-neutral-400">
                  This action cannot be undone.
                </p>
              </div>
            </div>

            {/* Confirmation message & Squad info summary */}
            <div className="space-y-3">
              <p className="text-sm text-neutral-300 leading-relaxed">
                Are you sure you want to delete this saved squad? This action cannot be undone.
              </p>

              <div className="bg-neutral-950/80 border border-neutral-800 rounded-2xl p-4 space-y-1.5">
                <div className="text-xs font-bold text-white truncate">
                  {squadToDelete.squadName}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-neutral-400">
                  <span className="text-emerald-400 font-bold">{squadToDelete.formation || 'Tactical Squad'}</span>
                  <span>•</span>
                  <span>{squadToDelete.playstyle || 'Tactics'}</span>
                  <span>•</span>
                  <span>{squadToDelete.players?.length || 0} players</span>
                  {squadToDelete.squadRating && (
                    <>
                      <span>•</span>
                      <span className="text-emerald-400 font-bold">{squadToDelete.squadRating} OVR</span>
                    </>
                  )}
                </div>
              </div>

              {/* Error banner if deletion failed */}
              {deleteError && (
                <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-800 flex items-start gap-2.5 text-xs text-rose-200 animate-in fade-in duration-150">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{deleteError}</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                id="cancel-delete-squad-btn"
                disabled={isDeleting}
                onClick={() => {
                  setSquadToDelete(null);
                  setDeleteError(null);
                }}
                className="px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-xs sm:text-sm transition-colors disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                id="confirm-delete-squad-btn"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs sm:text-sm shadow-lg shadow-rose-600/30 flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Squad</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

