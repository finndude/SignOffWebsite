import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Upload as UploadIcon,
  FileText,
  X,
  Search,
  User,
} from "lucide-react";
import { apiFetch } from "../utils/api";
import "./upload.css";

function Upload() {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [title, setTitle] = useState("");

  const [assignedToId, setAssignedToId] =
    useState("");

  const [selectedUser, setSelectedUser] =
    useState(null);

  const [userSearch, setUserSearch] =
    useState("");

  const [showUserResults, setShowUserResults] =
    useState(false);

  const [isSearchingUsers, setIsSearchingUsers] =
    useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] =
    useState("");

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const userSearchRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        userSearchRef.current &&
        !userSearchRef.current.contains(event.target)
      ) {
        setShowUserResults(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  useEffect(() => {
    const trimmedSearch =
      userSearch.trim();

    if (trimmedSearch.length < 2) {
      setUsers([]);
      setIsSearchingUsers(false);
      return;
    }

    setIsSearchingUsers(true);

    const timeout = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          search: trimmedSearch,
        });

        const response = await apiFetch(
          `/admin/users/assignable?${params.toString()}`
        );

        if (!response.ok) {
          throw new Error(
            "Failed to search users."
          );
        }

        const data = await response.json();

        setUsers(
          Array.isArray(data) ? data : []
        );
      } catch {
        setUsers([]);
      } finally {
        setIsSearchingUsers(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [userSearch]);

  const handleFileChange = (e) => {
    const newFiles = Array.from(
      e.target.files || []
    );

    setSelectedFiles((prev) => [
      ...prev,
      ...newFiles,
    ]);

    e.target.value = "";
  };

  const removeFile = (indexToRemove) => {
    setSelectedFiles((prev) =>
      prev.filter(
        (_, i) => i !== indexToRemove
      )
    );
  };

  const selectUser = (user) => {
    setSelectedUser(user);
    setAssignedToId(user.id);
    setUserSearch("");
    setUsers([]);
    setShowUserResults(false);
  };

  const clearSelectedUser = () => {
    setSelectedUser(null);
    setAssignedToId("");
    setUserSearch("");
    setUsers([]);
  };

  const handleUserSearchChange = (e) => {
    const value = e.target.value;

    setUserSearch(value);
    setShowUserResults(true);

    if (!value.trim()) {
      setUsers([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccessMessage("");

    if (selectedFiles.length === 0) {
      setError(
        "Add at least one file to upload."
      );
      return;
    }

    if (!title.trim()) {
      setError(
        "Add a title for this upload."
      );
      return;
    }

    if (!assignedToId) {
      setError(
        "Choose who these documents should be assigned to."
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();

      formData.append(
        "title",
        title.trim()
      );

      formData.append(
        "assigned_to_id",
        assignedToId
      );

      selectedFiles.forEach((file) => {
        formData.append(
          "files",
          file
        );
      });

      const response = await apiFetch(
        "/admin/documents/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      const data =
        await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        setError(
          data.detail ||
            "Something went wrong. Please try again."
        );

        setIsSubmitting(false);
        return;
      }

      setSuccessMessage(
        data.detail ||
          "Documents uploaded and assigned."
      );

      setSelectedFiles([]);
      setTitle("");
      setAssignedToId("");
      setSelectedUser(null);
      setUserSearch("");
      setUsers([]);

      setIsSubmitting(false);
    } catch {
      setError(
        "Couldn't reach the server. Please try again."
      );

      setIsSubmitting(false);
    }
  };

  return (
    <div className="upload-page app-background">
      <div className="upload-card">
        <button
          type="button"
          className="upload-back"
          onClick={() =>
            navigate("/dashboard")
          }
          aria-label="Back to dashboard"
        >
          <ArrowLeft
            size={18}
            strokeWidth={1.8}
          />
        </button>

        <div className="upload-icon">
          <UploadIcon
            size={26}
            strokeWidth={1.8}
          />
        </div>

        <h1 className="upload-title">
          Upload documents
        </h1>

        <p className="upload-subtitle">
          Add one or more PDFs, then choose who
          should sign them.
        </p>

        <form
          className="upload-form"
          onSubmit={handleSubmit}
        >
          {error && (
            <p className="upload-error">
              {error}
            </p>
          )}

          {successMessage && (
            <p className="upload-success">
              {successMessage}
            </p>
          )}

          <label
            className="upload-label"
            htmlFor="uploadTitle"
          >
            Upload title
          </label>

          <input
            id="uploadTitle"
            type="text"
            className="upload-input"
            placeholder="e.g. August site safety review"
            value={title}
            onChange={(e) =>
              setTitle(e.target.value)
            }
            maxLength={120}
            required
          />

          <label
            className="upload-label"
            htmlFor="fileInput"
          >
            Files
          </label>

          <label
            className="upload-dropzone"
            htmlFor="fileInput"
          >
            <UploadIcon
              size={20}
              strokeWidth={1.8}
            />

            <span>
              Click to choose PDF files
            </span>
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
              {selectedFiles.map(
                (file, index) => (
                  <li
                    key={`${file.name}-${index}`}
                    className="upload-file-item"
                  >
                    <FileText
                      size={16}
                      strokeWidth={1.8}
                    />

                    <span className="upload-file-name">
                      {file.name}
                    </span>

                    <button
                      type="button"
                      className="upload-file-remove"
                      onClick={() =>
                        removeFile(index)
                      }
                      aria-label={`Remove ${file.name}`}
                    >
                      <X
                        size={15}
                        strokeWidth={2}
                      />
                    </button>
                  </li>
                )
              )}
            </ul>
          )}

          <label className="upload-label">
            Assign to
          </label>

          <div
            className="upload-user-picker"
            ref={userSearchRef}
          >
            {selectedUser ? (
              <div className="upload-selected-user">
                <div className="upload-selected-user-icon">
                  <User
                    size={17}
                    strokeWidth={1.8}
                  />
                </div>

                <div className="upload-selected-user-info">
                  <span>
                    {selectedUser.name}
                  </span>

                  <small>
                    {selectedUser.email}
                  </small>
                </div>

                <button
                  type="button"
                  className="upload-selected-user-remove"
                  onClick={
                    clearSelectedUser
                  }
                  aria-label="Remove selected user"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <>
                <div className="upload-user-search">
                  <Search
                    size={17}
                    strokeWidth={1.8}
                  />

                  <input
                    type="text"
                    value={userSearch}
                    onChange={
                      handleUserSearchChange
                    }
                    onFocus={() =>
                      setShowUserResults(
                        true
                      )
                    }
                    placeholder="Search name or email..."
                    autoComplete="off"
                  />
                </div>

                {showUserResults &&
                  userSearch.trim()
                    .length >= 2 && (
                    <div className="upload-user-results">
                      {isSearchingUsers ? (
                        <div className="upload-user-result-message">
                          Searching…
                        </div>
                      ) : users.length ===
                        0 ? (
                        <div className="upload-user-result-message">
                          No users found.
                        </div>
                      ) : (
                        users.map(
                          (user) => (
                            <button
                              type="button"
                              key={user.id}
                              className="upload-user-result"
                              onClick={() =>
                                selectUser(
                                  user
                                )
                              }
                            >
                              <div className="upload-user-result-icon">
                                <User
                                  size={17}
                                  strokeWidth={
                                    1.8
                                  }
                                />
                              </div>

                              <div className="upload-user-result-info">
                                <span>
                                  {
                                    user.name
                                  }
                                </span>

                                <small>
                                  {
                                    user.email
                                  }
                                </small>
                              </div>
                            </button>
                          )
                        )
                      )}
                    </div>
                  )}
              </>
            )}
          </div>

          <button
            type="submit"
            className="upload-button"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Uploading…"
              : "Upload & Assign"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Upload;