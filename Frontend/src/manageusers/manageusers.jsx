import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ShieldCheck,
  User,
  Users,
} from "lucide-react";
import { apiFetch } from "../utils/api";
import "./manageusers.css";

function ManageUsers() {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [currentUserId, setCurrentUserId] =
    useState(null);

  const [isLoading, setIsLoading] =
    useState(true);
  const [error, setError] = useState("");
  const [savingUserId, setSavingUserId] =
    useState(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    setError("");

    try {
      const meResponse = await apiFetch(
        "/auth/me"
      );

      if (!meResponse.ok) {
        navigate("/");
        return;
      }

      const me = await meResponse.json();

      if (me.role !== "admin") {
        navigate("/dashboard");
        return;
      }

      setCurrentUserId(me.id);

      const usersResponse = await apiFetch(
        "/admin/users"
      );

      if (!usersResponse.ok) {
        const data =
          await usersResponse
            .json()
            .catch(() => ({}));

        throw new Error(
          data.detail ||
            "Failed to load users."
        );
      }

      const data = await usersResponse.json();

      setUsers(
        Array.isArray(data) ? data : []
      );
    } catch (err) {
      setError(
        err.message ||
          "Couldn't load users. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = async (
    user,
    newRole
  ) => {
    if (user.id === currentUserId) {
      return;
    }

    if (user.role === newRole) {
      return;
    }

    setSavingUserId(user.id);
    setError("");

    try {
      const response = await apiFetch(
        `/admin/users/${user.id}/role`,
        {
          method: "PATCH",
          body: JSON.stringify({
            role: newRole,
          }),
        }
      );

      const data = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Failed to update the user's role."
        );
      }

      setUsers((currentUsers) =>
        currentUsers.map((currentUser) =>
          currentUser.id === user.id
            ? {
                ...currentUser,
                role: data.role,
              }
            : currentUser
        )
      );
    } catch (err) {
      setError(
        err.message ||
          "Couldn't update the user's role."
      );
    } finally {
      setSavingUserId(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) {
      return "—";
    }

    return new Date(
      dateString
    ).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="manage-users-page app-background">
      <div className="manage-users-container">
        <div className="manage-users-header">
          <button
            type="button"
            className="manage-users-back"
            onClick={() =>
              navigate("/dashboard")
            }
            aria-label="Back to dashboard"
          >
            <ArrowLeft
              size={18}
              strokeWidth={1.8}
            />
          </button>

          <div>
            <span className="manage-users-kicker">
              Admin
            </span>

            <h1 className="manage-users-title">
              Manage users
            </h1>

            <p className="manage-users-subtitle">
              Manage user access and roles.
            </p>
          </div>
        </div>

        {error && (
          <div className="manage-users-error">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="manage-users-empty">
            Loading users…
          </div>
        ) : users.length === 0 ? (
          <div className="manage-users-empty">
            <Users
              size={28}
              strokeWidth={1.7}
            />
            <span>No users found.</span>
          </div>
        ) : (
          <div className="manage-users-list">
            {users.map((user) => {
              const isCurrentUser =
                user.id === currentUserId;

              const isSaving =
                savingUserId === user.id;

              return (
                <div
                  key={user.id}
                  className="manage-users-row"
                >
                  <div className="manage-users-avatar">
                    {user.role === "admin" ? (
                      <ShieldCheck
                        size={21}
                        strokeWidth={1.8}
                      />
                    ) : (
                      <User
                        size={21}
                        strokeWidth={1.8}
                      />
                    )}
                  </div>

                  <div className="manage-users-info">
                    <div className="manage-users-name">
                      {user.name}

                      {isCurrentUser && (
                        <span className="manage-users-you">
                          You
                        </span>
                      )}
                    </div>

                    <div className="manage-users-email">
                      {user.email}
                    </div>

                    <div className="manage-users-meta">
                      Added{" "}
                      {formatDate(
                        user.created_at
                      )}

                      {user.is_pending_activation && (
                        <span className="manage-users-pending">
                          Pending activation
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="manage-users-role">
                    <label
                      htmlFor={`role-${user.id}`}
                      className="manage-users-role-label"
                    >
                      Role
                    </label>

                    <select
                      id={`role-${user.id}`}
                      className="manage-users-role-select"
                      value={user.role}
                      disabled={
                        isCurrentUser ||
                        isSaving
                      }
                      onChange={(event) =>
                        handleRoleChange(
                          user,
                          event.target.value
                        )
                      }
                    >
                      <option value="assignee">
                        Regular signer
                      </option>

                      <option value="admin">
                        Admin
                      </option>
                    </select>

                    {isCurrentUser && (
                      <span className="manage-users-role-help">
                        Your own role cannot be changed.
                      </span>
                    )}

                    {isSaving && (
                      <span className="manage-users-saving">
                        Saving…
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default ManageUsers;