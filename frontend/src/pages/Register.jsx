import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "./Register.css";

function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    mobile: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    const name = formData.name.trim();
    const email = formData.email.trim().toLowerCase();
    const mobile = formData.mobile.trim();

    /* =========================
       VALIDATION
    ========================= */

    if (!name) {
      setError("Please enter your name.");
      return;
    }

    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!mobile) {
      setError("Please enter your mobile number.");
      return;
    }

    if (!/^[0-9]{10,15}$/.test(mobile)) {
      setError("Mobile number must contain 10 to 15 digits.");
      return;
    }

    if (!formData.password) {
      setError("Please enter a password.");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    /* =========================
       REGISTER
    ========================= */

    try {
      setLoading(true);

      const response = await api.post("/auth/register", {
        name,
        email,
        mobile,
        password: formData.password,
      });

      if (response.data.success) {
        setSuccess(
          "Registration successful! Redirecting to login..."
        );

        setFormData({
          name: "",
          email: "",
          mobile: "",
          password: "",
          confirmPassword: "",
        });

        setTimeout(() => {
          navigate("/login", {
            replace: true,
          });
        }, 1200);
      } else {
        setError(
          response.data.message || "Registration failed."
        );
      }
    } catch (error) {
      console.error("Registration error:", error);

      setError(
        error.response?.data?.message ||
          "Unable to register. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">

      <div className="register-card">

        {/* =================================================
            LEFT PREMIUM PANEL
        ================================================= */}

        <div className="register-left">

          <div className="register-brand">
            Mail<span>System</span>
          </div>

          <div className="brand-line"></div>

          <h1>
            Join MailSystem
          </h1>

          <p className="register-description">
            Create your account and start
            your secure communication
            journey today.
          </p>

          {/* Envelope Illustration */}

          <div className="mail-illustration">

            <div className="mail-glow"></div>

            <div className="mail-icon">
              ✉
            </div>

          </div>

          {/* Features */}

          <div className="register-features">

            <div className="feature">
              <div className="feature-icon">
                🛡
              </div>

              <div>
                <strong>
                  Secure Messaging
                </strong>

                <span>
                  Private & protected
                </span>
              </div>
            </div>

            <div className="feature">
              <div className="feature-icon orange">
                ⚡
              </div>

              <div>
                <strong>
                  Fast & Reliable
                </strong>

                <span>
                  Quick communication
                </span>
              </div>
            </div>

            <div className="feature">
              <div className="feature-icon green">
                🔒
              </div>

              <div>
                <strong>
                  Private & Safe
                </strong>

                <span>
                  Your messages stay private
                </span>
              </div>
            </div>

          </div>

        </div>

        {/* =================================================
            RIGHT REGISTER PANEL
        ================================================= */}

        <div className="register-right">

          <div className="register-header">

            <h2>
              Create your MailSystem account
            </h2>

            <p>
              Join us and start managing your
              conversations securely.
            </p>

          </div>

          <form
            onSubmit={handleSubmit}
            className="register-form"
          >

            {/* NAME */}

            <div className="register-group">

              <label htmlFor="name">
                Full Name
              </label>

              <input
                id="name"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your full name"
                autoComplete="name"
                disabled={loading}
              />

            </div>

            {/* EMAIL */}

            <div className="register-group">

              <label htmlFor="email">
                Email Address
              </label>

              <input
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email address"
                autoComplete="email"
                disabled={loading}
              />

            </div>

            {/* MOBILE */}

            <div className="register-group">

              <label htmlFor="mobile">
                Mobile Number
              </label>

              <input
                id="mobile"
                type="tel"
                name="mobile"
                value={formData.mobile}
                onChange={handleChange}
                placeholder="Enter mobile number"
                inputMode="numeric"
                autoComplete="tel"
                disabled={loading}
              />

            </div>

            {/* PASSWORD */}

            <div className="register-group">

              <label htmlFor="password">
                Password
              </label>

              <input
                id="password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Create a password"
                autoComplete="new-password"
                disabled={loading}
              />

            </div>

            {/* CONFIRM PASSWORD */}

            <div className="register-group">

              <label htmlFor="confirmPassword">
                Confirm Password
              </label>

              <input
                id="confirmPassword"
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
                autoComplete="new-password"
                disabled={loading}
              />

            </div>

            {/* ERROR */}

            {error && (
              <div className="register-error">
                {error}
              </div>
            )}

            {/* SUCCESS */}

            {success && (
              <div className="register-success">
                {success}
              </div>
            )}

            {/* BUTTON */}

            <button
              type="submit"
              className="register-submit"
              disabled={loading}
            >
              {loading
                ? "Creating Account..."
                : "Create Account"}
            </button>

          </form>

          {/* FOOTER */}

          <div className="register-footer">

            <span>
              Already have an account?
            </span>

            <button
              type="button"
              onClick={() => navigate("/login")}
              disabled={loading}
            >
              Login
            </button>

          </div>

        </div>

      </div>

    </div>
  );
}

export default Register;