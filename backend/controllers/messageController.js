const { Pool } = require("pg");
const path = require("path");
const fs = require("fs");

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 6000),
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "mail_system",
});

const uploadRoot = path.join(
  __dirname,
  "..",
  "uploads",
  "messages"
);

if (!fs.existsSync(uploadRoot)) {
  fs.mkdirSync(uploadRoot, {
    recursive: true,
  });
}


/* =========================
   SEND NEW MESSAGE
========================= */

const sendMessage = async (req, res) => {
  const client = await pool.connect();

  try {
    const senderId = req.user?.id;

    if (!senderId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const {
      receiver_id,
      subject,
      message,
    } = req.body;

    if (!receiver_id) {
      return res.status(400).json({
        success: false,
        message: "Receiver is required.",
      });
    }

    if (!subject || !subject.trim()) {
      return res.status(400).json({
        success: false,
        message: "Subject is required.",
      });
    }

    if (
      (!message || !message.trim()) &&
      (!req.files || req.files.length === 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "Message or attachment is required.",
      });
    }

    if (Number(receiver_id) === Number(senderId)) {
      return res.status(400).json({
        success: false,
        message: "You cannot send a message to yourself.",
      });
    }

    const receiverCheck = await client.query(
      `
      SELECT id, name, email, user_id
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [Number(receiver_id)]
    );

    if (receiverCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Receiver not found.",
      });
    }

    await client.query("BEGIN");

    const messageResult = await client.query(
      `
      INSERT INTO messages
        (
          sender_id,
          receiver_id,
          subject,
          message
        )
      VALUES
        ($1, $2, $3, $4)
      RETURNING *
      `,
      [
        senderId,
        Number(receiver_id),
        subject.trim(),
        message ? message.trim() : "",
      ]
    );

    const newMessage = messageResult.rows[0];

    // First message becomes the thread ID
    await client.query(
      `
      UPDATE messages
      SET thread_id = $1
      WHERE id = $1
      `,
      [newMessage.id]
    );

    /*
      Save attachments if message_attachments table exists.
    */
    if (req.files && req.files.length > 0) {

      for (const file of req.files) {

        await client.query(
          `
          INSERT INTO message_attachments
          (
            message_id,
            original_name,
            stored_name,
            file_name,
            file_path,
            mime_type,
            content_type,
            file_size
          )
          VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8)
          `,
          [
            newMessage.id,
            file.originalname,
            file.filename,
            file.filename,
            `/uploads/messages/${file.filename}`,
            file.mimetype,
            file.mimetype,
            file.size,
          ]
        );
      }
    }

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: "Message sent successfully.",
      data: {
        ...newMessage,
        thread_id: newMessage.id,
      },
    });

  } catch (error) {

    await client.query("ROLLBACK");

    console.error(
      "Send message error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to send message.",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });

  } finally {
    client.release();
  }
};


/* =========================
   REPLY TO MESSAGE
========================= */

const replyMessage = async (req, res) => {
  const client = await pool.connect();

  try {

    const currentUserId = req.user?.id;

    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const {
      parent_message_id,
      subject,
      message,
    } = req.body;

    if (!parent_message_id) {
      return res.status(400).json({
        success: false,
        message: "Parent message is required.",
      });
    }

    if (
      (!message || !message.trim()) &&
      (!req.files || req.files.length === 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "Reply or attachment is required.",
      });
    }

    /*
      Find original message.
    */
    const parentResult = await client.query(
      `
      SELECT
        id,
        sender_id,
        receiver_id,
        subject,
        message,
        thread_id
      FROM messages
      WHERE id = $1
      LIMIT 1
      `,
      [Number(parent_message_id)]
    );

    if (parentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Original message not found.",
      });
    }

    const parent = parentResult.rows[0];

    /*
      Only sender or receiver can reply.
    */
    if (
      Number(parent.sender_id) !== Number(currentUserId) &&
      Number(parent.receiver_id) !== Number(currentUserId)
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to reply to this message.",
      });
    }

    /*
      Send reply to the other person.
    */
    const receiverId =
      Number(parent.sender_id) === Number(currentUserId)
        ? parent.receiver_id
        : parent.sender_id;

    const threadId =
      parent.thread_id || parent.id;

    await client.query("BEGIN");

    const replyResult = await client.query(
      `
      INSERT INTO messages
      (
        sender_id,
        receiver_id,
        subject,
        message,
        parent_message_id,
        thread_id
      )
      VALUES
      ($1, $2, $3, $4, $5, $6)
      RETURNING *
      `,
      [
        currentUserId,
        receiverId,
        subject && subject.trim()
          ? subject.trim()
          : parent.subject,
        message ? message.trim() : "",
        parent.id,
        threadId,
      ]
    );

    const newReply = replyResult.rows[0];

    /*
      Save reply attachments.
    */
    if (req.files && req.files.length > 0) {

      for (const file of req.files) {

        await client.query(
  `
  INSERT INTO message_attachments
  (
    message_id,
    original_name,
    stored_name,
    file_name,
    file_path,
    mime_type,
    content_type,
    file_size
  )
  VALUES
  ($1, $2, $3, $4, $5, $6, $7, $8)
  `,
  [
    newReply.id,
    file.originalname,
    file.filename,
    file.filename,
    `/uploads/messages/${file.filename}`,
    file.mimetype,
    file.mimetype,
    file.size,
  ]
);
      }
    }

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: "Reply sent successfully.",
      data: newReply,
    });

  } catch (error) {

    await client.query("ROLLBACK");

    console.error(
      "Reply message error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to send reply.",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });

  } finally {
    client.release();
  }
};


/* =========================
   INBOX
========================= */

const getInbox = async (req, res) => {
  try {
    const currentUserId = Number(req.user?.id);

    console.log("=================================");
    console.log("INBOX REQUEST");
    console.log("Authenticated User ID:", currentUserId);
    console.log("=================================");

    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    // Check that the authenticated user actually exists
    const userCheck = await pool.query(
      `
      SELECT id, name, email, user_id
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [currentUserId]
    );

    console.log("INBOX USER CHECK:", userCheck.rows);

    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Authenticated user not found.",
      });
    }

    // Get received messages
    const result = await pool.query(
      `
      SELECT
        m.id,
        m.sender_id,
        m.receiver_id,
        m.subject,
        m.message,
        m.parent_message_id,
        m.thread_id,
        m.is_read,
        m.created_at,

        s.name AS sender_name,
        s.email AS sender_email,
        s.user_id AS sender_user_id,

        r.name AS receiver_name,
        r.email AS receiver_email,
        
        r.user_id AS receiver_user_id,

        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', a.id,
                'original_name', a.original_name,
                'file_name', a.file_name,
                'file_path', a.file_path,
                'mime_type', a.mime_type,
                'file_size', a.file_size
              )
              ORDER BY a.id ASC
            )
            FROM message_attachments a
            WHERE a.message_id = m.id
          ),
          '[]'::json
        ) AS attachments

      FROM messages m

      INNER JOIN users s
        ON s.id = m.sender_id

      INNER JOIN users r
        ON r.id = m.receiver_id

      WHERE m.receiver_id = $1

      ORDER BY m.created_at DESC
      `,
      [currentUserId]
    );

    console.log(
      "INBOX MESSAGE COUNT:",
      result.rows.length
    );

    console.log(
      "INBOX MESSAGE IDS:",
      result.rows.map((row) => ({
        id: row.id,
        sender_id: row.sender_id,
        receiver_id: row.receiver_id,
        subject: row.subject,
      }))
    );

    return res.status(200).json({
      success: true,
      messages: result.rows,
    });

  } catch (error) {
    console.error("Get inbox error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load inbox.",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};


/* =========================
   SENT MESSAGES
========================= */

const getSentMessages = async (req, res) => {

  try {

    const currentUserId = req.user?.id;

    const result = await pool.query(
      `
      SELECT
        m.id,
        m.sender_id,
        m.receiver_id,
        m.subject,
        m.message,
        m.parent_message_id,
        m.thread_id,
        m.is_read,
        m.created_at,

        r.name AS receiver_name,
        r.email AS receiver_email,
        r.user_id AS receiver_user_id,

        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', a.id,
                'original_name', a.original_name,
                'file_name', a.file_name,
                'file_path', a.file_path,
                'mime_type', a.mime_type,
                'file_size', a.file_size
              )
              ORDER BY a.id ASC
            )
            FROM message_attachments a
            WHERE a.message_id = m.id
          ),
          '[]'::json
        ) AS attachments

      FROM messages m

      INNER JOIN users r
        ON r.id = m.receiver_id

      WHERE m.sender_id = $1

      ORDER BY m.created_at DESC
      `,
      [currentUserId]
    );

    return res.status(200).json({
      success: true,
      messages: result.rows,
    });

  } catch (error) {

    console.error(
      "Get sent messages error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to load sent messages.",
    });
  }
};


