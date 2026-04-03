import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
} from "remotion";

interface ElonIPVideoProps {
  title: string;
  subtitle: string;
}

const IntroScene: React.FC<{ title: string }> = ({ title }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: "clamp",
  });

  const titleY = spring({
    frame,
    fps,
    from: 50,
    to: 0,
    config: { damping: 12, stiffness: 100 },
  });

  const lineWidth = interpolate(frame, [20, 50], [0, 400], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%)",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 72,
            fontWeight: 800,
            color: "#ffffff",
            margin: 0,
            maxWidth: 1200,
            lineHeight: 1.1,
          }}
        >
          {title}
        </h1>
        <div
          style={{
            width: lineWidth,
            height: 4,
            background: "linear-gradient(90deg, #6366f1, #8b5cf6)",
            margin: "30px auto",
            borderRadius: 2,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

const StatsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const stats = [
    { label: "Patent Portfolio Value", value: "$5B+", delay: 0 },
    { label: "Licensing Revenue Growth", value: "3x", delay: 10 },
    { label: "Valuation Uplift", value: "66 Patents", delay: 20 },
  ];

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%)",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "row",
        gap: 60,
      }}
    >
      {stats.map((stat, i) => {
        const opacity = interpolate(frame, [stat.delay, stat.delay + 20], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        const scale = spring({
          frame: Math.max(0, frame - stat.delay),
          fps,
          from: 0.5,
          to: 1,
          config: { damping: 10, stiffness: 80 },
        });

        return (
          <div
            key={i}
            style={{
              opacity,
              transform: `scale(${scale})`,
              textAlign: "center",
              padding: 40,
              borderRadius: 16,
              background: "rgba(99, 102, 241, 0.1)",
              border: "1px solid rgba(99, 102, 241, 0.3)",
              minWidth: 280,
            }}
          >
            <div
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: 64,
                fontWeight: 800,
                color: "#8b5cf6",
                marginBottom: 12,
              }}
            >
              {stat.value}
            </div>
            <div
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: 24,
                fontWeight: 500,
                color: "#a0a0b0",
              }}
            >
              {stat.label}
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const OutroScene: React.FC<{ subtitle: string }> = ({ subtitle }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: "clamp",
  });

  const logoScale = spring({
    frame,
    fps,
    from: 0.8,
    to: 1,
    config: { damping: 15, stiffness: 100 },
  });

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%)",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div style={{ opacity, transform: `scale(${logoScale})`, textAlign: "center" }}>
        <h2
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 56,
            fontWeight: 800,
            color: "#ffffff",
            margin: 0,
            marginBottom: 20,
          }}
        >
          Beyond Elevation
        </h2>
        <p
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 28,
            fontWeight: 400,
            color: "#a0a0b0",
            margin: 0,
            marginBottom: 40,
          }}
        >
          {subtitle}
        </p>
        <div
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 22,
            fontWeight: 600,
            color: "#8b5cf6",
            padding: "16px 48px",
            border: "2px solid #8b5cf6",
            borderRadius: 12,
            display: "inline-block",
          }}
        >
          Book a Strategy Session →
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const ElonIPVideo: React.FC<ElonIPVideoProps> = ({ title, subtitle }) => {
  return (
    <AbsoluteFill>
      <Sequence from={0} durationInFrames={100}>
        <IntroScene title={title} />
      </Sequence>
      <Sequence from={100} durationInFrames={100}>
        <StatsScene />
      </Sequence>
      <Sequence from={200} durationInFrames={100}>
        <OutroScene subtitle={subtitle} />
      </Sequence>
    </AbsoluteFill>
  );
};
