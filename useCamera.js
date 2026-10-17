import { useCallback, useEffect, useRef, useState } from 'react';

// Maps browser camera errors to messages a student can act on.
const describeCameraError = (err) => {
  switch (err?.name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return {
        code: 'PERMISSION_DENIED',
        message: 'Camera permission was blocked. Allow camera access in the browser address bar, then try again.',
      };
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return { code: 'NO_CAMERA', message: 'No camera was found on this device.' };
    case 'NotReadableError':
    case 'TrackStartError':
      return {
        code: 'CAMERA_BUSY',
        message: 'The camera is being used by another app. Close it and try again.',
      };
    case 'OverconstrainedError':
      return { code: 'UNSUPPORTED', message: 'This camera does not support the required settings.' };
    default:
      return { code: 'UNKNOWN', message: 'Could not start the camera. Please try again.' };
  }
};

/**
 * Manages one camera stream.
 *
 *   const { videoRef, status, error, start, stop, capture } = useCamera();
 *
 * - The <video ref={videoRef}> must always be mounted (hide it with CSS when idle).
 * - status: 'idle' | 'starting' | 'active' | 'error'
 * - The camera never starts by itself. Call start() from a button click.
 * - It stops on unmount and when the browser tab is hidden, so it is never left
 *   running in the background.
 * - On failure it reports an error. It never falls back to a fake or stock image.
 */
export function useCamera({ facingMode = 'user', width = 640, height = 480, stopWhenHidden = true } = {}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  const releaseStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const stop = useCallback(() => {
    releaseStream();
    setStatus('idle');
  }, [releaseStream]);

  const start = useCallback(async () => {
    if (streamRef.current) return;
    setError(null);

    // getUserMedia only exists on HTTPS pages (or localhost).
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError({
        code: 'INSECURE_CONTEXT',
        message: 'Camera access needs a secure (HTTPS) page. Open the site over HTTPS or on localhost.',
      });
      setStatus('error');
      return;
    }

    setStatus('starting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: width }, height: { ideal: height } },
        audio: false,
      });

      const video = videoRef.current;
      if (!video) {
        // The component unmounted while the permission prompt was open.
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;
      video.srcObject = stream;
      await video.play();
      setStatus('active');
    } catch (err) {
      releaseStream();
      setError(describeCameraError(err));
      setStatus('error');
    }
  }, [facingMode, width, height, releaseStream]);

  /**
   * Grab the current frame as a JPEG Blob.
   * The frame is NOT mirrored, even though the preview is, because matching
   * should run on the true image.
   */
  const capture = useCallback(async ({ quality = 0.9 } = {}) => {
    const video = videoRef.current;
    if (!streamRef.current || !video || !video.videoWidth) {
      throw new Error('Camera is not ready yet.');
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Could not encode the photo.'))),
        'image/jpeg',
        quality
      );
    });

    return { blob, width: canvas.width, height: canvas.height };
  }, []);

  // Never leave the camera on: stop when the component unmounts...
  useEffect(() => releaseStream, [releaseStream]);

  // ...and when the tab is hidden or the user switches apps.
  useEffect(() => {
    if (!stopWhenHidden) return undefined;
    const onVisibility = () => {
      if (document.hidden) stop();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [stop, stopWhenHidden]);

  return { videoRef, status, error, start, stop, capture };
}
