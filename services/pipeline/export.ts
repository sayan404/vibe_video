import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

import {
  TopicResearchInputSchema,
  runTopicResearch,
  type TopicResearchInput,
  type TopicResearchOutput
} from "../gemini/research.js";
import {
  runStoryboardEngine,
  StoryboardOutputSchema,
  type StoryboardOutput
} from "../nanobanana/storyboard.js";
import { normalizeToNoTex } from "../utils/manim.js";
import { runManimCodeGenerator } from "../gemini/manimGenerator.js";
import {
  runManimRenderExecutor,
  type RenderMetadata
} from "./render.js";
import {
  runVideoCritique,
  VideoCritiqueOutputSchema,
  type VideoCritiqueOutput
} from "../critique/critique.js";
import { runIterationEngine, type IterationOutput } from "../iteration/refine.js";
import { runRepairEngine } from "../iteration/repair.js";
import { runComplexAnimationGenerator, formatSnippetsAsContext, type ComplexAnimationOutput } from "../gemini/complexAnimationGenerator.js";
import { synthesizeVoiceover } from "../gemini/voiceSynthesizer.js";
import { spawn } from "node:child_process";

export const PipelineRunInputSchema = TopicResearchInputSchema;
export type PipelineRunInput = TopicResearchInput;

export type ExportPhaseId =
  | "phase1_research"
  | "phase2_storyboard"
  | "phase3_5_complex_anim"
  | "phase3_manim_codegen"
  | "phase4_manim_render"
  | "phase5_video_critique"
  | "phase6_iteration"
  | "phase7_export"
  | "phase8_refinement"
  | "phase9_audio";

export type PhaseStatus = "pending" | "running" | "success" | "error";

export const PhaseRecordSchema = z
  .object({
    status: z.enum(["pending", "running", "success", "error"]),
    startedAt: z.string().optional(),
    finishedAt: z.string().optional(),
    error: z
      .object({
        message: z.string().min(1),
        details: z.unknown().optional()
      })
      .strict()
      .optional()
  })
  .strict();

export type PhaseRecord = z.infer<typeof PhaseRecordSchema>;

export const PipelineRunStateSchema = z
  .object({
    runId: z.string().min(1),
    createdAt: z.string().min(1),
    input: PipelineRunInputSchema,
    phases: z.record(z.string(), PhaseRecordSchema),
    artifacts: z
      .object({
        researchJson: z.string().optional(),
        storyboardJson: z.string().optional(),
        complexSnippetsJson: z.string().optional(),
        manimCodePath: z.string().optional(),
        renderMetadataJson: z.string().optional(),
        renderedVideoPath: z.string().optional(),
        critiqueJson: z.string().optional(),
        iterationJson: z.string().optional(),
        finalManimCodePath: z.string().optional(),
        voiceoverScriptPath: z.string().optional(),
        audioPath: z.string().optional(),
        readmePath: z.string().optional(),
        lastSilentVideoPath: z.string().optional()
      })
      .strict()
  })
  .strict();

export type PipelineRunState = z.infer<typeof PipelineRunStateSchema>;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const RUNS_DIR = path.join(REPO_ROOT, "runs");

function nowIso(): string {
  return new Date().toISOString();
}

function initialPhases(): Record<ExportPhaseId, PhaseRecord> {
  return {
    phase1_research: { status: "pending" },
    phase2_storyboard: { status: "pending" },
    phase3_5_complex_anim: { status: "pending" },
    phase3_manim_codegen: { status: "pending" },
    phase4_manim_render: { status: "pending" },
    phase5_video_critique: { status: "pending" },
    phase6_iteration: { status: "pending" },
    phase7_export: { status: "pending" },
    phase8_refinement: { status: "pending" },
    phase9_audio: { status: "pending" }
  };
}

async function ensureDir(p: string): Promise<void> {
  await mkdir(p, { recursive: true });
}

function runDir(runId: string): string {
  return path.join(RUNS_DIR, runId);
}

function statePath(runId: string): string {
  return path.join(runDir(runId), "state.json");
}

async function readJson<T>(p: string): Promise<T> {
  const text = await readFile(p, "utf-8");
  return JSON.parse(text) as T;
}

async function writeJson(p: string, obj: unknown): Promise<void> {
  await writeFile(p, JSON.stringify(obj, null, 2), "utf-8");
}

