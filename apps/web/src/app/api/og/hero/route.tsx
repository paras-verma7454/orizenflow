import { ImageResponse } from "next/og";

export async function GET() {
  const imageResponse = new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#ffffff",
      }}
    >
      <div style={{ display: "flex", fontSize: 64, fontWeight: 800 }}>
        Hello OG
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
    },
  );

  imageResponse.headers.set("Cache-Control", "public, max-age=3600");

  return imageResponse;
}
