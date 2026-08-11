import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { API_BASE_URL, apiFetch } from "../utils/api";
import PdfViewer from "../components/pdfviewer";
import "./documentviewer.css";

function DocumentViewer() {
  const navigate = useNavigate();
  const { assignmentId, documentId } = useParams();

  const [documentInfo, setDocumentInfo] = useState(null);
  const [fileUrl, setFileUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch(`/assignments/${assignmentId}`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("Failed to load document.");
        }

        return res.json();
      })
      .then((data) => {
        const doc = data.documents?.find((d) => d.id === documentId);
        setDocumentInfo(doc || null);

        if (!doc) {
          setError("Document not found.");
        }
      })
      .catch(() => setError("Couldn't load this document."));
  }, [assignmentId, documentId]);

  useEffect(() => {
    setFileUrl(
      `${API_BASE_URL}/assignments/${assignmentId}/documents/${documentId}/file`
    );
  }, [assignmentId, documentId]);

  return (
    <div className="documentviewer-page app-background">
      <div className="documentviewer-card">
        <button
          type="button"
          className="documentviewer-back"
          onClick={() => navigate(`/documents/${assignmentId}`)}
          aria-label="Back to assignment"
        >
          <ArrowLeft size={18} strokeWidth={1.8} />
        </button>

        <h1 className="documentviewer-title">
          {documentInfo ? documentInfo.filename : "View document"}
        </h1>

        {error && <p className="documentviewer-error">{error}</p>}

        {!error && fileUrl && <PdfViewer fileUrl={fileUrl} />}
      </div>
    </div>
  );
}

export default DocumentViewer;