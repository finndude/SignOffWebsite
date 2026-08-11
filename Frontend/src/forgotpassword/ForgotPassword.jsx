import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mail } from "lucide-react";
import { apiFetch } from "../utils/api";
import "./forgotpassword.css";

function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      const response = await apiFetch("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.detail || "Something went wrong. Please try again.");
        setIsSubmitting(false);
        return;
      }

      setSuccessMessage(
        data.detail || "If an account exists, a reset link has been sent."
      );
      setIsSubmitting(false);
    } catch (err) {
      setError("Couldn't reach the server. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="forgot-page app-background">
      <div className="forgot-card">
        <button
          type="button"
          className="forgot-back"
          onClick={() => navigate("/")}
          aria-label="Back to login"
        >
          <ArrowLeft size={18} strokeWidth={1.8} />
        </button>

        <h1 className="forgot-title">Reset password</h1>
        <p className="forgot-subtitle">
          Enter your email and we'll send you a secure reset link.
        </p>

        <form className="forgot-form" onSubmit={handleSubmit}>
          {error && <p className="forgot-error">{error}</p>}
          {successMessage && <p className="forgot-success">{successMessage}</p>}

          <label className="forgot-label" htmlFor="email">
            Email address
          </label>
          <div className="forgot-input-wrapper">
            <Mail className="forgot-input-icon" size={18} strokeWidth={1.8} />
            <input
              id="email"
              type="email"
              className="forgot-input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="forgot-button" disabled={isSubmitting}>
            {isSubmitting ? "Sending..." : "Send Reset Link"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ForgotPassword;
