"use client"

import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ClipboardEvent,
  type DragEvent,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from "react"
import {
  AnimatePresence,
  LayoutGroup,
  MotionConfig,
  motion,
  useReducedMotion,
} from "motion/react"

import { cn } from "@/lib/utils"

import { accepts, newId } from "./prompt-box-vanilla"

export type PromptBoxAttachment = {
  id: string
  name: string
  /** Image URL for the pill and the preview. */
  url: string
  file?: File
  /** 0–1 while uploading. Omit once it's ready. */
  progress?: number
  error?: boolean
}

type Size = { w: number; h: number }

export type PromptBoxMessage = {
  text: string
  attachments: PromptBoxAttachment[]
}

export type PromptBoxProps = {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  /** Enter sends; Shift+Enter is a new line. Uncontrolled text and attachments clear after. */
  onSubmit?: (message: PromptBoxMessage) => void
  placeholder?: string
  attachments?: PromptBoxAttachment[]
  defaultAttachments?: PromptBoxAttachment[]
  onAttachmentsChange?: (attachments: PromptBoxAttachment[]) => void
  /** File types the picker, paste, and drop accept. Default `"image/*"` */
  accept?: string
  /** Default `6` */
  maxAttachments?: number
  /** A reply is in progress: the send button becomes stop. */
  busy?: boolean
  onStop?: () => void
  disabled?: boolean
  /** Extra controls beside the attach button: model pickers, modes. */
  toolbar?: ReactNode
  /** Default `2` */
  minRows?: number
  /** Default `8` */
  maxRows?: number
  className?: string
}

/** The pill's lift, and the island's float: shadows set in style so the
 * layout animation corrects them as the shapes scale. */
const PILL_SHADOW = "0 1px 2px rgb(0 0 0 / 0.06)"
const ISLAND_SHADOW =
  "0 0 0 1px rgb(127 127 127 / 0.12), 0 2px 4px rgb(0 0 0 / 0.05), 0 24px 48px -18px rgb(0 0 0 / 0.38)"

/** Tallest the island's image gets, and the island's inset from the prompt. */
const ISLAND_HEIGHT = 300
const INSET = 8

/** One spring for every moving part, so they read as one movement. */
const spring = {
  type: "spring" as const,
  visualDuration: 0.38,
  bounce: 0.14,
}

function useControllable<T>(
  value: T | undefined,
  fallback: T,
  onChange: ((next: T) => void) | undefined
) {
  const [inner, setInner] = useState(fallback)
  const controlled = value !== undefined
  const current = controlled ? value : inner
  const set = useCallback(
    (next: T) => {
      if (!controlled) setInner(next)
      onChange?.(next)
    },
    [controlled, onChange]
  )
  return [current, set, controlled] as const
}

/**
 * A prompt field for AI chat, set in a soft shell. Images attach as pills
 * in the shell by picker, paste, or drop; clicking one opens it large there,
 * and the shell grows to hold it. While a reply is busy, send turns stop.
 */
