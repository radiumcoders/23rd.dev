import type { Root } from "fumadocs-core/page-tree"

export interface PageTreeItem {
  title: string
  url: string
}

function extractName(node: { name?: React.ReactNode }): string {
  if (node.name == null) return ""
  if (typeof node.name === "string") return node.name
  if (typeof node.name === "number") return String(node.name)
  return ""
}

export function flattenPageTree(root: Root): PageTreeItem[] {
  const items: PageTreeItem[] = []

  function visit(node: Root["children"][number]) {
    if (node.type === "page" && !node.external) {
      items.push({ title: extractName(node), url: node.url })
    } else if (node.type === "folder") {
      if (node.index) {
        items.push({ title: extractName(node.index), url: node.index.url })
      }
      node.children.forEach(visit)
    }
  }

  root.children.forEach(visit)
  return items
}

export interface PageTreeSection {
  /** Separator label from `meta.json`, or `null` for pages before the first one. */
  name: string | null
  items: PageTreeItem[]
}

/** Pages grouped under the `---Label---` separators they follow. */
export function sectionPageTree(root: Root): PageTreeSection[] {
  const sections: PageTreeSection[] = [{ name: null, items: [] }]

  function visit(node: Root["children"][number]) {
    if (node.type === "separator") {
      const name = extractName(node)
      if (name) sections.push({ name, items: [] })
    } else if (node.type === "page" && !node.external) {
      sections.at(-1)!.items.push({ title: extractName(node), url: node.url })
    } else if (node.type === "folder") {
      if (node.index) {
        sections.at(-1)!.items.push({
          title: extractName(node.index),
          url: node.index.url,
        })
      }
      node.children.forEach(visit)
    }
  }

  root.children.forEach(visit)
  return sections.filter((section) => section.items.length > 0)
}
