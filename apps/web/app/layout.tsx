import type { ReactNode } from "react";

export const metadata = {
  title: "VV Pipeline Dashboard",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "ui-sans-serif, system-ui", margin: 0 }}>
        <div style={{ padding: 16, borderBottom: "1px solid #e5e7eb" }}>
          <div style={{ fontWeight: 700 }}>VV Pipeline Dashboard</div>
          <div style={{ color: "#6b7280", fontSize: 12 }}>
            Step-by-step phase visibility · Manual re-run of any phase
          </div>
        </div>
        <div style={{ padding: 16 }}>{children}</div>
      </body>
    </html>
  );
}
