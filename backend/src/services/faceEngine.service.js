/**
 * faceEngine.service.js
 * Face recognition engine using @vladmandic/face-api and @tensorflow/tfjs-node.
 * Fully compatible with Node 24+ and Windows native DLL loading.
 */

const path = require('path');
const util = require('util');

// Polyfills for Node 24+ where legacy util functions were removed
if (!util.isNullOrUndefined) util.isNullOrUndefined = (val) => val === undefined || val === null;
if (!util.isArray) util.isArray = Array.isArray;
if (!util.isBoolean) util.isBoolean = (val) => typeof val === 'boolean';
if (!util.isNull) util.isNull = (val) => val === null;
if (!util.isNumber) util.isNumber = (val) => typeof val === 'number';
if (!util.isString) util.isString = (val) => typeof val === 'string';

// On Windows, tfjs-node requires its native dependency directory in PATH to find tensorflow.dll
const dllDir = path.resolve(__dirname, '..', '..', 'node_modules', '@tensorflow', 'tfjs-node', 'deps', 'lib');
if (process.platform === 'win32' && !process.env.PATH.includes(dllDir)) {
  process.env.PATH = dllDir + ';' + process.env.PATH;
}

const MODELS_PATH     = process.env.FACE_MODELS_PATH || path.join(__dirname, '..', '..', 'node_modules', '@vladmandic', 'face-api', 'model');
const MATCH_THRESHOLD = parseFloat(process.env.FACE_MATCH_THRESHOLD || '0.58');

let faceapi = null;
let tf = null;
let modelsLoaded = false;
let initFailed   = false;

async function initEngine() {
  if (faceapi || initFailed) return;
  try {
    tf = require('@tensorflow/tfjs-node');
    faceapi = require('@vladmandic/face-api');
    console.log('[FaceEngine] face-api and tfjs-node loaded successfully');
  } catch (e) {
    console.warn('[FaceEngine] face-api unavailable:', e.message);
    initFailed = true;
  }
}

async function loadModels() {
  await initEngine();
  if (!faceapi || modelsLoaded) return;
  try {
    await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODELS_PATH);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(MODELS_PATH);
    await faceapi.nets.faceRecognitionNet.loadFromDisk(MODELS_PATH);
    modelsLoaded = true;
    console.log('[FaceEngine] Models loaded from', MODELS_PATH);
  } catch (e) {
    console.warn('[FaceEngine] Model load failed:', e.message);
  }
}

/**
 * Compute a 128-d descriptor from an image Buffer using native tfjs image decoder.
 * Returns null if face-api is unavailable or no face is detected.
 */
async function computeDescriptor(imageBuffer) {
  if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) return null;
  await loadModels();
  if (!faceapi || !modelsLoaded || !tf) return null;

  let tensor = null;
  try {
    tensor = tf.node.decodeImage(imageBuffer, 3);
    const detection = await faceapi
      .detectSingleFace(tensor, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.45 }))
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) return null;
    return Array.from(detection.descriptor);
  } catch (err) {
    console.warn('[FaceEngine] Detection error:', err.message);
    return null;
  } finally {
    if (tensor) {
      try { tensor.dispose(); } catch (_) {}
    }
  }
}

function euclideanDistance(d1, d2) {
  let sum = 0;
  for (let i = 0; i < d1.length; i++) sum += (d1[i] - d2[i]) ** 2;
  return Math.sqrt(sum);
}

function matchDescriptors(live, enrolled) {
  if (!Array.isArray(live) || !Array.isArray(enrolled) || live.length !== enrolled.length || live.length === 0) {
    return { match: false, distance: Number.POSITIVE_INFINITY };
  }
  const distance = euclideanDistance(live, enrolled);
  return { match: distance <= MATCH_THRESHOLD, distance };
}

module.exports = { loadModels, computeDescriptor, matchDescriptors, euclideanDistance };
