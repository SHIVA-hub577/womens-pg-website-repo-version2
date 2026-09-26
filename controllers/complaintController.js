const Complaint = require('../models/Complaint');
const Room = require('../models/Room');
const Tenant = require('../models/Tenant');
const Worker = require('../models/Worker');
const { sendEmail } = require('../services/emailservices');

// Helper to look up recipient email for a tenant
const getTenantEmailForComplaint = async (tenantId) => {
  let recipientEmail = null;
  const tenantDoc = await Tenant.findOne({ tenantId });
  if (tenantDoc && tenantDoc.email) {
    recipientEmail = tenantDoc.email.trim().toLowerCase();
  } else {
    const roomMatch = await Room.findOne({ 'tenants.tenantId': tenantId });
    if (roomMatch && roomMatch.tenants) {
      const embedded = roomMatch.tenants.find(t => t.tenantId === tenantId);
      if (embedded && embedded.email) {
        recipientEmail = embedded.email.trim().toLowerCase();
      }
    }
  }
  return recipientEmail;
};

// ==========================================
// TENANT COMPLAINT HANDLERS
// ==========================================

// Tenant: Render Complaints View (GET /tenant/complaints)
const getTenantComplaints = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) {
      return res.redirect('/login');
    }

    let tenantId = user.tenantId;
    let roomNumber = user.roomNumber;

    if (!roomNumber && user.email) {
      const roomMatch = await Room.findOne({ 'tenants.email': user.email });
      if (roomMatch) {
        roomNumber = roomMatch.roomNumber;
        const embedded = roomMatch.tenants.find(t => t.email === user.email);
        if (embedded) {
          tenantId = embedded.tenantId;
        }
        user.roomNumber = roomNumber;
        user.tenantId = tenantId;
      }
    }

    const hasAssignedRoom = Boolean(roomNumber && tenantId);
    let raisedComplaints = [];
    let resolvedComplaints = [];

    if (tenantId) {
      const allComplaints = await Complaint.find({ tenantId }).sort({ raisedAt: -1 });
      raisedComplaints = allComplaints.filter(c => c.status !== 'Resolved');
      resolvedComplaints = allComplaints.filter(c => c.status === 'Resolved');
    }

    res.render('tenant/complaints', {
      user,
      hasAssignedRoom,
      roomNumber,
      raisedComplaints,
      resolvedComplaints,
      error: req.query.error || null,
      success: req.query.success || null,
      activePage: 'complaints'
    });
  } catch (error) {
    console.error('Error in getTenantComplaints:', error);
    res.status(500).send('Server Error loading complaints page');
  }
};

