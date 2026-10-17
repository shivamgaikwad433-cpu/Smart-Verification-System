// Client-side photo quality checks used before a face photo is accepted.
//
// IMPORTANT: these are a convenience for the user (instant feedback), not security.
// The backend must run its own checks on every uploaded photo.
//
// The numbers below are STARTING VALUES. Webcams differ a lot, so test with real
// cameras in your college's lighting (turn on `showDebug` in FaceCapture to see the
// live numbers) and adjust.

export const QUALITY_LIMITS = {
  minBrightness: 70, // average gray level, 0 (black) to 255 (white)
  maxBrightness: 190,
  minSharpness: 40, // variance of the Laplacian on a 160x120 frame; higher = sharper
  minWidth: 480, // size of the real camera frame, not the analysis frame
  minHeight: 360,
};

const ANALYSIS_WIDTH = 160;
const ANALYSIS_HEIGHT = 120;

/**
 * Measure brightness and sharpness from raw RGBA pixels.
 * Pure function: no DOM, so it can be unit-tested in Node.
 */
export function analyzePixels(rgba, width, height) {
  const count = width * height;
  const gray = new Float32Array(count);
  let sum = 0;

  for (let i = 0, p = 0; i < count; i++, p += 4) {
    const g = 0.299 * rgba[p] + 0.587 * rgba[p + 1] + 0.114 * rgba[p + 2];
    gray[i] = g;
    sum += g;
  }
  const brightness = sum / count;

  // Variance of the Laplacian: a standard, cheap "is this blurry?" measure.
  let lapSum = 0;
  let lapSq = 0;
  let lapCount = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const lap = 4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - width] - gray[i + width];
      lapSum += lap;
      lapSq += lap * lap;
      lapCount++;
    }
  }
  const mean = lapSum / lapCount;
  const sharpness = lapSq / lapCount - mean * mean;

  return { brightness, sharpness };
}

/**
 * Turn measurements into a pass/fail result with user-facing messages.
 * `frameWidth` / `frameHeight` are the real camera resolution.
 */
export function evaluateQuality(
  { brightness, sharpness, frameWidth, frameHeight },
  limits = QUALITY_LIMITS
) {
  const issues = [];

  if (brightness < limits.minBrightness) {
    issues.push({ code: 'TOO_DARK', message: 'Too dark. Face a window or turn on a light.' });
  } else if (brightness > limits.maxBrightness) {
    issues.push({ code: 'TOO_BRIGHT', message: 'Too bright. Move away from direct light behind or on you.' });
  }

  if (sharpness < limits.minSharpness) {
    issues.push({ code: 'BLURRY', message: 'Image is blurry. Hold still and clean the camera lens.' });
  }

  if (frameWidth < limits.minWidth || frameHeight < limits.minHeight) {
    issues.push({ code: 'LOW_RESOLUTION', message: 'Camera resolution is too low for face matching.' });
  }

  return { ok: issues.length === 0, issues };
}

/**
 * Analyze the current frame of a <video> element. Browser only.
 * Pass the same scratch canvas each time to avoid allocating one per call.
 */
export function analyzeVideoFrame(video, scratchCanvas) {
  scratchCanvas.width = ANALYSIS_WIDTH;
  scratchCanvas.height = ANALYSIS_HEIGHT;
  const ctx = scratchCanvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(video, 0, 0, ANALYSIS_WIDTH, ANALYSIS_HEIGHT);
  const { data } = ctx.getImageData(0, 0, ANALYSIS_WIDTH, ANALYSIS_HEIGHT);

  const { brightness, sharpness } = analyzePixels(data, ANALYSIS_WIDTH, ANALYSIS_HEIGHT);
  return {
    brightness,
    sharpness,
    frameWidth: video.videoWidth,
    frameHeight: video.videoHeight,
  };
}
