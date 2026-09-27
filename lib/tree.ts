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