// Tenant: Create New Complaint (POST /tenant/complaints)
const createTenantComplaint = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) {
      return res.redirect('/login');
    }

    let tenantId = user.tenantId;
    let roomNumber = user.roomNumber;

    if ((!roomNumber || !tenantId) && user.email) {
      const roomMatch = await Room.findOne({ 'tenants.email': user.email });
      if (roomMatch) {
        roomNumber = roomMatch.roomNumber;
        const embedded = roomMatch.tenants.find(t => t.email === user.email);
        if (embedded) tenantId = embedded.tenantId;
      }
    }

    if (!roomNumber || !tenantId) {
      return res.redirect('/tenant/complaints?error=You cannot raise a complaint without an assigned room.');
    }

    const { description } = req.body;
    if (!description || !description.trim()) {
      return res.redirect('/tenant/complaints?error=Complaint description is required.');
    }

    let photo = null;
    if (req.file) {
      photo = '/uploads/complaints/' + req.file.filename;
    }

    const newComplaint = await Complaint.create({
      tenantId,
      roomNumber,
      description: description.trim(),
      photo,
      status: 'Raised'
    });

    // Send Automatic Email Notification to BOTH Admin and Worker(s)
    const adminEmails = process.env.ADMIN_EMAILS || process.env.GOOGLEUSER;
    const workers = await Worker.find();
    const workerEmails = workers.map(w => w.email).filter(Boolean);
    const recipientList = Array.from(new Set([
      ...(adminEmails ? adminEmails.split(',').map(e => e.trim()) : []),
      ...workerEmails
    ])).filter(Boolean).join(', ');

    if (recipientList) {
      const tenantName = user.name || user.username || 'Resident';
      const tenantEmail = user.email || 'N/A';
      const subject = `🚨 New Complaint Raised - Room ${roomNumber} (${tenantName})`;
      const text = `A new complaint has been filed by ${tenantName} (Room ${roomNumber}, ID: ${tenantId}).\n\nDescription: ${description.trim()}`;

      const attachments = [];
      let imageHtml = '<p style="color: #777; font-style: italic;">No photo attached with this complaint.</p>';

      if (req.file) {
        attachments.push({
          filename: req.file.filename,
          path: req.file.path,
          cid: 'complaint_photo'
        });
        imageHtml = `
          <div style="margin-top: 15px;">
            <p style="font-weight: bold; margin-bottom: 5px; color: #333;">Attached Complaint Photo:</p>
            <img src="cid:complaint_photo" alt="Complaint Photo" style="max-width: 100%; max-height: 400px; border-radius: 8px; border: 1px solid #ddd;" />
          </div>
        `;
      }

      const html = `
        <div style="font-family: system-ui, -apple-system, sans-serif; padding: 20px; color: #333; max-width: 600px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #fafafa;">
          <h2 style="color: #d9534f; margin-top: 0;">🚨 New Tenant Complaint Raised</h2>
          <p>A new maintenance complaint has been submitted in the portal:</p>
          
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px; background: #ffffff; border: 1px solid #eee; border-radius: 6px;">
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; width: 40%;">Resident Name:</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${tenantName}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Resident Email:</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${tenantEmail}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Tenant ID:</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${tenantId}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Room Number:</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">Room ${roomNumber}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Date Raised:</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${new Date().toLocaleString()}</td>
            </tr>
          </table>

          <div style="margin-top: 15px; padding: 15px; background: #ffffff; border-radius: 6px; border: 1px solid #fecaca;">
            <p style="margin: 0; font-weight: bold; color: #555;">Complaint Description:</p>
            <p style="margin: 8px 0 0 0; font-size: 15px; line-height: 1.5;">${description.trim()}</p>
          </div>

          ${imageHtml}

          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #888; margin: 0; text-align: center;">
            Pujyasritha's Living Management System Notification
          </p>
        </div>
      `;

      try {
        await sendEmail(recipientList, subject, text, html, attachments);
        console.log(`📧 Complaint alert email successfully sent to admin & workers (${recipientList})`);
      } catch (emailErr) {
        console.warn('⚠️ Could not send complaint alert email:', emailErr.message);
      }
    }

    return res.redirect('/tenant/complaints?success=Complaint submitted successfully!');
  } catch (error) {
    console.error('Error in createTenantComplaint:', error);
    return res.redirect('/tenant/complaints?error=Failed to submit complaint. Please try again.');
  }
};

// ==========================================
// ADMIN COMPLAINT HANDLERS
// ==========================================

// Admin: Render Complaints Overview (GET /admin/complaints)
const getAdminComplaints = async (req, res) => {
  try {
    const rawComplaints = await Complaint.find().sort({ raisedAt: -1 });
    const workers = await Worker.find().sort({ name: 1 });

    const complaintsList = await Promise.all(
      rawComplaints.map(async (c) => {
        let tenantName = 'Resident';
        let tenantPhone = 'N/A';
        let tenantEmail = 'N/A';

        const roomMatch = await Room.findOne({ 'tenants.tenantId': c.tenantId });
        if (roomMatch && roomMatch.tenants) {
          const embedded = roomMatch.tenants.find(t => t.tenantId === c.tenantId);
          if (embedded) {
            tenantName = embedded.name || tenantName;
            tenantPhone = embedded.phone || tenantPhone;
            tenantEmail = embedded.email || tenantEmail;
          }
        }

        if (tenantName === 'Resident') {
          const tDoc = await Tenant.findOne({ tenantId: c.tenantId });
          if (tDoc) {
            tenantName = tDoc.name || tDoc.username || tenantName;
            tenantPhone = tDoc.phone || tenantPhone;
            tenantEmail = tDoc.email || tenantEmail;
          }
        }

        return {
          id: c._id,
          tenantId: c.tenantId,
          roomNumber: c.roomNumber,
          description: c.description,
          photo: c.photo,
          status: c.status,
          assignedWorker: c.assignedWorker,
          assignedWorkerName: c.assignedWorkerName,
          assignedWorkerEmail: c.assignedWorkerEmail,
          updates: c.updates || [],
          resolutionNote: c.resolutionNote,
          resolutionPhoto: c.resolutionPhoto,
          resolvedByRole: c.resolvedByRole,
          resolvedByName: c.resolvedByName,
          raisedAt: c.raisedAt,
          resolvedAt: c.resolvedAt,
          tenantName,
          tenantPhone,
          tenantEmail
        };
      })
    );

    res.render('admin/complaints', {
      complaints: complaintsList,
      workers,
      error: req.query.error || null,
      success: req.query.success || null,
      activePage: 'complaints'
    });
  } catch (error) {
    console.error('Error in getAdminComplaints:', error);
    res.status(500).send('Server Error loading admin complaints page');
  }
};

