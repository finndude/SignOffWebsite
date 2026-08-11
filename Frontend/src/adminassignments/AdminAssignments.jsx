import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Clock, ClipboardList } from "lucide-react";
import { apiFetch } from "../utils/api";
import "./adminassignments.css";

function AdminAssignments() {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch("/admin/assignments")
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load assignments.");
        return res.json();
      })
      .then((data) => setAssignments(Array.isArray(data) ? data : []))
      .catch(() => setError("Couldn't load assignments. Please try again."))
      .finally(() => setIsLoading(false));
  }, []);

  const formatDate = (isoString) =>
    new Date(isoString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  return (
    <div className="adminassignments-page app-background">
      <div className="adminassignments-container">
        <div className="adminassignments-header">
          <button
            type="button"
            className="adminassignments-back"
            onClick={() => navigate("/dashboard")}
            aria-label="Back to dashboard"
          >
            <ArrowLeft size={18} strokeWidth={1.8} />
          </button>
          <div>
            <h1 className="adminassignments-title">Assignments</h1>
            <p className="adminassignments-subtitle">
              Track uploaded files and sign-off progress.
            </p>
          </div>
        </div>

        {error && <p className="adminassignments-error">{error}</p>}

        {isLoading ? (
          <p className="adminassignments-empty">Loading...</p>
        ) : assignments.length === 0 ? (
          <p className="adminassignments-empty">No assignments uploaded yet.</p>
        ) : (
          <div className="adminassignments-list">
            {assignments.map((assignment) => {
              const isSigned = assignment.status === "signed";

              return (
                <div key={assignment.id} className="adminassignments-row">
                  <div className="adminassignments-row-icon">
                    <ClipboardList size={20} strokeWidth={1.8} />
                  </div>

                  <div className="adminassignments-row-info">
                    <span className="adminassignments-row-title">
                      {assignment.title}
                    </span>
                    <span className="adminassignments-row-meta">
                      {assignment.assigned_to_name} - {assignment.assigned_to_email}
                    </span>
                    <span className="adminassignments-row-meta">
                      {assignment.document_count} document
                      {assignment.document_count !== 1 ? "s" : ""} - Uploaded{" "}
                      {formatDate(assignment.created_at)}
                    </span>
                  </div>

                  <div
                    className={`adminassignments-row-status ${
                      isSigned ? "signed" : "pending"
                    }`}
                  >
                    {isSigned ? (
                      <>
                        <CheckCircle2 size={14} strokeWidth={2} />
                        Signed off
                      </>
                    ) : (
                      <>
                        <Clock size={14} strokeWidth={2} />
                        {assignment.signed_count}/{assignment.document_count} signed
                      </>
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

export default AdminAssignments;
