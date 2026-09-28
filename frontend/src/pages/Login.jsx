import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "./Login.css";

function Login() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email.trim()) {
      setError("Please enter your email.");
      return;
    }

    if (!formData.password) {
      setError("Please enter your password.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await api.post("/auth/login", {
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });

      if (response.data.success) {
        localStorage.setItem(
          "token",
          response.data.token
        );

        localStorage.setItem(
          "user",
          JSON.stringify(response.data.user)
        );

        navigate("/inbox", {
          replace: true,
        });
      } else {
        setError(
          response.data.message || "Login failed."
        );
      }
    } catch (error) {
      console.error("Login error:", error);

      setError(
        error.response?.data?.message ||
          "Unable to login. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">

      <div className="login-container">

        {/* ================= LEFT SIDE ================= */}

        <div className="login-left">

          <div className="login-brand">
            Mail<span>System</span>
          </div>

          <div className="brand-line"></div>

          <h1 className="welcome-title">
            Welcome Back!
          </h1>

          <p className="welcome-text">
            Login to your account and
            <br />
            continue your conversations.
          </p>

          {/* Illustration */}

          <div className="mail-illustration">

            <div className="circle circle-one"></div>
            <div className="circle circle-two"></div>

            <div className="floating-icon telegram">
              ➤
            </div>

            <div className="floating-icon image">
              ◆
            </div>

            <div className="floating-icon document">
              ▤
            </div>

            <div className="floating-icon lock">
              🔒
            </div>

            <div className="envelope">

              <div className="paper">
                <span></span>
                <span></span>
                <span></span>
              </div>

              <div className="envelope-body"></div>

            </div>

          </div>

          {/* Features */}

          <div className="login-features">

            <div className="feature">

              <div className="feature-icon purple">
                ♢
              </div>

              <strong>
                Secure
              </strong>

              <span>
                Messaging
              </span>

            </div>

            <div className="feature">

              <div className="feature-icon orange">
                ⚡
              </div>

              <strong>
                Fast &amp;
              </strong>

              <span>
                Reliable
              </span>

            </div>

            <div className="feature">

              <div className="feature-icon green">
                🔒
              </div>

              <strong>
                Private
              </strong>

              <span>
                &amp; Safe
              </span>

            </div>

          </div>

        </div>


        {/* ================= RIGHT SIDE ================= */}

        <div className="login-right">

          <div className="login-form-wrapper">

            <h2 className="login-title">
              Login to your account
            </h2>

            <p className="login-subtitle">
              Enter your email and password to access MailSystem
            </p>


            <form
              onSubmit={handleSubmit}
              className="login-form"
            >

              {/* EMAIL */}

              <div className="login-field">

                <label htmlFor="email">
                  Email Address
                </label>

                <div className="input-wrapper">

                  <span className="input-icon">
                    ✉
                  </span>

                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter your email"
                    autoComplete="email"
                    disabled={loading}
                  />

                </div>

              </div>


              {/* PASSWORD */}

              <div className="login-field">

                <label htmlFor="password">
                  Password
                </label>

                <div className="input-wrapper">

                  <span className="input-icon">
                    🔒
                  </span>

                  <input
                    id="password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    disabled={loading}
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() =>
                      setShowPassword(
                        !showPassword
                      )
                    }
                    disabled={loading}
                  >
                    {showPassword ? "◉" : "◌"}
                  </button>

                </div>

              </div>


              {/* FORGOT PASSWORD */}

              <div className="forgot-row">

                <button
                  type="button"
                  className="forgot-btn"
                  onClick={() =>
                    setError(
                      "Please contact the administrator to reset your password."
                    )
                  }
                >
                  Forgot password?
                </button>

              </div>


              {/* ERROR */}

              {error && (
                <div className="login-error">
                  {error}
                </div>
              )}


              {/* LOGIN */}

              <button
                type="submit"
                className="login-submit"
                disabled={loading}
              >

                <span>
                  {loading
                    ? "Logging in..."
                    : "Login"}
                </span>

                {!loading && (
                  <span className="arrow">
                    →
                  </span>
                )}

              </button>


              {/* DIVIDER */}

              <div className="login-divider">
                <span></span>
                <b>OR</b>
                <span></span>
              </div>


              {/* GOOGLE */}

              <button
                type="button"
                className="google-button"
                onClick={() =>
                  setError(
                    "Google login is not configured yet."
                  )
                }
              >

                <span className="google-icon">
                  G
                </span>

                <span>
                  Continue with Google
                </span>

              </button>

            </form>


            {/* REGISTER */}

            <div className="register-text">

              Don't have an account?

              <button
                type="button"
                className="create-account"
                onClick={() =>
                  navigate("/register")
                }
                disabled={loading}
              >
                Create an account
              </button>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}

export default Login;