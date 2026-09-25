const PDFDocument = require('pdfkit');
const createCsvStringifier = require('csv-writer').createObjectCsvStringifier;
const RentPayment = require('../models/RentPayment');
const Room = require('../models/Room');
const Tenant = require('../models/Tenant');
const NotificationLog = require('../models/NotificationLog');
const { sendEmail } = require('../services/emailservices');

// Helper to determine if today is the last day of the current month
const isLastDayOfMonth = (date = new Date()) => {
  const today = date;
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  return today.getDate() === lastDay;
};

// Helper to generate PDF Buffer for pending tenants report
const generatePendingTenantsPDF = (pendingList, month) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      // Header Title
      doc.fillColor('#6C63FF').fontSize(20).text("Pujyasritha's Living Women's PG", { align: 'center' });
      doc.moveDown(0.3);
      doc.fillColor('#333333').fontSize(14).text(`Pending Rent Tenants Report — ${month}`, { align: 'center' });
      doc.moveDown(0.2);
      doc.fillColor('#666666').fontSize(9).text(`Generated On: ${new Date().toLocaleString('en-IN')}`, { align: 'center' });
      doc.moveDown(1);

      // Summary Box
      let totalPendingRent = 0;
      pendingList.forEach(item => {
        totalPendingRent += (item.rent || 0);
      });

      doc.fillColor('#333333').fontSize(11).text(`Total Tenants Pending: ${pendingList.length}`, { underline: true });
      doc.fontSize(11).text(`Total Pending Rent Amount: INR ${totalPendingRent.toLocaleString('en-IN')}`);
      doc.moveDown(1);

      // Table Header
      const tableTop = doc.y;
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#475569');
      doc.text('#', 40, tableTop);
      doc.text('Tenant Name', 65, tableTop);
      doc.text('Tenant ID', 190, tableTop);
      doc.text('Room', 270, tableTop);
      doc.text('Sharing', 325, tableTop);
      doc.text('Rent (INR)', 410, tableTop);
      doc.text('Status', 490, tableTop);

      doc.moveTo(40, tableTop + 15).lineTo(550, tableTop + 15).stroke('#CBD5E1');

      let y = tableTop + 25;
      doc.font('Helvetica').fontSize(9).fillColor('#333333');

      pendingList.forEach((item, index) => {
        if (y > 750) {
          doc.addPage();
          y = 50;
        }

        doc.text(`${index + 1}`, 40, y);
        doc.text(item.name || 'Resident', 65, y, { width: 120, ellipsis: true });
        doc.text(item.tenantId || 'N/A', 190, y, { width: 75, ellipsis: true });
        doc.text(`Room ${item.roomNumber}`, 270, y);
        doc.text(item.sharingType, 325, y);
        doc.text(`INR ${(item.rent || 0).toLocaleString('en-IN')}`, 410, y);
        doc.text(item.status || 'Pending', 490, y);

        y += 20;
        doc.moveTo(40, y - 5).lineTo(550, y - 5).stroke('#E2E8F0');
      });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

// Helper to generate CSV string content for pending tenants report
const generatePendingTenantsCSV = (pendingList) => {
  const csvStringifier = createCsvStringifier({
    header: [
      { id: 'name', title: 'Tenant Name' },
      { id: 'tenantId', title: 'Tenant ID' },
      { id: 'roomNumber', title: 'Room Number' },
      { id: 'sharingType', title: 'Sharing Type' },
      { id: 'rent', title: 'Rent Amount (INR)' },
      { id: 'status', title: 'Status' },
      { id: 'email', title: 'Tenant Email' }
    ]
  });

  const csvData = pendingList.map(item => ({
    name: item.name,
    tenantId: item.tenantId,
    roomNumber: `Room ${item.roomNumber}`,
    sharingType: item.sharingType,
    rent: item.rent,
    status: item.status || 'Pending',
    email: item.email || 'N/A'
  }));

  const headerStr = csvStringifier.getHeaderString();
  const recordsStr = csvStringifier.stringifyRecords(csvData);
  return headerStr + recordsStr;
};

