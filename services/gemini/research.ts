import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

/**
 * Phase 1: Topic Research Engine (Gemini 3)
 *
 * Contract:
 * - Input and output are strictly validated at runtime using Zod.
 * - Model output must be STRICT JSON only (no markdown).
 * - No visuals / no animation ideas / no Manim / no assumptions beyond provided inputs.
 */

export const TopicResearchInputSchema = z
  .object({
    topic: z.string().min(1),
    targetAudience: z.enum(["beginner", "intermediate", "advanced"]),
    desiredDurationMinutes: z.number().finite().positive()
  })
  .strict();

export type TopicResearchInput = z.infer<typeof TopicResearchInputSchema>;

export const TopicResearchOutputSchema = z
  .object({
    topicSummary: z.string().min(1),
    learningObjectives: z.array(z.string().min(1)),
    prerequisites: z.array(z.string().min(1)),
    coreConcepts: z.array(
      z
        .object({
          name: z.string().min(1),
          explanation: z.string().min(1),
          importance: z.string().min(1)
        })
        .strict()
    ),
    commonMisconceptions: z.array(z.string().min(1)),
    realWorldIntuition: z.string().min(1),
    recommendedFlow: z.array(z.string().min(1))
  })
  .strict();

export type TopicResearchOutput = z.infer<typeof TopicResearchOutputSchema>;

export interface TopicResearchOptions {
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
   * Absolute path to prompt template.
   * Defaults to the prompt file next to this module.
   */
  promptTemplatePath?: string;
  /**
   * Abort signal for request cancellation/timeouts (caller-owned).
   */
  signal?: AbortSignal;
}

function fillTemplate(template: string, input: TopicResearchInput): string {
  return template
    .replaceAll("{{topic}}", input.topic)
    .replaceAll("{{targetAudience}}", input.targetAudience)
    .replaceAll("{{desiredDurationMinutes}}", String(input.desiredDurationMinutes));
}

function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith("```")) return trimmed;
  // Remove leading ```lang? and trailing ```
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
  return path.join(__dirname, "prompts", "research.prompt.txt");
}

/**
 * Runs topic research using Gemini 3 and returns a validated result.
 *
 * Environment variables:
 * - GEMINI_API_KEY: required unless provided in options
 * - GEMINI_MODEL: optional override (defaults to "gemini-3")
 */
export async function runTopicResearch(
  rawInput: unknown,
  options: TopicResearchOptions = {}
): Promise<TopicResearchOutput> {
  const input = TopicResearchInputSchema.parse(rawInput);

  const apiKey = options.apiKey ?? process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY (or options.apiKey).");
  }

  const model = options.model ?? process.env.GEMINI_MODEL ?? "gemini-3-pro-preview";
  const promptTemplatePath = options.promptTemplatePath ?? defaultPromptPath();

  const template = await loadPromptTemplate(promptTemplatePath);
  const prompt = fillTemplate(template, input);

  const ai = new GoogleGenAI({ apiKey, httpOptions: { apiVersion: "v1beta" } });
  const resp = await ai.models.generateContent({
    model,
    contents: prompt
  });

  const parts = resp.candidates?.[0]?.content?.parts ?? [];
  const modelText = parts.map((p) => p.text).filter(Boolean).join("").trim();
  if (!modelText) throw new Error("Gemini response missing text content.");

  const parsed = parseStrictJson(modelText);
  return TopicResearchOutputSchema.parse(parsed);
}

