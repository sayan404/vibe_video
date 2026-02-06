import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { createTwoFilesPatch } from "diff";
import { VideoCritiqueOutputSchema, type VideoCritiqueOutput } from "../critique/critique.js";
import { StoryboardOutputSchema } from "../nanobanana/storyboard.js";

export const IterationInputSchema = z
  .object({
    originalManimCode: z.string().min(1),
    critique: VideoCritiqueOutputSchema,
    storyboard: StoryboardOutputSchema
  })
  .strict();

export type IterationInput = z.infer<typeof IterationInputSchema>;

export const IterationOutputSchema = z
  .object({
    updatedCode: z.string().min(1),
    changeLog: z.array(z.string().min(1))
  })
  .strict();

export type IterationOutput = z.infer<typeof IterationOutputSchema>;

export interface IterationOptions {
  apiKey?: string; // defaults to process.env.GEMINI_API_KEY
  model?: string; // defaults to "gemini-2.0-flash" (or process.env.GEMINI_MODEL)
  promptTemplatePath?: string; // defaults to the prompt file next to this module
  /**
   * If provided, safety-validated code will be written here.
   * This is the "overwrite" target (caller controls which file).
   */
  outputPath?: string;
  /**
   * Optional: also emit a unified diff string (returned in result).
   */
  includeDiff?: boolean;
  /**
   * Maximum number of retry attempts if safety validation fails.
   * Defaults to 3.
   */
  maxRetries?: number;
  signal?: AbortSignal;
}

async function loadPromptTemplate(path: string): Promise<string> {
  return await readFile(path, "utf-8");
}

function defaultPromptPath(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  return path.join(__dirname, "prompts", "refine.prompt.txt");
}

function fillTemplate(template: string, input: IterationInput): string {
  const frameDescriptions = input.storyboard.map((f) => {
    return `Frame ${f.frameId}:
- Title: ${f.sceneTitle}
- Visuals: ${f.visualElements.join(", ")}
- Text: ${f.onScreenText.join(", ")}
- Intent: ${f.animationIntent}`;
  }).join("\n\n");

  return template
    .replaceAll("{{originalManimCode}}", input.originalManimCode)
    .replaceAll("{{critiqueJson}}", JSON.stringify(input.critique, null, 2))
    .replaceAll("{{storyboardDescription}}", frameDescriptions);
}

function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith("```")) return trimmed;
  return trimmed.replace(/^```[a-zA-Z0-9_-]*\s*/m, "").replace(/```$/m, "").trim();
}

function extractFirstJsonLikeSubstring(text: string): string | null {
  // Finds the first balanced {...} or [...] block, respecting quoted strings.
  const s = text;
  let start = -1;
  let open = "";
  let close = "";

  for (let i = 0; i < s.length; i++) {
    const ch = s[i]!;
    if (ch === "{" || ch === "[") {
      start = i;
      open = ch;
      close = ch === "{" ? "}" : "]";
      break;
    }
  }
  if (start < 0) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < s.length; i++) {
    const ch = s[i]!;

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === "\"") {
        inString = false;
      }
      continue;
    }

    if (ch === "\"") {
      inString = true;
      continue;
    }

    if (ch === open) depth++;
    if (ch === close) {
      depth--;
      if (depth === 0) {
        return s.slice(start, i + 1);
      }
    }
  }

  return null;
}

