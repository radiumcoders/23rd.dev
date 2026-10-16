/** Whether `file` matches an `accept` string like `"image/*,.pdf"`. */
export function accepts(file: File, accept: string) {
  return accept
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .some((rule) => {
      if (!rule) return false
      if (rule.startsWith(".")) return file.name.toLowerCase().endsWith(rule)
      if (rule.endsWith("/*")) return file.type.startsWith(rule.slice(0, -1))
      return file.type === rule
    })
}

export function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)
}