// Admin: Assign Worker to Complaint (POST /admin/complaints/:id/assign)
const assignWorkerToComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const { workerId } = req.body;

    if (!workerId) {
      return res.redirect('/admin/complaints?error=Please select a worker to assign.');
    }

    const complaint = await Complaint.findById(id);
    if (!complaint) {
      return res.redirect('/admin/complaints?error=Complaint not found.');
    }

    const worker = await Worker.findById(workerId);
    if (!worker) {
      return res.redirect('/admin/complaints?error=Selected worker does not exist.');
    }

    complaint.assignedWorker = worker._id;
    complaint.assignedWorkerName = worker.name;
    complaint.assignedWorkerEmail = worker.email;
    if (complaint.status === 'Raised') {
      complaint.status = 'In Progress';
    }

    await complaint.save();

    // Notify assigned worker via email
    try {
      const subject = `🔧 Complaint Assigned: Room ${complaint.roomNumber}`;
      const text = `Hello ${worker.name},\n\nYou have been assigned to handle a maintenance complaint for Room ${complaint.roomNumber}.\n\nDescription: ${complaint.description}\n\nPlease check your Worker Portal to update progress.`;
      const html = `
        <div style="font-family: system-ui, -apple-system, sans-serif; padding: 20px; color: #2F2F2F;">
          <h2 style="color: #6C63FF;">Pujyasritha's Living — Worker Assignment</h2>
          <p>Hello <strong>${worker.name}</strong>,</p>
          <p>You have been assigned to handle a maintenance complaint:</p>
          <div style="background: #F5F6FA; padding: 15px; border: 1px solid #e2e8f0; border-radius: 8px; margin: 15px 0;">
            <p><strong>Room Number:</strong> Room ${complaint.roomNumber}</p>
            <p><strong>Tenant ID:</strong> ${complaint.tenantId}</p>
            <p><strong>Description:</strong> ${complaint.description}</p>
          </div>
          <p>Log into your Worker Portal to post progress updates and upload resolution proof once completed.</p>
        </div>
      `;
      await sendEmail(worker.email, subject, text, html);
    } catch (mailErr) {
      console.warn('⚠️ Could not send assignment email to worker:', mailErr.message);
    }

    return res.redirect('/admin/complaints?success=Worker assigned successfully!');
  } catch (error) {
    console.error('Error in assignWorkerToComplaint:', error);
    return res.redirect('/admin/complaints?error=Failed to assign worker.');
  }
};

// Admin: Add Update Message to Complaint (POST /admin/complaints/:id/update)
const addAdminComplaintUpdate = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.redirect('/admin/complaints?error=Update message cannot be empty.');
    }

    const complaint = await Complaint.findById(id);
    if (!complaint) {
      return res.redirect('/admin/complaints?error=Complaint not found.');
    }

    let photo = null;
    if (req.file) {
      photo = '/uploads/complaints/' + req.file.filename;
    }

    const adminUser = req.session.user;
    const authorName = (adminUser && (adminUser.name || adminUser.username)) ? adminUser.name || adminUser.username : 'Admin';

    if (!complaint.updates) complaint.updates = [];
    complaint.updates.push({
      authorRole: 'admin',
      authorName,
      message: message.trim(),
      photo,
      createdAt: new Date()
    });

    if (complaint.status === 'Raised') {
      complaint.status = 'In Progress';
    }

    await complaint.save();
    return res.redirect('/admin/complaints?success=Progress update posted successfully!');
  } catch (error) {
    console.error('Error in addAdminComplaintUpdate:', error);
    return res.redirect('/admin/complaints?error=Failed to add update.');
  }
};

