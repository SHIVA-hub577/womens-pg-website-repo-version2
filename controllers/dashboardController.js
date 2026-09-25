const Room = require('../models/Room');

// Admin Dashboard: aggregated metrics and overview
const getAdminDashboard = async (req, res) => {
  try {
    const rooms = await Room.find().sort({ roomNumber: 1 });
    
    const totalRooms = rooms.length;
    let totalTenants = 0;
    let occupiedCount = 0;
    let vacantCount = 0;
    let partiallyOccupiedCount = 0;

    rooms.forEach(room => {
      const tenantCount = room.tenants ? room.tenants.length : 0;
      totalTenants += tenantCount;
      if (room.status === 'Occupied') occupiedCount++;
      else if (room.status === 'Vacant') vacantCount++;
      else if (room.status === 'Partially Occupied') partiallyOccupiedCount++;
    });

    res.render('admin/dashboard', {
      rooms,
      totalRooms,
      occupiedCount,
      vacantCount,
      partiallyOccupiedCount,
      totalTenants,
      activePage: 'dashboard'
    });
  } catch (error) {
    console.error('Error in getAdminDashboard:', error);
    res.status(500).send('Server Error loading dashboard');
  }
};

// Admin Rooms List
const getAdminRooms = async (req, res) => {
  try {
    const rooms = await Room.find().sort({ roomNumber: 1 });
    res.render('admin/rooms', {
      rooms,
      success: req.query.success || null,
      error: req.query.error || null,
      activePage: 'rooms'
    });
  } catch (error) {
    console.error('Error in getAdminRooms:', error);
    res.status(500).send('Server Error loading rooms');
  }
};

// Admin Tenants List
const getAdminTenants = async (req, res) => {
  try {
    const rooms = await Room.find().sort({ roomNumber: 1 });
    const tenantsList = [];

    rooms.forEach(room => {
      if (room.tenants && room.tenants.length > 0) {
        room.tenants.forEach(t => {
          tenantsList.push({
            tenantId: t.tenantId,
            name: t.name,
            age: t.age,
            gender: t.gender,
            phone: t.phone,
            email: t.email,
            joiningDate: t.joiningDate,
            rent: t.rent,
            advancePaid: t.advancePaid,
            status: t.status,
            emergencyContactNumber: t.emergencyContactNumber,
            relation: t.relation,
            roomNumber: room.roomNumber,
            sharingType: room.sharingType
          });
        });
      }
    });

    res.render('admin/tenants', {
      tenants: tenantsList,
      success: req.query.success || null,
      error: req.query.error || null,
      activePage: 'tenants'
    });
  } catch (error) {
    console.error('Error in getAdminTenants:', error);
    res.status(500).send('Server Error loading tenants');
  }
};

// Render Add Tenant & Allot Room Form (GET /admin/tenants/new)
const renderAddTenant = async (req, res) => {
  try {
    const rooms = await Room.find().sort({ roomNumber: 1 });
    
    // Filter available rooms: Vacant or Partially Occupied (where current tenant count < capacity)
    const availableRooms = rooms.filter(room => {
      const tenantCount = room.tenants ? room.tenants.length : 0;
      return room.status !== 'Occupied' && tenantCount < room.capacity;
    });

    res.render('admin/add-tenant', {
      availableRooms,
      rooms,
      error: req.query.error || null,
      success: req.query.success || null,
      activePage: 'tenants'
    });
  } catch (error) {
    console.error('Error in renderAddTenant:', error);
    res.status(500).send('Server Error loading add tenant form');
  }
};

