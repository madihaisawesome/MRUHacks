import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import cors from "cors";
import dotenv from "dotenv";
import express from "express";

import { sessions } from "./sessions.js";
import { runCreateSkillGraph } from "./createSkillGraph.js";
import { generateAndSaveLesson } from "./generateLesson.js";
import { completeJson, llmProvider } from "./llm.js";
import {
  getLesson,
  listLessonSummaries,
} from "./lessons.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });
dotenv.config();
const catalog = JSON.parse(
  fs.readFileSync(path.join(__dirname, "curriculum.json"), "utf8"),
);
const app = express();
const port = Number(process.env.PORT || 3001);
const rateLimitTimes = new Map();
const mockChecks = new Map();

app.use(cors());
app.use(express.json({ limit: "15mb" }));

function publicStep(step) {
  return step
    ? {
        id: step.id,
        title: step.title,
        instruction: step.instruction,
        verifiable: step.verifiable !== false,
      }
    : null;
}

function lessonAsSkill(lesson) {
  if (!lesson) return null;
  return {
    id: lesson.id,
    name: lesson.skill,
    skill: lesson.skill,
    categoryId: lesson.category,
    categoryName: lesson.category,
    persona: lesson.persona,
    steps: lesson.steps,
  };
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

function resolveLessonId(body = {}) {
  return body.lessonId || body.skillId || "sew-button";
}

function getSessionLesson(session) {
  return getLesson(session.lessonId || session.skillId);
}

function getSessionSkill(session) {
  return lessonAsSkill(getSessionLesson(session));
}

function getSessionStep(session) {
  const lesson = getSessionLesson(session);
  return lesson?.steps.find((step) => step.id === session.currentStep) || null;
}

function coachLine(session, feedback, extra = {}) {
  const step = getSessionStep(session);
  if (session.completed) {
    return `${feedback} That's the whole lesson. I'm proud of you.`;
  }
  if (extra.advanced && step) {
    return `${feedback} Next up: ${step.instruction}`;
  }
  return feedback;
}

function sessionResponse(session, feedback, extra = {}) {
  const skill = getSessionSkill(session);
  const step = publicStep(getSessionStep(session));
  return {
    stepComplete: Boolean(extra.stepComplete),
    advanced: Boolean(extra.advanced),
    completed: session.completed,
    skill: skill ? publicSkill(skill) : null,
    lessonId: session.lessonId || skill?.id || null,
    currentStep: step,
    feedback,
    coachLine: coachLine(session, feedback, extra),
    passStreak: session.passStreak,
    attempts: session.attempts,
    totalSteps: skill?.steps.length || 0,
    ...extra,
  };
}

function modelPrompt(skill, step) {
  return [
    `You are ${skill.persona}.`,
    "Look at the learner's webcam photo and coach them through THIS step only.",
    `Skill: ${skill.name}`,
    `Step title: ${step.title}`,
    `What they should do: ${step.instruction}`,
    `Success criteria: ${step.success_criteria}`,
    `Common mistakes: ${step.common_mistakes.join(", ")}`,
    "",
    "If the success criteria are clearly visible, set criteria_met true and give a brief warm compliment.",
    "If they are close but not done, set criteria_met false and tell them the ONE next physical action.",
    "If they are on the wrong track, gently name the likely mistake and how to fix it.",
    "Write feedback as if you are speaking out loud: short, specific, encouraging, maximum 2 sentences. No markdown.",
    'If the image is too dark, blurry, or does not show the work, set visible false and ask them to move the camera.',
    'Return ONLY valid JSON with no preamble and no markdown fences:',
    '{"visible": true, "criteria_met": true|false, "feedback": "..."}',
  ].join("\n");
}

async function assessImage(image, skill, step, sessionId) {
  if (llmProvider() === "mock") {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const count = (mockChecks.get(sessionId) || 0) + 1;
    mockChecks.set(sessionId, count);
    const passed = count % 2 === 0;
    return {
      visible: true,
      criteria_met: passed,
      feedback: passed
        ? `Lovely — ${step.title.toLowerCase()} looks right from here.`
        : `Not quite yet. ${step.instruction}`,
    };
  }

  let lastError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const result = await completeJson({
        prompt: modelPrompt(skill, step),
        image,
        maxTokens: 600,
      });
      if (
        typeof result.visible !== "boolean" ||
        typeof result.criteria_met !== "boolean" ||
        typeof result.feedback !== "string"
      ) {
        throw new Error("The model returned an invalid assessment.");
      }
      return result;
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(`Unable to parse the model response: ${lastError.message}`);
}

app.get("/health", (_req, res) => res.json({ ok: true, provider: llmProvider() }));

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
  const step = publicStep(skill.steps[0]);
  return {
    sessionId,
    lessonId: skill.id,
    skill: publicSkill(skill),
    totalSteps: skill.steps.length,
    step,
    coachLine: `I'll walk you through ${skill.name}, one step at a time. ${step.instruction}`,
  };
}

