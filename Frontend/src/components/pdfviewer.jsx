import React, { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
} from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import "./pdfviewer.css";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

/**
 * PDF viewer with multi-page signature placement.
 *
 * Each signature has its own:
 * - page
 * - x/y position
 * - width/height
 *
 * Signatures can therefore be placed independently on multiple pages.
 */
function PdfViewer({
  fileUrl,
  signatureDataUrl,
  signaturePositions = [],
  onSignaturePositionChange,
  onAddSignature,
  onRemoveSignature,
  enableSignaturePlacement = false,
}) {
  const canvasRef = useRef(null);
  const pdfDocRef = useRef(null);
  const viewerRef = useRef(null);

  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [draggingSignature, setDraggingSignature] = useState(null);
  const [resizingSignature, setResizingSignature] = useState(null);

  // Load the PDF document whenever the URL changes.
  useEffect(() => {
    if (!fileUrl) return;

    let isCancelled = false;

    setIsLoading(true);
    setError("");

    pdfjsLib
      .getDocument({
        url: fileUrl,
        withCredentials: true,
      })
      .promise
      .then((pdfDoc) => {
        if (isCancelled) return;

        pdfDocRef.current = pdfDoc;
        setNumPages(pdfDoc.numPages);
        setCurrentPage(1);
      })
      .catch(() => {
        if (!isCancelled) {
          setError("Couldn't load this PDF.");
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [fileUrl]);

  // Render the current PDF page.
  useEffect(() => {
    if (!pdfDocRef.current || !canvasRef.current) return;

    let isCancelled = false;

    pdfDocRef.current.getPage(currentPage).then((page) => {
      if (isCancelled) return;

      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      const containerWidth = canvas.parentElement.offsetWidth;

      const unscaledViewport = page.getViewport({
        scale: 1,
      });

      const scale = containerWidth / unscaledViewport.width;

      const viewport = page.getViewport({
        scale,
      });

      const outputScale = Math.max(
        window.devicePixelRatio || 1,
        1
      );

      canvas.width = Math.floor(
        viewport.width * outputScale
      );

      canvas.height = Math.floor(
        viewport.height * outputScale
      );

      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      page.render({
        canvasContext: context,
        viewport,
        transform:
          outputScale !== 1
            ? [outputScale, 0, 0, outputScale, 0, 0]
            : null,
      });
    });

    return () => {
      isCancelled = true;
    };
  }, [currentPage, numPages]);

  /*
   * Add a new signature to the current page.
   */
  const handleAddSignature = () => {
    if (!signatureDataUrl || !onAddSignature) return;

    onAddSignature(currentPage - 1);
  };

  /*
   * Start dragging a signature.
   */
  const handleSignatureMouseDown = (event, signature) => {
    if (!enableSignaturePlacement) return;

    event.preventDefault();
    event.stopPropagation();

    setDraggingSignature({
      id: signature.id,
      startX: event.clientX,
      startY: event.clientY,
      originalX: signature.x,
      originalY: signature.y,
    });
  };

  /*
   * Start resizing a signature.
   */
  const handleResizeMouseDown = (event, signature) => {
    if (!enableSignaturePlacement) return;

    event.preventDefault();
    event.stopPropagation();

    setResizingSignature({
      id: signature.id,
      startX: event.clientX,
      startY: event.clientY,
      originalWidth: signature.width,
      originalHeight: signature.height,
    });
  };

  /*
   * Handle dragging/resizing while the mouse moves.
   */
  useEffect(() => {
    const handleMouseMove = (event) => {
      if (draggingSignature) {
        const signature = signaturePositions.find(
          (item) => item.id === draggingSignature.id
        );

        if (!signature) return;

        const deltaX =
          event.clientX - draggingSignature.startX;

        const deltaY =
          event.clientY - draggingSignature.startY;

        onSignaturePositionChange?.(
          draggingSignature.id,
          {
            x: Math.max(
              0,
              draggingSignature.originalX + deltaX
            ),
            y: Math.max(
              0,
              draggingSignature.originalY + deltaY
            ),
          }
        );
      }

      if (resizingSignature) {
        const signature = signaturePositions.find(
          (item) => item.id === resizingSignature.id
        );

        if (!signature) return;

        const deltaX =
          event.clientX - resizingSignature.startX;

        const newWidth = Math.max(
          80,
          resizingSignature.originalWidth + deltaX
        );

        const aspectRatio =
          resizingSignature.originalHeight /
          resizingSignature.originalWidth;

        const newHeight = newWidth * aspectRatio;

        onSignaturePositionChange?.(
          resizingSignature.id,
          {
            width: newWidth,
            height: newHeight,
          }
        );
      }
    };

    const handleMouseUp = () => {
      setDraggingSignature(null);
      setResizingSignature(null);
    };

    window.addEventListener(
      "mousemove",
      handleMouseMove
    );

    window.addEventListener(
      "mouseup",
      handleMouseUp
    );

    return () => {
      window.removeEventListener(
        "mousemove",
        handleMouseMove
      );

      window.removeEventListener(
        "mouseup",
        handleMouseUp
      );
    };
  }, [
    draggingSignature,
    resizingSignature,
    signaturePositions,
    onSignaturePositionChange,
  ]);

  const currentPageSignatures =
    signaturePositions.filter(
      (signature) =>
        signature.page_number === currentPage - 1
    );

  return (
    <div className="pdfviewer" ref={viewerRef}>
      {error && (
        <p className="pdfviewer-error">
          {error}
        </p>
      )}

      {isLoading && !error && (
        <p className="pdfviewer-loading">
          Loading document…
        </p>
      )}

      <div
        className="pdfviewer-canvas-wrapper"
        style={{
          display: isLoading ? "none" : "block",
          position: "relative",
        }}
      >
        <canvas
          ref={canvasRef}
          className="pdfviewer-canvas"
        />

        {/* Signatures belonging to the current page */}
        {currentPageSignatures.map((signature) => (
          <div
            key={signature.id}
            className="pdfviewer-signature"
            style={{
              left: `${signature.x}px`,
              top: `${signature.y}px`,
              width: `${signature.width}px`,
              height: `${signature.height}px`,
            }}
            onMouseDown={(event) =>
              handleSignatureMouseDown(
                event,
                signature
              )
            }
          >
            <img
              src={signatureDataUrl}
              alt="Signature"
              draggable={false}
            />

            {enableSignaturePlacement && (
              <>
                <button
                  type="button"
                  className="pdfviewer-signature-delete"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onRemoveSignature?.(
                      signature.id
                    );
                  }}
                  aria-label="Remove signature"
                >
                  <Trash2 size={13} />
                </button>

                <div
                  className="pdfviewer-signature-resize"
                  onMouseDown={(event) =>
                    handleResizeMouseDown(
                      event,
                      signature
                    )
                  }
                />
              </>
            )}
          </div>
        ))}
      </div>

      {numPages > 1 && (
        <div className="pdfviewer-controls">
          <button
            type="button"
            onClick={() =>
              setCurrentPage((p) =>
                Math.max(1, p - 1)
              )
            }
            disabled={currentPage === 1}
            aria-label="Previous page"
          >
            <ChevronLeft
              size={16}
              strokeWidth={2}
            />
          </button>

          <span className="pdfviewer-page-indicator">
            Page {currentPage} of {numPages}
          </span>

          <button
            type="button"
            onClick={() =>
              setCurrentPage((p) =>
                Math.min(numPages, p + 1)
              )
            }
            disabled={currentPage === numPages}
            aria-label="Next page"
          >
            <ChevronRight
              size={16}
              strokeWidth={2}
            />
          </button>
        </div>
      )}

      {enableSignaturePlacement &&
        signatureDataUrl && (
          <div className="pdfviewer-add-signature">
            <button
              type="button"
              onClick={handleAddSignature}
            >
              <Plus size={16} />
              Add signature to page {currentPage}
            </button>
          </div>
        )}
    </div>
  );
}

export default PdfViewer;