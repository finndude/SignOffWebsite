import React, {
  useEffect,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  FileStack,
  CheckCircle2,
  Clock,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { apiFetch } from "../utils/api";
import "./documents.css";

const PAGE_SIZE = 20;

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

  const loadAssignments = async (
    requestedPage = page
  ) => {
    setIsLoading(true);
    setError("");

    try {
      const params =
        new URLSearchParams({
          sort,
          page: String(
            requestedPage
          ),
          page_size: String(
            PAGE_SIZE
          ),
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

      const total =
        Number(
          response.headers.get(
            "X-Total-Count"
          )
        ) || 0;

      setAssignments(
        Array.isArray(data)
          ? data
          : []
      );

      setTotalCount(total);
      setPage(requestedPage);

    } catch {
      setError(
        "Couldn't load your documents. Please try again."
      );

    } finally {
      setIsLoading(false);
    }
  };

  /*
   * Reset to page 1 whenever a filter,
   * search or sort option changes.
   */
  useEffect(() => {
    setPage(1);
  }, [
    sort,
    status,
    dateFrom,
    dateTo,
    search,
  ]);

  /*
   * Load whenever the page or filters change.
   */
  useEffect(() => {
    const timeout =
      setTimeout(() => {
        loadAssignments(page);
      }, 300);

    return () =>
      clearTimeout(timeout);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    page,
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

    const pages = [];

    pages.push(1);

    if (page > 4) {
      pages.push("ellipsis-left");
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
              All Status
            </option>

            <option value="pending">
              Pending
            </option>

            <option value="signed">
              Signed
            </option>
          </select>

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

          <>
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

            {totalPages > 1 && (
              <div className="documents-pagination">

                <button
                  type="button"
                  className="documents-pagination-button"
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

                <div className="documents-pagination-pages">

                  {getPageNumbers().map(
                    (pageNumber) =>
                      typeof pageNumber ===
                      "string" ? (
                        <span
                          key={
                            pageNumber
                          }
                          className="documents-pagination-ellipsis"
                        >
                          …
                        </span>
                      ) : (
                        <button
                          key={
                            pageNumber
                          }
                          type="button"
                          className={`documents-pagination-page ${
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
                  className="documents-pagination-button"
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

export default Documents;