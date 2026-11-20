import { RiArrowRightUpLine } from "@remixicon/react"

/** UTM-tagged so the visit shows up under 23rd in Breeze UI's analytics. */
export const breezeUiUrl = (campaign: string) =>
  `https://www.breezeui.com/?utm_source=23rd&utm_medium=referral&utm_campaign=${campaign}`

/** Breeze UI's "Air Stack" mark: three soft blocks stepping up and to the right. */
export function BreezeUiLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="315 303 392 389" aria-hidden className={className}>
      <path
        fill="currentColor"
        d="M532 315Q532 303 544 303L695 303Q707 303 707 315L707 406Q707 418 695 418L468 418Q456 418 456 430L456 458Q456 470 444 470L435 470Q423 470 423 458L423 367Q423 355 435 355L520 355Q532 355 532 343Z"
      />
      <path
        fill="currentColor"
        d="M478 452Q478 440 490 440L671 440Q683 440 683 452L683 543Q683 555 671 555L414 555Q402 555 402 567L402 595Q402 607 390 607L381 607Q369 607 369 595L369 504Q369 492 381 492L466 492Q478 492 478 480Z"
      />
      <path
        fill="currentColor"
        d="M424 589Q424 577 436 577L647 577Q659 577 659 589L659 680Q659 692 647 692L327 692Q315 692 315 680L315 641Q315 629 327 629L412 629Q424 629 424 617Z"
      />
    </svg>
  )
}

/** Slim "Sponsored by" strip across the top of the landing frame. */
export function BreezeUiRibbon() {
  return (
    <a
      href={breezeUiUrl("ribbon")}
      target="_blank"
      // noopener only: noreferrer would hide the visit from their analytics.
      rel="noopener"
      aria-label="Sponsored by Breeze UI: shader backgrounds, text effects and templates for shadcn"
      className="group relative z-30 flex h-9 shrink-0 items-center justify-center gap-2.5 border-b bg-sheet/75 px-4 text-xs backdrop-blur-xl transition-colors hover:bg-wash focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset"
    >
      <span className="font-mono text-[10px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
        Sponsored by
      </span>
      <span aria-hidden className="h-3 w-px bg-foreground/15" />
      <span className="flex items-center gap-1.5 font-semibold tracking-[-0.01em] text-foreground">
        <BreezeUiLogo className="size-3.5" />
        Breeze UI
      </span>
      <span className="hidden text-muted-foreground transition-colors group-hover:text-foreground sm:inline">
        Shader backgrounds, text effects and templates for shadcn
      </span>
      <RiArrowRightUpLine className="size-3.5 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground" />
    </a>
  )
}

/** "Sponsored by Breeze UI" card in the docs right rail. */
export function BreezeUiCard() {
  return (
    <a
      href={breezeUiUrl("docs")}
      target="_blank"
      // noopener only: noreferrer would hide the visit from their analytics.
      rel="noopener"
      className="group flex items-start gap-2.5 rounded-lg border bg-card px-3 py-2.5 transition-colors hover:border-foreground/25"
    >
      <BreezeUiLogo className="mt-0.5 size-3.5 shrink-0 text-foreground" />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[13px] text-foreground">Breeze UI</span>
        <span className="text-xs text-muted-foreground">
          Sponsor · Shader backgrounds, text effects and templates
        </span>
      </span>
      <RiArrowRightUpLine className="mt-0.5 size-3.5 shrink-0 text-muted-foreground opacity-60 transition-opacity group-hover:opacity-100" />
    </a>
  )
}
