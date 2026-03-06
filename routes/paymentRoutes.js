const express = require("express");
const crypto = require("crypto");
const Razorpay = require("razorpay");
const router = express.Router();
const requireAuth = require("../middleware/requireAuth");

const PDFDocument = require("pdfkit");
const Payment = require("../models/Payment");
const User = require("../models/User");




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

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);

    doc.fontSize(22).text("Ultra Vault", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(14).text("Payment Receipt", { align: "center" });
    doc.moveDown(2);

    doc.fontSize(12).text(`Receipt No: ${payment.receiptNo}`);
    doc.text(`Payment ID: ${payment.razorpayPaymentId}`);
    doc.text(`Order ID: ${payment.razorpayOrderId}`);
    doc.text(`Name: ${payment.name}`);
    doc.text(`Email: ${payment.email}`);
    doc.text(`Plan: ${payment.plan}`);
    doc.text(`Amount: ₹${payment.amount}`);
    doc.text(`Currency: ${payment.currency}`);
    doc.text(`Status: ${payment.status}`);
    doc.text(`Date: ${new Date(payment.createdAt).toLocaleString()}`);

    doc.moveDown(2);
    doc.text("Thank you for your payment.", { align: "center" });
    doc.text("Your Ultra Vault premium/admin access has been activated.", {
      align: "center",
    });

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