import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleGenAI } from "@google/genai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import { z } from "zod";
import {
  StoryboardOutputSchema,
  type StoryboardOutput
} from "../nanobanana/storyboard.js";
import { RenderMetadataSchema, type RenderMetadata } from "../pipeline/render.js";

/**
 * Phase 5: Video Critique Engine (Gemini 3)
 *
 * Input:
 * - storyboard (Phase 2 output): validated
 * - renderMetadata (Phase 4 output): validated
 * - manimCode: python script (string)
 *
 * Output:
 * - STRICT JSON critique report (validated)
 *
 * Rules:
 * - Pure analysis: no code changes
 * - Must reference valid frame IDs
 */

export const VideoCritiqueInputSchema = z
  .object({
    storyboard: StoryboardOutputSchema,
    renderMetadata: RenderMetadataSchema,
    manimCode: z.string().min(1),
    videoPath: z.string().min(1)
  })
  .strict();

export type VideoCritiqueInput = z.infer<typeof VideoCritiqueInputSchema>;

export const VideoCritiqueOutputSchema = z
  .object({
    issues: z.array(
      z
        .object({
          frameId: z.number().int().positive(),
          type: z.enum(["timing", "clarity", "visual", "pedagogical"]),
          description: z.string().min(1),
          severity: z.enum(["low", "medium", "high"]),
          suggestedFix: z.string().min(1)
        })
        .strict()
    )
  })
  .strict();

export type VideoCritiqueOutput = z.infer<typeof VideoCritiqueOutputSchema>;

export interface VideoCritiqueOptions {
  apiKey?: string; // defaults to process.env.GEMINI_API_KEY
  model?: string; // defaults to "gemini-2.0-flash" (or process.env.GEMINI_MODEL)
  promptTemplatePath?: string; // defaults to the prompt file next to this module
  debugPath?: string; // Optional path to log the generated prompt for debugging
  signal?: AbortSignal;
}

async function loadPromptTemplate(path: string): Promise<string> {
  return await readFile(path, "utf-8");
}

function defaultPromptPath(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  return path.join(__dirname, "prompts", "critique.prompt.txt");
}

function fillTemplate(
  template: string,
  input: VideoCritiqueInput
): string {
  // Embed JSON verbatim so the model cannot “reinterpret” structure.
  return template.replace(
    "INPUT:",
    `INPUT:\n\nstoryboard:\n${JSON.stringify(input.storyboard, null, 2)}\n\nrenderMetadata:\n${JSON.stringify(
      input.renderMetadata,
      null,
      2
    )}\n\nmanimCode:\n${input.manimCode}\n\n`
  );
}

function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith("```")) return trimmed;
  return trimmed.replace(/^```[a-zA-Z0-9_-]*\s*/m, "").replace(/```$/m, "").trim();
}

function parseStrictJson(text: string): unknown {
  return JSON.parse(stripCodeFences(text));
}

function assertIssueFrameIdsExist(
  storyboard: StoryboardOutput,
  output: VideoCritiqueOutput
): void {
  const valid = new Set<number>(storyboard.map((f) => f.frameId));
  const bad = output.issues.filter((i) => !valid.has(i.frameId));
  if (bad.length > 0) {
    throw new Error(
      `CRITIQUE_INVALID_FRAME_ID: issues reference unknown frameId(s): ${bad
        .map((b) => b.frameId)
        .join(", ")}`
    );
  }
}

/**
 * Runs video critique using Gemini 3 and returns a validated result.
 *
 * Environment variables:
 * - GEMINI_API_KEY: required unless provided in options
 * - GEMINI_MODEL: optional override (defaults to "gemini-3")
 */
export async function runVideoCritique(
  rawInput: unknown,
  options: VideoCritiqueOptions = {}
): Promise<VideoCritiqueOutput> {
  const input = VideoCritiqueInputSchema.parse(rawInput);

  const apiKey = options.apiKey ?? process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY (or options.apiKey).");

  const model = options.model ?? process.env.GEMINI_MODEL ?? "gemini-3-pro-preview";
  const promptTemplatePath = options.promptTemplatePath ?? defaultPromptPath();

  const template = await loadPromptTemplate(promptTemplatePath);
  const prompt = fillTemplate(template, input);

  if (options.debugPath) {
    const debugContent = `--- TEMPLATE ---\n${template}\n\n--- FINAL PROMPT ---\n${prompt}`;
    await writeFile(options.debugPath, debugContent, "utf-8");
  }

  const ai = new GoogleGenAI({ apiKey });
  const fileManager = new GoogleAIFileManager(apiKey);

  console.log(`[VideoCritique] Uploading video: ${input.videoPath}`);
  const uploadResult = await fileManager.uploadFile(input.videoPath, {
    mimeType: "video/mp4",
    displayName: "Rendered Animation"
  });

  // Wait for file to be ready (minimal wait, Gemini 3 usually fast)
  let file = await fileManager.getFile(uploadResult.file.name);
  while (file.state === "PROCESSING") {
    process.stdout.write(".");
    await new Promise((resolve) => setTimeout(resolve, 2000));
    file = await fileManager.getFile(uploadResult.file.name);
  }
  if (file.state === "FAILED") throw new Error("Video processing failed.");
  console.log("\n[VideoCritique] Video ready for analysis.");

  const resp = await ai.models.generateContent({
    model,
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          {
            fileData: {
              mimeType: file.mimeType,
              fileUri: file.uri
            }
          }
        ]
      }
    ]
  });

  const parts = resp.candidates?.[0]?.content?.parts ?? [];
  const modelText = parts.map((p) => p.text).filter(Boolean).join("").trim();
  if (!modelText) throw new Error("Gemini response missing text content.");

  const parsed = parseStrictJson(modelText);
  const output = VideoCritiqueOutputSchema.parse(parsed);
  assertIssueFrameIdsExist(input.storyboard, output);
  return output;
}