// Admin: Resolve Complaint (POST /admin/complaints/:id/resolve)
const resolveAdminComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolutionNote } = req.body;

    if (!resolutionNote || !resolutionNote.trim()) {
      return res.redirect('/admin/complaints?error=Resolution description note is required.');
    }

    let resolutionPhoto = null;
    if (req.file) {
      resolutionPhoto = '/uploads/complaints/' + req.file.filename;
    }

    const adminUser = req.session.user;
    const adminName = (adminUser && (adminUser.name || adminUser.username)) ? adminUser.name || adminUser.username : 'Admin Management';

    // Atomic update to ensure idempotency & prevent double-resolving
    const complaint = await Complaint.findOneAndUpdate(
      { _id: id, status: { $ne: 'Resolved' } },
      {
        $set: {
          status: 'Resolved',
          resolutionNote: resolutionNote.trim(),
          ...(resolutionPhoto ? { resolutionPhoto } : {}),
          resolvedByRole: 'admin',
          resolvedByName: adminName,
          resolvedAt: new Date()
        }
      },
      { new: true }
    );

    if (!complaint) {
      const existing = await Complaint.findById(id);
      if (!existing) {
        return res.redirect('/admin/complaints?error=Complaint record not found.');
      }
      if (existing.status === 'Resolved') {
        return res.redirect('/admin/complaints?error=This complaint has already been resolved.');
      }
      return res.redirect('/admin/complaints?error=Failed to resolve complaint.');
    }

    // 1. Notify Tenant
    const recipientEmail = await getTenantEmailForComplaint(complaint.tenantId);
    if (recipientEmail) {
      try {
        const subject = `Your Complaint for Room ${complaint.roomNumber} Has Been Resolved`;
        const text = `Hello, your complaint regarding Room ${complaint.roomNumber} has been resolved by PG management.\n\nResolution Note:\n${complaint.resolutionNote}\n\nThank you!`;
        const html = `
          <div style="font-family: system-ui, -apple-system, sans-serif; padding: 20px; color: #2F2F2F;">
            <h2 style="color: #6C63FF;">Pujyasritha's Living</h2>
            <p>Hello,</p>
            <p>Your raised complaint for <strong>Room ${complaint.roomNumber}</strong> has been marked as <span style="color: #22C55E; font-weight: bold;">Resolved</span> by Admin.</p>
            <div style="background: #F5F6FA; border: 1px solid #e2e8f0; padding: 15px; margin: 15px 0; border-radius: 8px;">
              <strong>Management Resolution Note:</strong>
              <p style="margin-top: 5px; color: #4A5568;">${complaint.resolutionNote}</p>
            </div>
            <p style="font-size: 0.9rem; color: #6C757D;">You can view the resolution details and photo evidence in your Resident Portal.</p>
          </div>
        `;
        await sendEmail(recipientEmail, subject, text, html);
      } catch (mailErr) {
        console.warn(`⚠️ Could not send resolution email to tenant ${recipientEmail}:`, mailErr.message);
      }
    }

    // 2. Notify Assigned Worker if present
    if (complaint.assignedWorkerEmail) {
      try {
        const subject = `Complaint for Room ${complaint.roomNumber} Resolved by Admin`;
        const text = `Hello, complaint for Room ${complaint.roomNumber} assigned to you has been marked as resolved by Admin.`;
        const html = `<p>The complaint for <strong>Room ${complaint.roomNumber}</strong> has been officially marked as resolved by Admin.</p>`;
        await sendEmail(complaint.assignedWorkerEmail, subject, text, html);
      } catch (workerMailErr) {
        console.warn(`⚠️ Could not send resolution notice to worker:`, workerMailErr.message);
      }
    }

    return res.redirect('/admin/complaints?success=Complaint marked as Resolved successfully!');
  } catch (error) {
    console.error('Error in resolveAdminComplaint:', error);
    return res.redirect('/admin/complaints?error=Failed to resolve complaint.');
  }
};

// ==========================================
// WORKER COMPLAINT HANDLERS
// ==========================================

