import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { apiFetch } from "../utils/api";
import "./login.css";

/**
 * Login screen — now wired to the real /auth/login endpoint.
 * Matches the DocFlow login design: logo, welcome copy,
 * email/password fields, primary action, and a footer strip.
 */
function Login() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.detail || "Something went wrong. Please try again.");
        setIsSubmitting(false);
        return;
      }

      navigate("/dashboard");
    } catch (err) {
      setError("Couldn't reach the server. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <svg
            className="login-logo-icon"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M6 3.5C6 2.67157 6.67157 2 7.5 2H14L18 6V20.5C18 21.3284 17.3284 22 16.5 22H7.5C6.67157 22 6 21.3284 6 20.5V3.5Z"
              stroke="#2F5EF5"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path
              d="M14 2V6H18"
              stroke="#2F5EF5"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path
              d="M8.5 16.5C9.5 15 10 13.8 9.6 13.1C9.2 12.4 8.3 12.9 8.4 13.7C8.5 14.7 9.8 15.2 11 14.4C12 13.7 12.6 12.3 13.4 13C14 13.5 13.6 14.4 14.4 14.6C15 14.75 15.5 14.2 15.6 13.7"
              stroke="#2F5EF5"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="login-logo-text">DocFlow</span>
        </div>

        <h1 className="login-title">Welcome back</h1>
        <p className="login-subtitle">Sign in to manage and sign your documents</p>

        <form className="login-form" onSubmit={handleSubmit}>
          {error && <p className="login-error">{error}</p>}

          <label className="login-label" htmlFor="email">
            Email address
          </label>
          <div className="login-input-wrapper">
            <Mail className="login-input-icon" size={18} strokeWidth={1.8} />
            <input
              id="email"
              type="email"
              className="login-input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <label className="login-label" htmlFor="password">
            Password
          </label>
          <div className="login-input-wrapper">
            <Lock className="login-input-icon" size={18} strokeWidth={1.8} />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              className="login-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="login-input-toggle"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff size={18} strokeWidth={1.8} />
              ) : (
                <Eye size={18} strokeWidth={1.8} />
              )}
            </button>
          </div>

          <button type="submit" className="login-button" disabled={isSubmitting}>
            {isSubmitting ? "Logging in…" : "Log In"}
          </button>
        </form>

        <button
          type="button"
          className="login-forgot"
          onClick={() => navigate("/forgot-password")}
        >
          Forgot password?
        </button>

        <div className="login-footer">
          <div className="login-footer-trust">
            <ShieldCheck size={16} strokeWidth={1.8} />
            <span>Secure. Private. Trusted.</span>
          </div>
          <span className="login-footer-version">v1.2.0</span>
        </div>
      </div>
    </div>
  );
}

export default Login;