// Background worker to process and send rent reminders asynchronously (Admin Summary Only)
const processRentReminders = async (isTest = false) => {
  try {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    console.log(`\n⏰ [CRON JOB STARTED] Processing monthly pending rent summary for month: ${currentMonth} (Test Mode: ${isTest})`);

    // Synchronized calculation matching Admin Dashboard:
    // Fetch all active PG rooms & existing RentPayment records for current month
    const rooms = await Room.find().sort({ roomNumber: 1 });
    const existingPayments = await RentPayment.find({ month: currentMonth });
    const paymentMap = new Map();
    existingPayments.forEach(p => paymentMap.set(p.tenantId, p));

    const pendingListForReport = [];

    for (const room of rooms) {
      if (room.tenants && room.tenants.length > 0) {
        for (const embedded of room.tenants) {
          if (!embedded.tenantId) continue;

          let paymentDoc = paymentMap.get(embedded.tenantId);

          // If no RentPayment document exists for this month, create a Pending record
          if (!paymentDoc) {
            paymentDoc = await RentPayment.create({
              tenantId: embedded.tenantId,
              month: currentMonth,
              amountPaid: 0,
              status: 'Pending'
            });
            paymentMap.set(embedded.tenantId, paymentDoc);
          }

          // Check if status is Pending or Partial
          if (paymentDoc.status === 'Pending' || paymentDoc.status === 'Partial') {
            const sharingTypeStr = room.sharingType ? `${room.sharingType} Sharing` : 'N/A';
            const rentAmount = embedded.rent || room.rent || 0;

            const tenantItem = {
              tenantId: embedded.tenantId,
              name: embedded.name || 'Resident',
              email: embedded.email || 'N/A',
              roomNumber: room.roomNumber,
              sharingType: sharingTypeStr,
              rent: rentAmount,
              status: paymentDoc.status,
              paymentDoc
            };

            pendingListForReport.push(tenantItem);
          }
        }
      }
    }

    console.log(`📊 Found ${pendingListForReport.length} total pending/partial rent records for ${currentMonth}. Dispatching summary report to Admin.`);

    // Send Admin Email with Pending Tenant Count and PDF/CSV Report Attachments via Resend API
    const adminEmail = process.env.ADMIN_EMAIL || process.env.ADMIN_EMAILS || process.env.GOOGLEUSER || 'shivasiddamshetty26@gmail.com';
    let emailSent = false;

    if (adminEmail) {
      const adminSubject = `Monthly Pending Rent Reminders Summary — ${currentMonth}`;
      const adminMessage = `${pendingListForReport.length} tenants have pending rent payments for month ${currentMonth}.`;

      const adminHtml = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #2F2F2F; max-width: 600px; border: 1px solid #e0e0e0; border-radius: 8px; background: #ffffff;">
          <h2 style="color: #6b2c3e; margin-top: 0;">Pujyasritha's Living</h2>
          <h3 style="color: #333; margin-bottom: 10px;">Monthly Rent Pending Summary (${currentMonth})</h3>
          <p style="font-size: 15px; color: #333;">Hello Admin,</p>
          <div style="background: #FFF5F7; border-left: 4px solid #6b2c3e; padding: 15px; border-radius: 6px; margin: 15px 0; border: 1px solid #FCE7F3;">
            <p style="margin: 0; font-size: 16px; font-weight: bold; color: #6b2c3e;">
              📊 <strong>${pendingListForReport.length}</strong> tenants have pending/partial rent payments for this month.
            </p>
          </div>
          <p style="font-size: 14px; color: #475569;">
            Attached to this email is the official <strong>PDF report</strong> and <strong>CSV spreadsheet</strong> containing complete tenant details, room numbers, sharing types, and pending amounts.
          </p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #888; text-align: center; margin: 0;">
            Pujyasritha's Living Women's PG Automated Management System
          </p>
        </div>
      `;

      try {
        const pdfBuffer = await generatePendingTenantsPDF(pendingListForReport, currentMonth);
        const csvContent = generatePendingTenantsCSV(pendingListForReport);

        await sendEmail(
          adminEmail,
          adminSubject,
          adminMessage,
          adminHtml,
          [
            {
              filename: `Pending-Tenants-Report-${currentMonth}.pdf`,
              content: pdfBuffer,
              contentType: 'application/pdf'
            },
            {
              filename: `Pending-Tenants-Report-${currentMonth}.csv`,
              content: csvContent,
              contentType: 'text/csv'
            }
          ]
        );
        emailSent = true;
        console.log(`📧 Admin summary email & PDF/CSV attachments sent via Resend API to (${adminEmail}): "${adminMessage}"`);
      } catch (adminErr) {
        console.error("❌ Failed to send admin reminder summary email & attachments:", adminErr.message);
      }
    }

    console.log(`🏁 [CRON JOB COMPLETED] Pending Tenants Count: ${pendingListForReport.length}, Admin Summary Delivered: ${emailSent}\n`);
  } catch (error) {
    console.error("❌ Critical error in processRentReminders background job:", error);
  }
};

// API Handler: POST /api/send-rent-reminders
const sendRentReminders = async (req, res) => {
  try {
    // 1. Secured API Key Validation
    const apiKey = req.headers['x-api-key'];
    const expectedSecret = process.env.CRON_SECRET;

    if (!expectedSecret || apiKey !== expectedSecret) {
      return res.status(401).send("Unauthorized");
    }

    // 2. Last Day Logic & Local Testing Support
    const isTest = req.query.test === 'true';
    if (!isTest && !isLastDayOfMonth()) {
      return res.send("Not last day");
    }

    // 3. Non-blocking Immediate Response
    res.send("Triggered");

    // 4. Background Execution
    setImmediate(() => {
      processRentReminders(isTest).catch(err => {
        console.error("Uncaught background reminder error:", err);
      });
    });
  } catch (error) {
    console.error("Error in sendRentReminders controller:", error);
    if (!res.headersSent) {
      res.status(500).send("Internal Server Error");
    }
  }
};

module.exports = {
  sendRentReminders,
  processRentReminders,
  isLastDayOfMonth
};
