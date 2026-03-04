const express = require("express");
const router = express.Router();
const Credential = require("../models/credential");
const authMiddleware = require("../middleware/authMiddleware");
const CryptoJS = require("crypto-js");

// Helper function for encryption
const encryptPassword = (password) => {
  return CryptoJS.AES.encrypt(
    password,
    process.env.ENC_SECRET
  ).toString();
};

// Helper function for decryption
const decryptPassword = (encryptedPassword) => {
  const bytes = CryptoJS.AES.decrypt(
    encryptedPassword,
    process.env.ENC_SECRET
  );
  return bytes.toString(CryptoJS.enc.Utf8);
};


// ==========================
// 🔐 CREATE CREDENTIAL
// ==========================
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { platform, email, password } = req.body;

    if (!platform || !email || !password) {
      return res.status(400).json({ message: "All fields required" });
    }

    const encryptedPassword = encryptPassword(password);

    const credential = await Credential.create({
      platform,
      email,
      password: encryptedPassword,
      user: req.user.id
    });

    res.status(201).json({
      message: "Credential saved successfully"
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ==========================
// 🔐 READ ALL (User Specific)
// ==========================
router.get("/", authMiddleware, async (req, res) => {
  try {
    const credentials = await Credential.find({ user: req.user.id });

    const decryptedData = credentials.map((cred) => ({
      _id: cred._id,
      platform: cred.platform,
      email: cred.email,
      password: decryptPassword(cred.password),
    }));

    res.json(decryptedData);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ==========================
// 🔐 UPDATE CREDENTIAL
// ==========================
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { platform, email, password } = req.body;

    let updateData = {};

    if (platform) updateData.platform = platform;
    if (email) updateData.email = email;
    if (password) {
      updateData.password = encryptPassword(password);
    }

    const updated = await Credential.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      updateData,
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Credential not found" });
    }

    res.json({ message: "Updated successfully" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ==========================
// 🔐 DELETE CREDENTIAL
// ==========================
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const deleted = await Credential.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id
    });

    if (!deleted) {
      return res.status(404).json({ message: "Credential not found" });
    }

    res.json({ message: "Deleted successfully" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;