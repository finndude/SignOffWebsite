import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  FileStack,
  CheckCircle2,
  Clock,
  Search,
  X,
} from "lucide-react";
import { apiFetch } from "../utils/api";
import "./documents.css";

function Documents() {
  const navigate = useNavigate();

  const [assignments, setAssignments] =
    useState([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [sort, setSort] =
    useState("newest");

  const [status, setStatus] =
    useState("");

  const [dateFrom, setDateFrom] =
    useState("");

  const [dateTo, setDateTo] =
    useState("");

  const [search, setSearch] =
    useState("");

  const loadAssignments = async () => {
    setIsLoading(true);
    setError("");

    try {
      const params =
        new URLSearchParams({
          sort,
        });

      const trimmedSearch =
        search.trim();

      if (
        trimmedSearch.length >= 2
      ) {
        params.set(
          "search",
          trimmedSearch
        );
      }

      if (status) {
        params.set(
          "status",
          status
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

      const response =
        await apiFetch(
          `/assignments?${params.toString()}`
        );

      if (!response.ok) {
        throw new Error(
          "Failed to load documents."
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
        "Couldn't load your documents. Please try again."
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
    sort,
    status,
    dateFrom,
    dateTo,
    search,
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

  const clearSearch = () => {
    setSearch("");
  };

  const clearDates = () => {
    setDateFrom("");
    setDateTo("");
  };

  const clearFilters = () => {
    setSort("newest");
    setStatus("");
    setDateFrom("");
    setDateTo("");
    setSearch("");
  };

  return (
    <div className="documents-page app-background">
      <div className="documents-container">

        <div className="documents-header">
          <button
            type="button"
            className="documents-back"
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

          <h1 className="documents-title">
            My Documents
          </h1>
        </div>

        <div className="documents-filters">

          {/* Search */}

          <div className="documents-search">
            <Search
              size={17}
              strokeWidth={1.8}
              className="documents-search-icon"
            />

            <input
              type="text"
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              placeholder="Search documents or assigned by..."
              aria-label="Search documents"
            />

            {search && (
              <button
                type="button"
                className="documents-search-clear"
                onClick={
                  clearSearch
                }
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Sort */}

          <select
            className="documents-filter-select"
            value={sort}
            onChange={(e) =>
              setSort(
                e.target.value
              )
            }
            aria-label="Sort documents"
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
            className="documents-filter-select"
            value={status}
            onChange={(e) =>
              setStatus(
                e.target.value
              )
            }
            aria-label="Filter by status"
          >
            <option value="">
              All statuses
            </option>

            <option value="pending">
              Pending
            </option>

            <option value="signed">
              Signed
            </option>
          </select>

          {/* From date */}

          <div className="documents-date-filter">
            <label htmlFor="dateFrom">
              From
            </label>

            <div className="documents-date-input-wrapper">

              {!dateFrom && (
                <span className="documents-date-placeholder">
                  Select a date
                </span>
              )}

              <input
                id="dateFrom"
                type="date"
                value={dateFrom}
                className={
                  !dateFrom
                    ? "documents-date-input-empty"
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

          <div className="documents-date-filter">
            <label htmlFor="dateTo">
              To
            </label>

            <div className="documents-date-input-wrapper">

              {!dateTo && (
                <span className="documents-date-placeholder">
                  Select a date
                </span>
              )}

              <input
                id="dateTo"
                type="date"
                value={dateTo}
                className={
                  !dateTo
                    ? "documents-date-input-empty"
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

          {(dateFrom ||
            dateTo) && (
            <button
              type="button"
              className="documents-clear-filters"
              onClick={
                clearDates
              }
            >
              Clear dates
            </button>
          )}

          {/* Clear all filters */}

          {(status ||
            dateFrom ||
            dateTo ||
            search) && (
            <button
              type="button"
              className="documents-clear-filters"
              onClick={
                clearFilters
              }
            >
              Clear filters
            </button>
          )}

        </div>

        {error && (
          <p className="documents-error">
            {error}
          </p>
        )}

        {isLoading ? (
          <p className="documents-empty">
            Loading…
          </p>

        ) : assignments.length ===
          0 ? (

          <p className="documents-empty">

            {search.trim().length >=
            2
              ? "No documents matched your search."
              : status === "signed"
              ? "No signed documents found."
              : status === "pending"
              ? "No pending documents found."
              : "No documents assigned to you yet."}

          </p>

        ) : (

          <div className="documents-list">

            {assignments.map(
              (assignment) => (

                <button
                  key={assignment.id}
                  type="button"
                  className="documents-row"
                  onClick={() =>
                    navigate(
                      `/documents/${assignment.id}`
                    )
                  }
                >

                  <div className="documents-row-icon">
                    <FileStack
                      size={20}
                      strokeWidth={1.8}
                    />
                  </div>

                  <div className="documents-row-info">

                    <span className="documents-row-title">
                      {assignment.title ||
                        `${assignment.document_count} document${
                          assignment.document_count !==
                          1
                            ? "s"
                            : ""
                        }`}
                    </span>

                    <span className="documents-row-meta">
                      Assigned by{" "}
                      {
                        assignment.assigned_by_name
                      }{" "}
                      ·{" "}
                      {formatDate(
                        assignment.created_at
                      )}
                    </span>

                  </div>

                  <div
                    className={`documents-row-status ${
                      assignment.status ===
                      "signed"
                        ? "signed"
                        : "pending"
                    }`}
                  >

                    {assignment.status ===
                    "signed" ? (
                      <>
                        <CheckCircle2
                          size={14}
                          strokeWidth={2}
                        />
                        Signed
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

              )
            )}

          </div>
        )}

      </div>
    </div>
  );
}

export default Documents;