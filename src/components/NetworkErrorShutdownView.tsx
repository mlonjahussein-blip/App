import React, { useState } from 'react';
import { WifiOff, AlertCircle, RefreshCw, ChevronDown, ChevronRight, Globe } from 'lucide-react';

export const NetworkErrorShutdownView: React.FC = () => {
  const [showDetails, setShowDetails] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const handleReload = () => {
    setIsRetrying(true);
    setTimeout(() => {
      window.location.reload();
    }, 600);
  };

  return (
    <div className="min-h-screen bg-[#1f1f1f] text-[#e3e3e3] font-sans antialiased flex flex-col justify-between selection:bg-[#004a77] selection:text-white">
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="max-w-[560px] w-full space-y-6">
          
          {/* Classic Browser Error Icon */}
          <div className="w-16 h-16 rounded-full bg-[#2a2a2a] border border-[#3a3a3a] flex items-center justify-center text-[#9aa0a6] shadow-sm">
            <WifiOff className="w-8 h-8 text-[#9aa0a6]" />
          </div>

          {/* Heading */}
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
              This site can’t be reached
            </h1>
            <p className="text-sm text-[#bdc1c6] leading-relaxed">
              Check if there is a typo in <span className="font-medium text-white">efootballaihub.com</span> or check your internet connection.
            </p>
          </div>

          {/* Diagnostic Suggestions */}
          <div className="space-y-2 text-sm text-[#9aa0a6] leading-relaxed">
            <p className="text-xs uppercase tracking-wider font-semibold text-[#80868b]">
              Try the following steps:
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-1 text-[#bdc1c6]">
              <li>Check your network cables, modem, and router</li>
              <li>Verify your link and reconnect to Wi-Fi or mobile data</li>
              <li>Check your DNS and network proxy settings</li>
            </ul>
          </div>

          {/* Error Code */}
          <div className="pt-2 font-mono text-xs text-[#80868b] tracking-wide">
            ERR_CONNECTION_REFUSED
          </div>

          {/* Action Buttons */}
          <div className="pt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleReload}
              disabled={isRetrying}
              className="px-6 py-2.5 rounded-full bg-[#8ab4f8] hover:bg-[#aecbfa] text-[#040404] font-medium text-sm transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-60 shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
              <span>{isRetrying ? 'Checking connection...' : 'Try again'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="px-4 py-2.5 rounded-full border border-[#3c4043] text-[#8ab4f8] hover:bg-[#303134] font-medium text-sm transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>Details</span>
              {showDetails ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>

          {/* Expandable Technical Details */}
          {showDetails && (
            <div className="p-4 rounded-xl bg-[#282a2d] border border-[#3c4043] text-xs text-[#9aa0a6] space-y-2 font-mono animate-fade-in">
              <div className="flex items-center gap-2 text-[#e8eaed]">
                <AlertCircle className="w-4 h-4 text-[#f28b82] shrink-0" />
                <span className="font-semibold">Unable to establish connection to server</span>
              </div>
              <p className="leading-relaxed">
                The server at efootballaihub.com could not be contacted or refused the connection. The service is temporarily unreachable from your internet connection.
              </p>
              <div className="text-[11px] text-[#80868b] pt-1 border-t border-[#3c4043]">
                Diagnostic code: DNS_PROBE_FINISHED_NO_INTERNET / ERR_CONNECTION_CLOSED
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Footer / Domain hint */}
      <footer className="py-4 px-6 text-center text-xs text-[#5f6368]">
        efootballaihub.com
      </footer>
    </div>
  );
};
