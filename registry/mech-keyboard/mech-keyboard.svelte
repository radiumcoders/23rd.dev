<script module lang="ts">
</script>

<script lang="ts">
  import { onMount } from "svelte"
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

  function cn(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ")
  }

  interface Props {
    x?: number
    y?: number
    scale?: number
    monochrome?: boolean
    interactive?: boolean
    recorder?: boolean
    placeholder?: string
    highlight?: string[]
    platform?: MechKeyboardPlatform | "auto"
    sound?: boolean
    intro?: boolean
    onKey?: (code: string, pressed: boolean) => void
    onShortcut?: (shortcut: MechKeyboardShortcut) => void
    class?: string
  }

  let {
    x = 0,
    y = 0,
    scale = 1,
    monochrome = false,
    interactive = true,
    recorder = true,
    placeholder = DEFAULT_PLACEHOLDER,
    highlight,
    platform = "auto",
    sound = false,
    intro = true,
    onKey,
    onShortcut,
    class: className = "",
  }: Props = $props()

  let root: HTMLDivElement | undefined = $state()
  let stage: HTMLDivElement | undefined = $state()
  let instance: MechKeyboardInstance | null = null
  let detected: MechKeyboardPlatform = $state("pc")
  let codes: string[] = $state([])
  let phase: MechKeyboardChordPhase = $state("idle")

  const resolvedPlatform = $derived(platform === "auto" ? detected : platform)
  const shortcut = $derived(formatShortcut(codes, resolvedPlatform))
  const style = $derived(
    Object.entries(recorderVars(monochrome))
      .map(([key, value]) => `${key}: ${value}`)
      .join("; ")
  )

  onMount(() => {
    detected = detectPlatform()
    if (!root || !stage) return
    instance = createMechKeyboard(root, stage, {
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
      onKey: (code, pressed) => onKey?.(code, pressed),
      onShortcut: (s) => onShortcut?.(s),
      onChord: (next, nextPhase) => {
        codes = next
        phase = nextPhase
      },
    })
    return () => {
      instance?.destroy()
      instance = null
    }
  })

  $effect(() => {
    instance?.setOptions({
      x,
      y,
      scale,
      monochrome,
      interactive,
      sound,
      intro,
      recorder,
      highlight: highlight ?? [],
      platform: resolvedPlatform,
    })
  })
</script>

<div
  bind:this={root}
  data-slot="mech-keyboard"
  tabindex={interactive ? 0 : undefined}
  role="application"
  aria-label="Mechanical keyboard"
  {style}
  class={cn(CLASSES.root, className)}
>
  <div bind:this={stage} class={CLASSES.stage}></div>
  {#if recorder}
    <div aria-live="polite" class={CLASSES.recorder}>
      <div class={CLASSES.chips}>
        {#if shortcut.keys.length === 0}
          <span class={CLASSES.placeholder}>{placeholder}</span>
        {:else}
          {#each shortcut.keys as key, i (shortcut.codes[i])}
            {#if i > 0}<span class={CLASSES.plus}>+</span>{/if}
            <kbd data-live={phase === "live" ? "" : undefined} class={CLASSES.chip}>
              <span class={CLASSES.chipTop}>{key}</span>
            </kbd>
          {/each}
        {/if}
      </div>
      <div class={CLASSES.status}>
        {#if phase === "done"}
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" class={CLASSES.check}>
            <path
              d="M3.5 8.5l3 3 6-7"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          Shortcut saved
        {:else if phase === "live"}
          <span class={CLASSES.dot}></span>
          Recording
        {:else}
          Listening
        {/if}
      </div>
    </div>
  {/if}
</div>
