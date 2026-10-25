import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const storePath = path.join(__dirname, "lessons.json");
const curriculumPath = path.join(__dirname, "curriculum.json");

export const lessons = new Map();
const aliases = new Map([["sew-a-button", "sew-button"]]);

const DEFAULT_PERSONA = "a warm, patient grandparent";

const SEED_MATERIALS = {
  "sew-button": ["needle", "thread", "button", "fabric", "scissors"],
  "knot-a-tie": ["necktie", "collared shirt"],
  "fix-cabinet-handle": ["screwdriver", "cabinet handle", "screws"],
  "replace-car-tire": ["spare tire", "jack", "lug wrench", "wheel chocks"],
  "grow-herbs": ["pot with drainage", "potting mix", "herb seeds or seedlings", "water"],
  compost: ["compost bin", "dry leaves or cardboard", "fruit and vegetable scraps", "water"],
  "bake-bread": ["flour", "water", "yeast", "salt", "bowl", "baking pan"],
  "pizza-dough": ["flour", "water", "yeast", "salt", "bowl"],
  "remove-stains": ["stained fabric", "clean cloth", "stain remover or dish soap", "cold water"],
  "organize-tools": ["tools", "toolbox or pegboard", "labels"],
};

function persist() {
  const payload = [...lessons.values()];
  fs.writeFileSync(storePath, `${JSON.stringify(payload, null, 2)}\n`);
}

function loadStore() {
  if (!fs.existsSync(storePath)) return;
  const raw = JSON.parse(fs.readFileSync(storePath, "utf8"));
  const list = Array.isArray(raw) ? raw : Object.values(raw || {});
  for (const lesson of list) {
    if (lesson?.id) lessons.set(lesson.id, lesson);
  }
}

function clip(value, max) {
  return String(value || "").trim().slice(0, max);
}

function withVerifiableSteps(steps) {
  return (steps || []).map((step, index) => ({
    ...step,
    id: index + 1,
    verifiable: step.verifiable !== false,
  }));
}

function fromCurriculumSkill(skill, category, persona) {
  const id = skill.id === "sew-a-button" ? "sew-button" : skill.id;
  return {
    id,
    skill: skill.name,
    category: category.name,
    difficulty: "beginner",
    estimatedMinutes: Math.max(8, skill.steps.length * 2),
    materials: SEED_MATERIALS[id] || ["the items named in the steps"],
    persona: persona || DEFAULT_PERSONA,
    preservedBy: { name: "", story: "" },
    steps: withVerifiableSteps(skill.steps),
    createdAt: "2026-10-24T00:00:00.000Z",
  };
}

function extraSeededLesson() {
  return {
    id: "fold-a-fitted-sheet",
    skill: "Fold a fitted sheet",
    category: "Household skills",
    difficulty: "beginner",
    estimatedMinutes: 8,
    materials: ["fitted sheet", "flat surface"],
    persona: DEFAULT_PERSONA,
    preservedBy: { name: "", story: "" },
    steps: withVerifiableSteps([
      {
        title: "Find the corners",
        instruction: "Hold the sheet so two adjacent elastic corners are in your hands, with the elastic edge facing you.",
        success_criteria: "Two elastic corners are visibly held, one in each hand, with the fitted edge facing the camera.",
        common_mistakes: ["holding opposite corners", "elastic edge facing away", "sheet is still in a ball"],
      },
      {
        title: "Tuck the first pair",
        instruction: "Tuck one corner inside the other so those two corners nest together.",
        success_criteria: "One elastic corner is tucked inside the other and both sit stacked in one hand.",
        common_mistakes: ["corners are only pinched together", "a middle fold is tucked instead of a corner", "the sheet is twisted"],
      },
      {
        title: "Match the remaining corners",
        instruction: "Slide your hands to the last two corners and tuck them into the same stack so all four corners sit together.",
        success_criteria: "All four elastic corners are nested in one stack and the sheet hangs in a rough rectangle.",
        common_mistakes: ["only two corners are stacked", "corners are at opposite ends", "sheet still looks like a pouch"],
      },
      {
        title: "Fold into a rectangle",
        instruction: "Lay the sheet on a bed or table, fold the elastic edges in, then fold into a neat rectangle.",
        success_criteria: "The sheet lies in a compact rectangle on a flat surface with elastic mostly hidden inside.",
        common_mistakes: ["sheet is still a crumpled heap", "elastic edges stick out in a circle", "it is rolled instead of folded"],
      },
    ]),
    createdAt: "2026-10-24T00:00:00.000Z",
  };
}

function seedFromCurriculum() {
  const catalog = JSON.parse(fs.readFileSync(curriculumPath, "utf8"));
  const persona = catalog.persona || DEFAULT_PERSONA;
  const seeded = [];
  if (Array.isArray(catalog.categories)) {
    for (const category of catalog.categories) {
      for (const skill of category.skills || []) {
        seeded.push(fromCurriculumSkill(skill, category, persona));
      }
    }
  } else if (catalog.skill && catalog.steps) {
    seeded.push({
      id: "sew-button",
      skill: catalog.skill,
      category: "sewing",
      difficulty: "beginner",
      estimatedMinutes: 10,
      materials: SEED_MATERIALS["sew-button"],
      persona: catalog.persona || DEFAULT_PERSONA,
      preservedBy: { name: "", story: "" },
      steps: withVerifiableSteps(catalog.steps),
      createdAt: "2026-10-24T00:00:00.000Z",
    });
  }
  seeded.push(extraSeededLesson());
  return seeded;
}

export function getLesson(id) {
  const resolved = aliases.get(id) || id;
  return lessons.get(resolved) || null;
}

