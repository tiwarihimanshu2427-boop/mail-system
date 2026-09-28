import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "./Compose.css";

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

function Compose() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [users, setUsers] = useState([]);
  const [files, setFiles] = useState([]);

  const [loading, setLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(true);

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [formData, setFormData] = useState({
    receiver_id: "",
    subject: "",
    message: "",
  });

  // =====================================================
  // LOAD USERS
  // =====================================================

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setUsersLoading(true);
        setErrorMessage("");

        const token = localStorage.getItem("token");
        const userData = localStorage.getItem("user");

        console.log("COMPOSE USER CHECK:", {
          tokenExists: !!token,
          tokenLength: token ? token.length : 0,
          userExists: !!userData,
        });

        if (!token) {
          navigate("/login");
          return;
        }

        let currentUser = null;

        if (userData) {
          try {
            currentUser = JSON.parse(userData);
          } catch (error) {
            console.error(
              "Invalid saved user:",
              error
            );
          }
        }

        console.log(
          "CURRENT LOGGED USER:",
          currentUser
        );

        // =================================================
        // GET USERS WITH TOKEN DIRECTLY
        // =================================================

        console.log(
          "Loading registered users..."
        );

        const response = await api.get(
          "/auth/users",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        console.log(
          "USERS API RESPONSE:",
          response.data
        );

        // =================================================
        // HANDLE DIFFERENT RESPONSE FORMATS
        // =================================================

        let receivedUsers = [];

        if (
          Array.isArray(
            response.data?.users
          )
        ) {
          receivedUsers =
            response.data.users;
        } else if (
          Array.isArray(
            response.data?.data
          )
        ) {
          receivedUsers =
            response.data.data;
        } else if (
          Array.isArray(response.data)
        ) {
          receivedUsers =
            response.data;
        }

        console.log(
          "USERS RECEIVED FROM SERVER:",
          receivedUsers
        );

        // =================================================
        // REMOVE CURRENT USER
        // =================================================

        const currentUserId =
          currentUser?.id;

        const otherUsers =
          receivedUsers.filter(
            (user) => {
              if (!currentUserId) {
                return true;
              }

              return (
                Number(user.id) !==
                Number(currentUserId)
              );
            }
          );

        console.log(
          "OTHER USERS FOR DROPDOWN:",
          otherUsers
        );

        setUsers(otherUsers);

        if (otherUsers.length === 0) {
          setErrorMessage(
            "No other registered users were returned by the server."
          );
        }

      } catch (error) {
        console.error(
          "LOAD USERS ERROR:",
          error
        );

        console.error(
          "LOAD USERS STATUS:",
          error.response?.status
        );

        console.error(
          "LOAD USERS SERVER RESPONSE:",
          error.response?.data
        );

        if (
          error.response?.status === 401
        ) {
          localStorage.removeItem(
            "token"
          );
          localStorage.removeItem(
            "user"
          );

          navigate("/login");
          return;
        }

        setErrorMessage(
          error.response?.data?.message ||
            "Unable to load registered users."
        );

      } finally {
        setUsersLoading(false);
      }
    };

    fetchUsers();
  }, [navigate]);

  // =====================================================
  // INPUT CHANGE
  // =====================================================

  const handleChange = (e) => {
    const {
      name,
      value,
    } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErrorMessage("");
    setSuccessMessage("");
  };

  // =====================================================
  // FILE SELECT
  // =====================================================

  const handleFiles = (e) => {
    const selectedFiles =
      Array.from(
        e.target.files || []
      );

    setErrorMessage("");
    setSuccessMessage("");

    if (selectedFiles.length > 5) {
      setErrorMessage(
        "You can attach maximum 5 files."
      );

      setFiles([]);
      e.target.value = "";

      return;
    }

    const invalidFile =
      selectedFiles.find((file) => {
        const extension =
          "." +
          file.name
            .split(".")
            .pop()
            .toLowerCase();

        return (
          file.size >
            MAX_FILE_SIZE ||
          !allowedExtensions.includes(
            extension
          )
        );
      });

    if (invalidFile) {
      setErrorMessage(
        "Each file must be an allowed type and maximum 10 MB."
      );

      setFiles([]);
      e.target.value = "";

      return;
    }

    setFiles([...selectedFiles]);

    console.log(
      "SELECTED FILES:",
      selectedFiles.map((file) => ({
        name: file.name,
        type: file.type,
        size: file.size,
        isFile: file instanceof File,
      }))
    );
  };

  // =====================================================
  // SEND MESSAGE
  // =====================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    if (!formData.receiver_id) {
      setErrorMessage(
        "Please select receiver."
      );
      return;
    }

    if (!formData.subject.trim()) {
      setErrorMessage(
        "Please enter subject."
      );
      return;
    }

    if (
      !formData.message.trim() &&
      files.length === 0
    ) {
      setErrorMessage(
        "Write a message or attach a photo/document."
      );
      return;
    }

    const token =
      localStorage.getItem("token");

    if (!token) {
      localStorage.removeItem(
        "user"
      );

      navigate("/login");
      return;
    }

    try {
      setLoading(true);

      const data = new FormData();

      data.append(
        "receiver_id",
        formData.receiver_id
      );

      data.append(
        "subject",
        formData.subject.trim()
      );

      data.append(
        "message",
        formData.message.trim()
      );

      files.forEach((file) => {
        // Must match backend: upload.array("attachments", 5)
        data.append("attachments", file, file.name);
      });

      const formDataDebug = [];
      for (const [key, value] of data.entries()) {
        formDataDebug.push({
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

      console.log("FORM DATA BEFORE SEND:", formDataDebug);
      console.log("FILES BEING SENT:", files);

      console.log(
        "SENDING MESSAGE TO USER:",
        formData.receiver_id
      );

      const response =
        await api.post(
          "/messages/send",
          data,
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

      console.log(
        "SEND MESSAGE RESPONSE:",
        response.data
      );

      if (
        response.data?.success
      ) {
        setSuccessMessage(
          "Message sent successfully!"
        );

        setFormData({
          receiver_id: "",
          subject: "",
          message: "",
        });

        setFiles([]);

        if (fileInputRef.current) {
          fileInputRef.current.value =
            "";
        }
      } else {
        setErrorMessage(
          response.data?.message ||
            "Message could not be sent."
        );
      }

    } catch (error) {
      console.error(
        "SEND MESSAGE ERROR:",
        error
      );

      console.error(
        "SERVER RESPONSE:",
        error.response?.data
      );

      if (
        error.response?.status === 401
      ) {
        localStorage.removeItem(
          "token"
        );
        localStorage.removeItem(
          "user"
        );

        navigate("/login");
        return;
      }

      setErrorMessage(
        error.response?.data?.message ||
          "Message could not be sent."
      );

    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // LOGOUT
  // =====================================================

  const handleLogout = () => {
    localStorage.removeItem(
      "token"
    );

    localStorage.removeItem(
      "user"
    );

    navigate("/login");
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="mail-page">

      {/* =================================================
          HEADER
      ================================================= */}

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
            type="button"
            className="secondary-btn"
            onClick={() =>
              navigate("/inbox")
            }
          >
            Inbox
          </button>

          <button
            type="button"
            className="secondary-btn"
            onClick={handleLogout}
          >
            Logout
          </button>

        </div>

      </header>

      {/* =================================================
          MAIN
      ================================================= */}

      <main className="mail-container">

        <button
          type="button"
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

        <div className="compose-card">

          <h1>
            Compose Message
          </h1>

          <p
            style={{
              color: "#6b7280",
              marginBottom: "25px",
            }}
          >
            Send an internal message
            with photo or document
          </p>

          <form
            className="compose-form"
            onSubmit={handleSubmit}
          >

            {/* =================================================
                RECEIVER
            ================================================= */}

            <div>

              <label>
                Send To
              </label>

              <select
                name="receiver_id"
                value={
                  formData.receiver_id
                }
                onChange={handleChange}
                required
                disabled={
                  usersLoading ||
                  loading
                }
              >

                <option value="">
                  {usersLoading
                    ? "Loading users..."
                    : "Select Receiver"}
                </option>

                {users.map(
                  (user) => (
                    <option
                      key={user.id}
                      value={user.id}
                    >
                      {user.name ||
                        "Unnamed User"}
                      {" — "}
                      {user.email ||
                        user.user_id ||
                        "No email"}
                    </option>
                  )
                )}

              </select>

              {!usersLoading &&
                users.length === 0 && (
                  <small
                    style={{
                      display:
                        "block",
                      marginTop:
                        "8px",
                      color:
                        "#dc2626",
                    }}
                  >
                    No other users
                    available. Check
                    browser Console
                    for USERS API
                    RESPONSE.
                  </small>
                )}

            </div>

            {/* =================================================
                SUBJECT
            ================================================= */}

            <div>

              <label>
                Subject
              </label>

              <input
                type="text"
                name="subject"
                placeholder="Enter subject"
                value={
                  formData.subject
                }
                onChange={handleChange}
                required
                disabled={loading}
              />

            </div>

            {/* =================================================
                MESSAGE
            ================================================= */}

            <div>

              <label>
                Message
              </label>

              <textarea
                name="message"
                placeholder="Write your message..."
                value={
                  formData.message
                }
                onChange={handleChange}
                disabled={loading}
                rows="8"
              />

            </div>

            {/* =================================================
                ATTACHMENTS
            ================================================= */}

            <div className="attachment-input-box">

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
                onChange={handleFiles}
                disabled={loading}
              />

              <small className="file-help">
                Maximum 5 files •
                10 MB each
                <br />
                JPG, PNG, GIF, WEBP,
                PDF, DOC, DOCX,
                XLS, XLSX, PPT,
                PPTX, TXT
              </small>

              {files.length > 0 && (
                <div className="selected-files">

                  {files.map(
                    (file) => (
                      <div
                        key={`${file.name}-${file.size}`}
                      >
                        📎{" "}
                        {file.name}
                        {" ("}
                        {(
                          file.size /
                          1024 /
                          1024
                        ).toFixed(2)}
                        {" MB)"}
                      </div>
                    )
                  )}

                </div>
              )}

            </div>

            {/* =================================================
                SUCCESS
            ================================================= */}

            {successMessage && (
              <div
                className="success-message"
              >
                {successMessage}
              </div>
            )}

            {/* =================================================
                ERROR
            ================================================= */}

            {errorMessage && (
              <div
                className="error-message"
              >
                {errorMessage}
              </div>
            )}

            {/* =================================================
                BUTTONS
            ================================================= */}

            <div
              style={{
                display: "flex",
                gap: "10px",
                marginTop: "5px",
              }}
            >

              <button
                type="submit"
                className="primary-btn"
                disabled={
                  loading ||
                  usersLoading ||
                  users.length === 0
                }
              >
                {loading
                  ? "Sending..."
                  : "Send Message"}
              </button>

              <button
                type="button"
                className="secondary-btn"
                onClick={() =>
                  navigate("/inbox")
                }
                disabled={loading}
              >
                Cancel
              </button>

            </div>

          </form>

        </div>

      </main>

    </div>
  );
}

export default Compose;