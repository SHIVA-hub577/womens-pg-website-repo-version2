const express = require('express');
const router = express.Router();
const reminderController = require('../controllers/reminderController');

// POST /api/send-rent-reminders
router.post('/api/send-rent-reminders', reminderController.sendRentReminders);

module.exports = router;
