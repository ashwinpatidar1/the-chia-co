const express = require("express");
const cors = require("cors");
const multer = require("multer");
const db = require("./db/database");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 5 * 1024 * 1024,
  },

  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, PNG, and WebP images are allowed"));
    }
  },
});


app.use(express.json());
app.use(cors());
app.use(express.static(__dirname));
const PORT = process.env.PORT || 5000;;
const JWT_SECRET = "your_secret_key_change_this_later";

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      message: "Access token required"
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        message: "Invalid or expired token"
      });
    }

    req.user = user;
    next();
  });
}

app.get("/", (req, res) => {
  res.send("Chia Seeds Backend is running!");
});

app.get("/api/products", (req, res) => {
  const sql = "SELECT * FROM products";

  db.query(sql, (err, results) => {
    if (err) {
      console.log(err);

      return res.status(500).json({
        message: "Database error",
      });
    }

    res.json(results);
  });
});

app.get("/api/products/:id/image", (req, res) => {

    const { id } = req.params;

    const sql = `
        SELECT image, image_type
        FROM products
        WHERE id = ?
    `;

    db.query(sql, [id], (err, results) => {

        if (err) {
            console.log(err);

            return res.status(500).send("Failed to load image");
        }

        if (results.length === 0) {
            return res.status(404).send("Product not found");
        }

        if (!results[0].image) {
            return res.status(404).send("Image not found");
        }

        res.setHeader(
            "Content-Type",
            results[0].image_type || "image/jpeg"
        );

        res.send(results[0].image);
    });
});

app.get("/api/orders", authenticateToken, (req, res) => {
  const sql = `
    SELECT
      id,
      total_amount,
      order_status,
      payment_status,
      created_at
    FROM orders
    WHERE user_id = ?
    ORDER BY created_at DESC
  `;

  db.query(sql, [req.user.id], (err, results) => {
    if (err) {
      console.error("Orders fetch error:", err);

      return res.status(500).json({
        message: "Failed to fetch orders"
      });
    }

    res.json(results);
  });
});

app.post("/api/products", upload.single("image"), (req, res) => {
  const { name, description, price, size, featured } = req.body;

  if (!req.file) {
    return res.status(400).json({
      message: "Product image is required",
    });
  }

  const sql = `
    INSERT INTO products
    (name, description, price, size, featured, image, image_type)
    VALUES (?, ?, ?, ?, ?, ?, ?)
`;

  const values = [
    name,
    description,
    price,
    size,
    featured === "true" ? 1 : 0,
    req.file.buffer,
    req.file.mimetype
];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.log(err);

      return res.status(500).json({
        message: "Failed to add product",
      });
    }

    res.status(201).json({
      message: "Product added successfully",
      productId: result.insertId,
    });
  });
});

// ================= REGISTER USER =================

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password, phone, address } = req.body;

    // 1. Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required",
      });
    }

    // 2. Check if email already exists
    const checkSql = "SELECT id FROM users WHERE email = ?";

    db.query(checkSql, [email], async (err, results) => {
      if (err) {
        console.log(err);

        return res.status(500).json({
          message: "Database error",
        });
      }

      if (results.length > 0) {
        return res.status(409).json({
          message: "Email already registered",
        });
      }

      // 3. Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // 4. Insert user into existing users table
      const sql = `
        INSERT INTO users
        (name, email, password, phone, address)
        VALUES (?, ?, ?, ?, ?)
      `;

      const values = [
        name,
        email,
        hashedPassword,
        phone || null,
        address || null,
      ];

      db.query(sql, values, (err, result) => {
        if (err) {
          console.log(err);

          return res.status(500).json({
            message: "Failed to register user",
          });
        }

        res.status(201).json({
          message: "User registered successfully",
          userId: result.insertId,
        });
      });
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Something went wrong",
    });
  }
});

// ================= LOGIN USER =================

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    // 2. Find user by email
    const sql = "SELECT * FROM users WHERE email = ?";

    db.query(sql, [email], async (err, results) => {
      if (err) {
        console.log(err);

        return res.status(500).json({
          message: "Database error",
        });
      }

      // 3. User not found
      if (results.length === 0) {
        return res.status(401).json({
          message: "Invalid email or password",
        });
      }

      const user = results[0];

      // 4. Compare entered password with hashed password
      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return res.status(401).json({
          message: "Invalid email or password",
        });
      }

      // 5. Create JWT token
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role,
        },
        JWT_SECRET,
        {
          expiresIn: "7d",
        }
      );

      // 6. Send token to frontend
      res.json({
        message: "Login successful",
        token: token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Something went wrong",
    });
  }
});

