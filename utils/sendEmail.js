const nodemailer = require("nodemailer");

// transporter create
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

/**
 * sendEmail({ email, subject, message })
 * message = HTML string
 */
const sendEmail = async ({ email, subject, message }) => {
  try {
    const info = await transporter.sendMail({
      from: `Ultra Vault <${process.env.GMAIL_USER}>`,
      to: email,
      subject: subject,
      html: message,
    });

    console.log("✅ Email sent:", info.messageId);
    return info;
  } catch (err) {
    console.error("❌ Email send error:", err.message);
    throw err;
  }
};

module.exports = sendEmail;