import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, FileText, CheckCircle2, Circle } from "lucide-react";
import { apiFetch } from "../utils/api";
import "./assignmentdetail.css";

function AssignmentDetail() {
  const navigate = useNavigate();
  const { assignmentId } = useParams();

  const [assignment, setAssignment] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState("");

  const loadAssignment = () => {
    setIsLoading(true);
    setError("");

    apiFetch(`/assignments/${assignmentId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load assignment.");
        return res.json();
      })
      .then((data) => setAssignment(data))
      .catch(() => setError("Couldn't load this assignment."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadAssignment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentId]);

  const allSigned = assignment?.documents?.every((doc) => doc.is_signed);

  const handleConfirm = async () => {
    setConfirmError("");
    setIsConfirming(true);

    try {
      const response = await apiFetch(`/assignments/${assignmentId}/confirm`, {
        method: "POST",
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setConfirmError(data.detail || "Something went wrong. Please try again.");
        setIsConfirming(false);
        return;
      }

      loadAssignment();
      setIsConfirming(false);
    } catch (err) {
      setConfirmError("Couldn't reach the server. Please try again.");
      setIsConfirming(false);
    }
  };

  return (
    <div className="assignmentdetail-page app-background">
      <div className="assignmentdetail-container">
        <div className="assignmentdetail-header">
          <button
            type="button"
            className="assignmentdetail-back"
            onClick={() => navigate("/documents")}
            aria-label="Back to documents"
          >
            <ArrowLeft size={18} strokeWidth={1.8} />
          </button>
          <h1 className="assignmentdetail-title">
            {assignment?.title || "Documents to sign"}
          </h1>
        </div>

        {error && <p className="assignmentdetail-error">{error}</p>}
        {confirmError && <p className="assignmentdetail-error">{confirmError}</p>}

        {isLoading ? (
          <p className="assignmentdetail-empty">Loading…</p>
        ) : assignment ? (
          <>
            <p className="assignmentdetail-meta">
              Assigned by {assignment.assigned_by_name}
              {assignment.status === "signed" && (
                <span className="assignmentdetail-badge">
                  <CheckCircle2 size={13} strokeWidth={2} /> All signed
                </span>
              )}
            </p>

            <div className="assignmentdetail-list">
              {assignment.documents.map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  className="assignmentdetail-row"
                  onClick={() =>
                    navigate(`/documents/${assignmentId}/sign/${doc.id}`)
                  }
                >
                  <FileText size={18} strokeWidth={1.8} className="assignmentdetail-row-icon" />
                  <span className="assignmentdetail-row-name">{doc.filename}</span>
                  {doc.is_signed ? (
                    <span className="assignmentdetail-row-status signed">
                      <CheckCircle2 size={14} strokeWidth={2} /> Signed
                    </span>
                  ) : (
                    <span className="assignmentdetail-row-status pending">
                      <Circle size={14} strokeWidth={2} /> Not signed
                    </span>
                  )}
                </button>
              ))}
            </div>

            {assignment.status !== "signed" && (
              <button
                type="button"
                className="assignmentdetail-confirm"
                disabled={!allSigned || isConfirming}
                onClick={handleConfirm}
              >
                {isConfirming
                  ? "Confirming…"
                  : allSigned
                  ? "Confirm all signatures"
                  : "Sign all documents to confirm"}
              </button>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

export default AssignmentDetail;
