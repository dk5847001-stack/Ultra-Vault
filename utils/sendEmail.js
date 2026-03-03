const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * sendEmail({ email, subject, message })
 * message = HTML string
 */
const sendEmail = async ({ email, subject, message }) => {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is missing in environment variables");
  }

  // ⚠️ Resend requires a valid FROM email
  // Best: use your verified domain like: no-reply@yourdomain.com
  const FROM_EMAIL = process.env.RESEND_FROM || "onboarding@resend.dev";

  const { error } = await resend.emails.send({
    from: `Ultra Vault <${FROM_EMAIL}>`,
    to: email,
    subject,
    html: message,
  });

  if (error) {
    throw new Error(error.message || "Resend email failed");
  }
};

module.exports = sendEmail;