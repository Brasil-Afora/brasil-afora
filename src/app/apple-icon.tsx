import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background:
          "linear-gradient(135deg, #020617 0%, #0f172a 55%, #111827 100%)",
        borderRadius: "24px",
        color: "#f59e0b",
        display: "flex",
        fontFamily: "Arial, sans-serif",
        fontSize: 76,
        fontWeight: 900,
        height: "100%",
        justifyContent: "center",
        letterSpacing: "-3px",
        width: "100%",
      }}
    >
      BA
    </div>,
    {
      ...size,
    }
  );
}
