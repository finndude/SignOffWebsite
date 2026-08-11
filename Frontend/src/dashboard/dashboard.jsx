import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserPlus } from "lucide-react";
import { apiFetch } from "../utils/api";
import "./dashboard.css";

/**
 * Placeholder dashboard screen.
 * Just a redirect target for login right now — real UI comes later.
 */
function Dashboard() {
  const navigate = useNavigate();
  const [role, setRole] = useState(null);

  useEffect(() => {
    apiFetch("/auth/me")
      .then((res) => res.json())
      .then((data) => setRole(data.role))
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await apiFetch("/auth/logout", { method: "POST" });
    navigate("/");
  };

  return (
    <div className="dashboard-page">
      {role === "admin" && (
        <button
          type="button"
          className="dashboard-add-icon"
          onClick={() => navigate("/admin/add-user")}
          aria-label="Add user"
        >
          <UserPlus size={20} strokeWidth={1.8} />
        </button>
      )}

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