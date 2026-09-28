const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const uploadDir = path.join(
  __dirname,
  "..",
  "uploads",
  "messages"
);

fs.mkdirSync(uploadDir, { recursive: true });

const allowedExtensions = new Set([
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
]);

const storage = multer.diskStorage({

  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },

  filename: (_req, file, cb) => {

    const ext = path
      .extname(file.originalname)
      .toLowerCase();

    cb(
      null,
      `${Date.now()}-${crypto.randomUUID()}${ext}`
    );
  },
});

const fileFilter = (_req, file, cb) => {

  const ext = path
    .extname(file.originalname)
    .toLowerCase();

  if (!allowedExtensions.has(ext)) {

    return cb(
      new Error(
        "This file type is not allowed."
      )
    );
  }

  cb(null, true);
};

const upload = multer({

  storage,

  fileFilter,

  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 5,
  },

});

module.exports = {
  upload,
  uploadDir,
};