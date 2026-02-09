"use client";

import { use } from "react";
import { VideoEditor } from "../../components/RunClient";

export default function EditorPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = use(params);

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "40px 32px", display: "grid", gap: 32 }}>
      <div>
        <a
          href={`/project/${runId}`}
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
          <span>←</span> Back to Project
        </a>
      </div>
      <VideoEditor runId={runId} />
    </div>
  );
}
