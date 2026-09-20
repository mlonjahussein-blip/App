import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall.ts';
import { Download, Smartphone, X } from 'lucide-react';

export const PWAInstallButton: React.FC<{ className?: string; compact?: boolean }> = ({ className = '', compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already installed, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        id="pwa-install-app-btn"
        onClick={install}
        className={`flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500 hover:from-emerald-500 hover:to-cyan-400 text-white font-bold shadow-lg shadow-emerald-500/20 transition-all transform hover:scale-[1.02] active:scale-[0.98] ${
          compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-xs sm:text-sm'
        } ${className}`}
        title="Install eFootball AI Hub App"
      >
        <Download className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        <span>Install App</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          id="pwa-install-ios-btn"
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 font-bold transition-all ${
            compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-xs sm:text-sm'
          } ${className}`}
        >
          <Smartphone className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
          <span>Install App</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl bg-neutral-900 border border-neutral-800 p-6 shadow-2xl relative space-y-4">
              <button
                onClick={() => setShowIOSGuide(false)}
                className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Install on iPhone / iPad</h3>
                  <p className="text-xs text-neutral-400">Add eFootball AI Hub to your Home Screen</p>
                </div>
              </div>

              <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-2 text-xs text-neutral-300">
                <p className="flex items-start gap-2">
                  <span className="bg-emerald-500/20 text-emerald-400 font-bold px-1.5 py-0.5 rounded text-[10px]">1</span>
                  <span>Tap the <strong>Share</strong> icon in the Safari navigation bar at the bottom.</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="bg-emerald-500/20 text-emerald-400 font-bold px-1.5 py-0.5 rounded text-[10px]">2</span>
                  <span>Scroll down and tap <strong>Add to Home Screen</strong>.</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="bg-emerald-500/20 text-emerald-400 font-bold px-1.5 py-0.5 rounded text-[10px]">3</span>
                  <span>Tap <strong>Add</strong> in the top-right corner to finish installation.</span>
                </p>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2.5 rounded-xl bg-emerald-500 text-neutral-950 font-bold text-xs hover:bg-emerald-400 transition"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
