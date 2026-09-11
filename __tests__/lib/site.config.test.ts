import {
  canonicalPath,
  cardDescription,
  siteConfig,
  sitePath,
  siteUrl,
  twitterSite,
} from '../../src/lib/site.config'

const originalBasePath = process.env.NEXT_PUBLIC_BASE_PATH

afterEach(() => {
  if (originalBasePath === undefined) {
    delete process.env.NEXT_PUBLIC_BASE_PATH
  } else {
    process.env.NEXT_PUBLIC_BASE_PATH = originalBasePath
  }
})

describe('siteConfig contract', () => {
  it('exposes the full site identity shape used by runtime consumers', () => {
    expect(siteConfig).toMatchObject({
      name: 'Online Impacts',
      tagline: 'Merged with Free For Charity',
      url: 'https://freeforcharity.github.io',
      twitterHandle: '',
      contactEmail: 'clarkemoyer@freeforcharity.org',
      themeColor: '#ffffff',
      vulnerabilityDisclosurePath: '/vulnerability-disclosure-policy',
    })
    expect(siteConfig.description).toContain('nonprofits')
    expect(siteConfig.shortDescription).toContain('Free For Charity')
    expect(siteConfig.keywords).toEqual(expect.arrayContaining(['nonprofit', 'charity', 'merged']))
    // No validated social links exist for this now-defunct organization.
    expect(siteConfig.social).toEqual([])
    // No EIN/Candid profile is validated (Level 1 footer) — see
    // NOT_YET_AVAILABLE in site.config.ts.
    expect(siteConfig.guidestar.profileUrl).toBe('Not yet available')
    expect(siteConfig.guidestar.directProfileUrl).toBe('Not yet available')
    expect(siteConfig.ein).toBe('Not yet available')
    expect(siteConfig.phone).toEqual({
      display: 'Not yet available',
      tel: 'Not yet available',
    })
    expect(siteConfig.addresses).toEqual([])
    // Permanent "Supported by" footer attribution (FFC footer standard) — the
    // values are intentionally FFC's and must survive template customization.
    expect(siteConfig.supportedBy).toEqual({
      name: 'Free For Charity',
      url: 'https://freeforcharity.org',
      hubUrl: 'https://freeforcharity.org/hub/',
    })
    // Standalone charity by default: no "a project of" parent organization.
    expect(siteConfig.parentOrg).toBeUndefined()
  })

  it('builds same-origin absolute site URLs in the served (canonical) shape', () => {
    delete process.env.NEXT_PUBLIC_BASE_PATH
    // sitePath() is basePath-only and deliberately slash-agnostic.
    expect(sitePath('/')).toBe('/')
    expect(sitePath('/privacy-policy')).toBe('/privacy-policy')
    // canonicalPath() owns the trailingSlash policy; siteUrl() applies both.
    expect(canonicalPath('/')).toBe('/')
    expect(canonicalPath('/privacy-policy')).toBe('/privacy-policy/')
    expect(siteUrl('/')).toBe('https://freeforcharity.github.io/')
    expect(siteUrl('/privacy-policy')).toBe('https://freeforcharity.github.io/privacy-policy/')
    // Files are served verbatim and must not gain a slash.
    expect(siteUrl('/sitemap.xml')).toBe('https://freeforcharity.github.io/sitemap.xml')
    expect(() => siteUrl('privacy-policy')).toThrow(TypeError)
    expect(() => siteUrl('//example.com')).toThrow(TypeError)
    expect(() => canonicalPath('//example.com')).toThrow(TypeError)
  })

  it('builds same-origin URLs that include the GitHub Pages base path', () => {
    process.env.NEXT_PUBLIC_BASE_PATH = '/FFC-EX-onlineimpacts.org'

    expect(sitePath('/')).toBe('/FFC-EX-onlineimpacts.org/')
    expect(sitePath('/privacy-policy')).toBe('/FFC-EX-onlineimpacts.org/privacy-policy')
    expect(siteUrl('/')).toBe('https://freeforcharity.github.io/FFC-EX-onlineimpacts.org/')
    expect(siteUrl('/privacy-policy')).toBe(
      'https://freeforcharity.github.io/FFC-EX-onlineimpacts.org/privacy-policy/'
    )
    expect(siteUrl('/sitemap.xml')).toBe(
      'https://freeforcharity.github.io/FFC-EX-onlineimpacts.org/sitemap.xml'
    )
  })

  it('normalizes card metadata helpers', () => {
    expect(twitterSite()).toBeUndefined()
    expect(cardDescription()).toBe(siteConfig.shortDescription)
  })
})
