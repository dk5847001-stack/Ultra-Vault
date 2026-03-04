const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false, // STARTTLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },

  // ✅ timeouts to avoid hanging
  connectionTimeout: 20000,
  greetingTimeout: 20000,
  socketTimeout: 20000,

  // ✅ sometimes needed on cloud
  tls: {
    rejectUnauthorized: true,
  },
});

const sendEmail = async ({ email, subject, message }) => {
  try {
    // ✅ optional: verify connection once (helps debug)
    await transporter.verify();

    const info = await transporter.sendMail({
      from: `Ultra Vault <${process.env.SMTP_USER}>`,
      to: email,
      subject,
      html: message,
    });

    console.log("✅ Email sent:", info.messageId);
    return info;
  } catch (err) {
    console.error("❌ Email error:", err.message);
    throw err;
  }
};

module.exports = sendEmail;