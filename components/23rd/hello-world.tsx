export function HelloWorld({
  name = "world",
  className,
}: {
  name?: string
  className?: string
}) {
  return (
    <div
      className={[
        "rounded-lg border border-border bg-background px-4 py-3 text-sm",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      Hello, <span className="font-medium text-foreground">{name}</span>.
    </div>
  )
}