function repairCommonJsonIssues(jsonLike: string): string {
  let s = jsonLike;
  // 1) Remove trailing commas (valid in JS, invalid in JSON)
  s = s.replace(/,\s*([}\]])/g, "$1");
  // 2) Quote unquoted object keys (best-effort; safe only when keys are simple identifiers)
  //    NOTE: We intentionally do NOT try to rewrite string quotes or multiline strings.
  s = s.replace(/([{\[,]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:/g, '$1"$2":');
  return s;
}

function fallbackExtractIterationOutput(text: string): unknown | null {
  // Deterministic extraction when the model violates "STRICT JSON only".
  // Strategy:
  // - If the model returns "almost JSON" with an invalid/unterminated updatedCode string,
  //   extract updatedCode via marker scanning (without JSON.parse).
  // - updatedCode: prefer a ```python``` fenced block; else a generic ```...``` block.
  // - changeLog: prefer a JSON array after "changeLog"; else bullet lines.
  const raw = text;

  function isEscapedAt(s: string, quoteIdx: number): boolean {
    // Returns true if s[quoteIdx] is escaped by an odd number of backslashes.
    let backslashes = 0;
    for (let i = quoteIdx - 1; i >= 0 && s[i] === "\\"; i--) backslashes++;
    return backslashes % 2 === 1;
  }

  function lastUnescapedQuoteIndex(s: string): number {
    for (let i = s.length - 1; i >= 0; i--) {
      if (s[i] === "\"" && !isEscapedAt(s, i)) return i;
    }
    return -1;
  }

  // 0) Quasi-JSON marker extraction for updatedCode
  const updatedKey = /"updatedCode"\s*:\s*"/.exec(raw);
  if (updatedKey?.index != null) {
    const start = updatedKey.index + updatedKey[0].length;
    const changeLogMarker = /"changeLog"\s*:\s*/.exec(raw.slice(start));
    const end = changeLogMarker?.index != null ? start + changeLogMarker.index : raw.length;
    const upto = raw.slice(start, end);

    // We intentionally do NOT trust JSON string termination here because unescaped quotes
    // inside Python (e.g. Text("Air")) can corrupt the JSON. Instead, take the whole span
    // and strip only an obvious trailing terminator if present.
    const updatedRaw = upto.replace(/"\s*,?\s*$/m, "").trimEnd();

    if (updatedRaw.length > 0) {
      // If it looks like JSON-escaped newlines, decode minimal escapes.
      const updatedCode = updatedRaw.includes("\\n")
        ? updatedRaw
          .replaceAll("\\\\n", "\n")
          .replaceAll("\\\\t", "\t")
          .replaceAll("\\\\r", "\r")
          .replaceAll('\\\\\"', '"')
          .replaceAll("\\\\", "\\")
          .trim()
        : updatedRaw.trim();

      const tail = changeLogMarker?.index != null ? raw.slice(end) : "";
      if (tail) {
        // Try JSON array for changeLog inside the tail
        const arr = extractFirstJsonLikeSubstring(tail);
        if (arr && arr.trim().startsWith("[")) {
          try {
            const parsed = JSON.parse(repairCommonJsonIssues(arr));
            if (Array.isArray(parsed) && parsed.every((x) => typeof x === "string")) {
              return { updatedCode, changeLog: parsed };
            }
          } catch {
            // fall through
          }
        }

        // Bullet list fallback
        const lines = tail.split(/\r?\n/);
        const bullets: string[] = [];
        for (const l of lines) {
          const m = /^\s*[-*]\s+(.+?)\s*$/.exec(l);
          if (m?.[1]) bullets.push(m[1]);
        }
        const changeLog = bullets.length > 0 ? bullets : ["Refined code based on critique."];
        return { updatedCode, changeLog };
      }

      // changeLog missing/truncated: still return updatedCode so downstream safety checks can run.
      return { updatedCode, changeLog: ["Refined code based on critique."] };
    }
  }

  const fenceRe = /```(?:python|py)?\s*([\s\S]*?)```/i;
  const fence = fenceRe.exec(raw);
  const updatedCode = fence?.[1]?.trim();
  if (!updatedCode) return null;

  // Try JSON array for changeLog
  const idx = raw.toLowerCase().indexOf("changelog");
  if (idx >= 0) {
    const tail = raw.slice(idx);
    const arr = extractFirstJsonLikeSubstring(tail);
    if (arr && arr.trim().startsWith("[")) {
      try {
        const parsed = JSON.parse(repairCommonJsonIssues(arr));
        if (Array.isArray(parsed) && parsed.every((x) => typeof x === "string")) {
          return { updatedCode, changeLog: parsed };
        }
      } catch {
        // fall through to bullets
      }
    }
  }

  // Bullet list fallback
  const lines = raw.split(/\r?\n/);
  const bullets: string[] = [];
  for (const l of lines) {
    const m = /^\s*[-*]\s+(.+?)\s*$/.exec(l);
    if (m?.[1]) bullets.push(m[1]);
  }
  const changeLog = bullets.length > 0 ? bullets : ["Refined code based on critique."];
  return { updatedCode, changeLog };
}

function parseStrictJson(text: string): unknown {
  const cleaned = stripCodeFences(text);
  try {
    return JSON.parse(cleaned);
  } catch {
    // Try extracting the first JSON-ish block and repairing common issues.
    const candidate = extractFirstJsonLikeSubstring(cleaned);
    if (candidate) {
      try {
        return JSON.parse(candidate);
      } catch {
        try {
          return JSON.parse(repairCommonJsonIssues(candidate));
        } catch {
          // fall through
        }
      }
    }

    const fallback = fallbackExtractIterationOutput(cleaned);
    if (fallback) return fallback;

    // Re-throw original parse error (with minimal context)
    throw new SyntaxError(
      `Iteration output was not valid JSON and could not be recovered. First 400 chars:\n${cleaned.slice(0, 400)}`
    );
  }
}

function splitIntoFrameBlocks(code: string): Array<{ frameId: number; headerLine: string; block: string }> {
  const lines = code.split(/\r?\n/);
  const frameHeaderRe = /^\s*#\s*Frame\s+(\d+)\s*:\s*(.+)\s*$/;

  const indices: Array<{ idx: number; frameId: number; headerLine: string }> = [];
  for (let i = 0; i < lines.length; i++) {
    const m = frameHeaderRe.exec(lines[i] ?? "");
    if (m) {
      indices.push({ idx: i, frameId: Number(m[1]), headerLine: lines[i] ?? "" });
    }
  }

  if (indices.length === 0) return [];

  const blocks: Array<{ frameId: number; headerLine: string; block: string }> = [];
  for (let j = 0; j < indices.length; j++) {
    const start = indices[j]!.idx;
    const endExclusive = j + 1 < indices.length ? indices[j + 1]!.idx : lines.length;
    blocks.push({
      frameId: indices[j]!.frameId,
      headerLine: indices[j]!.headerLine,
      block: lines.slice(start, endExclusive).join("\n")
    });
  }
  return blocks;
}

function collectFrameMappingCommentErrors(original: string, updated: string): string[] {
  const errors: string[] = [];
  const orig = splitIntoFrameBlocks(original);
  const next = splitIntoFrameBlocks(updated);

  if (orig.length === 0) {
    errors.push("Original code has no '# Frame N:' markers to preserve.");
    return errors;
  }
  if (next.length !== orig.length) {
    errors.push(`Frame marker count changed (original=${orig.length}, updated=${next.length}).`);
    return errors;
  }

  for (let i = 0; i < orig.length; i++) {
    const a = orig[i]!;
    const b = next[i]!;
    if (a.frameId !== b.frameId) {
      errors.push(`Frame order/id changed at index=${i} (original frameId=${a.frameId}, updated frameId=${b.frameId}).`);
    }
    if (a.headerLine !== b.headerLine) {
      errors.push(`Frame mapping comment changed for frameId=${a.frameId}.`);
    }
  }
  return errors;
}

function normalizeFrameHeaderLinesToOriginal(original: string, updated: string): string {
  // If the model slightly reformats "# Frame N: Title", restore the exact original header lines.
  const origBlocks = splitIntoFrameBlocks(original);
  if (origBlocks.length === 0) return updated;

  const origById = new Map<number, string>();
  for (const b of origBlocks) origById.set(b.frameId, b.headerLine);

  const lines = updated.split(/\r?\n/);
  const tolerantHeaderRe = /^\s*#\s*frame\s*#?\s*(\d+)\b.*$/i;
  for (let i = 0; i < lines.length; i++) {
    const m = tolerantHeaderRe.exec(lines[i] ?? "");
    if (!m) continue;
    const id = Number(m[1]);
    const exact = origById.get(id);
    if (exact) lines[i] = exact;
  }
  return lines.join("\n");
}

function collectUnauthorizedFrameChangeErrors(
  original: string,
  updated: string,
  critique: VideoCritiqueOutput
): string[] {
  const errors: string[] = [];
  const origBlocks = splitIntoFrameBlocks(original);
  const nextBlocks = splitIntoFrameBlocks(updated);

  if (origBlocks.length !== nextBlocks.length) return []; // covered by mapping check

  const critiqued = new Set<number>(critique.issues.map((i) => i.frameId));

  for (let i = 0; i < origBlocks.length; i++) {
    const a = origBlocks[i]!;
    const b = nextBlocks[i]!;
    if (!critiqued.has(a.frameId)) {
      if (a.block !== b.block) {
        errors.push(`Non-critiqued frameId=${a.frameId} was modified but only critiqued frames (${Array.from(critiqued).join(", ")}) should be changed.`);
      }
    }
  }
  return errors;
}

function collectMarkdownMarkerErrors(updated: string): string[] {
  const errors: string[] = [];
  const banned = ["```", "```python", "```py"];
  const hit = banned.find((b) => updated.includes(b));
  if (hit) {
    errors.push(`Updated code contains disallowed markdown marker: ${hit}`);
  }
  return errors;
}

function sumLiteralWaitSeconds(codeBlock: string): number {
  // Note: we only count literal numeric waits (deterministic + easy to validate).
  const re = /self\.wait\(\s*([0-9]+\.?[0-9]*(?:e[-+]?[0-9]+)?)\s*\)/g;
  let sum = 0;
  for (const m of codeBlock.matchAll(re)) {
    const s = Number(m[1]);
    if (!Number.isFinite(s)) continue;
    sum += s;
  }
  return sum;
}

function normalizeWaitLinesToOriginalByFrame(original: string, updated: string): string {
  const orig = splitIntoFrameBlocks(original);
  const next = splitIntoFrameBlocks(updated);
  if (orig.length === 0 || next.length === 0) return updated;
  if (orig.length !== next.length) return updated;
  for (let i = 0; i < orig.length; i++) {
    if (orig[i]!.frameId !== next[i]!.frameId) return updated;
  }

  // Build line ranges for the UPDATED code so we can surgically replace only inside each frame block.
  const updatedLines = updated.split(/\r?\n/);
  const frameHeaderRe = /^\s*#\s*Frame\s+(\d+)\s*:\s*(.+)\s*$/;
  const indices: Array<{ idx: number; frameId: number }> = [];
  for (let i = 0; i < updatedLines.length; i++) {
    const m = frameHeaderRe.exec(updatedLines[i] ?? "");
    if (m) indices.push({ idx: i, frameId: Number(m[1]) });
  }
  if (indices.length !== next.length) return updated;

  function normalizeBlockWaitLines(origBlock: string, updBlock: string): string {
    const waitLineRe = /^\s*self\.wait\(\s*[0-9]+(?:\.[0-9]+)?\s*\).*$/;
    const anyWaitRe = /self\.wait\(\s*[0-9]+(?:\.[0-9]+)?\s*\)/g;

    const origLines = origBlock.split(/\r?\n/);
    const origWaitLines = origLines.filter((l) => waitLineRe.test(l));

    // If original had no explicit wait lines (as separate lines), we can't reliably "heal" 
    // by swapping lines. We return as is.
    if (origWaitLines.length === 0) return updBlock;

    const updLines = updBlock.split(/\r?\n/);
    const updWaitIdxs: number[] = [];
    for (let i = 0; i < updLines.length; i++) {
      // If the line is ONLY a wait call, it's a candidate for removal/replacement.
      if (waitLineRe.test(updLines[i] ?? "")) {
        updWaitIdxs.push(i);
      }
    }

    // Surgical removal:
    // 1. Remove all lines that are just "self.wait(...)"
    let withoutUpdWaits = updLines.filter((_, i) => !updWaitIdxs.includes(i));

    // 2. ALSO strip any inline wait calls the model might have sneaked in on other lines
    //    (to prevent the duration from drifting if the model did `self.play(...); self.wait(...)`)
    withoutUpdWaits = withoutUpdWaits.map(line => line.replace(anyWaitRe, ""));

    // Choose insertion point:
    // - Prefer where the first wait line was in the updated version.
    // - Else, insert just before the last FadeOut play or near the end.
    let insertAt = 0;
    if (updWaitIdxs.length > 0) {
      insertAt = updWaitIdxs[0]!;
    } else {
      const fadeOutIdx = withoutUpdWaits.findIndex((l) => /self\.play\(.+FadeOut\(/.test(l));
      insertAt = fadeOutIdx >= 0 ? fadeOutIdx : Math.max(0, withoutUpdWaits.length - 1);
    }

    // Preserve indentation by reusing indentation from the first original wait line.
    const indent = (origWaitLines[0]?.match(/^\s*/)?.[0] ?? "        ");
    const normalizedWaits = origWaitLines.map((l) => indent + l.trimStart());

    withoutUpdWaits.splice(insertAt, 0, ...normalizedWaits);
    return withoutUpdWaits.join("\n");
  }

  // Replace each updated frame block with a normalized-waits version.
  // Do this from the bottom up so line indices stay valid.
  for (let j = indices.length - 1; j >= 0; j--) {
    const start = indices[j]!.idx;
    const endExclusive = j + 1 < indices.length ? indices[j + 1]!.idx : updatedLines.length;
    const updBlock = updatedLines.slice(start, endExclusive).join("\n");
    const origBlock = orig[j]!.block;
    const normalized = normalizeBlockWaitLines(origBlock, updBlock);
    const normalizedLines = normalized.split(/\r?\n/);
    updatedLines.splice(start, endExclusive - start, ...normalizedLines);
  }

  return updatedLines.join("\n");
}

function normalizeNumberLineToNoTex(updated: string): string {
  // Manim NumberLine number labels default to TeX/MathTex in many configs (requires LaTeX installed).
  // For Windows setups without LaTeX, force Pango Text labels.
  const lines = updated.split(/\r?\n/);
  const out: string[] = [];
  for (const line of lines) {
    if (line.includes("NumberLine(") && !line.includes("label_constructor=")) {
      if (line.includes("include_numbers=")) {
        out.push(line.replace("NumberLine(", "NumberLine(label_constructor=Text, "));
      } else {
        out.push(line.replace("NumberLine(", "NumberLine(include_numbers=True, label_constructor=Text, "));
      }
      continue;
    }
    out.push(line);
  }
  return out.join("\n");
}

function restoreNonCritiquedFrames(
  original: string,
  updated: string,
  critique: VideoCritiqueOutput
): string {
  const origBlocks = splitIntoFrameBlocks(original);
  const nextBlocks = splitIntoFrameBlocks(updated);

  // If the frame count changed, we can't safely do surgery
  if (origBlocks.length === 0 || nextBlocks.length === 0 || origBlocks.length !== nextBlocks.length) {
    return updated;
  }

  const critiqued = new Set<number>(critique.issues.map((i) => i.frameId));
  const finalBlocks: string[] = [];

  for (let i = 0; i < origBlocks.length; i++) {
    const a = origBlocks[i]!;
    const b = nextBlocks[i]!;
    if (critiqued.has(a.frameId)) {
      finalBlocks.push(b.block);
    } else {
      // Revert to original block for non-critiqued frames
      finalBlocks.push(a.block);
    }
  }

  // Preserve the parts before the first frame and after the last frame
  const firstOrigIdx = original.indexOf(origBlocks[0]!.headerLine);
  if (firstOrigIdx < 0) return updated; // fallback
  const prefix = original.slice(0, firstOrigIdx);

  // We join blocks with \n, but splitIntoFrameBlocks might have handled trailing newlines differently.
  // The most robust way is to just join them and rely on the fact that each block ends with its own original \n or EOF.
  return prefix + finalBlocks.join("\n");
}

function collectWaitDurationErrors(original: string, updated: string): string[] {
  const errors: string[] = [];
  const origBlocks = splitIntoFrameBlocks(original);
  const nextBlocks = splitIntoFrameBlocks(updated);

  if (origBlocks.length === 0 || nextBlocks.length === 0) return [];
  if (origBlocks.length !== nextBlocks.length) return [];

  const EPS = 1e-6;
  for (let i = 0; i < origBlocks.length; i++) {
    const a = origBlocks[i]!;
    const b = nextBlocks[i]!;
    const aSum = sumLiteralWaitSeconds(a.block);
    const bSum = sumLiteralWaitSeconds(b.block);

    if (Math.abs(aSum - bSum) > EPS) {
      errors.push(`Total self.wait(...) seconds changed for frameId=${a.frameId} (original=${aSum}, updated=${bSum}).`);
    }
  }
  return errors;
}

function validateSafety(original: string, updated: string, critique: VideoCritiqueOutput): string[] {
  const allErrors: string[] = [];
  allErrors.push(...collectMarkdownMarkerErrors(updated));
  allErrors.push(...collectFrameMappingCommentErrors(original, updated));
  allErrors.push(...collectWaitDurationErrors(original, updated));
  allErrors.push(...collectUnauthorizedFrameChangeErrors(original, updated, critique));
  return allErrors;
}

function buildIterationFeedback(errors: string[], originalCode: string): string {
  const origBlocks = splitIntoFrameBlocks(originalCode);
  const headerList = origBlocks.map(b => b.headerLine).join('\n');

  return `
PREVIOUS ATTEMPT FAILED SAFETY VALIDATION:

${errors.map((e, i) => `${i + 1}. ${e}`).join("\n")}

CRITICAL REQUIREMENTS FOR THE FIX:
1. You MUST return the ENTIRE Python script in the 'updatedCode' field, not just bits.
2. You MUST preserve the exact '# Frame N:' header lines for ALL frames. 
3. Copy-paste these exact lines back into your 'updatedCode':
${headerList}

4. For frames with NO critique issues, the code block between these markers MUST be byte-for-byte identical to the original.
5. Do NOT use markdown code fences in the JSON strings.
6. Use single quotes for Python strings: Text('Like this')

If you previously failed validation, LOOK AT THE ERRORS above and fix them specifically. 
If you missed frame markers, ENSURE you include them exactly as listed in step 3.
If you changed durations, RESTORE the original self.wait(...) values exactly.
`;
}

export function generateUnifiedDiff(originalCode: string, updatedCode: string): string {
  return createTwoFilesPatch(
    "original.py",
    "updated.py",
    originalCode,
    updatedCode,
    undefined,
    undefined,
    { context: 3 }
  );
}

/**
 * Phase 6: Iteration Engine (Gemini 3)
 *
 * Produces updated code + changeLog, and performs safety validation before optional overwrite.
 */
export async function runIterationEngine(
  rawInput: unknown,
  options: IterationOptions = {}
): Promise<IterationOutput & { diff?: string }> {
  const input = IterationInputSchema.parse(rawInput);

  const apiKey = options.apiKey ?? process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY (or options.apiKey).");

  const model = options.model ?? process.env.GEMINI_MODEL ?? "gemini-3-pro-preview";
  const promptTemplatePath = options.promptTemplatePath ?? defaultPromptPath();

  const template = await loadPromptTemplate(promptTemplatePath);
  const prompt = fillTemplate(template, input);

  const ai = new GoogleGenAI({ apiKey });

  const responseJsonSchema = {
    type: "object",
    additionalProperties: false,
    required: ["updatedCode", "changeLog"],
    properties: {
      updatedCode: { type: "string" },
      changeLog: { type: "array", items: { type: "string" }, minItems: 1 }
    }
  } as const;

  const maxRetries = options.maxRetries ?? 3;
  let currentPrompt = prompt;
  let lastErrors: string[] = [];
  let safeOut: IterationOutput | null = null;
  let lastException: unknown = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`[IterationEngine] Attempt ${attempt}/${maxRetries}...`);
    try {
      const resp = await ai.models.generateContent({
        model,
        contents: currentPrompt,
        config: {
          temperature: 0.1,
          maxOutputTokens: 16384,
          responseMimeType: "application/json",
          responseJsonSchema
        }
      });

      const parts = resp.candidates?.[0]?.content?.parts ?? [];
      const modelText = parts.map((p) => p.text).filter(Boolean).join("").trim();
      if (!modelText) throw new Error("Gemini response missing text content.");

      // Log a snippet for observability
      console.log(`[IterationEngine] Received response (${modelText.length} chars). Snippet: ${modelText.slice(0, 100).replace(/\n/g, "\\n")}...`);

      const parsed = parseStrictJson(modelText);
      const out = IterationOutputSchema.parse(parsed);

      const normalizedUpdatedCode = normalizeNumberLineToNoTex(
        normalizeWaitLinesToOriginalByFrame(
          input.originalManimCode,
          normalizeFrameHeaderLinesToOriginal(input.originalManimCode, out.updatedCode)
        )
      );

      // Surgery: Force non-critiqued frames back to their original state
      const surgicallyHealedCode = restoreNonCritiquedFrames(
        input.originalManimCode,
        normalizedUpdatedCode,
        input.critique
      );

      const candidate: IterationOutput = { ...out, updatedCode: surgicallyHealedCode };

      // Safety validation
      const errors = validateSafety(input.originalManimCode, candidate.updatedCode, input.critique);

      if (errors.length === 0) {
        console.log(`[IterationEngine] ✓ Safety validation passed on attempt ${attempt}`);
        safeOut = candidate;
        break;
      }

      lastErrors = errors;
      console.warn(`[IterationEngine] Attempt ${attempt} failed safety validation with ${errors.length} error(s):`);
      errors.forEach((e, i) => console.warn(`  ${i + 1}. ${e}`));

      // LOG THE FULL FAULTY CODE FOR DEBUGGING IF NEEDED (commented out by default or use a debug flag)
      // console.debug("[IterationEngine] Faulty code snippet:", candidate.updatedCode.slice(0, 500));

      if (attempt < maxRetries) {
        const feedback = buildIterationFeedback(errors, input.originalManimCode);
        currentPrompt = currentPrompt + "\n\n" + feedback; // Use currentPrompt to accumulate feedback or reset? 
        // Resetting to prompt + feedback is usually better to avoid context bloat if prompt is large.
        currentPrompt = prompt + "\n\n" + feedback;
      }
    } catch (e) {
      lastException = e;
      console.warn(`[IterationEngine] Attempt ${attempt} crashed/failed:`, e instanceof Error ? e.message : e);

      if (attempt < maxRetries) {
        let feedback = "\n\nPREVIOUS ATTEMPT FAILED WITH ERROR: " + (e instanceof Error ? e.message : String(e));
        if (e instanceof SyntaxError || e instanceof z.ZodError) {
          feedback += "\n\nPlease ensure you return a VALID JSON object matching the requested schema.";
        }
        currentPrompt = prompt + feedback;
      }
    }
  }

  if (!safeOut) {
    if (lastErrors.length > 0) {
      throw new Error(`ITERATION_SAFETY_FAILED after ${maxRetries} attempts:\n${lastErrors.join("\n")}`);
    }
    throw (lastException ?? new Error("ITERATION_FAILED after all retry attempts."));
  }

  if (options.outputPath) {
    await writeFile(options.outputPath, safeOut.updatedCode, "utf-8");
  }

  const diff = options.includeDiff
    ? generateUnifiedDiff(input.originalManimCode, safeOut.updatedCode)
    : undefined;

  return { ...safeOut, ...(diff ? { diff } : {}) };
}

