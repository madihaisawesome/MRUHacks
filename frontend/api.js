const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:3001"
).replace(/\/$/, "");

/** Frontend skill ids → backend lesson ids */
const LESSON_ID_BY_SKILL = {
  "sew-button": "sew-button",
  "knot-tie": "knot-a-tie",
  "fix-handle": "fix-cabinet-handle",
  "replace-tire": "replace-car-tire",
  "grow-herbs": "grow-herbs",
  compost: "compost",
  "bake-bread": "bake-bread",
  "pizza-dough": "pizza-dough",
  "remove-stains": "remove-stains",
  "organize-tools": "organize-tools",
};

export function lessonIdForSkill(skill) {
  if (!skill) return "sew-button";
  return (
    LESSON_ID_BY_SKILL[skill.id] ||
    skill.lessonId ||
    skill.id ||
    "sew-button"
  );
}

async function readJson(response) {
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(
      response.ok
        ? "The API returned HTML instead of JSON. Is the Skill Coach server running on port 3001?"
        : `API error ${response.status}. Restart the backend with npm start in the project root.`,
    );
  }
  if (!response.ok) {
    throw new Error(
      data.error || data.reason || `Request failed: ${response.status}`,
    );
  }
  return data;
}

export async function apiRequest(endpoint, options = {}) {
  let response;
  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
  } catch {
    throw new Error(
      "Could not reach the API. Start the backend with npm start (port 3001).",
    );
  }
  return readJson(response);
}

export function getLesson(lessonId) {
  return apiRequest(`/lessons/${encodeURIComponent(lessonId)}`);
}

export function startSession(lessonId) {
  return apiRequest("/session/start", {
    method: "POST",
    body: JSON.stringify({ lessonId }),
  });
}

export async function checkFrame(sessionId, imageBase64, { quiet429 = false } = {}) {
  let response;
  try {
    response = await fetch(`${API_URL}/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, image: imageBase64 }),
    });
  } catch {
    throw new Error(
      "Could not reach the API. Start the backend with npm start (port 3001).",
    );
  }
  if (quiet429 && response.status === 429) {
    return { tooFast: true };
  }
  return readJson(response);
}

export function confirmStep(sessionId) {
  return apiRequest("/session/confirm", {
    method: "POST",
    body: JSON.stringify({ sessionId }),
  });
}

export async function verifyFinal(sessionId, imageBase64, { quiet429 = false } = {}) {
  let response;
  try {
    response = await fetch(`${API_URL}/verify-final`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, image: imageBase64 }),
    });
  } catch {
    throw new Error(
      "Could not reach the API. Start the backend with npm start (port 3001).",
    );
  }
  if (quiet429 && response.status === 429) {
    return { tooFast: true };
  }
  return readJson(response);
}

export function generateLesson({ text, category, preservedBy, image }) {
  return apiRequest("/generate-lesson", {
    method: "POST",
    body: JSON.stringify({ text, category, preservedBy, image }),
  });
}

export function fileToJpegBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      if (!base64) reject(new Error("Could not read that image."));
      else resolve(base64);
    };
    reader.onerror = () => reject(new Error("Could not read that image."));
    reader.readAsDataURL(file);
  });
}

export { API_URL };
