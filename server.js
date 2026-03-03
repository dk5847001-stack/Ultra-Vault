require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/authRoutes");
const credentialRoutes = require("./routes/credentialRoutes");

const app = express();

/* =======================================================
   🔐 TRUST PROXY (IMPORTANT FOR RENDER / EXPRESS-RATE-LIMIT)
======================================================= */
app.set("trust proxy", 1);

/* =======================================================
   🔐 SECURITY MIDDLEWARES
======================================================= */
app.use(helmet());

app.use(
  cors({
    origin: process.env.CLIENT_URL || "*",
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =======================================================
   🔒 RATE LIMITER (LOGIN PROTECTION)
======================================================= */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10,
  message: {
    success: false,
    message: "Too many login attempts. Please try again later.",
  },
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
  .then(() => {
    console.log("✅ MongoDB Connected");
  })
  .catch((err) => {
    console.error("❌ MongoDB Connection Error:", err.message);
    process.exit(1); // Stop server if DB fails
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