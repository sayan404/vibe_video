import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

export const RepairOutputSchema = z
    .object({
        fixedCode: z.string().min(1),
        explanation: z.string()
    })
    .strict();

export type RepairOutput = z.infer<typeof RepairOutputSchema>;

export interface RepairOptions {
    apiKey?: string;
    model?: string;
    promptTemplatePath?: string;
}

async function loadPromptTemplate(path: string): Promise<string> {
    return await readFile(path, "utf-8");
}

function defaultPromptPath(): string {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    return path.join(__dirname, "prompts", "repair.prompt.txt");
}

function fillTemplate(template: string, code: string, errorLog: string): string {
    return template
        .replaceAll("{{brokenCode}}", code)
        .replaceAll("{{errorLog}}", errorLog);
}

function stripCodeFences(text: string): string {
    const trimmed = text.trim();
    if (!trimmed.startsWith("```")) return trimmed;
    // Remove opening fence (e.g., ```json)
    const withoutOpening = trimmed.replace(/^```[a-zA-Z0-9_-]*\s*/m, "");
    // Remove closing fence
    return withoutOpening.replace(/```$/m, "").trim();
}

export async function runRepairEngine(
    brokenCode: string,
    errorLog: string,
    options: RepairOptions = {}
): Promise<RepairOutput> {
    const apiKey = options.apiKey ?? process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("Missing GEMINI_API_KEY.");

    const model = options.model ?? process.env.GEMINI_MODEL ?? "gemini-2.0-flash-exp";
    // Use a fast/smart model for repairs. Flash is usually good for syntax fixes.

    const promptTemplatePath = options.promptTemplatePath ?? defaultPromptPath();
    const template = await loadPromptTemplate(promptTemplatePath);
    const prompt = fillTemplate(template, brokenCode, errorLog);

    const ai = new GoogleGenAI({ apiKey });

    const responseJsonSchema = {
        type: "object",
        properties: {
            fixedCode: { type: "string" },
            explanation: { type: "string" }
        },
        required: ["fixedCode", "explanation"]
    } as const;

    console.log("[RepairEngine] Attempting to fix code with Gemini...");

    const resp = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
            temperature: 0.1,
            responseMimeType: "application/json",
            responseJsonSchema
        }
    });

    const text = resp.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Repair engine returned empty response.");

    try {
        const clean = stripCodeFences(text);
        const parsed = JSON.parse(clean);
        return RepairOutputSchema.parse(parsed);
    } catch (e) {
        throw new Error(`Failed to parse repair response: ${e instanceof Error ? e.message : String(e)}`);
    }
}
