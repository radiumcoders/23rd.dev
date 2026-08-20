<script module>
</script>

<script>
  import { onMount } from "svelte"

  import { cn } from "$lib/utils"
  import {
    applyResistance,
    columnScale,
    createSpring,
    DEFAULT_COLORS,
    DEFAULT_COLUMNS,
    elementAtBottom,
    hexToRgba,
    POP_BOOST,
    PULL_GAIN,
    STRETCHY_FOOTER_PLAY,
    WHEEL_IDLE_MS,
    windowAtBottom,
    type StretchyFooterPlayDetail,
    type Spring,
  } from "./stretchy-footer-vanilla"

  interface Props {
    class?: string
    /**
     * Page content inside the overflow scroller.
     * Ignored when `scrollEl` / `windowScroll` paint overlay-only.
     */
    children?: import("svelte").Snippet
    /**
     * External scroll container. When set, this component only paints the
     * aurora overlay and binds overscroll listeners to that element.
     * When omitted (and `windowScroll` is false), this component *is* the scroller.
     */
    scrollEl?: HTMLElement
    /**
     * Bind overscroll to the window and paint a fixed bottom aurora.
     * Use on full pages (e.g. the component docs) instead of a nested scroller.
     */
    windowScroll?: boolean
    /**
     * Element that lifts with the stretch (CSS selector).
     * Used with `windowScroll` / `scrollEl`. Default `[data-stretchy-page]`.
     */
    contentSelector?: string
    /** Peak stretch in px. Default `280`. */
    maxStretch?: number
    /** Spectrum stops across the aurora columns. */
    colors?: string[]
    /** Spring stiffness. Default `380`. */
    stiffness?: number
    /** Spring damping. Default `32`. */
    damping?: number
    /** How many vertical aurora bars. Default `48`. */
    columns?: number
    /** Accessible label for the decorative field. */
    label?: string
    /**
     * Optional id for docs demos. `playStretchyFooterDemo({ target })` only
     * animates footers whose `demoId` matches.
     */
    demoId?: string
  }

  let {
    class: className = "",
    children,
    scrollEl,
    windowScroll = false,
    contentSelector = "[data-stretchy-page]",
    maxStretch = 280,
    colors = DEFAULT_COLORS,
    stiffness = 380,
    damping = 32,
    columns = DEFAULT_COLUMNS,
    label = "Stretchy overflow",
    demoId,
  }: Props = $props()

  let mounted = $state(false)
  let reduceMotion = $state(false)
  let demoPlaying = $state(false)
  let progress = $state(0)
  let fieldOpacity = $state(0)
  let pageY = $state(0)
  let internalEl: HTMLDivElement | undefined = $state()

  let pull = 0
  let demoPlayingRef = false
  let spring: Spring | null = null
  let rolledEl: HTMLElement | null = null
  let touchStartY = 0
  let touchStretch0 = 0
  let wheelTimer: ReturnType<typeof setTimeout> | null = null
  let demoTimer: ReturnType<typeof setTimeout> | null = null

  const reduce = $derived(mounted && reduceMotion && !demoPlaying)

  const bars = $derived.by(() => {
    const count = Math.max(8, Math.min(96, Math.floor(columns)))
    return Array.from({ length: count }, (_, i) => {
      const color = colors[i % colors.length]!
      const heightPct = Math.max(28, columnScale(i, count) * 100).toFixed(2)
      return {
        key: i,
        height: `${heightPct}%`,
        backgroundImage: `linear-gradient(to top, ${hexToRgba(color, 1)} 0%, ${hexToRgba(color, 0.6)} 45%, rgba(0, 0, 0, 0) 100%)`,
      }
    })
  })

  function applyVisuals(v: number) {
    const p =
      maxStretch <= 0 ? 0 : Math.min(1, Math.max(0, v / maxStretch))
    progress = p
    pageY = -v
    fieldOpacity = p <= 0 ? 0 : p >= 0.08 ? 1 : p / 0.08

    if (reduceMotion && !demoPlayingRef) return
    if (!windowScroll && !scrollEl) return

    if (!rolledEl?.isConnected) {
      rolledEl = document.querySelector(contentSelector)
    }
    const el = rolledEl
    if (!el) return

    const y = -Math.max(0, v)
    el.style.transformOrigin = "50% 100%"
    el.style.willChange = "transform"
    el.style.transform = `translate3d(0, ${y}px, 0)`

    if (v < 0.2) {
      el.style.transform = "translate3d(0, 0, 0)"
      el.style.willChange = ""
    }
  }

  function pullTo(next: number) {
    pull = next
    spring?.set(next)
  }

  onMount(() => {
    mounted = true
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const applyReduce = () => {
      reduceMotion = mq.matches
    }
    applyReduce()
    mq.addEventListener("change", applyReduce)
    return () => {
      mq.removeEventListener("change", applyReduce)
      if (rolledEl) {
        rolledEl.style.transform = ""
        rolledEl.style.transformOrigin = ""
        rolledEl.style.willChange = ""
      }
    }
  })

  $effect(() => {
    const s = createSpring({
      stiffness,
      damping,
      mass: 0.35,
    })
    spring = s
    const unsub = s.onChange((v) => {
      applyVisuals(v)
    })
    return () => {
      unsub()
      s.destroy()
      if (spring === s) spring = null
    }
  })

  $effect(() => {
    const clearDemoTimer = () => {
      if (demoTimer) {
        clearTimeout(demoTimer)
        demoTimer = null
      }
    }

    const onPlay = (event: Event) => {
      const detail =
        (event as CustomEvent<StretchyFooterPlayDetail>).detail ?? {}
      if (detail.target != null && detail.target !== demoId) return
      if (detail.target == null && demoId != null) return

      const amount = detail.amount ?? 0.82
      const holdMs = detail.holdMs ?? 700

      if (wheelTimer) {
        clearTimeout(wheelTimer)
        wheelTimer = null
      }
      clearDemoTimer()
      demoPlayingRef = true
      demoPlaying = true
      pullTo(Math.min(maxStretch, Math.max(0, maxStretch * amount)))
      demoTimer = setTimeout(() => {
        demoTimer = null
        pullTo(0)
        window.setTimeout(() => {
          demoPlayingRef = false
          demoPlaying = false
        }, 500)
      }, holdMs)
    }

    window.addEventListener(STRETCHY_FOOTER_PLAY, onPlay)
    return () => {
      clearDemoTimer()
      window.removeEventListener(STRETCHY_FOOTER_PLAY, onPlay)
    }
  })

  $effect(() => {
    if (reduceMotion) return

    let target: { kind: "window" } | { kind: "element"; el: HTMLElement } | null =
      null
    if (windowScroll) {
      target = { kind: "window" }
    } else {
      const el = scrollEl ?? internalEl
      if (el) target = { kind: "element", el }
    }
    if (!target) return

    const prevOverscroll =
      target.kind === "window"
        ? document.documentElement.style.overscrollBehaviorY
        : target.el.style.overscrollBehaviorY
    if (target.kind === "window") {
      document.documentElement.style.overscrollBehaviorY = "none"
    } else {
      target.el.style.overscrollBehaviorY = "none"
    }

    const isAtBottom = () =>
      target.kind === "window" ? windowAtBottom() : elementAtBottom(target.el)

    const clearWheelTimer = () => {
      if (wheelTimer) {
        clearTimeout(wheelTimer)
        wheelTimer = null
      }
    }

    const snapBack = () => {
      clearWheelTimer()
      pullTo(0)
    }

    const onWheel = (event: WheelEvent) => {
      if (demoTimer) {
        clearTimeout(demoTimer)
        demoTimer = null
        demoPlaying = false
        demoPlayingRef = false
      }
      const current = pull
      const scrollingDown = event.deltaY > 0
      const scrollingUp = event.deltaY < 0
      const stretchNow = spring?.get() ?? 0

      if (current > 0.5 || stretchNow > 0.5) {
        event.preventDefault()
        if (scrollingUp) {
          const next = Math.max(0, current + event.deltaY * PULL_GAIN)
          if (next <= 0.5) {
            snapBack()
            return
          }
          pullTo(next)
        } else if (scrollingDown) {
          pullTo(applyResistance(current, event.deltaY, maxStretch))
        }
        clearWheelTimer()
        wheelTimer = setTimeout(snapBack, WHEEL_IDLE_MS)
        return
      }

      if (scrollingDown && isAtBottom()) {
        event.preventDefault()
        pullTo(applyResistance(0, event.deltaY, maxStretch))
        clearWheelTimer()
        wheelTimer = setTimeout(snapBack, WHEEL_IDLE_MS)
      }
    }

    const onTouchStart = (event: TouchEvent) => {
      const t = event.touches[0]
      if (!t) return
      if (demoTimer) {
        clearTimeout(demoTimer)
        demoTimer = null
        demoPlaying = false
        demoPlayingRef = false
      }
      touchStartY = t.clientY
      touchStretch0 = pull
    }

    const onTouchMove = (event: TouchEvent) => {
      const t = event.touches[0]
      if (!t) return
      const dy = touchStartY - t.clientY
      const current = pull
      const stretchNow = spring?.get() ?? 0

      if (current > 0.5 || stretchNow > 0.5 || (dy > 0 && isAtBottom())) {
        if (event.cancelable) event.preventDefault()
        const boost = current < 40 ? POP_BOOST : 1
        const fromRest = touchStretch0 + dy * PULL_GAIN * boost
        pullTo(Math.min(maxStretch, Math.max(0, fromRest)))
      }
    }

    const onTouchEnd = () => {
      const stretchNow = spring?.get() ?? 0
      if (pull > 0.5 || stretchNow > 0.5) snapBack()
    }

    const optsWheel = { passive: false }
    const optsTouchStart = { passive: true }
    const optsTouchMove = { passive: false }

    if (target.kind === "window") {
      window.addEventListener("wheel", onWheel, optsWheel)
      window.addEventListener("touchstart", onTouchStart, optsTouchStart)
      window.addEventListener("touchmove", onTouchMove, optsTouchMove)
      window.addEventListener("touchend", onTouchEnd)
      window.addEventListener("touchcancel", onTouchEnd)
    } else {
      const el = target.el
      el.addEventListener("wheel", onWheel, optsWheel)
      el.addEventListener("touchstart", onTouchStart, optsTouchStart)
      el.addEventListener("touchmove", onTouchMove, optsTouchMove)
      el.addEventListener("touchend", onTouchEnd)
      el.addEventListener("touchcancel", onTouchEnd)
    }

    return () => {
      clearWheelTimer()
      if (target.kind === "window") {
        document.documentElement.style.overscrollBehaviorY = prevOverscroll
        window.removeEventListener("wheel", onWheel)
        window.removeEventListener("touchstart", onTouchStart)
        window.removeEventListener("touchmove", onTouchMove)
        window.removeEventListener("touchend", onTouchEnd)
        window.removeEventListener("touchcancel", onTouchEnd)
      } else {
        target.el.style.overscrollBehaviorY = prevOverscroll
        const el = target.el
        el.removeEventListener("wheel", onWheel)
        el.removeEventListener("touchstart", onTouchStart)
        el.removeEventListener("touchmove", onTouchMove)
        el.removeEventListener("touchend", onTouchEnd)
        el.removeEventListener("touchcancel", onTouchEnd)
      }
    }
  })
