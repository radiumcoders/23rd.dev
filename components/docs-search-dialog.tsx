"use client"

import { useMemo } from "react"
import { useDocsSearch } from "fumadocs-core/search/client"
import { fetchClient } from "fumadocs-core/search/client/fetch"
import {
  SearchDialog,
  SearchDialogClose,
  SearchDialogContent,
  SearchDialogHeader,
  SearchDialogIcon,
  SearchDialogInput,
  SearchDialogList,
  SearchDialogOverlay,
} from "fumadocs-ui/components/dialog/search"
import type { SharedProps } from "fumadocs-ui/contexts/search"

type SearchLink = [name: string, href: string]

/**
 * App-owned Fumadocs search dialog composition.
 * Mounted from the root provider so Cmd/Ctrl+K opens docs search.
 */
export function DocsSearchDialog({
  links = [],
  ...props
}: SharedProps & {
  links?: SearchLink[]
}) {
  const client = fetchClient({ api: "/api/search" })
  const { search, setSearch, query } = useDocsSearch({ client })

  const defaultItems = useMemo(() => {
    if (links.length === 0) return null
    return links.map(([name, href]) => ({
      type: "page" as const,
      id: name,
      content: name,
      url: href,
    }))
  }, [links])

  return (
    <SearchDialog
      search={search}
      onSearchChange={setSearch}
      isLoading={query.isLoading}
      {...props}
    >
      <SearchDialogOverlay />
      <SearchDialogContent>
        <SearchDialogHeader>
          <SearchDialogIcon />
          <SearchDialogInput />
          <SearchDialogClose />
        </SearchDialogHeader>
        <SearchDialogList
          items={
            query.error
              ? []
              : query.data !== "empty"
                ? query.data
                : defaultItems
          }
          Empty={query.error ? SearchError : undefined}
        />
      </SearchDialogContent>
    </SearchDialog>
  )
}

/** Shown when /api/search fails, so an outage doesn't read as "no results". */
function SearchError() {
  return (
    <div className="py-12 text-center text-sm text-fd-muted-foreground">
      Search is unavailable right now. Try again in a moment.
    </div>
  )
}
