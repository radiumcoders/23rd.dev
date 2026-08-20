<script module lang="ts">
</script>

<script lang="ts">
  import { onMount } from "svelte"
  import {
    buildRings,
    DEFAULT_LINES,
    type TangleFooterOptions,
  } from "./tangle-footer-vanilla"

  function cn(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ")
  }

  interface Props extends TangleFooterOptions {
    class?: string
  }

  let {
    class: className = "",
    lines = DEFAULT_LINES,
    ribbon,
    textColor,
    background,
    height,
    seed = 23,
    label = "Site footer",
  }: Props = $props()

  let uid = $state("")
  let rootEl: HTMLElement | undefined = $state()
  let width = $state(0)
  let paused = $state(false)
  let reduce = $state(false)

  const bandHeight = $derived(height ?? (width > 0 ? width / 2 : 0))
  const rings = $derived(
    width > 0 && bandHeight > 0
      ? buildRings(width, bandHeight, lines, seed)
      : []
  )
  const showSvg = $derived(uid !== "" && width > 0 && bandHeight > 0)

  onMount(() => {
    uid =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID().replace(/-/g, "")
        : `tangle${Date.now().toString(36)}`

    const el = rootEl
    if (!el) return

    const measure = () => {
      width = el.clientWidth
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)

    const io = new IntersectionObserver(
      ([entry]) => {
        paused = !(entry?.isIntersecting ?? true)
      },
      { rootMargin: "64px", threshold: 0 }
    )
    io.observe(el)

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const applyReduce = () => {
      reduce = mq.matches
    }
    applyReduce()
    mq.addEventListener("change", applyReduce)

    return () => {
      ro.disconnect()
      io.disconnect()
      mq.removeEventListener("change", applyReduce)
    }
  })
</script>

<footer
  bind:this={rootEl}
  data-slot="tangle-footer"
  aria-label={label}
  class={cn(
    "relative w-full overflow-hidden",
    background === undefined && "bg-[#EFEAE2] dark:bg-[#121210]",
    ribbon == null && "[--tangle-ribbon:#141414] dark:[--tangle-ribbon:#E8E4DC]",
    textColor == null &&
      "[--tangle-text:#F4F0E8] dark:[--tangle-text:#161616]",
    className
  )}
  style:background={background}
  style:height={bandHeight > 0 ? `${bandHeight}px` : undefined}
  style:aspect-ratio={height == null ? "2 / 1" : undefined}
>
  {#if showSvg}
    <svg
      class="absolute inset-0 size-full"
      class:tangle-enter={!reduce}
      viewBox="0 0 {width} {bandHeight}"
      preserveAspectRatio="xMidYMax slice"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {#each rings as ring, i}
          <path id="{uid}-path-{i}" d={ring.d} fill="none"></path>
        {/each}
      </defs>

      {#each rings as ring, i}
        {@const pathId = `${uid}-path-${i}`}
        <g
          style={reduce
            ? undefined
            : `transform-box: view-box; transform-origin: ${ring.cx}px ${ring.cy}px; animation: tangle-spin ${ring.duration}s linear infinite; animation-direction: ${ring.reverse ? "reverse" : "normal"}; animation-delay: ${-ring.phase * ring.duration}s; animation-play-state: ${paused ? "paused" : "running"}; will-change: transform;`}
        >
          <use
            href="#{pathId}"
            stroke-width={ring.strokeWidth}
            stroke-linecap="round"
            stroke-linejoin="round"
            fill="none"
            style="stroke: {ribbon ?? 'var(--tangle-ribbon)'};"
          ></use>
          <text
            font-size={ring.fontSize}
            font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
            font-weight="700"
            letter-spacing="0.05em"
            dominant-baseline="central"
            style="fill: {textColor ??
              'var(--tangle-text)'}; user-select: none; pointer-events: none;"
          >
            <textPath href="#{pathId}" startOffset="0" method="align"
              >{ring.text}</textPath
            >
          </text>
        </g>
      {/each}
    </svg>
  {/if}

  <p class="sr-only">{lines.join(" ")}</p>
</footer>

<style>
  @keyframes -global-tangle-spin {
    to {
      transform: rotate(360deg);
    }
  }

  @keyframes tangle-enter {
    from {
      opacity: 0;
      transform: translateY(12px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .tangle-enter {
    animation: tangle-enter 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
  }
</style>
