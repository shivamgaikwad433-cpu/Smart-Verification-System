const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');
const { z } = require('zod');

// GET /users/me
async function getMe(req, res) {
  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    include: { studentProfile: true, staffProfile: true, department: true },
  });
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  const { passwordHash, ...safe } = user;
  res.json({ success: true, user: safe });
}

// PUT /users/:id
async function updateProfile(req, res) {
  const targetId = parseInt(req.params.id);
  if (req.user.userId !== targetId && req.user.role !== 'admin')
    return res.status(403).json({ success: false, message: 'Forbidden' });

  const p = z.object({ name: z.string().optional(), phone: z.string().optional(), department: z.string().optional() }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ success: false, errors: p.error.format() });

  const user = await prisma.user.findUnique({ where: { id: targetId }, include: { studentProfile: true, staffProfile: true } });
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  if (p.data.name) {
    if (user.role === 'student') await prisma.studentProfile.update({ where: { userId: targetId }, data: { name: p.data.name } });
    else await prisma.staffProfile.update({ where: { userId: targetId }, data: { name: p.data.name } });
  }
  if (p.data.phone) {
    if (user.role === 'student') await prisma.studentProfile.update({ where: { userId: targetId }, data: { phone: p.data.phone } });
    else await prisma.staffProfile.update({ where: { userId: targetId }, data: { phone: p.data.phone } });
  }

  res.json({ success: true, message: 'Profile updated' });
}

// POST /users/:id/password
async function changePassword(req, res) {
  const targetId = parseInt(req.params.id);
  if (req.user.userId !== targetId)
    return res.status(403).json({ success: false, message: 'Cannot change another user\'s password' });

  const p = z.object({ currentPassword: z.string(), newPassword: z.string().min(6) }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ success: false, errors: p.error.format() });

  const user = await prisma.user.findUnique({ where: { id: targetId } });
  const valid = await bcrypt.compare(p.data.currentPassword, user.passwordHash);
  if (!valid) return res.status(400).json({ success: false, message: 'Current password is incorrect' });

  const newHash = await bcrypt.hash(p.data.newPassword, 10);
  await prisma.user.update({ where: { id: targetId }, data: { passwordHash: newHash } });
  res.json({ success: true, message: 'Password changed' });
}

// GET /users  (admin only – list all)
async function listUsers(req, res) {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, role: true, status: true, isVerified: true, createdAt: true, studentProfile: true, staffProfile: true },
  });
  res.json({ success: true, users });
}

module.exports = { getMe, updateProfile, changePassword, listUsers };
