import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  RotateCw, 
  X, 
  AlertTriangle, 
  Check, 
  RefreshCw, 
  Upload, 
  ShieldAlert,
  Sparkles,
  Maximize2
} from 'lucide-react';
import { UploadedImageItem } from '../types.ts';
import { analyzeImageQuality, preprocessImage } from '../lib/imagePreprocessing.ts';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPhotoAccepted: (item: UploadedImageItem) => void;
  currentImageCount: number;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onPhotoAccepted,
  currentImageCount
}) => {
  const [cameraState, setCameraState] = useState<
    'initializing' | 'live' | 'captured' | 'permission_denied' | 'unavailable' | 'processing'
  >('initializing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  
  // Captured snapshot state
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
  const [capturedDimensions, setCapturedDimensions] = useState<{ width: number; height: number } | null>(null);
  const [qualityWarning, setQualityWarning] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileFallbackInputRef = useRef<HTMLInputElement | null>(null);

  // Stop camera tracks helper
  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Start camera stream
  const startCamera = async (facing: 'environment' | 'user' = 'environment') => {
    stopCameraStream();
    setCameraState('initializing');
    setErrorMessage(null);
    setCapturedBlob(null);
    setCapturedDataUrl(null);
    setQualityWarning(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraState('unavailable');
      setErrorMessage('Direct camera capture is not supported on this browser or device.');
      return;
    }

    try {
      // Check for available video devices to enable camera flip button
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        setHasMultipleCameras(videoInputs.length > 1);
      } catch (e) {
        // Enumerate devices may fail before permission granted
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraState('live');
    } catch (err: any) {
      console.warn('Camera access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraState('permission_denied');
        setErrorMessage('Camera access was denied. You can upload a photo from your device instead.');
      } else {
        setCameraState('unavailable');
        setErrorMessage(
          err.message || 'Unable to start camera stream. You can upload a photo from your device instead.'
        );
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      startCamera(facingMode);
    } else {
      stopCameraStream();
    }
    return () => {
      stopCameraStream();
    };
  }, [isOpen, facingMode]);

  // Flip camera
  const handleToggleCamera = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
  };

  // Capture frame from live video
  const handleCapturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);

    // Run quality check
    const quality = analyzeImageQuality(canvas, ctx, width, height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

    canvas.toBlob((blob) => {
      if (blob) {
        setCapturedBlob(blob);
      }
    }, 'image/jpeg', 0.92);

    setCapturedDataUrl(dataUrl);
    setCapturedDimensions({ width, height });
    setQualityWarning(quality.warningMessage);
    setCameraState('captured');

    // Pause video to save CPU
    video.pause();
  };

  // Retake photo
  const handleRetake = () => {
    setCapturedBlob(null);
    setCapturedDataUrl(null);
    setQualityWarning(null);
    setCameraState('live');
    if (videoRef.current && streamRef.current) {
      videoRef.current.play().catch(console.warn);
    } else {
      startCamera(facingMode);
    }
  };

  // Confirm photo (either accepted normally or "Use Anyway")
  const handleConfirmPhoto = async () => {
    if (!capturedBlob && !capturedDataUrl) return;

    setCameraState('processing');
    try {
      let finalBlob = capturedBlob;
      if (!finalBlob && capturedDataUrl) {
        // Convert dataUrl to blob
        const res = await fetch(capturedDataUrl);
        finalBlob = await res.blob();
      }

      if (!finalBlob) {
        throw new Error('Failed to process captured photo.');
      }

      const photoNumber = currentImageCount + 1;
      const processed = await preprocessImage(
        finalBlob,
        'camera',
        `Camera_Photo_${photoNumber}.jpg`
      );

      // Preserve any quality warning
      if (qualityWarning) {
        processed.qualityWarning = qualityWarning;
      }

      stopCameraStream();
      onPhotoAccepted(processed);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to process photo.');
      setCameraState('captured');
    }
  };

  // Handle fallback file upload when camera unavailable/denied
  const handleFallbackFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCameraState('processing');
    try {
      const processed = await preprocessImage(file, 'camera');
      stopCameraStream();
      onPhotoAccepted(processed);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to process selected photo.');
      setCameraState('permission_denied');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
              <Camera className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-white">Take eFootball Screen Photo</h2>
              <p className="text-xs text-neutral-400">Rear camera enabled • Frame squad clearly</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCameraStream();
              onClose();
            }}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            title="Close camera"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport Area */}
        <div className="relative flex-1 bg-black flex items-center justify-center min-h-[340px] sm:min-h-[420px] overflow-hidden">
          
          {/* Hidden File Input for fallback capture */}
          <input
            ref={fileFallbackInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFallbackFileChange}
          />

          {/* Live Video */}
          <video
            ref={videoRef}
            playsInline
            autoPlay
            muted
            className={`w-full h-full object-contain ${cameraState === 'live' ? 'block' : 'hidden'}`}
          />

          {/* Captured Image Preview */}
          {cameraState === 'captured' && capturedDataUrl && (
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              <img
                src={capturedDataUrl}
                alt="Captured screen"
                className="max-w-full max-h-[50vh] object-contain rounded-lg"
              />
            </div>
          )}

          {/* Viewfinder Target Overlay in Live Mode */}
          {cameraState === 'live' && (
            <div className="pointer-events-none absolute inset-6 sm:inset-10 border-2 border-dashed border-emerald-500/50 rounded-2xl flex flex-col justify-between p-4">
              <div className="flex justify-between">
                <span className="w-6 h-6 border-t-2 border-l-2 border-emerald-400" />
                <span className="w-6 h-6 border-t-2 border-r-2 border-emerald-400" />
              </div>
              <div className="text-center">
                <span className="bg-neutral-950/80 text-emerald-400 text-xs px-3 py-1.5 rounded-full border border-emerald-500/30 font-medium inline-block shadow-lg">
                  Position eFootball screen inside frame • Avoid glare
                </span>
              </div>
              <div className="flex justify-between">
                <span className="w-6 h-6 border-b-2 border-l-2 border-emerald-400" />
                <span className="w-6 h-6 border-b-2 border-r-2 border-emerald-400" />
              </div>
            </div>
          )}

          {/* Initializing Spinner */}
          {cameraState === 'initializing' && (
            <div className="text-center p-6 space-y-3">
              <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm font-medium text-white">Starting camera...</p>
              <p className="text-xs text-neutral-400">Requesting permission for rear device camera</p>
            </div>
          )}

          {/* Processing Spinner */}
          {cameraState === 'processing' && (
            <div className="text-center p-6 space-y-3">
              <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm font-medium text-white">Normalizing & optimizing photo...</p>
              <p className="text-xs text-neutral-400">Correcting EXIF orientation and enhancing clarity</p>
            </div>
          )}

          {/* Permission Denied View */}
          {cameraState === 'permission_denied' && (
            <div className="text-center p-8 max-w-md mx-auto space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Camera Access Was Denied</h3>
                <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">
                  Camera access was denied. You can upload a photo from your device instead.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => fileFallbackInputRef.current?.click()}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-colors cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  Choose Photo From Device
                </button>
                <button
                  onClick={() => startCamera(facingMode)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Try Camera Again
                </button>
              </div>
            </div>
          )}

          {/* Camera Unavailable View */}
          {cameraState === 'unavailable' && (
            <div className="text-center p-8 max-w-md mx-auto space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Camera Not Available</h3>
                <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">
                  {errorMessage || 'Direct camera capture is unavailable on this device. You can take a photo and upload it directly.'}
                </p>
              </div>
              <button
                onClick={() => fileFallbackInputRef.current?.click()}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs inline-flex items-center gap-2 shadow-lg transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                Upload Photo Instead
              </button>
            </div>
          )}

        </div>

        {/* Quality Warning Banner (Requirement 4) */}
        {cameraState === 'captured' && qualityWarning && (
          <div className="px-6 py-3.5 bg-amber-950/70 border-t border-b border-amber-800/80 flex items-start gap-3 text-amber-200">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs flex-1">
              <span className="font-bold text-amber-300 block mb-0.5">
                Image quality may be too low
              </span>
              <span>{qualityWarning}</span>
            </div>
          </div>
        )}

        {/* Action Controls Footer */}
        <div className="p-4 sm:p-5 border-t border-neutral-800 bg-neutral-950/80 flex items-center justify-between gap-3">
          
          {/* LIVE MODE BUTTONS */}
          {cameraState === 'live' && (
            <>
              {hasMultipleCameras ? (
                <button
                  onClick={handleToggleCamera}
                  className="p-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors flex items-center gap-1.5 text-xs font-semibold"
                  title="Switch front/rear camera"
                >
                  <RotateCw className="w-4 h-4" />
                  <span className="hidden sm:inline">Flip Camera</span>
                </button>
              ) : (
                <button
                  onClick={() => fileFallbackInputRef.current?.click()}
                  className="p-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors flex items-center gap-1.5 text-xs font-semibold"
                  title="Upload from device"
                >
                  <Upload className="w-4 h-4" />
                  <span className="hidden sm:inline">Upload Instead</span>
                </button>
              )}

              {/* Shutter Button */}
              <button
                onClick={handleCapturePhoto}
                className="w-16 h-16 rounded-full border-4 border-emerald-500 bg-white hover:scale-105 active:scale-95 transition-transform flex items-center justify-center shadow-lg shadow-emerald-500/20 mx-auto"
                title="Capture photograph"
              >
                <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center">
                  <Camera className="w-6 h-6 text-neutral-950" />
                </div>
              </button>

              <button
                onClick={() => {
                  stopCameraStream();
                  onClose();
                }}
                className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
            </>
          )}

          {/* CAPTURED MODE BUTTONS */}
          {cameraState === 'captured' && (
            <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-neutral-400 flex items-center gap-2">
                <Maximize2 className="w-3.5 h-3.5 text-neutral-500" />
                <span>
                  Captured: {capturedDimensions?.width || 0} × {capturedDimensions?.height || 0} px
                </span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={handleRetake}
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4 text-neutral-400" />
                  Retake Photo
                </button>

                {qualityWarning ? (
                  <button
                    onClick={handleConfirmPhoto}
                    className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs flex items-center justify-center gap-1.5 transition-colors shadow-lg cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    Use Anyway
                  </button>
                ) : (
                  <button
                    onClick={handleConfirmPhoto}
                    className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-xs flex items-center justify-center gap-1.5 transition-colors shadow-lg shadow-emerald-500/20 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    Accept Photo
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ERROR OR PROCESSING */}
          {(cameraState === 'permission_denied' || cameraState === 'unavailable' || cameraState === 'processing') && (
            <div className="w-full flex justify-end">
              <button
                onClick={() => {
                  stopCameraStream();
                  onClose();
                }}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
