const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";

/**
 * Error shape thrown by request(): { status, message, detail }
 * Callers use `status` to distinguish network failures (status === 0),
 * validation errors (422), not-found (404), and other server errors.
 */
class ApiError extends Error {
  constructor(message, status, detail) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
  } catch (err) {
    throw new ApiError("Unable to connect to the drafting service.", 0, null);
  }

  if (!response.ok) {
    let detail = null;
    try {
      detail = await response.json();
    } catch {
      // no JSON body; ignore
    }
    const message =
      response.status === 422
        ? "Some information is missing or incorrectly formatted."
        : response.status === 404
        ? "The requested item could not be found."
        : "The drafting service returned an unexpected error.";
    throw new ApiError(message, response.status, detail);
  }

  if (response.status === 204) return null;
  return response.json();
}

export function analyzeRequest(text) {
  return request("/analyze", {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

export function analyzeRequestWithImage(text, imageBlob, latitude, longitude) {
  const formData = new FormData();
  formData.append("text", text);
  if (latitude) formData.append("latitude", latitude);
  if (longitude) formData.append("longitude", longitude);
  formData.append("file", imageBlob, "capture.jpg");

  return request("/analyze_with_image", {
    method: "POST",
    headers: {}, // fetch will automatically set the correct Content-Type with boundary for FormData
    body: formData,
  });
}

export function extractFacts(text) {
  return request("/extract-facts", {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

export function findMissingInfo(requestType, category, facts) {
  return request("/missing-info", {
    method: "POST",
    body: JSON.stringify({
      request_type: requestType,
      category,
      facts,
    }),
  });
}

export function generateDraft(requestType, category, facts) {
  return request("/generate-draft", {
    method: "POST",
    body: JSON.stringify({
      request_type: requestType,
      category,
      facts,
    }),
  });
}

export function createCase(data) {
  return request("/cases", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getAllCases() {
  return request("/cases", {
    method: "GET",
  });
}

export function getCase(caseNumber) {
  return request(`/cases/${encodeURIComponent(caseNumber)}`, {
    method: "GET",
  });
}

export function updateCaseStatus(caseNumber, status) {
  return request(`/cases/${encodeURIComponent(caseNumber)}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function verifyAndResolveCase(caseNumber, imageFile) {
  const formData = new FormData();
  formData.append("file", imageFile);

  const res = await fetch(`${API_BASE_URL}/cases/${caseNumber}/resolve`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new ApiError(
      res.status,
      errorData.detail || errorData.message || "An unexpected error occurred"
    );
  }

  return await res.json();
}

export { ApiError };
