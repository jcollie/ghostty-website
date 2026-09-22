import type { MetadataRoute } from "next";
import { DOCS_DIRECTORY, DOCS_PAGES_ROOT_PATH } from "@/lib/docs/config";
import { loadAllDocsPageSlugs } from "@/lib/docs/page";
import { SITE_URL } from "@/lib/site";

// DOCS_INDEX_SLUG is the slug that `docs/index.mdx` resolves to. It is served
// at `/docs` rather than `/docs/index`, so it is handled separately from the
// nested pages, exactly as `generateStaticParams` does in the docs route.
const DOCS_INDEX_SLUG = "index";

// STATIC_ROUTES are the pages that exist as their own route rather than as a
// docs MDX file. Add to this list whenever a top-level route is added under
// `src/app`; `/docs` itself comes from the docs loader below.
const STATIC_ROUTES: Array<{ path: string; priority: number }> = [
  { path: "/", priority: 1.0 },
  { path: "/download", priority: 0.9 },
];

// LONG_TAIL_SLUG_PREFIXES are the docs subtrees that exist as exhaustive
// reference material rather than as pages a reader arrives at. The
// per-sequence VT pages and the per-release notes together are roughly half of
// every docs page, so without a hint they read as being as central as the
// install and help pages.
const LONG_TAIL_SLUG_PREFIXES = [
  "install/release-notes/",
  "vt/concepts/",
  "vt/control/",
  "vt/csi/",
  "vt/esc/",
  "vt/osc/",
];

// docsPriority ranks a docs page relative to the rest of this sitemap.
//
// Priority is a hint and nothing more: Google ignores it outright, and other
// consumers read it only as a statement of relative importance within a single
// sitemap. It is cheap to state correctly, so we state it.
//
// Note that we deliberately emit no `lastModified`. The only timestamps
// available at build time are file mtimes, and on a fresh CI checkout every
// file shares the checkout's mtime, so publishing them would claim that the
// whole site changed on every deploy. An absent `lastModified` is better than
// a uniformly wrong one.
function docsPriority(slug: string): number {
  const isLongTail = LONG_TAIL_SLUG_PREFIXES.some((prefix) =>
    slug.startsWith(prefix),
  );
  return isLongTail ? 0.5 : 0.8;
}

// sitemap emits `/sitemap.xml`, listing the home page, the download page and
// every statically generated docs page.
//
// The docs pages are otherwise reachable only by following links out of a
// client-rendered navigation sidebar, which is the slowest and least reliable
// way for a crawler to find them. Enumerating them here is what makes a page
// such as `/docs/help/terminfo` discoverable directly, rather than only to a
// reader who already knows the docs tree well enough to navigate to it.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const docsPageSlugs = await loadAllDocsPageSlugs(DOCS_DIRECTORY);

  const docsEntries = docsPageSlugs.map((slug) =>
    slug === DOCS_INDEX_SLUG
      ? { path: DOCS_PAGES_ROOT_PATH, priority: 0.9 }
      : {
          path: `${DOCS_PAGES_ROOT_PATH}/${slug}`,
          priority: docsPriority(slug),
        },
  );

  return [...STATIC_ROUTES, ...docsEntries]
    .sort((a, b) => a.path.localeCompare(b.path))
    .map(({ path, priority }) => ({
      url: new URL(path, SITE_URL).toString(),
      priority,
    }));
}
