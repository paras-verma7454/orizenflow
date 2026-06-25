import { ImageResponse } from "next/og";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const jobTitle = searchParams.get("jobTitle") ?? "Position";
  const orgName = searchParams.get("orgName") ?? "Organization";
  const jobType = searchParams.get("jobType") ?? "";
  const location = searchParams.get("location") ?? "";

  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#020617", // slate-950
        color: "white",
        fontFamily: "sans-serif",
        padding: "70px 80px",
        position: "relative",
      }}
    >
      {/* Background Mesh */}
      <div
        style={{
          display: "flex",
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage:
            "radial-gradient(circle at 0% 0%, rgba(59, 130, 246, 0.08) 0%, transparent 50%), radial-gradient(circle at 100% 100%, rgba(168, 85, 247, 0.08) 0%, transparent 50%)",
        }}
      />

      {/* Subtle Grid */}
      <div
        style={{
          display: "flex",
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage:
            "linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Brand */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          fontSize: 22,
          fontWeight: 600,
          color: "#94a3b8", // slate-400
          zIndex: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            width: 24,
            height: 4,
            background: "linear-gradient(90deg, #3b82f6, #8b5cf6)",
            borderRadius: "2px",
          }}
        />
        Orizen Flow / Careers
      </div>

      {/* Main Content */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          justifyContent: "center",
          zIndex: 10,
          gap: "24px",
        }}
      >
        {/* Tags */}
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          {jobType && (
            <div
              style={{
                display: "flex",
                padding: "8px 20px",
                borderRadius: "8px",
                fontSize: 20,
                fontWeight: 600,
                textTransform: "capitalize",
                color: "#93c5fd", // blue-300
                background: "rgba(59, 130, 246, 0.15)",
                border: "1px solid rgba(59, 130, 246, 0.2)",
                boxShadow: "0 2px 10px rgba(59, 130, 246, 0.1)",
              }}
            >
              {jobType}
            </div>
          )}
          {location && (
            <div
              style={{
                display: "flex",
                padding: "8px 20px",
                borderRadius: "8px",
                fontSize: 20,
                fontWeight: 500,
                color: "#e2e8f0", // slate-200
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
              }}
            >
              {location}
            </div>
          )}
        </div>

        {/* Title */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 84,
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
              color: "white",
              textShadow: "0 10px 30px rgba(0,0,0,0.5)",
            }}
          >
            {jobTitle}
          </div>

          <div
            style={{
              display: "flex",
              fontSize: 40,
              color: "#94a3b8", // slate-400
              fontWeight: 500,
              letterSpacing: "-0.02em",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <span>at</span>
            <span style={{ color: "white", fontWeight: 700 }}>{orgName}</span>
          </div>
        </div>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
    },
  );
}
