require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");

const authRoutes = require("./routes/authRoutes");
const credentialRoutes = require("./routes/credentialRoutes");

const app = express();

/* =======================================================
   🔐 TRUST PROXY (RENDER SAFE)
======================================================= */
app.set("trust proxy", 1); // ✅ IMPORTANT for Render

/* =======================================================
   🔐 SECURITY MIDDLEWARES
======================================================= */
app.use(helmet());

app.use(
  cors({
    origin: "*", 
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =======================================================
   🔒 SAFE RATE LIMITER (FIXED VERSION)
======================================================= */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  // ❌ keyGenerator remove kar diya
});

app.use("/auth/login", loginLimiter);

/* =======================================================
   🚀 ROUTES
======================================================= */
app.use("/auth", authRoutes);
app.use("/api/credentials", credentialRoutes);

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "🚀 Ultra-Vault API is running successfully!",
  });
});

/* =======================================================
   🌍 DATABASE CONNECTION
======================================================= */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => {
    console.error("❌ MongoDB Error:", err.message);
  });

/* =======================================================
   🚀 START SERVER
======================================================= */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("=====================================");
  console.log(`🚀 Server running on port ${PORT}`);
  console.log("=====================================");
});