import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Lock } from "lucide-react";
import { apiFetch } from "../utils/api";
import "./resetpassword.css";

function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordMeetsRules = password.length >= 8 && /\d/.test(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("This reset link is missing its token.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    if (!passwordMeetsRules) {
      setError("Password must be at least 8 characters and contain a number.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiFetch("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.detail || "Something went wrong. Please try again.");
        setIsSubmitting(false);
        return;
      }

      setSuccessMessage("Password reset. Redirecting to login...");
      setTimeout(() => navigate("/"), 1500);
    } catch (err) {
      setError("Couldn't reach the server. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="reset-page app-background">
      <div className="reset-card">
        <h1 className="reset-title">Choose a new password</h1>
        <p className="reset-subtitle">
          Use at least 8 characters and include a number.
        </p>

        <form className="reset-form" onSubmit={handleSubmit}>
          {error && <p className="reset-error">{error}</p>}
          {successMessage && <p className="reset-success">{successMessage}</p>}

          <label className="reset-label" htmlFor="password">
            New password
          </label>
          <div className="reset-input-wrapper">
            <Lock className="reset-input-icon" size={18} strokeWidth={1.8} />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              className="reset-input"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              pattern="(?=.*\d).{8,}"
              title="Password must be at least 8 characters and contain a number."
            />
            <button
              type="button"
              className="reset-input-toggle"
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

          <label className="reset-label" htmlFor="confirmPassword">
            Confirm password
          </label>
          <div className="reset-input-wrapper">
            <Lock className="reset-input-icon" size={18} strokeWidth={1.8} />
            <input
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              className="reset-input"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              pattern="(?=.*\d).{8,}"
              title="Password must be at least 8 characters and contain a number."
            />
          </div>

          <p className="reset-password-rules">
            Password must be at least 8 characters and contain a number.
          </p>

          <button type="submit" className="reset-button" disabled={isSubmitting}>
            {isSubmitting ? "Resetting..." : "Reset Password"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ResetPassword;