// Create and Allot Tenant (POST /admin/tenants/new)
const createTenant = async (req, res) => {
  try {
    const { roomNumber, name, age, gender, email, phone, emergencyContactNumber, relation, joiningDate, rent, advancePaid } = req.body;

    if (!roomNumber || !name || !email || !phone || !emergencyContactNumber || !relation) {
      return res.redirect('/admin/tenants/new?error=Please fill in all required fields (Room, Name, Email, Phone, Emergency Contact, Relation).');
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    const cleanEmergencyContact = emergencyContactNumber.trim();
    const cleanRelation = relation.trim();

    // Validate phone number formats (minimum 10 digits numeric / standard format)
    const phoneRegex = /^\+?[0-9]{10,15}$/;
    if (!phoneRegex.test(cleanPhone.replace(/[\s\-]/g, ''))) {
      return res.redirect('/admin/tenants/new?error=Please enter a valid Phone Number (minimum 10 digits).');
    }
    if (!phoneRegex.test(cleanEmergencyContact.replace(/[\s\-]/g, ''))) {
      return res.redirect('/admin/tenants/new?error=Please enter a valid Emergency Contact Number (minimum 10 digits).');
    }

    // Find the target room
    const room = await Room.findOne({ roomNumber: roomNumber.trim() });
    if (!room) {
      return res.redirect('/admin/tenants/new?error=Selected room does not exist.');
    }

    // Verify room availability
    const tenantCount = room.tenants ? room.tenants.length : 0;
    if (tenantCount >= room.capacity || room.status === 'Occupied') {
      return res.redirect(`/admin/tenants/new?error=Room ${room.roomNumber} is already fully occupied.`);
    }

    // Check if email is already assigned in any room
    const existingInRoom = await Room.findOne({ 'tenants.email': cleanEmail });
    if (existingInRoom) {
      return res.redirect(`/admin/tenants/new?error=Resident with email ${cleanEmail} is already assigned to Room ${existingInRoom.roomNumber}.`);
    }

    // Generate unique Tenant ID
    const tenantId = 'TNT' + Math.floor(1000 + Math.random() * 9000);

    const newTenantObj = {
      tenantId,
      name: cleanName,
      age: age ? Number(age) : undefined,
      gender: gender || 'Female',
      phone: cleanPhone,
      email: cleanEmail,
      emergencyContactNumber: cleanEmergencyContact,
      relation: cleanRelation,
      joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
      rent: rent ? Number(rent) : room.rent,
      advancePaid: advancePaid ? Number(advancePaid) : room.advance,
      status: 'Active'
    };

    if (!room.tenants) {
      room.tenants = [];
    }
    room.tenants.push(newTenantObj);

    // Update room status
    if (room.tenants.length >= room.capacity) {
      room.status = 'Occupied';
    } else if (room.tenants.length > 0) {
      room.status = 'Partially Occupied';
    } else {
      room.status = 'Vacant';
    }

    await room.save();

    // Update matching Tenant account if registered
    const Tenant = require('../models/Tenant');
    await Tenant.findOneAndUpdate(
      { email: cleanEmail },
      {
        $set: {
          tenantId,
          roomNumber: room.roomNumber,
          name: cleanName,
          phone: cleanPhone,
          emergencyContactNumber: cleanEmergencyContact,
          relation: cleanRelation
        }
      }
    );

    return res.redirect(`/admin/tenants?success=Resident ${cleanName} successfully allotted to Room ${room.roomNumber}!`);
  } catch (error) {
    console.error('Error in createTenant:', error);
    return res.redirect('/admin/tenants/new?error=Failed to allot room. Please check form inputs.');
  }
};

// Tenant Profile View (Homepage on tenant login success)
const getTenantProfile = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) {
      return res.redirect('/login');
    }

    let room = null;
    let tenantInfo = null;

    if (user.roomNumber) {
      room = await Room.findOne({ roomNumber: user.roomNumber });
    }

    if (!room && user.email) {
      room = await Room.findOne({ 'tenants.email': user.email });
    }

    if (room && room.tenants && room.tenants.length > 0) {
      tenantInfo = room.tenants.find(t => 
        (user.tenantId && t.tenantId === user.tenantId) ||
        (user.email && t.email === user.email)
      ) || room.tenants[0];
    }

    // Fetch current month's RentPayment for tenant
    const RentPayment = require('../models/RentPayment');
    const validMonths = getValidMonthRange();
    const currentMonth = validMonths[0];
    let currentPayment = null;

    if (tenantInfo && tenantInfo.tenantId) {
      currentPayment = await RentPayment.findOne({ tenantId: tenantInfo.tenantId, month: currentMonth });
    }

    res.render('tenant/profile', {
      user,
      room,
      tenant: tenantInfo,
      currentPayment,
      currentMonth,
      error: req.query.error || null,
      success: req.query.success || null,
      activePage: 'profile'
    });
  } catch (error) {
    console.error('Error in getTenantProfile:', error);
    res.status(500).send('Server Error loading tenant profile');
  }
};

// Tenant Room View
const getTenantRoom = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) {
      return res.redirect('/login');
    }

    let room = null;
    let tenantInfo = null;

    if (user.roomNumber) {
      room = await Room.findOne({ roomNumber: user.roomNumber });
    }

    if (!room && user.email) {
      room = await Room.findOne({ 'tenants.email': user.email });
    }

    if (room && room.tenants && room.tenants.length > 0) {
      tenantInfo = room.tenants.find(t => 
        (user.tenantId && t.tenantId === user.tenantId) ||
        (user.email && t.email === user.email)
      ) || room.tenants[0];
    }

    res.render('tenant/room', {
      user,
      room,
      tenant: tenantInfo,
      activePage: 'room'
    });
  } catch (error) {
    console.error('Error in getTenantRoom:', error);
    res.status(500).send('Server Error loading room details');
  }
};

// Admin: Render Remove Tenant View (GET /admin/remove-tenant)
const renderRemoveTenant = async (req, res) => {
  try {
    const rooms = await Room.find().sort({ roomNumber: 1 });
    
    // Filter rooms that currently have occupied residents
    const occupiedRooms = rooms.filter(room => room.tenants && room.tenants.length > 0);

    res.render('admin/remove-tenant', {
      occupiedRooms,
      allRooms: rooms,
      error: req.query.error || null,
      success: req.query.success || null,
      activePage: 'remove-tenant'
    });
  } catch (error) {
    console.error('Error in renderRemoveTenant:', error);
    res.status(500).send('Server Error loading Remove Tenant form');
  }
};

