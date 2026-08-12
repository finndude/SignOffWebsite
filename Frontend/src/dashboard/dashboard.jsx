import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ClipboardList,
  FileStack,
  LogOut,
  Upload,
  UserPlus,
  Users,
} from "lucide-react";
import { apiFetch } from "../utils/api";
import "./dashboard.css";

function Dashboard() {
  const navigate = useNavigate();
  const [role, setRole] = useState(null);

  useEffect(() => {
    apiFetch("/auth/me")
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to load user.");
        }

        return res.json();
      })
      .then((data) => setRole(data.role))
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await apiFetch("/auth/logout", {
      method: "POST",
    });

    navigate("/");
  };

  const dashboardActions = [
    {
      label: "My documents",
      description:
        "Review assigned files and complete sign-off requests.",
      icon: FileStack,
      path: "/documents",
      adminOnly: false,
    },
    {
      label: "Upload documents",
      description:
        "Upload PDFs and assign them to someone for review.",
      icon: Upload,
      path: "/admin/upload",
      adminOnly: true,
    },
    {
      label: "Assignments",
      description:
        "Track whether uploaded files have been signed off.",
      icon: ClipboardList,
      path: "/admin/assignments",
      adminOnly: true,
    },
    {
      label: "Invite user",
      description:
        "Add a signer and send them an activation link.",
      icon: UserPlus,
      path: "/admin/add-user",
      adminOnly: true,
    },
    {
      label: "Manage users",
      description:
        "View users and change their role between signer and admin.",
      icon: Users,
      path: "/admin/users",
      adminOnly: true,
    },
  ].filter(
    (action) =>
      !action.adminOnly || role === "admin"
  );

  return (
    <div className="dashboard-page app-background">
      <button
        type="button"
        className="dashboard-logout"
        onClick={handleLogout}
      >
        <LogOut
          size={18}
          strokeWidth={1.8}
        />
        Log out
      </button>

      <div className="dashboard-shell">
        <div className="dashboard-heading">
          <span className="dashboard-kicker">
            {role === "admin"
              ? "Admin workspace"
              : "Signing workspace"}
          </span>

          <h1>Dashboard</h1>

          <p>
            Choose where you want to go next.
          </p>
        </div>

        <div className="dashboard-action-grid">
          {dashboardActions.map((action) => {
            const Icon = action.icon;

            return (
              <button
                key={action.path}
                type="button"
                className="dashboard-action-card"
                onClick={() =>
                  navigate(action.path)
                }
              >
                <span className="dashboard-action-icon">
                  <Icon
                    size={38}
                    strokeWidth={1.7}
                  />
                </span>

                <span className="dashboard-action-text">
                  <span className="dashboard-action-title">
                    {action.label}
                  </span>

                  <span className="dashboard-action-description">
                    {action.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;