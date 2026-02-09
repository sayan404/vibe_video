import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleGenAI } from "@google/genai";
import { normalizeToNoTex } from "../utils/manim.js";

export interface RefinementOptions {
    apiKey?: string;
    model?: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROMPT_PATH = path.join(__dirname, "prompts", "videoRefinement.prompt.txt");

export async function runVideoRefinement(
    currentCode: string,
    userPrompt: string,
    storyboard: any,
    videoPath?: string,
    lastError?: string,
    options: RefinementOptions = {}
): Promise<string> {
    const apiKey = options.apiKey ?? process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

    const model = options.model ?? process.env.GEMINI_MODEL ?? "gemini-3-pro-preview";
    const ai = new GoogleGenAI({ apiKey });

    const template = await readFile(PROMPT_PATH, "utf-8");
    const errorContext = lastError
        ? `\nPREVIOUS ERROR (Please fix this in the modified code):\n\`\`\`\n${lastError}\n\`\`\`\n`
        : "";

    const fullTextPrompt = template
        .replace("{{currentCode}}", currentCode)
        .replace("{{userPrompt}}", userPrompt)
        .replace("{{storyboardJson}}", JSON.stringify(storyboard, null, 2))
        .replace("{{lastError}}", errorContext);

    console.log(`[VideoRefinement] Prompting AI for changes: "${userPrompt}"`);

    const contents: any[] = [{ text: fullTextPrompt }];

    // If a video is provided, attach it as inlineData
    if (videoPath) {
        try {
            const videoBuffer = await readFile(videoPath);
            const videoBase64 = videoBuffer.toString("base64");
            contents.push({
                inlineData: {
                    mimeType: "video/mp4",
                    data: videoBase64
                }
            });
            console.log(`[VideoRefinement] Attached video for context: ${videoPath}`);
        } catch (e) {
            console.warn(`[VideoRefinement] Failed to read video file: ${videoPath}. Proceeding with text only.`);
        }
    }

    const resp = await ai.models.generateContent({
        model,
        contents: [{ role: "user", parts: contents }]
    });

    const parts = resp.candidates?.[0]?.content?.parts ?? [];
    let modelText = parts.map((p: any) => p.text).filter(Boolean).join("").trim();

    // Strip code fences if the model ignored the instructions
    if (modelText.startsWith("```")) {
        modelText = modelText.replace(/^```[a-zA-Z0-9_-]*\s*/m, "").replace(/```$/m, "").trim();
    }

    return normalizeToNoTex(modelText);
}
