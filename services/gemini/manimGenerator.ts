import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { StoryboardOutputSchema, type StoryboardOutput } from "../nanobanana/storyboard.js";

/**
 * Phase 3: Manim Code Generator (Gemini 3)
 *
 * Input:
 * - Storyboard JSON array from Phase 2 (validated)
 *
 * Output:
 * - Fully executable Python Manim script (string)
 *
 * Guarantees (deterministic checks):
 * - Each frame maps to a `# Frame N: ...` comment
 * - Each frame includes a literal `self.wait(durationSeconds)` matching the storyboard duration
 */

export const ManimGeneratorInputSchema = StoryboardOutputSchema;
export type ManimGeneratorInput = StoryboardOutput;

export const ManimGeneratorOutputSchema = z.string().min(1);
export type ManimGeneratorOutput = z.infer<typeof ManimGeneratorOutputSchema>;

export interface ManimGeneratorOptions {
  /**
   * Defaults to process.env.GEMINI_API_KEY.
   */
  apiKey?: string;
  /**
   * Defaults to "gemini-2.0-flash" for local testing.
   * Set GEMINI_MODEL="gemini-3-pro-preview" when you have Gemini 3 quota enabled.
   * Override via process.env.GEMINI_MODEL if desired.
   */
  model?: string;
  /**
   * Prompt template path. Defaults to the prompt file next to this module.
   */
  promptTemplatePath?: string;
  /**
   * Where to save the generated python file.
   * Defaults to "python/manim_renderer/storyboard_scene.py".
   */
  outputPath?: string;
  /**
   * Abort signal for request cancellation/timeouts (caller-owned).
   */
  signal?: AbortSignal;
  /**
   * Maximum number of retry attempts if validation fails.
   * Defaults to 3.
   */
  maxRetries?: number;
}

async function loadPromptTemplate(path: string): Promise<string> {
  return await readFile(path, "utf-8");
}

function defaultPromptPath(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  return path.join(__dirname, "prompts", "manimGenerator.prompt.txt");
}

function fillTemplate(template: string, storyboard: ManimGeneratorInput): string {
  return template.replaceAll("{{storyboardJson}}", JSON.stringify(storyboard, null, 2));
}

function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith("```")) return trimmed;
  return trimmed.replace(/^```[a-zA-Z0-9_-]*\s*/m, "").replace(/```$/m, "").trim();
}

function collectFrameMappingErrors(script: string, storyboard: ManimGeneratorInput): string[] {
  const errors: string[] = [];
  for (const frame of storyboard) {
    const required = `# Frame ${frame.frameId}: ${frame.sceneTitle}`;
    if (!script.includes(required)) {
      errors.push(`Missing comment: ${required}`);
    }
  }
  return errors;
}

function formatDurationLiteral(seconds: number): string {
  // Match as written in storyboard (allow integer or decimal); keep stable string.
  return Number.isInteger(seconds) ? String(seconds) : String(seconds);
}

function collectFrameDurationErrors(script: string, storyboard: ManimGeneratorInput): string[] {
  const errors: string[] = [];
  for (const frame of storyboard) {
    const dur = formatDurationLiteral(frame.durationSeconds);
    const required = `self.wait(${dur})`;
    if (!script.includes(required)) {
      errors.push(`Missing wait statement for Frame ${frame.frameId}: ${required}`);
    }
  }
  return errors;
}

function collectImprovisationErrors(script: string): string[] {
  const errors: string[] = [];
  const banned = ["```", "```python", "```py", "```text", "<html", "</"];
  for (const marker of banned) {
    if (script.toLowerCase().includes(marker.toLowerCase())) {
      errors.push(`Disallowed marker found: ${marker}`);
    }
  }
  return errors;
}

function validateScript(script: string, storyboard: ManimGeneratorInput): string[] {
  const allErrors: string[] = [];
  allErrors.push(...collectImprovisationErrors(script));
  allErrors.push(...collectFrameMappingErrors(script, storyboard));
  allErrors.push(...collectFrameDurationErrors(script, storyboard));
  return allErrors;
}

function buildValidationFeedback(errors: string[]): string {
  return `
PREVIOUS ATTEMPT FAILED - The generated script has the following validation errors:

${errors.map((e, i) => `${i + 1}. ${e}`).join('\n')}

Please fix ALL of these issues and regenerate the COMPLETE Python script.
Remember:
- Every frame MUST have the exact comment format: # Frame <frameId>: <sceneTitle>
- Every frame MUST have the exact wait statement: self.wait(<durationSeconds>)
- Do NOT include markdown code fences or HTML tags
- Output ONLY the Python code, nothing else
`;
}

async function ensureParentDir(path: string): Promise<void> {
  const parts = path.replaceAll("\\", "/").split("/");
  parts.pop(); // file
  const dir = parts.join("/");
  if (!dir) return;
  await mkdir(dir, { recursive: true });
}

/**
 * Generate a Manim script with Gemini 3 from a storyboard, validate the mapping constraints,
 * and save it to python/manim_renderer/.
 */
export async function runManimCodeGenerator(
  rawStoryboard: unknown,
  options: ManimGeneratorOptions = {}
): Promise<{ pythonScript: string; savedTo: string }> {
  const storyboard = ManimGeneratorInputSchema.parse(rawStoryboard);

  const apiKey = options.apiKey ?? process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY (or options.apiKey).");
  }

  const model = options.model ?? process.env.GEMINI_MODEL ?? "gemini-3-pro-preview";
  const promptTemplatePath = options.promptTemplatePath ?? defaultPromptPath();
  const outputPath =
    options.outputPath ?? "python/manim_renderer/storyboard_scene.py";
  const maxRetries = options.maxRetries ?? 3;

  const template = await loadPromptTemplate(promptTemplatePath);
  let currentPrompt = fillTemplate(template, storyboard);

  const ai = new GoogleGenAI({ apiKey });

  let lastErrors: string[] = [];
  let script: string | null = null;

  // Retry loop with validation feedback
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`[ManimGenerator] Attempt ${attempt}/${maxRetries}...`);

    const resp = await ai.models.generateContent({
      model,
      contents: currentPrompt
    });

    const parts = resp.candidates?.[0]?.content?.parts ?? [];
    const modelText = parts.map((p) => p.text).filter(Boolean).join("").trim();
    if (!modelText) {
      console.warn(`[ManimGenerator] Attempt ${attempt}: Empty response from Gemini`);
      continue;
    }

    script = ManimGeneratorOutputSchema.parse(stripCodeFences(modelText));

    // Validate the generated script
    const errors = validateScript(script, storyboard);

    if (errors.length === 0) {
      console.log(`[ManimGenerator] ✓ Validation passed on attempt ${attempt}`);
      break;
    }

    lastErrors = errors;
    console.warn(`[ManimGenerator] Attempt ${attempt} failed validation with ${errors.length} error(s):`);
    errors.forEach((e, i) => console.warn(`  ${i + 1}. ${e}`));

    if (attempt < maxRetries) {
      // Provide feedback for next attempt
      const feedback = buildValidationFeedback(errors);
      currentPrompt = fillTemplate(template, storyboard) + feedback;
    }
  }

  // If we still have errors after all retries, throw
  if (lastErrors.length > 0) {
    throw new Error(
      `MANIM_SCRIPT_VALIDATION_FAILED after ${maxRetries} attempts:\n${lastErrors.join('\n')}`
    );
  }

  if (!script) {
    throw new Error("Failed to generate valid Manim script after all retry attempts.");
  }

  await ensureParentDir(outputPath);
  await writeFile(outputPath, script, "utf-8");

  return { pythonScript: script, savedTo: outputPath };
}

