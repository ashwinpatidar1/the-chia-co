module.exports = function adminAuth(req, res, next) {
  const adminKey = req.headers["x-admin-key"];

  if (!adminKey) {
    return res.status(401).json({ error: "Admin key missing" });
  }

  if (adminKey !== process.env.ADMIN_KEY) {
    return res.status(403).json({ error: "Invalid admin key" });
  }

  next();
};
