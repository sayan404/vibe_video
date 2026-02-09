"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export type TargetAudience = "beginner" | "intermediate" | "advanced";
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

export type PhaseRecord = {
  status: "pending" | "running" | "success" | "error";
  startedAt?: string;
  finishedAt?: string;
  error?: { message: string; details?: unknown };
};

export type StoryboardFrame = {
  frameId: number;
  sceneTitle: string;
  visualElements: string[];
  animationIntent: string;
  voiceoverScript: string;
  durationSeconds: number;
};

export type RunState = {
  runId: string;
  createdAt: string;
  input: {
    topic: string;
    targetAudience: TargetAudience;
    desiredDurationMinutes: number;
  };
  phases: Record<string, PhaseRecord>;
  artifacts: Record<string, string | undefined>;
};

export const PHASES: ExportPhaseId[] = [
  "phase1_research",
  "phase2_storyboard",
  "phase3_5_complex_anim",
  "phase3_manim_codegen",
  "phase6_iteration",
  "phase4_manim_render",
  "phase5_video_critique",
  "phase7_export",
  "phase8_refinement",
  "phase9_audio"
];

export const VISIBLE_PHASES: ExportPhaseId[] = [
  "phase1_research",
  "phase2_storyboard",
  "phase3_5_complex_anim",
  "phase3_manim_codegen",
  "phase4_manim_render",
  "phase7_export",
  "phase8_refinement",
  "phase9_audio"
];

export function prettyPhase(id: string): string {
  return id.replace(/^phase\d+_/, "").replaceAll("_", " ");
}

export const COLORS = {
  success: "#ffffff",
  error: "#ff4444",
  running: "#a1a1a1",
  pending: "#1a1a1a",
  background: "#0a0a0a",
  card: "#111111",
  border: "#222222",
  textSecondary: "#a1a1a1",
};

// --- COMPONENTS ---

