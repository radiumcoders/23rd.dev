"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

export type Framework = "react" | "svelte"

const STORAGE_KEY = "23rd:framework"
const EVENT = "23rd:framework-change"

const FRAMEWORKS = [
  { value: "react" as const, label: "React" },
  { value: "svelte" as const, label: "Svelte" },
]

function isFramework(value: string): value is Framework {
  return value === "react" || value === "svelte"
}

function readStoredFramework(): Framework | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored && isFramework(stored)) return stored
  } catch {
    // ignore
  }
  return null
}

function writeStoredFramework(value: Framework) {
  try {
    window.localStorage.setItem(STORAGE_KEY, value)
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(EVENT))
}

type FrameworkContextValue = {
  framework: Framework
  setFramework: (value: Framework) => void
}

const FrameworkContext = createContext<FrameworkContextValue | null>(null)

export function FrameworkProvider({
  children,
  defaultFramework = "react",
}: {
  children: ReactNode
  defaultFramework?: Framework
}) {
  const [framework, setFrameworkState] = useState<Framework>(defaultFramework)

  useEffect(() => {
    const stored = readStoredFramework()
    if (stored) setFrameworkState(stored)

    function onChange() {
      const next = readStoredFramework()
      if (next) setFrameworkState(next)
    }
    window.addEventListener(EVENT, onChange)
    window.addEventListener("storage", onChange)
    return () => {
      window.removeEventListener(EVENT, onChange)
      window.removeEventListener("storage", onChange)
    }
  }, [])

  const setFramework = useCallback((value: Framework) => {
    setFrameworkState(value)
    writeStoredFramework(value)
  }, [])

  const value = useMemo(
    () => ({ framework, setFramework }),
    [framework, setFramework]
  )

  return (
    <FrameworkContext.Provider value={value}>
      {children}
    </FrameworkContext.Provider>
  )
}

export function useFramework() {
  const ctx = useContext(FrameworkContext)
  if (!ctx) {
    throw new Error("useFramework must be used within FrameworkProvider")
  }
  return ctx
}

export function registryItemName(item: string, framework: Framework) {
  return framework === "svelte" ? `${item}-svelte` : item
}

export { FRAMEWORKS, isFramework }
