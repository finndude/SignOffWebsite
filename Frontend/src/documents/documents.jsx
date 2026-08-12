import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  FileStack,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { apiFetch } from "../utils/api";
import "./documents.css";

function Documents() {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [sort, setSort] = useState("newest");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const loadAssignments = () => {
    setIsLoading(true);
    setError("");

    const params = new URLSearchParams({ sort });

    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);

    apiFetch(`/assignments?${params.toString()}`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("Failed to load documents.");
        }

        return res.json();
      })
      .then((data) => {
        setAssignments(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        setError(
          "Couldn't load your documents. Please try again."
        );
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    loadAssignments();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, dateFrom, dateTo]);

  const formatDate = (isoString) =>
    new Date(isoString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  return (
    <div className="documents-page app-background">
      <div className="documents-container">
        <div className="documents-header">
          <button
            type="button"
            className="documents-back"
            onClick={() => navigate("/dashboard")}
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
          <select
            className="documents-filter-select"
            value={sort}
            onChange={(e) =>
              setSort(e.target.value)
            }
          >
            <option value="newest">
              Newest first
            </option>

            <option value="oldest">
              Oldest first
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
                  setDateFrom(e.target.value)
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
                  setDateTo(e.target.value)
                }
              />
            </div>
          </div>

          {(dateFrom || dateTo) && (
            <button
              type="button"
              className="documents-clear-filters"
              onClick={() => {
                setDateFrom("");
                setDateTo("");
              }}
            >
              Clear dates
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
        ) : assignments.length === 0 ? (
          <p className="documents-empty">
            No documents assigned to you yet.
          </p>
        ) : (
          <div className="documents-list">
            {assignments.map((assignment) => (
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
                        assignment.document_count !== 1
                          ? "s"
                          : ""
                      }`}
                  </span>

                  <span className="documents-row-meta">
                    Assigned by{" "}
                    {assignment.assigned_by_name} ·{" "}
                    {formatDate(
                      assignment.created_at
                    )}
                  </span>
                </div>

                <div
                  className={`documents-row-status ${
                    assignment.status === "signed"
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
                      {assignment.signed_count}/
                      {assignment.document_count}{" "}
                      signed
                    </>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Documents;