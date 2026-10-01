<script module lang="ts">
</script>

<script lang="ts">
  import { onMount } from "svelte"
  import {
    createTypewriter,
    DEFAULT_HOLD,
    DEFAULT_JITTER,
    DEFAULT_SPEED,
    DEFAULT_START_DELAY,
    DEFAULT_TEXT,
    type TypewriterInstance,
    type TypewriterOptions,
  } from "./typewriter-vanilla"

  function cn(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ")
  }

  interface Props extends TypewriterOptions {
    class?: string
  }

  let {
    class: className = "",
    text = DEFAULT_TEXT,
    speed = DEFAULT_SPEED,
    humanize = true,
    loop = true,
    hold = DEFAULT_HOLD,
    startDelay = DEFAULT_START_DELAY,
    columns = 0,
    ticks = true,
    jitter = DEFAULT_JITTER,
    sound = false,
    onDone,
  }: Props = $props()

  let root: HTMLDivElement | undefined = $state()
  let instance: TypewriterInstance | null = null

  onMount(() => {
    if (!root) return
    instance = createTypewriter(root, {
      text,
      speed,
      humanize,
      loop,
      hold,
      startDelay,
      columns,
      ticks,
      jitter,
      sound,
      onDone,
    })
    return () => {
      instance?.destroy()
      instance = null
    }
  })

  $effect(() => {
    instance?.setOptions({
      text,
      speed,
      humanize,
      loop,
      hold,
      startDelay,
      columns,
      ticks,
      jitter,
      sound,
      onDone,
    })
  })
</script>

<div
  bind:this={root}
  data-slot="typewriter"
  class={cn(
    "relative size-full overflow-hidden bg-background p-6 font-mono text-foreground",
    className
  )}
></div>
