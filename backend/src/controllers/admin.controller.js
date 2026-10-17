const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');
const { z } = require('zod');

// GET /admin/users
async function listUsers(req, res) {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, role: true, status: true, isVerified: true, createdAt: true, studentProfile: true, staffProfile: true, department: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, users });
}

// PATCH /admin/users/:id/status
async function updateUserStatus(req, res) {
  const p = z.object({ status: z.enum(['ACTIVE', 'SUSPENDED', 'INACTIVE']) }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ success: false, errors: p.error.format() });
  const user = await prisma.user.update({ where: { id: parseInt(req.params.id) }, data: { status: p.data.status } });
  await prisma.auditLog.create({ data: { actorId: req.user.userId, action: 'STATUS_CHANGE', entity: 'User', entityId: user.id, metadata: JSON.stringify({ status: p.data.status }) } });
  res.json({ success: true, message: `User status set to ${p.data.status}` });
}

// PATCH /admin/users/:id/role
async function updateUserRole(req, res) {
  const p = z.object({ role: z.enum(['student', 'faculty', 'admin', 'security']) }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ success: false, errors: p.error.format() });
  const user = await prisma.user.update({ where: { id: parseInt(req.params.id) }, data: { role: p.data.role } });
  await prisma.auditLog.create({ data: { actorId: req.user.userId, action: 'ROLE_CHANGE', entity: 'User', entityId: user.id, metadata: JSON.stringify({ role: p.data.role }) } });
  res.json({ success: true, message: `Role updated to ${p.data.role}` });
}

// DELETE /admin/users/:id
async function deleteUser(req, res) {
  const id = parseInt(req.params.id);
  await prisma.user.delete({ where: { id } });
  await prisma.auditLog.create({ data: { actorId: req.user.userId, action: 'USER_DELETE', entity: 'User', entityId: id } });
  res.json({ success: true, message: 'User deleted' });
}

// GET /admin/audit-logs
async function getAuditLogs(req, res) {
  const logs = await prisma.auditLog.findMany({
    include: { actor: { select: { email: true, role: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  res.json({ success: true, logs });
}

// GET /admin/access-logs
async function getAccessLogs(req, res) {
  const logs = await prisma.accessLog.findMany({
    include: { user: { select: { email: true, role: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  res.json({ success: true, logs });
}

// GET /admin/verification-requests
async function getPendingRequests(req, res) {
  const requests = await prisma.verificationRequest.findMany({
    where: { status: 'PENDING' },
    include: { user: { select: { email: true, studentProfile: true, staffProfile: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, requests });
}

// PATCH /admin/verification-requests/:id
async function reviewRequest(req, res) {
  const p = z.object({ status: z.enum(['APPROVED', 'REJECTED']), remarks: z.string().optional() }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ success: false, errors: p.error.format() });
  const updated = await prisma.verificationRequest.update({
    where: { id: parseInt(req.params.id) },
    data: { status: p.data.status, remarks: p.data.remarks, reviewedBy: req.user.userId, reviewedAt: new Date() },
  });
  res.json({ success: true, request: updated });
}

// GET /admin/stats
async function getStats(req, res) {
  const [users, photos, requests, logs] = await Promise.all([
    prisma.user.count(),
    prisma.enrollmentPhoto.count(),
    prisma.verificationRequest.count(),
    prisma.accessLog.count(),
  ]);
  const pending = await prisma.verificationRequest.count({ where: { status: 'PENDING' } });
  res.json({ success: true, stats: { users, photos, requests, pending, accessLogs: logs } });
}

module.exports = { listUsers, updateUserStatus, updateUserRole, deleteUser, getAuditLogs, getAccessLogs, getPendingRequests, reviewRequest, getStats };
