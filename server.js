require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/authRoutes");
const credentialRoutes = require("./routes/credentialRoutes");

const app = express(); // ✅ App define FIRST

// 🔐 Security Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());

// 🔒 Rate Limiter for Login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: "Too many login attempts. Try again later."
});

app.use("/auth/login", loginLimiter);

// ✅ Routes
app.use("/auth", authRoutes);
app.use("/api/credentials", credentialRoutes);

app.get("/", (req, res) => {
  res.send("🚀 Ultra-Vault API is running successfully!");
});

// 🌍 MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.log("❌ MongoDB Error:", err));

// 🚀 Dynamic PORT (RENDER REQUIRED)
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});