import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "PokeItem — Gérez votre portfolio d'items Pokémon TCG";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          padding: "60px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
            marginBottom: "30px",
          }}
        >
          <div
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #ef4444 50%, #fff 50%)",
              border: "4px solid #fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                background: "#fff",
                border: "4px solid #1e3a5f",
              }}
            />
          </div>
          <span
            style={{
              fontSize: "64px",
              fontWeight: 800,
              color: "#fff",
              letterSpacing: "-1px",
            }}
          >
            POKE
            <span style={{ color: "#3b82f6" }}>ITEM</span>
          </span>
        </div>
        <p
          style={{
            fontSize: "28px",
            color: "#94a3b8",
            textAlign: "center",
            maxWidth: "800px",
            lineHeight: 1.4,
          }}
        >
          La plateforme de reference pour gerer et valoriser votre portfolio
          d&apos;items scelles Pokemon TCG
        </p>
        <div
          style={{
            display: "flex",
            gap: "40px",
            marginTop: "40px",
            color: "#64748b",
            fontSize: "20px",
          }}
        >
          <span>Collection</span>
          <span>Market</span>
          <span>Portfolio</span>
          <span>Blog</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
