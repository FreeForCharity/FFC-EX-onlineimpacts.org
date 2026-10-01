/**
 * Central site configuration for Free For Charity template sites.
 *
 * EDIT THIS FILE to customize a new FFC-supported nonprofit site.
 * Most values that vary between sites flow from here so pages, metadata,
 * the footer, manifest, sitemap, and robots stay in sync.
 *
 * The `SiteConfig` shape is the SAME as the FFC Single Page template
 * (FFC-IN-FFC_Single_Page_Template `src/lib/site.config.ts`), so a config
 * produced for one template can be transcribed directly into the other.
 * Keys the footer-only template genuinely has no use for are omitted:
 *
 *  - `integrations` (Zeffy / Idealist / SociableKit / Microsoft Forms):
 *    this template renders no third-party embeds.
 *  - `foundingDate`, `nonprofitStatus`, `alternateNames`: only consumed by
 *    the Single Page template's schema.org JSON-LD, which this template
 *    does not emit.
 *
 * All keys present here keep the canonical names and shapes. This template
 * additionally exports a `sitePath()` helper for GitHub Pages basePath
 * handling and a `canonicalPath()` helper for the `trailingSlash` policy
 * (neither is part of the shared shape).
 *
 * After editing, run `npm run check:drift` to verify nothing here drifts
 * away from FFC best practices, and `npm run check:rebrand` for a checklist
 * of template defaults you still need to replace.
 */

export type SiteSocialLink = {
  /** Display label, also used for aria-label. */
  label: string
  /** Absolute https URL. Empty string disables the link. */
  href: string
}

export type SiteAddress = {
  /** Heading shown above the address (e.g. "Main Address"). */
  label: string
  /** Address text, one entry per visual line. */
  lines: readonly string[]
  /** Google Maps (or other) link opened when the address is clicked. */
  mapUrl: string
}

/**
 * A footer-standard field the charity has not supplied yet. Listing a field in
 * `siteConfig.pending` renders a visible "awaiting information" placeholder in
 * its place (plain text, never a link), so a gap in the FFC footer standard is
 * a call to action on the page rather than a silent omission. The field's own
 * value must stay empty while it is pending, so no placeholder or borrowed
 * value (e.g. the template's Free For Charity details) can ship behind it.
 *
 * An empty value that is NOT listed here keeps its plain meaning: the charity
 * has none (e.g. no public phone). The footer's "US 501(c)(3)" status clause
 * is not a pending field: it is a legal claim, derived in the footer from a
 * configured EIN plus a GuideStar profile (never from a pending placeholder),
 * so leaving either empty makes no claim.
 */
export type PendingField =
  | 'email'
  | 'phone'
  | 'address'
  | 'ein'
  | 'guidestar'
  | 'social'
  | 'team'
  | 'donationUrl'
  | 'volunteerUrl'

/** Visible text shown in place of a pending field. */
export const PENDING_TEXT = 'Awaiting information from the charity'