// Admin: Request Tenant Removal & Send OTP Code (POST /admin/tenants/:tenantId/request-removal)
const requestTenantRemoval = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { roomNumber } = req.body;

    if (!tenantId || !roomNumber) {
      return res.redirect('/admin/remove-tenant?error=Please select room number and resident to remove.');
    }

    const cleanTenantId = tenantId.trim();
    const cleanRoomNumber = roomNumber.trim();

    // Verify room and tenant exist
    const room = await Room.findOne({ roomNumber: cleanRoomNumber });
    if (!room || !room.tenants) {
      return res.redirect('/admin/remove-tenant?error=Specified room or resident record not found.');
    }

    const embedded = room.tenants.find(t => t.tenantId === cleanTenantId);
    if (!embedded) {
      return res.redirect(`/admin/remove-tenant?error=Resident record not found in Room ${cleanRoomNumber}.`);
    }

    // Determine target recipient email address
    const Tenant = require('../models/Tenant');
    let recipientEmail = null;
    const tenantDoc = await Tenant.findOne({ tenantId: cleanTenantId });
    if (tenantDoc && tenantDoc.email) {
      recipientEmail = tenantDoc.email.trim().toLowerCase();
    } else if (embedded.email) {
      recipientEmail = embedded.email.trim().toLowerCase();
    }

    if (!recipientEmail) {
      return res.redirect(`/admin/remove-tenant?error=No email address found for resident ${embedded.name}. Cannot send removal OTP.`);
    }

    // Generate 6-digit OTP code & 15-minute expiry
    const freshCode = Math.floor(100000 + Math.random() * 900000).toString();
    const freshExpiry = new Date(Date.now() + 15 * 60 * 1000);

    // Atomic refresh / upsert in TenantRemoval collection
    const TenantRemoval = require('../models/TenantRemoval');
    await TenantRemoval.findOneAndUpdate(
      { tenantId: cleanTenantId },
      {
        $set: {
          roomNumber: cleanRoomNumber,
          initiatedBy: req.session && req.session.user ? req.session.user.email : 'admin',
          code: freshCode,
          createdAt: new Date(),
          expiresAt: freshExpiry
        }
      },
      { upsert: true, new: true }
    );

    // Send OTP email to resident
    try {
      const { sendEmail } = require('../services/emailservices');
      const subject = `Hostel Removal Verification OTP: ${freshCode}`;
      const text = `Hello ${embedded.name || 'Resident'},\n\nYour hostel removal verification OTP code for Room ${cleanRoomNumber} is: ${freshCode}\n\nPlease share this 6-digit code with the PG Admin to complete your removal.\n\nThis code is valid for 15 minutes.`;
      const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #2F2F2F;">
          <h2 style="color: #6C63FF;">Pujyasritha's Living</h2>
          <p>Hello <strong>${embedded.name || 'Resident'}</strong>,</p>
          <p>An admin has initiated a hostel removal request for <strong>Room ${cleanRoomNumber}</strong>.</p>
          <p>Your 6-digit removal verification OTP is:</p>
          <h1 style="background: #F5F6FA; padding: 10px 20px; display: inline-block; letter-spacing: 5px; color: #EF4444; border-radius: 8px;">${freshCode}</h1>
          <p>Please share this code with PG management to complete your removal process.</p>
          <p style="font-size: 0.85rem; color: #6C757D;">This OTP is valid for 15 minutes. If you did not request this, please contact PG management immediately.</p>
        </div>
      `;
      await sendEmail(recipientEmail, subject, text, html);
      console.log(`✔ Removal OTP email sent to ${recipientEmail}`);

      return res.redirect(`/admin/remove-tenant/verify?tenantId=${encodeURIComponent(cleanTenantId)}&roomNumber=${encodeURIComponent(cleanRoomNumber)}&success=${encodeURIComponent(`OTP verification code has been sent to ${recipientEmail}.`)}`);
    } catch (mailErr) {
      console.error('Error sending removal OTP email:', mailErr);
      return res.redirect('/admin/remove-tenant?error=Could not send the removal OTP email — please try again.');
    }
  } catch (error) {
    console.error('Error in requestTenantRemoval:', error);
    return res.redirect('/admin/remove-tenant?error=Failed to initiate tenant removal.');
  }
};

// Admin: Render Verify Removal OTP Page (GET /admin/remove-tenant/verify)
const renderVerifyTenantRemoval = async (req, res) => {
  try {
    const { tenantId, roomNumber, error, success } = req.query;
    if (!tenantId || !roomNumber) {
      return res.redirect('/admin/remove-tenant?error=Invalid verification request parameters.');
    }

    const cleanTenantId = String(tenantId).trim();
    const cleanRoomNumber = String(roomNumber).trim();

    // Verify room and resident
    const room = await Room.findOne({ roomNumber: cleanRoomNumber });
    let residentName = 'Resident';
    let residentEmail = 'N/A';

    if (room && room.tenants) {
      const embedded = room.tenants.find(t => t.tenantId === cleanTenantId);
      if (embedded) {
        residentName = embedded.name || residentName;
        residentEmail = embedded.email || residentEmail;
      }
    }

    // Check if TenantRemoval request exists
    const TenantRemoval = require('../models/TenantRemoval');
    const removalDoc = await TenantRemoval.findOne({
      tenantId: cleanTenantId,
      expiresAt: { $gt: new Date() }
    });

    if (!removalDoc) {
      return res.redirect('/admin/remove-tenant?error=No active removal OTP found for this resident or it has expired. Please initiate removal again.');
    }

    res.render('admin/verify-removal-otp', {
      tenantId: cleanTenantId,
      roomNumber: cleanRoomNumber,
      residentName,
      residentEmail,
      error: error || null,
      success: success || null,
      activePage: 'remove-tenant'
    });
  } catch (error) {
    console.error('Error in renderVerifyTenantRemoval:', error);
    res.redirect('/admin/remove-tenant?error=Failed to load OTP verification page.');
  }
};

// Admin: Verify OTP and Execute Removal (POST /admin/remove-tenant/verify)
const verifyAndExecuteRemoval = async (req, res) => {
  try {
    const { tenantId, roomNumber, code } = req.body;
    if (!tenantId || !roomNumber || !code) {
      return res.redirect(`/admin/remove-tenant/verify?tenantId=${encodeURIComponent(tenantId)}&roomNumber=${encodeURIComponent(roomNumber)}&error=Please enter the 6-digit OTP code.`);
    }

    const cleanTenantId = String(tenantId).trim();
    const cleanRoomNumber = String(roomNumber).trim();
    const cleanCode = String(code).trim();

    const TenantRemoval = require('../models/TenantRemoval');
    // Validate OTP against unexpired request
    const removalDoc = await TenantRemoval.findOne({
      tenantId: cleanTenantId,
      code: cleanCode,
      expiresAt: { $gt: new Date() }
    });

    // Lookup resident info for display & notification
    const room = await Room.findOne({ roomNumber: cleanRoomNumber });
    let residentName = 'Resident';
    let residentEmail = null;

    if (room && room.tenants) {
      const embedded = room.tenants.find(t => t.tenantId === cleanTenantId);
      if (embedded) {
        residentName = embedded.name || residentName;
        if (embedded.email) residentEmail = embedded.email.trim().toLowerCase();
      }
    }

    if (!removalDoc) {
      console.warn(`✖ Invalid OTP verification attempt for tenantId ${cleanTenantId}`);
      return res.render('admin/verify-removal-otp', {
        tenantId: cleanTenantId,
        roomNumber: cleanRoomNumber,
        residentName,
        residentEmail: residentEmail || 'N/A',
        error: 'Incorrect or expired OTP code. Please enter the correct OTP sent to the resident.',
        success: null,
        activePage: 'remove-tenant'
      });
    }

    // STEP 0: Store tenant information into RemovedTenant collection before deleting
    const RemovedTenant = require('../models/RemovedTenant');
    const Tenant = require('../models/Tenant');
    const embeddedTenant = (room && room.tenants) ? room.tenants.find(t => t.tenantId === cleanTenantId) : null;
    const standaloneTenant = await Tenant.findOne({
      $or: [{ tenantId: cleanTenantId }, ...(residentEmail ? [{ email: residentEmail }] : [])]
    });

    const adminActor = (req.session && req.session.user && req.session.user.email) 
      ? req.session.user.email 
      : (removalDoc.initiatedBy || 'admin');

    try {
      await RemovedTenant.create({
        tenantId: cleanTenantId,
        name: (embeddedTenant && embeddedTenant.name) || (standaloneTenant && standaloneTenant.name) || residentName || 'N/A',
        email: (embeddedTenant && embeddedTenant.email) || (standaloneTenant && standaloneTenant.email) || residentEmail || 'N/A',
        phone: (embeddedTenant && embeddedTenant.phone) || (standaloneTenant && standaloneTenant.phone) || 'N/A',
        emergencyContactNumber: (embeddedTenant && embeddedTenant.emergencyContactNumber) || (standaloneTenant && standaloneTenant.emergencyContactNumber) || 'N/A',
        relation: (embeddedTenant && embeddedTenant.relation) || (standaloneTenant && standaloneTenant.relation) || 'N/A',
        age: (embeddedTenant && embeddedTenant.age) || undefined,
        gender: (embeddedTenant && embeddedTenant.gender) || undefined,
        roomNumber: cleanRoomNumber,
        sharingType: room ? room.sharingType : undefined,
        rent: (embeddedTenant && embeddedTenant.rent) || (room ? room.rent : 0),
        advancePaid: (embeddedTenant && embeddedTenant.advancePaid) || 0,
        joiningDate: (embeddedTenant && embeddedTenant.joiningDate) || (standaloneTenant && standaloneTenant.createdAt) || undefined,
        removedAt: new Date(),
        removedBy: adminActor
      });
      console.log(`✔ Removed tenant ${cleanTenantId} stored in removed-tenants database collection.`);
    } catch (dbErr) {
      console.error('Error recording removed tenant in database:', dbErr);
    }

    // STEP 1 & 2: Pull embedded tenant from Room and update Room status
    if (room && room.tenants) {
      const embedded = room.tenants.find(t => t.tenantId === cleanTenantId);
      if (embedded && embedded.email) {
        residentEmail = embedded.email.trim().toLowerCase();
      }

      room.tenants = room.tenants.filter(t => t.tenantId !== cleanTenantId);

      // Recalculate room status
      if (room.tenants.length === 0) {
        room.status = 'Vacant';
      } else if (room.tenants.length < room.capacity) {
        room.status = 'Partially Occupied';
      } else {
        room.status = 'Occupied';
      }

      await room.save();
    }

    // STEP 3: Delete all Complaint documents for this tenantId
    const Complaint = require('../models/Complaint');
    await Complaint.deleteMany({ tenantId: cleanTenantId });

    // STEP 4: Delete standalone Tenant document
    await Tenant.deleteMany({ tenantId: cleanTenantId });
    if (residentEmail) {
      await Tenant.deleteMany({ email: residentEmail });
    }

    // STEP 5: Delete single-use TenantRemoval document
    await TenantRemoval.deleteOne({ _id: removalDoc._id });

    // STEP 6: Send removal notification message/email to tenant
    if (residentEmail) {
      try {
        const { sendEmail } = require('../services/emailservices');
        const subject = "Hostel Residency Terminated — Pujyasritha's Living";
        const text = `Hello ${residentName},\n\nYour residency at Pujyasritha's Living for Room ${cleanRoomNumber} has been officially removed and finalized by management.\n\nThank you for staying with us.`;
        const html = `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #2F2F2F;">
            <h2 style="color: #6C63FF;">Pujyasritha's Living</h2>
            <p>Hello <strong>${residentName}</strong>,</p>
            <p>Your residency at Pujyasritha's Living for <strong>Room ${cleanRoomNumber}</strong> has been officially removed and finalized.</p>
            <p style="color: #6C757D; margin-top: 15px;">Your account access has been closed. We wish you all the best!</p>
          </div>
        `;
        await sendEmail(residentEmail, subject, text, html);
        console.log(`✔ Removal final notice sent to ${residentEmail}`);
      } catch (notifyErr) {
        console.error('Error sending removal final notice email:', notifyErr);
      }
    }

    return res.redirect(`/admin/remove-tenant?success=${encodeURIComponent(`Resident ${residentName} (Room ${cleanRoomNumber}) has been successfully removed.`)}`);
  } catch (error) {
    console.error('Error in verifyAndExecuteRemoval:', error);
    return res.redirect('/admin/remove-tenant?error=An error occurred while finalizing tenant removal.');
  }
};