export function listLessonSummaries() {
  return [...lessons.values()].map((lesson) => ({
    id: lesson.id,
    skill: lesson.skill,
    category: lesson.category,
    difficulty: lesson.difficulty,
    estimatedMinutes: lesson.estimatedMinutes,
    stepCount: lesson.steps.length,
    preservedBy: { name: lesson.preservedBy?.name || "" },
  }));
}

export function uniqueLessonId(skillTitle) {
  const base =
    clip(skillTitle, 60)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "lesson";
  if (!lessons.has(base) && !aliases.has(base)) return base;
  return `${base}-${crypto.randomBytes(3).toString("hex")}`;
}

export function normalizeGeneratedLesson(raw, extras = {}) {
  if (!raw || typeof raw !== "object") {
    throw new Error("Lesson JSON was empty.");
  }
  if (raw.refused === true) {
    const error = new Error(clip(raw.reason, 300) || "This activity cannot be taught here.");
    error.refused = true;
    error.reason = clip(raw.reason, 300) || "This activity cannot be taught here.";
    throw error;
  }

  const stepsIn = Array.isArray(raw.steps) ? raw.steps : [];
  if (stepsIn.length < 4 || stepsIn.length > 8) {
    throw new Error("A lesson must have between 4 and 8 steps.");
  }

  const steps = stepsIn.map((step, index) => {
    const title = clip(step?.title, 80);
    const instruction = clip(step?.instruction, 300);
    const success_criteria = clip(step?.success_criteria, 300);
    const mistakes = Array.isArray(step?.common_mistakes)
      ? step.common_mistakes.map((item) => clip(item, 160)).filter(Boolean)
      : [];
    if (!title || !instruction || !success_criteria || mistakes.length === 0) {
      throw new Error(`Step ${index + 1} is missing required fields.`);
    }
    return {
      id: index + 1,
      title,
      instruction,
      success_criteria,
      common_mistakes: mistakes.slice(0, 3),
      verifiable: step?.verifiable !== false,
    };
  });

  const difficulty = ["beginner", "intermediate", "advanced"].includes(raw.difficulty)
    ? raw.difficulty
    : "beginner";
  const skill = clip(raw.skill, 80) || "Untitled skill";
  const category = clip(extras.category, 80) || clip(raw.category, 80) || "General";
  const estimatedMinutes = Number.isFinite(Number(raw.estimatedMinutes))
    ? Math.max(1, Math.round(Number(raw.estimatedMinutes)))
    : Math.max(8, steps.length * 2);
  const materials = Array.isArray(raw.materials)
    ? raw.materials.map((item) => clip(item, 80)).filter(Boolean)
    : [];

  return {
    id: uniqueLessonId(skill),
    skill,
    category,
    difficulty,
    estimatedMinutes,
    materials,
    persona: DEFAULT_PERSONA,
    preservedBy: {
      name: clip(extras.preservedBy?.name, 80),
      story: clip(extras.preservedBy?.story, 400),
    },
    steps,
    createdAt: new Date().toISOString(),
  };
}

export function saveLesson(lesson) {
  lessons.set(lesson.id, lesson);
  persist();
  return lesson;
}

export function mockGeneratedLesson() {
  return normalizeGeneratedLesson(
    {
      skill: "Grandma's flatbread",
      category: "Cooking",
      difficulty: "beginner",
      estimatedMinutes: 25,
      materials: ["flour", "water", "salt", "bowl", "skillet"],
      steps: [
        {
          title: "Mix the dough",
          instruction: "Stir flour, water, and a pinch of salt in a bowl until a shaggy dough comes together.",
          success_criteria: "A single dough mass is in the bowl with little dry flour left on the sides.",
          common_mistakes: ["dry flour still at the bottom", "mixture is a thin batter", "salt or flour was never added"],
          verifiable: true,
        },
        {
          title: "Knead until smooth",
          instruction: "Knead on a lightly floured counter until the dough is smooth and holds a ball shape.",
          success_criteria: "A smooth dough ball sits on the counter, not a sticky smear or dry crumbs.",
          common_mistakes: ["dough is still shaggy", "too much extra flour is caked on", "dough is stuck to the counter"],
          verifiable: true,
        },
        {
          title: "Rest the dough",
          instruction: "Cover the dough and let it rest for about 20 minutes so it relaxes.",
          success_criteria: "Confirm to yourself that the dough has rested covered for about 20 minutes.",
          common_mistakes: ["skipping the rest", "leaving the dough uncovered to dry out", "resting it in a hot oven"],
          verifiable: false,
        },
        {
          title: "Divide and flatten",
          instruction: "Divide the dough into balls and press or roll each one into a round about 5mm thick.",
          success_criteria: "Several flat dough rounds are visible on the work surface, each roughly even in thickness.",
          common_mistakes: ["dough is still one large lump", "rounds are torn with holes", "pieces are very uneven"],
          verifiable: true,
        },
        {
          title: "Cook in the skillet",
          instruction: "Cook each round in a hot dry skillet until both sides have browned spots.",
          success_criteria: "Flatbreads in or beside the skillet show browned spots on at least one side.",
          common_mistakes: ["skillet is empty", "dough is still pale and raw-looking", "bread is burnt black"],
          verifiable: true,
        },
      ],
    },
    {},
  );
}

loadStore();
let seeded = false;
for (const lesson of seedFromCurriculum()) {
  if (!lessons.has(lesson.id)) {
    lessons.set(lesson.id, lesson);
    seeded = true;
  }
}
if (seeded || !fs.existsSync(storePath)) persist();