export async function createRun(rawInput: unknown): Promise<PipelineRunState> {
  const input = PipelineRunInputSchema.parse(rawInput);
  const runId = randomUUID();
  await ensureDir(runDir(runId));

  const state: PipelineRunState = {
    runId,
    createdAt: nowIso(),
    input,
    phases: initialPhases(),
    artifacts: {}
  };

  await writeJson(statePath(runId), state);
  return state;
}

export async function loadRunState(runId: string): Promise<PipelineRunState> {
  const raw = await readJson<unknown>(statePath(runId));
  return PipelineRunStateSchema.parse(raw);
}

async function saveRunState(runId: string, state: PipelineRunState): Promise<void> {
  await writeJson(statePath(runId), state);
}

async function setPhase(
  runId: string,
  phase: ExportPhaseId,
  patch: Partial<PhaseRecord>
): Promise<void> {
  const state = await loadRunState(runId);
  state.phases[phase] = { ...(state.phases[phase] ?? { status: "pending" }), ...patch };
  // If a phase is restarted/rerun, ensure we don't keep a stale finishedAt.
  if (patch.status === "running") {
    state.phases[phase]!.finishedAt = undefined;
  }
  await saveRunState(runId, state);
}

async function writeArtifact(runId: string, relPath: string, data: string): Promise<string> {
  const abs = path.join(runDir(runId), relPath);
  await ensureDir(path.dirname(abs));
  await writeFile(abs, data, "utf-8");
  return abs.replaceAll("\\", "/");
}

async function writeArtifactJson(runId: string, relPath: string, obj: unknown): Promise<string> {
  const abs = path.join(runDir(runId), relPath);
  await ensureDir(path.dirname(abs));
  await writeJson(abs, obj);
  return abs.replaceAll("\\", "/");
}

async function listRuns(): Promise<string[]> {
  await ensureDir(RUNS_DIR);
  const entries = await readdir(RUNS_DIR, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name);
}

export async function listRunStates(): Promise<PipelineRunState[]> {
  const ids = await listRuns();
  const states: PipelineRunState[] = [];
  for (const id of ids) {
    try {
      states.push(await loadRunState(id));
    } catch {
      // ignore broken runs
    }
  }
  // newest first
  states.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return states;
}

async function findLatestFileRecursive(rootDir: string, ext: string): Promise<string | null> {
  type Best = { p: string; mtimeMs: number };

  async function walk(dir: string): Promise<Best | null> {
    let best: Best | null = null;
    const entries = await readdir(dir, { withFileTypes: true });
    for (const ent of entries) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        const childBest = await walk(p);
        if (childBest && (!best || childBest.mtimeMs > best.mtimeMs)) best = childBest;
      } else if (ent.isFile() && p.toLowerCase().endsWith(ext.toLowerCase())) {
        const s = await stat(p);
        const m = s.mtimeMs;
        if (!best || m > best.mtimeMs) best = { p, mtimeMs: m };
      }
    }
    return best;
  }

  try {
    const best = await walk(rootDir);
    if (!best) return null;
    return best.p.replaceAll("\\", "/");
  } catch {
    return null;
  }
}

function buildVoiceoverScript(storyboard: StoryboardOutput): string {
  return storyboard
    .map((f) => `Frame ${f.frameId}: ${f.sceneTitle}\n${f.voiceoverScript}\n`)
    .join("\n");
}

function buildRunReadme(state: PipelineRunState): string {
  return `# VV Run ${state.runId}

Created: ${state.createdAt}

## Input

- Topic: ${state.input.topic}
- Target audience: ${state.input.targetAudience}
- Desired duration (minutes): ${state.input.desiredDurationMinutes}

## Artifacts

- Research JSON: ${state.artifacts.researchJson ?? "(not generated)"}
- Storyboard JSON: ${state.artifacts.storyboardJson ?? "(not generated)"}
- Manim code (initial): ${state.artifacts.manimCodePath ?? "(not generated)"}
- Render metadata: ${state.artifacts.renderMetadataJson ?? "(not generated)"}
- Rendered video: ${state.artifacts.renderedVideoPath ?? "(not generated)"}
- Critique report: ${state.artifacts.critiqueJson ?? "(not generated)"}
- Iteration output: ${state.artifacts.iterationJson ?? "(not generated)"}
- Final Manim code: ${state.artifacts.finalManimCodePath ?? "(not generated)"}
- Voiceover script: ${state.artifacts.voiceoverScriptPath ?? "(not generated)"}

## Phase statuses

${Object.keys(state.phases)
      .map((k) => {
        const v = state.phases[k]!;
        return `- ${k}: ${v.status}${v.error ? ` (${v.error.message})` : ""}`;
      })
      .join("\n")}
`;
}

