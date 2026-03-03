import { ImageResponse } from "@takumi-rs/image-response/wasm";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orgName = searchParams.get("orgName") ?? "Organization";
  const jobCount = parseInt(searchParams.get("jobCount") ?? "0");
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

  const imageResponse = new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        justifyContent: "stretch",
        background:
          "linear-gradient(135deg, #0f172a 0%, #1a3a52 50%, #0f2744 100%)",
        position: "relative",
        overflow: "hidden",
        fontFamily: '"Inter"',
      }}
    >
      {/* Decorative background elements */}
      <div
        style={{
          position: "absolute",
          width: "500px",
          height: "500px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(34, 197, 94, 0.1) 0%, transparent 70%)",
          top: "-150px",
          right: "-150px",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: "400px",
          height: "400px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 70%)",
          bottom: "-100px",
          left: "-100px",
        }}
      />

      {/* Grid pattern overlay */}
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          backgroundImage:
            "linear-gradient(0deg, transparent 24%, rgba(255, 255, 255, 0.02) 25%, rgba(255, 255, 255, 0.02) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, 0.02) 75%, rgba(255, 255, 255, 0.02) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(255, 255, 255, 0.02) 25%, rgba(255, 255, 255, 0.02) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, 0.02) 75%, rgba(255, 255, 255, 0.02) 76%, transparent 77%, transparent)",
          backgroundSize: "60px 60px",
          opacity: 0.5,
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
          padding: "80px 80px",
        }}
      >
        <div>
          {orgLogo && (
            <img
              src={orgLogo}
              width="80"
              height="80"
              style={{
                borderRadius: "12px",
                marginBottom: "32px",
              }}
            />
          )}
          <div
            style={{
              fontSize: "24px",
              fontWeight: 700,
              color: "rgba(34, 197, 94, 0.8)",
              marginBottom: "24px",
              letterSpacing: "-0.5px",
              textTransform: "uppercase",
            }}
          >
            HIRING
          </div>

          <h1
            style={{
              fontSize: "92px",
              fontWeight: 900,
              color: "white",
              margin: "0",
              lineHeight: 1,
              marginBottom: "16px",
              letterSpacing: "-2px",
            }}
          >
            {orgName}
          </h1>
        </div>

        {/* Stats section */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: "16px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              paddingBottom: "20px",
              borderBottom: "2px solid rgba(34, 197, 94, 0.3)",
            }}
          >
            <span
              style={{
                fontSize: "64px",
                fontWeight: 900,
                background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              {jobCount}
            </span>
            <span
              style={{
                fontSize: "28px",
                color: "rgba(255, 255, 255, 0.8)",
                fontWeight: 500,
              }}
            >
              Open Position{jobCount !== 1 ? "s" : ""}
            </span>
          </div>

          <div
            style={{
              fontSize: "24px",
              color: "rgba(255, 255, 255, 0.5)",
              marginLeft: "auto",
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
