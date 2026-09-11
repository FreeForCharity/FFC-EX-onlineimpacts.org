import React from 'react'
import { render, screen } from '@testing-library/react'

import HomePage from '../../src/app/home-page'

describe('HomePage (app/home-page)', () => {
  it('should render without crashing', () => {
    render(<HomePage />)
  })

  it('should render the merge notice text', () => {
    render(<HomePage />)
    expect(screen.getByText(/decided to merge our services with/)).toBeInTheDocument()
    expect(
      screen.getByText(/If your website was hosted or developed by Online Impacts/)
    ).toBeInTheDocument()
  })

  it('should link to freeforcharity.org and the onboarding guide', () => {
    render(<HomePage />)
    const ffcLinks = screen.getAllByRole('link', { name: 'Free For Charity' })
    expect(ffcLinks.length).toBeGreaterThan(0)
    for (const link of ffcLinks) {
      expect(link).toHaveAttribute('href', 'https://freeforcharity.org')
    }
    expect(screen.getByRole('link', { name: 'freeforcharity.org' })).toHaveAttribute(
      'href',
      'https://freeforcharity.org'
    )
    expect(screen.getByRole('link', { name: 'here' })).toHaveAttribute(
      'href',
      'https://freeforcharity.org/online-impacts-onboarding-guide/'
    )
  })

  it('should render the Online Impacts logo', () => {
    render(<HomePage />)
    expect(screen.getByAltText('Online Impacts')).toBeInTheDocument()
  })
})
