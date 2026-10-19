"use client"

import { useEffect, useRef, useState } from "react"
import { useReducedMotion } from "motion/react"

import {
  PromptBox,
  PromptBoxAction,
  type PromptBoxAttachment,
  type PromptBoxMessage,
} from "./prompt-box"

const settings = {
  images: 2,
  uploading: true,
  busy: true,
  draft: "Try these two for the back cover",
  placeholder: "Ask anything, or drop images…",
  minRows: 1,
}

/** A flat landscape as an SVG data URI: sky, sun, three ridges, maybe water. */
function scene(
  w: number,
  h: number,
  sky: [string, string],
  sun: string,
  ridges: [string, string, string],
  water?: string
) {
  const ridge = (y: number, amp: number, phase: number, fill: string) => {
    let d = `M0 ${h} L0 ${y}`
    const steps = 6
    for (let i = 1; i <= steps; i++) {
      const x = (w / steps) * i
      const cx = x - w / steps / 2
      const cy = y - amp * Math.sin(i * 1.7 + phase)
      d += ` Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x.toFixed(1)} ${(y - amp * 0.35 * Math.cos(i + phase)).toFixed(1)}`
    }
    return `<path d="${d} L${w} ${h} Z" fill="${fill}"/>`
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient></defs>
<rect width="${w}" height="${h}" fill="url(#s)"/>
<circle cx="${w * 0.68}" cy="${h * 0.34}" r="${Math.min(w, h) * 0.09}" fill="${sun}"/>
${ridge(h * 0.56, h * 0.09, 0.4, ridges[0])}
${ridge(h * 0.68, h * 0.07, 2.1, ridges[1])}
${water ? `<rect y="${h * 0.8}" width="${w}" height="${h * 0.2}" fill="${water}"/>` : ridge(h * 0.8, h * 0.05, 4.2, ridges[2])}
</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

const PHOTOS = {
  ridge: scene(400, 300, ["#8FB3D9", "#F6C9A0"], "#FFF1D6", ["#7C93B8", "#56708F", "#2F4560"]),
  lake: scene(400, 300, ["#CFE8F2", "#F4F1E6"], "#FFFDF5", ["#9DB8A8", "#6E9480", "#3F6650"], "#9CC4D2"),
  dunes: scene(400, 300, ["#F7B98B", "#FCE3C2"], "#FFF6E8", ["#E7A36B", "#C97B4A", "#9C5634"]),
  coast: scene(300, 400, ["#BFD9EA", "#EAF2F5"], "#FFFFFF", ["#7E9C8C", "#4E6B5C", "#2F4A3E"], "#6FA3C4"),
  meadow: scene(400, 300, ["#DCE9C9", "#F6F3DA"], "#FFFBEA", ["#A9C38C", "#7FA266", "#55783F"]),
  glacier: scene(400, 300, ["#D8E4F0", "#F3F6FA"], "#FFFFFF", ["#B7C7D9", "#8EA4BD", "#61788F"], "#C9DCE8"),
}

/** Images ready to attach, in the order the `images` knob adds them. */
const DRAFT_IMAGES: PromptBoxAttachment[] = [
  { id: "dunes", name: "dunes-sunset.jpg", url: PHOTOS.dunes },
  { id: "coast", name: "north-coast.jpg", url: PHOTOS.coast },
  { id: "meadow", name: "meadow.jpg", url: PHOTOS.meadow },
  { id: "glacier", name: "glacier-bay.jpg", url: PHOTOS.glacier },
  { id: "ridge-2", name: "ridge-dawn.jpg", url: PHOTOS.ridge },
  { id: "lake-2", name: "lake-still.jpg", url: PHOTOS.lake },
]

type Message = {
  id: string
  role: "user" | "assistant"
  text: string
  images?: { name: string; url: string }[]
}

const THREAD: Message[] = [
  {
    id: "m1",
    role: "user",
    text: "Which of these should be the cover of the trail guide?",
    images: [
      { name: "ridge.jpg", url: PHOTOS.ridge },
      { name: "lake.jpg", url: PHOTOS.lake },
    ],
  },
  {
    id: "m2",
    role: "assistant",
    text: "The ridge. The layered hills lead the eye up to the title, and the open sky leaves clean room for type. The lake is lovely, but the water fights the cover copy.",
  },
  { id: "m3", role: "user", text: "Great. Make a warmer, golden-hour version of it." },
]

const REPLIES = [
  "Here's a warmer take: the sky pushed toward amber, the far ridge lifted so the title still sits clear.",
  "Done. I kept the horizon where it was so the layout doesn't shift.",
  "Both work. The first holds up better small, on the spine.",
]

/** How long a reply keeps the prompt busy, and how often uploads tick. */
const REPLY_MS = 2600
const TICK_MS = 180

export default function PromptBoxDemo(props: Partial<typeof settings>) {
  const s = { ...settings, ...props }
  const count = Math.max(0, Math.min(DRAFT_IMAGES.length, Math.round(s.images)))
  // Knobs reset the scene: the draft, its sample images and the busy reply.
  return (
    <PromptBoxScene
      key={[count, s.uploading, s.busy, s.draft].join("|")}
      s={s}
      count={count}
    />
  )
}

/** The sample images, the last one still uploading. */
function draftFiles(count: number, uploading: boolean) {
  return DRAFT_IMAGES.slice(0, count).map((file, i) =>
    uploading && i === count - 1 ? { ...file, progress: 0.62 } : file
  )
}

function PromptBoxScene({ s, count }: { s: typeof settings; count: number }) {
  const reduce = useReducedMotion()

  const [thread, setThread] = useState(THREAD)
  const [replying, setReplying] = useState(s.busy)
  const [text, setText] = useState(s.draft)
  const [files, setFiles] = useState(() => draftFiles(count, s.uploading))
  const known = useRef(new Set(files.map((file) => file.id)) as Set<string>)
  const replies = useRef(0)
  const scroller = useRef(null as HTMLDivElement | null)

  // Keep the newest message in view.
  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollTop = el.scrollHeight
  }, [thread, replying])

  // Uploads tick up, then turn ready. Reduced motion holds the frame.
  useEffect(() => {
    if (reduce || !files.some((file) => file.progress !== undefined)) return
    const id = window.setTimeout(() => {
      setFiles((list) =>
        list.map((file) => {
          if (file.progress === undefined) return file
          const progress = file.progress + 0.03 + Math.random() * 0.05
          return { ...file, progress: progress >= 1 ? undefined : progress }
        })
      )
    }, TICK_MS)
    return () => window.clearTimeout(id)
  }, [files, reduce])

  // A sent message gets a reply after a moment.
  useEffect(() => {
    if (!replying || thread[thread.length - 1]?.role !== "user") return
    if (thread.length === THREAD.length) return
    const id = window.setTimeout(() => {
      const text = REPLIES[replies.current++ % REPLIES.length]!
      setThread((list) => [...list, { id: `a${list.length}`, role: "assistant", text }])
      setReplying(false)
    }, REPLY_MS)
    return () => window.clearTimeout(id)
  }, [replying, thread])

  const onAttachmentsChange = (next: PromptBoxAttachment[]) => {
    setFiles(
      next.map((file) => {
        if (known.current.has(file.id)) return file
        known.current.add(file.id)
        return s.uploading ? { ...file, progress: 0 } : file
      })
    )
  }

  const onSubmit = (message: PromptBoxMessage) => {
    setThread((list) => [
      ...list,
      {
        id: `u${list.length}`,
        role: "user",
        text: message.text,
        images: message.attachments.map(({ name, url }) => ({ name, url })),
      },
    ])
    setText("")
    setFiles([])
    setReplying(true)
  }

  return (
    <main className="flex h-screen min-h-[480px] w-full flex-col justify-center bg-background py-5 sm:py-8">
      <div ref={scroller} className="min-h-0 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 pt-2 pb-6 sm:px-6">
          {thread.map((message) =>
            message.role === "user" ? (
              <div key={message.id} className="flex flex-col items-end gap-2">
                {message.images?.length ? (
                  <div className="flex gap-1.5">
                    {message.images.map((image) => (
                      <img
                        key={image.url}
                        src={image.url}
                        alt={image.name}
                        className="h-20 w-auto rounded-2xl bg-muted object-cover shadow-[0_1px_2px_rgb(0_0_0/0.06)]"
                      />
                    ))}
                  </div>
                ) : null}
                {message.text ? (
                  <p className="max-w-[80%] rounded-3xl bg-muted px-4 py-2.5 text-[15px] leading-6 whitespace-pre-wrap text-foreground">
                    {message.text}
                  </p>
                ) : null}
              </div>
            ) : (
              <p
                key={message.id}
                className="max-w-[88%] px-1 text-[15px] leading-6 text-foreground/90"
              >
                {message.text}
              </p>
            )
          )}
          {replying ? (
            <div
              role="status"
              aria-label="Replying"
              className="flex h-6 items-center gap-1 px-1"
            >
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="size-1.5 rounded-full bg-muted-foreground/60 motion-safe:animate-pulse"
                  style={{ animationDelay: `${i * 160}ms` }}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mx-auto w-full max-w-3xl shrink-0 px-4 sm:px-6">
        <PromptBox
          value={text}
          onValueChange={setText}
          placeholder={s.placeholder}
          attachments={files}
          onAttachmentsChange={onAttachmentsChange}
          busy={replying}
          onStop={() => setReplying(false)}
          onSubmit={onSubmit}
          minRows={Math.max(1, Math.round(s.minRows))}
          toolbar={
            <>
              <PromptBoxAction>Auto</PromptBoxAction>
              <PromptBoxAction className="ms-auto hidden sm:inline-flex">
                Opus 5.5
                <svg viewBox="0 0 16 16" className="size-3.5 opacity-60" fill="none" aria-hidden>
                  <path
                    d="m4.5 6.5 3.5 3.5 3.5-3.5"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </PromptBoxAction>
            </>
          }
        />
      </div>
    </main>
  )
}
