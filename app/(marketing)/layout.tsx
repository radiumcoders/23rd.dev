import type { ReactNode } from "react"

import { SiteShell } from "@/components/site-shell"

export default async function MarketingLayout({
  children,
}: {
  children: ReactNode
}) {
  return <SiteShell>{children}</SiteShell>
}
