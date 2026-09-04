const express = require("express");
const router = express.Router();
const db = require("../firebase");
const adminAuth = require("../middleware/adminAuth");

/* ---------- CREATE ORDER ---------- */
router.post("/", async (req, res) => {
  const { productId, quantity } = req.body;

  const productRef = db.collection("products").doc(productId);
  const productSnap = await productRef.get();

  if (!productSnap.exists) {
    return res.status(404).json({ error: "Product not found" });
  }

  await db.collection("orders").add({
    productId,
    productName: productSnap.data().name,
    quantity,
    status: "pending",
    createdAt: new Date()
  });

  res.json({ success: true });
});

/* ---------- ADMIN: GET ORDERS ---------- */
router.get("/", adminAuth, async (req, res) => {
  const snap = await db.collection("orders")
    .orderBy("createdAt", "desc")
    .get();

  res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
});

/* ---------- ADMIN: UPDATE STATUS (FIXED) ---------- */
router.patch("/:id/status", adminAuth, async (req, res) => {
  const { status } = req.body;

  try {
    const orderRef = db.collection("orders").doc(req.params.id);

    await db.runTransaction(async (t) => {
      const orderSnap = await t.get(orderRef);
      if (!orderSnap.exists) throw new Error("Order not found");

      const order = orderSnap.data();

      // Reduce stock ONLY when confirming
      if (status === "confirmed" && order.status !== "confirmed") {
        const productRef = db.collection("products").doc(order.productId);
        const productSnap = await t.get(productRef);

        if (!productSnap.exists) throw new Error("Product not found");

        const currentStock = productSnap.data().stock;

        if (currentStock < order.quantity) {
          throw new Error("Insufficient stock");
        }

        t.update(productRef, {
          stock: currentStock - order.quantity
        });
      }

      t.update(orderRef, { status });
    });

    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
