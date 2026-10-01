import {
  PENDING_TEXT,
  canonicalPath,
  cardDescription,
  isPending,
  type PendingField,
  siteConfig,
  sitePath,
  siteUrl,
  twitterSite,
} from '../../src/lib/site.config'
import { team } from '../../src/data/team'

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
      tagline: 'Now part of Free For Charity',
      url: 'https://freeforcharity.github.io',
      twitterHandle: '',
      contactEmail: 'clarkemoyer@freeforcharity.org',
      themeColor: '#ffffff',
      vulnerabilityDisclosurePath: '/vulnerability-disclosure-policy',
    })
    expect(siteConfig.description).toContain('nonprofits')
    expect(siteConfig.shortDescription).toContain('Free For Charity')
    expect(siteConfig.keywords).toEqual(expect.arrayContaining(['nonprofit', 'charity', 'merged']))
    // No social links exist for this now-defunct organization.
    expect(siteConfig.social).toEqual([])
    // The defunct organization makes no ongoing EIN / Candid claim: empty and
    // NOT pending means "none" (Level 1 footer, no Endorsements column).
    expect(siteConfig.guidestar).toEqual({ profileUrl: '', directProfileUrl: '' })
    expect(siteConfig.ein).toBe('')
    // Online Impacts is now part of Free For Charity: the contact details are
    // FFC's own, as published on freeforcharity.org.
    expect(siteConfig.phone).toEqual({ display: '(520) 222-8104', tel: '5202228104' })
    expect(siteConfig.addresses).toEqual([])
    expect(siteConfig.pending ?? []).toEqual([])
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

describe('siteConfig.pending contract', () => {
  // Every PendingField, mapped to "its value is empty". A pending field must
  // carry no value, so no placeholder or borrowed (template/FFC) value can
  // ship behind the "awaiting information" notice. The Record type makes this
  // map fail to compile if PendingField grows a member it does not cover.
  // This site's config has no donationUrl / volunteerUrl keys, so those are
  // always empty here.
  const isEmpty: Record<PendingField, () => boolean> = {
    email: () => siteConfig.contactEmail.trim() === '',
    phone: () => siteConfig.phone.display.trim() === '' && siteConfig.phone.tel.trim() === '',
    address: () => siteConfig.addresses.length === 0,
    ein: () => siteConfig.ein.trim() === '',
    guidestar: () =>
      siteConfig.guidestar.profileUrl.trim() === '' &&
      siteConfig.guidestar.directProfileUrl.trim() === '',
    social: () => siteConfig.social.every((s) => s.href.trim() === ''),
    team: () => team.length === 0,
    donationUrl: () => true,
    volunteerUrl: () => true,
  }
  const knownFields = Object.keys(isEmpty)

  /** Pending fields that are unknown, duplicated, or still carry a value. */
  function pendingViolations(): string[] {
    const pending = siteConfig.pending ?? []
    const problems: string[] = []
    pending.forEach((field, index) => {
      if (!knownFields.includes(field)) problems.push(`${field}: unknown field`)
      else if (pending.indexOf(field) !== index) problems.push(`${field}: listed twice`)
      else if (!isEmpty[field]()) problems.push(`${field}: pending but has a value`)
    })
    return problems
  }

  it('holds for the shipped config', () => {
    expect(pendingViolations()).toEqual([])
    for (const field of siteConfig.pending ?? []) expect(isPending(field)).toBe(true)
  })

  it('has a fixed, non-empty placeholder text', () => {
    expect(PENDING_TEXT).toBe('Awaiting information from the charity')
  })

  describe('with a fork-style pending list', () => {
    const original = {
      contactEmail: siteConfig.contactEmail,
      phone: siteConfig.phone,
      ein: siteConfig.ein,
      pending: siteConfig.pending,
    }
    afterEach(() => {
      Object.assign(siteConfig, original)
    })

    it('isPending reflects exactly the listed fields', () => {
      siteConfig.pending = undefined
      for (const field of knownFields) expect(isPending(field as PendingField)).toBe(false)

      siteConfig.pending = ['phone', 'guidestar']
      expect(isPending('phone')).toBe(true)
      expect(isPending('guidestar')).toBe(true)
      expect(isPending('email')).toBe(false)
    })

    it('rejects a pending field that still carries a value', () => {
      // This site's email and phone are set, so listing them is a violation.
      siteConfig.pending = ['email', 'phone']
      expect(pendingViolations()).toEqual([
        'email: pending but has a value',
        'phone: pending but has a value',
      ])
    })

    it('accepts pending fields whose values are empty', () => {
      siteConfig.contactEmail = ''
      siteConfig.phone = { display: '', tel: '' }
      siteConfig.pending = ['email', 'phone', 'ein', 'guidestar', 'address', 'social', 'team']
      expect(pendingViolations()).toEqual([])
    })

    it('rejects an unknown or duplicated field', () => {
      siteConfig.pending = ['ein', 'ein', 'notAField' as PendingField]
      expect(pendingViolations()).toEqual(['ein: listed twice', 'notAField: unknown field'])
    })
  })
})
