import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { apiFetch } from "../utils/api";

/**
 * Wrap any route that requires login with this.
 * Checks /auth/me on mount — if it fails (even after a silent refresh
 * attempt inside apiFetch), bounces the user back to the login screen.
 *
 * Pass requireRole="admin" to also lock the route to a specific role —
 * non-matching users get redirected to /dashboard instead.
 */
function ProtectedRoute({ children, requireRole }) {
  const [status, setStatus] = useState("checking"); // "checking" | "authed" | "unauthed" | "forbidden"

  useEffect(() => {
    let isMounted = true;

    apiFetch("/auth/me")
      .then(async (response) => {
        if (!isMounted) return;

        if (!response.ok) {
          setStatus("unauthed");
          return;
        }

        const data = await response.json();
        if (requireRole && data.role !== requireRole) {
          setStatus("forbidden");
        } else {
          setStatus("authed");
        }
      })
      .catch(() => {
        if (isMounted) setStatus("unauthed");
      });

    return () => {
      isMounted = false;
    };
  }, [requireRole]);

  if (status === "checking") {
    return null; // could swap this for a spinner later
  }

  if (status === "unauthed") {
    return <Navigate to="/" replace />;
  }

  if (status === "forbidden") {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default ProtectedRoute;
