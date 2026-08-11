import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Lock, Eye, EyeOff } from "lucide-react";
import { apiFetch } from "../utils/api";
import "./activateaccount.css";

function ActivateAccount() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("This activation link is missing its token.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiFetch("/auth/activate-account", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.detail || "Something went wrong. Please try again.");
        setIsSubmitting(false);
        return;
      }

      setSuccessMessage("Account activated! Redirecting to login…");
      setTimeout(() => navigate("/"), 1500);
    } catch (err) {
      setError("Couldn't reach the server. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="activate-page">
      <div className="activate-card">
        <h1 className="activate-title">Set your password</h1>
        <p className="activate-subtitle">
          Choose a password to activate your account.
        </p>

        <form className="activate-form" onSubmit={handleSubmit}>
          {error && <p className="activate-error">{error}</p>}
          {successMessage && <p className="activate-success">{successMessage}</p>}

          <label className="activate-label" htmlFor="password">
            New password
          </label>
          <div className="activate-input-wrapper">
            <Lock className="activate-input-icon" size={18} strokeWidth={1.8} />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              className="activate-input"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
            <button
              type="button"
              className="activate-input-toggle"
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

          <label className="activate-label" htmlFor="confirmPassword">
            Confirm password
          </label>
          <div className="activate-input-wrapper">
            <Lock className="activate-input-icon" size={18} strokeWidth={1.8} />
            <input
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              className="activate-input"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>

          <button type="submit" className="activate-button" disabled={isSubmitting}>
            {isSubmitting ? "Activating…" : "Activate Account"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ActivateAccount;