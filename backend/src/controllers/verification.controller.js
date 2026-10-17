const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { z } = require('zod');
const { computeDescriptor, matchDescriptors } = require('../services/faceEngine.service');
const multer = require('multer');
const fs = require('fs');

const tmpUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }).single('photo');

// POST /verification/request  – student submits a gate-entry request
async function createRequest(req, res) {
  const p = z.object({ purpose: z.string().min(3), notes: z.string().optional() }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ success: false, errors: p.error.format() });

  const request = await prisma.verificationRequest.create({
    data: { userId: req.user.userId, purpose: p.data.purpose, notes: p.data.notes || null, status: 'PENDING' },
  });
  res.status(201).json({ success: true, message: 'Request submitted', requestId: request.id });
}

// GET /verification/requests  – list own requests
async function listRequests(req, res) {
  const requests = await prisma.verificationRequest.findMany({
    where: { userId: req.user.userId },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, requests });
}

// GET /verification/requests/:id
async function getRequest(req, res) {
  const id = parseInt(req.params.id);
  const request = await prisma.verificationRequest.findUnique({ where: { id }, include: { documents: true } });
  if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
  if (request.userId !== req.user.userId && !['admin', 'security'].includes(req.user.role))
    return res.status(403).json({ success: false, message: 'Forbidden' });
  res.json({ success: true, request });
}

// POST /verification/verify-face  – compare live photo with enrolled descriptor
async function verifyFace(req, res) {
  tmpUpload(req, res, async (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message });
    if (!req.file) return res.status(400).json({ success: false, message: 'No photo provided' });

    const userId = req.user.userId;
    const enrolled = await prisma.enrollmentPhoto.findFirst({
      where: { userId, descriptor: { not: null } },
      orderBy: { createdAt: 'desc' },
    });
    if (!enrolled) return res.status(400).json({ success: false, message: 'No enrolled face found. Please enroll first.' });

    let liveDescriptor;
    try {
      liveDescriptor = await computeDescriptor(req.file.buffer);
    } catch (e) {
      return res.status(500).json({ success: false, message: 'Face computation failed' });
    }
    if (!liveDescriptor) return res.status(400).json({ success: false, message: 'No face detected in the photo' });

    const enrolledDescriptor = JSON.parse(enrolled.descriptor);
    const { match, distance } = matchDescriptors(liveDescriptor, enrolledDescriptor);

    // Log in AuditLog
    await prisma.auditLog.create({
      data: {
        actorId: userId,
        action:  match ? 'FACE_MATCH' : 'FACE_MISMATCH',
        entity:  'User',
        entityId: userId,
        ip:      req.ip,
        metadata: JSON.stringify({ distance: distance.toFixed(4) }),
      },
    });

    res.json({ success: true, match, distance: distance.toFixed(4) });
  });
}

module.exports = { createRequest, listRequests, getRequest, verifyFace };
