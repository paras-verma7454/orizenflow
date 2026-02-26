"use client";

import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
  Easing,
} from "remotion";

const COLORS = {
  bg: "#09090B",
  fg: "#FAFAFA",
  muted: "#71717A",
  accent: "#3B82F6",
  accentLight: "#60A5FA",
  border: "#27272A",
  emerald: "#22C55E",
};

const EASE = { extrapolateRight: "clamp" as const, extrapolateLeft: "clamp" as const };

export const PromoVideo = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      <BgEffects />
      
      <Sequence from={0} durationInFrames={150}>
        <Hero />
      </Sequence>

      <Sequence from={150} durationInFrames={150}>
        <Problem />
      </Sequence>

      <Sequence from={300} durationInFrames={150}>
        <Solution />
      </Sequence>

      <Sequence from={450} durationInFrames={150}>
        <Features />
      </Sequence>

      <Sequence from={600} durationInFrames={90}>
        <CTA />
      </Sequence>
    </AbsoluteFill>
  );
};

const BgEffects = () => {
  const frame = useCurrentFrame();
  
  const orbOpacity = interpolate(frame, [0, 30], [0, 0.8], EASE);
  
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          top: -200,
          right: -200,
          width: 800,
          height: 800,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(34,197,94,0.12) 0%, transparent 60%)",
          filter: "blur(60px)",
          opacity: orbOpacity,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -300,
          left: -200,
          width: 900,
          height: 900,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 60%)",
          filter: "blur(80px)",
          opacity: orbOpacity,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "150%",
          height: "150%",
          background: "radial-gradient(ellipse at center, transparent 0%, rgba(9,9,11,0.3) 70%)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
};