// Worker: Render Assigned Complaints (GET /worker/complaints)
const getWorkerComplaints = async (req, res) => {
  try {
    const worker = req.session.user;
    if (!worker || worker.role !== 'worker') {
      return res.redirect('/worker/login');
    }

    const mongoose = require('mongoose');
    const workerObjectId = mongoose.Types.ObjectId.isValid(worker.id)
      ? new mongoose.Types.ObjectId(worker.id)
      : null;

    // Assignment & Access Control:
    // If no worker is assigned (assignedWorker is null), any worker can access it.
    // If a worker is assigned by admin, ONLY that specific worker can access it.
    const rawComplaints = await Complaint.find({
      $or: [
        { assignedWorker: null },
        { assignedWorker: worker.id },
        ...(workerObjectId ? [{ assignedWorker: workerObjectId }] : [])
      ]
    }).sort({ raisedAt: -1 });

    const complaintsList = await Promise.all(
      rawComplaints.map(async (c) => {
        let tenantName = 'Resident';
        let tenantPhone = 'N/A';
        let tenantEmail = 'N/A';

        const roomMatch = await Room.findOne({ 'tenants.tenantId': c.tenantId });
        if (roomMatch && roomMatch.tenants) {
          const embedded = roomMatch.tenants.find(t => t.tenantId === c.tenantId);
          if (embedded) {
            tenantName = embedded.name || tenantName;
            tenantPhone = embedded.phone || tenantPhone;
            tenantEmail = embedded.email || tenantEmail;
          }
        }

        if (tenantName === 'Resident') {
          const tDoc = await Tenant.findOne({ tenantId: c.tenantId });
          if (tDoc) {
            tenantName = tDoc.name || tDoc.username || tenantName;
            tenantPhone = tDoc.phone || tenantPhone;
            tenantEmail = tDoc.email || tenantEmail;
          }
        }

        return {
          id: c._id,
          tenantId: c.tenantId,
          roomNumber: c.roomNumber,
          description: c.description,
          photo: c.photo,
          status: c.status,
          assignedWorker: c.assignedWorker,
          assignedWorkerName: c.assignedWorkerName,
          updates: c.updates || [],
          resolutionNote: c.resolutionNote,
          resolutionPhoto: c.resolutionPhoto,
          resolvedByRole: c.resolvedByRole,
          resolvedByName: c.resolvedByName,
          raisedAt: c.raisedAt,
          resolvedAt: c.resolvedAt,
          tenantName,
          tenantPhone,
          tenantEmail
        };
      })
    );

    res.render('worker/complaints', {
      user: worker,
      complaints: complaintsList,
      error: req.query.error || null,
      success: req.query.success || null,
      activePage: 'complaints'
    });
  } catch (error) {
    console.error('Error in getWorkerComplaints:', error);
    res.status(500).send('Server Error loading worker portal complaints');
  }
};

