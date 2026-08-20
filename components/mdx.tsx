import defaultMdxComponents from "fumadocs-ui/mdx"
import type { MDXComponents } from "mdx/types"

import { CliCommand } from "@/components/cli-command"
import { ComponentControls } from "@/components/component-controls"
import { ComponentPreview } from "@/components/component-preview"
import {
  FrameworkCode,
  FrameworkReact,
  FrameworkSvelte,
} from "@/components/framework-code"
import { MdxPre } from "@/components/mdx-pre"
import {
  MdxTable,
  MdxTableBody,
  MdxTableCell,
  MdxTableHead,
  MdxTableHeader,
  MdxTableRow,
} from "@/components/mdx-table"

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    CliCommand,
    ComponentControls,
    ComponentPreview,
    FrameworkCode,
    FrameworkReact,
    FrameworkSvelte,
    pre: MdxPre,
    table: MdxTable,
    thead: MdxTableHeader,
    tbody: MdxTableBody,
    tr: MdxTableRow,
    th: MdxTableHead,
    td: MdxTableCell,
    ...components,
  } satisfies MDXComponents
}

export const useMDXComponents = getMDXComponents

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>
}
