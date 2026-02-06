import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { TopicResearchOutputSchema, type TopicResearchOutput } from "../gemini/research.js";

/**
 * Phase 2: Storyboard Engine (Nano Banana)
 *
 * Contract:
 * - Input is Phase 1 Research JSON (validated with Zod).
 * - Output is STRICT JSON ARRAY (validated with Zod + additional deterministic checks).
 * - No code / no Manim syntax; visuals described in animator-friendly language.
 * - Every learning objective must appear verbatim somewhere in the storyboard.
 */

export const StoryboardInputSchema = TopicResearchOutputSchema;
export type StoryboardInput = TopicResearchOutput;

export const StoryboardFrameSchema = z
  .object({
    frameId: z.number().int().positive(),
    sceneTitle: z.string().min(1),
    visualElements: z.array(z.string().min(1)).nonempty(),
    onScreenText: z.array(z.string().min(1)),
    animationIntent: z.string().min(1),
    voiceoverScript: z.string().min(1),
    durationSeconds: z.number().finite().positive(),
    /**
     * Optional file path to a generated image for this frame.
     * This is added deterministically by the service after image generation.
     */
    imagePath: z.string().min(1).optional()
  })
  .strict();

export type StoryboardFrame = z.infer<typeof StoryboardFrameSchema>;

export const StoryboardOutputSchema = z
  .array(StoryboardFrameSchema)
  .nonempty()
  .superRefine((frames, ctx) => {
    // Ordered frames: frameId must be 1..N strictly increasing by 1.
    for (let i = 0; i < frames.length; i++) {
      const expected = i + 1;
      if (frames[i]?.frameId !== expected) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `frames must have contiguous frameId starting at 1; expected frameId=${expected} at index=${i}`,
          path: [i, "frameId"]
        });
        break;
      }
    }
  });

export type StoryboardOutput = z.infer<typeof StoryboardOutputSchema>;

export interface StoryboardOptions {
  /**
   * Gemini API key to use.
   * Defaults to process.env.GEMINI_API_KEY.
   */
  apiKey?: string;
  /**
   * Text model used to generate the storyboard JSON.
   * Defaults to process.env.GEMINI_MODEL (or "gemini-2.5-flash").
   */
  reasoningModel?: string;
  /**
   * Image model used to generate per-frame images.
   * Defaults to process.env.NANOBANANA_MODEL (or "gemini-2.5-flash-image").
   */
  imageModel?: string;
  /**
   * Prompt template path. Defaults to "services/nanobanana/prompts/storyboard.prompt.txt".
   */
  promptTemplatePath?: string;
  /**
   * Where generated frame images should be written.
   * If provided, one image per frame is generated and saved as "frame-<id>.png".
   */
  imageOutputDir?: string;
  /**
   * Abort signal for request cancellation/timeouts (caller-owned).
   */
  signal?: AbortSignal;
}

function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith("```")) return trimmed;
  return trimmed.replace(/^```[a-zA-Z0-9_-]*\s*/m, "").replace(/```$/m, "").trim();
}

function parseStrictJson(text: string): unknown {
  const cleaned = stripCodeFences(text);
  return JSON.parse(cleaned);
}

async function loadPromptTemplate(path: string): Promise<string> {
  return await readFile(path, "utf-8");
}

function defaultPromptPath(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  return path.join(__dirname, "prompts", "storyboard.prompt.txt");
}

function fillTemplate(template: string, research: StoryboardInput): string {
  return template.replaceAll("{{researchJson}}", JSON.stringify(research, null, 2));
}

function assertObjectiveCoverage(input: StoryboardInput, output: StoryboardOutput): void {
  // Deterministic interpretation: each objective string must appear verbatim somewhere in the storyboard output.
  const corpus = output
    .map((f) =>
      [
        f.sceneTitle,
        f.animationIntent,
        f.voiceoverScript,
        ...f.visualElements,
        ...f.onScreenText
      ].join("\n")
    )
    .join("\n");

  const missing = input.learningObjectives.filter((obj: string) => !corpus.includes(obj));
  if (missing.length > 0) {
    throw new Error(
      `OBJECTIVE_COVERAGE_FAILED: the following learningObjectives were not found verbatim in storyboard output: ${missing.join(
        " | "
      )}`
    );
  }
}

