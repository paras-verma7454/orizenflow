import { ImageResponse } from "@takumi-rs/image-response/wasm";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const jobTitle = searchParams.get("jobTitle") ?? "Position";
  const orgName = searchParams.get("orgName") ?? "Organization";
  const jobType = searchParams.get("jobType") ?? "";
  const location = searchParams.get("location") ?? "";
  const orgLogo = searchParams.get("orgLogo");

  const fontData900 = await fetch(
    new URL(
      "https://github.com/google/fonts/raw/main/ofl/inter/Inter-Black.ttf",
      import.meta.url,
    ),
  ).then((res) => res.arrayBuffer());

  const fontData500 = await fetch(
    new URL(
      "https://github.com/google/fonts/raw/main/ofl/inter/Inter-Medium.ttf",
      import.meta.url,
    ),
  ).then((res) => res.arrayBuffer());

  const jobTypeColorMap: Record<string, string> = {
    remote: "rgba(34, 197, 94, 0.9)",
    hybrid: "rgba(59, 130, 246, 0.9)",
    "on-site": "rgba(245, 158, 11, 0.9)",
  };

  const jobTypeColor =
    jobTypeColorMap[jobType.toLowerCase()] || "rgba(59, 130, 246, 0.9)";

  const imageResponse = new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background:
          "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f1419 100%)",
        position: "relative",
        overflow: "hidden",
        fontFamily: '"Inter"',
      }}
    >
      {/* Accent gradient blob */}
      <div
        style={{
          position: "absolute",
          width: "600px",
          height: "600px",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${jobTypeColor.replace("0.9", "0.15")} 0%, transparent 70%)`,
          top: "-200px",
          right: "-200px",
        }}
      />

      {/* Subtle grid */}
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          backgroundImage:
            "linear-gradient(0deg, transparent 24%, rgba(255, 255, 255, 0.02) 25%, rgba(255, 255, 255, 0.02) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, 0.02) 75%, rgba(255, 255, 255, 0.02) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(255, 255, 255, 0.02) 25%, rgba(255, 255, 255, 0.02) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, 0.02) 75%, rgba(255, 255, 255, 0.02) 76%, transparent 77%, transparent)",
          backgroundSize: "80px 80px",
          opacity: 0.3,
        }}
      />

      {/* Content */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          height: "100%",
          padding: "70px 80px",
        }}
      >
        <div>
          {orgLogo && (
            <img
              src={orgLogo}
              width="64"
              height="64"
              style={{
                borderRadius: "12px",
                marginBottom: "24px",
                objectFit: "cover",
              }}
            />
          )}
          <div
            style={{
              display: "flex",
              gap: "12px",
              marginBottom: "32px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            {jobType && (
              <div
                style={{
                  backgroundColor: jobTypeColor,
                  color: "#ffffff",
                  padding: "8px 16px",
                  borderRadius: "6px",
                  fontSize: "18px",
                  fontWeight: 600,
                  textTransform: "capitalize",
                  letterSpacing: "0.5px",
                }}
              >
                {jobType}
              </div>
            )}
            {location && (
              <div
                style={{
                  color: "rgba(255, 255, 255, 0.6)",
                  fontSize: "18px",
                  fontWeight: 500,
                }}
              >
                📍 {location}
              </div>
            )}
          </div>

          <h1
            style={{
              fontSize: "88px",
              fontWeight: 900,
              color: "white",
              margin: "0",
              lineHeight: 1.1,
              marginBottom: "20px",
              letterSpacing: "-1.5px",
              maxWidth: "1000px",
            }}
          >
            {jobTitle}
          </h1>

          <div
            style={{
              fontSize: "32px",
              color: "rgba(255, 255, 255, 0.6)",
              fontWeight: 500,
            }}
          >
            at{" "}
            <span style={{ color: "white", fontWeight: 700 }}>{orgName}</span>
          </div>
        </div>

        {/* Footer accent */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              width: "120px",
              height: "4px",
              background: jobTypeColor,
              borderRadius: "2px",
            }}
          />
          <div
            style={{
              fontSize: "20px",
              color: "rgba(255, 255, 255, 0.5)",
            }}
          >
            Orizen Flow
          </div>
        </div>
      </div>
    </div>,
    {
      module: import("@takumi-rs/wasm/next"),
      width: 1200,
      height: 630,
      fonts: [
        {
          name: "Inter",
          data: fontData900,
          style: "normal",
          weight: 900,
        },
        {
          name: "Inter",
          data: fontData500,
          style: "normal",
          weight: 500,
        },
      ],
    },
  );

  imageResponse.headers.set(
    "Cache-Control",
    "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
  );

  return imageResponse;
}
