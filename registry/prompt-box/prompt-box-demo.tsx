"use client"

import { useEffect, useMemo, useRef, useState } from "react"

import {
  ComponentControls,
  ControlSwitch,
} from "@/components/component-controls"
import { ComponentPreview } from "@/components/component-preview"
import { Button } from "@/components/ui/button"
import { usePreviewProps } from "@/hooks/use-preview-props"
import {
  PromptBox,
  PromptBoxAction,
  type PromptBoxAttachment,
  type PromptBoxMessage,
} from "@/registry/prompt-box/prompt-box"

const photo = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=900&q=75&auto=format`

const SAMPLES: PromptBoxAttachment[] = [
  {
    id: "sample-1",
    name: "highlands.jpg",
    url: photo("1470071459604-3b5ec3a7fe05"),
  },
  {
    id: "sample-2",
    name: "above-the-clouds.jpg",
    // A portrait crop, so the island shows how it follows the image's shape.
    url: `https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=800&fit=crop&q=75&auto=format`,
  },
]

/** How long the fake reply keeps the prompt busy. */
const REPLY_MS = 2600

export function PromptBoxDemo() {
  const defaults = useMemo(() => ({ uploads: true, busy: false }), [])
  const { props, updateProp, resetProps, hasChanges } =
    usePreviewProps(defaults)

  const [replying, setReplying] = useState(false)
  const [files, setFiles] = useState<PromptBoxAttachment[]>(() =>
    SAMPLES.map((file) => ({ ...file, progress: 0 }))
  )
  const [sent, setSent] = useState<PromptBoxMessage | null>(null)
  const known = useRef(new Set(SAMPLES.map((file) => file.id)))

  // A sent message keeps the prompt busy for a moment, like a reply.
  useEffect(() => {
    if (!replying) return
    const id = window.setTimeout(() => setReplying(false), REPLY_MS)
    return () => window.clearTimeout(id)
  }, [replying])

  // Uploads tick up, then become ready.
  useEffect(() => {
    if (!files.some((file) => file.progress !== undefined)) return
    const id = window.setTimeout(() => {
      setFiles((list) =>
        list.map((file) => {
          if (file.progress === undefined) return file
          const progress = file.progress + 0.06 + Math.random() * 0.12
          return { ...file, progress: progress >= 1 ? undefined : progress }
        })
      )
    }, 160)
    return () => window.clearTimeout(id)
  }, [files])

  const onAttachmentsChange = (next: PromptBoxAttachment[]) => {
    setFiles(
      next.map((file) => {
        if (known.current.has(file.id)) return file
        known.current.add(file.id)
        return props.uploads ? { ...file, progress: 0 } : file
      })
    )
  }

  const onSubmit = (message: PromptBoxMessage) => {
    setSent(message)
    setFiles([])
    setReplying(true)
  }

  const busy = props.busy || replying

  return (
    <>
      <ComponentPreview
        title="Prompt box"
        stageClassName="min-h-0 overflow-hidden p-0"
      >
        <div className="flex h-[var(--preview-h,56svh)] w-full flex-col items-center justify-end gap-6 overflow-y-auto px-4 py-8 sm:px-10 sm:py-10">
          {sent ? (
            <div className="flex w-full max-w-2xl flex-col items-end gap-2">
              {sent.attachments.length > 0 ? (
                <div className="flex gap-1.5">
                  {sent.attachments.map((file) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={file.id}
                      src={file.url}
                      alt={file.name}
                      className="size-16 rounded-xl object-cover ring-1 ring-foreground/10"
                    />
                  ))}
                </div>
              ) : null}
              {sent.text ? (
                <p className="max-w-[80%] rounded-2xl rounded-br-md bg-muted px-4 py-2.5 text-[15px] leading-6 whitespace-pre-wrap text-foreground">
                  {sent.text}
                </p>
              ) : null}
            </div>
          ) : null}
          <PromptBox
            className="max-w-2xl"
            placeholder="Ask anything, or drop images…"
            attachments={files}
            onAttachmentsChange={onAttachmentsChange}
            busy={busy}
            onStop={() => {
              setReplying(false)
              updateProp("busy", false)
            }}
            onSubmit={onSubmit}
            toolbar={
              <>
                <PromptBoxAction>Auto</PromptBoxAction>
                <PromptBoxAction className="ms-auto hidden sm:inline-flex">
                  Opus 5.5
                  <svg
                    viewBox="0 0 16 16"
                    className="size-3.5 opacity-60"
                    fill="none"
                    aria-hidden
                  >
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
      </ComponentPreview>

      <ComponentControls
        hasChanges={hasChanges}
        onReset={resetProps}
        component="PromptBox"
        snippetProps={{
          placeholder: "Ask anything, or drop images…",
          busy: props.busy || undefined,
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-foreground/90">Images</span>
          <Button
            type="button"
            size="xs"
            variant="outline"
            onClick={() => {
              for (const file of SAMPLES) known.current.add(file.id)
              setFiles(SAMPLES.map((file) => ({ ...file, progress: 0 })))
            }}
          >
            Upload samples
          </Button>
        </div>
        <ControlSwitch
          label="Upload progress"
          description="Images you add upload before they can be sent"
          checked={props.uploads}
          onChange={(v) => updateProp("uploads", v)}
        />
        <ControlSwitch
          label="Busy"
          description="A reply is streaming; send becomes stop"
          checked={props.busy}
          onChange={(v) => updateProp("busy", v)}
        />
      </ComponentControls>
    </>
  )
}
