import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzePixels, evaluateQuality } from '../imageQuality.js';

test('analyzePixels reports brightness and zero sharpness for a flat image', () => {
  const pixels = new Uint8ClampedArray(8 * 8 * 4);
  for (let index = 0; index < pixels.length; index += 4) {
    pixels[index] = 100;
    pixels[index + 1] = 100;
    pixels[index + 2] = 100;
    pixels[index + 3] = 255;
  }

  const metrics = analyzePixels(pixels, 8, 8);
  assert.equal(metrics.brightness, 100);
  assert.equal(metrics.sharpness, 0);
});

test('evaluateQuality accepts a sufficiently bright, sharp, high-resolution frame', () => {
  assert.deepEqual(
    evaluateQuality({ brightness: 120, sharpness: 80, frameWidth: 640, frameHeight: 480 }),
    { ok: true, issues: [] },
  );
});

test('evaluateQuality reports every applicable capture issue', () => {
  const result = evaluateQuality({ brightness: 20, sharpness: 2, frameWidth: 320, frameHeight: 240 });
  assert.equal(result.ok, false);
  assert.deepEqual(result.issues.map(({ code }) => code), ['TOO_DARK', 'BLURRY', 'LOW_RESOLUTION']);
});

test('evaluateQuality distinguishes excessive brightness', () => {
  const result = evaluateQuality({ brightness: 230, sharpness: 100, frameWidth: 640, frameHeight: 480 });
  assert.equal(result.ok, false);
  assert.equal(result.issues[0].code, 'TOO_BRIGHT');
});
