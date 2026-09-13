import React from 'react';
import { Briefcase } from 'lucide-react';
import { ManagerInputDetails } from '../types.ts';

interface ManagerDetailsInputProps {
  managerDetails: ManagerInputDetails;
  onManagerChange: (manager: ManagerInputDetails) => void;
  subtitle?: string;
}

export const ManagerDetailsInput: React.FC<ManagerDetailsInputProps> = ({
  managerDetails,
  onManagerChange,
  subtitle = "Enter your manager's identity and tactical playstyle proficiency ratings."
}) => {
  return (
    <div className="bg-neutral-950/70 border border-neutral-800 rounded-2xl p-5 sm:p-6 space-y-5">
      <div className="flex items-center gap-2.5 pb-2 border-b border-neutral-800">
        <Briefcase className="w-5 h-5 text-emerald-400" />
        <div>
          <h3 className="text-sm sm:text-base font-bold text-white">
            Manager / Coach Details
          </h3>
          <p className="text-xs text-neutral-400">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Manager Basic Details */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-[11px] font-bold text-neutral-400 block mb-1">
            Manager's Name
          </label>
          <input
            type="text"
            placeholder="e.g. Pep Guardiola, X. Alonso, C. Ancelotti"
            value={managerDetails.name}
            onChange={(e) => onManagerChange({ ...managerDetails, name: e.target.value })}
            className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label className="text-[11px] font-bold text-neutral-400 block mb-1">
            Manager's Nationality
          </label>
          <input
            type="text"
            placeholder="e.g. Spain, Germany, Italy, England"
            value={managerDetails.nationality || ''}
            onChange={(e) => onManagerChange({ ...managerDetails, nationality: e.target.value })}
            className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label className="text-[11px] font-bold text-neutral-400 block mb-1">
            Manager's Team / Club
          </label>
          <input
            type="text"
            placeholder="e.g. Manchester City, Real Madrid, Leverkusen"
            value={managerDetails.team || ''}
            onChange={(e) => onManagerChange({ ...managerDetails, team: e.target.value })}
            className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Manager Playstyle Strengths */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-2.5">
          <label className="text-xs font-bold text-white block">
            Manager Playing Style Strengths (Proficiency):
          </label>
          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
            eFootball 2027 Ready (50 - 90)
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
            const currentVal = managerDetails.playstyleProficiencies?.[key as keyof typeof managerDetails.playstyleProficiencies] ?? (key === 'overload' ? 86 : 85);
            return (
              <div 
                key={key} 
                className={`bg-neutral-900/90 border rounded-xl p-3 text-center space-y-1.5 transition-colors ${
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
                    min="50"
                    max="90"
                    value={currentVal}
                    onChange={(e) => {
                      const valStr = e.target.value;
                      if (valStr === '') {
                        onManagerChange({
                          ...managerDetails,
                          playstyleProficiencies: {
                            ...(managerDetails.playstyleProficiencies || {
                              possessionGame: 85,
                              quickCounter: 87,
                              longBallCounter: 85,
                              outWide: 80,
                              longBall: 75,
                              overload: 86
                            }),
                            [key]: 50
                          }
                        });
                        return;
                      }
                      const num = parseInt(valStr, 10);
                      if (!isNaN(num)) {
                        onManagerChange({
                          ...managerDetails,
                          playstyleProficiencies: {
                            ...(managerDetails.playstyleProficiencies || {
                              possessionGame: 85,
                              quickCounter: 87,
                              longBallCounter: 85,
                              outWide: 80,
                              longBall: 75,
                              overload: 86
                            }),
                            [key]: num
                          }
                        });
                      }
                    }}
                    onBlur={(e) => {
                      const num = parseInt(e.target.value, 10);
                      const clamped = isNaN(num) ? 50 : Math.min(90, Math.max(50, num));
                      onManagerChange({
                        ...managerDetails,
                        playstyleProficiencies: {
                          ...(managerDetails.playstyleProficiencies || {
                            possessionGame: 85,
                            quickCounter: 87,
                            longBallCounter: 85,
                            outWide: 80,
                            longBall: 75,
                            overload: 86
                          }),
                          [key]: clamped
                        }
                      });
                    }}
                    className={`w-14 bg-neutral-950 border rounded-lg py-1 text-center font-black text-xs sm:text-sm focus:outline-none focus:border-emerald-500 ${
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
    </div>
  );
};
