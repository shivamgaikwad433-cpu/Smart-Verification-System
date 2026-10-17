const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');
const { computeDescriptor } = require('../services/faceEngine.service');

// Disk storage – uploads/enrollment/
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', '..', 'uploads', 'enrollment');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${req.user.userId}_${Date.now()}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } }).single('photo');

// POST /photos/enroll
async function uploadEnrollment(req, res) {
  upload(req, res, async (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message });
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const filePath = req.file.path;
    const buffer   = fs.readFileSync(filePath);

    let descriptor = null;
    try {
      descriptor = await computeDescriptor(buffer);
    } catch (e) {
      console.warn('[Photo] Face descriptor failed:', e.message);
    }

    const photo = await prisma.enrollmentPhoto.create({
      data: {
        userId:     req.user.userId,
        filePath,
        mime:       req.file.mimetype,
        size:       req.file.size,
        descriptor: descriptor ? JSON.stringify(descriptor) : null,
      },
    });

    res.status(201).json({ success: true, message: 'Photo enrolled', photoId: photo.id, hasFace: !!descriptor });
  });
}

// GET /photos
async function listPhotos(req, res) {
  const photos = await prisma.enrollmentPhoto.findMany({
    where: { userId: req.user.userId },
    select: { id: true, filePath: true, mime: true, size: true, createdAt: true },
  });
  res.json({ success: true, photos });
}

// DELETE /photos/:id
async function deletePhoto(req, res) {
  const id = parseInt(req.params.id);
  const photo = await prisma.enrollmentPhoto.findUnique({ where: { id } });
  if (!photo) return res.status(404).json({ success: false, message: 'Photo not found' });
  if (photo.userId !== req.user.userId && req.user.role !== 'admin')
    return res.status(403).json({ success: false, message: 'Forbidden' });

  try { fs.unlinkSync(photo.filePath); } catch (_) {}
  await prisma.enrollmentPhoto.delete({ where: { id } });
  res.json({ success: true, message: 'Photo deleted' });
}

module.exports = { uploadEnrollment, listPhotos, deletePhoto };
