import { StretchyFooter } from "./stretchy-footer"

const settings = {
  peek: 0.7,
  maxStretch: 480,
  columns: 9,
  blur: 16,
  glow: 0.2,
  flip: false,
  colors: [
    "#FF1AE6",
    "#FF2E5E",
    "#FF8A1A",
    "#FFC81F",
    "#E2E6EC",
    "#8DB6E6",
    "#2F74DC",
    "#1459E3",
    "#1C2566",
  ],
}

const LINKS = [
  ["Product", "Features", "Pricing", "Changelog"],
  ["Company", "About", "Careers", "Contact"],
  ["Legal", "Privacy", "Terms", "Cookies"],
]

export default function StretchyFooterDemo(props: Partial<typeof settings>) {
  const s = { ...settings, ...props }
  return (
    <StretchyFooter
      className="h-screen w-full bg-background text-foreground"
      peek={s.peek}
      maxStretch={s.maxStretch}
      columns={s.columns}
      blur={s.blur}
      glow={s.glow}
      flip={s.flip}
      colors={s.colors}
      label="Page"
    >
      <footer className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-6 pt-[16vh] sm:px-10">
        <div className="flex flex-col gap-10 sm:flex-row sm:justify-between">
          <div className="flex flex-col gap-2">
            <span className="text-3xl font-semibold tracking-tight">
              Northwind
            </span>
            <span className="text-sm text-muted-foreground">
              Pull past the end.
            </span>
          </div>
          <nav className="grid grid-cols-3 gap-10 text-sm sm:gap-16">
            {LINKS.map(([heading, ...items]) => (
              <div key={heading} className="flex flex-col gap-3">
                <span className="font-medium">{heading}</span>
                {items.map((item) => (
                  <a
                    key={item}
                    href="#"
                    onClick={(e) => e.preventDefault()}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {item}
                  </a>
                ))}
              </div>
            ))}
          </nav>
        </div>
      </footer>
    </StretchyFooter>
  )
}
