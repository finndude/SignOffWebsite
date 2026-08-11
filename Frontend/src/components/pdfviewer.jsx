import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import "./pdfviewer.css";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

/**
 * PDF viewer.
 *
 * Optional signature placement mode:
 * - signatureDataUrl: signature image to display
 * - signaturePosition: current page/position/size
 * - onSignaturePositionChange: called whenever the signature moves/resizes
 * - enableSignaturePlacement: enables drag + resize
 */
function PdfViewer({
  fileUrl,
  signatureDataUrl = "",
  signaturePosition = null,
  onSignaturePositionChange = null,
  enableSignaturePlacement = false,
}) {
  const canvasRef = useRef(null);
  const pdfDocRef = useRef(null);
  const viewerWrapperRef = useRef(null);

  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [renderedPageSize, setRenderedPageSize] = useState({
    width: 0,
    height: 0,
  });

  const dragRef = useRef(null);
  const resizeRef = useRef(null);

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
      .promise.then((pdfDoc) => {
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

  // Render whichever page is currently selected.
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

      const scale =
        containerWidth / unscaledViewport.width;

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

      setRenderedPageSize({
        width: viewport.width,
        height: viewport.height,
      });

      page.render({
        canvasContext: context,
        viewport,
        transform:
          outputScale !== 1
            ? [
                outputScale,
                0,
                0,
                outputScale,
                0,
                0,
              ]
            : null,
      });
    });

    return () => {
      isCancelled = true;
    };
  }, [currentPage, numPages]);

  /*
   * Convert mouse/touch position into PDF-style coordinates.
   *
   * The frontend uses top-left coordinates because that's natural
   * for positioning an HTML overlay.
   *
   * The backend later converts this into PDF coordinates where
   * the origin is bottom-left.
   */
  const getPositionFromPointer = (clientX, clientY) => {
    if (!viewerWrapperRef.current) return null;

    const rect =
      viewerWrapperRef.current.getBoundingClientRect();

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const handleSignaturePointerDown = (event) => {
    if (!enableSignaturePlacement) return;
    if (!signaturePosition) return;

    event.preventDefault();
    event.stopPropagation();

    const point = getPositionFromPointer(
      event.clientX,
      event.clientY
    );

    if (!point) return;

    dragRef.current = {
      startX: point.x,
      startY: point.y,
      originalX: signaturePosition.x,
      originalY: signaturePosition.y,
    };

    event.currentTarget.setPointerCapture?.(
      event.pointerId
    );
  };

  const handleSignaturePointerMove = (event) => {
    if (!dragRef.current) return;
    if (!signaturePosition) return;

    const point = getPositionFromPointer(
      event.clientX,
      event.clientY
    );

    if (!point) return;

    const deltaX =
      point.x - dragRef.current.startX;

    const deltaY =
      point.y - dragRef.current.startY;

    let newX =
      dragRef.current.originalX + deltaX;

    let newY =
      dragRef.current.originalY + deltaY;

    const maxX =
      renderedPageSize.width -
      signaturePosition.width;

    const maxY =
      renderedPageSize.height -
      signaturePosition.height;

    newX = Math.max(0, Math.min(newX, maxX));
    newY = Math.max(0, Math.min(newY, maxY));

    onSignaturePositionChange?.({
      ...signaturePosition,
      x: newX,
      y: newY,
    });
  };

  const handleSignaturePointerUp = () => {
    dragRef.current = null;
  };

  const handleResizePointerDown = (event) => {
    if (!enableSignaturePlacement) return;
    if (!signaturePosition) return;

    event.preventDefault();
    event.stopPropagation();

    const point = getPositionFromPointer(
      event.clientX,
      event.clientY
    );

    if (!point) return;

    resizeRef.current = {
      startX: point.x,
      startY: point.y,
      originalWidth: signaturePosition.width,
      originalHeight: signaturePosition.height,
    };

    event.currentTarget.setPointerCapture?.(
      event.pointerId
    );
  };

  const handleResizePointerMove = (event) => {
    if (!resizeRef.current) return;
    if (!signaturePosition) return;

    const point = getPositionFromPointer(
      event.clientX,
      event.clientY
    );

    if (!point) return;

    const deltaX =
      point.x - resizeRef.current.startX;

    const aspectRatio =
      resizeRef.current.originalWidth /
      resizeRef.current.originalHeight;

    let newWidth =
      resizeRef.current.originalWidth + deltaX;

    const minimumWidth = 80;

    newWidth = Math.max(
      minimumWidth,
      newWidth
    );

    const newHeight =
      newWidth / aspectRatio;

    const maxWidth =
      renderedPageSize.width -
      signaturePosition.x;

    const maxHeight =
      renderedPageSize.height -
      signaturePosition.y;

    if (newWidth > maxWidth) {
      newWidth = maxWidth;
    }

    let finalHeight =
      newWidth / aspectRatio;

    if (finalHeight > maxHeight) {
      finalHeight = maxHeight;
      newWidth =
        finalHeight * aspectRatio;
    }

    onSignaturePositionChange?.({
      ...signaturePosition,
      width: newWidth,
      height: finalHeight,
    });
  };

  const handleResizePointerUp = () => {
    resizeRef.current = null;
  };

  const showSignature =
    enableSignaturePlacement &&
    signatureDataUrl &&
    signaturePosition &&
    signaturePosition.page_number ===
      currentPage - 1 &&
    renderedPageSize.width > 0;

  return (
    <div className="pdfviewer">
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
        ref={viewerWrapperRef}
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

        {showSignature && (
          <div
            className="pdfviewer-signature-overlay"
            style={{
              left: `${signaturePosition.x}px`,
              top: `${signaturePosition.y}px`,
              width: `${signaturePosition.width}px`,
              height: `${signaturePosition.height}px`,
            }}
            onPointerDown={
              handleSignaturePointerDown
            }
            onPointerMove={
              handleSignaturePointerMove
            }
            onPointerUp={
              handleSignaturePointerUp
            }
            onPointerCancel={
              handleSignaturePointerUp
            }
          >
            <img
              src={signatureDataUrl}
              alt="Signature"
              draggable={false}
            />

            <div
              className="pdfviewer-signature-resize"
              onPointerDown={
                handleResizePointerDown
              }
              onPointerMove={
                handleResizePointerMove
              }
              onPointerUp={
                handleResizePointerUp
              }
              onPointerCancel={
                handleResizePointerUp
              }
            />
          </div>
        )}
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
            disabled={
              currentPage === numPages
            }
            aria-label="Next page"
          >
            <ChevronRight
              size={16}
              strokeWidth={2}
            />
          </button>
        </div>
      )}
    </div>
  );
}

export default PdfViewer;