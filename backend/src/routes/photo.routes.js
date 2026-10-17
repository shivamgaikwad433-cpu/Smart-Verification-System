const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/photo.controller');
const auth    = require('../middleware/authMiddleware');

// POST /api/v1/photos/enroll  – multipart, handled inside controller
router.post('/enroll', auth, ctrl.uploadEnrollment);
// GET  /api/v1/photos
router.get('/',        auth, ctrl.listPhotos);
// DELETE /api/v1/photos/:id
router.delete('/:id',  auth, ctrl.deletePhoto);

module.exports = router;