export function CreateProjectForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    topic: "",
    targetAudience: "beginner" as TargetAudience,
    desiredDurationMinutes: 2,
  });

  const canCreate = useMemo(() => form.topic.trim().length > 0, [form.topic]);

  async function createRun() {
    setLoading(true);
    try {
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(await res.text());
      const { run } = await res.json() as { run: RunState };
      
      // Trigger background generation
      fetch(`/api/runs/${run.runId}/runAll`, { method: "POST" }).catch(e => console.error("Failed to trigger runAll:", e));
      
      router.push(`/project/${run.runId}`);
    } catch (e) {
      alert(String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      className="glass"
      style={{ 
        borderRadius: 24, 
        padding: 40,
        boxShadow: "0 20px 50px rgba(0,0,0,0.5)"
      }}
    >
      <div className="brand" style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: 32, letterSpacing: "-0.02em" }}>New Video Project</div>
      <div style={{ display: "grid", gap: 24, maxWidth: 640 }}>
        <label style={{ display: "grid", gap: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.textSecondary, textTransform: "uppercase", letterSpacing: "0.1em" }}>Topic</div>
          <input
            value={form.topic}
            onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
            style={{
              padding: "16px",
              backgroundColor: "#000",
              border: `1px solid ${COLORS.border}`,
              borderRadius: 12,
              color: "white",
              fontSize: 16,
              outline: "none",
              transition: "border-color 0.2s"
            }}
            onFocus={(e) => e.target.style.borderColor = "#ffffff"}
            onBlur={(e) => e.target.style.borderColor = COLORS.border}
            placeholder="e.g. How Black Holes Warp Time"
          />
        </label>

        <div style={{ display: "flex", gap: 20 }}>
          <label style={{ display: "grid", gap: 8, flex: 2 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.textSecondary, textTransform: "uppercase", letterSpacing: "0.1em" }}>Audience</div>
            <div style={{ position: "relative" }}>
              <select
                value={form.targetAudience}
                onChange={(e) => setForm((f) => ({ ...f, targetAudience: e.target.value as TargetAudience }))}
                style={{
                  width: "100%",
                  padding: "16px",
                  paddingRight: "40px",
                  backgroundColor: "#000",
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 12,
                  color: "white",
                  fontSize: 16,
                  outline: "none",
                  appearance: "none",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
                onFocus={(e) => e.target.style.borderColor = "#ffffff"}
                onBlur={(e) => e.target.style.borderColor = COLORS.border}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
              <div style={{ 
                position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", 
                pointerEvents: "none", color: COLORS.textSecondary, fontSize: 12 
              }}>▼</div>
            </div>
          </label>

          <label style={{ display: "grid", gap: 8, flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.textSecondary, textTransform: "uppercase", letterSpacing: "0.1em" }}>Duration</div>
            <div style={{ position: "relative" }}>
              <input
                type="number"
                min={1}
                value={form.desiredDurationMinutes}
                onChange={(e) => setForm((f) => ({ ...f, desiredDurationMinutes: Number(e.target.value) }))}
                style={{
                  width: "100%",
                  padding: "16px",
                  backgroundColor: "#000",
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 12,
                  color: "white",
                  fontSize: 16,
                  outline: "none"
                }}
              />
              <span style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: COLORS.textSecondary }}>min</span>
            </div>
          </label>
        </div>

        <button
          disabled={!canCreate || loading}
          onClick={() => void createRun()}
          style={{
            marginTop: 12,
            padding: "20px",
            borderRadius: 16,
            border: `1px solid ${canCreate ? "#fff" : "rgba(255,255,255,0.1)"}`,
            backgroundColor: canCreate && !loading ? "#fff" : "rgba(255,255,255,0.05)",
            color: canCreate && !loading ? "#000" : "rgba(255,255,255,0.3)",
            fontWeight: 800,
            fontSize: 16,
            cursor: canCreate && !loading ? "pointer" : "not-allowed",
            transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
            boxShadow: canCreate && !loading ? "0 10px 30px rgba(255,255,255,0.15)" : "none",
            opacity: loading ? 0.7 : 1
          }}
          onMouseEnter={(e) => { 
            if (canCreate && !loading) {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 15px 40px rgba(255,255,255,0.2)";
            }
          }}
          onMouseLeave={(e) => { 
            if (canCreate && !loading) {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 10px 30px rgba(255,255,255,0.15)";
            }
          }}
        >
          {loading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
              <div style={{ width: 16, height: 16, border: "2px solid rgba(0,0,0,0.1)", borderTopColor: "#000", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
              <span>Initializing...</span>
            </div>
          ) : "Begin Generation"}
        </button>
      </div>
    </section>
  );
}

