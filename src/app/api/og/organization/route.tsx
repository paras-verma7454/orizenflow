import { ImageResponse } from "next/og";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orgName = searchParams.get("orgName") ?? "Organization";

  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#09090b", // zinc-950
        backgroundImage:
          "radial-gradient(circle at 25px 25px, rgba(255, 255, 255, 0.05) 2%, transparent 0%), radial-gradient(circle at 75px 75px, rgba(255, 255, 255, 0.05) 2%, transparent 0%)",
        backgroundSize: "100px 100px",
        color: "white",
        fontFamily: "sans-serif",
        padding: "60px 80px",
      }}
    >
      <div
        style={{
          display: "flex",
          position: "absolute",
          top: "-150px",
          right: "-100px",
          width: "600px",
          height: "600px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(59, 130, 246, 0.15), transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
          zIndex: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            fontSize: 24,
            fontWeight: 600,
            color: "#a1a1aa", // zinc-400
            letterSpacing: "-0.02em",
          }}
        >
          <div
            style={{
              display: "flex",
              width: 16,
              height: 16,
              borderRadius: "4px",
              background: "#3b82f6",
            }}
          />
          Orizen Flow
        </div>

        <div
          style={{
            display: "flex",
            padding: "6px 20px",
            background: "rgba(34, 197, 94, 0.1)",
            border: "1px solid rgba(34, 197, 94, 0.2)",
            borderRadius: "100px",
            color: "#4ade80", // green-400
            fontSize: 18,
            fontWeight: 600,
            letterSpacing: "0.02em",
            textTransform: "uppercase",
          }}
        >
          Hiring Now
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          justifyContent: "center",
          zIndex: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 96,
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: "-0.04em",
            color: "white",
            marginBottom: "32px",
            textShadow: "0 4px 20px rgba(0,0,0,0.5)",
          }}
        >
          {orgName}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "24px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "#18181b", // zinc-900
              padding: "16px 32px",
              borderRadius: "20px",
              border: "1px solid #27272a", // zinc-800
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
            }}
          >
            <span
              style={{
                fontSize: 32,
                color: "#e4e4e7", // zinc-200
                fontWeight: 600,
                letterSpacing: "-0.01em",
              }}
            >
              Careers
            </span>
            <span
              style={{
                fontSize: 32,
                color: "#3b82f6", // blue-500
                marginLeft: "12px",
              }}
            >
              →
            </span>
          </div>
        </div>
      </div>

      {/* Decorative Grid Bottom */}
      <div
        style={{
          display: "flex",
          position: "absolute",
          bottom: "0",
          left: "0",
          right: "0",
          height: "8px",
          background: "linear-gradient(90deg, #3b82f6 0%, #22c55e 100%)",
        }}
      />
    </div>,
    {
      width: 1200,
      height: 630,
    },
  );
}
