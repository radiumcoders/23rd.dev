import { ImageResponse } from "next/og"
import { readFile } from "node:fs/promises"
import { join } from "node:path"

import { OG_IMAGE_SIZE, SITE_NAME } from "@/lib/seo"

export async function renderDocsOgImage({
  title,
  description,
}: {
  title: string
  description: string
}) {
  const logo = await readFile(join(process.cwd(), "app/apple-icon.png"))
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#0a0a0a",
        color: "#fafafa",
        padding: 72,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          {/* ImageResponse only supports <img>, not next/image */}
          {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse */}
          <img
            src={logoSrc}
            width={56}
            height={56}
            alt=""
            style={{ borderRadius: 8 }}
          />
          <div
            style={{
              display: "flex",
              marginLeft: 16,
              fontSize: 28,
              fontWeight: 600,
              letterSpacing: "-0.04em",
            }}
          >
            {SITE_NAME}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 22,
            color: "#737373",
          }}
        >
          23rd.dev
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            fontSize: title.length > 28 ? 56 : 64,
            fontWeight: 600,
            letterSpacing: "-0.04em",
            lineHeight: 1.1,
          }}
        >
          {title}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 20,
            fontSize: 26,
            color: "#a3a3a3",
            lineHeight: 1.35,
            maxWidth: 980,
          }}
        >
          {description}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 20,
          color: "#737373",
        }}
      >
        shadcn registry
      </div>
    </div>,
    { ...OG_IMAGE_SIZE }
  )
}
