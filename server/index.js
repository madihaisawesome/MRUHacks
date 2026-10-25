import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Anthropic from "@anthropic-ai/sdk";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";

import { sessions } from "./sessions.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const catalog = JSON.parse(
  fs.readFileSync(path.join(__dirname, "curriculum.json"), "utf8"),
);
const skillsById = new Map(
  catalog.categories.flatMap((category) =>
    category.skills.map((skill) => [
      skill.id,
      {
        ...skill,
        categoryId: category.id,
        categoryName: category.name,
        persona: skill.persona || catalog.persona,
      },
    ]),
  ),
);
const app = express();
const port = Number(process.env.PORT || 3001);
const rateLimitTimes = new Map();
const mockChecks = new Map();
const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        origin === "http://localhost:5173" ||
        origin === "http://127.0.0.1:5173"
      ) {
        callback(null, true);
        return;
      }
      callback(new Error("Origin is not allowed by CORS."));
    },
  }),
);
app.use(express.json({ limit: "10mb" }));

function publicStep(step) {
  return step
    ? { id: step.id, title: step.title, instruction: step.instruction }
    : null;
}

function getSkill(skillId) {
  return skillsById.get(skillId || catalog.defaultSkillId) || null;
}

function publicSkill(skill) {
  return {
    id: skill.id,
    name: skill.name,
    categoryId: skill.categoryId,
    categoryName: skill.categoryName,
    totalSteps: skill.steps.length,
  };
}

function getSessionSkill(session) {
  return getSkill(session.skillId);
}

function getSessionStep(session) {
  const skill = getSessionSkill(session);
  return skill?.steps.find((step) => step.id === session.currentStep) || null;
}

function sessionResponse(session, feedback, extra = {}) {
  const skill = getSessionSkill(session);
  return {
    stepComplete: Boolean(extra.stepComplete),
    advanced: Boolean(extra.advanced),
    completed: session.completed,
    skill: skill ? publicSkill(skill) : null,
    currentStep: publicStep(getSessionStep(session)),
    feedback,
    passStreak: session.passStreak,
    attempts: session.attempts,
    totalSteps: skill?.steps.length || 0,
    ...extra,
  };
}

function modelPrompt(skill, step) {
  return [
    `You are ${skill.persona}.`,
    "Assess the user's current craft work in the image for this step only.",
    `Step title: ${step.title}`,
    `Success criteria: ${step.success_criteria}`,
    `Common mistakes: ${step.common_mistakes.join(", ")}`,
    "",
    "Decide whether the success criteria are clearly visible in the image.",
    "If they are not met, give ONE short, specific, encouraging piece of feedback (maximum 2 sentences), referencing a common mistake where relevant.",
    'If the image is too dark, blurry, or does not show the work area, say so with "visible": false and ask the user to adjust the camera.',
    'Return ONLY valid JSON with no preamble and no markdown fences:',
    '{"visible": true, "criteria_met": true|false, "feedback": "..."}',
  ].join("\n");
}

function parseModelResponse(response) {
  const text = response.content?.find((block) => block.type === "text")?.text;
  if (!text) throw new Error("The model returned no text.");
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const result = JSON.parse(cleaned);
  if (
    typeof result.visible !== "boolean" ||
    typeof result.criteria_met !== "boolean" ||
    typeof result.feedback !== "string"
  ) {
    throw new Error("The model returned an invalid assessment.");
  }
  return result;
}

async function assessImage(image, skill, step, sessionId) {
  if (process.env.MOCK_MODE === "true") {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const count = (mockChecks.get(sessionId) || 0) + 1;
    mockChecks.set(sessionId, count);
    const passed = count % 2 === 0;
    return {
      visible: true,
      criteria_met: passed,
      feedback: passed
        ? "Lovely work—everything needed for this step is clearly visible."
        : "Take another look and make sure the work area and the key details are clearly visible.",
    };
  }

  if (!anthropic) throw new Error("ANTHROPIC_API_KEY is not configured.");
  const request = {
    model: "claude-sonnet-5-5",
    max_tokens: 600,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: "image/jpeg", data: image } },
          { type: "text", text: modelPrompt(skill, step) },
        ],
      },
    ],
  };

  let lastError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return parseModelResponse(await anthropic.messages.create(request));
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(`Unable to parse the model response: ${lastError.message}`);
}