function assertNoManimOrCode(output: StoryboardOutput): void {
  const corpus = output
    .map((f) =>
      [
        f.sceneTitle,
        f.animationIntent,
        f.voiceoverScript,
        ...f.visualElements,
        ...f.onScreenText
      ].join("\n")
    )
    .join("\n");

  // Only block *actual code markers*, not normal English words like "from".
  const codePatterns: Array<{ name: string; re: RegExp }> = [
    { name: "markdown_fence", re: /```/ },
    { name: "python_import", re: /^\s*import\s+\S+/m },
    { name: "python_from_import", re: /^\s*from\s+\S+\s+import\s+\S+/m },
    { name: "python_def", re: /^\s*def\s+\w+\s*\(/m },
    { name: "python_class", re: /^\s*class\s+\w+/m },
    { name: "manim_word", re: /\bmanim\b/i }
  ];

  const hit = codePatterns.find((p) => p.re.test(corpus));
  if (hit) {
    throw new Error(
      `STORYBOARD_POLICY_VIOLATION: output appears to contain disallowed content (${hit.name}).`
    );
  }
}

function enforceObjectiveCoverage(input: StoryboardInput, output: StoryboardOutput): StoryboardOutput {
  // If objectives are missing, deterministically append them verbatim to the last frame's voiceoverScript.
  const corpus = output
    .map((f) =>
      [
        f.sceneTitle,
        f.animationIntent,
        f.voiceoverScript,
        ...f.visualElements,
        ...f.onScreenText
      ].join("\n")
    )
    .join("\n");

  const missing = input.learningObjectives.filter((obj: string) => !corpus.includes(obj));
  if (missing.length === 0) return output;

  const lastIdx = output.length - 1;
  const last = output[lastIdx]!;
  const appended = [last.voiceoverScript, "", ...missing].join("\n").trim();

  const patched = output.map((f, i) => (i === lastIdx ? { ...f, voiceoverScript: appended } : f));
  return StoryboardOutputSchema.parse(patched);
}

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
        inlineData?: { mimeType?: string; data?: string };
      }>;
    };
  }>;
};

async function ensureDir(p: string): Promise<void> {
  await mkdir(p, { recursive: true });
}

function normalizePath(p: string): string {
  return p.replaceAll("\\", "/");
}

function buildFrameImagePrompt(frame: StoryboardFrame): string {
  // Deterministic prompt derived solely from storyboard fields (no new content).
  return [
    "Generate a single 16:9 storyboard-style frame image (clean, readable, flat illustration).",
    "No text artifacts or watermarks beyond what is explicitly listed in onScreenText.",
    "",
    `Scene title: ${frame.sceneTitle}`,
    "",
    "Visual elements (must be depicted):",
    ...frame.visualElements.map((v) => `- ${v}`),
    "",
    "On-screen text (must appear clearly):",
    ...(frame.onScreenText.length ? frame.onScreenText.map((t) => `- ${t}`) : ["- (none)"]),
    "",
    "Animation intent (inform composition/motion feel, but image is a single moment):",
    frame.animationIntent,
    "",
    "Return an IMAGE only."
  ].join("\n");
}

async function geminiGenerate(
  apiKey: string,
  model: string,
  prompt: string,
  signal?: AbortSignal
): Promise<GeminiGenerateContentResponse> {
  const ai = new GoogleGenAI({ apiKey });
  // The SDK response shape aligns with candidates/content/parts; we keep our minimal type.
  return (await ai.models.generateContent({
    model,
    contents: prompt
  })) as unknown as GeminiGenerateContentResponse;
}

function extractFirstText(resp: GeminiGenerateContentResponse): string | null {
  const parts = resp.candidates?.[0]?.content?.parts ?? [];
  for (const p of parts) {
    if (p.text && p.text.trim()) return p.text;
  }
  return null;
}

function extractFirstImage(resp: GeminiGenerateContentResponse): { mimeType: string; dataB64: string } | null {
  const parts = resp.candidates?.[0]?.content?.parts ?? [];
  for (const p of parts) {
    const mimeType = p.inlineData?.mimeType;
    const data = p.inlineData?.data;
    if (mimeType && data) return { mimeType, dataB64: data };
  }
  return null;
}

function extForMime(mimeType: string): string {
  const m = mimeType.toLowerCase();
  if (m.includes("png")) return ".png";
  if (m.includes("jpeg") || m.includes("jpg")) return ".jpg";
  if (m.includes("webp")) return ".webp";
  // default
  return ".png";
}

/**
 * Runs storyboard generation using Nano Banana (Gemini native image model) and returns a validated result.
 *
 * Environment variables:
 * - GEMINI_API_KEY: required unless provided in options
 * - NANOBANANA_MODEL: optional override (defaults to "gemini-2.5-flash-image")
 */
export async function runStoryboardEngine(
  rawResearchInput: unknown,
  options: StoryboardOptions = {}
): Promise<StoryboardOutput> {
  const research = StoryboardInputSchema.parse(rawResearchInput);

  const apiKey = options.apiKey ?? process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY (or options.apiKey).");
  }

  // Respect the pipeline's model authority:
  // - Storyboard JSON generation uses NANOBANANA_REASONING_MODEL (Gemini 3 reasoning)
  // - Image generation uses NANOBANANA_MODEL (Gemini native image model)
  const reasoningModel =
    options.reasoningModel ??
    process.env.NANOBANANA_REASONING_MODEL ??
    process.env.GEMINI_MODEL ??
    "gemini-3-pro-preview";

  const imageModel =
    options.imageModel ??
    process.env.NANOBANANA_MODEL ??
    process.env.NANOBANANA_IMAGE_MODEL ??
    "gemini-3-pro-image-preview";


  const promptTemplatePath = options.promptTemplatePath ?? defaultPromptPath();

  const template = await loadPromptTemplate(promptTemplatePath);
  const prompt = fillTemplate(template, research);

  // 1. Generate Storyboard JSON (Reasoning)
  const storyboardResp = await geminiGenerate(apiKey, reasoningModel, prompt, options.signal);
  const storyboardText = extractFirstText(storyboardResp);
  if (!storyboardText) {
    throw new Error("Nano Banana (Gemini image model) response missing storyboard text.");
  }

  const parsed = parseStrictJson(storyboardText);
  let storyboard = StoryboardOutputSchema.parse(parsed);

  // Deterministic policy checks (with deterministic repair for objective coverage)
  storyboard = enforceObjectiveCoverage(research, storyboard);
  assertObjectiveCoverage(research, storyboard);
  assertNoManimOrCode(storyboard);

  // Option B: generate an image per frame and attach imagePath.
  if (options.imageOutputDir) {
    await ensureDir(options.imageOutputDir);

    const withImages: StoryboardFrame[] = [];
    for (const frame of storyboard) {
      const imagePrompt = buildFrameImagePrompt(frame);
      // 2. Generate Images (Visual)
      const imgResp = await geminiGenerate(apiKey, imageModel, imagePrompt, options.signal);
      const img = extractFirstImage(imgResp);
      if (!img) {
        const hint =
          imageModel.toLowerCase().includes("image")
            ? ""
            : ` (hint: set NANOBANANA_MODEL to an image model like "gemini-2.5-flash-image")`;
        throw new Error(
          `Nano Banana image response missing inline image data for frameId=${frame.frameId} using model=${imageModel}.${hint}`
        );
      }

      const ext = extForMime(img.mimeType);
      const filename = `frame-${frame.frameId}${ext}`;
      const absPath = path.join(options.imageOutputDir, filename);
      const buf = Buffer.from(img.dataB64, "base64");
      await writeFile(absPath, buf);

      withImages.push({
        ...frame,
        imagePath: normalizePath(absPath)
      });
    }

    storyboard = StoryboardOutputSchema.parse(withImages);
  }

  return storyboard;
}

