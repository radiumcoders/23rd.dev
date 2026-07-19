"use client"

import type { ReactNode } from "react"
import { RootProvider } from "fumadocs-ui/provider/next"

export function FumadocsProvider({ children }: { children: ReactNode }) {
  return (
    <RootProvider
      search={{ enabled: false }}
      theme={{ enabled: false }}
    >
      {children}
    </RootProvider>
  )
}
