"use client"

import { useSyncExternalStore } from "react"

import { CopyButton } from "@/components/copy-button"
import { FrameworkSelect } from "@/components/framework-select"
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
import { registryItemName, useFramework } from "@/lib/framework"
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
   * Registry item name without a framework suffix, e.g. `"shader-gradient"`.
   * The active framework picker appends `-svelte` when Svelte is selected.
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
  className?: string
}

function commandForItem(item: string, github: boolean, svelte: boolean) {
  const name = registryItemName(item, svelte ? "svelte" : "react")
  return github
    ? `shadcn@latest add radiumcoders/23rd.dev/${name}`
    : `shadcn@latest add @23rd/${name}`
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
  className,
}: CliCommandProps) {
  const { framework } = useFramework()
  const manager = useSyncExternalStore(
    subscribeManager,
    () => readStoredManager() ?? defaultManager,
    () => defaultManager
  )

  const resolvedCommand =
    command ??
    (item ? commandForItem(item, github, framework === "svelte") : "")

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

  return (
    <figure
      data-slot="cli-command"
      className={cn(
        "not-prose my-6 w-full overflow-hidden rounded-2xl bg-muted/50",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3 px-3.5 py-0.5">
        <div
          className="flex size-6 items-center justify-center"
          aria-hidden
          title={active.label}
        >
          <ActiveIcon className={cn("size-4", active.colorClass)} />
        </div>

        <div className="flex items-center gap-3">
          {item ? <FrameworkSelect /> : null}
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
            <SelectContent align="end" alignItemWithTrigger={false}>
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
      </div>

      <div className="p-1 pt-0">
        <div className="flex items-center gap-2 rounded-[calc(var(--radius-2xl)-2px)] bg-background py-1.5 pr-1.5 pl-3.5 ring-1 ring-border/80">
          <pre className="min-w-0 flex-1 overflow-x-auto font-mono text-[13px] leading-6 text-foreground/90">
            <code>{activeCommand}</code>
          </pre>
          <CopyButton
            text={activeCommand}
            label="Copy command"
            errorMessage="Couldn’t copy command"
          />
        </div>
      </div>
    </figure>
  )
}

export default CliCommand