</script>

{#snippet aurora()}
  <div
    aria-hidden="true"
    class="pointer-events-none absolute inset-x-0 bottom-0 z-20 overflow-hidden"
    style="height: {maxStretch}px;"
  >
    <div
      class="absolute inset-x-0 bottom-0 h-full w-full origin-bottom will-change-transform"
      style="transform: scaleY({reduce ? 0 : progress}); opacity: {reduce
        ? 0
        : fieldOpacity};"
    >
      <div
        class="absolute inset-0 flex items-end justify-stretch"
        style="filter: blur(14px); transform: scaleY(1.08);"
      >
        {#each bars as bar (bar.key)}
          <div
            class="min-w-0 flex-1"
            style="height: {bar.height}; background-image: {bar.backgroundImage};"
          ></div>
        {/each}
      </div>

      <div
        class="absolute inset-x-0 bottom-0 h-1/2"
        style="background-image: radial-gradient(ellipse 70% 100% at 50% 100%, rgba(255,255,255,0.22), rgba(0, 0, 0, 0) 70%);"
      ></div>
    </div>
  </div>
{/snippet}

{#if windowScroll}
  {#if mounted}
    <svelte:body>
      <div
        data-slot="stretchy-footer"
        aria-label={label}
        class={cn(
          "pointer-events-none fixed inset-x-0 bottom-0 z-50",
          className
        )}
        style="height: {maxStretch}px;"
      >
        {@render aurora()}
      </div>
    </svelte:body>
  {/if}
{:else if scrollEl}
  <div
    data-slot="stretchy-footer"
    aria-label={label}
    class={cn("pointer-events-none absolute inset-x-0 bottom-0", className)}
    style="height: {maxStretch}px;"
  >
    {@render aurora()}
  </div>
{:else}
  <div
    bind:this={internalEl}
    data-slot="stretchy-footer"
    aria-label={label}
    class={cn(
      "relative isolate overflow-y-auto overflow-x-hidden overscroll-none",
      className
    )}
  >
    <div
      class="relative z-10 min-h-full will-change-transform"
      style="transform: translateY({pageY}px);"
    >
      {@render children?.()}
    </div>
    {@render aurora()}
  </div>
{/if}
