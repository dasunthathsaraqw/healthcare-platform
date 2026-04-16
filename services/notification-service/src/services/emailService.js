// src/services/emailService.js
const nodemailer = require('nodemailer');

// ─── Transporter Setup ────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ─── Shared Brand Styles ──────────────────────────────────────────────────────
const BRAND_COLOR = '#2563eb';   // blue-600
const BRAND_NAME  = 'Smart Healthcare Platform';

/**
 * Injects the email into a shared, branded HTML shell.
 * Keeps all emails consistent — change the shell once, affects all templates.
 */
const buildHtmlEmail = ({ previewText, title, bodyHtml, ctaText, ctaUrl }) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,sans-serif;">

  <!-- Preview text (hidden, shows in inbox preview) -->
  <span style="display:none;font-size:1px;color:#f1f5f9;max-height:0;overflow:hidden;">${previewText}</span>

  <!-- Outer wrapper -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td align="center" style="padding:40px 16px;">

        <!-- Email card -->
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0"
          style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.08);overflow:hidden;">

          <!-- Header stripe -->
          <tr>
            <td style="background:linear-gradient(135deg,${BRAND_COLOR} 0%,#0ea5e9 100%);padding:32px 40px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td>
                    <p style="margin:0;color:rgba(255,255,255,0.8);font-size:12px;font-weight:600;letter-spacing:2px;text-transform:uppercase;">Smart Healthcare</p>
                    <h1 style="margin:8px 0 0;color:#ffffff;font-size:24px;font-weight:800;line-height:1.3;">${title}</h1>
                  </td>
                  <td align="right" style="vertical-align:middle;">
                    <div style="width:48px;height:48px;background:rgba(255,255,255,0.2);border-radius:12px;display:inline-flex;align-items:center;justify-content:center;font-size:24px;line-height:48px;text-align:center;">🏥</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              ${bodyHtml}
            </td>
          </tr>

          ${ctaText && ctaUrl ? `
          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding:0 40px 40px;">
              <a href="${ctaUrl}"
                style="display:inline-block;padding:14px 32px;background:${BRAND_COLOR};color:#ffffff;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px;letter-spacing:0.3px;">
                ${ctaText}
              </a>
            </td>
          </tr>
          ` : ''}

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:24px 40px;">
              <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;line-height:1.6;">
                This email was sent by <strong>${BRAND_NAME}</strong>.<br/>
                If you did not expect this email, please ignore it or contact support.<br/>
                <span style="color:#cbd5e1;">© ${new Date().getFullYear()} Smart Healthcare. All rights reserved.</span>
              </p>
            </td>
          </tr>

        </table>
        <!-- /Email card -->

      </td>
    </tr>
  </table>

