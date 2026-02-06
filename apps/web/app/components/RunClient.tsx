"use client";

import { useEffect, useMemo, useState } from "react";

type TargetAudience = "beginner" | "intermediate" | "advanced";
type ExportPhaseId =
  | "phase1_research"
  | "phase2_storyboard"
  | "phase3_manim_codegen"
  | "phase4_manim_render"
  | "phase5_video_critique"
  | "phase6_iteration"
  | "phase7_export";

type PhaseRecord = {
  status: "pending" | "running" | "success" | "error";
  startedAt?: string;
  finishedAt?: string;
  error?: { message: string; details?: unknown };
};

type RunState = {
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

const PHASES: ExportPhaseId[] = [
  "phase1_research",
  "phase2_storyboard",
  "phase3_manim_codegen",
  "phase6_iteration",
  "phase4_manim_render",
  "phase5_video_critique",
  "phase7_export",
];

function prettyPhase(id: string): string {
  return id.replaceAll("_", " ");
}

export function RunClient() {
  const [runs, setRuns] = useState<RunState[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    topic: "",
    targetAudience: "beginner" as TargetAudience,
    desiredDurationMinutes: 6,
  });

  const canCreate = useMemo(() => form.topic.trim().length > 0, [form.topic]);

  async function refresh() {
    const res = await fetch("/api/runs", { cache: "no-store" });
    const json = (await res.json()) as { runs: RunState[] };
    setRuns(json.runs);
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function createRun() {
    setLoading(true);
    try {
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(await res.text());
      await refresh();
    } finally {
      setLoading(false);
    }
  }

  async function runAll(runId: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/runs/${encodeURIComponent(runId)}/runAll`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(await res.text());
      await refresh();
    } finally {
      setLoading(false);
    }
  }

  async function runPhase(runId: string, phase: ExportPhaseId) {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/runs/${encodeURIComponent(runId)}/phase/${encodeURIComponent(
          phase
        )}`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error(await res.text());
      await refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div
        style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}
      >
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Create run</div>
        <div style={{ display: "grid", gap: 8, maxWidth: 560 }}>
          <label style={{ display: "grid", gap: 4 }}>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Topic</div>
            <input
              value={form.topic}
              onChange={(e) =>
                setForm((f) => ({ ...f, topic: e.target.value }))
              }
              style={{
                padding: 8,
                border: "1px solid #d1d5db",
                borderRadius: 6,
              }}
              placeholder="e.g. Binary search"
            />
          </label>

          <div style={{ display: "flex", gap: 8 }}>
            <label style={{ display: "grid", gap: 4, flex: 1 }}>
              <div style={{ fontSize: 12, color: "#6b7280" }}>
                Target audience
              </div>
              <select
                value={form.targetAudience}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    targetAudience: e.target.value as TargetAudience,
                  }))
                }
                style={{
                  padding: 8,
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                }}
              >
                <option value="beginner">beginner</option>
                <option value="intermediate">intermediate</option>
                <option value="advanced">advanced</option>
              </select>
            </label>

            <label style={{ display: "grid", gap: 4, width: 200 }}>
              <div style={{ fontSize: 12, color: "#6b7280" }}>
                Duration (min)
              </div>
              <input
                type="number"
                min={1}
                value={form.desiredDurationMinutes}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    desiredDurationMinutes: Number(e.target.value),
                  }))
                }
                style={{
                  padding: 8,
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                }}
              />
            </label>
          </div>

          <button
            disabled={!canCreate || loading}
            onClick={() => void createRun()}
            style={{
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid #111827",
              background: canCreate && !loading ? "#111827" : "#9ca3af",
              color: "white",
              fontWeight: 600,
              cursor: canCreate && !loading ? "pointer" : "not-allowed",
            }}
          >
            Create run
          </button>
        </div>
      </div>

      <div
        style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}
      >
        <div
          style={{ display: "flex", justifyContent: "space-between", gap: 12 }}
        >
          <div>
            <div style={{ fontWeight: 700 }}>Runs</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>
              Uses local file-backed run state in `runs/`
            </div>
          </div>
          <button
            disabled={loading}
            onClick={() => void refresh()}
            style={{
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid #d1d5db",
              background: "white",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            Refresh
          </button>
        </div>

        {runs === null ? (
          <div style={{ padding: 12, color: "#6b7280" }}>Loading…</div>
        ) : runs.length === 0 ? (
          <div style={{ padding: 12, color: "#6b7280" }}>No runs yet.</div>
        ) : (
          <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
            {runs.map((r) => (
              <div
                key={r.runId}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  padding: 12,
                  display: "grid",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700 }}>{r.input.topic}</div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>
                      Run {r.runId} · {r.input.targetAudience} ·{" "}
                      {r.input.desiredDurationMinutes} min
                    </div>
                  </div>
                  <div
                    style={{ display: "flex", gap: 8, alignItems: "center" }}
                  >
                    <a
                      href={`/runs/${encodeURIComponent(r.runId)}`}
                      style={{
                        fontSize: 12,
                        textDecoration: "underline",
                        color: "#111827",
                      }}
                    >
                      Details
                    </a>
                    <button
                      disabled={loading}
                      onClick={() => void runAll(r.runId)}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 8,
                        border: "1px solid #111827",
                        background: "#111827",
                        color: "white",
                        cursor: loading ? "not-allowed" : "pointer",
                        fontWeight: 600,
                      }}
                    >
                      Run all
                    </button>
                  </div>
                </div>

                <div style={{ display: "grid", gap: 6 }}>
                  {PHASES.map((p) => {
                    const rec = r.phases[p] ?? { status: "pending" };
                    const color =
                      rec.status === "success"
                        ? "#16a34a"
                        : rec.status === "error"
                        ? "#dc2626"
                        : rec.status === "running"
                        ? "#2563eb"
                        : "#6b7280";
                    return (
                      <div
                        key={p}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 10,
                          padding: "6px 8px",
                          border: "1px solid #f3f4f6",
                          borderRadius: 6,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            alignItems: "center",
                          }}
                        >
                          <div
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: 99,
                              background: color,
                            }}
                          />
                          <div style={{ fontSize: 13 }}>{prettyPhase(p)}</div>
                          <div style={{ fontSize: 12, color: "#6b7280" }}>
                            {rec.status}
                          </div>
                          {rec.error ? (
                            <div style={{ fontSize: 12, color: "#dc2626" }}>
                              {rec.error.message}
                            </div>
                          ) : null}
                        </div>
                        <button
                          disabled={loading || rec.status === "running"}
                          onClick={() => void runPhase(r.runId, p)}
                          style={{
                            padding: "6px 8px",
                            borderRadius: 8,
                            border: "1px solid #d1d5db",
                            background: "white",
                            cursor:
                              loading || rec.status === "running"
                                ? "not-allowed"
                                : "pointer",
                            fontSize: 12,
                          }}
                        >
                          Run phase
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  Final outputs:{" "}
                  {r.artifacts.renderedVideoPath ? (
                    <span>video at {r.artifacts.renderedVideoPath}</span>
                  ) : (
                    <span>(not rendered yet)</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
