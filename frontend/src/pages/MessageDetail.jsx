import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

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

const isImage = (mime = "") =>
  String(mime).toLowerCase().startsWith("image/");

function MessageDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const fileInputRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [reply, setReply] = useState("");
  const [replyFiles, setReplyFiles] = useState([]);

  const [replyLoading, setReplyLoading] = useState(false);
  const [replyMessage, setReplyMessage] = useState("");
  const [replyError, setReplyError] = useState("");

  // =====================================================
  // LOAD COMPLETE THREAD
  // =====================================================

  const fetchThread = async () => {
    try {
      setLoading(true);
      setError("");

      const userData = localStorage.getItem("user");
      const token = localStorage.getItem("token");

      if (!userData || !token) {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        navigate("/login");
        return;
      }

      console.log("THREAD TOKEN CHECK:", {
        tokenExists: !!token,
        tokenLength: token.length,
        messageId: id,
      });

      // Load the conversation thread.
      // IMPORTANT: this is a GET request. The previous code accidentally
      // sent a POST /messages/reply request while loading the thread.
      const response = await fetch(
        `http://localhost:5000/api/messages/thread/${encodeURIComponent(id)}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const threadResult = await response.json();
      if (!response.ok) {
        throw new Error(threadResult?.message || "Unable to load conversation.");
      }

      console.log("THREAD RESPONSE:", threadResult);

      if (!threadResult?.success) {
        setError(
          threadResult?.message ||
          "Unable to load conversation."
        );
        return;
      }

      const threadMessages =
        threadResult?.messages || [];

      if (threadMessages.length === 0) {
        setError("Conversation not found.");
        return;
      }

      setMessages(threadMessages);

      // Latest message becomes reply target
      setCurrentMessage(
        threadMessages[threadMessages.length - 1]
      );
    } catch (error) {
      console.error(
        "Thread loading error:",
        error
      );

      setError(
        error.response?.data?.message ||
        error.message ||
        "Unable to load conversation."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchThread();
  }, [id, navigate]);

  // =====================================================
  // FILE SELECT
  // =====================================================

  const handleReplyFiles = (e) => {
    const selectedFiles = Array.from(
      e.target.files || []
    );

    if (selectedFiles.length > 5) {
      setReplyError(
        "You can attach maximum 5 files."
      );

      setReplyFiles([]);
      e.target.value = "";

      return;
    }

    const invalidFile = selectedFiles.find(
      (file) => {
        const ext =
          "." +
          file.name
            .split(".")
            .pop()
            .toLowerCase();

        return (
          file.size > MAX_FILE_SIZE ||
          !allowedExtensions.includes(ext)
        );
      }
    );

    if (invalidFile) {
      setReplyError(
        "Each file must be an allowed type and maximum 10 MB."
      );

      setReplyFiles([]);
      e.target.value = "";

      return;
    }

    setReplyError("");
    setReplyFiles([...selectedFiles]);

    console.log(
      "SELECTED REPLY FILES:",
      selectedFiles.map((file) => ({
        name: file.name,
        type: file.type,
        size: file.size,
        isFile: file instanceof File,
      }))
    );
  };

  // =====================================================
  // SEND REPLY
  // =====================================================

  const handleReply = async (e) => {
    e.preventDefault();

    setReplyError("");
    setReplyMessage("");

    if (
      !reply.trim() &&
      replyFiles.length === 0
    ) {
      setReplyError(
        "Write a reply or attach a photo/document."
      );

      return;
    }

    if (!currentMessage) {
      setReplyError(
        "Conversation message not found."
      );

      return;
    }

    try {
      setReplyLoading(true);

      const data = new FormData();

      const originalSubject =
        currentMessage.subject || "Message";

      const subject =
        originalSubject.startsWith("Re:")
          ? originalSubject
          : `Re: ${originalSubject}`;

      data.append("subject", subject);

      data.append(
        "message",
        reply.trim()
      );

      data.append(
        "parent_message_id",
        currentMessage.id
      );

      replyFiles.forEach((file) => {
        // Must match backend: upload.array("attachments", 5)
        data.append("attachments", file, file.name);
      });

      const replyFormDataDebug = [];
      for (const [key, value] of data.entries()) {
        replyFormDataDebug.push({
          key,
          value:
            value instanceof File
              ? {
                name: value.name,
                type: value.type,
                size: value.size,
              }
              : value,
        });
      }

      console.log(
        "REPLY FORM DATA BEFORE SEND:",
        replyFormDataDebug
      );

      const token = localStorage.getItem("token");

      if (!token) {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        navigate("/login");
        return;
      }

      // Use native fetch for multipart/form-data.
      // Do NOT set Content-Type manually; the browser adds the boundary.
      const response = await fetch(
        "http://localhost:5000/api/messages/reply",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: data,
        }
      );

      const result = await response.json();

      console.log(
        "REPLY FETCH RESPONSE:",
        result
      );

      if (!response.ok) {
        throw new Error(
          result?.message || "Reply could not be sent."
        );
      }

      if (result?.success) {
        setReplyMessage(
          "Reply sent successfully!"
        );

        setReply("");
        setReplyFiles([]);

        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }

        // Reload complete conversation
        await fetchThread();

        setTimeout(() => {
          setReplyMessage("");
        }, 3000);
      }
    } catch (error) {
      console.error(
        "Reply error:",
        error
      );

      setReplyError(
        error.response?.data?.message ||
        error.message ||
        "Reply could not be sent."
      );
    } finally {
      setReplyLoading(false);
    }
  };

  // =====================================================
  // LOGOUT
  // =====================================================

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    navigate("/login");
  };

  // =====================================================
  // GET ATTACHMENT URL
  // =====================================================

  const getFileUrl = (file) => {
    if (!file) {
      return "";
    }

    /*
      Backend is returning:

      file_path:
      /uploads/messages/filename.jpg

      So we directly use file.file_path.
    */

    if (file.file_path) {
      return `http://localhost:5000${file.file_path}`;
    }

    // Fallback in case backend ever sends url
    if (file.url) {
      return `http://localhost:5000${file.url}`;
    }

    return "";
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="mail-page">
        <div className="mail-container">
          <div className="empty-message">
            Loading conversation...
          </div>
        </div>
      </div>
    );
  }

  // =====================================================
  // ERROR
  // =====================================================

  if (error) {
    return (
      <div className="mail-page">
        <header className="mail-header">
          <div
            className="brand"
            onClick={() =>
              navigate("/inbox")
            }
            style={{
              cursor: "pointer",
            }}
          >
            Mail<span>System</span>
          </div>

          <button
            className="secondary-btn"
            onClick={handleLogout}
          >
            Logout
          </button>
        </header>

        <main className="mail-container">
          <div className="error-message">
            {error}
          </div>

          <br />

          <button
            className="secondary-btn"
            onClick={() =>
              navigate("/inbox")
            }
          >
            ← Back to Inbox
          </button>
        </main>
      </div>
    );
  }

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="mail-page">

      {/* HEADER */}

      <header className="mail-header">

        <div
          className="brand"
          onClick={() =>
            navigate("/inbox")
          }
          style={{
            cursor: "pointer",
          }}
        >
          Mail<span>System</span>
        </div>

        <div className="header-actions">

          <button
            className="primary-btn"
            onClick={() =>
              navigate("/compose")
            }
          >
            + Compose
          </button>

          <button
            className="secondary-btn"
            onClick={handleLogout}
          >
            Logout
          </button>

        </div>

      </header>

      {/* MAIN */}

      <main className="mail-container">

        {/* BACK */}

        <button
          className="secondary-btn"
          onClick={() =>
            navigate("/inbox")
          }
          style={{
            marginBottom: "20px",
          }}
        >
          ← Back to Inbox
        </button>

        {/* THREAD */}

        <div className="detail-card">

          <h1 className="detail-subject">
            {currentMessage?.subject ||
              "Conversation"}
          </h1>

          <div
            style={{
              marginBottom: "25px",
              color: "#6b7280",
            }}
          >
            {messages.length} message
            {messages.length !== 1
              ? "s"
              : ""}{" "}
            in this conversation
          </div>

          {/* ALL MESSAGES */}

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            }}
          >

            {messages.map(
              (item, index) => (

                <div
                  key={item.id}
                  style={{
                    border:
                      "1px solid #e5e7eb",
                    borderRadius: "12px",
                    padding: "20px",
                    background:
                      index ===
                        messages.length - 1
                        ? "#f8fafc"
                        : "#ffffff",
                  }}
                >

                  {/* MESSAGE HEADER */}

                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      gap: "15px",
                      flexWrap: "wrap",
                      marginBottom:
                        "15px",
                    }}
                  >

                    <div>

                      <div
                        style={{
                          fontWeight: "700",
                          fontSize: "16px",
                          marginBottom:
                            "5px",
                        }}
                      >
                        {item.sender_name ||
                          "Unknown User"}
                      </div>

                      <div
                        style={{
                          fontSize: "13px",
                          color: "#6b7280",
                        }}
                      >
                        User ID:{" "}
                        {item.sender_user_id ||
                          "-"}
                      </div>

                      {item.sender_email && (
                        <div
                          style={{
                            fontSize: "13px",
                            color: "#6b7280",
                          }}
                        >
                          Email:{" "}
                          {item.sender_email}
                        </div>
                      )}

                    </div>

                    <div
                      style={{
                        fontSize: "13px",
                        color: "#6b7280",
                      }}
                    >
                      {new Date(
                        item.created_at
                      ).toLocaleString()}
                    </div>

                  </div>

                  {/* MESSAGE */}

                  <div
                    className="detail-message"
                    style={{
                      whiteSpace:
                        "pre-wrap",
                      marginBottom:
                        "15px",
                    }}
                  >
                    {item.message ||
                      "(Attachment only)"}
                  </div>

                  {/* ATTACHMENTS */}

                  {item.attachments?.length >
                    0 && (

                      <div className="attachments-box">

                        <h3>
                          📎 Attachments
                        </h3>

                        <div className="attachment-list">

                          {item.attachments.map(
                            (file) => {

                              /*
                                FIX:
                                Backend returns file_path,
                                not only file.url.
                              */

                              const fileUrl =
                                getFileUrl(file);

                              console.log(
                                "ATTACHMENT:",
                                {
                                  id: file.id,
                                  name:
                                    file.original_name,
                                  path:
                                    file.file_path,
                                  url:
                                    fileUrl,
                                  type:
                                    file.mime_type,
                                }
                              );

                              return (
                                <div
                                  className="attachment-item"
                                  key={
                                    file.id
                                  }
                                >

                                  {/* IMAGE PREVIEW */}

                                  {isImage(
                                    file.mime_type
                                  ) &&
                                    fileUrl ? (

                                    <a
                                      href={
                                        fileUrl
                                      }
                                      target="_blank"
                                      rel="noreferrer"
                                    >

                                      <img
                                        className="attachment-image"
                                        src={
                                          fileUrl
                                        }
                                        alt={
                                          file.original_name ||
                                          "Attachment"
                                        }
                                        onError={(e) => {
                                          console.error(
                                            "IMAGE LOAD ERROR:",
                                            fileUrl
                                          );

                                          e.currentTarget.style.display =
                                            "none";
                                        }}
                                      />

                                    </a>

                                  ) : (

                                    <div className="attachment-icon">
                                      📄
                                    </div>

                                  )}

                                  {/* FILE DETAILS */}

                                  <div className="attachment-meta">

                                    <div className="attachment-name">
                                      {
                                        file.original_name
                                      }
                                    </div>

                                    <div className="attachment-size">

                                      {(
                                        Number(
                                          file.file_size ??
                                          file.size ??
                                          0
                                        ) /
                                        1024 /
                                        1024
                                      ).toFixed(
                                        2
                                      )}{" "}
                                      MB

                                    </div>

                                    {fileUrl && (
                                      <a
                                        className="open-attachment"
                                        href={
                                          fileUrl
                                        }
                                        target="_blank"
                                        rel="noreferrer"
                                      >
                                        Open /
                                        Download
                                      </a>
                                    )}

                                  </div>

                                </div>
                              );
                            }
                          )}

                        </div>

                      </div>

                    )}

                </div>

              )
            )}

          </div>

        </div>

        {/* REPLY */}

        <div
          className="reply-section"
          style={{
            marginTop: "25px",
          }}
        >

          <h2>
            Reply to this conversation
          </h2>

          <form onSubmit={handleReply}>

            <textarea
              value={reply}
              onChange={(e) => {
                setReply(e.target.value);
                setReplyError("");
                setReplyMessage("");
              }}
              placeholder="Write your reply..."
              disabled={replyLoading}
            />

            {/* FILE */}

            <div
              style={{
                marginTop: "15px",
              }}
            >

              <label>
                📎 Photo / Document
              </label>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="
                  image/*,
                  .pdf,
                  .doc,
                  .docx,
                  .txt,
                  .xls,
                  .xlsx,
                  .ppt,
                  .pptx
                "
                onChange={
                  handleReplyFiles
                }
                disabled={replyLoading}
              />

              <small className="file-help">
                Maximum 5 files • 10 MB each.
              </small>

              {replyFiles.length >
                0 && (

                  <div className="selected-files">

                    {replyFiles.map(
                      (file) => (

                        <div
                          key={`${file.name}-${file.size}`}
                        >
                          📎 {file.name}
                        </div>

                      )
                    )}

                  </div>

                )}

            </div>

            {/* ERROR */}

            {replyError && (
              <div className="error-message">
                {replyError}
              </div>
            )}

            {/* SUCCESS */}

            {replyMessage && (
              <div className="success-message">
                {replyMessage}
              </div>
            )}

            {/* BUTTONS */}

            <div
              style={{
                display: "flex",
                gap: "10px",
                marginTop: "15px",
              }}
            >

              <button
                type="submit"
                className="primary-btn"
                disabled={replyLoading}
              >
                {replyLoading
                  ? "Sending Reply..."
                  : "Send Reply"}
              </button>

              <button
                type="button"
                className="secondary-btn"
                onClick={() =>
                  navigate("/inbox")
                }
                disabled={replyLoading}
              >
                Back to Inbox
              </button>

            </div>

          </form>

        </div>

      </main>

    </div>
  );
}

export default MessageDetail;