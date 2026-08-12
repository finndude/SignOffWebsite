import React, {
  useEffect,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ShieldCheck,
  User,
  Users,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { apiFetch } from "../utils/api";
import "./manageusers.css";

const PAGE_SIZE = 20;

function ManageUsers() {
  const navigate = useNavigate();

  const [users, setUsers] =
    useState([]);

  const [currentUserId, setCurrentUserId] =
    useState(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [savingUserId, setSavingUserId] =
    useState(null);

  const [search, setSearch] =
    useState("");

  const [page, setPage] =
    useState(1);

  const [totalCount, setTotalCount] =
    useState(0);

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        totalCount / PAGE_SIZE
      )
    );

  const loadUsers = async (
    searchValue = "",
    requestedPage = page
  ) => {
    setIsLoading(true);
    setError("");

    try {
      const meResponse =
        await apiFetch("/auth/me");

      if (!meResponse.ok) {
        navigate("/");
        return;
      }

      const me =
        await meResponse.json();

      if (me.role !== "admin") {
        navigate("/dashboard");
        return;
      }

      setCurrentUserId(me.id);

      const params =
        new URLSearchParams();

      const trimmedSearch =
        searchValue.trim();

      if (
        trimmedSearch.length >= 2
      ) {
        params.set(
          "search",
          trimmedSearch
        );
      }

      params.set(
        "page",
        String(requestedPage)
      );

      params.set(
        "page_size",
        String(PAGE_SIZE)
      );

      const usersResponse =
        await apiFetch(
          `/admin/users?${params.toString()}`
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

      const data =
        await usersResponse.json();

      const total =
        Number(
          usersResponse.headers.get(
            "X-Total-Count"
          )
        ) || 0;

      setUsers(
        Array.isArray(data)
          ? data
          : []
      );

      setTotalCount(total);
      setPage(requestedPage);

    } catch (err) {
      setError(
        err.message ||
          "Couldn't load users. Please try again."
      );

    } finally {
      setIsLoading(false);
    }
  };

  /*
   * Reset to first page when searching.
   */
  useEffect(() => {
    setPage(1);
  }, [search]);

  /*
   * Load whenever search or page changes.
   */
  useEffect(() => {
    const timeout =
      setTimeout(() => {
        loadUsers(
          search,
          page
        );
      }, 300);

    return () =>
      clearTimeout(timeout);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    search,
    page,
  ]);

  const handleRoleChange = async (
    user,
    newRole
  ) => {
    if (
      user.id === currentUserId
    ) {
      return;
    }

    if (user.role === newRole) {
      return;
    }

    setSavingUserId(user.id);
    setError("");

    try {
      const response =
        await apiFetch(
          `/admin/users/${user.id}/role`,
          {
            method: "PATCH",
            body: JSON.stringify({
              role: newRole,
            }),
          }
        );

      const data =
        await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Failed to update the user's role."
        );
      }

      setUsers(
        (currentUsers) =>
          currentUsers.map(
            (currentUser) =>
              currentUser.id ===
              user.id
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

  const formatDate = (
    dateString
  ) => {
    if (!dateString) {
      return "—";
    }

    return new Date(
      dateString
    ).toLocaleDateString(
      undefined,
      {
        year: "numeric",
        month: "short",
        day: "numeric",
      }
    );
  };

  const goToPage = (
    nextPage
  ) => {
    if (
      nextPage < 1 ||
      nextPage > totalPages ||
      nextPage === page
    ) {
      return;
    }

    setPage(nextPage);
  };

  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from(
        {
          length: totalPages,
        },
        (_, index) =>
          index + 1
      );
    }

    const pages = [1];

    if (page > 4) {
      pages.push(
        "ellipsis-left"
      );
    }

    const start =
      Math.max(
        2,
        page - 1
      );

    const end =
      Math.min(
        totalPages - 1,
        page + 1
      );

    for (
      let number = start;
      number <= end;
      number++
    ) {
      pages.push(number);
    }

    if (
      page <
      totalPages - 3
    ) {
      pages.push(
        "ellipsis-right"
      );
    }

    pages.push(
      totalPages
    );

    return pages;
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

        <div className="manage-users-search">

          <Search
            size={18}
            strokeWidth={1.8}
            className="manage-users-search-icon"
          />

          <input
            type="text"
            value={search}
            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }
            placeholder="Search users by name or email..."
            aria-label="Search users"
          />

          {search && (
            <button
              type="button"
              className="manage-users-search-clear"
              onClick={() =>
                setSearch("")
              }
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}

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

        ) : users.length ===
          0 ? (

          <div className="manage-users-empty">

            <Users
              size={28}
              strokeWidth={1.7}
            />

            <span>
              {search.trim()
                .length >= 2
                ? "No users matched your search."
                : "No users found."}
            </span>

          </div>

        ) : (

          <>
            <div className="manage-users-list">

              {users.map((user) => {

                const isCurrentUser =
                  user.id ===
                  currentUserId;

                const isSaving =
                  savingUserId ===
                  user.id;

                return (
                  <div
                    key={user.id}
                    className="manage-users-row"
                  >

                    <div className="manage-users-avatar">

                      {user.role ===
                      "admin" ? (
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
                        value={
                          user.role
                        }
                        disabled={
                          isCurrentUser ||
                          isSaving
                        }
                        onChange={(
                          event
                        ) =>
                          handleRoleChange(
                            user,
                            event.target
                              .value
                          )
                        }
                      >

                        <option value="assignee">
                          Regular Signer
                        </option>

                        <option value="admin">
                          Admin
                        </option>

                      </select>

                      {isCurrentUser && (
                        <span className="manage-users-role-help">
                          Your own role cannot
                          be changed.
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

            {totalPages > 1 && (
              <div className="manage-users-pagination">

                <button
                  type="button"
                  className="manage-users-pagination-button"
                  onClick={() =>
                    goToPage(
                      page - 1
                    )
                  }
                  disabled={
                    page === 1 ||
                    isLoading
                  }
                  aria-label="Previous page"
                >
                  <ChevronLeft
                    size={16}
                  />

                  Previous
                </button>

                <div className="manage-users-pagination-pages">

                  {getPageNumbers().map(
                    (pageNumber) =>
                      typeof pageNumber ===
                      "string" ? (
                        <span
                          key={
                            pageNumber
                          }
                          className="manage-users-pagination-ellipsis"
                        >
                          …
                        </span>
                      ) : (
                        <button
                          key={
                            pageNumber
                          }
                          type="button"
                          className={`manage-users-pagination-page ${
                            pageNumber ===
                            page
                              ? "active"
                              : ""
                          }`}
                          onClick={() =>
                            goToPage(
                              pageNumber
                            )
                          }
                          disabled={
                            isLoading
                          }
                          aria-label={`Page ${pageNumber}`}
                          aria-current={
                            pageNumber ===
                            page
                              ? "page"
                              : undefined
                          }
                        >
                          {
                            pageNumber
                          }
                        </button>
                      )
                  )}

                </div>

                <button
                  type="button"
                  className="manage-users-pagination-button"
                  onClick={() =>
                    goToPage(
                      page + 1
                    )
                  }
                  disabled={
                    page ===
                      totalPages ||
                    isLoading
                  }
                  aria-label="Next page"
                >
                  Next

                  <ChevronRight
                    size={16}
                  />
                </button>

              </div>
            )}

          </>
        )}

      </div>
    </div>
  );
}

export default ManageUsers;