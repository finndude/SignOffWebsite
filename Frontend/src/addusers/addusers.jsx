import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, UserPlus } from "lucide-react";
import { apiFetch } from "../utils/api";
import "./addusers.css";

function AddUsers() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
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
      const response = await apiFetch("/admin/invite-user", {
        method: "POST",
        body: JSON.stringify({ name, email }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.detail || "Something went wrong. Please try again.");
        setIsSubmitting(false);
        return;
      }

      setSuccessMessage(data.detail || "Invite sent.");
      setName("");
      setEmail("");
      setIsSubmitting(false);
    } catch (err) {
      setError("Couldn't reach the server. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="addusers-page">
      <div className="addusers-card">
        <button
          type="button"
          className="addusers-back"
          onClick={() => navigate("/dashboard")}
          aria-label="Back to dashboard"
        >
          <ArrowLeft size={18} strokeWidth={1.8} />
        </button>

        <div className="addusers-icon">
          <UserPlus size={26} strokeWidth={1.8} />
        </div>

        <h1 className="addusers-title">Invite a user</h1>
        <p className="addusers-subtitle">
          They'll get an email with a link to set up their account.
        </p>

        <form className="addusers-form" onSubmit={handleSubmit}>
          {error && <p className="addusers-error">{error}</p>}
          {successMessage && <p className="addusers-success">{successMessage}</p>}

          <label className="addusers-label" htmlFor="name">
            Name
          </label>
          <input
            id="name"
            type="text"
            className="addusers-input"
            placeholder="Jane Smith"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <label className="addusers-label" htmlFor="email">
            Email address
          </label>
          <input
            id="email"
            type="email"
            className="addusers-input"
            placeholder="jane@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <button type="submit" className="addusers-button" disabled={isSubmitting}>
            {isSubmitting ? "Sending invite…" : "Send Invite"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AddUsers;