export type SiteConfig = {
  /** Display name of the charity (used in titles, OG/Twitter cards). */
  name: string
  /** Short tagline used in the default title template. */
  tagline: string
  /** Plain-language description used for the <meta description> tag. */
  description: string
  /**
   * Shorter description tuned for OG/Twitter social card previews.
   * Falls back to `description` if empty. Aim for <= 200 chars and avoid
   * em-dashes — some card renderers break on them.
   */
  shortDescription: string
  /**
   * Canonical production URL with no trailing slash.
   * Used by metadataBase, sitemap, and robots. The drift check verifies that
   * this is updated whenever public/CNAME points to a custom domain, and
   * that public/.well-known/security.txt no longer carries the placeholder.
   */
  url: string
  /**
   * Twitter / X handle including the leading @ — e.g. `@freeforcharity`.
   * Empty string omits the twitter:site meta entirely. Handles without `@`
   * are auto-prefixed so a typo doesn't silently break attribution.
   */
  twitterHandle: string
  /**
   * Primary contact email. Used by your own pages; security.txt carries
   * its own `Contact:` line and is not auto-derived from this value.
   * Keep them in sync manually when you change either.
   */
  contactEmail: string
  /** SEO keywords used in the root layout metadata. */
  keywords: readonly string[]
  /** Default theme color (used by manifest and meta tag). */
  themeColor: string
  /** Where the vulnerability disclosure policy lives on this site. */
  vulnerabilityDisclosurePath: string
  /** Social links displayed in the footer. */
  social: readonly SiteSocialLink[]
  /** IRS Employer Identification Number (tax ID), e.g. '46-2471893'. */
  ein: string
  /**
   * Primary phone number. `display` is the human-readable form shown to users;
   * `tel` is the value used in the `tel:` link (digits, optionally E.164).
   */
  phone: { display: string; tel: string }
  /** Physical office addresses shown in the footer contact column. */
  addresses: readonly SiteAddress[]
  /**
   * GuideStar / Candid transparency profile links shown in the footer. Each is
   * a transparency claim, so the seal renders only when `profileUrl` is set and
   * the direct-link button only when `directProfileUrl` is set. Leave both ''
   * until the charity has its own Candid profile (never copy another
   * organization's), and list 'guidestar' in `pending` if one is coming.
   */
  guidestar: { profileUrl: string; directProfileUrl: string }
  /**
   * Permanent attribution to the supporting organization (FFC). Drives the
   * always-rendered "Supported by" clause in the footer bottom bar and the
   * "Supported Charity Login" quick link (`hubUrl`). This is part of the FFC
   * footer standard for every supported charity site: it is REQUIRED, always
   * rendered, and NOT to be removed or repointed when customizing a fork.
   * Distinct from `parentOrg` below, which covers genuine fiscal-sponsorship
   * ("a project of") relationships.
   */
  supportedBy: { name: string; url: string; hubUrl: string }
  /**
   * Parent / umbrella organization, when this site is "a project of" another
   * nonprofit. Omit for a standalone charity (the footer clause is hidden).
   */
  parentOrg?: { name: string; url: string; hubUrl: string }
  /**
   * Footer-standard fields still awaiting the charity. See `PendingField`.
   * Omit (or leave empty) once every field is supplied. This template's own
   * config sets none: Free For Charity has all of its details.
   */
  pending?: readonly PendingField[]
}

export const siteConfig: SiteConfig = {
  // Online Impacts closed and merged its services into Free For Charity, so
  // this site is a merge notice that sends visitors to FFC's real pathways
  // (freeforcharity.org, the FFC hub). The contact details below are
  // deliberately Free For Charity's own, as published on freeforcharity.org:
  // FFC now answers for Online Impacts' former relationships. Nothing is
  // pending: an empty EIN / GuideStar / address here means "none", because
  // the defunct organization makes no ongoing 501(c)(3) or transparency claim
  // (the footer hides the Endorsements column and the status clause).
  name: 'Online Impacts',
  tagline: 'Now part of Free For Charity',
  description:
    'Online Impacts, a nonprofit that built websites and offered free tech help to other nonprofits, is now part of Free For Charity. Nonprofits it hosted or developed for can migrate to Free For Charity.',
  shortDescription:
    'Online Impacts is now part of Free For Charity. Nonprofits it hosted or developed for can migrate to Free For Charity.',
  // No custom domain is configured yet (this migration phase serves the
  // default GitHub Pages URL — see public/CNAME, intentionally absent).
  // Bare origin ONLY: the GitHub Pages subpath is supplied separately by
  // NEXT_PUBLIC_BASE_PATH via sitePath()/assetPath().
  url: 'https://freeforcharity.github.io',
  twitterHandle: '',
  // Free For Charity's public contact (freeforcharity.org), which now owns
  // Online Impacts' former relationships.
  contactEmail: 'clarkemoyer@freeforcharity.org',
  keywords: ['nonprofit', 'charity', 'Online Impacts', 'Free For Charity', 'merged'],
  themeColor: '#ffffff',
  vulnerabilityDisclosurePath: '/vulnerability-disclosure-policy',
  social: [],
  ein: '',
  // Free For Charity's public phone (freeforcharity.org).
  phone: { display: '(520) 222-8104', tel: '5202228104' },
  addresses: [],
  guidestar: {
    profileUrl: '',
    directProfileUrl: '',
  },
  supportedBy: {
    name: 'Free For Charity',
    url: 'https://freeforcharity.org',
    hubUrl: 'https://freeforcharity.org/hub/',
  },
  // parentOrg is intentionally unset: Online Impacts is not "a project of"
  // FFC; it merged into it (said on the page itself).
}

