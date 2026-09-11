import React from 'react'
import { render, screen } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import Footer from '../../src/components/footer'

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

  it('should NOT render a phone contact block (no phone for this defunct organization)', () => {
    render(<Footer />)
    expect(screen.queryByText('Call Us Today')).not.toBeInTheDocument()
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