// -------------------------
// Phase runners
// -------------------------

async function phase1(runId: string): Promise<TopicResearchOutput> {
  const state = await loadRunState(runId);
  const out = await runTopicResearch(state.input);
  const p = await writeArtifactJson(runId, "phase1.research.json", out);
  const next = await loadRunState(runId);
  next.artifacts.researchJson = p;
  await saveRunState(runId, next);
  return out;
}

async function phase2(runId: string): Promise<StoryboardOutput> {
  const state = await loadRunState(runId);
  if (!state.artifacts.researchJson) throw new Error("Missing Phase 1 output (researchJson).");
  const research = await readJson<unknown>(state.artifacts.researchJson);
  const imagesDir = path.join(runDir(runId), "storyboard_images");
  const out = await runStoryboardEngine(research, { imageOutputDir: imagesDir });
  const p = await writeArtifactJson(runId, "phase2.storyboard.json", out);
  const next = await loadRunState(runId);
  next.artifacts.storyboardJson = p;
  await saveRunState(runId, next);
  return out;
}

async function phase3_5(runId: string): Promise<ComplexAnimationOutput> {
  const state = await loadRunState(runId);
  if (!state.artifacts.storyboardJson) throw new Error("Missing Phase 2 output (storyboardJson).");
  const storyboard = await readJson<unknown>(state.artifacts.storyboardJson);

  const out = await runComplexAnimationGenerator(storyboard, {
    outputPath: path.join(runDir(runId), "phase3.5.snippets.json")
  });

  if (out.length > 0) {
    const p = await writeArtifactJson(runId, "phase3.5.snippets.json", out);
    const next = await loadRunState(runId);
    next.artifacts.complexSnippetsJson = p;
    await saveRunState(runId, next);
  }

  return out;
}

async function phase3(runId: string): Promise<{ pythonScript: string; savedTo: string }> {
  console.log(`[Phase3] Starting execution for runId: ${runId}`);
  const state = await loadRunState(runId);
  console.log(`[Phase3] State loaded. Artifacts:`, JSON.stringify(state.artifacts, null, 2));

  if (!state.artifacts.storyboardJson) {
    console.error("[Phase3] Missing Phase 2 output (storyboardJson). Artifacts:", state.artifacts);
    throw new Error("Missing Phase 2 output (storyboardJson).");
  }

  const storyboard = await readJson<unknown>(state.artifacts.storyboardJson) as any[]; // Cast as array for logging length
  console.log(`[Phase3] Storyboard loaded. Frames: ${Array.isArray(storyboard) ? storyboard.length : 'Not an array'}`);

  // Load snippets from Phase 3.5 if available
  let snippetsContext: string | undefined;
  if (state.artifacts.complexSnippetsJson) {
    console.log(`[Phase3] Found complexSnippetsJson at: ${state.artifacts.complexSnippetsJson}`);
    try {
      const snippets = await readJson<ComplexAnimationOutput>(state.artifacts.complexSnippetsJson);
      console.log(`[Phase3] Read snippets JSON. Count: ${snippets.length}`);
      if (snippets.length > 0) {
        snippetsContext = formatSnippetsAsContext(snippets);
        console.log(`[Phase3] Formatted snippets context. Length: ${snippetsContext.length}`);
        console.log(`[Phase3] Using ${snippets.length} pre-generated snippet(s) from Phase 3.5`);
      } else {
        console.log("[Phase3] Snippets array empty.");
      }
    } catch (e) {
      console.warn("[Phase3] Failed to load snippets from Phase 3.5:", e);
    }
  } else {
    console.log("[Phase3] No complexSnippetsJson found in artifacts.");
  }

  console.log("[Phase3] Calling runManimCodeGenerator...");
  const scriptOut = await runManimCodeGenerator(storyboard, {
    outputPath: path.join(runDir(runId), "phase3.manim.py"),
    snippetsContext
  });
  console.log(`[Phase3] Manim generator completed. Script saved to: ${scriptOut.savedTo}`);

  const next = await loadRunState(runId);
  next.artifacts.manimCodePath = scriptOut.savedTo;
  await saveRunState(runId, next);
  console.log("[Phase3] State updated with manimCodePath.");

  return scriptOut;
}

