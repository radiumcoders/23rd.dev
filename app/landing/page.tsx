import type { Metadata } from "next"

import { LandingView } from "./landing-view"

export const metadata: Metadata = {
  title: "Landing",
  description:
    "23rd — opinionated UI components for shippers. A demo landing page with live shader backgrounds.",
}

export default function LandingPage() {
  return <LandingView />
}
