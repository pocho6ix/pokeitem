import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "PokeItem — Gérez votre collection Pokémon TCG";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage() {
  const logoData = await readFile(
    join(process.cwd(), "public", "logo-long.png")
  );
  const logoSrc = `data:image/png;base64,${logoData.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          background: "linear-gradient(135deg, #1e4a82 0%, #07111f 100%)",
          padding: "80px 60px 60px",
          fontFamily: "sans-serif",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoSrc}
          alt="PokeItem"
          width={880}
          style={{ marginBottom: "60px" }}
        />
        <p
          style={{
            fontSize: 48,
            color: "#f1f5f9",
            textAlign: "center",
            margin: 0,
            lineHeight: 1.2,
            fontWeight: 600,
            letterSpacing: "-0.5px",
          }}
        >
          Gérez votre collection Pokémon TCG
        </p>
        <span
          style={{
            position: "absolute",
            bottom: 48,
            fontSize: 22,
            color: "#E7BA76",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            fontWeight: 700,
          }}
        >
          app.pokeitem.fr
        </span>
      </div>
    ),
    { ...size }
  );
}
