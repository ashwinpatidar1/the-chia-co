const express = require("express");
const cors = require("cors");

const productsRoutes = require("./routes/products");
const ordersRoutes = require("./routes/orders");
const contactsRoutes = require("./routes/contacts");

const app = express();

/* ---------- CORS (dynamic via ALLOWED_ORIGINS env var) ---------- */
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "https://vitaseed-frontend.github.io,https://vitaseed.github.io,http://localhost:5500,http://localhost:3000")
  .split(",")
  .map(o => o.trim())
  .filter(Boolean);

// allow requests with no origin (e.g., curl, server-to-server)
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    } else {
      return callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "x-admin-key"]
}));

// Required for preflight requests
app.options("*", cors());

/* ---------- BODY PARSER ---------- */
app.use(express.json({ limit: "1mb" }));

/* ---------- REQUEST LOGGING ---------- */
app.use((req, res, next) => {
  console.log(
    `[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`
  );
  next();
});

/* ---------- ROUTES ---------- */
app.use("/api/products", productsRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/contacts", contactsRoutes);

/* ---------- HEALTH CHECK ---------- */
app.get("/", (req, res) => {
  res.status(200).json({
    status: "VitaSeed API running",
    time: new Date().toISOString()
  });
});

/* ---------- SERVER ---------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ VitaSeed backend running on port ${PORT}`);
});
