const express = require("express");
const crypto = require("crypto");
const Razorpay = require("razorpay");
const router = express.Router();
const requireAuth = require("../middleware/requireAuth");

const PDFDocument = require("pdfkit");
const Payment = require("../models/Payment");
const User = require("../models/User");

const path = require("path");
const fs = require("fs");



const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ✅ Create Order (server-side)
router.post("/create-order", requireAuth, async (req, res) => {
  try {
    const amountInRupees = 1; // ₹100 for testing, change as needed

    // ✅ Unique receipt/order id (for tracking)

    const shortUser = String(req.userId).slice(-6);
    const receipt = `adm_${shortUser}_${Date.now()}`;

    const order = await razorpay.orders.create({
      amount: amountInRupees * 100,
      currency: "INR",
      receipt,
      notes: { purpose: "ADMIN_ACCESS", userId: req.userId },
    });

    return res.json({ success: true, order });
  } catch (e) {
    console.log("❌ Razorpay create-order error:", e?.error || e);
    return res.status(500).json({
      success: false,
      message: e?.error?.description || e?.message || "Order failed",
    });
  }
});

// ✅ Verify Payment Signature (mandatory) :contentReference[oaicite:3]{index=3}
router.post("/verify", requireAuth, async (req, res) => {
  try {
    console.log("VERIFY BODY:", req.body);

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Missing fields",
        got: req.body
      });
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;

    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expected !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Invalid signature"
      });
    }

    await User.findByIdAndUpdate(req.userId, { adminPaid: true });

    const user = await User.findById(req.userId).select("name email");

    const existingPayment = await Payment.findOne({
      razorpayPaymentId: razorpay_payment_id,
    });

    if (!existingPayment) {
      await Payment.create({
        user: req.userId,
        name: user?.name || "",
        email: user?.email || "",
        plan: "Admin Access",
        amount: 1,
        currency: "INR",
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        status: "success",
        receiptNo: `UV-${Date.now()}`,
      });
    }

    return res.json({
      success: true,
      message: "Admin access unlocked",
      paymentId: razorpay_payment_id
    });

  } catch (e) {
    console.log("VERIFY ERROR:", e);
    return res.status(500).json({
      success: false,
      message: e.message
    });
  }
});

router.get("/receipt/:paymentId", requireAuth, async (req, res) => {
  try {
    const payment = await Payment.findOne({
      razorpayPaymentId: req.params.paymentId,
      user: req.userId,
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Receipt not found",
      });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=receipt-${payment.receiptNo}.pdf`
    );

    const doc = new PDFDocument({
  size: "A4",
  margin: 40,
});

doc.pipe(res);

const pageWidth = doc.page.width;
const pageHeight = doc.page.height;

// logo path
const logoPath = path.join(__dirname, "../assets/logo.png");
const hasLogo = fs.existsSync(logoPath);

// Background
doc.rect(0, 0, pageWidth, pageHeight).fill("#f4f7fb");

// Top header
doc.rect(0, 0, pageWidth, 110).fill("#0f172a");

// Logo or fallback icon
if (hasLogo) {
  doc.image(logoPath, 45, 25, {
    fit: [50, 50],
    align: "center",
    valign: "center",
  });
} else {
  doc.roundedRect(45, 30, 42, 42, 10).fill("#2563eb");
  doc
    .fillColor("#ffffff")
    .font("Helvetica-Bold")
    .fontSize(18)
    .text("UV", 53, 42, { width: 25, align: "center" });
}

// Brand title
doc
  .fillColor("#ffffff")
  .font("Helvetica-Bold")
  .fontSize(24)
  .text("Ultra Vault", 110, 34);

doc
  .fillColor("#cbd5e1")
  .font("Helvetica")
  .fontSize(11)
  .text("Secure Payment Receipt", 111, 64);

// Status pill
doc.roundedRect(pageWidth - 170, 35, 125, 32, 16).fill("#1e293b");
doc
  .fillColor("#93c5fd")
  .font("Helvetica-Bold")
  .fontSize(11)
  .text("PAYMENT SUCCESS", pageWidth - 160, 45, {
    width: 105,
    align: "center",
  });

// Main card
doc.roundedRect(35, 130, pageWidth - 70, 610, 20).fill("#ffffff");

// Card heading
doc
  .fillColor("#0f172a")
  .font("Helvetica-Bold")
  .fontSize(22)
  .text("Payment Receipt", 55, 160);

doc
  .fillColor("#64748b")
  .font("Helvetica")
  .fontSize(11)
  .text("This receipt confirms your successful Ultra Vault payment.", 55, 190);

// Amount card
doc.roundedRect(pageWidth - 225, 150, 150, 80, 16).fill("#eff6ff");
doc
  .fillColor("#2563eb")
  .font("Helvetica")
  .fontSize(11)
  .text("AMOUNT PAID", pageWidth - 195, 168, {
    width: 90,
    align: "center",
  });

doc
  .fillColor("#0f172a")
  .font("Helvetica-Bold")
  .fontSize(24)
  .text(`INR ${Number(payment.amount || 0).toFixed(2)}`, pageWidth - 205, 190, {
    width: 110,
    align: "center",
  });

// Divider
doc
  .moveTo(55, 250)
  .lineTo(pageWidth - 55, 250)
  .strokeColor("#e2e8f0")
  .lineWidth(1)
  .stroke();

// Row helper
const drawRow = (label, value, y) => {
  doc
    .fillColor("#64748b")
    .font("Helvetica-Bold")
    .fontSize(11)
    .text(label, 60, y, { width: 140 });

  doc
    .fillColor("#111827")
    .font("Helvetica")
    .fontSize(12)
    .text(String(value || "-"), 200, y, { width: 320 });
};

drawRow("Receipt No", payment.receiptNo, 275);
drawRow("Payment ID", payment.razorpayPaymentId, 305);
drawRow("Order ID", payment.razorpayOrderId, 335);
drawRow("Customer Name", payment.name, 365);
drawRow("Email Address", payment.email, 395);
drawRow("Plan", payment.plan, 425);
drawRow("Currency", payment.currency, 455);
drawRow("Status", payment.status.toUpperCase(), 485);
drawRow("Paid On", new Date(payment.createdAt).toLocaleString(), 515);

// Success badge
doc.roundedRect(pageWidth - 180, 470, 95, 30, 15).fill("#dcfce7");
doc
  .fillColor("#166534")
  .font("Helvetica-Bold")
  .fontSize(11)
  .text("SUCCESS", pageWidth - 165, 480, {
    width: 65,
    align: "center",
  });

// Thank you box
doc.roundedRect(55, 570, pageWidth - 110, 95, 16).fill("#f8fafc");
doc
  .fillColor("#0f172a")
  .font("Helvetica-Bold")
  .fontSize(14)
  .text("Thank you for your payment! Best Regards: Dilkhush", 75, 595);

doc
  .fillColor("#475569")
  .font("Helvetica")
  .fontSize(11)
  .text(
    "Your Ultra Vault premium/admin access has been activated successfully. Please keep this receipt for your records.",
    75,
    620,
    {
      width: pageWidth - 150,
      align: "left",
      lineGap: 3,
    }
  );

// Footer
doc
  .fillColor("#94a3b8")
  .font("Helvetica")
  .fontSize(9)
  .text(
    "Generated securely by Ultra Vault • This is a system-generated receipt automatically by Dilkhush Kumar.",
    0,
    pageHeight - 40,
    { align: "center" }
  );

doc.end();
  } catch (err) {
    console.error("Receipt PDF error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to generate receipt PDF",
    });
  }
});

module.exports = router;