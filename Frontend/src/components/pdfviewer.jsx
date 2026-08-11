import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import "./pdfviewer.css";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

/**
 * Renders a PDF from a URL (e.g. a presigned download link) one page at a
 * time onto a canvas, with prev/next controls when there's more than one page.
 */
function PdfViewer({ fileUrl }) {
  const canvasRef = useRef(null);
  const pdfDocRef = useRef(null);

  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Load the PDF document whenever the URL changes.
  useEffect(() => {
    if (!fileUrl) return;

    let isCancelled = false;
    setIsLoading(true);
    setError("");

    pdfjsLib
      .getDocument(fileUrl)
      .promise.then((pdfDoc) => {
        if (isCancelled) return;
        pdfDocRef.current = pdfDoc;
        setNumPages(pdfDoc.numPages);
        setCurrentPage(1);
      })
      .catch(() => {
        if (!isCancelled) setError("Couldn't load this PDF.");
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
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
      const unscaledViewport = page.getViewport({ scale: 1 });
      const scale = containerWidth / unscaledViewport.width;
      const viewport = page.getViewport({ scale });

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      page.render({ canvasContext: context, viewport });
    });

    return () => {
      isCancelled = true;
    };
  }, [currentPage, numPages]);

  return (
    <div className="pdfviewer">
      {error && <p className="pdfviewer-error">{error}</p>}

      {isLoading && !error && <p className="pdfviewer-loading">Loading document…</p>}

      <div className="pdfviewer-canvas-wrapper" style={{ display: isLoading ? "none" : "block" }}>
        <canvas ref={canvasRef} className="pdfviewer-canvas" />
      </div>

      {numPages > 1 && (
        <div className="pdfviewer-controls">
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            aria-label="Previous page"
          >
            <ChevronLeft size={16} strokeWidth={2} />
          </button>
          <span className="pdfviewer-page-indicator">
            Page {currentPage} of {numPages}
          </span>
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
            disabled={currentPage === numPages}
            aria-label="Next page"
          >
            <ChevronRight size={16} strokeWidth={2} />
          </button>
        </div>
      )}
    </div>
  );
}

export default PdfViewer;