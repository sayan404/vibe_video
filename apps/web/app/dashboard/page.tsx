import { ActiveProjectsList } from "../components/RunClient";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 32px", display: "grid", gap: 32 }}>
       <div>
        <a
          href="/"
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
          <span>←</span> Back to Creation
        </a>
      </div>
      <ActiveProjectsList />
    </div>
  );
}
