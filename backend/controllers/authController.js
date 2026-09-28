const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const { JWT_SECRET } = require("../config/jwt");

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 6000),
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "mail_system",
});

// =====================================================
// REGISTER
// =====================================================

const register = async (req, res) => {
  try {
    const {
      name,
      email,
      mobile,
      user_id,
      password,
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required.",
      });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    let cleanUserId = user_id
      ? user_id.trim()
      : cleanEmail.split("@")[0];

    cleanUserId = cleanUserId
      .replace(/[^a-zA-Z0-9._-]/g, "")
      .substring(0, 50);

    if (!cleanUserId) {
      cleanUserId = `user${Date.now()}`;
    }

    const emailCheck = await pool.query(
      `
      SELECT id FROM users
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1
      `,
      [cleanEmail]
    );

    if (emailCheck.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "This email is already registered.",
      });
    }

    const userIdCheck = await pool.query(
      `
      SELECT id FROM users
      WHERE user_id = $1
      LIMIT 1
      `,
      [cleanUserId]
    );

    if (userIdCheck.rows.length > 0) {
      if (!user_id) {
        cleanUserId =
          `${cleanUserId}${Date.now().toString().slice(-5)}`;
      } else {
        return res.status(409).json({
          success: false,
          message: "This User ID is already registered.",
        });
      }
    }

    let finalMobile = mobile
      ? mobile.trim()
      : `9${Date.now().toString().slice(-9)}`;

    const mobileCheck = await pool.query(
      `
      SELECT id FROM users
      WHERE mobile = $1
      LIMIT 1
      `,
      [finalMobile]
    );

    if (mobileCheck.rows.length > 0) {
      if (!mobile) {
        finalMobile =
          `8${Date.now().toString().slice(-9)}`;
      } else {
        return res.status(409).json({
          success: false,
          message: "This mobile number is already registered.",
        });
      }
    }

    const hashedPassword =
      await bcrypt.hash(password, 10);

    const result = await pool.query(
      `
      INSERT INTO users
      (
        name,
        mobile,
        user_id,
        password,
        email
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING
        id,
        name,
        mobile,
        user_id,
        email,
        created_at
      `,
      [
        cleanName,
        finalMobile,
        cleanUserId,
        hashedPassword,
        cleanEmail,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Registration successful.",
      user: result.rows[0],
    });

  } catch (error) {
    console.error("Register error:", error);

    return res.status(500).json({
      success: false,
      message: "Registration failed.",
    });
  }
};

// =====================================================
// LOGIN
// =====================================================

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const cleanEmail =
      email.trim().toLowerCase();

    const result = await pool.query(
      `
      SELECT
        id,
        name,
        mobile,
        user_id,
        email,
        password,
        created_at
      FROM users
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1
      `,
      [cleanEmail]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const user = result.rows[0];

    const passwordMatch =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // ===============================================
    // CREATE FRESH JWT
    // ===============================================

    const token = jwt.sign(
      {
        id: user.id,
        user_id: user.user_id,
        email: user.email,
      },
      JWT_SECRET,
      {
        algorithm: "HS256",
        expiresIn: "7d",
      }
    );

    delete user.password;

    console.log(
      "Login successful:",
      user.email
    );

    console.log(
      "JWT token generated successfully."
    );

    console.log(
      "JWT SECRET LENGTH:",
      JWT_SECRET.length
    );

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      user,
    });

  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Login failed.",
    });
  }
};

// =====================================================
// GET USERS
// =====================================================

const getUsers = async (req, res) => {
  try {
    const currentUserId = req.user?.id;

    const result = await pool.query(
      `
      SELECT
        id,
        name,
        email,
        user_id,
        mobile,
        created_at
      FROM users
      WHERE id <> $1
      ORDER BY name ASC
      `,
      [currentUserId || 0]
    );

    return res.status(200).json({
      success: true,
      users: result.rows,
    });

  } catch (error) {
    console.error("Get users error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load users.",
    });
  }
};

module.exports = {
  register,
  login,
  getUsers,
};