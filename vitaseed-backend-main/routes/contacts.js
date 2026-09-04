const express = require("express");
const router = express.Router();
const db = require("../firebase");
const adminAuth = require("../middleware/adminAuth");

/* CREATE */
router.post("/", async (req, res) => {
  await db.collection("contacts").add({
    ...req.body,
    createdAt: new Date()
  });
  res.json({ success: true });
});

/* ADMIN: GET */
router.get("/", adminAuth, async (req, res) => {
  const snap = await db.collection("contacts").get();
  res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
});

/* ADMIN: DELETE */
router.delete("/:id", adminAuth, async (req, res) => {
  await db.collection("contacts").doc(req.params.id).delete();
  res.json({ success: true });
});

module.exports = router;
