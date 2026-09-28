import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "./Inbox.css";

const Inbox = () => {
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadInbox = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      const response = await api.get("/messages/inbox", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (Array.isArray(response.data?.messages)) {
        setMessages(response.data.messages);
      } else if (Array.isArray(response.data?.data)) {
        setMessages(response.data.data);
      } else {
        setMessages([]);
      }
    } catch (err) {
      console.error("INBOX ERROR:", err);

      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
        return;
      }

      setError(
        err.response?.data?.message ||
          "Unable to load inbox."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadInbox();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const getInitials = (name = "") => {
    const words = name.trim().split(/\s+/);

    if (!words.length) return "U";

    if (words.length === 1) {
      return words[0].substring(0, 2).toUpperCase();
    }

    return (
      words[0][0] +
      words[words.length - 1][0]
    ).toUpperCase();
  };

  const unreadCount = messages.filter(
    (message) => !message.is_read
  ).length;

  if (loading) {
    return (
      <div className="inbox-page">
        <div className="premium-loading">
          <div className="loading-spinner"></div>
          <h3>Loading your inbox</h3>
          <p>Please wait a moment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="inbox-page">

      {/* =========================
          TOP NAVBAR
      ========================= */}

      <header className="premium-navbar">

        <div
          className="premium-brand"
          onClick={() => navigate("/inbox")}
        >
          <div className="brand-icon">
            ✉
          </div>

          <div>
            <div className="brand-title">
              Mail<span>System</span>
            </div>

            <div className="brand-subtitle">
              Internal Mail Platform
            </div>
          </div>
        </div>

        <div className="navbar-right">

          <div className="user-mini">
            <div className="user-mini-avatar">
              {getInitials(
                JSON.parse(
                  localStorage.getItem("user") ||
                    "{}"
                )?.name || "User"
              )}
            </div>

            <div className="user-mini-info">
              <strong>
                {JSON.parse(
                  localStorage.getItem("user") ||
                    "{}"
                )?.name || "User"}
              </strong>

              <span>Online</span>
            </div>
          </div>

          <button
            className="logout-btn"
            onClick={handleLogout}
          >
            Logout
          </button>

        </div>
      </header>


      {/* =========================
          MAIN
      ========================= */}

      <main className="inbox-container">

        {/* HERO */}
        <section className="inbox-hero">

          <div>
            <div className="eyebrow">
              <span className="status-dot"></span>
              MAILBOX
            </div>

            <h1>
              Your Inbox
            </h1>

            <p>
              Manage your conversations,
              replies and received messages
              in one place.
            </p>
          </div>

          <div className="hero-actions">

            <button
              className="compose-btn"
              onClick={() =>
                navigate("/compose")
              }
            >
              <span>＋</span>
              Compose Message
            </button>

            <button
              className="refresh-btn"
              onClick={() =>
                loadInbox(true)
              }
              disabled={refreshing}
            >
              <span
                className={
                  refreshing
                    ? "refresh-icon spinning"
                    : "refresh-icon"
                }
              >
                ↻
              </span>

              {refreshing
                ? "Refreshing..."
                : "Refresh"}
            </button>

          </div>
        </section>


        {/* =========================
            STAT CARDS
        ========================= */}

        <section className="mail-stats">

          <div className="stat-card">
            <div className="stat-icon inbox-icon">
              ✉
            </div>

            <div>
              <span>Total Messages</span>
              <strong>
                {messages.length}
              </strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon unread-icon">
              ●
            </div>

            <div>
              <span>Unread</span>
              <strong>
                {unreadCount}
              </strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon conversation-icon">
              💬
            </div>

            <div>
              <span>Conversations</span>
              <strong>
                {
                  new Set(
                    messages
                      .map(
                        (message) =>
                          message.thread_id ||
                          message.id
                      )
                  ).size
                }
              </strong>
            </div>
          </div>

        </section>


        {/* =========================
            ERROR
        ========================= */}

        {error && (
          <div className="premium-error">
            <span>⚠</span>

            <div>
              <strong>
                Something went wrong
              </strong>

              <p>{error}</p>
            </div>

            <button
              onClick={() => loadInbox()}
            >
              Try Again
            </button>
          </div>
        )}


        {/* =========================
            EMPTY INBOX
        ========================= */}

        {!error &&
          messages.length === 0 && (
            <section className="empty-inbox">

              <div className="empty-icon">
                📭
              </div>

              <h2>
                Your inbox is empty
              </h2>

              <p>
                You don't have any received
                messages yet.
              </p>

              <button
                className="compose-btn empty-compose"
                onClick={() =>
                  navigate("/compose")
                }
              >
                ＋ Send New Message
              </button>

            </section>
          )}


        {/* =========================
            MESSAGE LIST
        ========================= */}

        {messages.length > 0 && (
          <section className="messages-section">

            <div className="section-heading">
              <div>
                <h2>
                  Recent Messages
                </h2>

                <p>
                  Your latest conversations
                </p>
              </div>

              <span className="message-count">
                {messages.length} message
                {messages.length !== 1
                  ? "s"
                  : ""}
              </span>
            </div>


            <div className="message-list">

              {messages.map((message) => {

                const senderName =
                  message.sender_name ||
                  message.sender ||
                  "Unknown Sender";

                return (
                  <article
                    key={message.id}
                    className={
                      message.is_read
                        ? "message-card"
                        : "message-card unread-card"
                    }
                    onClick={() =>
                      navigate(
                        `/message/${message.id}`
                      )
                    }
                  >

                    {/* UNREAD BAR */}
                    {!message.is_read && (
                      <div className="unread-bar"></div>
                    )}

                    <div className="message-avatar">
                      {getInitials(
                        senderName
                      )}
                    </div>


                    <div className="message-content">

                      <div className="message-top">

                        <div className="sender-info">

                          <h3>
                            {senderName}

                            {!message.is_read && (
                              <span className="new-badge">
                                NEW
                              </span>
                            )}
                          </h3>

                          {message.sender_email && (
                            <span>
                              {
                                message.sender_email
                              }
                            </span>
                          )}

                        </div>

                        <time>
                          {message.created_at
                            ? new Date(
                                message.created_at
                              ).toLocaleString(
                                [],
                                {
                                  dateStyle:
                                    "medium",
                                  timeStyle:
                                    "short",
                                }
                              )
                            : ""}
                        </time>

                      </div>


                      <h2 className="message-subject">
                        {message.subject ||
                          "(No subject)"}
                      </h2>


                      <p className="message-preview">
                        {message.message
                          ? message.message
                              .length > 220
                            ? `${message.message.substring(
                                0,
                                220
                              )}...`
                            : message.message
                          : "(Attachment only)"}
                      </p>


                      <div className="message-footer">

                        {message.attachments &&
                          message.attachments
                            .length > 0 && (
                            <span className="tag attachment-tag">
                              📎{" "}
                              {
                                message.attachments
                                  .length
                              }{" "}
                              attachment
                              {message
                                .attachments
                                .length > 1
                                ? "s"
                                : ""}
                            </span>
                          )}


                        {message.thread_id && (
                          <span className="tag conversation-tag">
                            💬 Conversation
                          </span>
                        )}

                        <span className="open-message">
                          Open conversation →
                        </span>

                      </div>

                    </div>

                  </article>
                );
              })}

            </div>

          </section>
        )}

      </main>

    </div>
  );
};

export default Inbox;