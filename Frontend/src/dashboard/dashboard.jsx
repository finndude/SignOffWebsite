import React from "react";
import "./dashboard.css";

/**
 * Placeholder dashboard screen.
 * Just a redirect target for login right now — real UI comes later.
 */
function Dashboard() {
  return (
    <div className="dashboard-page">
      <div className="dashboard-card">
        <h1>Dashboard</h1>
        <p>You're logged in. This screen is a placeholder for now.</p>
        <button type="button" className="dashboard-logout">
          Log out
        </button>
      </div>
    </div>
  );
}

export default Dashboard;