// ==========================================
// RENT PAYMENTS FEATURE HELPERS & HANDLERS
// ==========================================

// Helper: Compute rolling 12-month window (current month + 11 preceding months)
const getValidMonthRange = () => {
  const months = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    months.push(`${yyyy}-${mm}`);
  }
  return months;
};

// Helper: Sanitize & clamp month query parameter server-side
const sanitizeMonth = (inputMonth) => {
  const validMonths = getValidMonthRange();
  const currentMonth = validMonths[0];
  if (!inputMonth || typeof inputMonth !== 'string' || !/^\d{4}-\d{2}$/.test(inputMonth.trim())) {
    return currentMonth;
  }
  const trimmed = inputMonth.trim();
  if (!validMonths.includes(trimmed)) {
    return currentMonth;
  }
  return trimmed;
};

// Shared Helper: Reusable Room + Tenant + RentPayment join logic for HTML table & CSV export
const getPaymentsForMonth = async (requestedMonth) => {
  const sanitizedMonth = sanitizeMonth(requestedMonth);
  const rooms = await Room.find().sort({ roomNumber: 1 });
  const RentPayment = require('../models/RentPayment');
  const payments = await RentPayment.find({ month: sanitizedMonth });

  const paymentMap = new Map();
  payments.forEach(p => paymentMap.set(p.tenantId, p));

  const records = [];
  rooms.forEach(room => {
    if (room.tenants && room.tenants.length > 0) {
      room.tenants.forEach(embedded => {
        const rent = embedded.rent || room.rent || 0;
        const paymentDoc = paymentMap.get(embedded.tenantId);
        records.push({
          tenantName: embedded.name || 'Resident',
          tenantId: embedded.tenantId,
          roomNumber: room.roomNumber,
          rent: rent,
          amountPaid: paymentDoc ? paymentDoc.amountPaid : 0,
          paymentDate: paymentDoc ? paymentDoc.paymentDate : null,
          status: paymentDoc ? paymentDoc.status : 'Pending',
          updatedBy: paymentDoc ? paymentDoc.updatedBy : null
        });
      });
    }
  });

  return {
    month: sanitizedMonth,
    records
  };
};

