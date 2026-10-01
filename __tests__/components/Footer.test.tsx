import React from 'react'
import { render, screen } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import Footer from '../../src/components/footer'
import { PENDING_TEXT, type PendingField, siteConfig } from '../../src/lib/site.config'

// Extend Jest matchers
expect.extend(toHaveNoViolations)

describe('Footer component', () => {
  it('should render the footer', () => {
    render(<Footer />)
    const footer = screen.getByRole('contentinfo')
    expect(footer).toBeInTheDocument()
  })

  it('should NOT display the Endorsements section (no validated EIN/Candid profile)', () => {
    render(<Footer />)
    expect(screen.queryByText('Endorsements')).not.toBeInTheDocument()
    expect(screen.queryByText(/EIN:/)).not.toBeInTheDocument()
    expect(screen.queryByAltText('GuideStar Platinum Seal of Transparency')).not.toBeInTheDocument()
  })

  it('should NOT claim 501(c)(3) status in the copyright bar (no validated EIN/Candid profile)', () => {
    render(<Footer />)
    expect(screen.queryByText(/501\(c\)\(3\)/)).not.toBeInTheDocument()
  })

  it('should display Quick Links section', () => {
    render(<Footer />)
    expect(screen.getByText('Quick Links')).toBeInTheDocument()
  })

  it('should display Contact Us section with contact information', () => {
    render(<Footer />)
    expect(screen.getByRole('heading', { name: 'Contact Us' })).toBeInTheDocument()
  })

  it('should display the current year in copyright', () => {
    render(<Footer />)
    const currentYear = new Date().getFullYear()
    expect(screen.getByText(new RegExp(currentYear.toString()))).toBeInTheDocument()
  })

  it('should have email contact link', () => {
    render(<Footer />)
    const emailLink = screen.getByText('clarkemoyer@freeforcharity.org').closest('a')
    expect(emailLink).toHaveAttribute('href', 'mailto:clarkemoyer@freeforcharity.org')
  })

  it("should show Free For Charity's phone (Online Impacts is now part of FFC)", () => {
    render(<Footer />)
    expect(screen.getByText('Call Us Today')).toBeInTheDocument()
    expect(screen.getByText('(520) 222-8104').closest('a')).toHaveAttribute(
      'href',
      'tel:5202228104'
    )
  })

  it('should list nothing as pending (the merged organization has no gaps to fill)', () => {
    render(<Footer />)
    expect(siteConfig.pending ?? []).toEqual([])
    expect(screen.queryByText(PENDING_TEXT)).not.toBeInTheDocument()
  })

  it('should NOT render an address block (no address for this defunct organization)', () => {
    render(<Footer />)
    expect(screen.queryByText('(opens in Google Maps)')).not.toBeInTheDocument()
  })

  it('should NOT render any social media icons (none known for this defunct organization)', () => {
    render(<Footer />)
    expect(screen.queryByLabelText('Facebook')).not.toBeInTheDocument()
  })

  it('should display the Online Impacts Policy section', () => {
    render(<Footer />)
    expect(screen.getByText('Online Impacts Policy')).toBeInTheDocument()
  })

  it('should have policy links with correct hrefs', () => {
    render(<Footer />)
    const policyLinks = [
      { text: 'Online Impacts Privacy Policy', href: '/privacy-policy' },
      { text: 'Online Impacts Cookie Policy', href: '/cookie-policy' },
      { text: 'Online Impacts Terms of Service', href: '/terms-of-service' },
      {
        text: 'Online Impacts Vulnerability Disclosure Policy',
        href: '/vulnerability-disclosure-policy',
      },
      { text: 'Online Impacts Security Acknowledgement', href: '/security-acknowledgements' },
      // FFC's own donation policy: label hardcoded to FFC on purpose.
      { text: 'Free For Charity Donation Policy', href: '/free-for-charity-donation-policy' },
      { text: 'Donation Policy', href: '/donation-policy' },
    ]

    for (const { text, href } of policyLinks) {
      const link = screen.getByText(text).closest('a')
      expect(link).toHaveAttribute('href', href)
    }
  })

  it('should have quick links with real page routes and the hub login link', () => {
    render(<Footer />)

    const homeLink = screen.getByText('Home').closest('a')
    expect(homeLink).toHaveAttribute('href', '/')

    // FFC footer standard: the hub login link is always rendered and points
    // at siteConfig.supportedBy.hubUrl.
    const hubLink = screen.getByText('Supported Charity Login').closest('a')
    expect(hubLink).toHaveAttribute('href', 'https://freeforcharity.org/hub/')
    expect(hubLink).toHaveAttribute('target', '_blank')
    expect(hubLink).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('should display the permanent "Supported by Free For Charity" attribution in copyright bar', () => {
    render(<Footer />)
    const copyright = screen.getByText((_, node) => {
      return (
        node?.tagName.toLowerCase() === 'p' &&
        node.textContent?.includes('All Rights Reserved') === true
      )
    })
    // FFC footer standard: the attribution is always rendered and links to FFC.
    expect(copyright).toHaveTextContent('Supported by Free For Charity')
    const links = screen.getAllByText('Free For Charity')
    const footerAttributionLink = links.find((el) => el.closest('a'))
    expect(footerAttributionLink?.closest('a')).toHaveAttribute(
      'href',
      'https://freeforcharity.org'
    )
  })

  it('should not have accessibility violations', async () => {
    const { container } = render(<Footer />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})

// The `pending` convention (see PendingField in src/lib/site.config.ts): a
// footer-standard field the charity has not supplied yet keeps an EMPTY value
// and renders PENDING_TEXT in its slot as plain text, never a link. The
// template itself lists nothing pending, so these cases set the config
// themselves and restore it afterwards, covering both states on every site.
describe('pending footer fields', () => {
  const original = {
    contactEmail: siteConfig.contactEmail,
    phone: siteConfig.phone,
    addresses: siteConfig.addresses,
    ein: siteConfig.ein,
    guidestar: siteConfig.guidestar,
    social: siteConfig.social,
    pending: siteConfig.pending,
  }
  afterEach(() => {
    Object.assign(siteConfig, original)
  })

  // Every footer slot. 'team' is not a footer field: it belongs to the team
  // section (see TheFreeForCharityTeam.test.tsx).
  // This footer has no Donate / Volunteer links (the organization is defunct),
  // so 'donationUrl' / 'volunteerUrl' have no slot here.
  const footerFields: readonly PendingField[] = [
    'guidestar',
    'ein',
    'email',
    'phone',
    'address',
    'social',
  ]

  function makeEveryFooterFieldPending() {
    siteConfig.contactEmail = ''
    siteConfig.phone = { display: '', tel: '' }
    siteConfig.addresses = []
    siteConfig.ein = ''
    siteConfig.guidestar = { profileUrl: '', directProfileUrl: '' }
    siteConfig.social = siteConfig.social.map((link) => ({ ...link, href: '' }))
    siteConfig.pending = [...footerFields]
  }

  it('renders one non-link placeholder per pending footer field in the shipped config', () => {
    render(<Footer />)
    const pendingInFooter = (siteConfig.pending ?? []).filter((f) => f !== 'team')
    const notes = screen.queryAllByText(PENDING_TEXT)
    expect(notes).toHaveLength(pendingInFooter.length)
    for (const note of notes) expect(note.closest('a')).toBeNull()
  })

  it('renders a visible, non-link placeholder for each pending footer field', () => {
    makeEveryFooterFieldPending()
    render(<Footer />)

    const notes = screen.getAllByText(PENDING_TEXT)
    expect(notes).toHaveLength(footerFields.length)
    for (const note of notes) expect(note.closest('a')).toBeNull()

    // Each placeholder sits under its own slot heading.
    for (const heading of [
      'GuideStar / Candid Profile',
      'E-mail',
      'Call Us Today',
      'Address',
      'Social Media',
    ]) {
      expect(screen.getByText(heading)).toBeInTheDocument()
    }
    expect(screen.getByText(`${siteConfig.name} EIN:`, { exact: false })).toBeInTheDocument()

    // Nothing that looks actionable survives behind a placeholder.
    expect(screen.queryByAltText('GuideStar Platinum Seal of Transparency')).toBeNull()
    expect(screen.queryByText('Direct GuideStar Profile Link')).toBeNull()
    expect(document.querySelector('a[href^="tel:"]')).toBeNull()
    expect(document.querySelector('a[href*="google.com/maps"]')).toBeNull()
    expect(document.querySelector('a[href="mailto:"]')).toBeNull()
  })

  it('treats an empty field that is NOT pending as "the charity has none"', () => {
    siteConfig.phone = { display: '', tel: '' }
    siteConfig.addresses = []
    siteConfig.guidestar = { profileUrl: '', directProfileUrl: '' }
    siteConfig.pending = []
    render(<Footer />)

    expect(screen.queryByText(PENDING_TEXT)).toBeNull()
    expect(screen.queryByText('Call Us Today')).toBeNull()
    expect(screen.queryByText('GuideStar / Candid Profile')).toBeNull()
  })

  it('has no accessibility violations with every footer field pending', async () => {
    makeEveryFooterFieldPending()
    const { container } = render(<Footer />)
    expect(await axe(container)).toHaveNoViolations()
  })

  // The seal and the direct-link button are separate transparency claims, so
  // each is gated on its own URL, and neither renders when both are empty.
  describe('GuideStar elements', () => {
    const seal = () => screen.queryByAltText('GuideStar Platinum Seal of Transparency')
    const directLink = () => screen.queryByText('Direct GuideStar Profile Link')

    it.each([
      ['both URLs', 'https://example.org/seal', 'https://example.org/direct', true, true],
      ['only the profile URL', 'https://example.org/seal', '', true, false],
      ['only the direct URL', '', 'https://example.org/direct', false, true],
      ['neither URL', '', '', false, false],
      ['whitespace-only URLs', '   ', '   ', false, false],
    ])('with %s configured', (_case, profileUrl, directProfileUrl, showSeal, showLink) => {
      siteConfig.guidestar = { profileUrl, directProfileUrl }
      siteConfig.pending = []
      render(<Footer />)

      expect(Boolean(seal())).toBe(showSeal)
      expect(Boolean(directLink())).toBe(showLink)
      if (showSeal) expect(seal()!.closest('a')).toHaveAttribute('href', profileUrl)
      if (showLink) expect(directLink()!.closest('a')).toHaveAttribute('href', directProfileUrl)
    })

    it('shows the placeholder, and no seal or link, while GuideStar is pending', () => {
      siteConfig.guidestar = { profileUrl: '', directProfileUrl: '' }
      siteConfig.pending = ['guidestar']
      render(<Footer />)

      expect(screen.getByText('GuideStar / Candid Profile')).toBeInTheDocument()
      expect(screen.getByText(PENDING_TEXT).closest('a')).toBeNull()
      expect(seal()).toBeNull()
      expect(directLink()).toBeNull()
    })
  })
})