export function PromptBox({
  value,
  defaultValue = "",
  onValueChange,
  onSubmit,
  placeholder = "Ask anything…",
  attachments,
  defaultAttachments = [],
  onAttachmentsChange,
  accept = "image/*",
  maxAttachments = 6,
  busy = false,
  onStop,
  disabled = false,
  toolbar,
  minRows = 2,
  maxRows = 8,
  className,
}: PromptBoxProps) {
  const [text, setText, textControlled] = useControllable(
    value,
    defaultValue,
    onValueChange
  )
  const [files, setFiles, filesControlled] = useControllable(
    attachments,
    defaultAttachments,
    onAttachmentsChange
  )
  const reduce = useReducedMotion()
  const group = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const shellRef = useRef<HTMLDivElement>(null)
  const areaRef = useRef<HTMLTextAreaElement>(null)
  const pickerRef = useRef<HTMLInputElement>(null)
  const dragDepth = useRef(0)
  const [dragging, setDragging] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  /** Left edge of the open pill within the prompt; the island floats over it. */
  const [anchor, setAnchor] = useState(0)
  /** Natural size per attachment, learned when its pill loads. */
  const [sizes, setSizes] = useState<Record<string, Size>>({})
  /** Object URLs this component made, so it can free the ones it drops. */
  const ownUrls = useRef(new Set<string>())
  const filesRef = useRef(files)

  const open = files.find((file) => file.id === openId) ?? null
  // Layout animates when the open image or the set of files changes, not
  // on every keystroke or upload tick.
  const layoutKey = `${open?.id ?? ""}:${files.map((file) => file.id).join()}`

  useEffect(() => {
    filesRef.current = files
  }, [files])

  useEffect(() => {
    const owned = ownUrls.current
    return () => {
      for (const file of filesRef.current) {
        if (owned.has(file.url)) URL.revokeObjectURL(file.url)
      }
    }
  }, [])

  // The island floats over the page, so a click anywhere else closes it.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpenId(null)
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [open])

  // Grow with the text between minRows and maxRows.
  useLayoutEffect(() => {
    const area = areaRef.current
    if (!area) return
    const s = getComputedStyle(area)
    const line = parseFloat(s.lineHeight) || 24
    const pad = parseFloat(s.paddingTop) + parseFloat(s.paddingBottom)
    area.style.height = "0px"
    const fit = Math.min(
      Math.max(area.scrollHeight, line * minRows + pad),
      line * maxRows + pad
    )
    area.style.height = `${fit}px`
  }, [text, minRows, maxRows])

  const room = Math.max(0, maxAttachments - files.length)
  const ready = files.every(
    (file) => file.progress === undefined && !file.error
  )
  const canSend =
    !disabled && ready && (text.trim().length > 0 || files.length > 0)

  const addFiles = (list: Iterable<File>) => {
    const picked = [...list]
      .filter((file) => accepts(file, accept))
      .slice(0, room)
    if (picked.length === 0) return false
    const next = picked.map((file) => {
      const url = URL.createObjectURL(file)
      ownUrls.current.add(url)
      return { id: newId(), name: file.name, url, file }
    })
    setFiles([...files, ...next])
    return true
  }

  const remove = (id: string) => {
    const gone = files.find((file) => file.id === id)
    if (gone && ownUrls.current.has(gone.url)) {
      URL.revokeObjectURL(gone.url)
      ownUrls.current.delete(gone.url)
    }
    setFiles(files.filter((file) => file.id !== id))
    areaRef.current?.focus()
  }

  const submit = () => {
    if (!canSend || busy) return
    // The receiver owns these URLs now.
    for (const file of files) ownUrls.current.delete(file.url)
    onSubmit?.({ text: text.trimEnd(), attachments: files })
    setOpenId(null)
    if (!textControlled) setText("")
    if (!filesControlled) setFiles([])
  }

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      event.key !== "Enter" ||
      event.shiftKey ||
      event.nativeEvent.isComposing
    ) {
      return
    }
    event.preventDefault()
    submit()
  }

  const onPaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    if (event.clipboardData.files.length === 0) return
    if (
      addFiles(event.clipboardData.files) &&
      !event.clipboardData.getData("text")
    ) {
      event.preventDefault()
    }
  }

  const hasFiles = (event: DragEvent) =>
    !disabled && [...event.dataTransfer.types].includes("Files")

  const dragProps = {
    onDragEnter(event: DragEvent) {
      if (!hasFiles(event)) return
      event.preventDefault()
      dragDepth.current++
      setDragging(true)
    },
    onDragOver(event: DragEvent) {
      if (!hasFiles(event)) return
      event.preventDefault()
      event.dataTransfer.dropEffect = room > 0 ? "copy" : "none"
    },
    onDragLeave(event: DragEvent) {
      if (!hasFiles(event)) return
      dragDepth.current = Math.max(0, dragDepth.current - 1)
      if (dragDepth.current === 0) setDragging(false)
    },
    onDrop(event: DragEvent) {
      if (!hasFiles(event)) return
      event.preventDefault()
      dragDepth.current = 0
      setDragging(false)
      addFiles(event.dataTransfer.files)
      areaRef.current?.focus()
    },
  }

  return (
    <MotionConfig
      transition={reduce ? { duration: 0 } : spring}
      reducedMotion="user"
    >
      <LayoutGroup id={group}>
        <div
          ref={rootRef}
          {...dragProps}
          data-slot="prompt-box"
          data-busy={busy || undefined}
          onKeyDown={(event) => {
            if (event.key === "Escape" && open) {
              event.stopPropagation()
              setOpenId(null)
            }
          }}
          className={cn("relative w-full", className)}
        >
          {/* An open image splits off its pill and floats above the shell,
              out of the flow, so the prompt itself never moves. */}
          <AnimatePresence initial={false}>
            {open ? (
              <Island
                key={open.id}
                file={open}
                size={sizes[open.id]}
                anchor={anchor}
                onClose={() => setOpenId(null)}
                onRemove={disabled ? undefined : () => remove(open.id)}
              />
            ) : null}
          </AnimatePresence>

          <motion.div
            ref={shellRef}
            layout
            layoutDependency={layoutKey}
            style={{ borderRadius: 28 }}
            className={cn(
              "relative bg-foreground/[0.045] p-2 dark:bg-foreground/[0.06]",
              disabled && "opacity-60"
            )}
          >
            {files.length > 0 ? (
              <motion.ul
                layout="position"
                layoutDependency={layoutKey}
                aria-label="Attachments"
                className="relative flex flex-wrap gap-1.5 px-0.5 pt-0.5 pb-1.5"
              >
                <AnimatePresence initial={false} mode="popLayout">
                  {files.map((file) => (
                    <Pill
                      key={file.id}
                      file={file}
                      layoutKey={layoutKey}
                      open={file.id === open?.id}
                      onToggle={(pill) => {
                        const root = rootRef.current
                        if (root) {
                          setAnchor(
                            pill.getBoundingClientRect().left -
                              root.getBoundingClientRect().left
                          )
                        }
                        setOpenId((id) => (id === file.id ? null : file.id))
                      }}
                      onSize={(size) =>
                        setSizes((prev) =>
                          prev[file.id]?.w === size.w &&
                          prev[file.id]?.h === size.h
                            ? prev
                            : { ...prev, [file.id]: size }
                        )
                      }
                      onRemove={disabled ? undefined : () => remove(file.id)}
                    />
                  ))}
                </AnimatePresence>
              </motion.ul>
            ) : null}

            <motion.div
              layout="position"
              layoutDependency={layoutKey}
              style={{ borderRadius: 20 }}
              onClick={(event) => {
                if (event.target === event.currentTarget)
                  areaRef.current?.focus()
              }}
              className="relative bg-background shadow-[0_1px_2px_rgb(0_0_0/0.05),0_6px_20px_-10px_rgb(0_0_0/0.12)] transition-shadow duration-200 focus-within:shadow-[0_1px_2px_rgb(0_0_0/0.06),0_8px_24px_-10px_rgb(0_0_0/0.2)]"
            >
              <div className="p-2">
                <textarea
                  ref={areaRef}
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  onKeyDown={onKeyDown}
                  onPaste={onPaste}
                  placeholder={placeholder}
                  aria-label={placeholder}
                  disabled={disabled}
                  rows={minRows}
                  className="block w-full resize-none bg-transparent px-2.5 py-2 text-[15px] leading-6 text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
                />

                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex min-w-0 flex-1 items-center gap-0.5">
                    <PromptBoxAction
                      aria-label="Attach images"
                      title="Attach images"
                      disabled={disabled || room === 0}
                      onClick={() => pickerRef.current?.click()}
                      className="size-9 justify-center px-0"
                    >
                      <PlusIcon />
                    </PromptBoxAction>
                    {toolbar}
                  </div>

                  <button
                    type="button"
                    aria-label={busy ? "Stop" : "Send"}
                    disabled={busy ? disabled : !canSend}
                    onClick={busy ? onStop : submit}
                    className={cn(
                      "relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-[14px] transition-[background-color,color,scale] duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95",
                      busy || canSend
                        ? "bg-foreground text-background hover:bg-foreground/85"
                        : "cursor-not-allowed bg-foreground/[0.07] text-foreground/35"
                    )}
                  >
                    <AnimatePresence initial={false} mode="popLayout">
                      <motion.span
                        key={busy ? "stop" : "send"}
                        initial={{ opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.6 }}
                        className="grid size-9 place-items-center"
                      >
                        {busy ? <StopIcon /> : <ArrowUpIcon />}
                      </motion.span>
                    </AnimatePresence>
                  </button>
                </div>
              </div>
            </motion.div>

            <AnimatePresence>
              {dragging ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="pointer-events-none absolute inset-2 z-10 grid place-items-center rounded-[20px] border-[1.5px] border-dashed border-foreground/25 bg-background/90"
                >
                  <span className="flex items-center gap-2 text-[13px] font-medium text-foreground">
                    <ImageIcon />
                    {room > 0
                      ? "Drop images to attach"
                      : `Up to ${maxAttachments} files`}
                  </span>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>

          <input
            ref={pickerRef}
            type="file"
            accept={accept}
            multiple
            hidden
            tabIndex={-1}
            onChange={(event) => {
              if (event.target.files) addFiles(event.target.files)
              event.target.value = ""
              areaRef.current?.focus()
            }}
          />
        </div>
      </LayoutGroup>
    </MotionConfig>
  )
}

