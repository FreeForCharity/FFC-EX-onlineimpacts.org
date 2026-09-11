import { spawnSync } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const syncedCsp =
  "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https://www.googletagmanager.com; frame-src https://www.googletagmanager.com; media-src 'self' blob: https:; object-src 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests"

// No public/CNAME is created in these fixtures (see makeFixture below), so
// the root (no-project-path) Canonical/Policy/Acknowledgments lines are
// deliberately absent — matching scripts/check-drift.mjs's
// checkSecurityTxtSync, which only expects/allows them once a real custom
// domain exists (see FFC-EX-onlineimpacts.org#16).
function payload(expires = '2027-12-31T00:00:00.000Z'): string {
  return [
    'Contact: mailto:clarkemoyer@freeforcharity.org',
    `Expires: ${expires}`,
    'Preferred-Languages: en',
    'Canonical: https://ffcworkingsite1.org/FFC-EX-onlineimpacts.org/.well-known/security.txt',
    'Canonical: https://ffcworkingsite1.org/FFC-EX-onlineimpacts.org/security.txt',
    'Policy: https://ffcworkingsite1.org/FFC-EX-onlineimpacts.org/vulnerability-disclosure-policy',
    'Acknowledgments: https://ffcworkingsite1.org/FFC-EX-onlineimpacts.org/security-acknowledgements',
    '',
  ].join('\n')
}

function makeFixture(
  overrides: Partial<
    Record<
      'headers' | 'layout' | 'siteConfig' | 'wellKnown' | 'rootSecurity' | 'linkinatorRc' | 'cname',
      string | null
    >
  > = {}
) {
  const dir = mkdtempSync(join(tmpdir(), 'ffc-drift-'))
  mkdirSync(join(dir, 'scripts'), { recursive: true })
  mkdirSync(join(dir, 'src/app'), { recursive: true })
  mkdirSync(join(dir, 'src/lib'), { recursive: true })
  mkdirSync(join(dir, 'public/.well-known'), { recursive: true })
  cpSync(join(process.cwd(), 'scripts/check-drift.mjs'), join(dir, 'scripts/check-drift.mjs'))

  const files = {
    headers: [
      '/*',
      '  X-Frame-Options: SAMEORIGIN',
      `  Content-Security-Policy: ${syncedCsp}; frame-ancestors 'self'`,
      '',
    ].join('\n'),
    layout: [
      'export default function RootLayout() {',
      '  return (',
      '    <html><head>',
      `      <meta httpEquiv="Content-Security-Policy" content="${syncedCsp}" />`,
      '    </head><body /></html>',
      '  )',
      '}',
      '',
    ].join('\n'),
    siteConfig:
      "export const siteConfig = { url: 'https://ffcworkingsite1.org', vulnerabilityDisclosurePath: '/vulnerability-disclosure-policy' }\n",
    wellKnown: payload(),
    rootSecurity: payload(),
    linkinatorRc: JSON.stringify({ skip: ['^https://ffcworkingsite1\\.org/.*'] }),
    cname: null, // absent by default — most fixtures are the no-custom-domain state
    ...overrides,
  }

  if (files.headers !== null) writeFileSync(join(dir, 'public/_headers'), files.headers)
  if (files.layout !== null) writeFileSync(join(dir, 'src/app/layout.tsx'), files.layout)
  if (files.siteConfig !== null)
    writeFileSync(join(dir, 'src/lib/site.config.ts'), files.siteConfig)
  if (files.wellKnown !== null)
    writeFileSync(join(dir, 'public/.well-known/security.txt'), files.wellKnown)
  if (files.rootSecurity !== null)
    writeFileSync(join(dir, 'public/security.txt'), files.rootSecurity)
  if (files.cname !== null) writeFileSync(join(dir, 'public/CNAME'), files.cname)
  if (files.linkinatorRc !== null)
    writeFileSync(join(dir, '.linkinatorrc.json'), files.linkinatorRc)

  return dir
}

