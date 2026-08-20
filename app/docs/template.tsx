import type { ReactNode } from "react"
import { ViewTransition } from "react"

/**
 * Remounts on docs navigations so enter/exit view transitions can run
 * while the layout chrome (sidebar, header) stays put.
 *
 * Wrap `children` in a single element so React View Transition does not
 * pass an unkeyed list up through Next's OuterLayoutRouter.
 */
export default function DocsTemplate({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter="page-blur" exit="page-blur" default="none">
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </ViewTransition>
  )
}
