const express = require('express');
const router = express.Router();
const { isTenant } = require('../middlewares/authMiddleware');
const dashboardController = require('../controllers/dashboardController');

const upload = require('../middlewares/uploadMiddleware');
const complaintController = require('../controllers/complaintController');

// Guard tenant protected routes with isTenant middleware
router.use('/tenant', isTenant);
router.use('/dashboard', isTenant);

router.get('/dashboard', dashboardController.getTenantProfile);
router.get('/tenant/profile', dashboardController.getTenantProfile);
router.get('/tenant/room', dashboardController.getTenantRoom);
router.get('/tenant/complaints', complaintController.getTenantComplaints);
router.post('/tenant/complaints', upload.single('photo'), complaintController.createTenantComplaint);
router.post('/tenant/pay', dashboardController.payRent);

module.exports = router;
