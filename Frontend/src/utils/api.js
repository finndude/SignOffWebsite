// Central place for talking to the backend.
// Move this to VITE_API_BASE_URL once you're ready to deploy —
// hardcoded to localhost for now since that's all we need in dev.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

/**
 * Wrapper around fetch that:
 * - always sends cookies (credentials: include) so the httpOnly auth cookies work
 * - on a 401, tries POST /auth/refresh once to get a new access token,
 *   then retries the original request exactly once
 *
 * This is what makes login sessions survive past the 15-minute access
 * token expiry without forcing the user to log in again every time.
 */
export async function apiFetch(path, options = {}) {
  const isFormData = options.body instanceof FormData;

  const doFetch = () =>
    fetch(`${API_BASE_URL}${path}`, {
      ...options,
      credentials: "include",
      headers: {
        // Skip forcing JSON for FormData — the browser sets its own
        // multipart Content-Type (with the correct boundary) automatically.
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...(options.headers || {}),
      },
    });

  let response = await doFetch();

  if (response.status === 401 && path !== "/auth/refresh" && path !== "/auth/login") {
    const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });

    if (refreshResponse.ok) {
      response = await doFetch();
    }
  }

  return response;
}