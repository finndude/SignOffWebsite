import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, RotateCcw, CheckCircle2 } from "lucide-react";
import SignaturePad from "signature_pad";
import { apiFetch } from "../utils/api";
import PdfViewer from "../components/pdfviewer";
import "./sign.css";

function Sign() {
  const navigate = useNavigate();
  const { assignmentId, documentId } = useParams();

  const canvasRef = useRef(null);
  const signaturePadRef = useRef(null);

  const [documentInfo, setDocumentInfo] = useState(null);
  const [fileUrl, setFileUrl] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alreadySigned, setAlreadySigned] = useState(false);

  // Load the assignment to find this document's filename + signed state.
  useEffect(() => {
    apiFetch(`/assignments/${assignmentId}`)
      .then((res) => res.json())
      .then((data) => {
        const doc = data.documents?.find((d) => d.id === documentId);
        setDocumentInfo(doc || null);
        setAlreadySigned(Boolean(doc?.is_signed));
      })
      .catch(() => setError("Couldn't load this document."));
  }, [assignmentId, documentId]);

  // Fetch a temporary signed URL so the PDF can actually be displayed.
  useEffect(() => {
    apiFetch(`/assignments/${assignmentId}/documents/${documentId}/download`)
      .then((res) => res.json())
      .then((data) => setFileUrl(data.download_url || ""))
      .catch(() => setError("Couldn't load this document."));
  }, [assignmentId, documentId]);

  // Set up the signature pad once the canvas exists.
  useEffect(() => {
    if (!canvasRef.current) return;

    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      canvas.getContext("2d").scale(ratio, ratio);
      signaturePadRef.current?.clear();
    };

    signaturePadRef.current = new SignaturePad(canvasRef.current, {
      backgroundColor: "rgb(255, 255, 255)",
      penColor: "rgb(20, 33, 61)",
    });

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, []);

  const handleClear = () => {
    signaturePadRef.current?.clear();
  };

  const handleSubmit = async () => {
    setError("");

    if (!signaturePadRef.current || signaturePadRef.current.isEmpty()) {
      setError("Please draw your signature first.");
      return;
    }

    setIsSubmitting(true);
    const signatureDataUrl = signaturePadRef.current.toDataURL("image/png");

    try {
      const response = await apiFetch(
        `/assignments/${assignmentId}/documents/${documentId}/sign`,
        {
          method: "POST",
          body: JSON.stringify({ signature_data_url: signatureDataUrl }),
        }
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.detail || "Something went wrong. Please try again.");
        setIsSubmitting(false);
        return;
      }

      navigate(`/documents/${assignmentId}`);
    } catch (err) {
      setError("Couldn't reach the server. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="sign-page">
      <div className="sign-card">
        <button
          type="button"
          className="sign-back"
          onClick={() => navigate(`/documents/${assignmentId}`)}
          aria-label="Back to assignment"
        >
          <ArrowLeft size={18} strokeWidth={1.8} />
        </button>

        <h1 className="sign-title">
          {documentInfo ? documentInfo.filename : "Sign document"}
        </h1>

        {alreadySigned ? (
          <div className="sign-already-signed">
            <PdfViewer fileUrl={fileUrl} />
            <CheckCircle2 size={32} strokeWidth={1.8} />
            <p>You've already signed this document.</p>
            <button
              type="button"
              className="sign-back-button"
              onClick={() => navigate(`/documents/${assignmentId}`)}
            >
              Back to documents
            </button>
          </div>
        ) : (
          <>
            <p className="sign-subtitle">Review the document, then draw your signature below.</p>

            {error && <p className="sign-error">{error}</p>}

            <PdfViewer fileUrl={fileUrl} />

            <div className="sign-pad-wrapper">
              <canvas ref={canvasRef} className="sign-pad-canvas" />
            </div>

            <div className="sign-actions">
              <button type="button" className="sign-clear" onClick={handleClear}>
                <RotateCcw size={16} strokeWidth={1.8} />
                Clear
              </button>
              <button
                type="button"
                className="sign-submit"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving…" : "Save Signature"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Sign;