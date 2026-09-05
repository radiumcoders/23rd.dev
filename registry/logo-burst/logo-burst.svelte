<script module lang="ts">
</script>

<script lang="ts">
  import { onMount, type Snippet } from "svelte"
  import {
    createLogoBurst,
    DEFAULT_CORE_SIZE,
    DEFAULT_DURATION,
    DEFAULT_PARTICLE_RATIO,
    DEFAULT_RADIUS,
    DEFAULT_SEED,
    DEFAULT_TENTACLE_COUNT,
    type LogoBurstInstance,
    type LogoBurstOptions,
  } from "./logo-burst-vanilla"

  function cn(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ")
  }

  interface Props extends Omit<LogoBurstOptions, "onThemeChange"> {
    class?: string
    /** Optional centered mark. Omitted by default — the burst is the hero. */
    children?: Snippet
    /**
     * Increment to replay the explosion. Mount already plays once.
     */
    replayKey?: number
    /** Click the field to replay the burst. Default `true`. */
    replayOnClick?: boolean
    /** Accessible name. Default `"Logo burst"`. */
    label?: string
  }

  let {
    class: className = "",
    children,
    tentacleCount = DEFAULT_TENTACLE_COUNT,
    color,
    coreSize,
    radius = DEFAULT_RADIUS,
    duration = DEFAULT_DURATION,
    seed = DEFAULT_SEED,
    particleRatio = DEFAULT_PARTICLE_RATIO,
    theme = "auto",
    breathe = true,
    replayKey = 0,
    replayOnClick = true,
    label = "Logo burst",
  }: Props = $props()

  let canvas: HTMLCanvasElement | undefined = $state()
  let core: HTMLElement | undefined = $state()
  let instance: LogoBurstInstance | null = null
  let lastReplayKey: number | null = null

  onMount(() => {
    if (!canvas) return
    instance = createLogoBurst(canvas, {
      tentacleCount,
      color,
      coreSize: coreSize ?? DEFAULT_CORE_SIZE,
      radius,
      duration,
      seed,
      particleRatio,
      theme,
      breathe,
    })
    return () => {
      instance?.destroy()
      instance = null
    }
  })

  $effect(() => {
    instance?.setOptions({
      tentacleCount,
      color,
      coreSize,
      radius,
      duration,
      seed,
      particleRatio,
      theme,
      breathe,
    })
  })

  $effect(() => {
    const el = core
    const override = coreSize
    if (!el || !children || override !== undefined) return
    const sync = () => {
      const box = el.getBoundingClientRect()
      const measured = Math.max(box.width, box.height)
      if (measured > 0) instance?.setOptions({ coreSize: measured })
    }
    sync()
    const ro = new ResizeObserver(sync)
    ro.observe(el)
    return () => ro.disconnect()
  })

  $effect(() => {
    const key = replayKey
    if (lastReplayKey === null) {
      lastReplayKey = key
      return
    }
    if (key === lastReplayKey) return
    lastReplayKey = key
    instance?.replay()
  })

  function replay() {
    instance?.replay()
  }
</script>

<div
  data-slot="logo-burst"
  role={replayOnClick ? undefined : "img"}
  aria-label={replayOnClick ? undefined : label}
  class={cn("relative isolate size-full overflow-hidden", className)}
>
  <canvas
    bind:this={canvas}
    aria-hidden="true"
    class="absolute inset-0 size-full"
  ></canvas>
  {#if children}
    <div
      class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
    >
      <div bind:this={core}>
        {@render children()}
      </div>
    </div>
  {/if}
  {#if replayOnClick}
    <button
      type="button"
      aria-label="Replay burst"
      onclick={replay}
      class="absolute inset-0 z-20 cursor-pointer border-0 bg-transparent p-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
    ></button>
  {/if}
</div>
