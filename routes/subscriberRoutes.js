// routes/subscriberRoutes.js
const express = require("express");
const router = express.Router();
const Subscriber = require("../models/Subscriber");

// ✅ CREATE
router.post("/", async (req, res) => {
  try {
    const { email, message } = req.body || {};
    if (!email || !message) {
      return res.status(400).json({ success: false, message: "Email & message required" });
    }
    const saved = await Subscriber.create({ email, message });
    return res.status(201).json({ success: true, message: "Saved", data: saved });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ LIST
router.get("/", async (req, res) => {
  try {
    const list = await Subscriber.find().sort({ createdAt: -1 });
    return res.json({ success: true, data: list });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ DELETE (NEW)
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Subscriber.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: "Not found" });
    return res.json({ success: true, message: "Deleted" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ EXPORT CSV (NEW)
router.get("/export/csv", async (req, res) => {
  try {
    const list = await Subscriber.find().sort({ createdAt: -1 });

    const escape = (v = "") => `"${String(v).replace(/"/g, '""')}"`;
    const header = ["createdAt", "email", "message"].join(",");
    const rows = list.map((x) =>
      [x.createdAt?.toISOString?.() || "", x.email || "", x.message || ""]
        .map(escape)
        .join(",")
    );

    const csv = [header, ...rows].join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=subscribers.csv");
    return res.send(csv);
  } catch (err) {
    return res.status(500).send("CSV export failed");
  }
});

module.exports = router;















// **************************************************************************
// const express = require("express");
// const router = express.Router();
// const Subscriber = require("../models/Subscriber");

// // save subscriber
// router.post("/", async (req, res) => {
//   try {
//     const { email, message } = req.body;

//     const newSub = new Subscriber({
//       email,
//       message
//     });

//     await newSub.save();

//     res.json({
//       success: true,
//       message: "Subscriber saved"
//     });

//   } catch (err) {
//     res.status(500).json({
//       success: false,
//       message: err.message
//     });
//   }
// });

// // get subscribers
// router.get("/", async (req, res) => {
//   const data = await Subscriber.find().sort({ createdAt: -1 });
//   res.json(data);
// });

// module.exports = router;