async function phase4(runId: string): Promise<RenderMetadata> {
  const state = await loadRunState(runId);
  const scriptPath = state.artifacts.finalManimCodePath ?? state.artifacts.manimCodePath;
  if (!scriptPath) throw new Error("Missing Phase 3 output (manimCodePath).");

  const mediaDir = path.join(runDir(runId), "media");
  let currentPath = scriptPath;
  let meta: RenderMetadata | null = null;
  const MAX_REPAIRS = 10;

  for (let attempt = 0; attempt <= MAX_REPAIRS; attempt++) {
    const attemptNum = attempt + 1;
    try {
      // Save current script as an artifact for this attempt
      const attemptContent = await readFile(currentPath, "utf-8");
      const savedAttemptPath = await writeArtifact(runId, `phase4.attempt.${attemptNum}.py`, attemptContent);
      console.log(`[Phase4] Attempt ${attemptNum}/${MAX_REPAIRS + 1} starting. Script: ${savedAttemptPath}`);

      meta = await runManimRenderExecutor(
        { scriptPath: currentPath, sceneName: "StoryboardScene", quality: "low", mediaDir },
        { retries: 0, timeoutMs: 10 * 60 * 1000 }
      );
      console.log(`[Phase4] Attempt ${attemptNum} render successful.`);
      break; // Success
    } catch (e) {
      const errMessage = e instanceof Error ? e.message : String(e);
      console.warn(`[Phase4] Render failed (Attempt ${attemptNum}/${MAX_REPAIRS + 1}). Error: ${errMessage.slice(0, 200)}...`);

      // Determine if retryable via repair
      if (attempt < MAX_REPAIRS) {
        console.warn(`[Phase4] Invoking repair for attempt ${attemptNum}...`);
        const brokenCode = await readFile(currentPath, "utf-8");
        const fixed = await runRepairEngine(brokenCode, errMessage);

        const repairFilename = `phase4.repair.${attemptNum}.py`;
        const repairPath = await writeArtifact(runId, repairFilename, fixed.fixedCode);
        currentPath = repairPath;

        // Update artifacts so we track the latest "best effort" code
        const update = await loadRunState(runId);
        update.artifacts.finalManimCodePath = repairPath;
        await saveRunState(runId, update);
        continue;
      }
      throw e;
    }
  }

  if (!meta) throw new Error("Render failed after repairs.");

  const metaPath = await writeArtifactJson(runId, "phase4.render.json", meta);
  // Prefer the actual scene output MP4 for the current code stage.
  // (We may have older mp4s in the run folder from previous renders.)
  const expectedStage =
    state.artifacts.finalManimCodePath && state.artifacts.finalManimCodePath !== state.artifacts.manimCodePath
      ? "phase6.manim.refined"
      : "phase3.manim";
  const expected = path.join(mediaDir, "videos", expectedStage, "480p15", "StoryboardScene.mp4");
  const expectedPosix = expected.replaceAll("\\", "/");
  const video = (await stat(expected).then(() => expectedPosix).catch(() => null)) ??
    (await findLatestFileRecursive(mediaDir, ".mp4"));

  const next = await loadRunState(runId);
  next.artifacts.renderMetadataJson = metaPath;
  if (video) {
    next.artifacts.renderedVideoPath = video;
    next.artifacts.lastSilentVideoPath = video;
  }

  // Since we are skipping Phase 5 & 6 for now, declare Phase 4 output as final
  next.artifacts.finalManimCodePath = currentPath;
  if (video) {
    next.artifacts.renderedVideoPath = video;
    next.artifacts.lastSilentVideoPath = video;
  }

  await saveRunState(runId, next);

  return meta;
}

async function phase5(runId: string): Promise<VideoCritiqueOutput> {
  const state = await loadRunState(runId);
  if (!state.artifacts.storyboardJson) throw new Error("Missing Phase 2 output (storyboardJson).");
  if (!state.artifacts.renderMetadataJson)
    throw new Error("Missing Phase 4 output (renderMetadataJson).");

  const manimPath = state.artifacts.finalManimCodePath ?? state.artifacts.manimCodePath;
  if (!manimPath) throw new Error("Missing Manim code path.");
  if (!state.artifacts.renderedVideoPath) throw new Error("Missing Phase 4 rendered video.");

  const storyboard = await readJson<unknown>(state.artifacts.storyboardJson);
  const renderMetadata = await readJson<unknown>(state.artifacts.renderMetadataJson);
  const manimCode = await readFile(manimPath, "utf-8");

  const critique = await runVideoCritique(
    {
      storyboard,
      renderMetadata,
      manimCode,
      videoPath: state.artifacts.renderedVideoPath as string
    },
    { debugPath: path.join(runDir(runId), "phase5.prompt_debug.txt") }
  );
  const critiquePath = await writeArtifactJson(runId, "phase5.critique.json", critique);

  const next = await loadRunState(runId);
  next.artifacts.critiqueJson = critiquePath;
  await saveRunState(runId, next);

  return critique;
}

