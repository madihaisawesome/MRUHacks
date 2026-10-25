const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:3001"
).replace(/\/$/, "");

export async function apiRequest(endpoint, options = {}) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || data.reason || `Request failed: ${response.status}`);
  }

  return data;
}

export { API_URL };