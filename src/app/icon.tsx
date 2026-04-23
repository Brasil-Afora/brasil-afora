import { ImageResponse } from "next/og";

export const size = {
  width: 512,
  height: 512,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background:
          "linear-gradient(135deg, #020617 0%, #0f172a 55%, #111827 100%)",
        color: "#f59e0b",
        display: "flex",
        fontFamily: "Arial, sans-serif",
        fontSize: 192,
        fontWeight: 900,
        height: "100%",
        justifyContent: "center",
        letterSpacing: "-8px",
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
