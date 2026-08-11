import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  RotateCcw,
  CheckCircle2,
  Upload,
} from "lucide-react";
import SignaturePad from "signature_pad";
import { API_BASE_URL, apiFetch } from "../utils/api";
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

  const [signatureDataUrl, setSignatureDataUrl] = useState("");
  const [signaturePositions, setSignaturePositions] = useState([]);
  const [isPlacingSignature, setIsPlacingSignature] = useState(false);

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

  // Use the API as a private PDF proxy.
  useEffect(() => {
    setFileUrl(
      `${API_BASE_URL}/assignments/${assignmentId}/documents/${documentId}/file`
    );
  }, [assignmentId, documentId]);

  // Set up the signature pad.
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
    setSignatureDataUrl("");
    setIsPlacingSignature(false);
  };

  // First stage: convert the drawn signature into an image.
  const handleUploadSignature = () => {
    setError("");

    if (!signaturePadRef.current || signaturePadRef.current.isEmpty()) {
      setError("Please draw your signature first.");
      return;
    }

    const dataUrl = signaturePadRef.current.toDataURL("image/png");

    setSignatureDataUrl(dataUrl);
    setIsPlacingSignature(true);
  };

  const handleSignatureUploaded = (dataUrl) => {
    setSignatureDataUrl(dataUrl);
    setIsPlacingSignature(true);
  };

  const handleAddSignature = (pageNumber) => {
    setSignaturePositions((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        page_number: pageNumber,
        x: 100,
        y: 100,
        width: 180,
        height: 70,
      },
    ]);
  };

  const handleSignaturePositionChange = (id, position) => {
    setSignaturePositions((current) =>
      current.map((signature) =>
        signature.id === id
          ? { ...signature, ...position }
          : signature
      )
    );
  };

  const handleRemoveSignature = (id) => {
    setSignaturePositions((current) =>
      current.filter((signature) => signature.id !== id)
    );
  };

  // Final stage: send the signature + position to the backend.
  const handleSubmit = async () => {
    setError("");

    if (!signatureDataUrl) {
      setError("Please upload your signature onto the document first.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiFetch(
        `/assignments/${assignmentId}/documents/${documentId}/sign`,
        {
          method: "POST",
          body: JSON.stringify({
            signature_data_url: signatureDataUrl,
            page_number: signaturePosition.page_number,
            x: signaturePosition.x,
            y: signaturePosition.y,
            width: signaturePosition.width,
            height: signaturePosition.height,
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(
          data.detail || "Something went wrong. Please try again."
        );
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
    <div className="sign-page app-background">
      <div
        className={`sign-card ${
          alreadySigned ? "sign-card-signed" : ""
        }`}
      >
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
            <p className="sign-subtitle">
              Review the document, then draw your signature below.
            </p>

            {error && <p className="sign-error">{error}</p>}

            <PdfViewer
              fileUrl={fileUrl}
              signatureDataUrl={signatureDataUrl}
              signaturePositions={signaturePositions}
              onSignaturePositionChange={handleSignaturePositionChange}
              onAddSignature={handleAddSignature}
              onRemoveSignature={handleRemoveSignature}
              enableSignaturePlacement={isPlacingSignature}
            />

            <div className="sign-pad-wrapper">
              <canvas
                ref={canvasRef}
                className="sign-pad-canvas"
              />
            </div>

            <div className="sign-actions">
              <button
                type="button"
                className="sign-clear"
                onClick={handleClear}
              >
                <RotateCcw size={16} strokeWidth={1.8} />
                Clear
              </button>

              {!isPlacingSignature ? (
                <button
                  type="button"
                  className="sign-submit"
                  onClick={handleUploadSignature}
                >
                  <Upload size={16} strokeWidth={1.8} />
                  Upload Signature
                </button>
              ) : (
                <button
                  type="button"
                  className="sign-submit"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Saving…" : "Save Signature"}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Sign;