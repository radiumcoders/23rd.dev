import type { Metadata } from "next"

import { LandingView } from "./landing-view"

export const metadata: Metadata = {
  title: "23rd",
  description:
    "Opinionated UI components for shippers — a shadcn registry. Draft site landing (not the production homepage).",
  robots: {
    index: false,
    follow: false,
  },
}

export default function LandingPage() {
  return <LandingView />
}
