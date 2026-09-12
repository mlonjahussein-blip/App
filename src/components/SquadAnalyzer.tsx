import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  Trash2, 
  Image as ImageIcon, 
  Sparkles, 
  AlertCircle, 
  Info, 
  Check, 
  ShieldAlert,
  ArrowRight,
  Camera,
  Monitor,
  FileText,
  AlertTriangle,
  Eye,
  X,
  Maximize2,
  Keyboard,
  Layers,
  Repeat,
  Zap,
  Sliders,
  Share2
} from 'lucide-react';
import { AnalysisResult, UploadedImageItem, ImageSourceType, TypedPlayerInput, ManagerInputDetails, FluidFormationSettings, LinkUpPlaySettings } from '../types.ts';
import { CameraCaptureModal } from './CameraCaptureModal.tsx';
import { ManualPlayerInput } from './ManualPlayerInput.tsx';
import { ManagerDetailsInput } from './ManagerDetailsInput.tsx';
import { preprocessImage } from '../lib/imagePreprocessing.ts';

// All official eFootball formations from user gameplan screenshots
export const EFOOTBALL_FORMATIONS = [
  { value: 'Auto-Detect / Balanced', label: 'Auto-Detect / AI Optimal Recommendation', category: 'General' },
  { value: 'Copy from Base Team', label: 'Copy from Base Team (Custom Gameplan Shape)', category: 'General' },
  
  // 4-Back Formations
  { value: '4-2-1-3', label: '4-2-1-3 (Double Pivot + Central AMF + Wingers)', category: '4-Back' },
  { value: '4-1-4-1', label: '4-1-4-1 (Anchor DMF + Flat 4 Midfield + Lone CF)', category: '4-Back' },
  { value: '4-1-2-3', label: '4-1-2-3 (Single DMF + Twin AMFs + Front 3)', category: '4-Back' },
  { value: '4-4-2', label: '4-4-2 (Classic Flat 4-4-2 / Twin CFs & Wide Midfielders)', category: '4-Back' },
  { value: '4-3-3', label: '4-3-3 (Standard 3 Midfielders + 3 Forwards)', category: '4-Back' },
  { value: '4-3-2-1', label: '4-3-2-1 (Christmas Tree / 3 Midfielders + 2 AMFs + 1 CF)', category: '4-Back' },
  { value: '4-3-1-2', label: '4-3-1-2 (Narrow Diamond / Central Overload)', category: '4-Back' },
  { value: '4-2-3-1', label: '4-2-3-1 (Single Striker / Wide Midfield + Double Pivot)', category: '4-Back' },
  { value: '4-2-2-2', label: '4-2-2-2 (Double AMF / Twin Strikers)', category: '4-Back' },

  // 3-Back Formations
  { value: '3-4-3', label: '3-4-3 (3 CBs + Wide Midfield 4 + Front 3)', category: '3-Back' },
  { value: '3-2-4-1', label: '3-2-4-1 (3 CBs + Double Pivot + 4 Midfielders + 1 CF)', category: '3-Back' },
  { value: '3-2-3-2', label: '3-2-3-2 (3 CBs + Double Pivot + AMF + 2 CFs)', category: '3-Back' },
  { value: '3-1-4-2', label: '3-1-4-2 (3 CBs + 1 DMF + 4 Midfielders + 2 CFs)', category: '3-Back' },

  // 5-Back Formations
  { value: '5-3-2', label: '5-3-2 (5 Defenders + 3 Central Midfielders + 2 CFs)', category: '5-Back' },
  { value: '5-2-2-1', label: '5-2-2-1 (5 Defenders + Double Pivot + 2 AMFs + 1 CF)', category: '5-Back' },
  { value: '5-2-1-2', label: '5-2-1-2 (5 Defenders + Double Pivot + 1 AMF + 2 CFs)', category: '5-Back' },
];

interface AnalyzerProps {
  onAnalysisCompleted: (result: AnalysisResult) => void;
}

