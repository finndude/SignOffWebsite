import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  ClipboardList,
  Search,
  X,
} from "lucide-react";
import { apiFetch } from "../utils/api";
import "./adminassignments.css";

function AdminAssignments() {
  const navigate = useNavigate();

  const [assignments, setAssignments] =
    useState([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [sort, setSort] =
    useState("newest");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [dateFrom, setDateFrom] =
    useState("");

  const [dateTo, setDateTo] =
    useState("");

  const loadAssignments = async () => {
    setIsLoading(true);
    setError("");

    try {
      const params =
        new URLSearchParams();

      if (search.trim().length >= 2) {
        params.set(
          "search",
          search.trim()
        );
      }

      params.set("sort", sort);

      if (statusFilter !== "all") {
        params.set(
          "status",
          statusFilter
        );
      }

      if (dateFrom) {
        params.set(
          "date_from",
          dateFrom
        );
      }

      if (dateTo) {
        params.set(
          "date_to",
          dateTo
        );
      }

      const queryString =
        params.toString();

      const response =
        await apiFetch(
          `/admin/assignments?${queryString}`
        );

      if (!response.ok) {
        throw new Error(
          "Failed to load assignments."
        );
      }

      const data =
        await response.json();

      setAssignments(
        Array.isArray(data)
          ? data
          : []
      );
    } catch {
      setError(
        "Couldn't load assignments. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timeout =
      setTimeout(() => {
        loadAssignments();
      }, 300);

    return () =>
      clearTimeout(timeout);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    search,
    sort,
    statusFilter,
    dateFrom,
    dateTo,
  ]);

  const formatDate = (
    isoString
  ) =>
    new Date(
      isoString
    ).toLocaleDateString(
      undefined,
      {
        year: "numeric",
        month: "short",
        day: "numeric",
      }
    );

  const openAssignment = (
    assignmentId
  ) => {
    navigate(
      `/documents/${assignmentId}`
    );
  };

  const clearDates = () => {
    setDateFrom("");
    setDateTo("");
  };

  return (
    <div className="adminassignments-page app-background">
      <div className="adminassignments-container">

        <div className="adminassignments-header">
          <button
            type="button"
            className="adminassignments-back"
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
            <h1 className="adminassignments-title">
              Assignments
            </h1>

            <p className="adminassignments-subtitle">
              Track uploaded files and
              sign-off progress.
            </p>
          </div>
        </div>

        <div className="adminassignments-filters">

          {/* Search */}

          <div className="adminassignments-search">
            <Search
              size={18}
              strokeWidth={1.8}
              className="adminassignments-search-icon"
            />

            <input
              type="text"
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              placeholder="Search assignments or users..."
              aria-label="Search assignments"
            />

            {search && (
              <button
                type="button"
                className="adminassignments-search-clear"
                onClick={() =>
                  setSearch("")
                }
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Sort */}

          <select
            className="adminassignments-filter-select"
            value={sort}
            onChange={(e) =>
              setSort(
                e.target.value
              )
            }
            aria-label="Sort assignments"
          >
            <option value="newest">
              Newest first
            </option>

            <option value="oldest">
              Oldest first
            </option>
          </select>

          {/* Status */}

          <select
            className="adminassignments-filter-select"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(
                e.target.value
              )
            }
            aria-label="Filter by status"
          >
            <option value="all">
              All Status
            </option>

            <option value="pending">
              Pending
            </option>

            <option value="signed">
              Signed off
            </option>
          </select>

          {/* From date */}

          <div className="adminassignments-date-filter">
            <label htmlFor="assignmentDateFrom">
              From
            </label>

            <div className="adminassignments-date-input-wrapper">
              {!dateFrom && (
                <span className="adminassignments-date-placeholder">
                  Select a date
                </span>
              )}

              <input
                id="assignmentDateFrom"
                type="date"
                value={dateFrom}
                className={
                  !dateFrom
                    ? "adminassignments-date-input-empty"
                    : ""
                }
                onChange={(e) =>
                  setDateFrom(
                    e.target.value
                  )
                }
              />
            </div>
          </div>

          {/* To date */}

          <div className="adminassignments-date-filter">
            <label htmlFor="assignmentDateTo">
              To
            </label>

            <div className="adminassignments-date-input-wrapper">
              {!dateTo && (
                <span className="adminassignments-date-placeholder">
                  Select a date
                </span>
              )}

              <input
                id="assignmentDateTo"
                type="date"
                value={dateTo}
                className={
                  !dateTo
                    ? "adminassignments-date-input-empty"
                    : ""
                }
                onChange={(e) =>
                  setDateTo(
                    e.target.value
                  )
                }
              />
            </div>
          </div>

          {/* Clear dates */}

          {(dateFrom || dateTo) && (
            <button
              type="button"
              className="adminassignments-clear-filters"
              onClick={clearDates}
            >
              Clear dates
            </button>
          )}
        </div>

        {error && (
          <p className="adminassignments-error">
            {error}
          </p>
        )}

        {isLoading ? (
          <p className="adminassignments-empty">
            Loading...
          </p>
        ) : assignments.length ===
          0 ? (
          <p className="adminassignments-empty">
            {search.trim().length >= 2
              ? "No assignments matched your search."
              : statusFilter !== "all"
              ? statusFilter === "signed"
                ? "No signed-off assignments found."
                : "No unsigned assignments found."
              : dateFrom || dateTo
              ? "No assignments found for the selected dates."
              : "No assignments uploaded yet."}
          </p>
        ) : (
          <div className="adminassignments-list">
            {assignments.map(
              (assignment) => {
                const isSigned =
                  assignment.status ===
                  "signed";

                return (
                  <button
                    key={assignment.id}
                    type="button"
                    className="adminassignments-row"
                    onClick={() =>
                      openAssignment(
                        assignment.id
                      )
                    }
                    aria-label={`View assignment ${assignment.title}`}
                  >
                    <div className="adminassignments-row-icon">
                      <ClipboardList
                        size={20}
                        strokeWidth={1.8}
                      />
                    </div>

                    <div className="adminassignments-row-info">
                      <span className="adminassignments-row-title">
                        {assignment.title}
                      </span>

                      <span className="adminassignments-row-meta">
                        {
                          assignment.assigned_to_name
                        }{" "}
                        -{" "}
                        {
                          assignment.assigned_to_email
                        }
                      </span>

                      <span className="adminassignments-row-meta">
                        {
                          assignment.document_count
                        }{" "}
                        document
                        {assignment.document_count !==
                        1
                          ? "s"
                          : ""}{" "}
                        - Uploaded{" "}
                        {formatDate(
                          assignment.created_at
                        )}
                      </span>
                    </div>

                    <div
                      className={`adminassignments-row-status ${
                        isSigned
                          ? "signed"
                          : "pending"
                      }`}
                    >
                      {isSigned ? (
                        <>
                          <CheckCircle2
                            size={14}
                            strokeWidth={2}
                          />
                          Signed off
                        </>
                      ) : (
                        <>
                          <Clock
                            size={14}
                            strokeWidth={2}
                          />
                          {
                            assignment.signed_count
                          }
                          /
                          {
                            assignment.document_count
                          }{" "}
                          signed
                        </>
                      )}
                    </div>
                  </button>
                );
              }
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminAssignments;