"use client"

import {
  Fragment,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react"

import { cn } from "@/lib/utils"

import {
  CLASSES,
  createMechKeyboard,
  DEFAULT_PLACEHOLDER,
  detectPlatform,
  formatShortcut,
  recorderVars,
  type MechKeyboardChordPhase,
  type MechKeyboardInstance,
  type MechKeyboardPlatform,
  type MechKeyboardShortcut,
} from "./mech-keyboard-vanilla"

export {
  buildLayout,
  DEFAULT_PLACEHOLDER,
  formatShortcut,
} from "./mech-keyboard-vanilla"
export type {
  MechKeyboardKey,
  MechKeyboardPlatform,
  MechKeyboardShortcut,
} from "./mech-keyboard-vanilla"

export type MechKeyboardProps = {
  /** Horizontal offset, px. */
  x?: number
  /** Vertical offset, px. */
  y?: number
  /** Multiplies the fitted size. */
  scale?: number
  /** Ink and greys only; no blue caps. */
  monochrome?: boolean
  /** Real key presses and clicks press the keys. */
  interactive?: boolean
  /** Shows the shortcut being pressed above the keyboard. */
  recorder?: boolean
  /** Recorder text before the first key. */
  placeholder?: string
  /**
   * `KeyboardEvent.code`s the recorder starts on, shown as saved until the
   * next key, e.g. the current binding: `["MetaLeft", "KeyK"]`.
   */
  defaultShortcut?: string[]
  /** `KeyboardEvent.code`s to pulse, e.g. `["MetaLeft", "KeyK"]`. */
  highlight?: string[]
  /** Bottom-row legends. `"auto"` detects Mac. */
  platform?: MechKeyboardPlatform | "auto"
  /** Synthesized switch sounds. */
  sound?: boolean
  /** Rise into place with a wave across the keys on mount. */
  intro?: boolean
  /** Every key down and up. */
  onKey?: (code: string, pressed: boolean) => void
  /** Fires when every key of a chord is released. */
  onShortcut?: (shortcut: MechKeyboardShortcut) => void
  className?: string
}

const noop = () => () => {}

function Check() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden className={CLASSES.check}>
      <path
        d="M3.5 8.5l3 3 6-7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * A 75% mechanical keyboard drawn as an isometric illustration in
 * three.js: flat tone bands, ink outlines, a volume knob. Keys spring down
 * under your keyboard (or a click; modifiers latch), and the recorder above
 * spells out the shortcut in little illustrated keycaps, onboarding-style.
 * Honors `prefers-reduced-motion`.
 */
export function MechKeyboard({
  x = 0,
  y = 0,
  scale = 1,
  monochrome = false,
  interactive = true,
  recorder = true,
  placeholder = DEFAULT_PLACEHOLDER,
  defaultShortcut,
  highlight,
  platform = "auto",
  sound = false,
  intro = true,
  onKey,
  onShortcut,
  className,
}: MechKeyboardProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const instanceRef = useRef<MechKeyboardInstance | null>(null)
  const callbacks = useRef({ onKey, onShortcut })
  const detected = useSyncExternalStore(
    noop,
    detectPlatform,
    (): MechKeyboardPlatform => "pc"
  )
  const [chord, setChord] = useState<{
    codes: string[]
    phase: MechKeyboardChordPhase
  }>(() =>
    defaultShortcut?.length
      ? { codes: defaultShortcut, phase: "done" }
      : { codes: [], phase: "idle" }
  )

  const resolvedPlatform = platform === "auto" ? detected : platform
  const shortcut = formatShortcut(chord.codes, resolvedPlatform)
  const highlightKey = (highlight ?? []).join(" ")

  useEffect(() => {
    callbacks.current = { onKey, onShortcut }
  }, [onKey, onShortcut])

  useEffect(() => {
    const root = rootRef.current
    const stage = stageRef.current
    if (!root || !stage) return
    instanceRef.current = createMechKeyboard(root, stage, {
      x,
      y,
      scale,
      monochrome,
      interactive,
      sound,
      intro,
      recorder,
      highlight,
      platform: resolvedPlatform,
      onKey: (code, pressed) => callbacks.current.onKey?.(code, pressed),
      onShortcut: (s) => callbacks.current.onShortcut?.(s),
      onChord: (codes, phase) => setChord({ codes, phase }),
    })
    return () => {
      instanceRef.current?.destroy()
      instanceRef.current = null
    }
    // Engine reads live options via setOptions; mount once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    instanceRef.current?.setOptions({
      x,
      y,
      scale,
      monochrome,
      interactive,
      sound,
      intro,
      recorder,
      highlight: highlightKey ? highlightKey.split(" ") : [],
      platform: resolvedPlatform,
    })
  }, [
    x,
    y,
    scale,
    monochrome,
    interactive,
    sound,
    intro,
    recorder,
    highlightKey,
    resolvedPlatform,
  ])

  return (
    <div
      ref={rootRef}
      data-slot="mech-keyboard"
      tabIndex={interactive ? 0 : undefined}
      role="application"
      aria-label="Mechanical keyboard"
      style={recorderVars(monochrome) as CSSProperties}
      className={cn(CLASSES.root, className)}
    >
      <div ref={stageRef} className={CLASSES.stage} />
      {recorder ? (
        <div aria-live="polite" className={CLASSES.recorder}>
          <div className={CLASSES.chips}>
            {shortcut.keys.length === 0 ? (
              <span className={CLASSES.placeholder}>{placeholder}</span>
            ) : (
              shortcut.keys.map((key, i) => (
                <Fragment key={shortcut.codes[i]}>
                  {i > 0 ? <span className={CLASSES.plus}>+</span> : null}
                  <kbd
                    data-live={chord.phase === "live" ? "" : undefined}
                    className={CLASSES.chip}
                  >
                    <span className={CLASSES.chipTop}>{key}</span>
                  </kbd>
                </Fragment>
              ))
            )}
          </div>
          <div className={CLASSES.status}>
            {chord.phase === "done" ? (
              <>
                <Check />
                Shortcut saved
              </>
            ) : chord.phase === "live" ? (
              <>
                <span className={CLASSES.dot} />
                Recording
              </>
            ) : (
              "Listening"
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
