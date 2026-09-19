require("dotenv").config();

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("./db/database");
const admin = db.admin;

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 700 * 1024 },
  fileFilter: (req, file, callback) =>
    callback(
      null,
      ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype),
    ),
});

if (!JWT_SECRET) throw new Error("JWT_SECRET is required");

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.static(__dirname));

function authenticateToken(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Access token required" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (error) {
    res.status(403).json({ message: "Invalid or expired token" });
  }
}

function productResponse(snapshot) {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    name: data.name || "",
    description: data.description || data.blurb || "",
    price: Number(data.price || 0),
    size: data.size || "",
    stock: Number(data.stock ?? 0),
    featured: Boolean(data.featured),
    image: Boolean(data.imageData || data.image),
    isActive: data.isActive !== false,
  };
}

function timestampValue(value) {
  if (!value) return new Date().toISOString();
  return typeof value.toDate === "function"
    ? value.toDate().toISOString()
    : new Date(value).toISOString();
}

app.get("/", (req, res) => res.json({ status: "VitaSeed API running" }));

app.get("/api/products", async (req, res) => {
  try {
    const snapshot = await db.collection("products").get();
    res.json(
      snapshot.docs.map(productResponse).filter((product) => product.isActive),
    );
  } catch (error) {
    console.error("Products fetch error:", error);
    res.status(500).json({ message: "Database error" });
  }
});

app.get("/api/products/:id/image", async (req, res) => {
  try {
    const snapshot = await db.collection("products").doc(req.params.id).get();
    if (!snapshot.exists) return res.status(404).send("Product not found");
    const data = snapshot.data();
    if (typeof data.image === "string" && data.image.startsWith("http"))
      return res.redirect(data.image);
    if (!data.imageData) return res.status(404).send("Image not found");
    res
      .type(data.imageType || "image/jpeg")
      .send(Buffer.from(data.imageData, "base64"));
  } catch (error) {
    console.error("Image fetch error:", error);
    res.status(500).send("Failed to load image");
  }
});

app.post("/api/products", upload.single("image"), async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ message: "Product image is required" });
    const ref = await db.collection("products").add({
      name: req.body.name,
      description: req.body.description || "",
      price: Number(req.body.price),
      size: req.body.size || "",
      stock: Number(req.body.stock || 0),
      featured: req.body.featured === "true",
      imageData: req.file.buffer.toString("base64"),
      imageType: req.file.mimetype,
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    res
      .status(201)
      .json({ message: "Product added successfully", productId: ref.id });
  } catch (error) {
    console.error("Product creation error:", error);
    res.status(500).json({ message: "Failed to add product" });
  }
});

app.put("/api/products/:id", async (req, res) => {
  try {
    const ref = db.collection("products").doc(req.params.id);
    if (!(await ref.get()).exists)
      return res.status(404).json({ message: "Product not found" });
    await ref.update({
      name: req.body.name,
      description: req.body.description || "",
      price: Number(req.body.price),
      size: req.body.size || "",
      stock: Number(req.body.stock || 0),
      featured: Boolean(req.body.featured),
    });
    res.json({ message: "Product updated successfully" });
  } catch (error) {
    console.error("Product update error:", error);
    res.status(500).json({ message: "Failed to update product" });
  }
});

app.delete("/api/products/:id", async (req, res) => {
  try {
    const ref = db.collection("products").doc(req.params.id);
    if (!(await ref.get()).exists)
      return res.status(404).json({ message: "Product not found" });
    await ref.delete();
    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Product deletion error:", error);
    res.status(500).json({ message: "Failed to delete product" });
  }
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password, phone, address } = req.body;
    if (!name || !email || !password)
      return res
        .status(400)
        .json({ message: "Name, email and password are required" });
    const normalizedEmail = email.toLowerCase();
    const existing = await db
      .collection("users")
      .where("email", "==", normalizedEmail)
      .limit(1)
      .get();
    if (!existing.empty)
      return res.status(409).json({ message: "Email already registered" });
    const ref = db.collection("users").doc();
    await ref.set({
      name,
      email: normalizedEmail,
      password: await bcrypt.hash(password, 10),
      phone: phone || "",
      address: address || "",
      role: "customer",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    res
      .status(201)
      .json({ message: "User registered successfully", userId: ref.id });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const email = String(req.body.email || "").toLowerCase();
    const snapshot = await db
      .collection("users")
      .where("email", "==", email)
      .limit(1)
      .get();
    if (
      snapshot.empty ||
      !(await bcrypt.compare(
        req.body.password || "",
        snapshot.docs[0].data().password,
      ))
    )
      return res.status(401).json({ message: "Invalid email or password" });
    const user = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" },
    );
    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

app.get("/api/profile", authenticateToken, async (req, res) => {
  const snapshot = await db.collection("users").doc(req.user.id).get();
  if (!snapshot.exists)
    return res.status(404).json({ message: "User not found" });
  const user = snapshot.data();
  res.json({
    id: snapshot.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    address: user.address,
    role: user.role,
    created_at: timestampValue(user.createdAt),
  });
});

app.put("/api/profile", authenticateToken, async (req, res) => {
  if (!req.body.name || !req.body.name.trim())
    return res.status(400).json({ message: "Name is required" });
  await db
    .collection("users")
    .doc(req.user.id)
    .update({
      name: req.body.name.trim(),
      phone: req.body.phone || "",
      address: req.body.address || "",
    });
  res.json({ message: "Profile updated successfully" });
});

app.get("/api/orders", authenticateToken, async (req, res) => {
  const snapshot = await db
    .collection("orders")
    .where("userId", "==", req.user.id)
    .get();
  const orders = snapshot.docs.map((doc) => {
    const order = doc.data();
    return {
      id: doc.id,
      total_amount: order.totalAmount,
      order_status: order.orderStatus,
      payment_status: order.paymentStatus,
      created_at: timestampValue(order.createdAt),
    };
  });
  orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(orders);
});

app.post("/api/orders", authenticateToken, async (req, res) => {
  const items = req.body.items;
  if (!Array.isArray(items) || !items.length)
    return res.status(400).json({ message: "Order items are required" });
  try {
    const orderRef = db.collection("orders").doc();
    const totalAmount = await db.runTransaction(async (transaction) => {
      let total = 0;
      const storedItems = [];
      for (const item of items) {
        const productRef = db
          .collection("products")
          .doc(String(item.product_id));
        const productSnapshot = await transaction.get(productRef);
        if (!productSnapshot.exists)
          throw new Error(`Product ${item.product_id} not found`);
        const product = productSnapshot.data();
        const quantity = Number(item.quantity);
        if (
          !Number.isInteger(quantity) ||
          quantity <= 0 ||
          quantity > Number(product.stock || 0)
        )
          throw new Error(`Invalid quantity for product ${item.product_id}`);
        total += Number(product.price) * quantity;
        storedItems.push({
          productId: productRef.id,
          quantity,
          price: Number(product.price),
        });
      }
      transaction.set(orderRef, {
        userId: req.user.id,
        items: storedItems,
        totalAmount: total,
        orderStatus: "pending",
        paymentStatus: "pending",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return total;
    });
    res
      .status(201)
      .json({
        message: "Order created successfully",
        orderId: orderRef.id,
        totalAmount,
      });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.listen(PORT, "0.0.0.0", () =>
  console.log(`Server running on http://localhost:${PORT}`),
);
