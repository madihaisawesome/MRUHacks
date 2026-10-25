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

const SEED_FINAL = {
  "sew-button": {
    final_success_criteria:
      "A button sits flat on the fabric, firmly attached through its holes with neat stitches, and the thread is tied off with no long loose tail.",
    final_common_flaws: [
      "button is crooked or hanging by a loose thread",
      "stitches miss the button holes",
      "long untrimmed thread still dangling",
    ],
  },
  "knot-a-tie": {
    final_success_criteria:
      "A neat knot sits centered at the collar, the wide blade hangs straight covering the narrow end, and the tip reaches near the belt line.",
    final_common_flaws: [
      "knot is loose, crooked, or sits too low",
      "narrow end shows below the wide blade",
      "tie is twisted or backwards",
    ],
  },
  "fix-cabinet-handle": {
    final_success_criteria:
      "The handle sits flush and straight on the door or drawer, both screws are snug from the inside, and the handle does not wiggle when touched.",
    final_common_flaws: [
      "handle is crooked",
      "one screw is missing or still loose",
      "handle pulls away from the surface",
    ],
  },
  "replace-car-tire": {
    final_success_criteria:
      "The spare is mounted on the hub, the car is fully lowered, all lug nuts are installed and snug, and the jack is no longer holding the vehicle.",
    final_common_flaws: [
      "car is still jacked up",
      "lug nuts are missing or only finger-tight",
      "spare is not fully seated on the studs",
    ],
  },
  "grow-herbs": {
    final_success_criteria:
      "A pot with drainage holds potting mix and a planted herb or covered seeds, the soil looks lightly moist, and the pot sits in a bright spot.",
    final_common_flaws: [
      "roots or seeds still exposed",
      "soil is bone dry or waterlogged",
      "pot has no drainage or sits in deep standing water",
    ],
  },
  compost: {
    final_success_criteria:
      "The compost bin shows layered browns and greens that look lightly damp and mixed or covered, with no obvious meat, dairy, or plastic.",
    final_common_flaws: [
      "only food scraps with no brown layer",
      "pile is bone dry or dripping wet",
      "plastic, meat, or dairy is visible in the pile",
    ],
  },
  "bake-bread": {
    final_success_criteria:
      "A shaped loaf sits in a pan or on a tray looking risen and ready (or freshly baked with a set crust), not a raw shaggy lump in a mixing bowl.",
    final_common_flaws: [
      "dough is still unshaped in the mixing bowl",
      "loaf is collapsed or torn apart",
      "no pan or tray is used",
    ],
  },
  "pizza-dough": {
    final_success_criteria:
      "A roughly round pizza base is stretched on a floured surface or peel with a slightly thicker rim, ready for toppings.",
    final_common_flaws: [
      "dough is still a thick unstretched ball",
      "holes are torn through the center",
      "shape is tiny and uneven",
    ],
  },
  "remove-stains": {
    final_success_criteria:
      "The treated fabric area is rinsed or damp from cleaning and the stain looks lighter or gone compared with a dirty untreated spot.",
    final_common_flaws: [
      "stain looks darker or more spread out",
      "item was never rinsed",
      "wrong clean garment is shown instead",
    ],
  },
  "organize-tools": {
    final_success_criteria:
      "Tools sit in grouped homes on a rack, in a tray, or in a toolbox with clear divisions or labels, not in one tangled heap on the floor.",
    final_common_flaws: [
      "tools are still in a random pile",
      "sharp tools point up unsafely",
      "no labels or divisions are visible",
    ],
  },
  "fold-a-fitted-sheet": {
    final_success_criteria:
      "The fitted sheet lies in a compact rectangle on a flat surface with elastic mostly hidden inside the folds.",
    final_common_flaws: [
      "sheet is still a crumpled heap",
      "elastic edges stick out in a circle",
      "it is rolled into a messy tube instead of folded",
    ],
  },
};

function finalFieldsFor(id, skillName) {
  const seeded = SEED_FINAL[id];
  if (seeded) return { ...seeded };
  const name = skillName || "the skill";
  return {
    final_success_criteria: `The finished result of ${name} is clearly visible, complete, and neat in the photo.`,
    final_common_flaws: [
      "result looks unfinished",
      "work is out of frame or blocked",
      "a different unfinished task is shown",
    ],
  };
}

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
    ...finalFieldsFor(id, skill.name),
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
    ...finalFieldsFor("fold-a-fitted-sheet", "Fold a fitted sheet"),
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
      ...finalFieldsFor("sew-button", catalog.skill),
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

  const defaults = finalFieldsFor(null, skill);
  const finalFlaws = Array.isArray(raw.final_common_flaws)
    ? raw.final_common_flaws.map((item) => clip(item, 160)).filter(Boolean).slice(0, 3)
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
    final_success_criteria:
      clip(raw.final_success_criteria, 400) || defaults.final_success_criteria,
    final_common_flaws:
      finalFlaws.length > 0 ? finalFlaws : defaults.final_common_flaws,
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
      final_success_criteria:
        "Cooked flatbreads show browned spots on both sides and sit stacked or beside the skillet, looking set rather than raw dough.",
      final_common_flaws: [
        "dough is still pale and raw-looking",
        "bread is burnt black",
        "only uncooked dough rounds are shown",
      ],
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

function backfillFinalFields(lesson) {
  if (lesson.final_success_criteria && Array.isArray(lesson.final_common_flaws)
    && lesson.final_common_flaws.length > 0) {
    return false;
  }
  const finals = finalFieldsFor(lesson.id, lesson.skill);
  if (!lesson.final_success_criteria) {
    lesson.final_success_criteria = finals.final_success_criteria;
  }
  if (!Array.isArray(lesson.final_common_flaws) || lesson.final_common_flaws.length === 0) {
    lesson.final_common_flaws = finals.final_common_flaws;
  }
  return true;
}

loadStore();
let seeded = false;
for (const lesson of seedFromCurriculum()) {
  if (!lessons.has(lesson.id)) {
    lessons.set(lesson.id, lesson);
    seeded = true;
  }
}
let backfilled = false;
for (const lesson of lessons.values()) {
  if (backfillFinalFields(lesson)) backfilled = true;
}
if (seeded || backfilled || !fs.existsSync(storePath)) persist();
