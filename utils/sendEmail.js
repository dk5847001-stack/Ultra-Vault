// utils/sendEmail.js
const SibApiV3Sdk = require("sib-api-v3-sdk");

// ✅ One-time client init (performance + stability)
const client = SibApiV3Sdk.ApiClient.instance;
let isBrevoReady = false;

function initBrevo() {
  if (isBrevoReady) return;

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    throw new Error("BREVO_API_KEY missing in environment variables");
  }

  client.authentications["api-key"].apiKey = apiKey;
  isBrevoReady = true;
}

const transactionalApi = new SibApiV3Sdk.TransactionalEmailsApi();

/**
 * sendEmail({ email, subject, message })
 * message = HTML string (or plain text)
 */
const sendEmail = async ({ email, subject, message }) => {
  try {
    initBrevo();

    if (!email) throw new Error("Receiver email is required");
    if (!subject) throw new Error("Email subject is required");
    if (!message) throw new Error("Email message is required");

    const fromEmail = process.env.BREVO_FROM_EMAIL || "no-reply@example.com";
    const fromName = process.env.BREVO_FROM_NAME || "Ultra Vault";

    // If message is plain text, wrap it safely in HTML
    const htmlContent =
      typeof message === "string" && message.includes("<")
        ? message
        : `<pre style="font-family: Arial, sans-serif; white-space: pre-wrap;">${String(
            message
          )
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")}</pre>`;

    const payload = {
      sender: { email: fromEmail, name: fromName },
      to: [{ email }],
      subject,
      htmlContent,
    };

    const result = await transactionalApi.sendTransacEmail(payload);

    console.log("✅ Brevo email sent:", {
      to: email,
      messageId: result?.messageId,
    });

    return result;
  } catch (err) {
    // Brevo SDK sometimes returns rich error objects
    const brevoBody =
      err?.response?.body || err?.response?.text || err?.body || null;

    console.error("❌ Brevo sendEmail error:", {
      message: err?.message || String(err),
      status: err?.status || err?.response?.statusCode,
      brevo: brevoBody,
    });

    throw err;
  }
};

module.exports = sendEmail;