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
  Maximize2
} from 'lucide-react';
import { AnalysisResult, UploadedImageItem, ImageSourceType } from '../types.ts';
import { CameraCaptureModal } from './CameraCaptureModal.tsx';
import { preprocessImage } from '../lib/imagePreprocessing.ts';

interface AnalyzerProps {
  onAnalysisCompleted: (result: AnalysisResult) => void;
}

export const SquadAnalyzer: React.FC<AnalyzerProps> = ({ onAnalysisCompleted }) => {
  const [files, setFiles] = useState<UploadedImageItem[]>([]);
  const [preferredPlaystyle, setPreferredPlaystyle] = useState('Quick Counter');
  const [preferredFormation, setPreferredFormation] = useState('Auto-Detect / Balanced');
  const [tacticalPreference, setTacticalPreference] = useState('');
  const [isCoachScreenshotIncluded, setIsCoachScreenshotIncluded] = useState(false);

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
      setErrorMessage(`You can upload a maximum of 5 images per analysis (currently ${files.length} selected).`);
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
      setErrorMessage('You can upload a maximum of 5 images per analysis.');
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
    if (files.length === 0) {
      setErrorMessage('Please upload at least 1 squad screenshot or camera photo before analyzing.');
      return;
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
        preferredPlaystyle,
        preferredFormation,
        tacticalPreference,
        hasCoachScreenshot: isCoachScreenshotIncluded
      };

      const resp = await fetch('/api/analyze-squad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      clearInterval(interval);

      if (!resp.ok) {
        const errJson = await resp.json().catch(() => ({}));
        throw new Error(errJson.error || 'Analysis service returned an error. Please try again.');
      }

      const data = await resp.json();
      if (data.analysis) {
        onAnalysisCompleted(data.analysis);
      } else {
        throw new Error('No analysis data received from server.');
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
          Upload up to 5 eFootball screenshots or camera photos of your squad, player stats, skills, or coach. Our vision pipeline inspects every card and prescribes your optimal tactical system.
        </p>
      </div>

      {/* User Guidance Banner (Requirement 14) */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="flex items-start gap-3.5">
          <span className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0 mt-0.5">
            <Info className="w-5 h-5" />
          </span>
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
          
          {/* Upload Area (Requirements 2, 3, 7, 17) */}
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
                    setErrorMessage('Maximum 5 images allowed. Please remove an image first.');
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
                    setErrorMessage('Maximum 5 images allowed. Please remove an image first.');
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

          </div>

          {/* Optional Tactical Preferences */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl space-y-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Info className="w-5 h-5 text-cyan-400" />
              Tactical Preferences & Coach Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Preferred Playstyle */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                  Preferred Playstyle
                </label>
                <select
                  value={preferredPlaystyle}
                  onChange={(e) => setPreferredPlaystyle(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Possession Game">Possession Game (Patient short passing build-up)</option>
                  <option value="Quick Counter">Quick Counter (Gegenpress & fast vertical breakout)</option>
                  <option value="Long Ball Counter">Long Ball Counter (Deep low block & direct outlet balls)</option>
                  <option value="Out Wide">Out Wide (Wing overlaps & high-percentage crosses)</option>
                  <option value="Long Ball">Long Ball (Target man flick-ons & second balls)</option>
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
                  <option value="Auto-Detect / Balanced">Auto-Detect / AI Optimal Recommendation</option>
                  <option value="4-2-1-3">4-2-1-3 (Double Pivot + Central AMF + Wingers)</option>
                  <option value="4-3-1-2">4-3-1-2 (Narrow Diamond / Central Overload)</option>
                  <option value="4-2-2-2">4-2-2-2 (Double AMF / Twin Strikers)</option>
                  <option value="4-2-3-1">4-2-3-1 (Single Striker / Wide Midfield)</option>
                  <option value="3-2-3-2">3-2-3-2 (Three Back / High Width)</option>
                </select>
              </div>

              {/* Coach Screenshot Confirmation Checkbox */}
              <div className="md:col-span-2 pt-2">
                <label className="flex items-center gap-3 p-3 rounded-xl bg-neutral-950 border border-neutral-800 cursor-pointer hover:border-neutral-700">
                  <input
                    type="checkbox"
                    checked={isCoachScreenshotIncluded}
                    onChange={(e) => setIsCoachScreenshotIncluded(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-500 bg-neutral-900 border-neutral-700 focus:ring-emerald-500"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-white block">
                      One of my uploaded screenshots or photos contains my Coach/Manager
                    </span>
                    <span className="text-neutral-400 block mt-0.5">
                      If checked, the AI will inspect the coach's tactical affinity from your image; otherwise, it provides a general recommendation.
                    </span>
                  </div>
                </label>
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
                1 free analysis per week included. Accepts screenshots and camera photos.
              </p>
            </div>

            <button
              id="start-squad-analysis-btn"
              onClick={handleStartAnalysis}
              disabled={files.length === 0}
              className={`w-full sm:w-auto px-8 py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg ${
                files.length > 0
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-neutral-950 shadow-emerald-500/20 cursor-pointer'
                  : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              Analyze My Squad ({files.length}/5 Images)
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