function runDrift(dir: string) {
  // Both streams, always. The script prints errors AND warnings to stderr
  // (console.error / console.warn) and only the summary line to stdout, so
  // reading stdout alone on the success path makes every warning assertion
  // fail vacuously — and makes a "does not contain" assertion pass for the
  // wrong reason, which is the more dangerous half.
  const result = spawnSync('node', ['scripts/check-drift.mjs'], {
    cwd: dir,
    encoding: 'utf8',
  })
  return {
    status: result.status ?? 1,
    output: `${result.stdout ?? ''}${result.stderr ?? ''}`,
  }
}

describe('security drift guard', () => {
  let fixtures: string[] = []

  afterEach(() => {
    for (const fixture of fixtures) rmSync(fixture, { recursive: true, force: true })
    fixtures = []
  })

  // public/_headers is a Cloudflare Pages / Netlify build feature and is inert
  // on the stack FFC deploys — a GitHub Pages origin behind the Cloudflare
  // proxy, neither of which reads it (measured in
  // FFC-Cloudflare-Automation#884). So its absence changes nothing that is
  // served and must not fail the run, and must never mask the finding about
  // the layout.tsx CSP meta tag, which is the only header actually served.
  it('warns rather than fails when public/_headers is missing', () => {
    const dir = makeFixture({ headers: null })
    fixtures.push(dir)

    const result = runDrift(dir)

    expect(result.output).toContain('public/_headers is missing')
    expect(result.output).toContain('inert on FFC deploys')
    expect(result.output).not.toContain('security headers will not be served')
    expect(result.status).toBe(0)
  })

  // The warning severity above is correct only for a genuinely absent file. A
  // file that exists but cannot be read is a different fact: reporting it as
  // missing sends the reader to restore a file they already have, and — because
  // absent is only a warning — would let the run pass on a filesystem error.
  it('errors, not warns, when public/_headers exists but cannot be read', () => {
    const dir = makeFixture({ headers: null })
    fixtures.push(dir)
    // A directory where the file should be: readFile gives EISDIR, which is
    // portable and needs no chmod (root ignores permission bits in CI).
    mkdirSync(join(dir, 'public/_headers'))

    const result = runDrift(dir)

    expect(result.output).toContain('Could not read public/_headers')
    expect(result.output).not.toContain('public/_headers is missing')
    expect(result.status).not.toBe(0)
  })

  // Unreadable is the fourth state _headers can be in, and it must obey the
  // same rule as the other three: never end the check before the layout CSP has
  // been assessed. The run fails either way, so the cost is not a silent pass —
  // it is a reader who fixes the read error, re-runs, and only then learns the
  // site has no CSP.
  it('still reports the missing live CSP alongside an unreadable _headers', () => {
    const dir = makeFixture({
      headers: null,
      layout: 'export default function RootLayout() {\n  return <html><body /></html>\n}\n',
    })
    fixtures.push(dir)
    mkdirSync(join(dir, 'public/_headers'))

    const result = runDrift(dir)

    expect(result.output).toContain('Could not read public/_headers')
    expect(result.output).toContain('src/app/layout.tsx has no Content-Security-Policy meta tag')
    expect(result.status).not.toBe(0)
  })

  it('warns rather than fails when public/_headers carries no CSP', () => {
    const dir = makeFixture({ headers: '/*\n  X-Frame-Options: SAMEORIGIN\n' })
    fixtures.push(dir)

    const result = runDrift(dir)

    expect(result.output).toContain('public/_headers has no Content-Security-Policy directive')
    expect(result.status).toBe(0)
  })

  // A matrix rather than one case: the risk lives in the early returns, so a
  // regression would only show up in the _headers states that return before
  // reaching the layout check.
  const headersStates: Array<[string, string | null]> = [
    ['absent', null],
    ['present without a CSP', '/*\n  X-Frame-Options: SAMEORIGIN\n'],
    ['present with a CSP', `/*\n  Content-Security-Policy: ${syncedCsp}\n`],
  ]

  it.each(headersStates)(
    'fails on a missing layout CSP meta tag when _headers is %s',
    (_label, headers) => {
      const dir = makeFixture({
        headers,
        layout: 'export default function RootLayout() {\n  return <html><body /></html>\n}\n',
      })
      fixtures.push(dir)

      const result = runDrift(dir)

      expect(result.output).toContain('src/app/layout.tsx has no Content-Security-Policy meta tag')
      expect(result.status).not.toBe(0)
    }
  )

  it('fails when root and well-known security.txt payloads drift', () => {
    const dir = makeFixture({ rootSecurity: payload('2028-01-01T00:00:00.000Z') })
    fixtures.push(dir)

    const result = runDrift(dir)

    expect(result.status).not.toBe(0)
    expect(result.output).toContain('public/security.txt and public/.well-known/security.txt')
  })

  it('fails when a root (no-project-path) security.txt line is present without a public/CNAME', () => {
    // The misdirection this guards against: no CNAME exists, so
    // siteConfig.url is the *shared* freeforcharity.github.io origin —
    // a bare-origin Canonical line here would point a reporter at FFC's
    // org homepage, not this site (see FFC-EX-onlineimpacts.org#16).
    const misdirected = [
      'Contact: mailto:clarkemoyer@freeforcharity.org',
      'Expires: 2027-12-31T00:00:00.000Z',
      'Preferred-Languages: en',
      'Canonical: https://ffcworkingsite1.org/.well-known/security.txt',
      'Canonical: https://ffcworkingsite1.org/FFC-EX-onlineimpacts.org/.well-known/security.txt',
      'Canonical: https://ffcworkingsite1.org/FFC-EX-onlineimpacts.org/security.txt',
      'Policy: https://ffcworkingsite1.org/FFC-EX-onlineimpacts.org/vulnerability-disclosure-policy',
      'Acknowledgments: https://ffcworkingsite1.org/FFC-EX-onlineimpacts.org/security-acknowledgements',
      '',
    ].join('\n')
    const dir = makeFixture({ wellKnown: misdirected, rootSecurity: misdirected })
    fixtures.push(dir)

    const result = runDrift(dir)

    expect(result.status).not.toBe(0)
    expect(result.output).toContain('misdirects to the shared')
    expect(result.output).toContain(
      'Canonical: https://ffcworkingsite1.org/.well-known/security.txt'
    )
  })

  it('requires root lines (not project-path lines) once public/CNAME exists', () => {
    // Mirror image of the no-CNAME case above: once a custom domain is
    // configured, deploy.yml switches to an empty basePath and the site is
    // served at the custom domain's root, so the project-path lines this
    // fixture's default payload() carries are no longer served at all —
    // requiring them (the pre-fix bug) would make security.txt advertise a
    // URL the deploy never serves. Root lines become the correct ones.
    const dir = makeFixture({ cname: 'onlineimpacts.org' })
    fixtures.push(dir)

    const result = runDrift(dir)

    expect(result.status).not.toBe(0)
    // Missing the now-required root lines.
    expect(result.output).toContain(
      'Missing: Canonical: https://ffcworkingsite1.org/.well-known/security.txt'
    )
    // The project-path lines this fixture ships are now the misdirecting ones.
    expect(result.output).toContain('misdirects to')
    expect(result.output).toContain('GitHub Pages subpath')
    expect(result.output).toContain(
      'Canonical: https://ffcworkingsite1.org/FFC-EX-onlineimpacts.org/.well-known/security.txt'
    )
  })

  it('passes with only root lines once public/CNAME exists', () => {
    const rootOnly = [
      'Contact: mailto:clarkemoyer@freeforcharity.org',
      'Expires: 2027-12-31T00:00:00.000Z',
      'Preferred-Languages: en',
      'Canonical: https://ffcworkingsite1.org/.well-known/security.txt',
      'Canonical: https://ffcworkingsite1.org/security.txt',
      'Policy: https://ffcworkingsite1.org/vulnerability-disclosure-policy',
      'Acknowledgments: https://ffcworkingsite1.org/security-acknowledgements',
      '',
    ].join('\n')
    const dir = makeFixture({
      cname: 'onlineimpacts.org',
      wellKnown: rootOnly,
      rootSecurity: rootOnly,
    })
    fixtures.push(dir)

    const result = runDrift(dir)

    expect(result.status).toBe(0)
  })

  it('fails when .linkinatorrc.json has no skip pattern matching siteConfig.url', () => {
    // .linkinatorrc.json exists to exclude this site's own production
    // origin from the link-check network crawl (see scripts/check-links.mjs)
    // — a skip list that names some other host does not do that.
    const dir = makeFixture({
      linkinatorRc: JSON.stringify({ skip: ['^https://example-custom-domain\\.org/.*'] }),
    })
    fixtures.push(dir)

    const result = runDrift(dir)

    expect(result.status).not.toBe(0)
    expect(result.output).toContain('.linkinatorrc.json')
    expect(result.output).toContain('https://ffcworkingsite1.org')
  })

  it('fails when .linkinatorrc.json is missing', () => {
    const dir = makeFixture({ linkinatorRc: null })
    fixtures.push(dir)

    const result = runDrift(dir)

    expect(result.status).not.toBe(0)
    expect(result.output).toContain('.linkinatorrc.json is missing')
  })

  // readForCspCheck() returns null for ENOENT but an empty string for a
  // present-but-empty file — those are different facts, and only the first
  // one is "missing". An `if (!body)` check would conflate them and hide the
  // more accurate "not valid JSON" diagnosis behind a "go restore the file
  // you already have" one.
  it('reports "not valid JSON", not "is missing", when .linkinatorrc.json is present but empty', () => {
    const dir = makeFixture({ linkinatorRc: '' })
    fixtures.push(dir)

    const result = runDrift(dir)

    expect(result.status).not.toBe(0)
    expect(result.output).toContain('.linkinatorrc.json is not valid JSON')
    expect(result.output).not.toContain('.linkinatorrc.json is missing')
  })

  // Same distinction as the _headers tests above: a file that exists but
  // cannot be read is not the same fact as it being absent, and must not be
  // misreported as "missing" (which would send the reader to restore a file
  // they already have instead of fixing the read error).
  it('errors with "Could not read", not "is missing", when .linkinatorrc.json cannot be read', () => {
    const dir = makeFixture({ linkinatorRc: null })
    fixtures.push(dir)
    mkdirSync(join(dir, '.linkinatorrc.json'))

    const result = runDrift(dir)

    expect(result.status).not.toBe(0)
    expect(result.output).toContain('Could not read .linkinatorrc.json')
    expect(result.output).not.toContain('.linkinatorrc.json is missing')
  })

  it('fails when siteConfig.url is not a bare https origin', () => {
    const dir = makeFixture({
      siteConfig:
        "export const siteConfig = { url: 'http://ffcworkingsite1.org/path/', vulnerabilityDisclosurePath: '/vulnerability-disclosure-policy' }\n",
    })
    fixtures.push(dir)

    const result = runDrift(dir)

    expect(result.status).not.toBe(0)
    expect(result.output).toContain('siteConfig.url')
    expect(result.output).toContain('must start with "https://"')
  })

  it('fails when security.txt Expires is regex-shaped but not parseable', () => {
    const dir = makeFixture({
      wellKnown: payload('2027-02-30T00:00:00.000Z'),
      rootSecurity: payload('2027-02-30T00:00:00.000Z'),
    })
    fixtures.push(dir)

    const result = runDrift(dir)

    expect(result.status).not.toBe(0)
    expect(result.output).toContain('not a parseable RFC 3339 datetime')
  })

  it('fails when CSP sources drift between _headers and layout', () => {
    const dir = makeFixture({
      headers: [
        '/*',
        '  X-Frame-Options: SAMEORIGIN',
        `  Content-Security-Policy: ${syncedCsp.replace("form-action 'self'", "form-action 'self' https://example.com")}; frame-ancestors 'self'`,
        '',
      ].join('\n'),
    })
    fixtures.push(dir)

    const result = runDrift(dir)

    expect(result.status).not.toBe(0)
    expect(result.output).toContain('CSP "form-action" drifted')
    expect(result.output).toContain('https://example.com')
  })

  it('fails when a valueless CSP directive drifts between _headers and layout', () => {
    const dir = makeFixture({
      layout: [
        'export default function RootLayout() {',
        '  return (',
        '    <html><head>',
        `      <meta httpEquiv="Content-Security-Policy" content="${syncedCsp.replace('; upgrade-insecure-requests', '')}" />`,
        '    </head><body /></html>',
        '  )',
        '}',
        '',
      ].join('\n'),
    })
    fixtures.push(dir)

    const result = runDrift(dir)

    expect(result.status).not.toBe(0)
    expect(result.output).toContain('CSP "upgrade-insecure-requests" drifted')
    expect(result.output).toContain('only in _headers')
  })
})