export const SquadAnalyzer: React.FC<AnalyzerProps> = ({ onAnalysisCompleted }) => {
  const [files, setFiles] = useState<UploadedImageItem[]>([]);
  const [typedPlayers, setTypedPlayers] = useState<TypedPlayerInput[]>([]);
  const [managerDetails, setManagerDetails] = useState<ManagerInputDetails>({
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
    }
  });
  const [activeInputTab, setActiveInputTab] = useState<'screenshots' | 'enter_players'>('screenshots');
  const [preferredPlaystyle, setPreferredPlaystyle] = useState('Quick Counter');
  const [preferredFormation, setPreferredFormation] = useState('Auto-Detect / Balanced');
  const [tacticalPreference, setTacticalPreference] = useState('');

  // Fluid Formations state
  const [fluidFormations, setFluidFormations] = useState<FluidFormationSettings>({
    enabled: false,
    kickoffFormation: '4-2-1-3',
    inPossessionFormation: '3-2-4-1',
    outOfPossessionFormation: '5-3-2'
  });

  // Linked-Up Play Style state
  const [linkUpPlay, setLinkUpPlay] = useState<LinkUpPlaySettings>({
    enabled: false,
    fromPlayer: '',
    toPlayer: '',
    linkPattern: 'Give & Go (1-2 Quick Return Pass)',
    coachInstructionNote: ''
  });

  // Modals & Active Views
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [previewModalImage, setPreviewModalImage] = useState<UploadedImageItem | null>(null);

  // Analysis State & Progress
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isProcessingUploads, setIsProcessingUploads] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const analysisSteps = [
    'Stage 1: Pre-checking image resolution, blur & screen layout...',
    'Stage 2: Detecting individual player regions & card boundaries...',
    'Stage 3: Running dual OCR text extraction & multimodal vision...',
    'Stage 4: Cross-verifying against eFootball Master Database...',
    'Stage 5: Multi-screenshot deduplication & conflict resolution...',
    'Stage 6: Computing confidence scores, audit trails & verified squad dataset...',
    'Stage 7: Assembling verified Best XI, action plan & 2D tactical simulation...'
  ];

  // Process files added through file picker or drag-and-drop
  const handleFilesAdded = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setErrorMessage(null);

    const newFilesArray = Array.from(fileList);
    if (files.length + newFilesArray.length > 5) {
      setErrorMessage('You can upload a maximum of 5 screenshots.');
      return;
    }

    setIsProcessingUploads(true);
    const successfullyProcessed: UploadedImageItem[] = [];
    const errors: string[] = [];

    for (const f of newFilesArray) {
      try {
        const item = await preprocessImage(f, 'screenshot');
        successfullyProcessed.push(item);
      } catch (err: any) {
        console.error('File processing error:', err);
        errors.push(`${f.name}: ${err?.message || 'Unsupported image'}`);
      }
    }

    setIsProcessingUploads(false);

    if (errors.length > 0) {
      setErrorMessage(errors.join(' • '));
    }

    if (successfullyProcessed.length > 0) {
      setFiles((prev) => [...prev, ...successfullyProcessed].slice(0, 5));
    }

    // Reset input so same file can be selected again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Callback when a photo is captured & accepted in CameraCaptureModal
  const handleCameraPhotoAccepted = (item: UploadedImageItem) => {
    if (files.length >= 5) {
      setErrorMessage('You can upload a maximum of 5 screenshots.');
      return;
    }
    setErrorMessage(null);
    setFiles((prev) => [...prev, item].slice(0, 5));
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      handleFilesAdded(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleStartAnalysis = async () => {
    if (activeInputTab === 'screenshots') {
      if (files.length === 0) {
        setErrorMessage('Please upload at least 1 screenshot to analyze your squad.');
        return;
      }
      if (files.length > 5) {
        setErrorMessage('You can upload a maximum of 5 screenshots.');
        return;
      }
    } else {
      if (typedPlayers.length === 0) {
        setErrorMessage('Please enter at least one squad player to analyze your squad.');
        return;
      }
    }

    setIsAnalyzing(true);
    setErrorMessage(null);
    setCurrentStepIndex(0);

    // Step progress ticker
    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev < analysisSteps.length - 1) return prev + 1;
        return prev;
      });
    }, 1800);

    try {
      const payload = {
        images: files.map((f) => ({
          base64Data: f.base64Data,
          mimeType: f.mimeType || 'image/jpeg',
          name: f.name,
          source: f.source,
          dimensions: f.dimensions,
          qualityWarning: f.qualityWarning
        })),
        typedPlayers: typedPlayers.map(p => ({
          id: p.id,
          name: p.name,
          position: p.position,
          rating: p.rating,
          cardType: p.cardType,
          playstyle: p.playstyle,
          club: p.club,
          nationality: p.nationality,
          skills: p.skills
        })),
        managerDetails: managerDetails.name.trim() ? managerDetails : undefined,
        preferredPlaystyle,
        preferredFormation,
        fluidFormations: fluidFormations.enabled ? fluidFormations : undefined,
        linkUpPlay: linkUpPlay.enabled ? linkUpPlay : undefined,
        tacticalPreference,
        hasCoachScreenshot: false
      };

      const resp = await fetch('/api/analyze-squad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      clearInterval(interval);

      if (!resp.ok) {
        let errMessage = '';
        try {
          const errJson = await resp.json();
          errMessage = errJson.error || errJson.message || '';
        } catch {
          errMessage = await resp.text().catch(() => '');
        }
        if (resp.status === 413 || errMessage.includes('Payload Too Large') || errMessage.includes('FUNCTION_PAYLOAD_TOO_LARGE')) {
          throw new Error('Screenshot upload exceeds payload limits. Please upload fewer screenshots (1 to 3 recommended) or smaller file sizes.');
        }
        throw new Error(errMessage || `Analysis service encountered an issue (Status ${resp.status}). Please try again.`);
      }

      const data = await resp.json();
      const analysisResult = data.analysis || (data.squadRatings || data.recommendedFormation ? data : null);
      if (analysisResult) {
        onAnalysisCompleted(analysisResult);
      } else {
        throw new Error('No analysis data was returned by the tactical server.');
      }
    } catch (err: any) {
      clearInterval(interval);
      setIsAnalyzing(false);
      let msg = err?.message || 'Failed to process squad analysis.';
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('Load failed')) {
        msg = 'Network connection interrupted. Please check your internet connection and try again.';
      }
      setErrorMessage(msg);
    }
  };

  const getSourceIcon = (source: ImageSourceType) => {
    switch (source) {
      case 'camera':
        return <Camera className="w-3.5 h-3.5 text-cyan-400" />;
      case 'screenshot':
        return <Monitor className="w-3.5 h-3.5 text-emerald-400" />;
      default:
        return <FileText className="w-3.5 h-3.5 text-neutral-400" />;
    }
  };

  const getSourceLabel = (source: ImageSourceType) => {
    switch (source) {
      case 'camera':
        return 'Camera photo';
      case 'screenshot':
        return 'Screenshot';
      default:
        return 'File';
    }
  };

  return (
    <div id="analyzer-container" className="max-w-4xl mx-auto space-y-8 py-6">
      
      {/* Title */}
      <div>
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
            <Sparkles className="w-5 h-5" />
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            AI Squad Analyzer
          </h1>
        </div>
        <p className="text-sm text-neutral-400 mt-1">
          Upload up to 5 eFootball screenshots, take camera photos, or enter your Starting XI and Substitution squad players with manager details.
        </p>
      </div>

      {/* Input Mode Selector Tabs */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-1.5 flex flex-wrap gap-1.5 shadow-lg">
        <button
          type="button"
          onClick={() => setActiveInputTab('screenshots')}
          className={`flex-1 min-w-[160px] py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeInputTab === 'screenshots'
              ? 'bg-emerald-500 text-neutral-950 shadow-md'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>Upload Screenshots</span>
          {files.length > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeInputTab === 'screenshots' ? 'bg-neutral-950 text-emerald-400' : 'bg-neutral-800 text-white'
            }`}>
              {files.length} / 5
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveInputTab('enter_players')}
          className={`flex-1 min-w-[160px] py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeInputTab === 'enter_players'
              ? 'bg-emerald-500 text-neutral-950 shadow-md'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
          }`}
        >
          <Keyboard className="w-4 h-4" />
          <span>Enter Squad Players</span>
          {typedPlayers.length > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeInputTab === 'enter_players' ? 'bg-neutral-950 text-emerald-400' : 'bg-neutral-800 text-white'
            }`}>
              {typedPlayers.length} / 23
            </span>
          )}
        </button>
      </div>

      {/* User Guidance Banner (Requirement 14) */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="flex items-start gap-3.5">
          <span className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0 mt-0.5">
            <Info className="w-5 h-5" />
          </span>
          {activeInputTab === 'screenshots' ? (
            <div className="space-y-2 text-sm text-neutral-300">
              <h2 className="text-base font-bold text-white tracking-tight">Add your squad</h2>
              <p className="text-neutral-400 text-xs sm:text-sm">
                Upload screenshots or take clear photos of your eFootball screen.
              </p>
              <div className="pt-1">
                <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                  For best results:
                </p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-neutral-300">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    Keep the screen fully visible.
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    Hold the camera straight in front of the screen.
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    Avoid reflections and glare.
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    Use good lighting.
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    Move closer if player names are too small.
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    Make sure player names and ratings are visible.
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-2 text-sm text-neutral-300">
              <h2 className="text-base font-bold text-white tracking-tight">Enter your Squad & Manager Details</h2>
              <p className="text-neutral-400 text-xs sm:text-sm">
                Manually configure your eFootball Starting XI, Substitutes bench, and Manager profile for instant tactical breakdown and synergy evaluation.
              </p>
              <div className="pt-1">
                <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                  Tips for optimal squad analysis:
                </p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-neutral-300">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    Provide manager proficiency values to get accurate team chemistry scores.
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    Add all 11 Starting XI players with their respective positions and card types.
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    Add up to 12 substitutes for game-changing bench depth analysis.
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    Include player club affiliations to check potential team boosts.
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="bg-rose-950/60 border border-rose-800 rounded-xl p-4 flex items-start gap-3 text-rose-200 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">{errorMessage}</div>
          <button 
            onClick={() => setErrorMessage(null)}
            className="text-rose-400 hover:text-rose-200 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Loading Progress State */}
      {isAnalyzing ? (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 sm:p-12 text-center space-y-6 shadow-2xl">
          <div className="inline-flex p-4 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse">
            <Sparkles className="w-10 h-10" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h2 className="text-xl sm:text-2xl font-black text-white">
              Analyzing Your Squad...
            </h2>
            <p className="text-xs text-neutral-400">
              Examining player positions, player types, key playstyles, card ratings, and multi-image evidence.
            </p>
          </div>

          {/* Step Progress Checklist */}
          <div className="max-w-lg mx-auto bg-neutral-950 border border-neutral-800 rounded-xl p-5 text-left space-y-3">
            {analysisSteps.map((stepText, idx) => {
              const isDone = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              return (
                <div key={idx} className="flex items-center gap-3 text-xs sm:text-sm">
                  {isDone ? (
                    <span className="w-5 h-5 rounded-full bg-emerald-500 text-neutral-950 flex items-center justify-center font-bold text-xs shrink-0">
                      ✓
                    </span>
                  ) : isCurrent ? (
                    <span className="w-5 h-5 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin shrink-0" />
                  ) : (
                    <span className="w-5 h-5 rounded-full bg-neutral-800 text-neutral-500 flex items-center justify-center font-semibold text-xs shrink-0">
                      {idx + 1}
                    </span>
                  )}
                  <span className={isCurrent ? 'font-bold text-emerald-400' : isDone ? 'text-neutral-300' : 'text-neutral-600'}>
                    {stepText}
                  </span>
                </div>
              );
            })}
          </div>

          <p className="text-[11px] text-neutral-500 italic">
            This typically takes 8 to 15 seconds depending on image resolution.
          </p>
        </div>
      ) : (
        /* Upload & Configuration Form */
        <div className="space-y-8">
          
          {/* Section 1: Screenshots Upload (Shown if active tab is screenshots or both) */}
          {(activeInputTab === 'screenshots' || activeInputTab === 'both') && (
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-emerald-400" />
                    Upload screenshots or take photos
                  </h2>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    JPG, JPEG, JFIF, PNG, WebP and supported mobile image formats • Up to 10MB each • Maximum 5 images
                  </p>
                </div>
                <span className={`text-xs font-black px-3 py-1 rounded-full self-start sm:self-auto shrink-0 ${
                  files.length === 5 
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-neutral-800 text-neutral-300'
                }`}>
                  Images added: {files.length} / 5
                </span>
              </div>

              {/* Hidden File Input supporting all formats */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".jpg,.jpeg,.jpe,.jfif,.png,.webp,.heic,.heif,.avif,image/jpeg,image/png,image/webp,image/heic,image/heif,image/avif"
                onChange={(e) => handleFilesAdded(e.target.files)}
                className="hidden"
              />

              {/* Two Input Action Cards: Upload Screenshot & Take Photo (Requirement 2 & 3) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Option 1: Upload Screenshot */}
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => {
                    if (files.length >= 5) {
                      setErrorMessage('You can upload a maximum of 5 screenshots.');
                      return;
                    }
                    fileInputRef.current?.click();
                  }}
                  className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all group flex flex-col items-center justify-center ${
                    files.length >= 5
                      ? 'border-neutral-800 bg-neutral-950/30 opacity-50 cursor-not-allowed'
                      : 'border-neutral-700 hover:border-emerald-500 bg-neutral-950/60 hover:bg-neutral-950'
                  }`}
                >
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
                    Upload Screenshot
                  </h3>
                  <p className="text-xs text-neutral-400 mt-1 max-w-xs">
                    Click to browse or drag and drop screenshots from your device
                  </p>
                  <span className="mt-3 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                    Browse Files
                  </span>
                </div>

                {/* Option 2: Take Photo with Mobile/Device Camera */}
                <div
                  onClick={() => {
                    if (files.length >= 5) {
                      setErrorMessage('You can upload a maximum of 5 screenshots.');
                      return;
                    }
                    setIsCameraModalOpen(true);
                  }}
                  className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all group flex flex-col items-center justify-center ${
                    files.length >= 5
                      ? 'border-neutral-800 bg-neutral-950/30 opacity-50 cursor-not-allowed'
                      : 'border-neutral-700 hover:border-cyan-500 bg-neutral-950/60 hover:bg-neutral-950'
                  }`}
                >
                  <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Camera className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors">
                    Take Photo
                  </h3>
                  <p className="text-xs text-neutral-400 mt-1 max-w-xs">
                    Open device camera and photograph your eFootball squad screen directly
                  </p>
                  <span className="mt-3 text-[11px] font-medium text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 rounded-full">
                    Open Camera
                  </span>
                </div>

              </div>

              {/* Processing Spinner during HEIC/conversion/upload */}
              {isProcessingUploads && (
                <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center gap-3 text-xs text-neutral-300">
                  <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin shrink-0" />
                  <span>Validating image format, normalizing EXIF orientation & optimizing resolution...</span>
                </div>
              )}

              {/* Thumbnail Preview Cards with Dimensions and Source (Requirement 7) */}
              {files.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                      Uploaded Squad Images ({files.length}/5)
                    </p>
                    <span className="text-[11px] text-neutral-500">
                      Combined across screenshots & camera photos
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {files.map((f, idx) => (
                      <div
                        key={f.id}
                        className="relative rounded-xl border border-neutral-800 bg-neutral-950 p-3 flex flex-col justify-between space-y-3 hover:border-neutral-700 transition-colors group"
                      >
                        <div className="flex items-start gap-3">
                          {/* Thumbnail */}
                          <div 
                            onClick={() => setPreviewModalImage(f)}
                            className="relative w-20 h-16 rounded-lg overflow-hidden border border-neutral-800 bg-black shrink-0 cursor-pointer group-hover:border-emerald-500/50 transition-colors"
                          >
                            <img
                              src={f.previewUrl}
                              alt={f.name || `Squad Image ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-neutral-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Eye className="w-3.5 h-3.5 text-white" />
                            </div>
                          </div>

                          {/* Details */}
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center justify-between gap-1">
                              <h4 className="text-xs font-bold text-white truncate">
                                Squad Photo {idx + 1}
                              </h4>
                              <span className="text-[10px] font-mono text-neutral-500">
                                #{idx + 1}
                              </span>
                            </div>

                            {/* Source Badge */}
                            <div className="flex items-center gap-1.5 text-[11px] text-neutral-300">
                              {getSourceIcon(f.source)}
                              <span>{getSourceLabel(f.source)}</span>
                            </div>

                            {/* Dimensions */}
                            <p className="text-[11px] font-mono text-neutral-400">
                              {f.dimensions?.width || 'Auto'} × {f.dimensions?.height || 'Auto'}
                            </p>
                          </div>
                        </div>

                        {/* Quality Warning if detected */}
                        {f.qualityWarning && (
                          <div className="p-2 rounded-lg bg-amber-950/50 border border-amber-800/60 text-[11px] text-amber-300 flex items-start gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                            <span className="line-clamp-2 leading-snug">
                              Quality notice: Some player info may be faint.
                            </span>
                          </div>
                        )}

                        {/* Card Footer with Remove Button */}
                        <div className="flex items-center justify-between pt-1 border-t border-neutral-900 text-xs">
                          <span className="text-[10px] text-neutral-500 truncate max-w-[140px]">
                            {f.name}
                          </span>
                          <button
                            onClick={() => removeFile(f.id)}
                            className="px-2 py-1 rounded-md text-rose-400 hover:text-white hover:bg-rose-600/80 transition-colors flex items-center gap-1 text-[11px] font-semibold cursor-pointer"
                            title="Remove this image"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Remove</span>
                          </button>
                        </div>

                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Manager / Coach Details in Upload Screenshots Tab */}
              <div className="pt-2">
                <ManagerDetailsInput
                  managerDetails={managerDetails}
                  onManagerChange={setManagerDetails}
                  subtitle="Enter your manager/coach identity and playstyle proficiency ratings."
                />
              </div>

            </div>
          )}

          {/* Section 2: Enter Squad Players (Shown if active tab is enter_players) */}
          {activeInputTab === 'enter_players' && (
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl space-y-6">
              <ManualPlayerInput
                typedPlayers={typedPlayers}
                onChange={setTypedPlayers}
                managerDetails={managerDetails}
                onManagerChange={setManagerDetails}
              />
            </div>
          )}

          {/* Tactical Preferences & Advanced System Controls */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-cyan-400" />
                <h2 className="text-lg font-bold text-white">
                  Tactical Preferences & Gameplan Setup
                </h2>
              </div>
              <span className="text-xs text-neutral-400 font-medium">
                eFootball 2027 Supported
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Preferred Playstyle */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                    Preferred Playstyle
                  </label>
                  {preferredPlaystyle === 'Overload' && (
                    <span className="text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-1.5 py-0.2 rounded font-bold">
                      2027 New
                    </span>
                  )}
                </div>
                <select
                  value={preferredPlaystyle}
                  onChange={(e) => setPreferredPlaystyle(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Quick Counter">Quick Counter (Gegenpress & fast vertical breakout)</option>
                  <option value="Possession Game">Possession Game (Patient short passing build-up)</option>
                  <option value="Long Ball Counter">Long Ball Counter (Deep low block & direct outlet balls)</option>
                  <option value="Out Wide">Out Wide (Wing overlaps & high-percentage crosses)</option>
                  <option value="Long Ball">Long Ball (Target man flick-ons & second balls)</option>
                  <option value="Overload">Overload (eFootball 2027 • Half-space channel overload & numerical superiority)</option>
                </select>
              </div>

              {/* Preferred Formation */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                  Formation Preference
                </label>
                <select
                  value={preferredFormation}
                  onChange={(e) => setPreferredFormation(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  {EFOOTBALL_FORMATIONS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Fluid Formations Toggle & Configuration Block */}
              <div className="md:col-span-2 bg-neutral-950/70 border border-neutral-800 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                      <Sliders className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">Fluid Formations</span>
                        <span className="text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-full font-bold">
                          In-Game Dynamic Shape
                        </span>
                      </div>
                      <p className="text-xs text-neutral-400">
                        Automatically transform formation shape across match phases (Kick-Off, Attacking in Possession, Defending out of Possession).
                      </p>
                    </div>
                  </div>
                  
                  {/* Toggle Switch */}
                  <button
                    type="button"
                    onClick={() => setFluidFormations(prev => ({ ...prev, enabled: !prev.enabled }))}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      fluidFormations.enabled ? 'bg-cyan-500' : 'bg-neutral-800'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        fluidFormations.enabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {fluidFormations.enabled && (
                  <div className="pt-3 border-t border-neutral-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-fade-in">
                    <div>
                      <label className="text-[11px] font-bold text-cyan-400 block mb-1">
                        1. When Kick-Off Formation
                      </label>
                      <select
                        value={fluidFormations.kickoffFormation || '4-2-1-3'}
                        onChange={(e) => setFluidFormations(prev => ({ ...prev, kickoffFormation: e.target.value }))}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                      >
                        {EFOOTBALL_FORMATIONS.filter(f => f.value !== 'Auto-Detect / Balanced').map(f => (
                          <option key={`kickoff-${f.value}`} value={f.value}>{f.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-emerald-400 block mb-1">
                        2. When in Possession (Attacking)
                      </label>
                      <select
                        value={fluidFormations.inPossessionFormation || '3-2-4-1'}
                        onChange={(e) => setFluidFormations(prev => ({ ...prev, inPossessionFormation: e.target.value }))}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                      >
                        {EFOOTBALL_FORMATIONS.filter(f => f.value !== 'Auto-Detect / Balanced').map(f => (
                          <option key={`inpos-${f.value}`} value={f.value}>{f.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-amber-400 block mb-1">
                        3. When out of Possession (Defending)
                      </label>
                      <select
                        value={fluidFormations.outOfPossessionFormation || '5-3-2'}
                        onChange={(e) => setFluidFormations(prev => ({ ...prev, outOfPossessionFormation: e.target.value }))}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      >
                        {EFOOTBALL_FORMATIONS.filter(f => f.value !== 'Auto-Detect / Balanced').map(f => (
                          <option key={`outpos-${f.value}`} value={f.value}>{f.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Linked-Up Play Style Toggle & Configuration Block */}
              <div className="md:col-span-2 bg-neutral-950/70 border border-neutral-800 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">Linked-Up Play Style</span>
                        <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-bold">
                          Coach Combination Link
                        </span>
                      </div>
                      <p className="text-xs text-neutral-400">
                        Specify player-to-player link-up movements and combinations based on your coach's special tactical description.
                      </p>
                    </div>
                  </div>
                  
                  {/* Toggle Switch */}
                  <button
                    type="button"
                    onClick={() => setLinkUpPlay(prev => ({ ...prev, enabled: !prev.enabled }))}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      linkUpPlay.enabled ? 'bg-amber-500' : 'bg-neutral-800'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        linkUpPlay.enabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {linkUpPlay.enabled && (
                  <div className="pt-3 border-t border-neutral-800/80 space-y-3 animate-fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-neutral-300 block mb-1">
                          From Player (Initiator / Passer)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Kevin De Bruyne (AMF) / Rodri"
                          value={linkUpPlay.fromPlayer || ''}
                          onChange={(e) => setLinkUpPlay(prev => ({ ...prev, fromPlayer: e.target.value }))}
                          className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-neutral-300 block mb-1">
                          To Player (Target / Runner)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Erling Haaland (CF) / Vinícius Jr"
                          value={linkUpPlay.toPlayer || ''}
                          onChange={(e) => setLinkUpPlay(prev => ({ ...prev, toPlayer: e.target.value }))}
                          className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-neutral-300 block mb-1">
                          Link-Up Combination Style
                        </label>
                        <select
                          value={linkUpPlay.linkPattern || 'Give & Go (1-2 Quick Return Pass)'}
                          onChange={(e) => setLinkUpPlay(prev => ({ ...prev, linkPattern: e.target.value }))}
                          className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                        >
                          <option value="Give & Go (1-2 Quick Return Pass)">Give & Go (1-2 Quick Return Pass)</option>
                          <option value="Third-Man Overload Run (eFootball 2027)">Third-Man Overload Run (eFootball 2027)</option>
                          <option value="Target Man Wall Pass & Direct Release">Target Man Wall Pass & Direct Release</option>
                          <option value="Inverted Fullback Central Underlap">Inverted Fullback Central Underlap</option>
                          <option value="Inside Forward Overlap & Far Post Cut">Inside Forward Overlap & Far Post Cut</option>
                          <option value="Custom Coach Combination">Custom Coach Combination</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-neutral-400 block mb-1">
                        Coach's Link-Up Description / Special Instruction (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 'Coach instructs DMF to trigger quick triangle pass to AMF, unlocking CF behind the defensive line.'"
                        value={linkUpPlay.coachInstructionNote || ''}
                        onChange={(e) => setLinkUpPlay(prev => ({ ...prev, coachInstructionNote: e.target.value }))}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Freeform Tactical Note */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                  Specific Tactical Objective (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g., 'I want to counter opponent 4-3-3s' or 'Struggling with conceding crosses'"
                  value={tacticalPreference}
                  onChange={(e) => setTacticalPreference(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

            </div>
          </div>

          {/* Action Trigger CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 bg-neutral-950 border border-neutral-800 rounded-2xl">
            <div>
              <p className="text-sm font-bold text-white">Ready for comprehensive AI evaluation?</p>
              <p className="text-xs text-neutral-400">
                {activeInputTab === 'screenshots'
                  ? files.length > 0
                    ? `${files.length} squad screenshot(s) / photo(s) loaded${managerDetails.name ? ` • Manager: ${managerDetails.name}` : ''}.`
                    : 'Add up to 5 screenshots or camera photos to start analysis.'
                  : typedPlayers.length > 0
                    ? `${typedPlayers.length} player(s) loaded in squad${managerDetails.name ? ` • Manager: ${managerDetails.name}` : ''}.`
                    : 'Enter Starting XI or Substitution players to start analysis.'}
              </p>
            </div>

            <button
              id="start-squad-analysis-btn"
              onClick={handleStartAnalysis}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 shadow-emerald-500/20 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              Analyze My Squad {activeInputTab === 'screenshots' && files.length > 0 ? `(${files.length} images)` : activeInputTab === 'enter_players' && typedPlayers.length > 0 ? `(${typedPlayers.length} players)` : ''}
            </button>
          </div>

        </div>
      )}

      {/* Camera Capture Modal (Requirement 2 & 3) */}
      <CameraCaptureModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onPhotoAccepted={handleCameraPhotoAccepted}
        currentImageCount={files.length}
      />

      {/* Full Image Preview Modal */}
      {previewModalImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/85 backdrop-blur-md animate-fade-in">
          <div className="relative max-w-4xl w-full bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/60">
              <div className="flex items-center gap-2">
                {getSourceIcon(previewModalImage.source)}
                <div>
                  <h3 className="text-sm font-bold text-white">{previewModalImage.name}</h3>
                  <p className="text-[11px] text-neutral-400 font-mono">
                    {previewModalImage.dimensions?.width} × {previewModalImage.dimensions?.height} px • {getSourceLabel(previewModalImage.source)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPreviewModalImage(null)}
                className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-black flex items-center justify-center min-h-[300px]">
              <img
                src={previewModalImage.previewUrl}
                alt={previewModalImage.name}
                className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-xl"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
