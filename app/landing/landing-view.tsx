"use client"

import Image from "next/image"
import Link from "next/link"
import { motion, useReducedMotion } from "motion/react"
import { Instrument_Serif } from "next/font/google"

import { Logo } from "@/components/logo"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ShaderGradient } from "@/registry/shader-gradient/shader-gradient"

const display = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-landing-display",
})

const ease = [0.22, 1, 0.36, 1] as const

export function LandingView() {
  const reduceMotion = useReducedMotion()

  const initial = reduceMotion ? false : { opacity: 0, y: 18 }
  const animate = { opacity: 1, y: 0 }

  return (
    <div className={cn(display.variable, "relative overflow-x-hidden")}>
      <div className="pointer-events-none fixed inset-0 z-0">
        <ShaderGradient className="absolute inset-0" />
      </div>

      <div className="relative z-10">
        <header className="flex items-center justify-between px-6 py-5 sm:px-10">
          <Link
            href="/landing"
            className="flex items-center gap-2.5 text-foreground"
            aria-label="23rd home"
          >
            <Logo className="size-8" cornerRadius={8} />
            <span className="text-sm font-medium tracking-tight">23rd</span>
          </Link>
          <Link
            href="/docs"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          >
            Docs
          </Link>
        </header>

        <section className="flex min-h-[calc(100svh-4.5rem)] flex-col justify-center px-6 pb-16 pt-6 sm:px-10">
          <div className="mx-auto w-full max-w-3xl text-center">
            <motion.p
              initial={initial}
              animate={animate}
              transition={{ duration: 0.7, ease }}
              className="font-[family-name:var(--font-landing-display)] text-7xl leading-none tracking-tight text-foreground sm:text-8xl md:text-9xl"
            >
              23rd
            </motion.p>

            <motion.h1
              initial={initial}
              animate={animate}
              transition={{ duration: 0.7, delay: reduceMotion ? 0 : 0.12, ease }}
              className="mt-6 text-2xl font-medium tracking-tight text-foreground sm:text-3xl"
            >
              Opinionated components for shippers
            </motion.h1>

            <motion.p
              initial={initial}
              animate={animate}
              transition={{ duration: 0.7, delay: reduceMotion ? 0 : 0.22, ease }}
              className="mx-auto mt-4 max-w-md text-base leading-relaxed text-foreground/70 sm:text-lg"
            >
              Install from the registry, own the source, and start from a
              sharper baseline.
            </motion.p>

            <motion.div
              initial={initial}
              animate={animate}
              transition={{ duration: 0.7, delay: reduceMotion ? 0 : 0.32, ease }}
              className="mt-8 flex flex-wrap items-center justify-center gap-3"
            >
              <Link
                href="/docs"
                className={cn(buttonVariants({ size: "lg" }), "min-w-36")}
              >
                Browse docs
              </Link>
              <Link
                href="/demo"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "min-w-36 bg-background/60 backdrop-blur-sm"
                )}
              >
                Live demo
              </Link>
            </motion.div>
          </div>
        </section>

        <section className="relative">
          <div className="mx-auto max-w-5xl px-6 pb-6 text-center sm:px-10">
            <h2 className="text-xl font-medium tracking-tight text-foreground sm:text-2xl">
              Built to sit behind a real interface
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-foreground/65 sm:text-base">
              Shader washes, fluid trails, and footers that feel finished —
              ready to drop into your app.
            </p>
          </div>
          <div className="w-full">
            <Image
              src="/demo-product.png"
              alt="Interface preview using 23rd backgrounds"
              width={1600}
              height={900}
              priority
              className="h-auto w-full"
            />
          </div>
        </section>

        <footer className="flex flex-col items-center gap-3 px-6 py-16 text-center sm:px-10">
          <p className="font-[family-name:var(--font-landing-display)] text-3xl text-foreground">
            Ship with taste
          </p>
          <Link
            href="/docs"
            className={cn(buttonVariants({ size: "lg" }), "mt-2")}
          >
            Explore components
          </Link>
        </footer>
      </div>
    </div>
  )
}
