import { Geist, Geist_Mono } from "next/font/google"
import { RootProvider } from "fumadocs-ui/provider/next"
import type { Metadata } from "next"
import Script from "next/script"
import type { ReactNode } from "react"

import { DocsSearchDialog } from "@/components/docs-search-dialog"
import { ThemeProvider } from "@/components/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "sonner"
import { cn } from "@/lib/utils"
import { source } from "@/lib/source"
import { flattenPageTree } from "@/lib/tree"

import "./globals.css"

export const metadata: Metadata = {
  title: {
    default: "23rd Docs",
    template: "%s · 23rd",
  },
  description:
    "Opinionated components for shippers — documentation and registry built with Fumadocs MDX and Next.js.",
  metadataBase: new URL("https://23rd.dev"),
}

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  const links = flattenPageTree(source.getPageTree()).map(
    (item) => [item.title, item.url] as [string, string]
  )

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "font-sans antialiased",
        fontMono.variable,
        geist.variable
      )}
    >
      <body className="flex min-h-screen flex-col">
        <ThemeProvider>
          <RootProvider
            search={{
              links,
              SearchDialog: DocsSearchDialog,
            }}
          >
            <TooltipProvider>
              {children}
              <Toaster richColors position="bottom-right" />
            </TooltipProvider>
          </RootProvider>
        </ThemeProvider>
        <Script
          defer
          src="https://cloud.umami.is/script.js"
          data-website-id="5a96c4a1-18ca-49b5-9cf9-b80c01c5ffa9"
        />
      </body>
    </html>
  )
}
