const express = require('express');
const router = express.Router();
const { isAdmin } = require('../middlewares/authMiddleware');
const dashboardController = require('../controllers/dashboardController');

const upload = require('../middlewares/uploadMiddleware');
const complaintController = require('../controllers/complaintController');

// Guard admin routes with isAdmin middleware
router.use('/admin', isAdmin);

router.get('/admin/dashboard', dashboardController.getAdminDashboard);
router.get('/admin/rooms', dashboardController.getAdminRooms);
router.get('/admin/tenants', dashboardController.getAdminTenants);
router.get('/admin/tenants/new', dashboardController.renderAddTenant);
router.post('/admin/tenants/new', dashboardController.createTenant);
router.get('/admin/complaints', complaintController.getAdminComplaints);
router.post('/admin/complaints/:id/assign', complaintController.assignWorkerToComplaint);
router.post('/admin/complaints/:id/update', upload.single('photo'), complaintController.addAdminComplaintUpdate);
router.post('/admin/complaints/:id/resolve', upload.single('resolutionPhoto'), complaintController.resolveAdminComplaint);
router.get('/admin/remove-tenant', dashboardController.renderRemoveTenant);
router.post('/admin/tenants/:tenantId/request-removal', dashboardController.requestTenantRemoval);
router.get('/admin/remove-tenant/verify', dashboardController.renderVerifyTenantRemoval);
router.post('/admin/remove-tenant/verify', dashboardController.verifyAndExecuteRemoval);

router.get('/admin/payments', dashboardController.getAdminPayments);
router.get('/admin/payments/export', dashboardController.exportPayments);
router.get('/admin/payments/email', dashboardController.emailPaymentsReport);
router.post('/admin/payments/:tenantId/update', dashboardController.updatePaymentStatus);

router.get('/admin/removed-tenants', dashboardController.getRemovedTenants);
router.get('/admin/removed-tenants/email', dashboardController.emailRemovedTenantsReport);

module.exports = router;
