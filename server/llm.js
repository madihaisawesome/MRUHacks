import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

let openai;
let anthropic;

export function parseJsonText(text) {
  if (!text) throw new Error("The model returned no text.");
  const cleaned = String(text)
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  return JSON.parse(cleaned);
}

export function llmProvider() {
  if (process.env.MOCK_MODE === "true") return "mock";
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return "none";
}

function getOpenAI() {
  if (!openai) openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openai;
}

function getAnthropic() {
  if (!anthropic) anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return anthropic;
}

async function completeOpenAI({ prompt, image, maxTokens }) {
  const content = [];
  if (image) {
    content.push({
      type: "image_url",
      image_url: { url: `data:image/jpeg;base64,${image}` },
    });
  }
  content.push({ type: "text", text: prompt });
  const response = await getOpenAI().chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o",
    max_tokens: maxTokens,
    messages: [{ role: "user", content }],
  });
  return response.choices?.[0]?.message?.content || "";
}

async function completeAnthropic({ prompt, image, maxTokens }) {
  const content = [];
  if (image) {
    content.push({
      type: "image",
      source: { type: "base64", media_type: "image/jpeg", data: image },
    });
  }
  content.push({ type: "text", text: prompt });
  const response = await getAnthropic().messages.create({
    model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
    max_tokens: maxTokens,
    messages: [{ role: "user", content }],
  });
  return response.content?.find((block) => block.type === "text")?.text || "";
}

export async function completeText({ prompt, image, maxTokens = 800 }) {
  const provider = llmProvider();
  if (provider === "openai") return completeOpenAI({ prompt, image, maxTokens });
  if (provider === "anthropic") return completeAnthropic({ prompt, image, maxTokens });
  throw new Error("Set OPENAI_API_KEY or ANTHROPIC_API_KEY, or use MOCK_MODE=true.");
}

export async function completeJson({ prompt, image, maxTokens = 800 }) {
  return parseJsonText(await completeText({ prompt, image, maxTokens }));
}