// Worker: Mark Complaint as Resolved (POST /worker/complaints/:id/resolve)
const resolveWorkerComplaint = async (req, res) => {
  try {
    const worker = req.session.user;
    if (!worker || worker.role !== 'worker') {
      return res.redirect('/worker/login');
    }

    const { id } = req.params;
    const { resolutionNote } = req.body;

    if (!resolutionNote || !resolutionNote.trim()) {
      return res.redirect('/worker/complaints?error=Resolution note is required.');
    }

    let resolutionPhoto = null;
    if (req.file) {
      resolutionPhoto = '/uploads/complaints/' + req.file.filename;
    }

    const workerName = worker.name || worker.username || 'Worker';

    // Idempotency & Access Control Enforcement:
    // 1. Complaint must NOT be already Resolved ($ne: 'Resolved')
    // 2. Complaint must either be unassigned (assignedWorker: null) OR explicitly assigned to this worker
    const mongoose = require('mongoose');
    const workerObjectId = mongoose.Types.ObjectId.isValid(worker.id)
      ? new mongoose.Types.ObjectId(worker.id)
      : null;

    const updatedComplaint = await Complaint.findOneAndUpdate(
      {
        _id: id,
        status: { $ne: 'Resolved' },
        $or: [
          { assignedWorker: null },
          { assignedWorker: worker.id },
          ...(workerObjectId ? [{ assignedWorker: workerObjectId }] : [])
        ]
      },
      {
        $set: {
          status: 'Resolved',
          assignedWorker: worker.id,
          assignedWorkerName: workerName,
          assignedWorkerEmail: worker.email,
          resolutionNote: resolutionNote.trim(),
          ...(resolutionPhoto ? { resolutionPhoto } : {}),
          resolvedByRole: 'worker',
          resolvedByName: workerName,
          resolvedAt: new Date()
        }
      },
      { new: true }
    );

    if (!updatedComplaint) {
      const existing = await Complaint.findById(id);
      if (!existing) {
        return res.redirect('/worker/complaints?error=Complaint not found.');
      }
      if (existing.status === 'Resolved') {
        return res.redirect('/worker/complaints?error=This complaint has already been resolved.');
      }
      if (existing.assignedWorker && existing.assignedWorker.toString() !== worker.id.toString()) {
        return res.redirect('/worker/complaints?error=Access denied. This complaint is assigned to another worker.');
      }
      return res.redirect('/worker/complaints?error=Failed to resolve complaint. Please try again.');
    }

    // Send notifications to Tenant and Admin
    const recipientEmail = await getTenantEmailForComplaint(updatedComplaint.tenantId);
    if (recipientEmail) {
      try {
        const subject = `Your Complaint for Room ${updatedComplaint.roomNumber} Has Been Resolved by Worker`;
        const text = `Hello, your complaint regarding Room ${updatedComplaint.roomNumber} has been resolved by maintenance worker ${workerName}.\n\nResolution Note:\n${updatedComplaint.resolutionNote}\n\nThank you!`;
        const html = `
          <div style="font-family: system-ui, -apple-system, sans-serif; padding: 20px; color: #2F2F2F;">
            <h2 style="color: #6C63FF;">Pujyasritha's Living</h2>
            <p>Hello,</p>
            <p>Your maintenance complaint for <strong>Room ${updatedComplaint.roomNumber}</strong> has been marked as <span style="color: #22C55E; font-weight: bold;">Resolved</span> by Worker (${workerName}).</p>
            <div style="background: #F5F6FA; border: 1px solid #e2e8f0; padding: 15px; margin: 15px 0; border-radius: 8px;">
              <strong>Worker Resolution Note:</strong>
              <p style="margin-top: 5px; color: #4A5568;">${updatedComplaint.resolutionNote}</p>
            </div>
            <p style="font-size: 0.9rem; color: #6C757D;">You can view resolution proof and photo evidence in your Resident Portal.</p>
          </div>
        `;
        await sendEmail(recipientEmail, subject, text, html);
      } catch (tenantMailErr) {
        console.warn('⚠️ Could not send resolution email to tenant:', tenantMailErr.message);
      }
    }

    const adminEmails = process.env.ADMIN_EMAILS || process.env.GOOGLEUSER;
    if (adminEmails) {
      try {
        const subject = `✅ Complaint Resolved by Worker (${workerName}) — Room ${updatedComplaint.roomNumber}`;
        const text = `Worker ${workerName} has resolved the complaint for Room ${updatedComplaint.roomNumber}.\n\nResolution Note:\n${updatedComplaint.resolutionNote}`;
        const html = `
          <div style="font-family: system-ui, -apple-system, sans-serif; padding: 20px; color: #2F2F2F;">
            <h2 style="color: #22C55E;">✅ Complaint Marked as Resolved</h2>
            <p>Worker <strong>${workerName}</strong> has resolved the maintenance complaint for <strong>Room ${updatedComplaint.roomNumber}</strong> (Tenant ID: ${updatedComplaint.tenantId}).</p>
            <div style="background: #F5F6FA; border: 1px solid #e2e8f0; padding: 15px; margin: 15px 0; border-radius: 8px;">
              <strong>Worker Resolution Note:</strong>
              <p style="margin-top: 5px;">${updatedComplaint.resolutionNote}</p>
            </div>
            <p style="font-size: 0.85rem; color: #6C757D;">Timestamp: ${new Date().toLocaleString('en-IN')}</p>
          </div>
        `;
        await sendEmail(adminEmails, subject, text, html);
      } catch (adminMailErr) {
        console.warn('⚠️ Could not send resolution email to admin:', adminMailErr.message);
      }
    }

    return res.redirect('/worker/complaints?success=Complaint marked as Resolved successfully!');
  } catch (error) {
    console.error('Error in resolveWorkerComplaint:', error);
    return res.redirect('/worker/complaints?error=Failed to resolve complaint.');
  }
};

module.exports = {
  getTenantComplaints,
  createTenantComplaint,
  getAdminComplaints,
  assignWorkerToComplaint,
  addAdminComplaintUpdate,
  resolveAdminComplaint,
  getWorkerComplaints,
  resolveWorkerComplaint
};
