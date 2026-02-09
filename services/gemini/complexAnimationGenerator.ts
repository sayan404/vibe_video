/**
 * Phase 3.5: Complex Animation Generator
 *
 * Purpose: Identify complex scenes from the storyboard and generate standalone
 * Manim animation snippets for them. These snippets are passed as context to
 * Phase 3 to simplify the main code generation.
 *
 * Input:
 * - Storyboard JSON array from Phase 2
 *
 * Output:
 * - Array of { frameId, snippet } for complex scenes
 */

import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { readFile, writeFile } from "node:fs/promises";
import { StoryboardOutputSchema, type StoryboardOutput, type StoryboardFrame } from "../nanobanana/storyboard.js";
import { normalizeToNoTex } from "../utils/manim.js";

// Schema for identifying complex scenes
export const ComplexSceneIdentificationSchema = z.object({
    frameId: z.number().int().positive(),
    complexityReason: z.string().min(1),
    suggestedApproach: z.string().min(1)
}).strict();

export type ComplexSceneIdentification = z.infer<typeof ComplexSceneIdentificationSchema>;

// Schema for a generated snippet
export const AnimationSnippetSchema = z.object({
    frameId: z.number().int().positive(),
    sceneTitle: z.string().min(1),
    manimSnippet: z.string().min(1),
    usageNotes: z.string().min(1)
}).strict();

export type AnimationSnippet = z.infer<typeof AnimationSnippetSchema>;

export const ComplexAnimationOutputSchema = z.array(AnimationSnippetSchema);
export type ComplexAnimationOutput = z.infer<typeof ComplexAnimationOutputSchema>;

export interface ComplexAnimationOptions {
    apiKey?: string;
    model?: string;
    outputPath?: string;
    signal?: AbortSignal;
}


/**
 * Load an image file and convert to base64 for Gemini multimodal input
 */
async function loadImageAsBase64(imagePath: string): Promise<{ data: string; mimeType: string } | null> {
    try {
        const buffer = await readFile(imagePath);
        const data = buffer.toString("base64");

        const ext = imagePath.toLowerCase().split(".").pop();
        let mimeType = "image/png";
        if (ext === "jpg" || ext === "jpeg") mimeType = "image/jpeg";
        else if (ext === "webp") mimeType = "image/webp";
        else if (ext === "gif") mimeType = "image/gif";

        return { data, mimeType };
    } catch (e) {
        console.warn(`[ComplexAnimationGenerator] Failed to load image: ${imagePath}`, e);
        return null;
    }
}

function buildSnippetPrompt(frame: StoryboardFrame): string {
    return `You are a Manim expert. Generate a STANDALONE, REUSABLE Manim code snippet for the following frame.

**FRAME CONTEXT:**
- Frame ID: ${frame.frameId}
- Scene Title: ${frame.sceneTitle}
- Visual Elements: ${frame.visualElements.join(", ")}
- On-Screen Text: ${frame.onScreenText.join(", ") || "(none)"}
- Animation Intent: ${frame.animationIntent}
- Duration: ${frame.durationSeconds} seconds

**REQUIREMENTS:**
1. Output ONLY valid Python Manim code (no markdown, no explanations)
2. Create a helper function or method named \`frame_${frame.frameId}\` that takes \`self\` as an argument.
3. Incorporate the visual elements and labels described.
4. If an image is provided, use it as the primary layout and composition reference.
5. Include the \`self.wait(${frame.durationSeconds})\` call at the end of the helper.
6. DO NOT use LaTeX/MathTex - use \`Text()\` only for all text.
7. Use descriptive variable names and basic inline comments.

**OUTPUT FORMAT:**
Return ONLY the Python code for the helper function. No markdown fences.
`;
}

function stripCodeFences(text: string): string {
    const trimmed = text.trim();
    if (!trimmed.startsWith("```")) return trimmed;
    return trimmed.replace(/^```[a-zA-Z0-9_-]*\s*/m, "").replace(/```$/m, "").trim();
}

export async function runComplexAnimationGenerator(
    rawStoryboard: unknown,
    options: ComplexAnimationOptions = {}
): Promise<ComplexAnimationOutput> {
    const storyboard = StoryboardOutputSchema.parse(rawStoryboard);

    const apiKey = options.apiKey ?? process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("Missing GEMINI_API_KEY (or options.apiKey).");
    }

    const model = options.model ?? process.env.GEMINI_MODEL ?? "gemini-3-pro-preview";

    const ai = new GoogleGenAI({ apiKey });
    const snippets: AnimationSnippet[] = [];

    // Step 2: Generate snippets for EVERY frame
    for (const frame of storyboard) {
        console.log(`[ComplexAnimationGenerator] Generating snippet for Frame ${frame.frameId}...`);

        const textPrompt = buildSnippetPrompt(frame);
        const contents: any[] = [{ text: textPrompt }];

        if (frame.imagePath) {
            const imageData = await loadImageAsBase64(frame.imagePath);
            if (imageData) {
                contents.push({ text: `\n[REFERENCE IMAGE FOR FRAME ${frame.frameId}]\nObserve this layout and recreate it using Manim shapes:` });
                contents.push({
                    inlineData: {
                        mimeType: imageData.mimeType,
                        data: imageData.data
                    }
                });
            }
        }

        try {
            const resp = await ai.models.generateContent({
                model,
                contents: [{ role: "user", parts: contents }]
            });

            const parts = resp.candidates?.[0]?.content?.parts ?? [];
            const modelText = parts.map((p) => p.text).filter(Boolean).join("").trim();

            if (!modelText) {
                console.warn(`[ComplexAnimationGenerator] Empty response for Frame ${frame.frameId}`);
                continue;
            }

            const snippet = normalizeToNoTex(stripCodeFences(modelText));

            snippets.push({
                frameId: frame.frameId,
                sceneTitle: frame.sceneTitle,
                manimSnippet: snippet,
                usageNotes: `Modular snippet for specific frame layout.`
            });

            console.log(`[ComplexAnimationGenerator] ✓ Generated snippet for Frame ${frame.frameId} (${snippet.length} chars)`);
        } catch (err) {
            console.error(`[ComplexAnimationGenerator] Failed to generate snippet for Frame ${frame.frameId}:`, err);
        }
    }

    // Step 3: Save snippets if outputPath provided
    if (options.outputPath && snippets.length > 0) {
        const output = JSON.stringify(snippets, null, 2);
        await writeFile(options.outputPath, output, "utf-8");
        console.log(`[ComplexAnimationGenerator] Saved ${snippets.length} snippet(s) to ${options.outputPath}`);
    }

    return snippets;
}

/**
 * Formats snippets as context for the main Manim generator prompt
 */
export function formatSnippetsAsContext(snippets: ComplexAnimationOutput): string {
    if (snippets.length === 0) return "";

    return `
**PRE-GENERATED ANIMATION SNIPPETS**
The following helper code snippets have been pre-generated for complex scenes.
You SHOULD incorporate these snippets into your main Scene class.
Copy them as helper methods or integrate their logic directly.

${snippets.map(s => `
### SNIPPET FOR FRAME ${s.frameId}: ${s.sceneTitle}
Usage: ${s.usageNotes}

${s.manimSnippet}
`).join("\n")}

**END OF SNIPPETS**
`;
}