export function ActiveProjectsList() {
  const [runs, setRuns] = useState<RunState[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    const res = await fetch("/api/runs", { cache: "no-store" });
    const json = (await res.json()) as { runs: RunState[] };
    setRuns(json.runs);
    setLoading(false);
  }

  useEffect(() => { refresh(); }, []);

  return (
    <section style={{ display: "grid", gap: 32 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h2 className="brand" style={{ fontSize: "2rem", fontWeight: 800, margin: 0, letterSpacing: "-0.03em" }}>Active Projects</h2>
          <p style={{ fontSize: 15, color: COLORS.textSecondary, marginTop: 6 }}>Manage and track your video generation pipelines</p>
        </div>
        <button
          onClick={() => void refresh()}
          disabled={loading}
          style={{ 
            padding: "12px 24px", borderRadius: 12, border: `1px solid ${COLORS.border}`, 
            backgroundColor: "rgba(255,255,255,0.03)", color: "white", cursor: "pointer", fontSize: 13, fontWeight: 600,
            transition: "all 0.2s"
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.08)"}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.03)"}
        >
          {loading ? "Syncing..." : "Refresh Catalog"}
        </button>
      </div>

      <div style={{ display: "grid", gap: 16 }}>
        {!runs ? (
          <div style={{ padding: 40, textAlign: "center", color: COLORS.textSecondary }}>Loading projects...</div>
        ) : runs.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center", backgroundColor: COLORS.card, borderRadius: 16, border: `1px dashed ${COLORS.border}` }}>
            <p style={{ color: COLORS.textSecondary }}>No projects yet.</p>
            <a href="/" style={{ color: "#fff", fontWeight: 600, fontSize: 14 }}>Create your first project →</a>
          </div>
        ) : (
          runs.map(run => (
            <div key={run.runId} 
              className="glass"
              style={{ 
                borderRadius: 20, padding: 28, display: "flex", justifyContent: "space-between", alignItems: "center",
                transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                cursor: "default"
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.01)"; e.currentTarget.style.borderColor = "#333"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.borderColor = COLORS.border; }}
            >
              <div>
                <div className="brand" style={{ fontSize: "1.2rem", fontWeight: 700 }}>{run.input.topic}</div>
                <div style={{ fontSize: 13, color: COLORS.textSecondary, marginTop: 6, display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ backgroundColor: "rgba(255,255,255,0.05)", padding: "2px 8px", borderRadius: 4 }}>{run.input.targetAudience.toUpperCase()}</span>
                  <span>·</span>
                  <span>{run.input.desiredDurationMinutes}m</span>
                  <span>·</span>
                  <span>{new Date(run.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <a href={`/project/${run.runId}`} style={{ 
                padding: "12px 24px", borderRadius: 12, backgroundColor: "#fff", color: "#000", 
                textDecoration: "none", fontWeight: 800, fontSize: 14, boxShadow: "0 4px 12px rgba(255,255,255,0.1)"
              }}>
                Track Pipeline
              </a>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export function ProjectProgressTracking({ runId, isDev = false }: { runId: string, isDev?: boolean }) {
  const [run, setRun] = useState<RunState | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchState = async () => {
    try {
      const res = await fetch(`/api/runs/${encodeURIComponent(runId)}`);
      const json = await res.json();
      setRun(json.run || json); // API structure might vary
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchState();
    const timer = setInterval(fetchState, 60000); // Poll every 1 minute
    return () => clearInterval(timer);
  }, [runId]);

  const progress = useMemo(() => {
    if (!run) return 0;
    const completed = VISIBLE_PHASES.filter(p => run.phases[p]?.status === "success").length;
    return Math.floor((completed / VISIBLE_PHASES.length) * 100);
  }, [run]);

  async function runPhase(phase: ExportPhaseId) {
    setLoading(true);
    await fetch(`/api/runs/${encodeURIComponent(runId)}/phase/${encodeURIComponent(phase)}`, { method: "POST" });
    await fetchState();
    setLoading(false);
  }

  if (!run) return <div style={{ color: COLORS.textSecondary }}>Connecting to pipeline...</div>;

  const isAnyPhaseRunning = Object.values(run.phases).some(p => p.status === "running");

  return (
    <div style={{ display: "grid", gap: 32 }}>
      <header>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
          <div>
            <h1 className="brand" style={{ fontSize: "2.5rem", fontWeight: 800, margin: 0, letterSpacing: "-0.04em" }}>{run.input.topic}</h1>
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12 }}>
               <div style={{ padding: "4px 12px", borderRadius: 100, backgroundColor: "rgba(168, 85, 247, 0.1)", color: "#a855f7", fontSize: 12, fontWeight: 700 }}>{run.input.targetAudience.toUpperCase()}</div>
               <div style={{ color: COLORS.textSecondary, fontSize: 14, fontWeight: 500 }}>{run.input.desiredDurationMinutes} MINUTE STORYBOARD</div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "3.5rem", fontWeight: 800, lineHeight: 1, letterSpacing: "-0.05em" }}>{progress}<span style={{ fontSize: "1.5rem", color: "#444" }}>%</span></div>
            <div style={{ fontSize: 11, color: COLORS.textSecondary, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 4 }}>Pipeline Flow</div>
          </div>
        </div>

        {isAnyPhaseRunning && (
          <div style={{ 
            marginTop: 16, padding: "12px 20px", backgroundColor: "#111", border: "1px solid #333", 
            borderRadius: 12, display: "flex", alignItems: "center", gap: 12 
          }}>
            <div style={{ width: 12, height: 12, border: "2px solid #555", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
            <span style={{ fontSize: 13, color: "#fff", fontWeight: 500 }}>System Status: Processing in background (Next update in 1m)</span>
          </div>
        )}

        {/* Progress Bar */}
        <div style={{ height: 8, backgroundColor: "#1a1a1a", borderRadius: 4, marginTop: 24, overflow: "hidden" }}>
          <div style={{ 
            height: "100%", backgroundColor: "#fff", width: `${progress}%`, 
            transition: "width 1s cubic-bezier(0.4, 0, 0.2, 1)",
            boxShadow: "0 0 20px rgba(255,255,255,0.4)"
          }} />
        </div>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
        {VISIBLE_PHASES.map((p) => {
          const rec = run.phases[p] ?? { status: "pending" };
          const isProcessing = rec.status === "running";
          const isSuccess = rec.status === "success";

          return (
            <div key={p} style={{ 
              padding: 24, backgroundColor: COLORS.card, border: `1px solid ${isProcessing ? "#fff" : COLORS.border}`, 
              borderRadius: 20, display: "flex", flexDirection: "column", gap: 16 
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: rec.status === "pending" ? COLORS.textSecondary : "#fff", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {prettyPhase(p)}
                </span>
                {!isDev && rec.status === "error" && (
                  <button 
                    onClick={() => runPhase(p)} 
                    disabled={loading || isProcessing}
                    style={{ background: "none", border: "none", color: COLORS.error, cursor: "pointer", fontSize: 18 }}
                  >↻</button>
                )}
              </div>
              
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ 
                  width: 8, height: 8, borderRadius: "50%", 
                  backgroundColor: isSuccess ? "#fff" : isProcessing ? "#fff" : "#222",
                  animation: isProcessing ? "pulse 1.5s infinite" : "none"
                }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: isSuccess ? "#fff" : COLORS.textSecondary }}>
                  {rec.status.toUpperCase()}
                </span>
              </div>

              {rec.error && <p style={{ fontSize: 11, color: COLORS.error, margin: 0 }}>{rec.error.message.split(":")[0]}</p>}
            </div>
          );
        })}
      </div>

      {run.artifacts.renderedVideoPath && (
        <div style={{ 
          padding: 32, backgroundColor: "#fff", color: "#000", borderRadius: 24, 
          display: "flex", justifyContent: "space-between", alignItems: "center",
          boxShadow: "0 20px 40px rgba(255,255,255,0.1)"
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>Generation Complete</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, marginTop: 4 }}>Your video is ready for editing</div>
          </div>
          <a href={`/editor/${run.runId}`} style={{ 
            padding: "16px 32px", borderRadius: 12, backgroundColor: "#000", color: "#fff", 
            textDecoration: "none", fontWeight: 700, fontSize: 15, transition: "transform 0.2s"
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.05)"}
          onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
          >
            Open Video Editor →
          </a>
        </div>
      )}

      <style jsx global>{`
        @keyframes pulse {
          0% { opacity: 0.3; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1.1); }
          100% { opacity: 0.3; transform: scale(0.9); }
        }
      `}</style>
    </div>
  );
}

export function VideoEditor({ runId }: { runId: string }) {
  const [run, setRun] = useState<RunState | null>(null);
  const [selectedScene, setSelectedScene] = useState<number>(0);
  const [refinePrompt, setRefinePrompt] = useState("");
  const [refining, setRefining] = useState(false);
  const [videoKey, setVideoKey] = useState(0); // For video refresh
  const [storyboard, setStoryboard] = useState<StoryboardFrame[] | null>(null);

  const fetchState = async () => {
    const res = await fetch(`/api/runs/${encodeURIComponent(runId)}`);
    const json = await res.json();
    const runData = json.run || json;
    setRun(runData);

    // If storyboard exists, fetch it
    if (runData.artifacts.storyboardJson) {
      try {
        const sRes = await fetch(`/api/runs/${runId}/artifact?key=storyboardJson`);
        if (sRes.ok) {
          const sJson = await sRes.json();
          setStoryboard(sJson);
        }
      } catch (e) {
        console.error("Failed to fetch storyboard:", e);
      }
    }
  };

  useEffect(() => {
    fetchState();
  }, [runId]);

  async function handleRefine() {
    if (!refinePrompt.trim()) return;
    setRefining(true);
    try {
      const res = await fetch(`/api/runs/${encodeURIComponent(runId)}/refine`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: refinePrompt })
      });
      if (!res.ok) throw new Error(await res.text());
      await fetchState();
      setVideoKey(v => v + 1); // Force video reload
      setRefinePrompt("");
    } catch (e) {
      alert("Refinement failed: " + String(e));
    } finally {
      setRefining(false);
    }
  }

  if (!run) return <div style={{ color: COLORS.textSecondary }}>Loading Editor...</div>;

  const isProcessing = refining || Object.values(run.phases).some(p => p.status === "running");

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 32, minHeight: "80vh" }}>
      {/* Main Player Area */}
      <div style={{ display: "grid", gap: 32 }}>
        <div className="glass" style={{ 
          borderRadius: 32, 
          overflow: "hidden", 
          aspectRatio: "16/9",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: isProcessing ? "0 0 80px rgba(168, 85, 247, 0.15)" : "0 40px 100px rgba(0,0,0,0.8)",
          transition: "all 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
          backgroundColor: "#000"
        }}>
          {isProcessing ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 50, height: 50, border: "4px solid rgba(255,255,255,0.05)", borderTopColor: "#a855f7", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 24px" }} />
              <div className="brand" style={{ color: "#fff", fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", fontSize: 14 }}>Refining Cinema...</div>
              <div style={{ color: COLORS.textSecondary, fontSize: 13, marginTop: 12, maxWidth: 300, marginInline: "auto" }}>Gemini is recrafting your mathematical visualization.</div>
            </div>
          ) : (
            <video 
              key={videoKey}
              src={`/api/runs/${runId}/video?v=${videoKey}`} 
              controls 
              autoPlay
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          )}
        </div>

        <div style={{ backgroundColor: COLORS.card, borderRadius: 24, padding: 32, border: `1px solid ${COLORS.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>Project Metadata</h2>
              <p style={{ color: COLORS.textSecondary, fontSize: 14, marginTop: 4 }}>Details and generated assets</p>
            </div>
            {run.phases.phase8_refinement?.status === "success" && (
              <div style={{ padding: "6px 14px", backgroundColor: "#fff", color: "#000", fontSize: 11, fontWeight: 800, borderRadius: 20, textTransform: "uppercase" }}>
                ✓ AI Refined
              </div>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <div style={{ padding: 20, backgroundColor: "#000", borderRadius: 16, border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.textSecondary, textTransform: "uppercase", marginBottom: 8 }}>Topic</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{run.input.topic}</div>
            </div>
            <div style={{ padding: 20, backgroundColor: "#000", borderRadius: 16, border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.textSecondary, textTransform: "uppercase", marginBottom: 8 }}>Audience</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{run.input.targetAudience.toUpperCase()}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar: Refinement & Scenes */}
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {/* Refinement Prompt (The Magic Box) */}
        <div className="glass" style={{ 
          borderRadius: 28, 
          padding: 28, 
          border: `1px solid ${refinePrompt ? "rgba(168, 85, 247, 0.5)" : COLORS.border}`,
          boxShadow: refinePrompt ? "0 0 40px rgba(168, 85, 247, 0.1)" : "none",
          transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ fontSize: 18 }}>✨</div>
            <h3 className="brand" style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0 }}>Magic Refinement</h3>
          </div>
          <textarea
            value={refinePrompt}
            onChange={(e) => setRefinePrompt(e.target.value)}
            placeholder="Suggest a change... (e.g. 'Add a glow to the rotating sphere')"
            style={{
              width: "100%",
              minHeight: 120,
              backgroundColor: "rgba(0,0,0,0.3)",
              border: `1px solid ${COLORS.border}`,
              borderRadius: 16,
              padding: 16,
              color: "#fff",
              fontSize: 14,
              resize: "none",
              outline: "none",
              fontFamily: "inherit",
              lineHeight: 1.5,
              transition: "border-color 0.3s"
            }}
            onFocus={(e) => e.target.style.borderColor = "#a855f7"}
            onBlur={(e) => e.target.style.borderColor = COLORS.border}
          />
          <button
            onClick={handleRefine}
            disabled={!refinePrompt.trim() || refining}
            style={{
              width: "100%",
              marginTop: 16,
              padding: "16px",
              borderRadius: 16,
              backgroundColor: refinePrompt.trim() && !refining ? "#a855f7" : "#111",
              color: refinePrompt.trim() && !refining ? "#fff" : "#444",
              border: "none",
              fontWeight: 800,
              fontSize: 14,
              cursor: refinePrompt.trim() && !refining ? "pointer" : "not-allowed",
              transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
              boxShadow: refinePrompt.trim() && !refining ? "0 8px 16px rgba(168, 85, 247, 0.2)" : "none"
            }}
            onMouseEnter={(e) => { if (refinePrompt.trim() && !refining) e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={(e) => { if (refinePrompt.trim() && !refining) e.currentTarget.style.transform = "translateY(0)"; }}
          >
            {refining ? "Applying Magic..." : "Apply AI Changes"}
          </button>
        </div>

        <div className="glass" style={{ 
          flex: 1, 
          borderRadius: 28, 
          padding: 28, 
          display: "flex",
          flexDirection: "column",
          minHeight: 0
        }}>
          <div style={{ marginBottom: 24 }}>
            <h3 className="brand" style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0 }}>Storyboard</h3>
            <p style={{ color: COLORS.textSecondary, fontSize: 13, marginTop: 4 }}>Sequential scene breakdown</p>
          </div>
          
          <div 
            className="custom-scrollbar"
            style={{ 
              display: "grid", 
              gap: 12, 
              overflowY: "auto", 
              overflowX: "hidden",
              paddingRight: 12,
              flex: 1
            }}
          >
            {!storyboard ? (
              <div style={{ color: COLORS.textSecondary, fontSize: 13, padding: 20 }}>Loading scenes...</div>
            ) : storyboard.length === 0 ? (
              <div style={{ color: COLORS.textSecondary, fontSize: 13, padding: 20 }}>No scenes found.</div>
            ) : (
              storyboard.map((f, idx) => (
                <div 
                  key={f.frameId}
                  // onClick={() => setSelectedScene(idx)}
                  style={{ 
                    padding: 20, 
                    backgroundColor: "rgba(255,255,255,0.03)", 
                    color: "#fff",
                    borderRadius: 18, 
                    border: `1px solid ${COLORS.border}`,
                    cursor: "pointer",
                    transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                    transform: selectedScene === idx ? "scale(1.02)" : "scale(1)"
                  }}
                >
                  <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", opacity: selectedScene === idx ? 0.9 : 0.6 }}>Scene 0{f.frameId}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginTop: 6, lineHeight: 1.4 }}>{f.sceneTitle}</div>
                  <div style={{ fontSize: 11, fontWeight: 500, marginTop: 4, opacity: 0.6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.voiceoverScript.slice(0, 40) + "..."}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(168, 85, 247, 0.4);
        }
        /* For Firefox */
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
        }
      `}</style>
    </div>
  );
}

export function RunClient() {
  // Legacy main entry point - used for the dashboard view for now
  return <ActiveProjectsList />;
}
