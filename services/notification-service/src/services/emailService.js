// src/services/emailService.js
const nodemailer = require('nodemailer');

// Set up the transporter (Connects to Gmail/SMTP)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

exports.sendReportUploadEmail = async (data) => {
  try {
    const mailOptions = {
      from: '"Smart Healthcare Platform" <noreply@healthcare.com>',
      to: data.patientEmail,
      subject: 'Medical Report Uploaded Successfully ✅',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <h2 style="color: #2c3e50;">Hello ${data.patientName},</h2>
          <p>Your medical document (<strong>${data.reportTitle}</strong>) has been securely uploaded to your patient portal.</p>
          <p><strong>Document Type:</strong> ${data.documentType}</p>
          <p>You can log in to your dashboard at any time to view or download this report.</p>
          <hr style="border: none; border-top: 1px solid #e0e0e0;">
          <p style="color: #7f8c8d; font-size: 12px;">Thank you for using our Smart Healthcare Platform.</p>
        </div>
      `
    };

    // PRO-TIP: If you haven't set up real email credentials yet, we simulate it in the console!
    // This is perfect for University Demos so you don't get blocked by Gmail security rules.
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log('\n=========================================');
      console.log('✉️ MOCK EMAIL GENERATED (No Credentials Provided)');
      console.log(`To: ${data.patientEmail}`);
      console.log(`Subject: ${mailOptions.subject}`);
      console.log(`Body: Medical report '${data.reportTitle}' uploaded.`);
      console.log('=========================================\n');
      return;
    }

    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Real Email sent successfully to ${data.patientEmail}: ${info.messageId}`);
    
  } catch (error) {
    console.error('❌ Error sending email:', error);
  }
};