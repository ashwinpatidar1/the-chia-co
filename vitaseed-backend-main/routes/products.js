const express = require("express");
const router = express.Router();
const db = require("../firebase");
const adminAuth = require("../middleware/adminAuth");

const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const admin = require("firebase-admin");

/* ---------- CLOUDINARY CONFIG ---------- */
cloudinary.config({
  cloud_name: "djpofixkx",
  api_key: "185376588727942",
  api_secret: "-U8lcR1bG5tgo_s86n1jRGbQSBg"
});

/* ---------- MULTER ---------- */
const upload = multer({ storage: multer.memoryStorage() });

/* ---------- PUBLIC: GET ACTIVE PRODUCTS ---------- */
router.get("/", async (req, res) => {
  try {
    const snap = await db.collection("products")
      .orderBy("createdAt", "desc")
      .get();

    const products = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(p => p.isActive !== false);

    res.json(products);
  } catch (err) {
    console.error("GET PRODUCTS ERROR:", err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

/* ---------- ADMIN: GET ALL PRODUCTS ---------- */
router.get("/admin", adminAuth, async (req, res) => {
  try {
    const snap = await db.collection("products")
      .orderBy("createdAt", "desc")
      .get();

    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (err) {
    console.error("GET ADMIN PRODUCTS ERROR:", err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

/* ---------- ADMIN: ADD PRODUCT ---------- */
router.post("/", adminAuth, async (req, res) => {
  try {
    const { name, price, stock, image } = req.body;

    await db.collection("products").add({
      name,
      price,
      stock,
      image: image || "",
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ success: true });

  } catch (err) {
    console.error("ADD PRODUCT ERROR:", err);
    res.status(500).json({ error: "Failed to add product" });
  }
});

/* ---------- ADMIN: UPDATE PRODUCT ---------- */
router.put("/:id", adminAuth, async (req, res) => {
  try {
    await db.collection("products").doc(req.params.id).update(req.body);
    res.json({ success: true });
  } catch (err) {
    console.error("UPDATE PRODUCT ERROR:", err);
    res.status(500).json({ error: "Failed to update product" });
  }
});

/* ---------- ADMIN: TOGGLE ACTIVE ---------- */
router.patch("/:id/toggle", adminAuth, async (req, res) => {
  try {
    const ref = db.collection("products").doc(req.params.id);
    const snap = await ref.get();

    await ref.update({ isActive: !snap.data().isActive });

    res.json({ success: true });
  } catch (err) {
    console.error("TOGGLE ERROR:", err);
    res.status(500).json({ error: "Failed to toggle" });
  }
});

/* ---------- ADMIN: UPLOAD IMAGE (CLOUDINARY) ---------- */
router.post("/upload", adminAuth, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { folder: "vitaseed" },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(req.file.buffer);
    });

    res.json({ url: result.secure_url });

  } catch (err) {
    console.error("CLOUDINARY ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
