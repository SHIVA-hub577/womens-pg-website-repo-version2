const Complaint = require('../models/Complaint');
const Room = require('../models/Room');
const Tenant = require('../models/Tenant');
const { sendEmail } = require('../services/emailservices');

// Tenant: Render Complaints View (GET /tenant/complaints)
const getTenantComplaints = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) {
      return res.redirect('/login');
    }

    let tenantId = user.tenantId;
    let roomNumber = user.roomNumber;

    // Live query on Room to catch any fresh room allotments
    if (!roomNumber && user.email) {
      const roomMatch = await Room.findOne({ 'tenants.email': user.email });
      if (roomMatch) {
        roomNumber = roomMatch.roomNumber;
        const embedded = roomMatch.tenants.find(t => t.email === user.email);
        if (embedded) {
          tenantId = embedded.tenantId;
        }
        // Update session
        user.roomNumber = roomNumber;
        user.tenantId = tenantId;
      }
    }

    const hasAssignedRoom = Boolean(roomNumber && tenantId);

    let raisedComplaints = [];
    let resolvedComplaints = [];

    if (tenantId) {
      const allComplaints = await Complaint.find({ tenantId }).sort({ raisedAt: -1 });
      raisedComplaints = allComplaints.filter(c => c.status === 'Raised');
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

    // Double-check room allocation from DB if missing in session
    if ((!roomNumber || !tenantId) && user.email) {
      const roomMatch = await Room.findOne({ 'tenants.email': user.email });
      if (roomMatch) {
        roomNumber = roomMatch.roomNumber;
        const embedded = roomMatch.tenants.find(t => t.email === user.email);
        if (embedded) tenantId = embedded.tenantId;
      }
    }

    // Unassigned Room Guard: Reject POST if tenant has no room
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

    await Complaint.create({
      tenantId,
      roomNumber,
      description: description.trim(),
      photo,
      status: 'Raised'
    });

    return res.redirect('/tenant/complaints?success=Complaint submitted successfully!');
  } catch (error) {
    console.error('Error in createTenantComplaint:', error);
    return res.redirect('/tenant/complaints?error=Failed to submit complaint. Please try again.');
  }
};

// Admin: Render Complaints Overview (GET /admin/complaints)
const getAdminComplaints = async (req, res) => {
  try {
    const rawComplaints = await Complaint.find().sort({ raisedAt: -1 });

    // Fetch tenant contact details for each complaint
    const complaintsList = await Promise.all(
      rawComplaints.map(async (c) => {
        let tenantName = 'Resident';
        let tenantPhone = 'N/A';
        let tenantEmail = 'N/A';

        // 1. Try finding in Room embedded tenants
        const roomMatch = await Room.findOne({ 'tenants.tenantId': c.tenantId });
        if (roomMatch && roomMatch.tenants) {
          const embedded = roomMatch.tenants.find(t => t.tenantId === c.tenantId);
          if (embedded) {
            tenantName = embedded.name || tenantName;
            tenantPhone = embedded.phone || tenantPhone;
            tenantEmail = embedded.email || tenantEmail;
          }
        }

        // 2. Fallback to Tenant account collection
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
          resolutionNote: c.resolutionNote,
          resolutionPhoto: c.resolutionPhoto,
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
      error: req.query.error || null,
      success: req.query.success || null,
      activePage: 'complaints'
    });
  } catch (error) {
    console.error('Error in getAdminComplaints:', error);
    res.status(500).send('Server Error loading admin complaints page');
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

    const complaint = await Complaint.findById(id);
    if (!complaint) {
      return res.redirect('/admin/complaints?error=Complaint record not found.');
    }

    let resolutionPhoto = null;
    if (req.file) {
      resolutionPhoto = '/uploads/complaints/' + req.file.filename;
    }

    complaint.status = 'Resolved';
    complaint.resolutionNote = resolutionNote.trim();
    if (resolutionPhoto) {
      complaint.resolutionPhoto = resolutionPhoto;
    }
    complaint.resolvedAt = new Date();

    await complaint.save();

    // Normalized Email Lookup: Query Tenant document by tenantId
    let recipientEmail = null;
    const tenantDoc = await Tenant.findOne({ tenantId: complaint.tenantId });
    if (tenantDoc && tenantDoc.email) {
      recipientEmail = tenantDoc.email.trim().toLowerCase();
    } else {
      // Fallback: check Room embedded tenant email if Tenant user doc is not registered yet
      const roomMatch = await Room.findOne({ 'tenants.tenantId': complaint.tenantId });
      if (roomMatch && roomMatch.tenants) {
        const embedded = roomMatch.tenants.find(t => t.tenantId === complaint.tenantId);
        if (embedded && embedded.email) {
          recipientEmail = embedded.email.trim().toLowerCase();
        }
      }
    }

    // Send email notification if recipient email exists
    if (recipientEmail) {
      try {
        const subject = `Your Complaint for Room ${complaint.roomNumber} Has Been Resolved`;
        const text = `Hello, your complaint regarding Room ${complaint.roomNumber} has been resolved by PG management.\n\nResolution Note:\n${complaint.resolutionNote}\n\nThank you!`;
        const html = `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #2F2F2F;">
            <h2 style="color: #6C63FF;">Pujyasritha's Living</h2>
            <p>Hello,</p>
            <p>Your raised complaint for <strong>Room ${complaint.roomNumber}</strong> has been marked as <span style="color: #22C55E; font-weight: bold;">Resolved</span>.</p>
            <div style="background: #F5F6FA; border-left: 4px solid #22C55E; padding: 15px; margin: 15px 0; border-radius: 4px;">
              <strong>Management Resolution Note:</strong>
              <p style="margin-top: 5px; color: #4A5568;">${complaint.resolutionNote}</p>
            </div>
            <p style="font-size: 0.9rem; color: #6C757D;">You can view the resolution details and photo evidence in your Resident Portal under the Complaints tab.</p>
          </div>
        `;
        await sendEmail(recipientEmail, subject, text, html);
        console.log(`✔ Resolution notification email sent to ${recipientEmail}`);
      } catch (mailErr) {
        console.warn(`⚠️ Could not send resolution email to ${recipientEmail}:`, mailErr.message);
      }
    } else {
      console.warn(`⚠️ No registered account email found for tenantId ${complaint.tenantId}; skipped resolution email notification.`);
    }

    return res.redirect('/admin/complaints?success=Complaint marked as Resolved successfully!');
  } catch (error) {
    console.error('Error in resolveAdminComplaint:', error);
    return res.redirect('/admin/complaints?error=Failed to resolve complaint.');
  }
};

module.exports = {
  getTenantComplaints,
  createTenantComplaint,
  getAdminComplaints,
  resolveAdminComplaint
};
