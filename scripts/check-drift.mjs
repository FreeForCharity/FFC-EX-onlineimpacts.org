#!/usr/bin/env node
/**
 * FFC footer-only drift guard.
 *
 * Catches common ways this template can drift away from FFC best practices:
 *  1. Top-level route folders under src/app/ that are not kebab-case.
 *  2. Hardcoded /Images, /Svgs, or /videos paths missing assetPath().
 *  3. Common secret patterns committed under src/ or public/.
 *  4. The template placeholder URL ffcworkingsite1.org left behind after a site rebrands.
 *  5. Static security metadata (_headers and security.txt) drifting away from
 *     footer-only runtime origins or src/lib/site.config.ts. Note that
 *     public/_headers is inert on FFC deploys — see checkCspSync.
 *
 * Exits non-zero on errors; warnings do not fail the check.
 */
import { readdir, readFile } from 'node:fs/promises'
import { dirname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const ROOT = join(SCRIPT_DIR, '..')
const APP_DIR = join(ROOT, 'src', 'app')
const SRC_DIR = join(ROOT, 'src')
const PUBLIC_DIR = join(ROOT, 'public')

const errors = []
const warnings = []

const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const APP_RESERVED = new Set(['api', '_components', '_lib'])
const PLACEHOLDER_HOST = 'ffcworkingsite1.org'
const GITHUB_PAGES_PROJECT_PATH = '/FFC-EX-onlineimpacts.org'
const SECURITY_TXT_RFC3339 =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-]\d{2}:\d{2})$/

const SYNCED_CSP_DIRECTIVES = [
  'default-src',
  'script-src',
  'style-src',
  'img-src',
  'font-src',
  'connect-src',
  'frame-src',
  'media-src',
  'form-action',
  'object-src',
  'base-uri',
  'upgrade-insecure-requests',
]

async function walk(dir, predicate, results = []) {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return results
  }

  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
      await walk(full, predicate, results)
    } else if (predicate(entry.name)) {
      results.push(full)
    }
  }

  return results
}

function lineAt(body, index) {
  return body.slice(0, index).split('\n').length
}