/** A quiet toolbar button that matches the prompt. Use it in `toolbar`. */
export const PromptBoxAction = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement>
>(function PromptBoxAction({ className, type = "button", ...props }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[14px] px-2.5 text-[13px] font-medium text-muted-foreground transition-colors outline-none hover:bg-foreground/[0.05] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40",
        className
      )}
      {...props}
    />
  )
})

function Pill({
  ref,
  file,
  layoutKey,
  open,
  onToggle,
  onSize,
  onRemove,
}: {
  /** AnimatePresence's popLayout needs the element to lift out of the flow. */
  ref?: Ref<HTMLLIElement>
  file: PromptBoxAttachment
  layoutKey: string
  open: boolean
  /** Called with the pill, so the island can float above it. */
  onToggle: (pill: HTMLElement) => void
  onSize: (size: Size) => void
  onRemove?: () => void
}) {
  const uploading = file.progress !== undefined && !file.error
  const pct = Math.round((file.progress ?? 0) * 100)

  return (
    <motion.li
      ref={ref}
      layout="position"
      layoutDependency={layoutKey}
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92 }}
      className={cn(
        "relative flex h-8 max-w-full items-center rounded-full text-foreground transition-colors duration-200",
        // The open pill inverts: it is the one shown above.
        open && "bg-foreground text-background",
        file.error && "text-destructive"
      )}
    >
      {open ? null : (
        // The capsule is shared with the island: opening, it lifts off
        // the pill and swells into the island; closing, it settles back.
        <motion.span
          aria-hidden="true"
          layoutId={`island-${file.id}`}
          layoutCrossfade={false}
          className="absolute inset-0 bg-background"
          style={{ borderRadius: 16, boxShadow: PILL_SHADOW }}
        />
      )}
      {uploading ? (
        // Clipped on its own layer: the pill itself must not clip, or the
        // thumbnail would be cut off as it flies home.
        <span
          aria-hidden="true"
          className="absolute inset-0 overflow-hidden rounded-full"
        >
          <motion.span
            initial={false}
            animate={{ width: `${pct}%` }}
            className="absolute inset-y-0 left-0 bg-foreground/[0.06]"
          />
        </span>
      ) : null}
      <button
        type="button"
        onClick={(event) =>
          onToggle(event.currentTarget.closest("li") ?? event.currentTarget)
        }
        aria-expanded={open}
        aria-label={`${open ? "Close" : "Open"} ${file.name}${
          uploading ? `, uploading ${pct}%` : ""
        }`}
        title={file.name}
        className="relative flex h-full min-w-0 items-center gap-2 rounded-full ps-1 pe-1.5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {open ? (
          <motion.span
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            className="grid size-6 shrink-0 place-items-center rounded-full bg-background/15"
          >
            <ShownIcon />
          </motion.span>
        ) : (
          // The image itself is the shared element, so the picture and its
          // frame fly as one; a wrapper would counter-scale the picture.
          <motion.img
            layoutId={`image-${file.id}`}
            // One image flies; a crossfade would leave a ghost of the other.
            layoutCrossfade={false}
            src={file.url}
            alt=""
            draggable={false}
            onLoad={(event) => {
              const img = event.currentTarget
              if (img.naturalWidth && img.naturalHeight) {
                onSize({ w: img.naturalWidth, h: img.naturalHeight })
              }
            }}
            // Half the size, not 999: the radius morphs to the preview's, and
            // a huge radius on a growing box would read as an oval mid-flight.
            style={{ borderRadius: 12 }}
            className={cn(
              "relative z-10 size-6 shrink-0 bg-muted object-cover",
              uploading && "opacity-60"
            )}
          />
        )}
        <span className="max-w-[9rem] min-w-0 truncate text-[12.5px] opacity-85">
          {file.name}
        </span>
        {/* Progress shows only as the fill, so the pill keeps its width and
            the pills after it never slide as an upload finishes. */}
        {file.error ? (
          <span className="text-[12px] text-destructive">Failed</span>
        ) : null}
      </button>
      {onRemove ? (
        <button
          type="button"
          aria-label={`Remove ${file.name}`}
          onClick={onRemove}
          className={cn(
            "relative me-1 grid size-6 shrink-0 place-items-center rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
            open
              ? "text-background/60 hover:bg-background/15 hover:text-background"
              : "text-muted-foreground hover:bg-foreground/[0.07] hover:text-foreground"
          )}
        >
          <XIcon className="size-3" />
        </button>
      ) : null}
    </motion.li>
  )
}

