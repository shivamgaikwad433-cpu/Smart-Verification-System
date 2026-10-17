import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, CheckCircle2, Power, RotateCcw } from 'lucide-react';
import { useCamera } from './useCamera.js';
import { analyzeVideoFrame, evaluateQuality } from './imageQuality.js';

const QUALITY_CHECK_INTERVAL_MS = 500;

/**
 * One photo capture step.
 *
 *   <FaceCapture
 *     title="Front view"
 *     instruction="Look straight at the camera"
 *     onCapture={({ blob, previewUrl, width, height, quality }) => ...}
 *     onRetake={() => ...}
 *   />
 *
 * The camera is off until the user clicks "Open camera". After a photo is taken the
 * camera is switched off again. The Capture button stays disabled while the live
 * lighting/sharpness check fails.
 */
export function FaceCapture({ title, instruction, onCapture, onRetake, disabled = false, showDebug = false }) {
  const { videoRef, status, error, start, stop, capture } = useCamera();
  const [quality, setQuality] = useState(null); // { ok, issues, brightness, sharpness }
  const [captured, setCaptured] = useState(null); // { previewUrl, ... }
  const [capturing, setCapturing] = useState(false);
  const [captureError, setCaptureError] = useState(null);
  const scratchCanvasRef = useRef(null);
  const capturedUrlRef = useRef(null);

  const isActive = status === 'active';

  // Run the quality check a couple of times per second while the camera is on.
  useEffect(() => {
    if (!isActive) return undefined;
    if (!scratchCanvasRef.current) scratchCanvasRef.current = document.createElement('canvas');

    const timer = setInterval(() => {
      const video = videoRef.current;
      if (!video || !video.videoWidth) return;
      const metrics = analyzeVideoFrame(video, scratchCanvasRef.current);
      setQuality({ ...evaluateQuality(metrics), ...metrics });
    }, QUALITY_CHECK_INTERVAL_MS);

    return () => {
      clearInterval(timer);
      setQuality(null);
    };
  }, [isActive, videoRef]);

  // Free the preview image when the component goes away.
  useEffect(
    () => () => {
      if (capturedUrlRef.current) URL.revokeObjectURL(capturedUrlRef.current);
    },
    []
  );

  const handleCapture = useCallback(async () => {
    if (!quality?.ok || capturing) return;
    setCapturing(true);
    setCaptureError(null);
    try {
      const { blob, width, height } = await capture();
      const previewUrl = URL.createObjectURL(blob);
      capturedUrlRef.current = previewUrl;
      const result = {
        blob,
        previewUrl,
        width,
        height,
        quality: { brightness: quality.brightness, sharpness: quality.sharpness },
      };
      setCaptured(result);
      stop(); // camera off as soon as we have the photo
      onCapture?.(result);
    } catch (err) {
      setCaptureError(err.message || 'Could not capture the photo.');
    } finally {
      setCapturing(false);
    }
  }, [quality, capturing, capture, stop, onCapture]);

  const handleRetake = useCallback(() => {
    if (capturedUrlRef.current) {
      URL.revokeObjectURL(capturedUrlRef.current);
      capturedUrlRef.current = null;
    }
    setCaptured(null);
    onRetake?.();
    start();
  }, [onRetake, start]);

  const statusMessage = isActive
    ? quality
      ? quality.ok
        ? 'Looks good. You can capture now.'
        : quality.issues[0].message
      : 'Checking the picture...'
    : '';

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-semibold text-slate-800">{title}</p>
        {instruction && <p className="text-[11px] text-slate-500">{instruction}</p>}
      </div>

      <div className="relative rounded-xl overflow-hidden bg-black aspect-4/3 w-full border border-slate-800">
        {/* The video element stays mounted so the stream can attach to it. */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover -scale-x-100 ${isActive && !captured ? '' : 'hidden'}`}
        />

        {captured && (
          <img src={captured.previewUrl} alt={`${title} preview`} className="w-full h-full object-cover -scale-x-100" />
        )}

        {/* Camera off / error */}
        {!isActive && !captured && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
            <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-2.5 text-slate-400">
              <CameraOff className="w-6 h-6" />
            </div>
            {error ? (
              <p role="alert" className="text-xs text-rose-300 max-w-xs mb-3.5">
                {error.message}
              </p>
            ) : (
              <p className="text-xs text-slate-300 max-w-xs mb-3.5">The camera is off until you open it.</p>
            )}
            <button
              type="button"
              onClick={start}
              disabled={disabled || status === 'starting'}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Camera className="w-4 h-4" />
              <span>{status === 'starting' ? 'Opening camera...' : error ? 'Try again' : 'Open camera'}</span>
            </button>
          </div>
        )}

        {/* Live overlay: face guide and close button */}
        {isActive && !captured && (
          <>
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div
                className={`w-36 h-48 sm:w-44 sm:h-56 rounded-[50%] border-2 transition-colors ${
                  quality?.ok ? 'border-emerald-400/80' : 'border-amber-300/70'
                }`}
              />
            </div>
            <button
              type="button"
              onClick={stop}
              aria-label="Close camera"
              className="absolute top-2.5 right-2.5 px-2 py-1 rounded-lg bg-slate-900/80 hover:bg-rose-950/80 text-rose-300 text-[11px] font-semibold backdrop-blur-xs border border-rose-800/60 flex items-center gap-1 transition-colors"
            >
              <Power className="w-3 h-3" />
              <span>Close camera</span>
            </button>
          </>
        )}
      </div>

      {/* Feedback line */}
      <div role="status" aria-live="polite" className="min-h-4 text-[11px]">
        {isActive && (
          <span className={quality?.ok ? 'text-emerald-600 font-medium' : 'text-amber-600 font-medium'}>
            {statusMessage}
          </span>
        )}
        {captureError && <span className="text-rose-600 font-medium">{captureError}</span>}
        {showDebug && isActive && quality && (
          <span className="ml-2 text-slate-400">
            brightness {quality.brightness.toFixed(0)} / sharpness {quality.sharpness.toFixed(0)} /{' '}
            {quality.frameWidth}x{quality.frameHeight}
          </span>
        )}
      </div>

      {/* Actions */}
      {isActive && !captured && (
        <button
          type="button"
          onClick={handleCapture}
          disabled={disabled || !quality?.ok || capturing}
          className="w-full px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
        >
          <Camera className="w-4 h-4" />
          <span>{capturing ? 'Capturing...' : 'Capture photo'}</span>
        </button>
      )}

      {captured && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
          <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            Photo captured
          </span>
          <button
            type="button"
            onClick={handleRetake}
            className="text-xs text-slate-600 hover:text-slate-900 underline underline-offset-2 flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Retake
          </button>
        </div>
      )}
    </div>
  );
}

export default FaceCapture;
