import crypto from "node:crypto";

import { Annotation, END, START, StateGraph } from "@langchain/langgraph";

import { generateAndSaveLesson, parseJsonFence } from "./generateLesson.js";

const conversations = new Map();

const CreateSkillState = Annotation.Root({
  conversationId: Annotation(),
  message: Annotation(),
  image: Annotation(),
  category: Annotation(),
  preservedBy: Annotation(),
  priorHint: Annotation(),
  route: Annotation(),
  skillHint: Annotation(),
  instructions: Annotation(),
  reply: Annotation(),
  lesson: Annotation(),
  error: Annotation(),
});

const UNSAFE = /\b(firearms?|guns?|bombs?|explosives?|poison|mains electric|high.?voltage|hazardous chemicals?)\b/i;

function extractSkillHint(message) {
  const text = String(message || "").trim();
  const patterns = [
    /teach me (?:how )?to (.+)/i,
    /(?:create|make|add|build) (?:a )?(?:new )?(?:skill|lesson)(?: for| to| about| called| on|:)?\s*(.+)/i,
    /i want to learn (?:how to )?(.+)/i,
    /how (?:do i|to) (.+)/i,
    /show me how to (.+)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].replace(/[.?!]+$/, "").trim();
  }
  return text;
}

function mockUnderstand(state) {
  const combined = [state.priorHint, state.message].filter(Boolean).join("\n");
  const trimmed = String(combined || "").trim();
  if (UNSAFE.test(trimmed)) {
    return {
      route: "refuse",
      reply: "I can't turn that into a casual home lesson. Ask for a safer everyday skill instead.",
    };
  }
  const vague = /^(please )?(create|make|add|build)?\s*(a\s+)?(new\s+)?(skill|lesson)?\s*$/i;
  if (!trimmed || trimmed.length < 8 || vague.test(trimmed)) {
    return {
      route: "clarify",
      reply: "What skill should I create? Tell me what you want to learn, and any family method or notes I should follow.",
    };
  }
  const skillHint = extractSkillHint(trimmed);
  return {
    route: "generate",
    skillHint,
    instructions: trimmed,
  };
}

function understandPrompt(message, priorHint) {
  return [
    "You classify a request for an AI skill coach that builds webcam-checkable home lessons.",
    priorHint ? `Earlier they said they wanted: ${priorHint}` : "",
    `User message:\n${message}`,
    "Return ONLY JSON:",
    '{"intent":"create"|"unclear"|"unsafe"|"other","skillHint":"...","instructions":"...","clarify":"..."}',
    "intent=create if they named a skill or method to teach.",
    "intent=unclear if they only asked to make a skill without saying which one.",
    "intent=unsafe for firearms, explosives, hazardous chemicals, or mains electrical work.",
    "skillHint is a short lesson title. instructions is the method to stay faithful to, or the skill name if they gave no method.",
  ].filter(Boolean).join("\n");
}

async function understandNode(state, config) {
  const anthropic = config.configurable?.anthropic;
  if (process.env.MOCK_MODE === "true" || !anthropic) {
    return mockUnderstand(state);
  }
  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-5-5",
      max_tokens: 400,
      messages: [{ role: "user", content: understandPrompt(state.message, state.priorHint) }],
    });
    const parsed = parseJsonFence(response);
    if (parsed.intent === "unsafe") {
      return {
        route: "refuse",
        reply: parsed.clarify || "I can't turn that into a casual home lesson.",
      };
    }
    if (parsed.intent !== "create" || !String(parsed.skillHint || "").trim()) {
      return {
        route: "clarify",
        reply: parsed.clarify || "What skill should I create for you to learn?",
      };
    }
    return {
      route: "generate",
      skillHint: String(parsed.skillHint).trim(),
      instructions: String(parsed.instructions || parsed.skillHint).trim(),
    };
  } catch {
    return mockUnderstand(state);
  }
}

async function generateNode(state, config) {
  try {
    const lesson = await generateAndSaveLesson({
      image: state.image,
      text: [state.skillHint, state.instructions].filter(Boolean).join("\n"),
      preservedBy: state.preservedBy,
      category: state.category,
      anthropic: config.configurable?.anthropic,
    });
    return {
      lesson,
      route: "done",
      reply: `I made a lesson for ${lesson.skill}. You can start learning it with lessonId ${lesson.id}.`,
    };
  } catch (error) {
    if (error.refused) {
      return {
        route: "refuse",
        reply: error.reason,
      };
    }
    return {
      route: "error",
      error: error.message || "Unable to create that skill.",
      reply: error.message || "I couldn't create that skill. Try describing the steps in a bit more detail.",
    };
  }
}

function routeAfterUnderstand(state) {
  if (state.route === "generate") return "generate";
  return END;
}

const graph = new StateGraph(CreateSkillState)
  .addNode("understand", understandNode)
  .addNode("generate", generateNode)
  .addEdge(START, "understand")
  .addConditionalEdges("understand", routeAfterUnderstand)
  .addEdge("generate", END)
  .compile();

export async function runCreateSkillGraph({
  message,
  image,
  category,
  preservedBy,
  conversationId,
  anthropic,
}) {
  const existing = conversationId ? conversations.get(conversationId) : null;
  const id = conversationId || crypto.randomUUID();
  const result = await graph.invoke(
    {
      conversationId: id,
      message: message || "",
      image: image || "",
      category: category || "",
      preservedBy: preservedBy || { name: "", story: "" },
      priorHint: existing?.skillHint || "",
    },
    { configurable: { anthropic } },
  );

  conversations.set(id, {
    skillHint: result.skillHint || existing?.skillHint || "",
    route: result.route,
  });

  const status =
    result.route === "done" ? "created"
      : result.route === "clarify" ? "needs_input"
        : result.route === "refuse" ? "refused"
          : "error";

  return {
    phase: "create-skill",
    status,
    conversationId: id,
    reply: result.reply,
    lesson: result.lesson || null,
    lessonId: result.lesson?.id || null,
  };
}
