const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { PrismaClient } = require('@prisma/client');
const prisma  = new PrismaClient();
const { computeDescriptor, matchDescriptors } = require('../services/faceEngine.service');
const multer  = require('multer');

const tmpUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }).single('photo');

// POST /api/v1/gate/scan  � security guard scans a student (PRN + live photo)
router.post('/scan', auth, requireRole('security', 'admin'), (req, res) => {
  tmpUpload(req, res, async (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message });

    const { prn } = req.body;
    if (!prn) return res.status(400).json({ success: false, message: 'PRN is required' });

    const student = await prisma.studentProfile.findUnique({ where: { prn }, include: { user: true } });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const enrolled = await prisma.enrollmentPhoto.findFirst({
      where: { userId: student.userId, descriptor: { not: null } },
      orderBy: { createdAt: 'desc' },
    });
    let faceResult = null;
    let denialReason = null;
    if (!req.file) denialReason = 'A live face photo is required for gate verification.';
    else if (!enrolled) denialReason = 'No enrolled face is available for this student.';
    else {
      const liveDescriptor = await computeDescriptor(req.file.buffer).catch(() => null);
      if (!liveDescriptor) denialReason = 'No face was detected in the live scan.';
      else faceResult = matchDescriptors(liveDescriptor, JSON.parse(enrolled.descriptor));
    }

    const granted = Boolean(faceResult?.match && student.user.status === 'ACTIVE');
    if (faceResult && !granted && student.user.status !== 'ACTIVE') denialReason = 'Student account is not active.';
    if (faceResult && !faceResult.match) denialReason = 'Live face does not match the enrolled profile.';

    // Record access log
    await prisma.accessLog.create({
      data: {
        userId:   student.userId,
        grantedBy: req.user.userId,
        method:   'FACE',
        granted,
        ip:       req.ip,
        metadata: JSON.stringify({
          reason: denialReason,
          distance: faceResult ? faceResult.distance.toFixed(4) : null,
        }),
      },
    });

    res.json({
      success: true,
      granted,
      message: denialReason || 'Face verified. Access granted.',
      student: {
        id: student.userId,
        prn,
        name: student.name,
        email: student.user.email,
        photoUrl: student.photoUrl || enrolled?.filePath,
        status: student.user.status,
        gateStatus: granted ? 'Allowed' : 'Denied',
      },
      faceResult,
    });
  });
});

// GET /api/v1/gate/logs  � recent gate activity
router.get('/logs', auth, requireRole('security', 'admin'), async (req, res) => {
  const logs = await prisma.accessLog.findMany({
    include: { user: { include: { studentProfile: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  res.json({ success: true, logs });
});

module.exports = router;
