import { ImageResponse } from "next/og";
import {
  LOGO_MARK_PATHS,
  LOGO_MARK_VIEWBOX,
} from "@/components/logo/logo-paths";

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
        background: "#123b63",
        display: "flex",
        height: "100%",
        justifyContent: "center",
        width: "100%",
      }}
    >
      <svg
        aria-label="Logo do Brasil Afora"
        height={105}
        role="img"
        viewBox={LOGO_MARK_VIEWBOX}
        width={130}
      >
        {LOGO_MARK_PATHS.map((d) => (
          <path
            d={d}
            fill="#ffffff"
            key={d.slice(0, 24)}
            stroke="#ffffff"
            strokeWidth={1}
          />
        ))}
      </svg>
    </div>,
    {
      ...size,
    }
  );
}
