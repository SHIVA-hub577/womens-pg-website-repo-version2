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
        <div style="background-color: #faf4f5; padding: 40px 15px; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
          <div style="max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(107, 44, 62, 0.08); border: 1px solid #f3e8eb;">
            
            <!-- Premium Header Banner -->
            <div style="background: linear-gradient(135deg, #6b2c3e 0%, #4a1d2a 100%); padding: 35px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 0.5px; font-family: 'Georgia', serif;">Pujyasritha's Living</h1>
              <p style="color: #fce7f3; margin: 6px 0 0 0; font-size: 13px; letter-spacing: 1px; text-transform: uppercase; opacity: 0.9;">Administrative Operations Report</p>
            </div>

            <!-- Main Body Card -->
            <div style="padding: 35px 30px;">
              <div style="margin-bottom: 20px;">
                <h2 style="color: #6b2c3e; margin: 0; font-size: 20px; font-weight: 700; font-family: 'Georgia', serif;">Monthly Rent Pending Summary</h2>
                <span style="display: inline-block; margin-top: 6px; background: #fff5f7; color: #6b2c3e; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 20px; border: 1px solid #fce7f3;">Cycle: ${currentMonth}</span>
              </div>

              <p style="font-size: 15px; color: #475569; line-height: 1.6; margin-top: 0;">
                Hello <strong>Administrator</strong>,
              </p>

              <!-- Key Stat Highlight Card -->
              <div style="background: linear-gradient(135deg, #fff5f7 0%, #fff0f3 100%); border: 1px solid #fbcfe8; padding: 20px; border-radius: 12px; margin: 25px 0;">
                <div style="font-size: 36px; font-weight: 800; color: #6b2c3e; font-family: 'Georgia', serif;">
                  ${pendingListForReport.length}
                </div>
                <div style="font-size: 14px; font-weight: 700; color: #6b2c3e; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px;">Pending Rent Records</div>
                <div style="font-size: 13px; color: #881337; margin-top: 4px;">Residents with pending or partial rent payments for billing cycle ${currentMonth}</div>
              </div>

              <p style="font-size: 14px; color: #475569; line-height: 1.6;">
                Attached to this automated system dispatch are the official accounting documents:
              </p>

              <ul style="padding-left: 20px; font-size: 14px; color: #334155; line-height: 1.8;">
                <li>📄 <strong>PDF Official Report</strong> (<code>Pending-Tenants-Report-${currentMonth}.pdf</code>)</li>
                <li>📊 <strong>CSV Spreadsheet Data</strong> (<code>Pending-Tenants-Report-${currentMonth}.csv</code>)</li>
              </ul>

              <!-- Footer Badge -->
              <div style="margin-top: 35px; padding-top: 20px; border-top: 1px solid #f1f5f9; text-align: center;">
                <span style="display: inline-block; background: #faf4f5; color: #6b2c3e; font-size: 12px; font-weight: 600; padding: 6px 16px; border-radius: 20px; border: 1px solid #fce7f3;">Automated Financial Audit System</span>
              </div>
            </div>

            <!-- Footer -->
            <div style="background-color: #fdf2f4; padding: 20px 30px; text-align: center; border-top: 1px solid #fce7f3;">
              <p style="font-size: 12px; color: #94a3b8; margin: 0; line-height: 1.5;">
                © 2026 Pujyasritha's Living Women's PG & Hostel Management Portal.<br/>
                Confidential Internal Administrative Communication.
              </p>
            </div>
          </div>
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