function insideComment(body, index) {
  const lineStart = body.lastIndexOf('\n', index - 1) + 1
  const line = body.slice(lineStart, index)
  if (/(^|[^:])\/\//.test(line)) return true

  const beforeOpen = body.lastIndexOf('/*', index)
  if (beforeOpen === -1) return false
  const beforeClose = body.lastIndexOf('*/', index)
  return beforeOpen > beforeClose
}

function hostnameOf(rawUrl) {
  if (!rawUrl) return null
  try {
    return new URL(rawUrl).hostname
  } catch {
    return null
  }
}

async function readIfExists(path) {
  try {
    return await readFile(path, 'utf8')
  } catch {
    return null
  }
}

function extractStringProperty(body, property) {
  const match = body.match(new RegExp(`${property}:\\s*['"\`]([^'"\`]+)['"\`]`))
  return match?.[1] ?? null
}

function isSemanticallyValidRfc3339(raw) {
  const match = raw.match(SECURITY_TXT_RFC3339)
  if (!match) return false

  const [, yearRaw, monthRaw, dayRaw, hourRaw, minuteRaw, secondRaw, zoneRaw] = match
  const year = Number(yearRaw)
  const month = Number(monthRaw)
  const day = Number(dayRaw)
  const hour = Number(hourRaw)
  const minute = Number(minuteRaw)
  const second = Number(secondRaw)

  if (month < 1 || month > 12) return false
  if (hour > 23 || minute > 59 || second > 59) return false

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  if (day < 1 || day > daysInMonth) return false

  if (zoneRaw !== 'Z') {
    const [offsetHourRaw, offsetMinuteRaw] = zoneRaw.slice(1).split(':')
    const offsetHour = Number(offsetHourRaw)
    const offsetMinute = Number(offsetMinuteRaw)
    if (offsetHour > 23 || offsetMinute > 59) return false
  }

  return !Number.isNaN(new Date(raw).getTime())
}

async function readSiteConfig() {
  const path = join(SRC_DIR, 'lib', 'site.config.ts')
  const body = await readIfExists(path)
  if (!body) {
    errors.push('src/lib/site.config.ts is missing. Restore it from the template.')
    return null
  }

  return {
    body,
    url: extractStringProperty(body, 'url'),
    contactEmail: extractStringProperty(body, 'contactEmail'),
    vulnerabilityDisclosurePath:
      extractStringProperty(body, 'vulnerabilityDisclosurePath') ||
      '/vulnerability-disclosure-policy',
  }
}

function extractCspDirectives(policy) {
  const directives = new Map()
  if (!policy) return directives

  for (const part of policy.split(';')) {
    const trimmed = part.trim()
    if (!trimmed) continue
    const [name, ...sources] = trimmed.split(/\s+/)
    directives.set(name, new Set(sources))
  }

  return directives
}

function quotedStrings(body) {
  const values = []
  const pattern = /(["'`])((?:\\.|(?!\1)[\s\S])*?)\1/g
  let match
  while ((match = pattern.exec(body))) {
    values.push(match[2].replace(/\\(["'`])/g, '$1'))
  }
  return values
}

function extractLayoutCsp(layoutBody) {
  const constArrayMatch = layoutBody.match(
    /const\s+contentSecurityPolicy\s*=\s*\[([\s\S]*?)\]\.join\(\s*['"`];\s*['"`]\s*\)/
  )
  if (constArrayMatch) return quotedStrings(constArrayMatch[1]).join('; ')

  const metaTagMatch = layoutBody.match(
    /<meta\s+[^>]*httpEquiv=["']Content-Security-Policy["'][^>]*>/
  )
  const directMatch =
    metaTagMatch?.[0].match(/content="([^"]+)"/) ||
    metaTagMatch?.[0].match(/content='([^']+)'/) ||
    metaTagMatch?.[0].match(/content=\{`([^`]+)`\}/)
  if (directMatch) return directMatch[1]

  return null
}

function securityTxtPayload(body) {
  return body
    .split('\n')
    .filter((line) => !line.startsWith('#') && line.trim() !== '')
    .join('\n')
    .trim()
}

async function checkKebabCaseRoutes() {
  let entries
  try {
    entries = await readdir(APP_DIR, { withFileTypes: true })
  } catch {
    return
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    if (entry.name.startsWith('(') || entry.name.startsWith('_')) continue
    if (entry.name.startsWith('@')) continue
    if (APP_RESERVED.has(entry.name)) continue

    if (!KEBAB_CASE.test(entry.name)) {
      errors.push(
        `Route folder "src/app/${entry.name}" is not kebab-case. ` +
          'Rename it to lowercase letters and digits separated by hyphens.'
      )
    }
  }
}

async function checkAssetPathUsage() {
  const files = await walk(SRC_DIR, (name) => /\.(tsx?|jsx?)$/.test(name))
  const literalPattern = /(["'`])(\/(?:Images|Svgs|videos)\/[^"'`\n]+?)\1/g
  const templateBasePattern = /\$\{[^}]*basePath[^}]*\}\/(?:Images|Svgs|videos)\//g
  const wrappedInAssetPath = /assetPath\s*\([^)]*$/

  for (const file of files) {
    const rel = relative(ROOT, file)
    if (rel.includes('__tests__') || rel.startsWith('tests' + sep)) continue
    if (rel === join('src', 'lib', 'assetPath.ts')) continue

    const body = await readFile(file, 'utf8')

    literalPattern.lastIndex = 0
    let match
    while ((match = literalPattern.exec(body))) {
      if (insideComment(body, match.index)) continue
      const lookback = body.slice(Math.max(0, match.index - 400), match.index)
      if (wrappedInAssetPath.test(lookback)) continue

      errors.push(
        `${rel}:${lineAt(body, match.index)} references "${match[2]}" without assetPath(). ` +
          `Wrap it with assetPath('${match[2]}') so GitHub Pages subpath deploys keep working.`
      )
    }

    templateBasePattern.lastIndex = 0
    while ((match = templateBasePattern.exec(body))) {
      if (insideComment(body, match.index)) continue
      errors.push(
        `${rel}:${lineAt(body, match.index)} hand-rolls basePath asset concatenation. ` +
          "Use assetPath('/Images/...'), assetPath('/Svgs/...'), or assetPath('/videos/...') instead."
      )
    }
  }
}

async function checkSecrets() {
  const interestingFile = (name) =>
    /\.(tsx?|jsx?|json|md|yml|yaml|txt|webmanifest)$/.test(name) ||
    name === 'CNAME' ||
    name === '_headers'
  const files = [
    ...(await walk(SRC_DIR, interestingFile)),
    ...(await walk(PUBLIC_DIR, interestingFile)),
  ]
  const secretPatterns = [
    { name: 'AWS access key', re: /\bAKIA[0-9A-Z]{16}\b/ },
    { name: 'Google API key', re: /\bAIza[0-9A-Za-z_-]{35}\b/ },
    { name: 'GitHub personal access token', re: /\bghp_[A-Za-z0-9]{36,}\b/ },
    { name: 'GitHub fine-grained token', re: /\bgithub_pat_[A-Za-z0-9_]{82,}\b/ },
    { name: 'Slack token', re: /\bxox[abeprs]-[A-Za-z0-9-]{10,}\b/ },
    { name: 'private key block', re: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/ },
  ]

  for (const file of files) {
    const body = await readFile(file, 'utf8')
    for (const pattern of secretPatterns) {
      if (!pattern.re.test(body)) continue
      errors.push(
        `Possible ${pattern.name} committed in ${relative(ROOT, file)}. ` +
          'Move it to a gitignored .env file or GitHub Secrets and rotate the credential.'
      )
    }
  }
}

async function checkPlaceholderUrl(siteConfig) {
  const cname = (await readIfExists(join(PUBLIC_DIR, 'CNAME')))?.trim() || null
  const configUrl = siteConfig?.url ?? null
  const configHost = hostnameOf(configUrl)

  const cnameRebranded = Boolean(cname && cname !== PLACEHOLDER_HOST)
  const configRebranded = Boolean(configHost && configHost !== PLACEHOLDER_HOST)
  if (!cnameRebranded && !configRebranded) return

  const interestingFile = (name) =>
    /\.(tsx?|jsx?|md|mdx|txt|json|yml|yaml|webmanifest)$/.test(name) ||
    name === 'CNAME' ||
    name === '_headers'
  const candidates = [
    ...(await walk(SRC_DIR, interestingFile)),
    ...(await walk(PUBLIC_DIR, interestingFile)),
    join(ROOT, 'next.config.ts'),
    join(ROOT, 'package.json'),
    join(ROOT, 'README.md'),
  ]
  const customRef = cnameRebranded ? cname : configUrl

  for (const file of candidates) {
    const body = await readIfExists(file)
    if (!body) continue
    if (!body.includes(PLACEHOLDER_HOST)) continue

    const rel = relative(ROOT, file)
    warnings.push(
      `${rel}:${lineAt(body, body.indexOf(PLACEHOLDER_HOST))} still references ` +
        `${PLACEHOLDER_HOST} after this site rebranded to "${customRef}".`
    )
  }
}

function checkSiteConfigUrl(siteConfig) {
  if (!siteConfig) return
  const raw = siteConfig.url

  if (!raw) {
    errors.push('src/lib/site.config.ts: siteConfig.url is missing.')
    return
  }

  if (!raw.startsWith('https://')) {
    errors.push(
      `src/lib/site.config.ts: siteConfig.url "${raw}" must start with "https://". ` +
        'metadataBase, sitemap, robots, and security.txt require a production HTTPS origin.'
    )
  }

  if (raw.endsWith('/')) {
    errors.push(
      `src/lib/site.config.ts: siteConfig.url "${raw}" must not end with "/". ` +
        'Use the bare origin and let siteUrl() append paths.'
    )
  }

  try {
    const parsed = new URL(raw)
    if (parsed.pathname !== '/' && parsed.pathname !== '') {
      errors.push(
        `src/lib/site.config.ts: siteConfig.url "${raw}" should be the bare origin with no path.`
      )
    }
  } catch {
    errors.push(`src/lib/site.config.ts: siteConfig.url "${raw}" is not a parseable URL.`)
  }
}

// What actually protects an FFC site, and what only looks like it does:
//
//   public/_headers is INERT on the stack FFC deploys. It is a Cloudflare
//   Pages / Netlify *build* feature; FFC sites are a GitHub Pages origin behind
//   the Cloudflare *proxy*, and neither of those reads the file. Measured on
//   the wire, not inferred: FFC-Cloudflare-Automation#884. It is kept for
//   forward-compatibility with a future Cloudflare Pages deploy, so its CSP is
//   still worth keeping in sync — but its presence is not coverage, which is
//   why its findings are warnings rather than errors.
//
//   The <meta http-equiv="Content-Security-Policy"> tag in layout.tsx is the
//   only security header an FFC site actually serves. Its absence is an error,
//   and no finding about the inert file may mask it.
//
//   The other five headers (HSTS, X-Frame-Options, X-Content-Type-Options,
//   Referrer-Policy, Permissions-Policy) cannot be set from a static export at
//   all — <meta http-equiv> is ignored for them. They need a response-header
//   rule on the zone (Cloudflare Transform Rule); fleet posture is measured by
//   FFC-Cloudflare-Automation#894.
// Deliberately separate from the shared readIfExists(), which several other
// checks call and whose falsy-means-absent contract they rely on. This check
// (originally just the CSP one, now also .linkinatorrc.json's) needs to tell
// "absent" apart from "present but unreadable" — otherwise a permission or I/O
// error would be reported as a missing file, sending the reader to restore a
// file that is already there rather than fix the actual read error. For the
// CSP check that distinction also matters for severity, since it downgrades
// a genuinely absent file to a warning.
const UNREADABLE = Symbol('unreadable')

async function readForCspCheck(path) {
  try {
    return await readFile(path, 'utf8')
  } catch (err) {
    if (err.code === 'ENOENT') return null
    // Normalise to forward slashes. `relative()` returns platform separators,
    // so on Windows this message alone would spell the file `public\_headers`
    // while every hard-coded mention in this script — and in the tests — uses a
    // forward slash. One run would name one file two ways.
    const rel = relative(ROOT, path).split(sep).join('/')
    errors.push(
      `Could not read ${rel} (${err.code || err.message}). ` +
        `The file is present but unreadable — this is not the same as it being absent, ` +
        `so fix the read error rather than restoring the file from the template.`
    )
    return UNREADABLE
  }
}

async function checkCspSync() {
  const headersRaw = await readForCspCheck(join(PUBLIC_DIR, '_headers'))
  const layoutRaw = await readForCspCheck(join(SRC_DIR, 'app', 'layout.tsx'))

  // Only layout.tsx can end the check early, because the live CSP lives in it
  // and there is nothing left to assert without it. An unreadable _headers must
  // NOT end it: readForCspCheck has already recorded that read failure as its
  // own error, and stopping here would suppress the layout finding — the same
  // masking bug this function guards against, wearing a fourth costume.
  if (layoutRaw === UNREADABLE) return // error already recorded by readForCspCheck
  if (!layoutRaw) {
    errors.push('src/app/layout.tsx is missing. Restore the root layout with CSP metadata.')
    return
  }
  const layoutBody = layoutRaw

  // Unreadable and absent are both "no forward-compatible copy to compare
  // against", but only absent earns the warning — an unreadable file is already
  // reported with its real cause, and calling it missing would be a wrong
  // diagnosis on top of a correct one.
  const headersBody = headersRaw === UNREADABLE ? null : headersRaw
  if (headersRaw !== UNREADABLE && !headersBody) {
    warnings.push(
      'public/_headers is missing. Neither GitHub Pages nor the Cloudflare proxy in front of it ' +
        'reads this file, so it is inert on FFC deploys and nothing is served differently ' +
        'today — restore it from the template only to stay forward-compatible with a Cloudflare ' +
        'Pages deploy.'
    )
  }

  const headersMatch = headersBody ? headersBody.match(/Content-Security-Policy:\s*([^\n]+)/) : null
  const layoutPolicy = extractLayoutCsp(layoutBody)

  if (headersBody && !headersMatch) {
    warnings.push(
      'public/_headers has no Content-Security-Policy directive. This changes nothing that is ' +
        'served today (the file is inert on FFC deploys); add one with the footer-only origins ' +
        'to keep the forward-compatible copy aligned with the layout.tsx meta tag.'
    )
  }

  if (!layoutPolicy) {
    errors.push(
      'src/app/layout.tsx has no Content-Security-Policy meta tag. This is the ONLY security ' +
        'header an FFC site actually serves — without it the site has no CSP at all, whatever ' +
        'public/_headers contains.'
    )
  }

  if (!headersMatch || !layoutPolicy) return

  const headersCsp = extractCspDirectives(headersMatch[1])
  const layoutCsp = extractCspDirectives(layoutPolicy)

  for (const directive of SYNCED_CSP_DIRECTIVES) {
    const headerHasDirective = headersCsp.has(directive)
    const layoutHasDirective = layoutCsp.has(directive)

    if (headerHasDirective !== layoutHasDirective) {
      errors.push(
        `CSP "${directive}" drifted between public/_headers and src/app/layout.tsx - ` +
          `${headerHasDirective ? 'only in _headers' : 'only in layout.tsx'}. ` +
          'Update both surfaces in the same change.'
      )
      continue
    }

    const headerSources = headersCsp.get(directive) || new Set()
    const layoutSources = layoutCsp.get(directive) || new Set()
    const onlyInHeaders = [...headerSources].filter((source) => !layoutSources.has(source))
    const onlyInLayout = [...layoutSources].filter((source) => !headerSources.has(source))

    if (!onlyInHeaders.length && !onlyInLayout.length) continue

    const details = []
    if (onlyInHeaders.length) details.push(`only in _headers: ${onlyInHeaders.join(' ')}`)
    if (onlyInLayout.length) details.push(`only in layout.tsx: ${onlyInLayout.join(' ')}`)
    errors.push(
      `CSP "${directive}" drifted between public/_headers and src/app/layout.tsx - ` +
        `${details.join(' / ')}. Update both surfaces in the same change.`
    )
  }
}

async function checkSecurityTxtSync(siteConfig) {
  const wellKnownPath = join(PUBLIC_DIR, '.well-known', 'security.txt')
  const rootPath = join(PUBLIC_DIR, 'security.txt')
  const wellKnownBody = await readIfExists(wellKnownPath)
  const rootBody = await readIfExists(rootPath)

  if (!wellKnownBody) {
    errors.push('public/.well-known/security.txt is missing. Add the RFC 9116 well-known copy.')
  }

  if (!rootBody) {
    errors.push(
      'public/security.txt is missing. Add the root-path fallback for GitHub Pages compatibility.'
    )
  }

  if (!wellKnownBody || !rootBody) return

  const wellKnownPayload = securityTxtPayload(wellKnownBody)
  const rootPayload = securityTxtPayload(rootBody)

  if (wellKnownPayload !== rootPayload) {
    errors.push(
      'public/security.txt and public/.well-known/security.txt have drifted. ' +
        'Their non-comment Contact/Expires/Canonical/Policy/Acknowledgments payloads must match.'
    )
  }

  const expires = wellKnownPayload.match(/^Expires:\s*(.+)$/m)?.[1]?.trim()
  if (!expires) {
    errors.push('public/.well-known/security.txt is missing the required Expires line.')
  } else if (!isSemanticallyValidRfc3339(expires)) {
    errors.push(
      `public/.well-known/security.txt Expires value "${expires}" is not a parseable RFC 3339 datetime.`
    )
  } else {
    const expiresAt = new Date(expires).getTime()
    if (expiresAt <= Date.now()) {
      errors.push(
        `public/.well-known/security.txt Expires value "${expires}" must be in the future.`
      )
    }
  }

  if (!siteConfig?.url) return
  const origin = siteConfig.url.replace(/\/$/, '')
  const projectLines = [
    `Canonical: ${origin}${GITHUB_PAGES_PROJECT_PATH}/.well-known/security.txt`,
    `Canonical: ${origin}${GITHUB_PAGES_PROJECT_PATH}/security.txt`,
    `Policy: ${origin}${GITHUB_PAGES_PROJECT_PATH}${siteConfig.vulnerabilityDisclosurePath}`,
    `Acknowledgments: ${origin}${GITHUB_PAGES_PROJECT_PATH}/security-acknowledgements`,
  ]
  // Root (no-project-path) lines are only meaningful once a real custom
  // domain is configured (public/CNAME): siteConfig.url is otherwise the
  // *shared* freeforcharity.github.io origin, which serves FFC's own org
  // homepage at its root — publishing bare-origin Canonical/Policy/
  // Acknowledgments lines there would misdirect a security reporter to a
  // different site entirely, not this one (flagged in FFC-EX-onlineimpacts.org#16).
  // Which URL shape is CORRECT is mutually exclusive, driven by the same
  // public/CNAME signal deploy.yml uses for NEXT_PUBLIC_BASE_PATH: no CNAME
  // → the site serves under the GitHub Pages subpath, so only the
  // project-path lines are real and the root (bare-origin) lines misdirect
  // to FFC's shared org homepage (see above). CNAME present → the build
  // switches to an empty basePath and serves at the custom domain's root,
  // so the project-path lines stop being served at all and it is the ROOT
  // lines that are now correct — requiring both shapes at once (the
  // pre-fix bug here) would force security.txt to advertise a project-path
  // URL the custom-domain deploy never serves.
  // Mirror deploy.yml's `[ -s "public/CNAME" ]` check exactly: that is a stat
  // test for non-empty file SIZE, not trimmed content, and it does not care
  // whether the file is readable — a directory at that path has a non-zero
  // stat size too, so deploy.yml would still treat it as configured. A
  // whitespace-only file (e.g. a stray "\n") is non-empty for the same
  // reason. readForCspCheck() (not readIfExists()) is used here so an
  // unreadable/non-file CNAME is reported as its own read error AND still
  // counts as "configured" below — collapsing it to "no CNAME" would let
  // this guard silently disagree with deploy.yml about which URL shape is
  // correct.
  const cnameRaw = await readForCspCheck(join(PUBLIC_DIR, 'CNAME'))
  const cname = cnameRaw === UNREADABLE ? true : Boolean(cnameRaw && cnameRaw.length > 0)
  const rootLines = [
    `Canonical: ${origin}/.well-known/security.txt`,
    `Canonical: ${origin}/security.txt`,
    `Policy: ${origin}${siteConfig.vulnerabilityDisclosurePath}`,
    `Acknowledgments: ${origin}/security-acknowledgements`,
  ]
  const correctLines = cname ? rootLines : projectLines
  const misdirectingLines = cname ? projectLines : rootLines
  const misdirectingLabel = cname
    ? `the GitHub Pages subpath ${GITHUB_PAGES_PROJECT_PATH} (public/CNAME is configured, so the ` +
      `build now serves this site at ${origin}'s root, not that subpath)`
    : `the shared ${origin} origin (no public/CNAME is configured yet)`

  const expectedLines = [
    siteConfig.contactEmail ? `Contact: mailto:${siteConfig.contactEmail}` : null,
    'Preferred-Languages: en',
    ...correctLines,
  ].filter(Boolean)

  for (const line of expectedLines) {
    if (wellKnownPayload.includes(line)) continue
    errors.push(
      `public/.well-known/security.txt is not aligned with src/lib/site.config.ts. Missing: ${line}`
    )
  }

  const payloadsByFile = [
    ['public/.well-known/security.txt', wellKnownPayload],
    ['public/security.txt', rootPayload],
  ]
  for (const line of misdirectingLines) {
    for (const [file, payload] of payloadsByFile) {
      if (!payload.includes(line)) continue
      errors.push(`${file} has a line that misdirects to ${misdirectingLabel}: ${line}`)
    }
  }
}

/**
 * .linkinatorrc.json's `skip` list is meant to exclude this site's own
 * production origin from the link-check network crawl (see the comment at
 * the top of scripts/check-links.mjs) — checking it against the real
 * network would validate the build against whatever the PREVIOUS deploy
 * happened to serve, not this commit. That skip list is a hand-maintained
 * regex array, not derived from siteConfig.url, so it silently stops doing
 * its job the moment siteConfig.url's origin changes for any reason —
 * including the eventual custom-domain cutover (public/CNAME), which is
 * exactly when this bites hardest, per the same review that flagged the
 * `security.txt` misdirection this file also guards against.
 */
async function checkLinkinatorSkipsOwnOrigin(siteConfig) {
  if (!siteConfig?.url) return

  const configPath = join(ROOT, '.linkinatorrc.json')
  const body = await readForCspCheck(configPath)
  if (body === UNREADABLE) return // readForCspCheck already reported the read error.
  if (body === null) {
    errors.push('.linkinatorrc.json is missing. Add a skip list that excludes siteConfig.url.')
    return
  }

  let parsed
  try {
    parsed = JSON.parse(body)
  } catch {
    errors.push('.linkinatorrc.json is not valid JSON.')
    return
  }

  const skip = Array.isArray(parsed.skip) ? parsed.skip : []
  let origin
  try {
    origin = new URL(siteConfig.url).origin
  } catch {
    return // checkSiteConfigUrl already reports an invalid siteConfig.url.
  }

  const skipsOwnOrigin = skip.some((pattern) => {
    try {
      return new RegExp(pattern).test(`${origin}/`)
    } catch {
      return false
    }
  })

  if (!skipsOwnOrigin) {
    errors.push(
      `.linkinatorrc.json's "skip" list has no pattern matching siteConfig.url's origin ` +
        `(${origin}) — the link check will crawl it over the real network instead of ` +
        'skipping it, validating this commit against whatever the previous deploy served.'
    )
  }
}

const siteConfig = await readSiteConfig()
checkSiteConfigUrl(siteConfig)
await checkKebabCaseRoutes()
await checkAssetPathUsage()
await checkSecrets()
await checkPlaceholderUrl(siteConfig)
await checkCspSync()
await checkSecurityTxtSync(siteConfig)
await checkLinkinatorSkipsOwnOrigin(siteConfig)

if (warnings.length) {
  console.warn('\nDrift warnings:')
  for (const warning of warnings) console.warn(`  - ${warning}`)
}

if (errors.length) {
  console.error('\nDrift errors:')
  for (const error of errors) console.error(`  - ${error}`)
  console.error('\nFix these issues before merging.')
  process.exit(1)
}

console.log(
  warnings.length
    ? `\nNo drift errors (${warnings.length} warning${warnings.length === 1 ? '' : 's'}).`
    : '\nNo drift detected. Repo aligned with FFC footer-only best practices.'
)
