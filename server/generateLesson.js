import { completeJson, parseJsonText } from "./llm.js";
import { mockGeneratedLesson, normalizeGeneratedLesson, saveLesson } from "./lessons.js";

export function generateLessonPrompt(text, category) {
  return [
    "You are a skill-teaching curriculum designer.",
    "Read the person's instructions. Transcribe handwriting if an image is provided.",
    "Stay faithful to their method. Do not invent a different technique or add steps they did not describe, other than splitting a described step into smaller ones.",
    "If they named a skill but did not give a method, design a safe beginner method with 4 to 8 camera-checkable steps.",
    text ? `Typed or transcribed instructions from the person:\n${text}` : "No typed text was provided; rely on the image.",
    category ? `Preferred category if it fits: ${category}` : "",
    "Produce 4 to 8 steps. Each step needs:",
    "- a short title",
    "- a one-to-two sentence instruction in plain beginner-friendly language",
    "- concrete success_criteria describing what a webcam frame would visibly show when the step is done correctly",
    "- 2 to 3 common_mistakes",
    'Set "verifiable": false for any step a camera cannot reasonably confirm (taste, smell, waiting time, temperature). For those steps, success_criteria should describe what the user should self-confirm.',
    "Also suggest skill (title), category, difficulty (beginner|intermediate|advanced), estimatedMinutes, and a materials list.",
    "Also include final_success_criteria: a visually concrete description of what the finished result should look like in a photo after all steps.",
    "Also include final_common_flaws: an array of 2 to 3 common flaws visible in a finished-result photo.",
    "If the content is unsafe to teach as a casual activity (hazardous chemicals, mains electrical work, or firearms), return ONLY {\"refused\": true, \"reason\": \"...\"}.",
    "Return ONLY valid JSON with no preamble and no markdown fences, matching this shape (without id, createdAt, or persona):",
    '{"skill":"...","category":"...","difficulty":"beginner","estimatedMinutes":10,"materials":["..."],"final_success_criteria":"...","final_common_flaws":["...","..."],"steps":[{"title":"...","instruction":"...","success_criteria":"...","common_mistakes":["...","..."],"verifiable":true}]}',
  ].filter(Boolean).join("\n");
}

export function parseJsonFence(response) {
  if (typeof response === "string") return parseJsonText(response);
  const text = response.content?.find((block) => block.type === "text")?.text;
  return parseJsonText(text);
}

export function mockLessonFromRequest(skillHint, instructions = "", extras = {}) {
  const skill = (skillHint || "New household skill").trim().slice(0, 80);
  const detail = (instructions || skill).trim().slice(0, 200);
  const lesson = normalizeGeneratedLesson(
    {
      skill,
      category: extras.category || "General",
      difficulty: "beginner",
      estimatedMinutes: 15,
      materials: ["the items named in the steps", "a clear workspace"],
      final_success_criteria: `The finished result of ${skill} is clearly visible, complete, and neat in the photo.`,
      final_common_flaws: [
        "result looks unfinished",
        "work is out of frame or blocked",
        "a different unfinished task is shown",
      ],
      steps: [
        {
          title: "Set up your space",
          instruction: `Clear a workspace and set out what you need for ${skill}.`,
          success_criteria: "The work area and the main materials for this skill are clearly visible on the table or counter.",
          common_mistakes: ["workspace is cluttered", "materials are out of frame", "nothing related to the skill is in view"],
          verifiable: true,
        },
        {
          title: "Start the first move",
          instruction: `Begin ${skill} using this method: ${detail}`,
          success_criteria: "The first action of the skill is underway and the key object is in the camera frame.",
          common_mistakes: ["work is not started", "the wrong object is being used", "hands block the entire view"],
          verifiable: true,
        },
        {
          title: "Check the in-between pause",
          instruction: "Pause briefly and confirm the work looks the way the method described before you continue.",
          success_criteria: "Confirm to yourself that the work matches the method so far and you are ready for the next move.",
          common_mistakes: ["rushing past this check", "changing to a different method", "stopping entirely"],
          verifiable: false,
        },
        {
          title: "Finish the main action",
          instruction: `Continue until the main result of ${skill} is clearly done.`,
          success_criteria: `The finished result of ${skill} is visible and looks complete, not half-done.`,
          common_mistakes: ["result is incomplete", "work has come undone", "a different task was finished instead"],
          verifiable: true,
        },
        {
          title: "Tidy and show the result",
          instruction: "Set the finished work where the camera can see it and put spare materials aside.",
          success_criteria: "The finished work sits in a clear spot with extra materials moved out of the way.",
          common_mistakes: ["result is hidden", "mess still covers the work", "finished piece was put away off camera"],
          verifiable: true,
        },
      ],
    },
    extras,
  );
  return saveLesson(lesson);
}

export async function generateAndSaveLesson({
  image,
  text,
  preservedBy,
  category,
}) {
  const hasImage = typeof image === "string" && image.trim();
  const hasText = typeof text === "string" && text.trim();
  if (!hasImage && !hasText) {
    throw new Error("image or text is required");
  }

  if (process.env.MOCK_MODE === "true") {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    if (hasText) return mockLessonFromRequest(hasText.split("\n")[0], hasText, { preservedBy, category });
    const lesson = mockGeneratedLesson();
    if (preservedBy && typeof preservedBy === "object") {
      lesson.preservedBy = {
        name: String(preservedBy.name || "").slice(0, 80),
        story: String(preservedBy.story || "").slice(0, 400),
      };
    }
    if (category) lesson.category = String(category).slice(0, 80);
    return saveLesson(lesson);
  }

  let lastError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const parsed = await completeJson({
        prompt: generateLessonPrompt(hasText ? text.trim() : "", category),
        image: hasImage ? image.trim() : undefined,
        maxTokens: 2000,
      });
      return saveLesson(normalizeGeneratedLesson(parsed, { preservedBy, category }));
    } catch (error) {
      if (error.refused) throw error;
      lastError = error;
    }
  }
  throw lastError || new Error("Unable to generate a lesson.");
}
