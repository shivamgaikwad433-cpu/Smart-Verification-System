const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { z } = require('zod');

const nameSchema = z.object({ name: z.string().min(2) });

// GET  /api/v1/departments  – anyone authenticated
router.get('/', auth, async (req, res) => {
  const depts = await prisma.department.findMany({ orderBy: { name: 'asc' } });
  res.json({ success: true, departments: depts });
});

// POST /api/v1/departments  – admin only
router.post('/', auth, requireRole('admin'), async (req, res) => {
  const p = nameSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ success: false, errors: p.error.format() });
  const dept = await prisma.department.create({ data: { name: p.data.name } });
  res.status(201).json({ success: true, department: dept });
});

// PUT  /api/v1/departments/:id  – admin only
router.put('/:id', auth, requireRole('admin'), async (req, res) => {
  const p = nameSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ success: false, errors: p.error.format() });
  const dept = await prisma.department.update({ where: { id: parseInt(req.params.id) }, data: { name: p.data.name } });
  res.json({ success: true, department: dept });
});

// DELETE /api/v1/departments/:id  – admin only
router.delete('/:id', auth, requireRole('admin'), async (req, res) => {
  await prisma.department.delete({ where: { id: parseInt(req.params.id) } });
  res.json({ success: true, message: 'Department deleted' });
});

module.exports = router;