async function phase6(runId: string): Promise<IterationOutput | null> {
  const state = await loadRunState(runId);
  if (!state.artifacts.critiqueJson) throw new Error("Missing Phase 5 output (critiqueJson).");
  if (!state.artifacts.storyboardJson) throw new Error("Missing Phase 2 output (storyboardJson).");
  const originalPath = state.artifacts.manimCodePath;
  if (!originalPath) throw new Error("Missing Phase 3 output (manimCodePath).");

  const mediaDir = path.join(runDir(runId), "media");

  /* 
   * Phase 6 Enhanced: Iteration + Auto-Compilation + Final Export
   * 1. Run Iteration Engine to get refined code.
   * 2. If code changed:
   *    a. Save new code to `phase6.manim.refined.py`
   *    b. Trigger Manim Rendering (Compile) immediately for this file.
   *    c. Create a `final/` directory.
   *    d. Copy the Rendered Video, the Refined Code, and other assets to `final/`.
   *    e. Update state with `finalVideoPath` and `finalManimCodePath`.
   */

  const critique = await readJson<unknown>(state.artifacts.critiqueJson);
  const parsedCritique = VideoCritiqueOutputSchema.parse(critique);

  let refinedCodePath = originalPath;
  let codeChanged = false;

  // 1. Run Iteration if issues exist
  if (parsedCritique.issues.length > 0) {
    const originalManimCode = await readFile(originalPath, "utf-8");
    const storyboard = await readJson<unknown>(state.artifacts.storyboardJson as string);
    const MAX_ATTEMPTS = 5;
    let lastError: string | undefined;
    let inputCode = originalManimCode;

    for (let i = 1; i <= MAX_ATTEMPTS; i++) {
      console.log(`[Phase6] Iteration ${i}/${MAX_ATTEMPTS}...`);
      try {
        const out = await runIterationEngine(
          { originalManimCode: inputCode, critique: parsedCritique, storyboard, compilationError: lastError },
          { outputPath: path.join(runDir(runId), "phase6.manim.refined.py") }
        );

        refinedCodePath = path.join(runDir(runId), "phase6.manim.refined.py").replaceAll("\\", "/");

        const iterPath = await writeArtifactJson(runId, `phase6.iteration.attempt.${i}.json`, { changeLog: out.changeLog });
        await writeArtifact(runId, `phase6.iteration.attempt.${i}.py`, out.updatedCode); // Save actual script for debugging

        const update = await loadRunState(runId);
        update.artifacts.iterationJson = iterPath;
        update.artifacts.finalManimCodePath = refinedCodePath;
        await saveRunState(runId, update);

        await runManimRenderExecutor(
          { scriptPath: refinedCodePath, sceneName: "StoryboardScene", quality: "low", mediaDir },
          { retries: 0, timeoutMs: 15 * 60 * 1000 }
        );
        console.log(`[Phase6] Success on attempt ${i}`);
        codeChanged = true;
        break;
      } catch (e) {
        lastError = String(e);
        console.warn(`[Phase6] Attempt ${i} failed: ${lastError.slice(0, 100)}`);
        if (i === MAX_ATTEMPTS) throw new Error(`Phase 6 failed after ${MAX_ATTEMPTS} attempts. Last error: ${lastError}`);
        try { inputCode = await readFile(refinedCodePath, "utf-8"); } catch { }
      }
    }
  } else {
    // If no issues, we still want to "Finalize" the original code if it hasn't been done
    const next = await loadRunState(runId);
    next.artifacts.finalManimCodePath = originalPath;
    await saveRunState(runId, next);

    try {
      await runManimRenderExecutor(
        { scriptPath: originalPath, sceneName: "StoryboardScene", quality: "low", mediaDir },
        { retries: 1, timeoutMs: 15 * 60 * 1000 }
      );
    } catch (e) {
      throw new Error(`Phase 6 Final Render Failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // 3. Store all media, text etc in a final video directory
  const finalDir = path.join(runDir(runId), "final");
  await ensureDir(finalDir);

  // Copy Code
  const finalCodeDest = path.join(finalDir, "final_script.py");
  await readFile(refinedCodePath).then(b => writeFile(finalCodeDest, b));

  // Copy Video
  // Find the video generated by the renderer
  const expectedVideoPath = path.join(mediaDir, "videos", "StoryboardScene", "480p15", "StoryboardScene.mp4"); // render executor default structure might need checking, assuming standard Manim
  // Actually runManimRenderExecutor usually returns metadata with output path, but let's find it.
  // The executor uses "mediaDir/videos/..." 
  // We need to be careful about the scene name and quality folders.
  // Since we don't have the exact output path from `renderMeta` in this snippet (it returns minimal meta?), 
  // Let's rely on `findLatestFileRecursive` or standardized path.
  // Standard Manim: media/videos/<scene_name>/<quality>/<scene_name>.mp4
  // We passed sceneName="StoryboardScene", quality="low" (480p15 usually)

  // Let's try to locate it using the robust finder or constructed path
  const videoSource = await findLatestFileRecursive(mediaDir, ".mp4");
  if (!videoSource) throw new Error("Phase 6 compiled video not found.");

  const finalVideoDest = path.join(finalDir, "final_video.mp4");
  await readFile(videoSource).then(b => writeFile(finalVideoDest, b));

  const finalStateUpdate = await loadRunState(runId);
  finalStateUpdate.artifacts.lastSilentVideoPath = finalVideoDest.replaceAll("\\", "/");
  await saveRunState(runId, finalStateUpdate);

  // Copy Voiceover (if exists) targetting "voiceover.txt"
  if (state.artifacts.voiceoverScriptPath) {
    await readFile(state.artifacts.voiceoverScriptPath).then(b => writeFile(path.join(finalDir, "voiceover.txt"), b)).catch(() => { });
  }

  // Copy Storyboard Images (Assets)
  // We copy the whole directory
  const imagesSourceDir = path.join(runDir(runId), "storyboard_images");
  const imagesDestDir = path.join(finalDir, "assets");
  await ensureDir(imagesDestDir);
  try {
    const files = await readdir(imagesSourceDir);
    for (const f of files) {
      await readFile(path.join(imagesSourceDir, f)).then(b => writeFile(path.join(imagesDestDir, f), b));
    }
  } catch (e) {
    // ignore if no images
  }

  // 4. Track latest final refined file in state.json
  const finalState = await loadRunState(runId);
  finalState.artifacts.finalManimCodePath = finalCodeDest.replaceAll("\\", "/");
  finalState.artifacts.renderedVideoPath = finalVideoDest.replaceAll("\\", "/");

  await saveRunState(runId, finalState);

  // Return the iteration output if we had one.
  // We need to re-construct it if we didn't save 'out' in a higher scope, 
  // but we can just return what we have if we lift the variable.
  // However, since we are inside the function, let's just make sure we capture 'out' earlier.
  // Actually, I'll just modify the logic to return 'out' if it exists.
  // But 'out' is currently scoped to the if block. 
  // Let's rely on the fact that if codeChanged=true, we had 'out'.
  // But we can't access 'out' here.
  // So I will edit the variable declaration part in a separate step or just hardcode the return to satisfy the type for now 
  // by reading the file we just wrote or just returning a dummy compatible object if we don't have 'out'.
  // Better: Let's read the iteration json we just saved.

  if (codeChanged) {
    if (!state.artifacts.iterationJson && !finalState.artifacts.iterationJson) {
      // Should not happen if codeChanged is true
      return { updatedCode: await readFile(finalCodeDest, "utf-8"), changeLog: ["Refined and Compiled"] };
    }
    const iterPath = finalState.artifacts.iterationJson!;
    const iter = await readJson<IterationOutput>(iterPath);
    // We might want to append "Compiled" to changeLog?
    return {
      updatedCode: iter.updatedCode ?? await readFile(finalCodeDest, "utf-8"),
      changeLog: [...(iter.changeLog ?? []), "Compiled and Exported to final/"]
    };
  }

  return null;
}

async function phase7(runId: string): Promise<void> {
  const state = await loadRunState(runId);
  if (!state.artifacts.storyboardJson) throw new Error("Missing storyboardJson.");

  const storyboard = await readJson<unknown>(state.artifacts.storyboardJson);
  const storyboardParsed = StoryboardOutputSchema.parse(storyboard);
  const voiceover = buildVoiceoverScript(storyboardParsed);
  const voiceoverPath = await writeArtifact(runId, "voiceover.txt", voiceover);

  const next = await loadRunState(runId);
  next.artifacts.voiceoverScriptPath = voiceoverPath;

  const readme = buildRunReadme(next);
  const readmePath = await writeArtifact(runId, "README.md", readme);
  next.artifacts.readmePath = readmePath;

  await saveRunState(runId, next);
}

async function phase9(runId: string): Promise<void> {
  const state = await loadRunState(runId);
  if (!state.artifacts.voiceoverScriptPath) throw new Error("Missing voiceover script.");

  // Use lastSilentVideoPath to avoid in-place edit errors or audio stacking
  const sourceVideoPath = state.artifacts.lastSilentVideoPath || state.artifacts.renderedVideoPath;
  if (!sourceVideoPath) throw new Error("Missing rendered video.");

  const script = await readFile(state.artifacts.voiceoverScriptPath, "utf-8");
  const audioRelPath = "voiceover.mp3";
  const audioAbsPath = path.join(runDir(runId), audioRelPath).replaceAll("\\", "/");

  // 1. Synthesize
  const actualAudioPath = await synthesizeVoiceover(script, audioAbsPath);

  // Verify synthesis success
  try {
    await stat(actualAudioPath);
  } catch (e) {
    throw new Error(`Voiceover synthesis failed: ${actualAudioPath} not found. Ensure your synthesis service is correctly configured.`);
  }

  // 2. Merge
  const finalVideoRelPath = "final_with_audio.mp4";
  const finalVideoAbsPath = path.join(runDir(runId), finalVideoRelPath).replaceAll("\\", "/");

  await mergeAudioVideo(sourceVideoPath, actualAudioPath, finalVideoAbsPath);

  // 3. Update state
  const next = await loadRunState(runId);
  next.artifacts.audioPath = audioAbsPath;
  next.artifacts.renderedVideoPath = finalVideoAbsPath; // Update to the one with audio
  await saveRunState(runId, next);
}

async function mergeAudioVideo(videoPath: string, audioPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`[FFmpeg] Merging audio and video...`);
    // -i video -i audio -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 -shortest final.mp4
    const args = [
      "-y", // overwrite
      "-i", videoPath,
      "-i", audioPath,
      "-c:v", "copy",
      "-c:a", "aac",
      "-map", "0:v:0",
      "-map", "1:a:0",
      "-shortest",
      outputPath
    ];

    const proc = spawn("ffmpeg", args);

    let stderr = "";
    proc.stderr?.on("data", (d) => { stderr += String(d); });

    proc.on("close", (code) => {
      if (code === 0) {
        console.log(`[FFmpeg] ✓ Merge successful: ${outputPath}`);
        resolve();
      } else {
        console.error(`[FFmpeg] Merge failed (exit ${code}): ${stderr}`);
        reject(new Error(`FFmpeg merge failed: ${stderr}`));
      }
    });
  });
}

export async function runPhase(runId: string, phase: ExportPhaseId): Promise<PipelineRunState> {
  await setPhase(runId, phase, { status: "running", startedAt: nowIso(), error: undefined });
  try {
    if (phase === "phase1_research") await phase1(runId);
    else if (phase === "phase2_storyboard") await phase2(runId);
    else if (phase === "phase3_5_complex_anim") await phase3_5(runId);
    else if (phase === "phase3_manim_codegen") await phase3(runId);
    else if (phase === "phase4_manim_render") await phase4(runId);
    else if (phase === "phase5_video_critique") await phase5(runId);
    else if (phase === "phase6_iteration") await phase6(runId);
    else if (phase === "phase7_export") await phase7(runId);
    else if (phase === "phase8_refinement") {
      // refinement is usually triggered with a prompt via runRefinement
      // this is just a fallback for manual trigger without prompt
      throw new Error("Phase 8 requires a user prompt. Use runRefinement instead.");
    }
    else if (phase === "phase9_audio") await phase9(runId);
    else throw new Error(`Unsupported phase: ${phase}`);

    await setPhase(runId, phase, { status: "success", finishedAt: nowIso() });
  } catch (e) {
    await setPhase(runId, phase, {
      status: "error",
      finishedAt: nowIso(),
      error: { message: e instanceof Error ? e.message : String(e) }
    });
    throw e;
  }

  return await loadRunState(runId);
}

export async function runAll(runId: string): Promise<PipelineRunState> {
  // Define the ordered phase sequence
  const phaseSequence: ExportPhaseId[] = [
    "phase1_research",
    "phase2_storyboard",
    "phase3_5_complex_anim",
    "phase3_manim_codegen",
    "phase4_manim_render",
    // "phase5_video_critique",
    // "phase6_iteration",
    "phase7_export",
    "phase9_audio"
  ];

  // Load current state to check which phases have already succeeded
  const currentState = await loadRunState(runId);

  // Run through all phases in order, skipping those that already succeeded
  for (const phase of phaseSequence) {
    const phaseStatus = currentState.phases[phase]?.status;

    // Skip phases that already succeeded
    if (phaseStatus === "success") {
      console.log(`[Pipeline] Skipping ${phase} (already succeeded)`);
      continue;
    }

    // Run this phase (whether pending, error, or running)
    console.log(`[Pipeline] Running ${phase}...`);
    await runPhase(runId, phase);

    // Reload state after each phase to get updated status
    const updatedState = await loadRunState(runId);

    // If this phase failed, stop the pipeline
    if (updatedState.phases[phase]?.status === "error") {
      console.log(`[Pipeline] ${phase} failed, stopping pipeline.`);
      return updatedState;
    }
  }

  return await loadRunState(runId);
}

export async function runRefinement(runId: string, userPrompt: string): Promise<PipelineRunState> {
  const phase = "phase8_refinement";
  await setPhase(runId, phase, { status: "running", startedAt: nowIso(), error: undefined });

  try {
    const state = await loadRunState(runId);

    // 1. Get current code
    const currentCodePath = state.artifacts.finalManimCodePath || state.artifacts.manimCodePath;
    if (!currentCodePath) throw new Error("No existing Manim code found to refine.");
    const currentCode = await readFile(currentCodePath, "utf-8");

    // 2. Load storyboard for context
    if (!state.artifacts.storyboardJson) throw new Error("Storyboard missing.");
    const storyboard = await readJson<any>(state.artifacts.storyboardJson);

    // 3. AI Refinement & Render Loop (Max 5 retries)
    const MAX_RETRIES = 5;
    let lastError: string | undefined;
    let currentAttemptCode = currentCode;
    let refinedPath = "";
    let video: string | undefined;
    let meta: any;

    const { runVideoRefinement } = await import("../gemini/videoRefinement.js");
    const { runManimRenderExecutor } = await import("./render.js");
    const mediaDir = path.join(runDir(runId), "media");
    const refinedCount = Object.keys(state.phases).filter(k => k.startsWith("phase8")).length;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      console.log(`[RunRefinement] Attempt ${attempt}/${MAX_RETRIES}`);

      try {
        // AI Refinement
        const refinedCode = await runVideoRefinement(
          currentAttemptCode,
          userPrompt,
          storyboard,
          state.artifacts.renderedVideoPath,
          lastError
        );

        // Save refined code
        const filename = `refined_manim_${refinedCount}_att_${attempt}.py`;
        refinedPath = await writeArtifact(runId, filename, refinedCode);

        // Render refined video
        meta = await runManimRenderExecutor(
          { scriptPath: refinedPath, sceneName: "StoryboardScene", quality: "high", mediaDir },
          { retries: 0 }
        );

        const expectedPosix = path.join(mediaDir, "videos", `refined_manim_${refinedCount}_att_${attempt}`, "1080p60", "StoryboardScene.mp4").replaceAll("\\", "/");
        video = (await stat(expectedPosix).then(() => expectedPosix).catch(() => undefined)) ??
          (await findLatestFileRecursive(mediaDir, ".mp4") || undefined);

        // If we reach here, it's a success!
        break;
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e);
        console.warn(`[RunRefinement] Attempt ${attempt} failed: ${lastError}`);
        if (attempt === MAX_RETRIES) {
          throw new Error(`Refined render failed after ${MAX_RETRIES} attempts. Last error: ${lastError}`);
        }
        // Prepare for next attempt: provide the failing code as context alongside the error
        // Actually, currentAttemptCode should probably stay the original code OR the one that just failed?
        // Let's use the one that just failed if we have it, so AI can fix its own mistake.
        if (refinedPath) {
          currentAttemptCode = await readFile(refinedPath, "utf-8");
        }
      }
    }

    // 6. Update state
    const next = await loadRunState(runId);
    next.artifacts.finalManimCodePath = refinedPath;
    if (video) {
      next.artifacts.renderedVideoPath = video;
      next.artifacts.lastSilentVideoPath = video;
    }

    // Save metadata
    await writeArtifactJson(runId, `refined_render_${refinedCount}.json`, meta);

    await saveRunState(runId, next);
    await setPhase(runId, phase, { status: "success", finishedAt: nowIso() });

    return await loadRunState(runId);
  } catch (e) {
    await setPhase(runId, phase, {
      status: "error",
      finishedAt: nowIso(),
      error: { message: e instanceof Error ? e.message : String(e) }
    });
    throw e;
  }
}


