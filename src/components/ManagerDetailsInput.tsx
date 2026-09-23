import React from 'react';
import { Briefcase, Sparkles, UserPlus, Trash2, Shield, UserCheck } from 'lucide-react';
import { ManagerInputDetails } from '../types.ts';

const POSITIONS = ['CF', 'SS', 'LWF', 'RWF', 'AMF', 'CMF', 'DMF', 'LMF', 'RMF', 'CB', 'LB', 'RB', 'GK'];

const PLAYSTYLES = [
  'Goal Poacher',
  'Fox in the Box',
  'Target Man',
  'Deep-Lying Forward',
  'Creative Playmaker',
  'Hole Player',
  'Classic No.10',
  'Dummy Runner',
  'Inverted Winger',
  'Prolific Winger',
  'Cross Specialist',
  'Box-to-Box',
  'Orchestrator',
  'Destroyer',
  'Anchor Man',
  'Build Up',
  'Extra Frontman',
  'Offensive Full-back',
  'Defensive Full-back',
  'Full-back Finisher',
  'Attacking Goalkeeper',
  'Defensive Goalkeeper'
];

export const createDefaultCoach = (index: number = 0): ManagerInputDetails => ({
  id: `coach_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
  name: '',
  nationality: '',
  team: '',
  playstyleProficiencies: {
    possessionGame: 85,
    quickCounter: 87,
    longBallCounter: 85,
    outWide: 80,
    longBall: 75,
    overload: 86
  },
  linkedUpPlaystyle: {
    enabled: false,
    centrepiece: { playstyle: 'Goal Poacher', position: 'CF' },
    keyMan: { playstyle: 'Creative Playmaker', position: 'AMF' }
  },
  isPrimary: index === 0
});

interface ManagerDetailsInputProps {
  // Support both single manager and multi-coach array
  managerDetails?: ManagerInputDetails;
  coaches?: ManagerInputDetails[];
  onManagerChange?: (manager: ManagerInputDetails) => void;
  onCoachesChange?: (coaches: ManagerInputDetails[]) => void;
  onChange?: (manager: ManagerInputDetails) => void;
  subtitle?: string;
}

export const ManagerDetailsInput: React.FC<ManagerDetailsInputProps> = ({
  managerDetails,
  coaches: propCoaches,
  onManagerChange,
  onCoachesChange,
  onChange,
  subtitle = "Enter your manager and coach details. Add multiple coaches to let AI recommend the optimal tactical fit for your squad."
}) => {
  // Normalize coaches list
  const currentCoaches: ManagerInputDetails[] = React.useMemo(() => {
    if (propCoaches && propCoaches.length > 0) {
      return propCoaches;
    }
    if (managerDetails) {
      return [managerDetails];
    }
    return [createDefaultCoach(0)];
  }, [propCoaches, managerDetails]);

  const updateCoachesList = (updated: ManagerInputDetails[]) => {
    if (onCoachesChange) {
      onCoachesChange(updated);
    }
    if (updated.length > 0) {
      if (onManagerChange) onManagerChange(updated[0]);
      if (onChange) onChange(updated[0]);
    }
  };

  const handleUpdateSingleCoach = (index: number, updatedCoach: ManagerInputDetails) => {
    const nextList = [...currentCoaches];
    nextList[index] = updatedCoach;
    updateCoachesList(nextList);
  };

  const handleAddCoach = () => {
    const newCoach = createDefaultCoach(currentCoaches.length);
    const nextList = [...currentCoaches, newCoach];
    updateCoachesList(nextList);
  };

  const handleRemoveCoach = (index: number) => {
    if (currentCoaches.length <= 1) return;
    const nextList = currentCoaches.filter((_, i) => i !== index);
    updateCoachesList(nextList);
  };

  return (
    <div className="bg-neutral-950/80 border border-neutral-800 rounded-2xl p-5 sm:p-6 space-y-6 shadow-xl">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-white">
                Manager / Coach Details
              </h3>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-extrabold">
                {currentCoaches.length} {currentCoaches.length === 1 ? 'Coach' : 'Coaches'}
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Quick Add Coach button at top right */}
        <button
          type="button"
          onClick={handleAddCoach}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 hover:text-emerald-200 text-xs font-bold transition-all shadow-sm cursor-pointer self-start sm:self-auto shrink-0"
        >
          <UserPlus className="w-4 h-4 text-emerald-400" />
          <span>Add Coach</span>
        </button>
      </div>

      {/* Coaches Cards List */}
      <div className="space-y-6">
        {currentCoaches.map((coach, index) => {
          const isLinkedUpActive = coach.linkedUpPlaystyle?.enabled ?? false;
          const isHeadCoach = index === 0;

          return (
            <div
              key={coach.id || `coach_${index}`}
              className="bg-neutral-900/80 border border-neutral-800 hover:border-neutral-700/80 rounded-2xl p-4 sm:p-5 space-y-5 transition-colors relative"
            >
              {/* Coach Card Header */}
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1.5 ${
                    isHeadCoach 
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  }`}>
                    {isHeadCoach ? (
                      <>
                        <Shield className="w-3.5 h-3.5 text-emerald-400" />
                        Coach 1 (Head Coach)
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
                        Coach {index + 1} (Alternative / Assistant)
                      </>
                    )}
                  </span>
                  {coach.name && (
                    <span className="text-xs font-bold text-white truncate max-w-[160px] sm:max-w-xs">
                      · {coach.name}
                    </span>
                  )}
                </div>

                {/* Remove coach button (if more than 1 coach exists) */}
                {currentCoaches.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveCoach(index)}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    title={`Remove Coach ${index + 1}`}
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Remove</span>
                  </button>
                )}
              </div>

              {/* Manager Basic Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-neutral-400 block mb-1">
                    Coach {index + 1} Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Pep Guardiola, X. Alonso, C. Ancelotti"
                    value={coach.name}
                    onChange={(e) => handleUpdateSingleCoach(index, { ...coach, name: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-medium"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-neutral-400 block mb-1">
                    Coach {index + 1} Nationality
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Spain, Germany, Italy, England"
                    value={coach.nationality || ''}
                    onChange={(e) => handleUpdateSingleCoach(index, { ...coach, nationality: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-medium"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-neutral-400 block mb-1">
                    Coach {index + 1} Team / Club
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Manchester City, Real Madrid, Leverkusen"
                    value={coach.team || ''}
                    onChange={(e) => handleUpdateSingleCoach(index, { ...coach, team: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-medium"
                  />
                </div>
              </div>

              {/* Manager Playstyle Strengths */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2.5">
                  <label className="text-xs font-bold text-white block">
                    Coach {index + 1} Playing Style Strengths (Proficiency):
                  </label>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                    eFootball 2027 Ready (0 - 90)
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  {[
                    { key: 'possessionGame', label: 'Possession Game' },
                    { key: 'quickCounter', label: 'Quick Counter' },
                    { key: 'longBallCounter', label: 'Long Ball Counter' },
                    { key: 'outWide', label: 'Out Wide' },
                    { key: 'longBall', label: 'Long Ball' },
                    { key: 'overload', label: 'Overload (2027)', isNew: true },
                  ].map(({ key, label, isNew }) => {
                    const currentVal = coach.playstyleProficiencies?.[key as keyof typeof coach.playstyleProficiencies] ?? (key === 'overload' ? 86 : 85);
                    return (
                      <div 
                        key={key} 
                        className={`bg-neutral-950 border rounded-xl p-3 text-center space-y-1.5 transition-colors ${
                          isNew ? 'border-cyan-500/40 bg-cyan-950/10' : 'border-neutral-800'
                        }`}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span className={`text-[11px] font-medium block truncate ${isNew ? 'text-cyan-300 font-semibold' : 'text-neutral-300'}`}>
                            {label}
                          </span>
                        </div>
                        <div className="flex items-center justify-center gap-1.5">
                          <input
                            type="number"
                            min="0"
                            max="90"
                            value={currentVal === '' ? '' : currentVal}
                            onChange={(e) => {
                              const valStr = e.target.value;
                              if (valStr === '') {
                                handleUpdateSingleCoach(index, {
                                  ...coach,
                                  playstyleProficiencies: {
                                    possessionGame: 85,
                                    quickCounter: 87,
                                    longBallCounter: 85,
                                    outWide: 80,
                                    longBall: 75,
                                    overload: 86,
                                    ...(coach.playstyleProficiencies || {}),
                                    [key]: ''
                                  }
                                });
                                return;
                              }
                              const num = parseInt(valStr, 10);
                              handleUpdateSingleCoach(index, {
                                ...coach,
                                playstyleProficiencies: {
                                  possessionGame: 85,
                                  quickCounter: 87,
                                  longBallCounter: 85,
                                  outWide: 80,
                                  longBall: 75,
                                  overload: 86,
                                  ...(coach.playstyleProficiencies || {}),
                                  [key]: isNaN(num) ? valStr : num
                                }
                              });
                            }}
                            onBlur={(e) => {
                              const num = parseInt(e.target.value, 10);
                              const clamped = isNaN(num) ? 75 : Math.min(90, Math.max(0, num));
                              handleUpdateSingleCoach(index, {
                                ...coach,
                                playstyleProficiencies: {
                                  possessionGame: 85,
                                  quickCounter: 87,
                                  longBallCounter: 85,
                                  outWide: 80,
                                  longBall: 75,
                                  overload: 86,
                                  ...(coach.playstyleProficiencies || {}),
                                  [key]: clamped
                                }
                              });
                            }}
                            className={`w-14 bg-neutral-900 border rounded-lg py-1 text-center font-black text-xs sm:text-sm focus:outline-none focus:border-emerald-500 ${
                              isNew ? 'border-cyan-500/50 text-cyan-400' : 'border-neutral-700 text-emerald-400'
                            }`}
                          />
                          <span className="text-[10px] text-neutral-500 font-bold">/ 90</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Manager's Linked-Up Playstyle */}
              <div className="pt-3 border-t border-neutral-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-bold text-white block">
                          Coach {index + 1} Linked-Up Playstyle
                        </span>
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                          Tactical Synergy
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-400 mt-0.5">
                        Turn on to specify this manager's Centrepiece and Key man tactical roles and playstyles.
                      </p>
                    </div>
                  </div>

                  {/* Activation Toggle Switch */}
                  <button
                    type="button"
                    onClick={() => {
                      handleUpdateSingleCoach(index, {
                        ...coach,
                        linkedUpPlaystyle: {
                          enabled: !isLinkedUpActive,
                          centrepiece: coach.linkedUpPlaystyle?.centrepiece || { playstyle: 'Goal Poacher', position: 'CF' },
                          keyMan: coach.linkedUpPlaystyle?.keyMan || { playstyle: 'Creative Playmaker', position: 'AMF' }
                        }
                      });
                    }}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isLinkedUpActive ? 'bg-emerald-500' : 'bg-neutral-800'
                    }`}
                    title={`Toggle Coach ${index + 1} Linked-Up Playstyle`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        isLinkedUpActive ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Form area when activated */}
                {isLinkedUpActive && (
                  <div className="pt-2 grid grid-cols-1 md:grid-cols-2 gap-4 bg-neutral-950/80 border border-emerald-500/30 rounded-xl p-4 animate-fade-in">
                    {/* Centrepiece Player Details */}
                    <div className="space-y-2.5 bg-neutral-900/90 border border-emerald-500/20 p-3.5 rounded-xl">
                      <div className="flex items-center justify-between pb-1.5 border-b border-neutral-800">
                        <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          Centrepiece Player Details
                        </span>
                        <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded">
                          Focal Point
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
                            Position
                          </label>
                          <select
                            value={coach.linkedUpPlaystyle?.centrepiece?.position || 'CF'}
                            onChange={(e) => {
                              handleUpdateSingleCoach(index, {
                                ...coach,
                                linkedUpPlaystyle: {
                                  ...coach.linkedUpPlaystyle,
                                  enabled: true,
                                  centrepiece: {
                                    playstyle: coach.linkedUpPlaystyle?.centrepiece?.playstyle || 'Goal Poacher',
                                    position: e.target.value
                                  },
                                  keyMan: coach.linkedUpPlaystyle?.keyMan || { playstyle: 'Creative Playmaker', position: 'AMF' }
                                }
                              });
                            }}
                            className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                          >
                            {POSITIONS.map(p => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
                            Playing Style
                          </label>
                          <select
                            value={coach.linkedUpPlaystyle?.centrepiece?.playstyle || 'Goal Poacher'}
                            onChange={(e) => {
                              handleUpdateSingleCoach(index, {
                                ...coach,
                                linkedUpPlaystyle: {
                                  ...coach.linkedUpPlaystyle,
                                  enabled: true,
                                  centrepiece: {
                                    position: coach.linkedUpPlaystyle?.centrepiece?.position || 'CF',
                                    playstyle: e.target.value
                                  },
                                  keyMan: coach.linkedUpPlaystyle?.keyMan || { playstyle: 'Creative Playmaker', position: 'AMF' }
                                }
                              });
                            }}
                            className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                          >
                            {PLAYSTYLES.map(ps => (
                              <option key={ps} value={ps}>{ps}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Key Man Player Details */}
                    <div className="space-y-2.5 bg-neutral-900/90 border border-cyan-500/20 p-3.5 rounded-xl">
                      <div className="flex items-center justify-between pb-1.5 border-b border-neutral-800">
                        <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                          Key Man Player Details
                        </span>
                        <span className="text-[10px] font-bold text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded">
                          Tactical Catalyst
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
                            Position
                          </label>
                          <select
                            value={coach.linkedUpPlaystyle?.keyMan?.position || 'AMF'}
                            onChange={(e) => {
                              handleUpdateSingleCoach(index, {
                                ...coach,
                                linkedUpPlaystyle: {
                                  ...coach.linkedUpPlaystyle,
                                  enabled: true,
                                  centrepiece: coach.linkedUpPlaystyle?.centrepiece || { playstyle: 'Goal Poacher', position: 'CF' },
                                  keyMan: {
                                    playstyle: coach.linkedUpPlaystyle?.keyMan?.playstyle || 'Creative Playmaker',
                                    position: e.target.value
                                  }
                                }
                              });
                            }}
                            className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-cyan-500"
                          >
                            {POSITIONS.map(p => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
                            Playing Style
                          </label>
                          <select
                            value={coach.linkedUpPlaystyle?.keyMan?.playstyle || 'Creative Playmaker'}
                            onChange={(e) => {
                              handleUpdateSingleCoach(index, {
                                ...coach,
                                linkedUpPlaystyle: {
                                  ...coach.linkedUpPlaystyle,
                                  enabled: true,
                                  centrepiece: coach.linkedUpPlaystyle?.centrepiece || { playstyle: 'Goal Poacher', position: 'CF' },
                                  keyMan: {
                                    position: coach.linkedUpPlaystyle?.keyMan?.position || 'AMF',
                                    playstyle: e.target.value
                                  }
                                }
                              });
                            }}
                            className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                          >
                            {PLAYSTYLES.map(ps => (
                              <option key={ps} value={ps}>{ps}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Add Coach action footer */}
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-neutral-800">
        <p className="text-xs text-neutral-400 text-center sm:text-left">
          💡 <strong>Pro Tip:</strong> Enter 2 or more coaches (e.g. Pep Guardiola & Xabi Alonso). The AI analyzes your squad players to recommend which manager extracts the maximum chemistry and win rate.
        </p>
        <button
          type="button"
          onClick={handleAddCoach}
          className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs flex items-center gap-2 transition-all shadow-md shadow-emerald-500/15 cursor-pointer shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Coach ({currentCoaches.length + 1})</span>
        </button>
      </div>
    </div>
  );
};
