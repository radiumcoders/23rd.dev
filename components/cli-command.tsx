"use client"

import { useSyncExternalStore } from "react"

import { CopyButton } from "@/components/copy-button"
import { trackEvent } from "@/components/tracwell-analytics"
import {
  BunIcon,
  NpmIcon,
  PnpmIcon,
  YarnIcon,
} from "@/components/package-manager-icons"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

const STORAGE_KEY = "23rd:package-manager"
const MANAGER_EVENT = "23rd:package-manager-change"

export type PackageManager = "npm" | "pnpm" | "yarn" | "bun"

const PACKAGE_MANAGERS = [
  {
    value: "npm" as const,
    label: "npm",
    Icon: NpmIcon,
    colorClass: "text-[#CB3837]",
  },
  {
    value: "pnpm" as const,
    label: "pnpm",
    Icon: PnpmIcon,
    colorClass: "text-[#F69220]",
  },
  {
    value: "yarn" as const,
    label: "yarn",
    Icon: YarnIcon,
    colorClass: "text-[#2C8EBB]",
  },
  {
    value: "bun" as const,
    label: "bun",
    Icon: BunIcon,
    colorClass: "text-[#111111] dark:text-[#FBF0DF]",
  },
]

const SELECT_ITEMS = PACKAGE_MANAGERS.map(({ value, label }) => ({
  value,
  label,
}))

function buildCommands(command: string): Record<PackageManager, string> {
  return {
    npm: `npx ${command}`,
    pnpm: `pnpm dlx ${command}`,
    yarn: `yarn dlx ${command}`,
    bun: `bunx --bun ${command}`,
  }
}

function isPackageManager(value: string): value is PackageManager {
  return PACKAGE_MANAGERS.some((manager) => manager.value === value)
}

function readStoredManager(): PackageManager | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored && isPackageManager(stored)) return stored
  } catch {
    // ignore
  }
  return null
}

function subscribeManager(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange)
  window.addEventListener(MANAGER_EVENT, onStoreChange)
  return () => {
    window.removeEventListener("storage", onStoreChange)
    window.removeEventListener(MANAGER_EVENT, onStoreChange)
  }
}

export interface CliCommandProps {
  /**
   * Command body after the package runner.
   * Example: `"shadcn@latest add button"` → `pnpm dlx shadcn@latest add button`
   */
  command?: string
  /**
   * Registry item name, e.g. `"shader-gradient"`.
   */
  item?: string
  /** Install from GitHub (`radiumcoders/23rd.dev/<item>`) instead of `@23rd/<item>`. */
  github?: boolean
  /** Full command overrides per package manager */
  npm?: string
  pnpm?: string
  yarn?: string
  bun?: string
  /** Initial package manager when nothing is stored yet */
  defaultManager?: PackageManager
  /**
   * `card` (default) is the framed block for docs pages. `panel` is the
   * borderless strip at the foot of the props panel, where the command
   * wraps instead of scrolling.
   */
  variant?: "card" | "panel"
  className?: string
}

function commandForItem(item: string, github: boolean) {
  return github
    ? `shadcn@latest add radiumcoders/23rd.dev/${item}`
    : `shadcn@latest add @23rd/${item}`
}

export function CliCommand({
  command,
  item,
  github = false,
  npm,
  pnpm,
  yarn,
  bun,
  defaultManager = "pnpm",
  variant = "card",
  className,
}: CliCommandProps) {
  const manager = useSyncExternalStore(
    subscribeManager,
    () => readStoredManager() ?? defaultManager,
    () => defaultManager
  )

  const resolvedCommand = command ?? (item ? commandForItem(item, github) : "")

  const fromCommand = resolvedCommand ? buildCommands(resolvedCommand) : null
  const commands: Record<PackageManager, string> = {
    npm: npm ?? fromCommand?.npm ?? "",
    pnpm: pnpm ?? fromCommand?.pnpm ?? "",
    yarn: yarn ?? fromCommand?.yarn ?? "",
    bun: bun ?? fromCommand?.bun ?? "",
  }

  const active = PACKAGE_MANAGERS.find((entry) => entry.value === manager)!
  const ActiveIcon = active.Icon
  const activeCommand = commands[manager]

  function onManagerChange(value: string | null) {
    if (!value || !isPackageManager(value)) return
    try {
      window.localStorage.setItem(STORAGE_KEY, value)
    } catch {
      // ignore
    }
    window.dispatchEvent(new Event(MANAGER_EVENT))
  }

  const managerSelect = (
    <div className="flex items-center gap-2">
      <span
        className="flex size-5 items-center justify-center"
        aria-hidden
        title={active.label}
      >
        <ActiveIcon className={cn("size-4", active.colorClass)} />
      </span>
      <Select
        value={manager}
        onValueChange={onManagerChange}
        items={SELECT_ITEMS}
      >
        <SelectTrigger
          size="sm"
          aria-label="Package manager"
          className="h-auto min-h-0 w-auto justify-start gap-0.5 border-transparent bg-transparent px-0 py-0 text-sm font-medium text-foreground/90 shadow-none hover:bg-transparent focus-visible:border-transparent focus-visible:ring-0"
        >
          <SelectValue className="flex-none" />
        </SelectTrigger>
        <SelectContent align="start" alignItemWithTrigger={false}>
          <SelectGroup>
            {PACKAGE_MANAGERS.map(({ value, label }) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  )

  const copyButton = (
    <CopyButton
      text={activeCommand}
      label="Copy command"
      errorMessage="Couldn’t copy command"
      onCopied={() =>
        trackEvent("cli_command_copied", {
          package_manager: manager,
          source: github ? "github" : "registry",
          placement: variant,
          ...(item ? { item } : {}),
        })
      }
    />
  )

  if (variant === "panel") {
    return (
      <figure
        data-slot="cli-command"
        className={cn("not-prose m-0 px-3 pt-1 pb-3", className)}
      >
        <figcaption className="flex h-10 items-center justify-between gap-3 px-3">
          <span className="text-[13px] font-medium text-foreground">
            Install
          </span>
          {managerSelect}
        </figcaption>
        <div className="flex items-start gap-2 rounded-lg bg-plate py-1.5 pr-1.5 pl-3">
          <pre className="min-w-0 flex-1 py-1 font-mono text-[12.5px] leading-5 break-words whitespace-pre-wrap text-foreground">
            <code>{activeCommand}</code>
          </pre>
          {copyButton}
        </div>
      </figure>
    )
  }

  return (
    <figure
      data-slot="cli-command"
      className={cn(
        "not-prose my-6 w-full overflow-hidden rounded-xl border bg-card",
        className
      )}
    >
      <div className="flex h-10 items-center justify-between gap-3 border-b px-3.5">
        {managerSelect}
      </div>

      <div className="flex items-center gap-2 py-1.5 pr-1.5 pl-3.5">
        <pre className="min-w-0 flex-1 overflow-x-auto py-1 font-mono text-[13px] leading-6 text-foreground">
          <code>{activeCommand}</code>
        </pre>
        {copyButton}
      </div>
    </figure>
  )
}

export default CliCommand