const Hero = () => {
  const frame = useCurrentFrame();

  const words = [
    { text: "Evidence-based hiring,", className: "" },
    { text: "not resume guessing.", className: "" },
  ];

  const wordsLengths = words.map(w => w.text.length);
  const totalChars = wordsLengths.reduce((a, b) => a + b, 0);
  const charsPerFrame = 1.2;
  const typedCount = Math.min(totalChars, Math.floor(frame * charsPerFrame));
  
  const cursorBlink = Math.floor(frame / 15) % 2;

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ 
          fontSize: 85, 
          fontWeight: 700, 
          letterSpacing: "-0.04em",
          fontFamily: "system-ui, -apple-system, sans-serif",
          lineHeight: 1.15,
        }}>
          {words.map((word, wordIdx) => {
            const wordChars = word.text.split("");
            const prevWordsLength = wordsLengths.slice(0, wordIdx).reduce((a, b) => a + b, 0);
            const visibleChars = Math.max(0, Math.min(wordChars.length, typedCount - prevWordsLength));
            
            const isSecondLine = wordIdx === 1;
            const isCurrentLine = typedCount >= prevWordsLength && typedCount < prevWordsLength + wordChars.length;
            
            return (
              <div key={wordIdx} style={{ overflow: "hidden", marginBottom: 8 }}>
                <span style={{ display: "inline-block" }}>
                  {wordChars.slice(0, visibleChars).map((char, charIdx) => {
                    const isNotResume = isSecondLine && charIdx < 10;
                    return (
                      <span 
                        key={charIdx} 
                        style={{ 
                          color: isNotResume ? COLORS.muted : COLORS.fg,
                          textDecoration: isNotResume ? "line-through" : "none",
                        }}
                      >
                        {char}
                      </span>
                    );
                  })}
                  {isCurrentLine && (
                    <span style={{ 
                      display: "inline-block", 
                      width: 4, 
                      height: "0.9em", 
                      backgroundColor: COLORS.fg, 
                      marginLeft: 1,
                      verticalAlign: "middle",
                      opacity: cursorBlink === 0 ? 1 : 0,
                    }} />
                  )}
                </span>
              </div>
            );
          })}
        </div>

        <div style={{ 
          opacity: interpolate(frame, [totalChars / charsPerFrame + 20, totalChars / charsPerFrame + 50], [0, 1], EASE),
          marginTop: 40,
        }}>
          <div style={{ 
            fontSize: 24, 
            color: COLORS.muted,
            fontFamily: "system-ui, -apple-system, sans-serif",
            maxWidth: 700,
            lineHeight: 1.5,
          }}>
            Analyze resumes, portfolios & technical contributions automatically.
          </div>
        </div>
      </div>

      <div style={{ 
        position: "absolute", 
        bottom: 50, 
        display: "flex", 
        alignItems: "center", 
        gap: 8,
        opacity: interpolate(frame, [totalChars / charsPerFrame + 40, totalChars / charsPerFrame + 70], [0, 1], { ...EASE, easing: Easing.out(Easing.cubic) }),
      }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: COLORS.emerald }} />
        <div style={{ 
          fontSize: 13, 
          color: COLORS.muted, 
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}>
          Orizen Flow
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Problem = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const header = spring({ frame, fps, config: { damping: 20, stiffness: 80 } });

  const items = [
    { title: "Resume Noise", desc: "High-signal candidates hidden behind generic wording" },
    { title: "Scattered Evidence", desc: "Portfolio & GitHub disconnected from hiring flow" },
    { title: "Manual Overhead", desc: "Hours spent triaging before interviews" },
  ];

  return (
    <AbsoluteFill style={{ padding: "80px 120px", justifyContent: "center" }}>
      <div style={{ 
        transform: `translateY(${interpolate(header, [0, 1], [30, 0])}px)`, 
        opacity: header, 
        marginBottom: 56 
      }}>
        <div style={{ 
          fontSize: 13, 
          color: COLORS.accent, 
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          fontWeight: 600,
          marginBottom: 12,
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}>
          Problem
        </div>
        <div style={{ 
          fontSize: 52, 
          fontWeight: 700, 
          color: COLORS.fg,
          letterSpacing: "-0.025em",
          lineHeight: 1.15,
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}>
          Hiring teams drown in{' '}
          <span style={{ color: COLORS.muted }}>resumes,</span>
          <br />
          not <span style={{ color: COLORS.muted }}>insight.</span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {items.map((item, i) => {
          const itemAnim = spring({ frame, fps, delay: 15 + i * 20, config: { damping: 18, stiffness: 100 } });
          
          return (
            <div
              key={item.title}
              style={{
                opacity: itemAnim,
                transform: `translateX(${interpolate(itemAnim, [0, 1], [60, 0])}px)`,
                display: "flex",
                alignItems: "center",
                gap: 32,
                padding: "28px 36px",
                backgroundColor: "rgba(255,255,255,0.02)",
                borderRadius: 16,
                border: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <div style={{ 
                fontSize: 24, 
                fontWeight: 700, 
                color: COLORS.accent,
                minWidth: 280,
                fontFamily: "system-ui, -apple-system, sans-serif",
              }}>
                {item.title}
              </div>
              <div style={{ 
                fontSize: 16, 
                color: COLORS.muted,
                fontFamily: "system-ui, -apple-system, sans-serif",
              }}>
                {item.desc}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const Solution = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const header = spring({ frame, fps, config: { damping: 20, stiffness: 80 } });

  const pillars = [
    { title: "Unified Evidence", desc: "Resume, portfolio & code in one profile" },
    { title: "Role-fit Ranking", desc: "Score against technical requirements" },
    { title: "Explainable Insights", desc: "Transparent rationale for every decision" },
  ];

  return (
    <AbsoluteFill style={{ padding: "80px 120px", justifyContent: "center" }}>
      <div style={{ 
        transform: `translateY(${interpolate(header, [0, 1], [30, 0])}px)`, 
        opacity: header, 
        marginBottom: 56 
      }}>
        <div style={{ 
          fontSize: 13, 
          color: COLORS.emerald, 
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          fontWeight: 600,
          marginBottom: 12,
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}>
          Solution
        </div>
        <div style={{ 
          fontSize: 48, 
          fontWeight: 600, 
          color: COLORS.fg,
          letterSpacing: "-0.02em",
          lineHeight: 1.2,
          fontFamily: "Georgia, serif",
          fontStyle: "italic",
        }}>
          Turn applications into{' '}
          <span style={{ color: COLORS.emerald }}>ranked evidence.</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
        {pillars.map((p, i) => {
          const cardAnim = spring({ frame, fps, delay: 15 + i * 25, config: { damping: 16, stiffness: 90 } });
          
          return (
            <div
              key={p.title}
              style={{
                opacity: cardAnim,
                transform: `translateY(${interpolate(cardAnim, [0, 1], [60, 0])}px)`,
                padding: 32,
                backgroundColor: "rgba(34,197,94,0.05)",
                borderRadius: 16,
                border: "1px solid rgba(34,197,94,0.2)",
              }}
            >
              <div style={{ 
                width: 50, 
                height: 3, 
                backgroundColor: COLORS.emerald, 
                marginBottom: 20,
                borderRadius: 2,
              }} />
              <div style={{ fontSize: 22, fontWeight: 700, color: COLORS.fg, marginBottom: 8, fontFamily: "system-ui, -apple-system, sans-serif" }}>
                {p.title}
              </div>
              <div style={{ fontSize: 14, color: COLORS.muted, fontFamily: "system-ui, -apple-system, sans-serif" }}>
                {p.desc}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const Features = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const header = spring({ frame, fps, config: { damping: 20, stiffness: 80 } });

  const features = [
    { title: "AI Evaluation", desc: "Consistent scoring based on technical evidence" },
    { title: "Multi-source", desc: "Resume + GitHub + Portfolio unified" },
    { title: "Pipeline", desc: "Surface high-intent candidates fast" },
    { title: "Evidence Insights", desc: "Strengths, concerns & recommendations" },
  ];

  return (
    <AbsoluteFill style={{ padding: "80px 120px", justifyContent: "center" }}>
      <div style={{ 
        transform: `translateY(${interpolate(header, [0, 1], [30, 0])}px)`, 
        opacity: header, 
        marginBottom: 48 
      }}>
        <div style={{ 
          fontSize: 13, 
          color: COLORS.accentLight, 
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          fontWeight: 600,
          marginBottom: 12,
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}>
          Features
        </div>
        <div style={{ 
          fontSize: 44, 
          fontWeight: 700, 
          color: COLORS.fg,
          letterSpacing: "-0.025em",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}>
          Built for technical hiring teams.
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 }}>
        {features.map((f, i) => {
          const featAnim = spring({ frame, fps, delay: 12 + i * 15, config: { damping: 18, stiffness: 100 } });
          
          return (
            <div
              key={f.title}
              style={{
                opacity: featAnim,
                transform: `translateY(${interpolate(featAnim, [0, 1], [40, 0])}px)`,
                padding: 28,
                backgroundColor: "rgba(255,255,255,0.025)",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div style={{ fontSize: 22, fontWeight: 700, color: COLORS.fg, marginBottom: 8, fontFamily: "system-ui, -apple-system, sans-serif" }}>
                {f.title}
              </div>
              <div style={{ fontSize: 14, color: COLORS.muted, fontFamily: "system-ui, -apple-system, sans-serif" }}>
                {f.desc}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const CTA = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const ctaAnim = spring({ frame, fps, delay: 15, config: { damping: 14, stiffness: 80 } });
  
  const opacity = interpolate(ctaAnim, [0, 0.5], [0, 1], EASE);
  const scale = interpolate(ctaAnim, [0, 1], [0.92, 1], { ...EASE, easing: Easing.out(Easing.back(0.5)) });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div
        style={{
          opacity,
          transform: `scale(${scale})`,
          textAlign: "center",
          padding: "64px 80px",
          backgroundColor: "rgba(255,255,255,0.03)",
          borderRadius: 24,
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div style={{ 
          fontSize: 52, 
          fontWeight: 700, 
          color: COLORS.fg,
          letterSpacing: "-0.03em",
          marginBottom: 16,
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}>
          Join the waitlist
        </div>
        
        <div style={{ 
          fontSize: 20, 
          color: COLORS.muted,
          marginBottom: 40,
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}>
          Get early access to objective technical hiring.
        </div>

        <div style={{ 
          display: "inline-flex",
          alignItems: "center",
          gap: 12,
          padding: "18px 44px",
          backgroundColor: COLORS.fg,
          borderRadius: 9999,
        }}>
          <div style={{ 
            width: 8, 
            height: 8, 
            borderRadius: "50%", 
            backgroundColor: COLORS.emerald,
          }} />
          <div style={{ 
            fontSize: 16, 
            fontWeight: 700, 
            color: COLORS.bg,
            letterSpacing: "0.05em",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}>
            REQUEST ACCESS
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