// Admin: Payments Overview View (GET /admin/payments?month=YYYY-MM)
const getAdminPayments = async (req, res) => {
  try {
    const validMonths = getValidMonthRange();
    const { month: selectedMonth, records } = await getPaymentsForMonth(req.query.month);

    let totalExpected = 0;
    let totalCollected = 0;
    let paidCount = 0;
    let pendingCount = 0;

    records.forEach(r => {
      totalExpected += r.rent;
      totalCollected += r.amountPaid;
      if (r.status === 'Paid') paidCount++;
      else pendingCount++;
    });

    const totalPending = Math.max(0, totalExpected - totalCollected);

    res.render('admin/payments', {
      records,
      validMonths,
      selectedMonth,
      summary: {
        totalExpected,
        totalCollected,
        totalPending,
        paidCount,
        pendingCount
      },
      error: req.query.error || null,
      success: req.query.success || null,
      activePage: 'payments'
    });
  } catch (error) {
    console.error('Error in getAdminPayments:', error);
    res.status(500).send('Server error loading payments overview');
  }
};

// Admin: CSV Export (GET /admin/payments/export?month=YYYY-MM)
const exportPayments = async (req, res) => {
  try {
    const { month: selectedMonth, records } = await getPaymentsForMonth(req.query.month);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="payments-${selectedMonth}.csv"`);

    const createCsvStringifier = require('csv-writer').createObjectCsvStringifier;
    const csvStringifier = createCsvStringifier({
      header: [
        { id: 'tenantName', title: 'Tenant Name' },
        { id: 'tenantId', title: 'Tenant ID' },
        { id: 'roomNumber', title: 'Room Number' },
        { id: 'rent', title: 'Rent Amount (INR)' },
        { id: 'amountPaid', title: 'Amount Paid (INR)' },
        { id: 'status', title: 'Status' },
        { id: 'paymentDate', title: 'Payment Date' },
        { id: 'updatedBy', title: 'Updated By' }
      ]
    });

    const csvData = records.map(r => ({
      tenantName: r.tenantName,
      tenantId: r.tenantId,
      roomNumber: r.roomNumber,
      rent: r.rent,
      amountPaid: r.amountPaid,
      status: r.status,
      paymentDate: r.paymentDate ? new Date(r.paymentDate).toISOString().slice(0,10) : 'N/A',
      updatedBy: r.updatedBy || 'N/A'
    }));

    const headerStr = csvStringifier.getHeaderString();
    const recordsStr = csvStringifier.stringifyRecords(csvData);

    res.send(headerStr + recordsStr);
  } catch (error) {
    console.error('Error in exportPayments:', error);
    res.status(500).send('Error generating CSV export');
  }
};

// Admin: Email CSV Report to Admin (GET /admin/payments/email?month=YYYY-MM)
const emailPaymentsReport = async (req, res) => {
  try {
    const { month: selectedMonth, records } = await getPaymentsForMonth(req.query.month);
    const { sendEmail } = require('../services/emailservices');

    const adminEmail = (req.session && req.session.user && req.session.user.email) 
      ? req.session.user.email 
      : (process.env.GOOGLEUSER || 'admin@example.com');

    const createCsvStringifier = require('csv-writer').createObjectCsvStringifier;
    const csvStringifier = createCsvStringifier({
      header: [
        { id: 'tenantName', title: 'Tenant Name' },
        { id: 'tenantId', title: 'Tenant ID' },
        { id: 'roomNumber', title: 'Room Number' },
        { id: 'rent', title: 'Rent Amount (INR)' },
        { id: 'amountPaid', title: 'Amount Paid (INR)' },
        { id: 'status', title: 'Status' },
        { id: 'paymentDate', title: 'Payment Date' },
        { id: 'updatedBy', title: 'Updated By' }
      ]
    });

    const csvData = records.map(r => ({
      tenantName: r.tenantName,
      tenantId: r.tenantId,
      roomNumber: r.roomNumber,
      rent: r.rent,
      amountPaid: r.amountPaid,
      status: r.status,
      paymentDate: r.paymentDate ? new Date(r.paymentDate).toISOString().slice(0,10) : 'N/A',
      updatedBy: r.updatedBy || 'N/A'
    }));

    const headerStr = csvStringifier.getHeaderString();
    const recordsStr = csvStringifier.stringifyRecords(csvData);
    const fullCsvContent = headerStr + recordsStr;

    await sendEmail(
      adminEmail,
      `Monthly Rent Payments Report — ${selectedMonth}`,
      `Attached is the rent payments CSV report for ${selectedMonth} for Pujyasritha's Living Women's PG.`,
      `<h3>Rent Payments Report (${selectedMonth})</h3>
       <p>Hello Admin,</p>
       <p>Attached is the monthly rent payments CSV report for <strong>${selectedMonth}</strong> for Pujyasritha's Living Women's PG.</p>
       <p><strong>Summary Details:</strong></p>
       <ul>
         <li>Total Records: ${records.length}</li>
         <li>Generated On: ${new Date().toLocaleString('en-IN')}</li>
       </ul>`,
      [
        {
          filename: `payments-${selectedMonth}.csv`,
          content: fullCsvContent,
          contentType: 'text/csv'
        }
      ]
    );

    return res.redirect(`/admin/payments?month=${selectedMonth}&success=${encodeURIComponent(`Payments CSV report for ${selectedMonth} emailed successfully to ${adminEmail}!`)}`);
  } catch (error) {
    console.error('Error in emailPaymentsReport:', error);
    return res.redirect(`/admin/payments?error=${encodeURIComponent('Failed to email payments CSV report. Please verify email configuration.')}`);
  }
};

// Admin: Manually Update Payment Status (POST /admin/payments/:tenantId/update)
const updatePaymentStatus = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { month, status, amountPaid } = req.body;
    const sanitizedMonth = sanitizeMonth(month);

    if (!tenantId) {
      return res.redirect(`/admin/payments?month=${sanitizedMonth}&error=Tenant ID is required.`);
    }

    const cleanTenantId = String(tenantId).trim();
    const cleanStatus = String(status || '').trim();

    // Validation Step 1: Status enum validation
    if (!['Paid', 'Pending', 'Partial'].includes(cleanStatus)) {
      return res.redirect(`/admin/payments?month=${sanitizedMonth}&error=${encodeURIComponent('Invalid payment status submitted.')}`);
    }

    // Find room and tenant to determine rent
    const room = await Room.findOne({ 'tenants.tenantId': cleanTenantId });
    if (!room) {
      return res.redirect(`/admin/payments?month=${sanitizedMonth}&error=${encodeURIComponent('Tenant or room record not found.')}`);
    }

    const embedded = room.tenants.find(t => t.tenantId === cleanTenantId);
    const roomRent = embedded ? (embedded.rent || room.rent) : room.rent;

    let targetAmountPaid = 0;
    let targetPaymentDate = null;

    if (cleanStatus === 'Paid') {
      targetAmountPaid = roomRent;
      targetPaymentDate = new Date();
    } else if (cleanStatus === 'Partial') {
      const parsed = Number(amountPaid);
      // Validation Step 2: Strict partial amount bounds check
      if (isNaN(parsed) || parsed <= 0 || parsed >= roomRent) {
        return res.redirect(`/admin/payments?month=${sanitizedMonth}&error=${encodeURIComponent(`Enter a partial amount between ₹1 and ₹${roomRent - 1}.`)}`);
      }
      targetAmountPaid = parsed;
      targetPaymentDate = new Date();
    } else if (cleanStatus === 'Pending') {
      targetAmountPaid = 0;
      targetPaymentDate = null;
    }

    const adminEmail = req.session && req.session.user ? req.session.user.email : 'admin';

    const RentPayment = require('../models/RentPayment');
    try {
      await RentPayment.findOneAndUpdate(
        { tenantId: cleanTenantId, month: sanitizedMonth },
        {
          $set: {
            amountPaid: targetAmountPaid,
            paymentDate: targetPaymentDate,
            status: cleanStatus,
            updatedBy: adminEmail
          }
        },
        { upsert: true, new: true }
      );
    } catch (err) {
      if (err.code === 11000) {
        return res.redirect(`/admin/payments?month=${sanitizedMonth}&error=${encodeURIComponent('Concurrent update conflict detected. Please retry.')}`);
      }
      throw err;
    }

    return res.redirect(`/admin/payments?month=${sanitizedMonth}&success=${encodeURIComponent(`Payment status updated for ${embedded ? embedded.name : cleanTenantId}.`)}`);
  } catch (error) {
    console.error('Error in updatePaymentStatus:', error);
    res.redirect('/admin/payments?error=Failed to update payment status.');
  }
};

// Tenant: Self-Report Pay Rent (POST /tenant/pay)
const payRent = async (req, res) => {
  try {
    const user = req.session ? req.session.user : null;

    // Guard 1 (Unassigned Tenant): Reject missing user or missing roomNumber
    if (!user || !user.roomNumber) {
      return res.redirect(`/tenant/profile?error=${encodeURIComponent('No room assigned — nothing to pay.')}`);
    }

    const currentMonth = sanitizeMonth();

    // Guard 2 (Room Lookup): Reject if assigned room not found in DB
    const room = await Room.findOne({ roomNumber: user.roomNumber });
    if (!room || !room.tenants) {
      return res.redirect(`/tenant/profile?error=${encodeURIComponent('No room assigned — nothing to pay.')}`);
    }

    const tenantInfo = room.tenants.find(t => 
      (user.tenantId && t.tenantId === user.tenantId) ||
      (user.email && t.email === user.email)
    ) || room.tenants[0];

    if (!tenantInfo || !tenantInfo.tenantId) {
      return res.redirect(`/tenant/profile?error=${encodeURIComponent('No room assigned — nothing to pay.')}`);
    }

    const tenantId = tenantInfo.tenantId;
    const roomRent = tenantInfo.rent || room.rent || 0;

    const RentPayment = require('../models/RentPayment');

    // Fast Read Check for friendly UI rejection
    const existingDoc = await RentPayment.findOne({ tenantId, month: currentMonth });
    if (existingDoc && existingDoc.status === 'Paid') {
      return res.redirect(`/tenant/profile?error=${encodeURIComponent("You've already paid for this month.")}`);
    }

    const actorEmail = user.email || 'tenant-self-report';

    // Race-Proof Atomic Write Step: Filter strictly enforces status: { $ne: 'Paid' }
    try {
      await RentPayment.findOneAndUpdate(
        { tenantId: tenantId, month: currentMonth, status: { $ne: 'Paid' } },
        {
          $set: {
            amountPaid: roomRent,
            paymentDate: new Date(),
            status: 'Paid',
            updatedBy: actorEmail
          }
        },
        { upsert: true, new: true }
      );
    } catch (err) {
      if (err.code === 11000) {
        return res.redirect(`/tenant/profile?error=${encodeURIComponent("You've already paid for this month.")}`);
      }
      throw err;
    }

    return res.redirect(`/tenant/profile?success=${encodeURIComponent(`Rent payment of ₹${roomRent.toLocaleString('en-IN')} for ${currentMonth} self-reported successfully.`)}`);
  } catch (error) {
    console.error('Error in payRent:', error);
    res.redirect('/tenant/profile?error=Failed to process rent payment.');
  }
};

// Helper: Compute available months for removed tenants (rolling 12 months + any existing removed dates)
const getRemovedTenantsMonths = async () => {
  const defaultMonths = getValidMonthRange();
  const RemovedTenant = require('../models/RemovedTenant');
  const dates = await RemovedTenant.distinct('removedAt');
  const monthSet = new Set(defaultMonths);
  dates.forEach(d => {
    if (d) {
      const dateObj = new Date(d);
      if (!isNaN(dateObj.getTime())) {
        const yyyy = dateObj.getFullYear();
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        monthSet.add(`${yyyy}-${mm}`);
      }
    }
  });
  return Array.from(monthSet).sort().reverse();
};

// Admin: View Removed Tenants List (GET /admin/removed-tenants)
const getRemovedTenants = async (req, res) => {
  try {
    const RemovedTenant = require('../models/RemovedTenant');
    const validMonths = await getRemovedTenantsMonths();
    const selectedMonth = (req.query.month || 'all').trim();

    let filterQuery = {};
    if (selectedMonth && selectedMonth !== 'all' && /^\d{4}-\d{2}$/.test(selectedMonth)) {
      const [yearStr, monthStr] = selectedMonth.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      const startOfMonth = new Date(year, month - 1, 1, 0, 0, 0, 0);
      const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
      filterQuery = { removedAt: { $gte: startOfMonth, $lte: endOfMonth } };
    }

    const removedTenants = await RemovedTenant.find(filterQuery).sort({ removedAt: -1 });

    res.render('admin/removed-tenants', {
      removedTenants,
      validMonths,
      selectedMonth,
      success: req.query.success || null,
      error: req.query.error || null,
      activePage: 'removed-tenants'
    });
  } catch (error) {
    console.error('Error in getRemovedTenants:', error);
    res.status(500).send('Server Error loading removed tenants list');
  }
};

// Admin: Email Removed Tenants List to Admin Gmail (GET /admin/removed-tenants/email)
const emailRemovedTenantsReport = async (req, res) => {
  try {
    const RemovedTenant = require('../models/RemovedTenant');
    const selectedMonth = (req.query.month || req.body.month || 'all').trim();

    let filterQuery = {};
    if (selectedMonth && selectedMonth !== 'all' && /^\d{4}-\d{2}$/.test(selectedMonth)) {
      const [yearStr, monthStr] = selectedMonth.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      const startOfMonth = new Date(year, month - 1, 1, 0, 0, 0, 0);
      const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
      filterQuery = { removedAt: { $gte: startOfMonth, $lte: endOfMonth } };
    }

    const removedTenants = await RemovedTenant.find(filterQuery).sort({ removedAt: -1 });
    const { sendEmail } = require('../services/emailservices');

    const adminEmail = (req.session && req.session.user && req.session.user.email) 
      ? req.session.user.email 
      : (process.env.GOOGLEUSER || 'admin@gmail.com');

    // Create CSV content for attachment
    const createCsvStringifier = require('csv-writer').createObjectCsvStringifier;
    const csvStringifier = createCsvStringifier({
      header: [
        { id: 'tenantId', title: 'Tenant ID' },
        { id: 'name', title: 'Name' },
        { id: 'email', title: 'Email' },
        { id: 'phone', title: 'Phone' },
        { id: 'emergencyContactNumber', title: 'Emergency Contact' },
        { id: 'relation', title: 'Relation' },
        { id: 'roomNumber', title: 'Room Number' },
        { id: 'rent', title: 'Rent (INR)' },
        { id: 'advancePaid', title: 'Advance Paid (INR)' },
        { id: 'joiningDate', title: 'Joining Date' },
        { id: 'removedAt', title: 'Removed Date' },
        { id: 'removedBy', title: 'Removed By' }
      ]
    });

    const csvData = removedTenants.map(t => ({
      tenantId: t.tenantId,
      name: t.name,
      email: t.email || 'N/A',
      phone: t.phone || 'N/A',
      emergencyContactNumber: t.emergencyContactNumber || 'N/A',
      relation: t.relation || 'N/A',
      roomNumber: t.roomNumber,
      rent: t.rent || 0,
      advancePaid: t.advancePaid || 0,
      joiningDate: t.joiningDate ? new Date(t.joiningDate).toISOString().slice(0, 10) : 'N/A',
      removedAt: t.removedAt ? new Date(t.removedAt).toISOString().slice(0, 10) : 'N/A',
      removedBy: t.removedBy || 'admin'
    }));

    const headerStr = csvStringifier.getHeaderString();
    const recordsStr = csvStringifier.stringifyRecords(csvData);
    const fullCsvContent = headerStr + recordsStr;

    const monthLabel = selectedMonth === 'all' ? 'All Time' : selectedMonth;

    // Create HTML table for email body
    let rowsHtml = '';
    if (removedTenants.length > 0) {
      rowsHtml = removedTenants.map(t => `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;">${t.tenantId}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${t.name}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">Room ${t.roomNumber}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${t.phone || 'N/A'}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${t.emergencyContactNumber || 'N/A'} ${t.relation ? `(${t.relation})` : ''}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${t.email || 'N/A'}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">₹${(t.rent || 0).toLocaleString('en-IN')}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${t.removedAt ? new Date(t.removedAt).toLocaleDateString('en-IN') : 'N/A'}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${t.removedBy || 'admin'}</td>
        </tr>
      `).join('');
    } else {
      rowsHtml = `<tr><td colspan="9" style="padding: 12px; text-align: center;">No removed tenants recorded for this period (${monthLabel}).</td></tr>`;
    }

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #2F2F2F;">
        <h2 style="color: #6C63FF;">Pujyasritha's Living — Removed Tenants Report (${monthLabel})</h2>
        <p>Hello Admin,</p>
        <p>Here is the list of removed tenants for <strong>${monthLabel}</strong> stored in your database as requested.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <thead>
            <tr style="background-color: #6C63FF; color: #ffffff;">
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Tenant ID</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Name</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Room</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Phone</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Emergency Contact</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Email</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Rent</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Removed Date</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Removed By</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <p style="margin-top: 20px; font-size: 0.85rem; color: #6C757D;">
          Filter Applied: <strong>${monthLabel}</strong> | Total Records: <strong>${removedTenants.length}</strong> | Generated on: ${new Date().toLocaleString('en-IN')}
        </p>
      </div>
    `;

    await sendEmail(
      adminEmail,
      `Removed Tenants Report (${monthLabel}) — Pujyasritha's Living`,
      `Here is the list of ${removedTenants.length} removed tenants for ${monthLabel}.`,
      htmlBody,
      [
        {
          filename: `removed-tenants-${monthLabel}-${new Date().toISOString().slice(0, 10)}.csv`,
          content: fullCsvContent,
          contentType: 'text/csv'
        }
      ]
    );

    return res.redirect(`/admin/removed-tenants?month=${selectedMonth}&success=${encodeURIComponent(`Removed tenants report (${monthLabel}) has been successfully sent to ${adminEmail}!`)}`);
  } catch (error) {
    console.error('Error in emailRemovedTenantsReport:', error);
    return res.redirect(`/admin/removed-tenants?error=${encodeURIComponent('Failed to send email. Please check your email server settings.')}`);
  }
};

module.exports = {
  getAdminDashboard,
  getAdminRooms,
  getAdminTenants,
  renderAddTenant,
  createTenant,
  getTenantProfile,
  getTenantRoom,
  renderRemoveTenant,
  requestTenantRemoval,
  renderVerifyTenantRemoval,
  verifyAndExecuteRemoval,
  getAdminPayments,
  exportPayments,
  emailPaymentsReport,
  updatePaymentStatus,
  payRent,
  getRemovedTenants,
  emailRemovedTenantsReport
};

