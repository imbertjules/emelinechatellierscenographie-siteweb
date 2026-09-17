import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#000000",
          color: "#ffffff",
          padding: "64px 80px",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 170,
            height: 170,
            borderRadius: 28,
            background: "#ffffff",
            color: "#000000",
            fontSize: 72,
            fontWeight: 700,
            marginBottom: 28,
          }}
        >
          EC
        </div>

        <div style={{ fontSize: 64, fontWeight: 700, letterSpacing: -2, marginBottom: 12 }}>
          EMELINE CHATELLIER
        </div>

        <div style={{ fontSize: 30, letterSpacing: 8, textTransform: "uppercase", opacity: 0.8 }}>
          Scénographie
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
