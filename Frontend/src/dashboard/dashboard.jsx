import React from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../utils/api";
import "./dashboard.css";

/**
 * Placeholder dashboard screen.
 * Just a redirect target for login right now — real UI comes later.
 */
function Dashboard() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await apiFetch("/auth/logout", { method: "POST" });
    navigate("/");
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-card">
        <h1>Dashboard</h1>
        <p>You're logged in. This screen is a placeholder for now.</p>
        <button type="button" className="dashboard-logout" onClick={handleLogout}>
          Log out
        </button>
      </div>
    </div>
  );
}

export default Dashboard;