app.post("/api/orders", authenticateToken, (req, res) => {
  const { items } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      message: "Order items are required"
    });
  }

  const productIds = items.map(item => item.product_id);

  const placeholders = productIds.map(() => "?").join(",");

  const productSql = `
    SELECT id, price, stock
    FROM products
    WHERE id IN (${placeholders})
  `;

  db.query(productSql, productIds, (err, products) => {
    if (err) {
      console.error("Product fetch error:", err);
      return res.status(500).json({
        message: "Failed to fetch products"
      });
    }

    let totalAmount = 0;

    for (const item of items) {
      const product = products.find(
        product => product.id === item.product_id
      );

      if (!product) {
        return res.status(400).json({
          message: `Product ${item.product_id} not found`
        });
      }

      if (item.quantity <= 0 || item.quantity > product.stock) {
        return res.status(400).json({
          message: `Invalid quantity for product ${item.product_id}`
        });
      }

      totalAmount += Number(product.price) * Number(item.quantity);
    }

    const orderSql = `
      INSERT INTO orders
      (user_id, total_amount, order_status, payment_status)
      VALUES (?, ?, 'pending', 'pending')
    `;

    db.query(
      orderSql,
      [req.user.id, totalAmount],
      (err, orderResult) => {
        if (err) {
          console.error("Order creation error:", err);
          return res.status(500).json({
            message: "Failed to create order"
          });
        }

        const orderId = orderResult.insertId;

        const orderItems = items.map(item => {
          const product = products.find(
            product => product.id === item.product_id
          );

          return [
            orderId,
            item.product_id,
            item.quantity,
            product.price
          ];
        });

        const itemSql = `
          INSERT INTO order_items
          (order_id, product_id, quantity, price)
          VALUES ?
        `;

        db.query(itemSql, [orderItems], (err) => {
          if (err) {
            console.error("Order items error:", err);
            return res.status(500).json({
              message: "Failed to save order items"
            });
          }

          res.status(201).json({
            message: "Order created successfully",
            orderId: orderId,
            totalAmount: totalAmount
          });
        });
      }
    );
  });
});

app.put("/api/products/:id", (req, res) => {
  const { id } = req.params;

  const {
    name,
    description,
    price,
    size,
    featured
  } = req.body;

  const sql = `
    UPDATE products
    SET
      name = ?,
      description = ?,
      price = ?,
      size = ?,
      featured = ?
    WHERE id = ?
  `;

  const values = [
    name,
    description,
    price,
    size,
    featured,
    id
  ];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.log(err);

      return res.status(500).json({
        message: "Failed to update product"
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Product not found"
      });
    }

    res.json({
      message: "Product updated successfully"
    });
  });
});

app.delete("/api/products/:id", (req, res) => {
  const { id } = req.params;

  const sql = "DELETE FROM products WHERE id = ?";

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.log(err);

      return res.status(500).json({
        message: "Failed to delete product",
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    res.json({
      message: "Product deleted successfully",
    });
  });
});

app.get("/api/profile", authenticateToken, (req, res) => {
  const sql = `
    SELECT id, name, email, phone, address, role, created_at
    FROM users
    WHERE id = ?
  `;

  db.query(sql, [req.user.id], (err, results) => {
    if (err) {
      console.error("Profile fetch error:", err);
      return res.status(500).json({
        message: "Failed to fetch profile"
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    res.json(results[0]);
  });
});

app.put("/api/profile", authenticateToken, (req, res) => {
  const { name, phone, address } = req.body;

  if (!name || name.trim() === "") {
    return res.status(400).json({
      message: "Name is required"
    });
  }

  const sql = `
    UPDATE users
    SET name = ?, phone = ?, address = ?
    WHERE id = ?
  `;

  db.query(
    sql,
    [name.trim(), phone || null, address || null, req.user.id],
    (err, result) => {
      if (err) {
        console.error("Profile update error:", err);
        return res.status(500).json({
          message: "Failed to update profile"
        });
      }

      res.json({
        message: "Profile updated successfully"
      });
    }
  );
});

app.listen(PORT,"0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
