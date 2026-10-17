const express  = require('express');
const router   = express.Router();
const ctrl     = require('../controllers/user.controller');
const auth     = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// GET  /api/v1/users/me
router.get('/me',            auth, ctrl.getMe);
// GET  /api/v1/users        (admin only)
router.get('/',              auth, requireRole('admin'), ctrl.listUsers);
// PUT  /api/v1/users/:id
router.put('/:id',           auth, ctrl.updateProfile);
// POST /api/v1/users/:id/password
router.post('/:id/password', auth, ctrl.changePassword);

module.exports = router;
