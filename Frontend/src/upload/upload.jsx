import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload as UploadIcon, FileText, X } from "lucide-react";
import { apiFetch } from "../utils/api";
import "./upload.css";

function Upload() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [title, setTitle] = useState("");
  const [assignedToId, setAssignedToId] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    apiFetch("/admin/users/assignable")
      .then((res) => res.json())
      .then((data) => setUsers(Array.isArray(data) ? data : []))
      .catch(() => setUsers([]));
  }, []);

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files || []);
    setSelectedFiles((prev) => [...prev, ...newFiles]);
    e.target.value = ""; // allows picking the same file again if removed
  };

  const removeFile = (indexToRemove) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== indexToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (selectedFiles.length === 0) {
      setError("Add at least one file to upload.");
      return;
    }
    if (!title.trim()) {
      setError("Add a title for this upload.");
      return;
    }
    if (!assignedToId) {
      setError("Choose who these documents should be assigned to.");
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("assigned_to_id", assignedToId);
      selectedFiles.forEach((file) => formData.append("files", file));

      const response = await apiFetch("/admin/documents/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.detail || "Something went wrong. Please try again.");
        setIsSubmitting(false);
        return;
      }

      setSuccessMessage(data.detail || "Documents uploaded and assigned.");
      setSelectedFiles([]);
      setTitle("");
      setAssignedToId("");
      setIsSubmitting(false);
    } catch (err) {
      setError("Couldn't reach the server. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="upload-page app-background">
      <div className="upload-card">
        <button
          type="button"
          className="upload-back"
          onClick={() => navigate("/dashboard")}
          aria-label="Back to dashboard"
        >
          <ArrowLeft size={18} strokeWidth={1.8} />
        </button>

        <div className="upload-icon">
          <UploadIcon size={26} strokeWidth={1.8} />
        </div>

        <h1 className="upload-title">Upload documents</h1>
        <p className="upload-subtitle">
          Add one or more PDFs, then choose who should sign them.
        </p>

        <form className="upload-form" onSubmit={handleSubmit}>
          {error && <p className="upload-error">{error}</p>}
          {successMessage && <p className="upload-success">{successMessage}</p>}

          <label className="upload-label" htmlFor="uploadTitle">
            Upload title
          </label>
          <input
            id="uploadTitle"
            type="text"
            className="upload-input"
            placeholder="e.g. August site safety review"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            required
          />

          <label className="upload-label" htmlFor="fileInput">
            Files
          </label>
          <label className="upload-dropzone" htmlFor="fileInput">
            <UploadIcon size={20} strokeWidth={1.8} />
            <span>Click to choose PDF files</span>
          </label>
          <input
            id="fileInput"
            type="file"
            accept="application/pdf"
            multiple
            onChange={handleFileChange}
            className="upload-file-input"
          />

          {selectedFiles.length > 0 && (
            <ul className="upload-file-list">
              {selectedFiles.map((file, index) => (
                <li key={`${file.name}-${index}`} className="upload-file-item">
                  <FileText size={16} strokeWidth={1.8} />
                  <span className="upload-file-name">{file.name}</span>
                  <button
                    type="button"
                    className="upload-file-remove"
                    onClick={() => removeFile(index)}
                    aria-label={`Remove ${file.name}`}
                  >
                    <X size={15} strokeWidth={2} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <label className="upload-label" htmlFor="assignee">
            Assign to
          </label>
          <select
            id="assignee"
            className="upload-select"
            value={assignedToId}
            onChange={(e) => setAssignedToId(e.target.value)}
            required
          >
            <option value="" disabled>
              Select a person…
            </option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} - {user.email}
              </option>
            ))}
          </select>

          <button type="submit" className="upload-button" disabled={isSubmitting}>
            {isSubmitting ? "Uploading…" : "Upload & Assign"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Upload;