function createSession(lesson) {
  const sessionId = crypto.randomUUID();
  sessions.set(sessionId, {
    lessonId: lesson.id,
    skillId: lesson.id,
    currentStep: lesson.steps[0].id,
    attempts: 0,
    passStreak: 0,
    history: [],
    completed: false,
  });
  return sessionId;
}

function resetSessionState(session, lesson) {
  session.lessonId = lesson.id;
  session.skillId = lesson.id;
  session.currentStep = lesson.steps[0].id;
  session.attempts = 0;
  session.passStreak = 0;
  session.history = [];
  session.completed = false;
}

function selfConfirmFeedback(step) {
  return `I can't see this part on camera — ${step.success_criteria} Tap confirm when you've done it.`;
}

function advanceSession(session, lesson, step) {
  const nextStep = lesson.steps.find((candidate) => candidate.id > step.id);
  session.passStreak = 0;
  session.attempts = 0;
  if (nextStep) session.currentStep = nextStep.id;
  else session.completed = true;
  return Boolean(nextStep);
}

app.get("/lessons", (_req, res) => {
  res.json(listLessonSummaries());
});

app.get("/lessons/:id", (req, res) => {
  const lesson = getLesson(req.params.id);
  if (!lesson) return res.status(404).json({ error: "lesson not found" });
  res.json(lesson);
});

app.post("/generate-lesson", async (req, res) => {
  const { image, text, preservedBy, category } = req.body || {};
  const hasImage = typeof image === "string" && image.trim();
  const hasText = typeof text === "string" && text.trim();
  if (!hasImage && !hasText) {
    return res.status(400).json({ error: "image or text is required" });
  }

  try {
                const lesson = await generateAndSaveLesson({
      image,
      text,
      preservedBy,
      category,
    });
    return res.json(lesson);
  } catch (error) {
    if (error.refused) {
      return res.status(422).json({ refused: true, reason: error.reason });
    }
    console.error("Lesson generation failed:", error);
    const status = error.message === "image or text is required" ? 400 : 500;
    return res.status(status).json({ error: error.message || "Unable to generate a lesson." });
  }
});

app.post("/create-skill", async (req, res) => {
  const { message, image, preservedBy, category, conversationId } = req.body || {};
  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "message is required" });
  }
  try {
    const result = await runCreateSkillGraph({
      message: message.trim(),
      image,
      preservedBy,
      category,
      conversationId,
    });
    const status = result.status === "refused" ? 422 : result.status === "error" ? 500 : 200;
    return res.status(status).json(result);
  } catch (error) {
    console.error("Create-skill graph failed:", error);
    return res.status(500).json({ error: error.message || "create-skill graph failed" });
  }
});

app.post("/session/start", (req, res) => {
  const lesson = getLesson(resolveLessonId(req.body));
  if (!lesson) return res.status(404).json({ error: "lesson not found" });
  const sessionId = createSession(lesson);
  res.json(startSessionPayload(sessionId, lessonAsSkill(lesson)));
});

app.post("/session/reset", (req, res) => {
  const { sessionId } = req.body || {};
  const session = sessions.get(sessionId);
  if (!session) return res.status(404).json({ error: "session not found" });
  const lesson = getLesson(resolveLessonId({
    lessonId: req.body?.lessonId || session.lessonId,
    skillId: req.body?.skillId,
  }));
  if (!lesson) return res.status(404).json({ error: "lesson not found" });
  resetSessionState(session, lesson);
  rateLimitTimes.delete(sessionId);
  mockChecks.delete(sessionId);
  res.json(startSessionPayload(sessionId, lessonAsSkill(lesson)));
});

app.post("/session/confirm", (req, res) => {
  const { sessionId } = req.body || {};
  const session = sessions.get(sessionId);
  if (!session) return res.status(404).json({ error: "session not found" });
  const lesson = getSessionLesson(session);
  const step = getSessionStep(session);
  if (!lesson || !step) return res.status(404).json({ error: "current step not found" });
  if (session.completed) {
    return res.json(sessionResponse(session, "This lesson is already complete.", { stepComplete: true }));
  }
  if (step.verifiable !== false) {
    return res.status(400).json({ error: "this step must be checked with the camera" });
  }
  const advanced = advanceSession(session, lesson, step);
  return res.json(sessionResponse(session, "Nice — that step is done.", {
    stepComplete: true,
    advanced,
    needsSelfConfirm: false,
  }));
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

    const lesson = getSessionLesson(session);
    const skill = getSessionSkill(session);
    const step = getSessionStep(session);
    if (!lesson || !skill || !step) return res.status(404).json({ error: "current step not found" });
    if (step.verifiable === false) {
      return res.json(sessionResponse(session, selfConfirmFeedback(step), {
        needsSelfConfirm: true,
      }));
    }
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
        const advanced = advanceSession(session, lesson, step);
        return res.json(sessionResponse(session, assessment.feedback, {
          stepComplete: true,
          advanced,
        }));
      }
      return res.json(sessionResponse(
        session,
        `${assessment.feedback} Hold it there and show me once more so I can be sure.`,
        { stepComplete: false },
      ));
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