function configuredBasePath(): string {
  const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim() ?? ''

  if (!rawBasePath || rawBasePath === '/') {
    return ''
  }

  const basePath = rawBasePath.startsWith('/') ? rawBasePath : `/${rawBasePath}`

  return basePath.replace(/\/+$/, '')
}

function assertSameOriginPath(path: string): void {
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')) {
    throw new TypeError(
      `siteUrl: path must be a same-origin absolute path starting with a single "/" (got: ${JSON.stringify(path)})`
    )
  }
}

/**
 * Handles the GitHub Pages basePath ONLY. It deliberately does not touch
 * trailing slashes — that is `canonicalPath()`'s job.
 */
export function sitePath(path = '/'): string {
  assertSameOriginPath(path)

  const basePath = configuredBasePath()

  if (!basePath) {
    return path
  }

  if (path === '/') {
    return `${basePath}/`
  }

  return `${basePath}${path}`
}

/**
 * Mirrors `trailingSlash` in next.config.ts.
 *
 * With `output: 'export'` + `trailingSlash: true` the export writes
 * `privacy-policy/index.html`, so the URL the site actually serves is
 * `/privacy-policy/`. The bare `/privacy-policy` form is non-canonical — it
 * redirects (or 404s, depending on the host), and must never be advertised in
 * a sitemap or a canonical tag.
 *
 * `__tests__/app/sitemap.test.ts` fails if this constant drifts away from the
 * real value in next.config.ts.
 */
export const trailingSlash: boolean = true

/** True when the last path segment looks like a file (e.g. `/sitemap.xml`). */
function isFilePath(path: string): boolean {
  return path.slice(path.lastIndexOf('/') + 1).includes('.')
}

/**
 * Returns `path` in the shape the deployed site serves it, i.e. with the
 * trailing slash when `trailingSlash` is on. File paths such as
 * `/sitemap.xml` are returned untouched — they are served verbatim.
 */
export function canonicalPath(path = '/'): string {
  assertSameOriginPath(path)

  // File paths (robots.txt, sitemap.xml) never take a slash in either mode.
  if (isFilePath(path)) {
    return path
  }

  // Root is '/' in both modes.
  if (path === '/') {
    return '/'
  }

  // Symmetric on purpose. An add-only helper silently does the wrong thing the
  // day trailingSlash is turned off: an input already written as
  // '/privacy-policy/' would keep its slash, and the sitemap would advertise a
  // URL the export no longer publishes — the exact drift this helper exists to
  // prevent, just in the other direction.
  if (trailingSlash) {
    return path.endsWith('/') ? path : `${path}/`
  }

  return path.replace(/\/+$/, '')
}

/**
 * Absolute URL for a same-origin path, in the canonical (served) shape.
 * Used by the sitemap, canonical tags and robots.txt so all three agree with
 * what the static export actually publishes.
 */
export function siteUrl(path = '/'): string {
  assertSameOriginPath(path)

  return `${siteConfig.url.replace(/\/$/, '')}${sitePath(canonicalPath(path))}`
}

export function twitterSite(): string | undefined {
  const handle = siteConfig.twitterHandle.trim().replace(/^@+/, '')
  return handle ? `@${handle}` : undefined
}

export function cardDescription(): string {
  return siteConfig.shortDescription.trim() || siteConfig.description
}

/** True when `field` is listed in `siteConfig.pending`. */
export function isPending(field: PendingField): boolean {
  return siteConfig.pending?.includes(field) ?? false
}
