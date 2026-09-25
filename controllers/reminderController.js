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

// Background worker to process and send rent reminders asynchronously
const processRentReminders = async () => {
  try {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    console.log(`\n⏰ [CRON JOB STARTED] Processing monthly rent reminders for month: ${currentMonth}`);

    // Synchronized calculation matching Admin Dashboard:
    // Fetch all active PG rooms & existing RentPayment records for current month
    const rooms = await Room.find().sort({ roomNumber: 1 });
    const existingPayments = await RentPayment.find({ month: currentMonth });
    const paymentMap = new Map();
    existingPayments.forEach(p => paymentMap.set(p.tenantId, p));

    const pendingListForReport = [];
    const eligiblePaymentsToNotify = [];

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
              email: embedded.email || null,
              roomNumber: room.roomNumber,
              sharingType: sharingTypeStr,
              rent: rentAmount,
              status: paymentDoc.status,
              paymentDoc
            };

            pendingListForReport.push(tenantItem);

            // Check if reminder was NOT already sent for current month
            if (paymentDoc.reminderSentMonth !== currentMonth) {
              eligiblePaymentsToNotify.push(tenantItem);
            }
          }
        }
      }
    }

    console.log(`📊 Found ${pendingListForReport.length} total pending/partial rent records for ${currentMonth}. ${eligiblePaymentsToNotify.length} eligible for reminder notifications.`);

    let sentCount = 0;
    let failCount = 0;

    for (const item of eligiblePaymentsToNotify) {
      if (!item.email) {
        console.warn(`⚠️ Skipping tenant ID ${item.tenantId}: No registered email address found.`);
        await NotificationLog.create({
          tenantId: item.tenantId,
          tenantName: item.name,
          email: 'N/A',
          status: 'FAILED',
          message: 'No registered email address found'
        });
        failCount++;
        continue;
      }

      const subject = "Rent Payment Reminder - Pujyasritha's Living";
      const plainTextMessage = `Hello ${item.name}, kindly pay the room rent for this month as soon as possible.\n\nRoom Details:\n- Room Number: Room ${item.roomNumber}\n- Sharing Type: ${item.sharingType}\n- Monthly Rent: ₹${item.rent.toLocaleString('en-IN')}`;

      const htmlMessage = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #2F2F2F; max-width: 600px; border: 1px solid #e0e0e0; border-radius: 8px; background: #ffffff;">
          <h2 style="color: #6C63FF; margin-top: 0;">Pujyasritha's Living</h2>
          <p style="font-size: 16px; line-height: 1.5; color: #333;">
            Hello <strong>${item.name}</strong>, kindly pay the room rent for this month as soon as possible.
          </p>
          <div style="background: #F8FAFC; padding: 15px; border-left: 4px solid #6C63FF; border-radius: 6px; margin: 15px 0; border: 1px solid #E2E8F0;">
            <h3 style="margin: 0 0 10px 0; font-size: 15px; color: #475569;">📋 Room & Rent Details</h3>
            <p style="margin: 4px 0; font-size: 14px; color: #334155;"><strong>Room Number:</strong> Room ${item.roomNumber}</p>
            <p style="margin: 4px 0; font-size: 14px; color: #334155;"><strong>Sharing Type:</strong> ${item.sharingType}</p>
            <p style="margin: 4px 0; font-size: 14px; color: #334155;"><strong>Monthly Rent:</strong> ₹${item.rent.toLocaleString('en-IN')}</p>
          </div>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #888; text-align: center; margin: 0;">
            Pujyasritha's Living Women's PG Management System
          </p>
        </div>
      `;

      try {
        await sendEmail(item.email, subject, plainTextMessage, htmlMessage);

        // Update reminderSentMonth on the RentPayment document
        item.paymentDoc.reminderSentMonth = currentMonth;
        await item.paymentDoc.save();

        await NotificationLog.create({
          tenantId: item.tenantId,
          tenantName: item.name,
          email: item.email,
          status: 'SENT',
          message: plainTextMessage
        });

        sentCount++;
        console.log(`✅ Rent reminder sent to ${item.name} (${item.email})`);
      } catch (sendErr) {
        console.error(`❌ Error sending rent reminder email to ${item.email}:`, sendErr.message);
        await NotificationLog.create({
          tenantId: item.tenantId,
          tenantName: item.name,
          email: item.email,
          status: 'FAILED',
          message: sendErr.message
        });
        failCount++;
      }

      // Rate Limiting: 300ms delay between consecutive emails
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // Send Admin Email with Pending Tenant Count and PDF/CSV Report Attachments
    const adminEmail = process.env.ADMIN_EMAIL || process.env.ADMIN_EMAILS || process.env.GOOGLEUSER;
    if (adminEmail) {
      const adminSubject = `Monthly Pending Rent Reminders Summary — ${currentMonth}`;
      const adminMessage = `${pendingListForReport.length} tenants have pending rent payments for month ${currentMonth}.`;

      const adminHtml = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #2F2F2F; max-width: 600px; border: 1px solid #e0e0e0; border-radius: 8px; background: #ffffff;">
          <h2 style="color: #6C63FF; margin-top: 0;">Pujyasritha's Living</h2>
          <h3 style="color: #333; margin-bottom: 10px;">Monthly Rent Reminders Summary (${currentMonth})</h3>
          <p style="font-size: 15px; color: #333;">Hello Admin,</p>
          <div style="background: #F8FAFC; border-left: 4px solid #6C63FF; padding: 15px; border-radius: 6px; margin: 15px 0;">
            <p style="margin: 0; font-size: 16px; font-weight: bold; color: #1E293B;">
              📊 <strong>${pendingListForReport.length}</strong> tenants have pending rent payments for this month.
            </p>
            <p style="margin: 6px 0 0 0; font-size: 14px; color: #64748B;">
              Reminders Dispatched This Run: ${sentCount}
            </p>
          </div>
          <p style="font-size: 14px; color: #475569;">
            Attached to this email is the official <strong>PDF document</strong> and <strong>CSV spreadsheet</strong> detailing all residents with pending/partial rent payments.
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
        console.log(`📧 Admin summary email & PDF/CSV attachments sent to (${adminEmail}): "${adminMessage}"`);
      } catch (adminErr) {
        console.error("❌ Failed to send admin reminder summary email & attachments:", adminErr.message);
      }
    }

    console.log(`🏁 [CRON JOB COMPLETED] Sent: ${sentCount}, Failed/Skipped: ${failCount}\n`);
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
      processRentReminders().catch(err => {
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
