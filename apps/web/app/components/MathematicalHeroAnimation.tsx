"use client";

import React from "react";

export const MathematicalHeroAnimation: React.FC = () => {
  return (
    <div 
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: -1,
        pointerEvents: "none",
        overflow: "hidden",
        opacity: 0.6
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 1000 1000"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Animated Grid lines */}
        <g stroke="rgba(168, 85, 247, 0.05)" strokeWidth="0.5">
          {[...Array(20)].map((_, i) => (
            <React.Fragment key={i}>
              <line x1="0" y1={i * 50} x2="1000" y2={i * 50} />
              <line x1={i * 50} y1="0" x2={i * 50} y2="1000" />
            </React.Fragment>
          ))}
        </g>

        {/* Central Axis */}
        <line x1="0" y1="500" x2="1000" y2="500" stroke="rgba(168, 85, 247, 0.1)" strokeWidth="1" />
        <line x1="500" y1="0" x2="500" y2="1000" stroke="rgba(168, 85, 247, 0.1)" strokeWidth="1" />

        {/* Floating Geometric Shapes */}
        <circle 
          cx="200" cy="300" r="80" 
          fill="none" 
          stroke="rgba(168, 85, 247, 0.2)" 
          strokeWidth="2" 
          strokeDasharray="10 5"
          style={{ animation: "rotate 20s linear infinite" }} 
        />
        
        <path 
          d="M 700 200 L 850 400 L 600 450 Z" 
          fill="none" 
          stroke="rgba(99, 102, 241, 0.2)" 
          strokeWidth="2"
          style={{ animation: "float 6s ease-in-out infinite" }}
        />

        <circle 
          cx="800" cy="700" r="120" 
          fill="none" 
          stroke="url(#grad1)" 
          strokeWidth="1.5"
          strokeDasharray="500"
          style={{ animation: "draw 10s ease-in-out infinite alternate" }}
        />

        {/* Floating Math Symbols */}
        <text x="150" y="750" fill="rgba(255,255,255,0.05)" fontSize="40" className="brand" style={{ animation: "float 8s ease-in-out infinite" }}>Σ</text>
        <text x="850" y="150" fill="rgba(255,255,255,0.05)" fontSize="50" className="brand" style={{ animation: "float 12s ease-in-out infinite reverse" }}>∞</text>
        <text x="450" y="200" fill="rgba(255,255,255,0.03)" fontSize="30" className="brand" style={{ animation: "float 10s ease-in-out infinite" }}>π</text>
        <text x="300" y="850" fill="rgba(255,255,255,0.04)" fontSize="35" className="brand" style={{ animation: "float 7s ease-in-out infinite" }}>∫</text>

        <defs>
          <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: "rgba(168, 85, 247, 0.3)", stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: "rgba(99, 102, 241, 0.3)", stopOpacity: 1 }} />
          </linearGradient>
        </defs>
      </svg>

      <style jsx>{`
        @keyframes rotate {
          from { transform: rotate(0deg); transform-origin: 200px 300px; }
          to { transform: rotate(360deg); transform-origin: 200px 300px; }
        }
        @keyframes draw {
          from { stroke-dashoffset: 500; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(-30px) translateX(10px); }
        }
      `}</style>
    </div>
  );
};
