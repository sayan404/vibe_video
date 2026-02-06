import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

export const RenderMetadataSchema = z
  .object({
    ok: z.boolean(),
    exitCode: z.number().int(),
    elapsedSeconds: z.number().finite().nonnegative(),
    totalDuration: z.number().finite().nonnegative(),
    sceneDurations: z
      .array(
        z
          .object({
            frameId: z.number().int().positive(),
            sceneTitle: z.string().min(1),
            durationSeconds: z.number().finite().positive()
          })
          .strict()
      )
      .nonempty(),
    frameCount: z.number().int().positive(),
    stdout: z.string(),
    stderr: z.string()
  })
  .strict();

export type RenderMetadata = z.infer<typeof RenderMetadataSchema>;

export interface ManimRenderInput {
  /**
   * Path to the generated Manim python script.
   * Default: "python/manim_renderer/storyboard_scene.py"
   */
  scriptPath?: string;
  /**
   * Scene class name within the script.
   * Default: "StoryboardScene"
   */
  sceneName?: string;
  /**
   * Manim quality preset (mapped by python entrypoint).
   * Default: "low"
   */
  quality?: "low" | "medium" | "high" | "ultra";
  /**
   * Optional media_dir override passed to Manim.
   * Default: "python/manim_renderer/media"
   */
  mediaDir?: string;
}

export interface ManimRenderOptions {
  /**
   * Python executable to use.
   * Default: process.env.PYTHON or "python"
   */
  pythonBin?: string;
  /**
   * Timeout per attempt.
   * Default: 10 minutes
   */
  timeoutMs?: number;
  /**
   * Number of retries after a failure (exit != 0 or invalid JSON payload).
   * Default: 1
   */
  retries?: number;
  /**
   * Backoff base delay (ms). attemptN waits attemptIndex * backoffMs.
   * Default: 1500
   */
  backoffMs?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function makeArgs(input: Required<ManimRenderInput>): string[] {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const repoRoot = path.resolve(__dirname, "..", "..");
  const entrypoint = path.join(repoRoot, "python", "manim_renderer", "render_entrypoint.py");
  return [
    entrypoint,
    "--script",
    input.scriptPath,
    "--scene",
    input.sceneName,
    "--quality",
    input.quality,
    "--media_dir",
    input.mediaDir
  ];
}

async function ensureDir(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
}

async function runOnce(
  pythonBin: string,
  args: string[],
  timeoutMs: number
): Promise<{ rawStdout: string; rawStderr: string; exitCode: number | null; timedOut: boolean }> {
  return await new Promise((resolve) => {
    const child = spawn(pythonBin, args, {
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, PYTHONUTF8: "1" }
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const t = setTimeout(() => {
      timedOut = true;
      // Best-effort kill; on Windows this may not kill subprocess tree, but it will stop the entrypoint.
      child.kill("SIGKILL");
    }, timeoutMs);

    child.stdout?.setEncoding("utf-8");
    child.stderr?.setEncoding("utf-8");
    child.stdout?.on("data", (d) => {
      stdout += String(d);
    });
    child.stderr?.on("data", (d) => {
      stderr += String(d);
    });

    child.on("close", (code) => {
      clearTimeout(t);
      resolve({ rawStdout: stdout, rawStderr: stderr, exitCode: code, timedOut });
    });
  });
}

/**
 * Phase 4: Manim Render Executor (NO AI)
 *
 * Responsibilities:
 * - Invoke Python Manim via child_process
 * - Capture stdout/stderr
 * - Detect render failure
 * - Extract metadata: totalDuration, sceneDurations, frameCount (from python JSON payload)
 * - Timeout + retry handling
 */
export async function runManimRenderExecutor(
  input: ManimRenderInput = {},
  options: ManimRenderOptions = {}
): Promise<RenderMetadata> {
  const resolved: Required<ManimRenderInput> = {
    scriptPath: input.scriptPath ?? "python/manim_renderer/storyboard_scene.py",
    sceneName: input.sceneName ?? "StoryboardScene",
    quality: input.quality ?? "low",
    mediaDir: input.mediaDir ?? "python/manim_renderer/media"
  };

  await ensureDir(resolved.mediaDir);

  const pythonBin = options.pythonBin ?? process.env.PYTHON ?? "python";
  const timeoutMs = options.timeoutMs ?? 10 * 60 * 1000;
  const retries = options.retries ?? 1;
  const backoffMs = options.backoffMs ?? 1500;

  const args = makeArgs(resolved);

  let lastError: unknown = undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      await sleep(attempt * backoffMs);
    }

    const { rawStdout, rawStderr, exitCode, timedOut } = await runOnce(
      pythonBin,
      args,
      timeoutMs
    );

    if (timedOut) {
      lastError = new Error(`MANIM_RENDER_TIMEOUT after ${timeoutMs}ms`);
      continue;
    }

    // Python prints a single JSON object to stdout even on failures.
    try {
      const parsed = JSON.parse(rawStdout) as unknown;
      const meta = RenderMetadataSchema.parse(parsed);

      // If Manim failed, treat as failure (retryable) but return metadata if no retries left.
      if (!meta.ok || meta.exitCode !== 0) {
        lastError = new Error(
          `MANIM_RENDER_FAILED: exitCode=${meta.exitCode}\n${meta.stderr || meta.stdout}`.trim()
        );
        if (attempt < retries) continue;
        throw lastError;
      }

      return meta;
    } catch (e) {
      // If stdout isn't valid JSON, fall back to including stderr/stdout context.
      lastError = new Error(
        `MANIM_RENDER_INVALID_PAYLOAD: ${String(e)}\nstdout:\n${rawStdout}\nstderr:\n${rawStderr}`.trim()
      );
      if (attempt < retries) continue;
      throw lastError;
    }
  }

  // Should be unreachable.
  throw lastError ?? new Error("MANIM_RENDER_FAILED: unknown error");
}