</body>
</html>
`;

// ─── Mock fallback ────────────────────────────────────────────────────────────
const isCredsConfigured = () =>
  !!(process.env.EMAIL_USER && process.env.EMAIL_PASS);

const mockLog = (to, subject, summary) => {
  console.log('\n' + '═'.repeat(56));
  console.log('✉️  MOCK EMAIL (no credentials configured)');
  console.log(`   To:      ${to}`);
  console.log(`   Subject: ${subject}`);
  console.log(`   Summary: ${summary}`);
  console.log('═'.repeat(56) + '\n');
};

// ─────────────────────────────────────────────────────────────────────────────
// REPORT UPLOADED EMAIL
// ─────────────────────────────────────────────────────────────────────────────

exports.sendReportUploadEmail = async (data) => {
  const subject = 'Your Medical Report Has Been Uploaded ✅';
  const previewText = `${data.reportTitle} has been securely saved to your patient portal.`;

  const bodyHtml = `
    <p style="margin:0 0 20px;font-size:16px;color:#374151;line-height:1.6;">
      Hello <strong style="color:#111827;">${data.patientName}</strong>,
    </p>
    <p style="margin:0 0 24px;font-size:15px;color:#4b5563;line-height:1.7;">
      Your medical document has been <strong>securely uploaded</strong> 
      and is now available in your patient portal.
    </p>

    <!-- Document details card -->
    <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;padding:24px;margin:0 0 28px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td style="padding:6px 0;">
            <span style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#0369a1;">Document Name</span><br/>
            <span style="font-size:16px;font-weight:600;color:#0c4a6e;">${data.reportTitle}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:12px 0 0;">
            <span style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#0369a1;">Document Type</span><br/>
            <span style="font-size:15px;color:#075985;">${data.documentType}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:12px 0 0;">
            <span style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#0369a1;">Uploaded At</span><br/>
            <span style="font-size:15px;color:#075985;">${new Date().toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })}</span>
          </td>
        </tr>
      </table>
    </div>

    <!-- Security notice -->
    <div style="background:#fefce8;border:1px solid #fde68a;border-radius:10px;padding:16px;margin:0 0 8px;">
      <p style="margin:0;font-size:13px;color:#92400e;line-height:1.5;">
        🔒 <strong>Security Notice:</strong> Your documents are encrypted and stored on 
        our secure cloud infrastructure. Only you and authorised healthcare providers can 
        access them.
      </p>
    </div>
  `;

  const html = buildHtmlEmail({
    previewText,
    title: 'Document Uploaded Successfully',
    bodyHtml,
    ctaText: 'View My Reports',
    ctaUrl: process.env.FRONTEND_URL
      ? `${process.env.FRONTEND_URL}/dashboard/reports`
      : 'http://localhost:3000/dashboard/reports',
  });

  if (!isCredsConfigured()) {
    mockLog(data.patientEmail, subject, `Report '${data.reportTitle}' uploaded.`);
    return;
  }

  const info = await transporter.sendMail({
    from: `"${BRAND_NAME}" <${process.env.EMAIL_USER}>`,
    to: data.patientEmail,
    subject,
    html,
    text: `Hello ${data.patientName}, your document '${data.reportTitle}' (${data.documentType}) has been uploaded successfully. Log in to your portal to view it.`,
  });

  console.log(`📧 Email sent to ${data.patientEmail}: ${info.messageId}`);
};

// ─────────────────────────────────────────────────────────────────────────────
// APPOINTMENT BOOKED EMAIL
// ─────────────────────────────────────────────────────────────────────────────

exports.sendAppointmentBookedEmail = async (data) => {
  const apptDate = data.dateTime
    ? new Date(data.dateTime).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })
    : 'To be confirmed';

  const subject = 'Appointment Confirmed! 📅';
  const previewText = `Your appointment with ${data.doctorName} is officially confirmed for ${apptDate}.`;

  const bodyHtml = `
    <p style="margin:0 0 20px;font-size:16px;color:#374151;line-height:1.6;">
      Hello <strong style="color:#111827;">${data.patientName || 'Patient'}</strong>,
    </p>
    <p style="margin:0 0 24px;font-size:15px;color:#4b5563;line-height:1.7;">
      Great news! Your medical appointment has been <strong>successfully booked and confirmed</strong>. 
      You can now access your meeting link and other details directly from your dashboard.
    </p>

    <!-- Appointment card -->
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:24px;margin:0 0 28px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td style="padding:6px 0;">
            <span style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#166534;">Status</span><br/>
            <span style="font-size:15px;font-weight:700;color:#16a34a;">CONFIRMED</span>
          </td>
        </tr>
        <tr>
          <td style="padding:12px 0 0;">
            <span style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#166534;">Doctor</span><br/>
            <span style="font-size:16px;font-weight:600;color:#14532d;">${data.doctorName || 'N/A'}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:12px 0 0;">
            <span style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#166534;">Date &amp; Time</span><br/>
            <span style="font-size:15px;color:#15803d;">${apptDate}</span>
          </td>
        </tr>
        ${data.reason ? `
        <tr>
          <td style="padding:12px 0 0;">
            <span style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#166534;">Reason</span><br/>
            <span style="font-size:15px;color:#15803d;">${data.reason}</span>
          </td>
        </tr>` : ''}
        ${data.meetingLink ? `
        <tr>
          <td style="padding:12px 0 0;">
            <span style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#166534;">Meeting Link</span><br/>
            <a href="${data.meetingLink}" style="font-size:14px;color:#2563eb;font-weight:600;text-decoration:underline;">Join Consultation →</a>
          </td>
        </tr>` : ''}
      </table>
    </div>

    <div style="background:#f8fafc;border-radius:10px;padding:16px;margin:0 0 8px;text-align:center;">
      <p style="margin:0;font-size:13px;color:#64748b;line-height:1.5;">
        Please log in 10 minutes before your scheduled time to prepare for your consultation.
      </p>
    </div>
  `;

  const html = buildHtmlEmail({
    previewText,
    title: 'Appointment Confirmed',
    bodyHtml,
    ctaText: 'Go to My Dashboard',
    ctaUrl: process.env.FRONTEND_URL
      ? `${process.env.FRONTEND_URL}/dashboard`
      : 'http://localhost:3000/dashboard',
  });

  if (!isCredsConfigured()) {
    mockLog(
      data.patientEmail || 'patient@example.com',
      subject,
      `Appointment with ${data.doctorName} on ${apptDate} is CONFIRMED`
    );
    return;
  }

  const info = await transporter.sendMail({
    from: `"${BRAND_NAME}" <${process.env.EMAIL_USER}>`,
    to: data.patientEmail,
    subject,
    html,
    text: `Hello ${data.patientName}, your appointment with ${data.doctorName} on ${apptDate} is officially confirmed. See you then!`,
  });

  console.log(`📧 Appointment email sent to ${data.patientEmail}: ${info.messageId}`);
};