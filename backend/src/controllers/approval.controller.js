const { PrismaClient } = require('@prisma/client');
const { z } = require('zod');
const prisma = new PrismaClient();
const { getStudentApproverEmail } = require('../services/approvalRouting.service');

async function listStudentApprovals(req, res) {
  const reviewer = await prisma.user.findUnique({ where: { id: req.user.userId }, select: { email: true } });
  const approverEmail = await getStudentApproverEmail();
  if (reviewer?.email.toLowerCase() !== approverEmail) return res.status(403).json({ success: false, message: 'Only the designated HOD can review student registrations.' });
  await prisma.verificationRequest.updateMany({ where: { purpose: 'STUDENT_REGISTRATION', status: 'PENDING', assignedToEmail: null }, data: { assignedToEmail: approverEmail } });
  const requests = await prisma.verificationRequest.findMany({
    where: { purpose: 'STUDENT_REGISTRATION', status: 'PENDING', assignedToEmail: approverEmail },
    include: { user: { include: { studentProfile: true, department: true, enrollmentPhotos: { take: 1, orderBy: { createdAt: 'desc' } } } } },
    orderBy: { createdAt: 'asc' },
  });
  res.json({ success: true, requests });
}

async function reviewStudentApproval(req, res) {
  const parsed = z.object({ status: z.enum(['APPROVED', 'REJECTED']), remarks: z.string().max(500).optional() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: 'Choose approve or reject.' });
  const id = Number.parseInt(req.params.id, 10);
  const request = await prisma.verificationRequest.findUnique({ where: { id }, include: { user: true } });
  if (!request || request.purpose !== 'STUDENT_REGISTRATION') return res.status(404).json({ success: false, message: 'Pending student registration not found.' });
  if (request.status !== 'PENDING') return res.status(409).json({ success: false, message: 'This registration has already been reviewed.' });

  const [reviewer, approverEmail] = await Promise.all([
    prisma.user.findUnique({ where: { id: req.user.userId }, select: { email: true } }),
    getStudentApproverEmail(),
  ]);
  if (reviewer?.email.toLowerCase() !== approverEmail || request.assignedToEmail?.toLowerCase() !== approverEmail) {
    return res.status(403).json({ success: false, message: 'Only the designated HOD can review this student registration.' });
  }

  const status = parsed.data.status;
  const updated = await prisma.$transaction(async (tx) => {
    const reviewed = await tx.verificationRequest.update({ where: { id }, data: { status, remarks: parsed.data.remarks || null, reviewedBy: req.user.userId, reviewedAt: new Date() } });
    await tx.user.update({ where: { id: request.userId }, data: { status: status === 'APPROVED' ? 'ACTIVE' : 'SUSPENDED' } });
    return reviewed;
  });
  res.json({ success: true, request: updated, message: status === 'APPROVED' ? 'Student approved. Gate verification is now enabled.' : 'Student registration rejected.' });
}

module.exports = { listStudentApprovals, reviewStudentApproval };
