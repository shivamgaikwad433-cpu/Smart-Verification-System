const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/verification.controller');
const auth    = require('../middleware/authMiddleware');

// POST /api/v1/verification/request
router.post('/request',      auth, ctrl.createRequest);
// GET  /api/v1/verification/requests
router.get('/requests',      auth, ctrl.listRequests);
// GET  /api/v1/verification/requests/:id
router.get('/requests/:id',  auth, ctrl.getRequest);
// POST /api/v1/verification/verify-face
router.post('/verify-face',  auth, ctrl.verifyFace);

module.exports = router;