/* =========================
   GET COMPLETE THREAD
========================= */

const getThread = async (req, res) => {

  try {

    const currentUserId = req.user?.id;
    const messageId = Number(
      req.params.message_id
    );

    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (!messageId) {
      return res.status(400).json({
        success: false,
        message: "Message ID is required.",
      });
    }

    /*
      First find the message and its thread.
    */
    const firstResult = await pool.query(
      `
      SELECT
        id,
        sender_id,
        receiver_id,
        thread_id
      FROM messages
      WHERE id = $1
      LIMIT 1
      `,
      [messageId]
    );

    if (firstResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Message not found.",
      });
    }

    const firstMessage = firstResult.rows[0];

    /*
      Security:
      user must belong to conversation.
    */
    if (
      Number(firstMessage.sender_id) !==
        Number(currentUserId) &&
      Number(firstMessage.receiver_id) !==
        Number(currentUserId)
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to view this conversation.",
      });
    }

    const threadId =
      firstMessage.thread_id ||
      firstMessage.id;

    const result = await pool.query(
      `
      SELECT
        m.id,
        m.sender_id,
        m.receiver_id,
        m.subject,
        m.message,
        m.parent_message_id,
        m.thread_id,
        m.is_read,
        m.created_at,

        s.name AS sender_name,
        s.email AS sender_email,
        s.user_id AS sender_user_id,

        r.name AS receiver_name,
        r.email AS receiver_email,
        r.user_id AS receiver_user_id,

        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', a.id,
                'original_name', a.original_name,
                'file_name', a.file_name,
                'file_path', a.file_path,
                'mime_type', a.mime_type,
                'file_size', a.file_size
              )
              ORDER BY a.id ASC
            )
            FROM message_attachments a
            WHERE a.message_id = m.id
          ),
          '[]'::json
        ) AS attachments

      FROM messages m

      INNER JOIN users s
        ON s.id = m.sender_id

      INNER JOIN users r
        ON r.id = m.receiver_id

      WHERE m.thread_id = $1

      ORDER BY m.created_at ASC, m.id ASC
      `,
      [threadId]
    );

    return res.status(200).json({
      success: true,
      thread_id: threadId,
      messages: result.rows,
    });

  } catch (error) {

    console.error(
      "Get thread error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to load conversation.",
    });
  }
};


/* =========================
   MARK AS READ
========================= */

const markAsRead = async (req, res) => {

  try {

    const currentUserId = req.user?.id;
    const messageId = Number(
      req.params.id
    );

    const result = await pool.query(
      `
      UPDATE messages
      SET is_read = TRUE
      WHERE id = $1
        AND receiver_id = $2
      RETURNING id
      `,
      [
        messageId,
        currentUserId,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Message not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Message marked as read.",
    });

  } catch (error) {

    console.error(
      "Mark read error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to mark message as read.",
    });
  }
};


module.exports = {
  sendMessage,
  replyMessage,
  getInbox,
  getSentMessages,
  getThread,
  markAsRead,
};