function Island({
  ref,
  file,
  size,
  anchor,
  onClose,
  onRemove,
}: {
  ref?: Ref<HTMLDivElement>
  file: PromptBoxAttachment
  size?: Size
  anchor: number
  onClose: () => void
  onRemove?: () => void
}) {
  const ratio = size ? size.w / size.h : 4 / 3
  // Sized by the image: as wide as its shape allows at full height, never
  // wider than the prompt. Narrower still, the height follows the ratio.
  const width = `min(100% - ${INSET * 2}px, ${
    Math.round(ISLAND_HEIGHT * ratio) + INSET * 2
  }px)`
  // Details wait for the image to land, so they never ride the flight.
  const [landed, setLanded] = useState(false)
  useEffect(() => {
    // The spring looks settled well before it reports rest, so go by its
    // visual duration; the completion callback covers anything slower.
    const id = window.setTimeout(
      () => setLanded(true),
      spring.visualDuration * 900
    )
    return () => window.clearTimeout(id)
  }, [])

  return (
    <motion.div
      ref={ref}
      role="dialog"
      aria-label={file.name}
      layoutId={`island-${file.id}`}
      // One island moves; a crossfade would leave a ghost of the capsule.
      layoutCrossfade={false}
      // Leaving, it lingers until the spring rests; let clicks through.
      exit={{ pointerEvents: "none" }}
      className="absolute bottom-full z-30 mb-2.5 bg-background p-1.5"
      style={{
        borderRadius: 28,
        boxShadow: ISLAND_SHADOW,
        width,
        // Over the pill it split from, kept inside the prompt's edges.
        left: `clamp(${INSET}px, ${anchor}px, calc(100% - ${INSET}px - ${width}))`,
      }}
    >
      <div className="relative w-full" style={{ aspectRatio: ratio }}>
        <motion.img
          layoutId={`image-${file.id}`}
          // One image flies; a crossfade would leave a ghost of the other.
          layoutCrossfade={false}
          src={file.url}
          alt={file.name}
          draggable={false}
          style={{ borderRadius: 22 }}
          onLayoutAnimationComplete={() => setLanded(true)}
          className="absolute inset-0 size-full bg-muted object-cover"
        />
        <button
          type="button"
          onClick={onClose}
          aria-label={`Close ${file.name}`}
          className="absolute inset-0 z-10 cursor-zoom-out rounded-[22px] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        />
        {/* Just the image: two small controls in its corner, once it lands. */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={
            landed
              ? {
                  opacity: 1,
                  scale: 1,
                  transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] },
                }
              : { opacity: 0, scale: 0.9 }
          }
          exit={{ opacity: 0, transition: { duration: 0.08 } }}
          className="absolute top-2 right-2 z-20 flex origin-top-right gap-1"
        >
          <GlassButton label="Close preview" onClick={onClose}>
            <CollapseIcon />
          </GlassButton>
          {onRemove ? (
            <GlassButton label={`Remove ${file.name}`} onClick={onRemove}>
              <XIcon className="size-3.5" />
            </GlassButton>
          ) : null}
        </motion.div>
      </div>
    </motion.div>
  )
}

function GlassButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      // Dark glass reads on light and dark images alike.
      className="grid size-7 place-items-center rounded-full bg-black/45 text-white ring-1 ring-white/15 backdrop-blur-md transition-colors outline-none ring-inset hover:bg-black/60 focus-visible:ring-2 focus-visible:ring-white"
    >
      {children}
    </button>
  )
}

/** Marks the pill whose image is open above. */
function ShownIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-3" fill="none" aria-hidden>
      <path
        d="M5 10.5 8 7.5l3 3M5 6.5 8 3.5l3 3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" fill="none" aria-hidden>
      <path
        d="M8 3v10M3 8h10"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

function ArrowUpIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" fill="none" aria-hidden>
      <path
        d="M8 13V3.5M3.75 7.5 8 3.25l4.25 4.25"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** A stop square inside a spinning arc. */
function StopIcon() {
  return (
    <span className="relative grid size-6 place-items-center">
      <svg
        viewBox="0 0 24 24"
        className="absolute inset-0 size-6 animate-spin motion-reduce:animate-none"
        fill="none"
        aria-hidden
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeOpacity="0.2"
          strokeWidth="2"
        />
        <path
          d="M12 2a10 10 0 0 1 10 10"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      <span className="size-2 rounded-[2px] bg-current" />
    </span>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden>
      <path
        d="m4.5 4.5 7 7m0-7-7 7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

function CollapseIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-3.5" fill="none" aria-hidden>
      <path
        d="M9.5 3v3.5H13M6.5 13V9.5H3M9.5 6.5 13.5 2.5M6.5 9.5l-4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ImageIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" fill="none" aria-hidden>
      <rect
        x="2"
        y="2.5"
        width="12"
        height="11"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <circle cx="5.75" cy="6.25" r="1.25" fill="currentColor" />
      <path
        d="m2.5 12 3.75-3.5 2.5 2.25L11 8.5l2.5 2.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  )
}
