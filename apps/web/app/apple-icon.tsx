import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#090D16",
          borderRadius: "40px",
        }}
      >
        <svg
          viewBox="0 0 24 24"
          width="110"
          height="110"
          fill="#3B82F6"
        >
          <path d="M2 12H4V21H2V12ZM5 14H7V21H5V14ZM16 8H18V21H16V8ZM19 10H21V21H19V10ZM9 2H11V21H9V2ZM12 4H14V21H12V4Z" />
        </svg>
      </div>
    ),
    {
      ...size,
    },
  );
}
