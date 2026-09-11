import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext.tsx';
import { db } from '../lib/firebase.ts';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { AnalysisResult } from '../types.ts';
import { 
  FileText, 
  Trash2, 
  ExternalLink, 
  Sparkles, 
  Calendar, 
  Award, 
  ShieldAlert, 
  AlertCircle 
} from 'lucide-react';

interface SavedReportsProps {
  onOpenReport: (report: AnalysisResult) => void;
  onNavigateToAnalyzer: () => void;
}

export const SavedReportsView: React.FC<SavedReportsProps> = ({ onOpenReport, onNavigateToAnalyzer }) => {
  const { user } = useAuth();
  const [reports, setReports] = useState<AnalysisResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchReports = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = query(collection(db, 'savedAnalyses'), where('userId', '==', user.uid));
      const snap = await getDocs(q);
      const list: AnalysisResult[] = [];
      snap.forEach((d) => {
        const data = d.data();
        if (data.analysisData) {
          list.push({
            ...data.analysisData,
            id: d.id,
            createdAt: data.createdAt || data.analysisData.createdAt
          });
        }
      });
      // Sort newest first
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setReports(list);
    } catch (err) {
      console.warn('Failed to fetch from Firestore, checking local storage cache:', err);
      const cached = localStorage.getItem(`ef_saved_reports_${user.uid}`);
      if (cached) {
        try {
          setReports(JSON.parse(cached));
        } catch (e) {}
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [user]);

  const handleDelete = async (reportId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this saved analysis? This action cannot be undone.')) return;

    setDeletingId(reportId);
    try {
      if (user) {
        await deleteDoc(doc(db, 'savedAnalyses', reportId));
      }
      setReports((prev) => prev.filter((r) => r.id !== reportId));
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center space-y-4">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin mx-auto" />
        <p className="text-xs text-neutral-400">Loading your saved reports...</p>
      </div>
    );
  }

  return (
    <div id="saved-reports-view" className="max-w-5xl mx-auto space-y-8 py-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
              <FileText className="w-5 h-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Saved Analysis Reports
            </h1>
          </div>
          <p className="text-sm text-neutral-400 mt-1">
            Revisit your historical squad evaluations, formation setups, and individual player action plans.
          </p>
        </div>

        <button
          onClick={onNavigateToAnalyzer}
          className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all"
        >
          <Sparkles className="w-4 h-4" />
          New Analysis
        </button>
      </div>

      {/* Reports List */}
      {reports.length === 0 ? (
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-12 text-center space-y-4 shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-neutral-800 text-neutral-400 flex items-center justify-center mx-auto">
            <FileText className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">No Saved Reports Yet</h3>
            <p className="text-xs text-neutral-400 max-w-sm mx-auto">
              Run your first squad analysis and click "Save Report" to preserve your tactical breakdown and simulations.
            </p>
          </div>
          <button
            onClick={onNavigateToAnalyzer}
            className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs shadow-md transition-all inline-flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Run Squad Analysis Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reports.map((r) => {
            const dateStr = new Date(r.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            });

            return (
              <div
                key={r.id}
                onClick={() => onOpenReport(r)}
                className="bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 hover:border-emerald-500/50 rounded-2xl p-6 transition-all cursor-pointer group shadow-lg flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* Card Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
                        {r.recommendedFormation} · {r.coachRecommendation?.tacticalStyle || 'Tactics'}
                      </span>
                      <h3 className="text-lg font-black text-white group-hover:text-emerald-400 transition-colors mt-0.5">
                        {r.title}
                      </h3>
                    </div>

                    <div className="text-right">
                      <span className="text-2xl font-black text-emerald-400 leading-none">
                        {r.squadRatings?.overall || 85}
                      </span>
                      <span className="block text-[10px] text-neutral-500 uppercase font-bold">
                        Rating
                      </span>
                    </div>
                  </div>

                  {/* Required spec format string: "5 screenshots · Coach analyzed · Free analysis" */}
                  <div className="px-3 py-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs font-semibold text-neutral-300">
                    {r.screenshotCount || 1} screenshots · {r.coachRecommendation?.isIdentifiedFromScreenshot ? 'Coach analyzed' : 'General coach recommendation'} · {r.freeOrPaidStatus === 'paid' ? 'Paid analysis' : 'Free analysis'}
                  </div>

                  {/* Summary Preview */}
                  <p className="text-xs text-neutral-400 line-clamp-2">
                    {r.formationExplanation || 'Custom tactical balance configured for competitive division matches.'}
                  </p>
                </div>

                {/* Footer details */}
                <div className="pt-5 mt-4 border-t border-neutral-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-neutral-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{dateStr}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleDelete(r.id, e)}
                      disabled={deletingId === r.id}
                      className="p-1.5 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-neutral-800 transition-colors"
                      title="Delete saved report"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-400 group-hover:translate-x-1 transition-transform">
                      Open Report <ExternalLink className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