app.get("/health", (_req, res) => res.json({ ok: true }));

app.get("/skills", (_req, res) => {
  res.json({
    defaultSkillId: catalog.defaultSkillId,
    categories: catalog.categories.map((category) => ({
      id: category.id,
      name: category.name,
      skills: category.skills.map((skill) => ({
        id: skill.id,
        name: skill.name,
        totalSteps: skill.steps.length,
      })),
    })),
  });
});

function startSessionPayload(sessionId, skill) {
  return {
    sessionId,
    skill: publicSkill(skill),
    totalSteps: skill.steps.length,
    step: publicStep(skill.steps[0]),
  };
}

app.post("/session/start", (req, res) => {
  const skill = getSkill(req.body?.skillId);
  if (!skill) return res.status(404).json({ error: "skill not found" });
  const sessionId = crypto.randomUUID();
  sessions.set(sessionId, {
    skillId: skill.id,
    currentStep: skill.steps[0].id,
    attempts: 0,
    passStreak: 0,
    history: [],
    completed: false,
  });
  res.json(startSessionPayload(sessionId, skill));
});

app.post("/session/reset", (req, res) => {
  const { sessionId, skillId } = req.body || {};
  const session = sessions.get(sessionId);
  if (!session) return res.status(404).json({ error: "session not found" });
  const skill = getSkill(skillId || session.skillId);
  if (!skill) return res.status(404).json({ error: "skill not found" });
  session.skillId = skill.id;
  session.currentStep = skill.steps[0].id;
  session.attempts = 0;
  session.passStreak = 0;
  session.history = [];
  session.completed = false;
  rateLimitTimes.delete(sessionId);
  mockChecks.delete(sessionId);
  res.json(startSessionPayload(sessionId, skill));
});

app.post("/check", async (req, res) => {
  const startedAt = Date.now();
  const { sessionId, image } = req.body || {};
  try {
    const session = sessions.get(sessionId);
    if (!session) return res.status(404).json({ error: "session not found" });
    if (typeof image !== "string" || !image) {
      return res.status(400).json({ error: "image is required" });
    }
    const previousCheck = rateLimitTimes.get(sessionId);
    if (previousCheck && Date.now() - previousCheck < 2000) {
      return res.status(429).json({ error: "too fast" });
    }
    rateLimitTimes.set(sessionId, Date.now());
    if (session.completed) {
      return res.json(sessionResponse(session, "This lesson is already complete.", { stepComplete: true }));
    }

    const skill = getSessionSkill(session);
    const step = getSessionStep(session);
    if (!skill || !step) return res.status(404).json({ error: "current step not found" });
    const assessment = await assessImage(image, skill, step, sessionId);
    session.history.push({
      step: step.id,
      feedback: assessment.feedback,
      passed: assessment.visible && assessment.criteria_met,
      ts: new Date().toISOString(),
    });

    if (!assessment.visible) {
      return res.json(sessionResponse(session, assessment.feedback));
    }

    if (assessment.criteria_met) {
      session.passStreak += 1;
      if (session.passStreak >= 2) {
        const stepComplete = true;
        const nextStep = skill.steps.find((candidate) => candidate.id > step.id);
        session.passStreak = 0;
        session.attempts = 0;
        if (nextStep) session.currentStep = nextStep.id;
        else session.completed = true;
        return res.json(sessionResponse(session, assessment.feedback, {
          stepComplete,
          advanced: Boolean(nextStep),
        }));
      }
      return res.json(sessionResponse(session, assessment.feedback, { stepComplete: false }));
    }

    session.passStreak = 0;
    session.attempts += 1;
    const hint = session.attempts >= 4;
    const feedback = hint
      ? `${assessment.feedback} Hint: follow each part of the success criteria slowly and keep the whole work area in view.`
      : assessment.feedback;
    return res.json(sessionResponse(session, feedback, { hint }));
  } catch (error) {
    console.error("Image check failed:", error);
    return res.status(500).json({ error: error.message || "image check failed" });
  } finally {
    console.log(`/check latency: ${Date.now() - startedAt}ms`);
  }
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Skill coach server listening on port ${port}`);
});

export { app };
