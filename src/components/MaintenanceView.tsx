import React from 'react';
import { ShieldAlert, Wrench, Sparkles, Clock, RefreshCw, Cpu, Server } from 'lucide-react';

export const MaintenanceView: React.FC = () => {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-neutral-950 relative overflow-hidden font-sans">
      
      {/* Background Decorative Gradients */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-10 right-1/4 w-[400px] h-[400px] bg-amber-500/5 rounded-full blur-[120px]" />
        <div 
          className="absolute inset-0 opacity-[0.03]" 
          style={{ 
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`, 
            backgroundSize: '32px 32px' 
          }} 
        />
      </div>

      {/* Top Brand Bar */}
      <header className="relative z-10 border-b border-neutral-900/80 bg-neutral-950/70 backdrop-blur-md px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 font-black text-neutral-950 text-xl">
              ⚽
            </div>
            <div>
              <span className="font-black tracking-tight text-lg text-white block leading-none">
                eFootball AI Hub
              </span>
              <span className="text-[11px] font-semibold text-emerald-400 tracking-wider uppercase">
                Tactical Intelligence Engine
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span className="w-2 h-2 rounded-full bg-amber-400 absolute" />
            <span className="pl-3">Maintenance Mode Active</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="max-w-xl w-full text-center space-y-8 animate-fade-in">
          
          {/* Icon Badge */}
          <div className="relative inline-block">
            <div className="w-24 h-24 sm:w-28 sm:h-28 mx-auto rounded-3xl bg-neutral-900 border border-neutral-800 flex items-center justify-center shadow-2xl relative z-10 group">
              <Wrench className="w-12 h-12 text-amber-400 animate-pulse" />
            </div>
            <div className="absolute inset-0 rounded-3xl bg-amber-500/20 blur-xl -z-0" />
          </div>

          {/* Heading and Notice */}
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Platform Under Scheduled Maintenance
            </h1>
            <p className="text-neutral-400 text-sm sm:text-base leading-relaxed max-w-lg mx-auto">
              eFootball AI Hub is currently offline for scheduled system upgrades, tactical multimodal vision engine maintenance, and core database tuning.
            </p>
          </div>

          {/* Upgrade Details Card */}
          <div className="bg-neutral-900/70 border border-neutral-800/80 rounded-2xl p-5 sm:p-6 text-left space-y-4 shadow-xl backdrop-blur-sm">
            <div className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-emerald-400" />
              <span>Current Maintenance Scope</span>
            </div>

            <div className="space-y-2.5 text-xs text-neutral-300">
              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-neutral-950/60 border border-neutral-900">
                <Server className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block">Engine & Database Migration</strong>
                  <span className="text-neutral-400 text-[11px]">Upgrading server infrastructure and low-latency tactical cache.</span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-neutral-950/60 border border-neutral-900">
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block">Tactical Vision Optimization</strong>
                  <span className="text-neutral-400 text-[11px]">Improving formation detection accuracy and manager AI playstyle benchmarks.</span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-neutral-950/60 border border-neutral-900">
                <ShieldAlert className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block">Security & Access Control</strong>
                  <span className="text-neutral-400 text-[11px]">Implementing hardened authentication protocols and session encryption.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Status Message */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-xs text-neutral-400">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Status: <strong className="text-white">Temporarily Offline</strong></span>
            </div>
            <span className="hidden sm:inline text-neutral-700">•</span>
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin" />
              <span>Engine Status: <strong className="text-white">Upgrading</strong></span>
            </div>
          </div>

          <p className="text-xs text-neutral-500">
            We will be back online shortly. Thank you for your patience and support!
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-neutral-900/80 bg-neutral-950/70 py-6 px-4 text-center text-xs text-neutral-600">
        <p>© 2026 eFootball AI Hub. All tactical companion services temporarily paused for maintenance.</p>
      </footer>

    </div>
  );
};
