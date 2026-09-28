const express = require("express");

const {
  register,
  login,
  getUsers,
} = require("../controllers/authController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// ===============================
// REGISTER
// POST /api/auth/register
// ===============================
router.post("/register", register);

// ===============================
// LOGIN WITH EMAIL
// POST /api/auth/login
// ===============================
router.post("/login", login);

// ===============================
// GET ALL USERS
// GET /api/auth/users
// ===============================
router.get("/users", authMiddleware, getUsers);

module.exports = router;