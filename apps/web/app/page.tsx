import { CreateProjectForm } from "./components/RunClient";
import { MathematicalHeroAnimation } from "./components/MathematicalHeroAnimation";

export default function HomePage() {
  return (
    <div style={{ paddingBottom: 100 }}>
      {/* Hero Section */}
      <section style={{ 
        minHeight: "85vh", 
        display: "flex", 
        flexDirection: "column", 
        justifyContent: "center", 
        alignItems: "center",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
        padding: "0 24px"
      }}>
        <MathematicalHeroAnimation />
        {/* Animated Background Mesh */}
        <div style={{
          position: "absolute",
          top: "-20%",
          left: "-10%",
          width: "120%",
          height: "140%",
          background: "radial-gradient(circle at 20% 30%, rgba(168, 85, 247, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(99, 102, 241, 0.15) 0%, transparent 50%)",
          filter: "blur(100px)",
          zIndex: -2
        }} />

        <div className="animate-fade-in" style={{ maxWidth: 800 }}>
          <div className="animate-fade-in" style={{ 
            display: "inline-block", 
            padding: "8px 16px", 
            borderRadius: "100px", 
            backgroundColor: "rgba(168, 85, 247, 0.1)", 
            color: "#a855f7", 
            fontSize: 13, 
            fontWeight: 700,
            marginBottom: 24,
            border: "1px solid rgba(168, 85, 247, 0.2)",
            animation: "float 4s ease-in-out infinite"
          }}>
            Powered by Gemini 3
          </div>
          <h1 style={{ 
            fontSize: "clamp(2.5rem, 8vw, 5rem)", 
            fontWeight: 800, 
            lineHeight: 1.1, 
            letterSpacing: "-0.04em", 
            margin: 0,
            backgroundImage: "linear-gradient(to right, #fff, #a1a1a1)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent"
          }}>
            Turn Algorithms into <br /> Cinematic Stories
          </h1>
          <p style={{ 
            fontSize: "clamp(1rem, 2vw, 1.25rem)", 
            color: "#888", 
            marginTop: 24, 
            maxWidth: 600, 
            marginInline: "auto",
            lineHeight: 1.6
          }}>
            Experience the most beautiful way to visualize computer science. 
            Vibe Video uses Gemini multimodal AI and Manim to create professional 
            educational videos in minutes.
          </p>
          <div style={{ marginTop: 40, display: "flex", gap: 16, justifyContent: "center" }}>
            <a href="#generate" style={{ 
              padding: "16px 32px", 
              borderRadius: 14, 
              backgroundColor: "#fff", 
              color: "#000", 
              fontWeight: 700, 
              fontSize: 16, 
              textDecoration: "none",
              transition: "transform 0.2s"
            }}>Create Video</a>
            <a href="#features" style={{ 
              padding: "16px 32px", 
              borderRadius: 14, 
              border: "1px solid #222", 
              color: "#fff", 
              fontWeight: 700, 
              fontSize: 16, 
              textDecoration: "none",
              backgroundColor: "rgba(255,255,255,0.03)"
            }}>Learn More</a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" style={{ maxWidth: 1200, margin: "100px auto", padding: "0 32px" }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <h2 style={{ fontSize: "2.5rem", fontWeight: 800, letterSpacing: "-0.02em" }}>Built for Mathematical Clarity</h2>
          <p style={{ color: "#888", fontSize: 18 }}>Everything you need to create high-quality educational content.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
          {[
            { title: "Gemini 3 Integration", desc: "Uses the latest multimodal capabilities for deep algorithm research and storyboard generation.", icon: "💎" },
            { title: "Manim Visuals", desc: "Native support for Grant Sanderson's Manim library, ensuring world-class mathematical animations.", icon: "🎨" },
            { title: "High-Accuracy TTS", desc: "Multiple providers including Deepgram, OpenAI, and Gemini for cristal-clear narration.", icon: "🎙️" },
            { title: "Iterative Refinement", desc: "Our AI critique loop fixes bugs and improves animation flow automatically.", icon: "🔄" },
            { title: "Background Processing", desc: "Generate complex long-form videos while you work on other tasks.", icon: "⚡" },
            { title: "Professional Export", desc: "Get studio-quality MP4 exports ready for YouTube, Education, or Social Media.", icon: "🎬" }
          ].map((f, i) => (
            <div key={i} className="glass" style={{ padding: 32, borderRadius: 24, transition: "transform 0.3s" }}>
              <div style={{ fontSize: 32, marginBottom: 16, animation: `float ${3 + i}s ease-in-out infinite`, display: "inline-block" }}>{f.icon}</div>
              <h3 style={{ fontSize: 20, marginBottom: 12 }}>{f.title}</h3>
              <p style={{ color: "#888", lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" style={{ backgroundColor: "#050505", padding: "120px 0" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <h2 style={{ fontSize: "2.5rem", fontWeight: 800, letterSpacing: "-0.02em" }}>The Vibe Pipeline</h2>
            <p style={{ color: "#888", fontSize: 18 }}>Four steps to go from a topic to a cinematic video.</p>
          </div>

          <div style={{ display: "grid", gap: 32 }}>
            {[
              { step: "01", title: "Algorithm Research", desc: "Gemini parses the topic and generates a deep technical document explaining the core concepts." },
              { step: "02", title: "Manim Codegen", desc: "Your video acts as a storyboard which is converted into a high-performance Manim script." },
              { step: "03", title: "AI Refinement", desc: "Our critique engine watches the rendered draft and fixes any glitches or timing issues." },
              { step: "04", title: "Professional Narration", desc: "Choose your voice and the system merges it with the finalized visuals." }
            ].map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 32, alignItems: "center", padding: "32px", borderRadius: 24, border: "1px solid #1a1a1a" }}>
                <div style={{ fontSize: 40, fontWeight: 800, color: "#333" }}>{s.step}</div>
                <div>
                  <h3 style={{ fontSize: 22, marginBottom: 8 }}>{s.title}</h3>
                  <p style={{ color: "#888", margin: 0, lineHeight: 1.6 }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Generate Section */}
      <section id="generate" style={{ maxWidth: 1000, margin: "140px auto", padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h2 style={{ fontSize: "3rem", fontWeight: 800, marginBottom: 16 }}>Ready to Vibe?</h2>
          <p style={{ color: "#888", fontSize: 18, maxWidth: 600, marginInline: "auto" }}>Enter a topic below and let the AI build your cinematic algorithm visualization.</p>
        </div>
        <div className="glass" style={{ padding: 40, borderRadius: 32 }}>
          <CreateProjectForm />
        </div>
      </section>
    </div>
  );
}
