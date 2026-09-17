"use client"

import { useEffect } from "react"
import {
  createTracwell,
  type EventProperties,
  type TracwellClient,
} from "tracwell"

const TRACWELL_CONFIG = {
  collectionMode: "private",
  consent: "granted",
  projectKey: "tw_live_7f379f3a0de54e719b901e6a51feeaa9",
  respectDoNotTrack: true,
} as const

let analytics: TracwellClient | undefined

function getTracwell(): TracwellClient | undefined {
  if (analytics) return analytics
  if (typeof document === "undefined") return undefined
  analytics = createTracwell(TRACWELL_CONFIG)
  return analytics
}

export function trackEvent(
  eventName: string,
  properties?: EventProperties
): string | undefined {
  return getTracwell()?.track(eventName, properties)
}

export function TracwellAnalytics() {
  useEffect(() => {
    getTracwell()
  }, [])

  return null
}
