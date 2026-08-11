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
 * PDF viewer with optional multi-page signature placement.
 *
 * Signature positions use:
 * - page_number: zero-based page number
 * - x/y: top-left position in rendered pixels
 * - width/height: rendered signature size
 * - page_width/page_height: actual rendered PDF page dimensions
 *
 * Each signature is stored independently, so a document can contain
 * multiple signatures across multiple pages.
 */
function PdfViewer({
  fileUrl,
  signatureDataUrl = "",
  signaturePositions = [],
  onSignaturePositionChange = null,
  onAddSignature = null,
  onRemoveSignature = null,
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

  /*
   * Load PDF.
   */
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

  /*
   * Render current PDF page.
   */
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
   * Store the actual rendered PDF page dimensions on signatures.
  */
  useEffect(() => {
    if (
      renderedPageSize.width <= 0 ||
      renderedPageSize.height <= 0 ||
      !onSignaturePositionChange
    ) {
      return;
    }

    signaturePositions.forEach((signature) => {
      if (
        signature.page_number === currentPage - 1 &&
        (
          !signature.page_width ||
          !signature.page_height
        )
      ) {
        onSignaturePositionChange(
          signature.id,
          {
            page_width: renderedPageSize.width,
            page_height: renderedPageSize.height,
          }
        );
      }
    });
  }, [
    renderedPageSize,
    currentPage,
    signaturePositions,
    onSignaturePositionChange,
  ]);

  /*
   * Convert pointer position into coordinates relative
   * to the PDF page.
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

  /*
   * Find the signature currently being dragged.
   */
  const getSignatureById = (id) => {
    return signaturePositions.find(
      (signature) => signature.id === id
    );
  };

  /*
   * Begin dragging a signature.
   */
  const handleSignaturePointerDown = (
    event,
    signature
  ) => {
    if (!enableSignaturePlacement) return;

    event.preventDefault();
    event.stopPropagation();

    const point = getPositionFromPointer(
      event.clientX,
      event.clientY
    );

    if (!point) return;

    dragRef.current = {
      id: signature.id,
      startX: point.x,
      startY: point.y,
      originalX: signature.x,
      originalY: signature.y,
    };

    event.currentTarget.setPointerCapture?.(
      event.pointerId
    );
  };

  /*
   * Move signature.
   */
  const handleSignaturePointerMove = (event) => {
    if (!dragRef.current) return;

    const signature = getSignatureById(
      dragRef.current.id
    );

    if (!signature) return;

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
      signature.width;

    const maxY =
      renderedPageSize.height -
      signature.height;

    newX = Math.max(
      0,
      Math.min(newX, maxX)
    );

    newY = Math.max(
      0,
      Math.min(newY, maxY)
    );

    onSignaturePositionChange?.(
      signature.id,
      {
        x: newX,
        y: newY,
        page_width: renderedPageSize.width,
        page_height: renderedPageSize.height,
      }
    );
  };

  /*
   * Finish dragging.
   */
  const handleSignaturePointerUp = () => {
    dragRef.current = null;
  };

  /*
   * Begin resizing.
   */
  const handleResizePointerDown = (
    event,
    signature
  ) => {
    if (!enableSignaturePlacement) return;

    event.preventDefault();
    event.stopPropagation();

    const point = getPositionFromPointer(
      event.clientX,
      event.clientY
    );

    if (!point) return;

    resizeRef.current = {
      id: signature.id,
      startX: point.x,
      startY: point.y,
      originalWidth: signature.width,
      originalHeight: signature.height,
    };

    event.currentTarget.setPointerCapture?.(
      event.pointerId
    );
  };

  /*
   * Resize signature while maintaining aspect ratio.
   */
  const handleResizePointerMove = (event) => {
    if (!resizeRef.current) return;

    const signature = getSignatureById(
      resizeRef.current.id
    );

    if (!signature) return;

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
      resizeRef.current.originalWidth +
      deltaX;

    const minimumWidth = 80;

    newWidth = Math.max(
      minimumWidth,
      newWidth
    );

    const maxWidth =
      renderedPageSize.width -
      signature.x;

    const maxHeight =
      renderedPageSize.height -
      signature.y;

    newWidth = Math.min(
      newWidth,
      maxWidth
    );

    let newHeight =
      newWidth / aspectRatio;

    if (newHeight > maxHeight) {
      newHeight = maxHeight;
      newWidth =
        newHeight * aspectRatio;
    }

    onSignaturePositionChange?.(
      signature.id,
      {
        width: newWidth,
        height: newHeight,
        page_width: renderedPageSize.width,
        page_height: renderedPageSize.height,
      }
    );
  };

  /*
   * Finish resizing.
   */
  const handleResizePointerUp = () => {
    resizeRef.current = null;
  };

  /*
   * Only show signatures belonging to the currently
   * displayed page.
   */
  const currentPageSignatures =
    signaturePositions.filter(
      (signature) =>
        signature.page_number ===
        currentPage - 1
    );

  /*
   * Add a signature to the current page.
   *
   * Pass the currently rendered page dimensions to the
   * parent so the backend knows exactly what scale the
   * frontend was using when the signature was placed.
   */
  const handleAddSignatureToCurrentPage = () => {
    if (!onAddSignature) return;

    onAddSignature(
      currentPage - 1,
      renderedPageSize.width,
      renderedPageSize.height
    );
  };

  const canAddSignature =
    enableSignaturePlacement &&
    Boolean(signatureDataUrl) &&
    Boolean(onAddSignature);

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

        {enableSignaturePlacement &&
          signatureDataUrl &&
          renderedPageSize.width > 0 &&
          currentPageSignatures.map(
            (signature) => (
              <div
                key={signature.id}
                className="pdfviewer-signature-overlay"
                style={{
                  left: `${signature.x}px`,
                  top: `${signature.y}px`,
                  width: `${signature.width}px`,
                  height: `${signature.height}px`,
                }}
                onPointerDown={(event) =>
                  handleSignaturePointerDown(
                    event,
                    signature
                  )
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

                <button
                  type="button"
                  className="pdfviewer-signature-remove"
                  onPointerDown={(event) => {
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
                  <Trash2
                    size={13}
                    strokeWidth={2}
                  />
                </button>

                <div
                  className="pdfviewer-signature-resize"
                  onPointerDown={(event) =>
                    handleResizePointerDown(
                      event,
                      signature
                    )
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
            )
          )}
      </div>

      {canAddSignature && (
        <button
          type="button"
          className="pdfviewer-add-signature"
          onClick={
            handleAddSignatureToCurrentPage
          }
        >
          <Plus
            size={15}
            strokeWidth={2}
          />
          Add signature to page {currentPage}
        </button>
      )}

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