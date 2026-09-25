const express = require('express');
const router = express.Router();
const { isWorker } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');
const complaintController = require('../controllers/complaintController');

// Protect worker routes with isWorker middleware
router.use('/worker', isWorker);

router.get('/worker/complaints', complaintController.getWorkerComplaints);
router.post('/worker/complaints/:id/resolve', upload.single('resolutionPhoto'), complaintController.resolveWorkerComplaint);

module.exports = router;
