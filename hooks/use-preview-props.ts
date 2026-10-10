"use client"

import { useCallback, useMemo, useState } from "react"

function valuesEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (Array.isArray(a) && Array.isArray(b)) {
    return (
      a.length === b.length && a.every((value, i) => Object.is(value, b[i]))
    )
  }
  return false
}

/** Prop state for live docs demos; tracks dirty state for Reset. */
export function usePreviewProps<T extends Record<string, unknown>>(
  defaults: T
) {
  const [props, setProps] = useState<T>(defaults)

  const updateProp = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setProps((prev) => {
      if (valuesEqual(prev[key], value)) return prev
      return { ...prev, [key]: value }
    })
  }, [])

  const resetProps = useCallback(() => {
    setProps(defaults)
  }, [defaults])

  const hasChanges = useMemo(() => {
    return (Object.keys(defaults) as Array<keyof T>).some(
      (key) => !valuesEqual(props[key], defaults[key])
    )
  }, [props, defaults])

  return { props, setProps, updateProp, resetProps, hasChanges }
}
