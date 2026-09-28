const express = require("express");
const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");

const authMiddleware = require("../middleware/authMiddleware");

const {
  sendMessage,
  replyMessage,
  getInbox,
  getSentMessages,
  getThread,
  markAsRead,
} = require("../controllers/messageController");

const router = express.Router();

/* =====================================================
   UPLOAD DIRECTORY
===================================================== */

const uploadPath = path.join(
  __dirname,
  "..",
  "uploads",
  "messages"
);

// Automatically create folder if it does not exist
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, {
    recursive: true,
  });
}

console.log(
  "MESSAGE UPLOAD FOLDER:",
  uploadPath
);


/* =====================================================
   MULTER STORAGE
===================================================== */

const storage = multer.diskStorage({

  destination: (req, file, cb) => {

    console.log(
      "MULTER DESTINATION:",
      uploadPath
    );

    cb(null, uploadPath);
  },

  filename: (req, file, cb) => {

    const ext = path
      .extname(file.originalname)
      .toLowerCase();

    const uniqueName =
      `${Date.now()}-${crypto
        .randomBytes(8)
        .toString("hex")}${ext}`;

    console.log(
      "MULTER FILE:",
      file.originalname,
      "=>",
      uniqueName
    );

    cb(null, uniqueName);
  },

});


/* =====================================================
   ALLOWED FILE EXTENSIONS
===================================================== */

const allowedExtensions = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",

  ".pdf",

  ".doc",
  ".docx",

  ".txt",

  ".xls",
  ".xlsx",

  ".ppt",
  ".pptx",
];


/* =====================================================
   FILE FILTER
===================================================== */

const fileFilter = (req, file, cb) => {

  const ext = path
    .extname(file.originalname)
    .toLowerCase();

  console.log(
    "FILE FILTER:",
    file.originalname,
    "| Extension:",
    ext,
    "| MIME:",
    file.mimetype
  );

  if (!allowedExtensions.includes(ext)) {

    console.log(
      "FILE REJECTED:",
      file.originalname
    );

    return cb(
      new Error(
        "This file type is not allowed."
      )
    );
  }

  console.log(
    "FILE ACCEPTED:",
    file.originalname
  );

  cb(null, true);
};


/* =====================================================
   MULTER CONFIGURATION
===================================================== */

const upload = multer({

  storage,

  fileFilter,

  limits: {
    files: 5,
    fileSize: 10 * 1024 * 1024,
  },

});


/* =====================================================
   SEND MESSAGE
===================================================== */

router.post(
  "/send",

  authMiddleware,

  upload.array(
    "attachments",
    5
  ),

  (req, res, next) => {

    console.log(
      "SEND MESSAGE FILES:",
      req.files
        ? req.files.map((file) => ({
            originalname: file.originalname,
            filename: file.filename,
            path: file.path,
            mimetype: file.mimetype,
            size: file.size,
          }))
        : []
    );

    next();
  },

  sendMessage
);


/* =====================================================
   REPLY MESSAGE
===================================================== */

router.post(
  "/reply",

  authMiddleware,

  upload.array(
    "attachments",
    5
  ),

  (req, res, next) => {

    console.log(
      "REPLY MESSAGE FILES:",
      req.files
        ? req.files.map((file) => ({
            originalname: file.originalname,
            filename: file.filename,
            path: file.path,
            mimetype: file.mimetype,
            size: file.size,
          }))
        : []
    );

    next();
  },

  replyMessage
);


/* =====================================================
   INBOX
===================================================== */

router.get(
  "/inbox",

  authMiddleware,

  getInbox
);


/* =====================================================
   COMPATIBILITY INBOX ROUTE
===================================================== */

router.get(
  "/inbox/:userId",

  authMiddleware,

  getInbox
);


/* =====================================================
   SENT MESSAGES
===================================================== */

router.get(
  "/sent",

  authMiddleware,

  getSentMessages
);


/* =====================================================
   THREAD
===================================================== */

router.get(
  "/thread/:message_id",

  authMiddleware,

  getThread
);


/* =====================================================
   MARK MESSAGE AS READ
===================================================== */

router.patch(
  "/read/:id",

  authMiddleware,

  markAsRead
);


/* =====================================================
   MULTER ERROR HANDLER
===================================================== */

router.use(
  (error, req, res, next) => {

    if (
      error instanceof multer.MulterError
    ) {

      console.error(
        "MULTER ERROR:",
        error
      );

      if (
        error.code === "LIMIT_FILE_SIZE"
      ) {

        return res.status(400).json({
          success: false,
          message:
            "Each file must be 10 MB or smaller.",
        });

      }

      if (
        error.code === "LIMIT_FILE_COUNT"
      ) {

        return res.status(400).json({
          success: false,
          message:
            "Maximum 5 files are allowed.",
        });

      }

      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }


    if (error) {

      console.error(
        "UPLOAD ERROR:",
        error
      );

      return res.status(400).json({
        success: false,
        message:
          error.message ||
          "File upload failed.",
      });
    }

    next();
  }
);


/* =====================================================
   EXPORT
===================================================== */

module.exports = router;