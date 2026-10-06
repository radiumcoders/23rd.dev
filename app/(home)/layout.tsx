import { Geist } from "next/font/google"
import type { ReactNode } from "react"

/** The landing page's headline face. The docs keep their own. */
const fontLanding = Geist({
  subsets: ["latin"],
  variable: "--font-landing",
})

export default function HomeLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${fontLanding.variable} bg-background text-foreground`}>
      {children}
    </div>
  )
}
