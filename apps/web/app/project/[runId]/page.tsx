"use client";

import { use } from "react";
import { ProjectProgressTracking } from "../../components/RunClient";

export default function ProjectPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = use(params);
  
  // You can toggle isDev here or via a search param/env
  const isDev = false; 

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 32px", display: "grid", gap: 32 }}>
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
          <span>←</span> View All Projects
        </a>
      </div>
      <ProjectProgressTracking runId={runId} isDev={isDev} />
    </div>
  );
}
