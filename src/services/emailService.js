const nodemailer = require('nodemailer');

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send RFQ notification email to Catalogue Manager (FR-13)
 */
async function sendEnquiryNotification(enquiry, product, managerEmail) {
  if (!process.env.SMTP_USER) {
    console.log('📧 [DEV] Would send enquiry email to:', managerEmail);
    console.log('   Product:', product.name);
    console.log('   Buyer:', enquiry.buyerName, '(' + enquiry.buyerEmail + ')');
    console.log('   Quantity:', enquiry.quantity);
    return { success: true, demo: true };
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"ExportCat" <noreply@exportcat.com>',
      to: managerEmail,
      subject: `New RFQ: ${product.name} — ${enquiry.quantity} units from ${enquiry.buyerCompany || enquiry.buyerName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #0f172a, #1e293b); padding: 24px; border-radius: 12px 12px 0 0;">
            <h1 style="color: #38bdf8; margin: 0; font-size: 20px;">📦 New Request for Quotation</h1>
          </div>
          <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0;">
            <h2 style="color: #0f172a; margin-top: 0;">${product.name}</h2>
            <p style="color: #64748b;">SKU: ${product.sku}</p>
            
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
              <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Buyer Name</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">${enquiry.buyerName}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Email</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${enquiry.buyerEmail}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Company</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${enquiry.buyerCompany || 'N/A'}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Country</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${enquiry.buyerCountry || 'N/A'}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Quantity</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #059669;">${enquiry.quantity} units</td></tr>
            </table>
            
            ${enquiry.message ? `<div style="background: white; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; margin-top: 16px;"><p style="color: #64748b; margin: 0 0 8px 0; font-size: 12px;">MESSAGE</p><p style="margin: 0; color: #0f172a;">${enquiry.message}</p></div>` : ''}
          </div>
          <div style="background: #0f172a; padding: 16px; border-radius: 0 0 12px 12px; text-align: center;">
            <p style="color: #94a3b8; margin: 0; font-size: 12px;">ExportCat — B2B Export Catalogue</p>
          </div>
        </div>
      `,
    });

    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('Email send failed:', err);
    return { success: false, error: err.message };
  }
}

module.exports = { sendEnquiryNotification };
