const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");
const { Pool } = require("pg");

dotenv.config();

const app = express();


// =====================================================
// CORS
// =====================================================

app.use(
  cors({
    origin: "http://localhost:5173",
    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],
  })
);


// =====================================================
// BODY PARSER
// =====================================================

app.use(express.json());


// =====================================================
// DATABASE
// =====================================================

const pool = new Pool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 6000),
  database: process.env.DB_NAME || "mail_system",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD,
});


// =====================================================
// UPLOAD DIRECTORY
// =====================================================

const uploadRoot = path.join(
  __dirname,
  "uploads",
  "messages"
);

if (!fs.existsSync(uploadRoot)) {
  fs.mkdirSync(uploadRoot, {
    recursive: true,
  });
}


// =====================================================
// DATABASE SETUP
// =====================================================

const setupDatabase = async () => {

  let client;

  try {

    client = await pool.connect();

    console.log(
      "PostgreSQL connected successfully"
    );


    // =================================================
    // USERS - EMAIL
    // =================================================

    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS email VARCHAR(255)
    `);


    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS
      users_email_unique
      ON users (LOWER(email))
      WHERE email IS NOT NULL
    `);


    // =================================================
    // MESSAGES - THREAD
    // =================================================

    await client.query(`
      ALTER TABLE messages
      ADD COLUMN IF NOT EXISTS thread_id INTEGER
    `);


    await client.query(`
      CREATE INDEX IF NOT EXISTS
      messages_thread_id_idx
      ON messages(thread_id)
    `);


    // =================================================
    // OPTIONAL EXTERNAL EMAIL COLUMN
    // =================================================

    await client.query(`
      ALTER TABLE messages
      ADD COLUMN IF NOT EXISTS receiver_email VARCHAR(255)
    `);


    // =================================================
    // ATTACHMENTS TABLE
    // =================================================

    await client.query(`
      CREATE TABLE IF NOT EXISTS message_attachments (

        id SERIAL PRIMARY KEY,

        message_id INTEGER NOT NULL
          REFERENCES messages(id)
          ON DELETE CASCADE,

        original_name VARCHAR(255) NOT NULL,

        stored_name VARCHAR(255),

        file_name VARCHAR(255),

        file_path TEXT,

        mime_type VARCHAR(150) NOT NULL,

        file_size BIGINT NOT NULL,

        created_at TIMESTAMP
          DEFAULT CURRENT_TIMESTAMP
      )
    `);


    // =================================================
    // EXISTING TABLE COMPATIBILITY
    // =================================================

    await client.query(`
      ALTER TABLE message_attachments
      ADD COLUMN IF NOT EXISTS file_name VARCHAR(255)
    `);


    await client.query(`
      ALTER TABLE message_attachments
      ADD COLUMN IF NOT EXISTS file_path TEXT
    `);


    await client.query(`
      ALTER TABLE message_attachments
      ADD COLUMN IF NOT EXISTS stored_name VARCHAR(255)
    `);


    // =================================================
    // ATTACHMENT INDEX
    // =================================================

    await client.query(`
      CREATE INDEX IF NOT EXISTS
      message_attachments_message_id_idx
      ON message_attachments(message_id)
    `);


    console.log(
      "Database tables checked successfully"
    );

  } catch (error) {

    console.error(
      "Database setup error:"
    );

    console.error(error);

  } finally {

    if (client) {
      client.release();
    }

  }
};


// =====================================================
// ROUTES
// =====================================================

const authRoutes = require(
  "./routes/authRoutes"
);

const messageRoutes = require(
  "./routes/messageRoutes"
);


app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/messages",
  messageRoutes
);


// =====================================================
// STATIC UPLOADS
// =====================================================

app.use(
  "/uploads",
  express.static(
    path.join(__dirname, "uploads")
  )
);


// =====================================================
// HOME
// =====================================================

app.get("/", (req, res) => {

  res.json({
    success: true,
    message:
      "Mail System Backend is running",
  });

});


// =====================================================
// ERROR HANDLER
// =====================================================

app.use(
  (err, req, res, next) => {

    console.error(
      "Unhandled error:",
      err
    );


    if (
      err.code === "LIMIT_FILE_SIZE"
    ) {

      return res.status(400).json({
        success: false,
        message:
          "Each file must be 10 MB or smaller.",
      });

    }


    if (
      err.code === "LIMIT_FILE_COUNT"
    ) {

      return res.status(400).json({
        success: false,
        message:
          "Maximum 5 files are allowed.",
      });

    }


    if (
      err.message
    ) {

      return res.status(400).json({
        success: false,
        message: err.message,
      });

    }


    return res.status(500).json({
      success: false,
      message: "Server error",
    });

  }
);


// =====================================================
// START SERVER
// =====================================================

const PORT =
  Number(process.env.PORT || 5000);


const startServer = async () => {

  await setupDatabase();

  app.listen(
    PORT,
    () => {

      console.log(
        `Server running on http://localhost:${PORT}`
      );

    }
  );

};


startServer();