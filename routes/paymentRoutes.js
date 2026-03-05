const express = require("express");
const crypto = require("crypto");
const Razorpay = require("razorpay");
const router = express.Router();
const requireAuth = require("../middleware/requireAuth");

const User = require("../models/User");



const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ✅ Create Order (server-side) :contentReference[oaicite:2]{index=2}
router.post("/create-order", requireAuth, async (req, res) => {
  try {
    const amountInRupees = 99;

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
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: "Missing fields" });
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expected !== razorpay_signature) {
      return res.status(400).json({ success: false, message: "Invalid signature" });
    }

    // ✅ Mark user as paid/unlocked
    await User.findByIdAndUpdate(req.userId, { adminPaid: true });

    return res.json({ success: true, message: "Admin access unlocked" });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;