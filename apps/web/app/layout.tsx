import type { ReactNode } from "react";

export const metadata = {
  title: "Vibe Video",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <style>{`
          :root {
            --accent: #a855f7;
            --accent-soft: rgba(168, 85, 247, 0.1);
            --bg: #030303;
            --card: #0a0a0a;
            --border: #1a1a1a;
            --text-secondary: #888888;
          }

          * {
            box-sizing: border-box;
            scrollbar-width: thin;
            scrollbar-color: #333 transparent;
          }

          body {
            font-family: 'Inter', ui-sans-serif, system-ui;
            background-color: var(--bg);
            color: #ededed;
            margin: 0;
            min-height: 100vh;
            overflow-x: hidden;
          }

          h1, h2, h3, .brand {
            font-family: 'Outfit', sans-serif;
          }

          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }

          @keyframes float {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
            100% { transform: translateY(0px); }
          }

          .animate-fade-in {
            animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }

          .glass {
            background: rgba(10, 10, 10, 0.7);
            backdrop-filter: blur(12px);
            border: 1px solid var(--border);
          }

          .back-link {
            transition: color 0.2s, transform 0.2s;
          }

          .back-link:hover {
            color: #fff !important;
            transform: translateX(-4px);
          }
        `}</style>
      </head>
      <body>
        <div className="glass" style={{ 
          padding: "16px 32px", 
          position: "sticky",
          top: 0,
          zIndex: 100,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <a href="/" style={{ textDecoration: "none", color: "inherit", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(45deg, #a855f7, #6366f1)", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 18 }}>V</div>
            <div className="brand" style={{ fontWeight: 800, fontSize: "1.4rem", letterSpacing: "-0.03em" }}>Vibe Video</div>
          </a>
          <nav style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <a href="/#features" style={{ color: "var(--text-secondary)", fontSize: 14, fontWeight: 500, textDecoration: "none" }}>Features</a>
            <a href="/#how-it-works" style={{ color: "var(--text-secondary)", fontSize: 14, fontWeight: 500, textDecoration: "none" }}>How it works</a>
            <a href="/dashboard" style={{ 
              backgroundColor: "#fff",
              color: "#000", 
              fontSize: 14, 
              fontWeight: 700, 
              textDecoration: "none",
              padding: "10px 20px",
              borderRadius: 12,
              transition: "transform 0.2s"
            }}>Dashboard</a>
          </nav>
        </div>
        <main>{children}</main>
      </body>
    </html>
  );
}
