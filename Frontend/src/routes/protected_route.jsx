import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { apiFetch } from "../utils/api";

/**
 * Wrap any route that requires login with this.
 * Checks /auth/me on mount — if it fails (even after a silent refresh
 * attempt inside apiFetch), bounces the user back to the login screen.
 */
function ProtectedRoute({ children }) {
  const [status, setStatus] = useState("checking"); // "checking" | "authed" | "unauthed"

  useEffect(() => {
    let isMounted = true;

    apiFetch("/auth/me")
      .then((response) => {
        if (isMounted) setStatus(response.ok ? "authed" : "unauthed");
      })
      .catch(() => {
        if (isMounted) setStatus("unauthed");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (status === "checking") {
    return null; // could swap this for a spinner later
  }

  if (status === "unauthed") {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default ProtectedRoute;