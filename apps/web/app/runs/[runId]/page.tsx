import { loadRunState } from "../../../../../services/pipeline/export";

export const dynamic = "force-dynamic";

const COLORS = {
  card: "#111111",
  border: "#222222",
  textSecondary: "#a1a1a1",
};

export default async function RunDetailsPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;
  const state = await loadRunState(runId);

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 32px", display: "grid", gap: 32 }}>
      <div>
        <a
          href="/dashboard"
          className="brand back-link"
          style={{
            fontSize: 14,
            textDecoration: "none",
            color: "var(--text-secondary)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontWeight: 700,
            marginBottom: 32
          }}
        >
          <span>←</span> Back to Dashboard
        </a>
      </div>

      <header
        className="glass"
        style={{ 
          borderRadius: 24, 
          padding: 32 
        }}
      >
        <div style={{ fontSize: 13, color: COLORS.textSecondary, marginBottom: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>Reference ID: {state.runId}</div>
        <div className="brand" style={{ fontSize: "2rem", fontWeight: 800, color: "#fff", letterSpacing: "-0.03em" }}>{state.input.topic}</div>
        <div style={{ fontSize: 13, color: COLORS.textSecondary, marginTop: 16, display: "flex", gap: 12 }}>
          <span>Created: {new Date(state.createdAt).toLocaleString()}</span>
        </div>
      </header>

      <section
        className="glass"
        style={{ 
          borderRadius: 24, 
          padding: 32 
        }}
      >
        <div className="brand" style={{ fontWeight: 800, marginBottom: 24, fontSize: "1.2rem", letterSpacing: "-0.02em" }}>System Artifacts</div>
        <pre
          style={{
            margin: 0,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            background: "rgba(0,0,0,0.3)",
            color: "#a1a1a1",
            padding: 24,
            borderRadius: 16,
            border: `1px solid ${COLORS.border}`,
            fontSize: 12,
            lineHeight: 1.6,
            fontFamily: "ui-monospace, monospace"
          }}
        >
          {JSON.stringify(state.artifacts, null, 2)}
        </pre>
      </section>

      <section
        className="glass"
        style={{ 
          borderRadius: 24, 
          padding: 32 
        }}
      >
        <div className="brand" style={{ fontWeight: 800, marginBottom: 24, fontSize: "1.2rem", letterSpacing: "-0.02em" }}>Phase Execution Log</div>
        <pre
          style={{
            margin: 0,
            whiteSpace: "pre-wrap",
            background: "rgba(0,0,0,0.3)",
            color: "#a1a1a1",
            padding: 24,
            borderRadius: 16,
            border: `1px solid ${COLORS.border}`,
            fontSize: 12,
            lineHeight: 1.6,
            fontFamily: "ui-monospace, monospace"
          }}
        >
          {JSON.stringify(state.phases, null, 2)}
        </pre>
      </section>
    </div>
  );
}
