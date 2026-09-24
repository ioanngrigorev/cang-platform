import { createNavigation } from "next-intl/navigation";
import { createElement, type ComponentProps } from "react";
import { routing } from "./routing";

const nav = createNavigation(routing);

export const { redirect, usePathname, useRouter, getPathname } = nav;

/**
 * Locale-aware link with viewport prefetching off by default.
 *
 * Every page is rendered on demand, so Next's automatic prefetch turned each visible link into a
 * server render: a catalogue page fired ~50 of them on load. On the one-core production box that
 * queue slowed every page and swallowed clicks made in the first seconds (the pager's "2" did
 * nothing). Links now fetch when clicked; pass `prefetch` explicitly to opt a link back in.
 */
export function Link(props: ComponentProps<typeof nav.Link>) {
  return createElement(nav.Link, { prefetch: false, ...props });
}
