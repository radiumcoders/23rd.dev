"use client"

import {
  getPackageManagerCommands,
  type PackageManager,
} from "@/lib/package-managers"
import { CopyButton } from "@/components/docs/copy-button"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

const MANAGERS: PackageManager[] = ["npm", "pnpm", "bun", "deno"]

export function CliBox({
  command,
  className,
}: {
  command: string
  className?: string
}) {
  const commands = getPackageManagerCommands(command)

  return (
    <div
      className={cn(
        "not-prose mt-4 overflow-hidden rounded-lg border border-border/80",
        className
      )}
    >
      <Tabs defaultValue="npm">
        <div className="flex items-center justify-between gap-3 border-b border-border/80 px-2 py-1.5">
          <TabsList variant="line" className="h-auto">
            {MANAGERS.map((manager) => (
              <TabsTrigger
                key={manager}
                value={manager}
                className="rounded-md px-2.5 text-xs"
              >
                {manager}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {MANAGERS.map((manager) => (
          <TabsContent key={manager} value={manager} className="relative m-0">
            <pre className="overflow-x-auto bg-transparent p-4 pr-12 font-mono text-sm leading-relaxed text-foreground">
              <code>{commands[manager]}</code>
            </pre>
            <CopyButton
              value={commands[manager]}
              className="absolute top-2.5 right-2.5"
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
