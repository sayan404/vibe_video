import { loadRunState } from "../../../../../services/pipeline/export";

export const dynamic = "force-dynamic";

export default async function RunDetailsPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;
  const state = await loadRunState(runId);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div>
        <a
          href="/"
          style={{
            fontSize: 12,
            textDecoration: "underline",
            color: "#111827",
          }}
        >
          ← Back
        </a>
      </div>

      <div
        style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}
      >
        <div style={{ fontWeight: 700 }}>Run {state.runId}</div>
        <div style={{ fontSize: 12, color: "#6b7280" }}>
          {state.input.topic} · {state.input.targetAudience} ·{" "}
          {state.input.desiredDurationMinutes} min
        </div>
      </div>

      <div
        style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}
      >
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Artifacts</div>
        <pre
          style={{
            margin: 0,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            background: "#0b1020",
            color: "#e5e7eb",
            padding: 12,
            borderRadius: 8,
            fontSize: 12,
          }}
        >
          {JSON.stringify(state.artifacts, null, 2)}
        </pre>
      </div>

      <div
        style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}
      >
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Phase status</div>
        <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 12 }}>
          {JSON.stringify(state.phases, null, 2)}
        </pre>
      </div>
    </div>
  );
}
