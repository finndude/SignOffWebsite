import {
  useEffect,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";

import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  ClipboardList,
  Search,
  X,
  UserRoundPen,
  Trash2,
  Save,
  XCircle,
  Pencil,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { apiFetch } from "../utils/api";
import "./adminassignments.css";

const PAGE_SIZE = 20;

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

  const [page, setPage] =
    useState(1);

  const [totalCount, setTotalCount] =
    useState(0);

  const [assignableUsers, setAssignableUsers] =
    useState([]);

  const [editingAssignmentId, setEditingAssignmentId] =
    useState(null);

  const [selectedAssigneeId, setSelectedAssigneeId] =
    useState("");

  const [isChangingAssignee, setIsChangingAssignee] =
    useState(false);

  const [deletingAssignmentId, setDeletingAssignmentId] =
    useState(null);

  const [renamingAssignmentId, setRenamingAssignmentId] =
    useState(null);

  const [renameTitle, setRenameTitle] =
    useState("");

  const [isSavingRename, setIsSavingRename] =
    useState(false);

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
        new URLSearchParams();

      if (search.trim().length >= 2) {
        params.set(
          "search",
          search.trim()
        );
      }

      params.set(
        "sort",
        sort
      );

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

      params.set(
        "page",
        String(requestedPage)
      );

      params.set(
        "page_size",
        String(PAGE_SIZE)
      );

      const response =
        await apiFetch(
          `/admin/assignments?${params.toString()}`
        );

      if (!response.ok) {
        throw new Error(
          "Failed to load assignments."
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
        "Couldn't load assignments. Please try again."
      );

    } finally {
      setIsLoading(false);
    }
  };

  const loadAssignableUsers = async () => {
    try {
      const response =
        await apiFetch(
          "/admin/users/assignable"
        );

      if (!response.ok) {
        throw new Error(
          "Failed to load assignable users."
        );
      }

      const data =
        await response.json();

      setAssignableUsers(
        Array.isArray(data)
          ? data
          : []
      );

    } catch {
      setAssignableUsers([]);
    }
  };

  useEffect(() => {
    loadAssignableUsers();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [
    search,
    sort,
    statusFilter,
    dateFrom,
    dateTo,
  ]);

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

  /* ---------------------------------------------------------
     Rename
  --------------------------------------------------------- */

  const startRenaming = (
    assignment
  ) => {
    setRenamingAssignmentId(
      assignment.id
    );

    setRenameTitle(
      assignment.title || ""
    );

    setError("");

    setEditingAssignmentId(null);
  };

  const cancelRenaming = () => {
    setRenamingAssignmentId(null);
    setRenameTitle("");
  };

  const saveRename = async (
    assignmentId
  ) => {
    const trimmedTitle =
      renameTitle.trim();

    if (!trimmedTitle) {
      setError(
        "Assignment title cannot be empty."
      );

      return;
    }

    if (trimmedTitle.length > 120) {
      setError(
        "Assignment title must be 120 characters or fewer."
      );

      return;
    }

    setIsSavingRename(true);
    setError("");

    try {
      const response =
        await apiFetch(
          `/admin/assignments/${assignmentId}/title`,
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              title: trimmedTitle,
            }),
          }
        );

      if (!response.ok) {
        let message =
          "Failed to rename the assignment.";

        try {
          const data =
            await response.json();

          if (data?.detail) {
            message =
              data.detail;
          }

        } catch {
          // Keep default message.
        }

        throw new Error(message);
      }

      const updatedAssignment =
        await response.json();

      setAssignments(
        (currentAssignments) =>
          currentAssignments.map(
            (assignment) =>
              assignment.id ===
              assignmentId
                ? {
                    ...assignment,
                    ...updatedAssignment,
                  }
                : assignment
          )
      );

      cancelRenaming();

    } catch (err) {
      setError(
        err.message ||
          "Couldn't rename the assignment. Please try again."
      );

    } finally {
      setIsSavingRename(false);
    }
  };

  /* ---------------------------------------------------------
     Change assignee
  --------------------------------------------------------- */

  const startChangingAssignee = (
    assignment
  ) => {
    setEditingAssignmentId(
      assignment.id
    );

    setSelectedAssigneeId(
      assignment.assigned_to_id || ""
    );

    setRenamingAssignmentId(null);
  };

  const cancelChangingAssignee = () => {
    setEditingAssignmentId(null);
    setSelectedAssigneeId("");
  };

  const saveAssignee = async (
    assignmentId
  ) => {
    if (!selectedAssigneeId) {
      return;
    }

    setIsChangingAssignee(true);
    setError("");

    try {
      const response =
        await apiFetch(
          `/admin/assignments/${assignmentId}/assignee`,
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              assigned_to_id:
                selectedAssigneeId,
            }),
          }
        );

      if (!response.ok) {
        let message =
          "Failed to change the assignee.";

        try {
          const data =
            await response.json();

          if (data?.detail) {
            message =
              data.detail;
          }

        } catch {
          // Keep default message.
        }

        throw new Error(message);
      }

      const updatedAssignment =
        await response.json();

      setAssignments(
        (currentAssignments) =>
          currentAssignments.map(
            (assignment) =>
              assignment.id ===
              assignmentId
                ? {
                    ...assignment,
                    ...updatedAssignment,
                  }
                : assignment
          )
      );

      cancelChangingAssignee();

    } catch (err) {
      setError(
        err.message ||
          "Couldn't change the assignee. Please try again."
      );

    } finally {
      setIsChangingAssignee(false);
    }
  };

  /* ---------------------------------------------------------
     Delete
  --------------------------------------------------------- */

  const deleteAssignment = async (
    assignment
  ) => {
    const confirmed =
      window.confirm(
        `Are you sure you want to delete "${assignment.title}"?\n\nThis will permanently delete the assignment and all documents inside it. This cannot be undone.`
      );

    if (!confirmed) {
      return;
    }

    setDeletingAssignmentId(
      assignment.id
    );

    setError("");

    try {
      const response =
        await apiFetch(
          `/admin/assignments/${assignment.id}`,
          {
            method: "DELETE",
          }
        );

      if (!response.ok) {
        let message =
          "Failed to delete the assignment.";

        try {
          const data =
            await response.json();

          if (data?.detail) {
            message =
              data.detail;
          }

        } catch {
          // Keep default message.
        }

        throw new Error(message);
      }

      /*
       * If the last item on a page was
       * deleted, move back one page.
       */
      if (
        assignments.length === 1 &&
        page > 1
      ) {
        setPage(
          page - 1
        );
      } else {
        loadAssignments(page);
      }

    } catch (err) {
      setError(
        err.message ||
          "Couldn't delete the assignment. Please try again."
      );

    } finally {
      setDeletingAssignmentId(null);
    }
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
              Newest First
            </option>

            <option value="oldest">
              Oldest First
            </option>
          </select>

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

        ) : assignments.length === 0 ? (

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

          <>
            <div className="adminassignments-list">

              {assignments.map(
                (assignment) => {

                  const isSigned =
                    assignment.status ===
                    "signed";

                  const isEditing =
                    editingAssignmentId ===
                    assignment.id;

                  const isRenaming =
                    renamingAssignmentId ===
                    assignment.id;

                  const isDeleting =
                    deletingAssignmentId ===
                    assignment.id;

                  return (
                    <div
                      key={assignment.id}
                      className="adminassignments-row"
                    >

                      <div
                        className="adminassignments-row-main"
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          if (
                            !isRenaming &&
                            !isEditing
                          ) {
                            openAssignment(
                              assignment.id
                            );
                          }
                        }}
                        onKeyDown={(e) => {

                          if (
                            isRenaming ||
                            isEditing
                          ) {
                            return;
                          }

                          if (
                            e.key ===
                              "Enter" ||
                            e.key === " "
                          ) {
                            e.preventDefault();

                            openAssignment(
                              assignment.id
                            );
                          }
                        }}
                        aria-label={`View assignment ${assignment.title}`}
                      >

                        <div className="adminassignments-row-icon">
                          <ClipboardList
                            size={20}
                            strokeWidth={1.8}
                          />
                        </div>

                        <div className="adminassignments-row-info">

                          {isRenaming ? (

                            <div
                              className="adminassignments-rename-editor"
                              onClick={(e) =>
                                e.stopPropagation()
                              }
                            >

                              <input
                                type="text"
                                value={
                                  renameTitle
                                }
                                maxLength={120}
                                autoFocus
                                onChange={(e) =>
                                  setRenameTitle(
                                    e.target.value
                                  )
                                }
                                onKeyDown={(e) => {

                                  if (
                                    e.key ===
                                    "Enter"
                                  ) {
                                    e.preventDefault();

                                    saveRename(
                                      assignment.id
                                    );
                                  }

                                  if (
                                    e.key ===
                                    "Escape"
                                  ) {
                                    e.preventDefault();

                                    cancelRenaming();
                                  }
                                }}
                                aria-label="Assignment name"
                                className="adminassignments-rename-input"
                              />

                              <span className="adminassignments-rename-count">
                                {
                                  renameTitle.length
                                }
                                /120
                              </span>

                            </div>

                          ) : (

                            <span className="adminassignments-row-title">
                              {
                                assignment.title
                              }
                            </span>

                          )}

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
                            {
                              assignment.document_count !==
                              1
                                ? "s"
                                : ""
                            }{" "}
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

                      </div>

                      <div className="adminassignments-actions">

                        {isRenaming ? (

                          <div className="adminassignments-assignee-editor">

                            <button
                              type="button"
                              className="adminassignments-action-button save"
                              onClick={() =>
                                saveRename(
                                  assignment.id
                                )
                              }
                              disabled={
                                isSavingRename ||
                                !renameTitle.trim()
                              }
                              aria-label="Save assignment name"
                              title="Save"
                            >
                              <Save size={15} />
                            </button>

                            <button
                              type="button"
                              className="adminassignments-action-button cancel"
                              onClick={
                                cancelRenaming
                              }
                              disabled={
                                isSavingRename
                              }
                              aria-label="Cancel rename"
                              title="Cancel"
                            >
                              <XCircle
                                size={15}
                              />
                            </button>

                          </div>

                        ) : isEditing ? (

                          <div className="adminassignments-assignee-editor">

                            <select
                              className="adminassignments-assignee-select"
                              value={
                                selectedAssigneeId
                              }
                              onChange={(e) =>
                                setSelectedAssigneeId(
                                  e.target.value
                                )
                              }
                              disabled={
                                isChangingAssignee
                              }
                              aria-label="Select new assignee"
                            >

                              <option value="">
                                Select assignee
                              </option>

                              {assignableUsers.map(
                                (user) => (
                                  <option
                                    key={
                                      user.id
                                    }
                                    value={
                                      user.id
                                    }
                                  >
                                    {
                                      user.name
                                    }{" "}
                                    -{" "}
                                    {
                                      user.email
                                    }
                                  </option>
                                )
                              )}

                            </select>

                            <button
                              type="button"
                              className="adminassignments-action-button save"
                              onClick={() =>
                                saveAssignee(
                                  assignment.id
                                )
                              }
                              disabled={
                                isChangingAssignee ||
                                !selectedAssigneeId
                              }
                              aria-label="Save assignee"
                              title="Save assignee"
                            >
                              <Save
                                size={15}
                              />
                            </button>

                            <button
                              type="button"
                              className="adminassignments-action-button cancel"
                              onClick={
                                cancelChangingAssignee
                              }
                              disabled={
                                isChangingAssignee
                              }
                              aria-label="Cancel"
                              title="Cancel"
                            >
                              <XCircle
                                size={15}
                              />
                            </button>

                          </div>

                        ) : (

                          <>

                            <button
                              type="button"
                              className="adminassignments-action-button rename"
                              onClick={() =>
                                startRenaming(
                                  assignment
                                )
                              }
                              aria-label={`Rename ${assignment.title}`}
                              title="Rename assignment"
                            >
                              <Pencil
                                size={16}
                              />
                            </button>

                            <button
                              type="button"
                              className="adminassignments-action-button change"
                              onClick={() =>
                                startChangingAssignee(
                                  assignment
                                )
                              }
                              aria-label={`Change assignee for ${assignment.title}`}
                              title="Change assignee"
                            >
                              <UserRoundPen
                                size={16}
                              />
                            </button>

                            <button
                              type="button"
                              className="adminassignments-action-button delete"
                              onClick={() =>
                                deleteAssignment(
                                  assignment
                                )
                              }
                              disabled={
                                isDeleting
                              }
                              aria-label={`Delete ${assignment.title}`}
                              title="Delete assignment"
                            >
                              <Trash2
                                size={16}
                              />
                            </button>

                          </>

                        )}

                      </div>

                    </div>
                  );
                }
              )}

            </div>

            {totalPages > 1 && (
              <div className="adminassignments-pagination">

                <button
                  type="button"
                  className="adminassignments-pagination-button"
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

                <div className="adminassignments-pagination-pages">

                  {getPageNumbers().map(
                    (pageNumber) =>
                      typeof pageNumber ===
                      "string" ? (
                        <span
                          key={
                            pageNumber
                          }
                          className="adminassignments-pagination-ellipsis"
                        >
                          …
                        </span>
                      ) : (
                        <button
                          key={
                            pageNumber
                          }
                          type="button"
                          className={`adminassignments-pagination-page ${
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
                  className="adminassignments-pagination-button"
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

export default AdminAssignments;