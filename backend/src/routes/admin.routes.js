const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/admin.controller');
const auth    = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

const adminOnly = [auth, requireRole('admin')];

// Users
router.get('/users',                        ...adminOnly, ctrl.listUsers);
router.patch('/users/:id/status',           ...adminOnly, ctrl.updateUserStatus);
router.patch('/users/:id/role',             ...adminOnly, ctrl.updateUserRole);
router.delete('/users/:id',                 ...adminOnly, ctrl.deleteUser);

// Logs
router.get('/audit-logs',                   ...adminOnly, ctrl.getAuditLogs);
router.get('/access-logs',                  ...adminOnly, ctrl.getAccessLogs);

// Verification requests
router.get('/verification-requests',        ...adminOnly, ctrl.getPendingRequests);
router.patch('/verification-requests/:id',  ...adminOnly, ctrl.reviewRequest);

// Dashboard stats
router.get('/stats',                        ...adminOnly, ctrl.getStats);

module.exports = router;
