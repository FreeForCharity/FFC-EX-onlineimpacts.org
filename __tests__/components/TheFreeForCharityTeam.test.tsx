import React from 'react'
import { render, screen } from '@testing-library/react'

import { PENDING_TEXT, siteConfig } from '../../src/lib/site.config'
import TheFreeForCharityTeam from '../../src/components/home-page/TheFreeForCharityTeam'

// Online Impacts ships an empty roster, so the populated-roster behaviour is
// exercised against a fixture (never Free For Charity's own staff).
const fixtureTeam = [
  { name: 'Alex Example', role: 'Chair' },
  { name: 'Blair Example', role: 'Treasurer' },
  { name: 'Casey Example', role: 'Secretary' },
  { name: 'Drew Example', role: 'Director', linkedinUrl: 'https://www.linkedin.com/in/example' },
]

function renderWithFixtureTeam() {
  let result: ReturnType<typeof render> | undefined
  jest.isolateModules(() => {
    jest.doMock('@/data/team', () => ({ team: fixtureTeam }))
    const Team = require('../../src/components/home-page/TheFreeForCharityTeam').default
    result = render(<Team />)
  })
  return result!
}

describe('TheFreeForCharityTeam component', () => {
  it('renders nothing for the shipped (empty, not pending) roster', () => {
    const { container } = render(<TheFreeForCharityTeam />)
    expect(container.firstChild).toBeNull()
  })

  it('should display the team heading with the site name', () => {
    renderWithFixtureTeam()
    expect(screen.getByText(`The ${siteConfig.name} Team`)).toBeInTheDocument()
  })

  it('should render a card per member with initials monograms and no photos', () => {
    const { container } = renderWithFixtureTeam()
    const names = screen.getAllByRole('heading', { level: 3 })
    expect(names).toHaveLength(fixtureTeam.length)
    expect(container.querySelectorAll('img')).toHaveLength(0)
  })

  it('should have the team section with id="team"', () => {
    const { container } = renderWithFixtureTeam()
    expect(container.querySelector('#team')).toBeInTheDocument()
  })
})

describe('TheFreeForCharityTeam with an empty roster', () => {
  beforeEach(() => {
    jest.resetModules()
  })

  it('renders nothing when the team array is empty', () => {
    jest.isolateModules(() => {
      jest.doMock('@/data/team', () => ({ team: [] }))
      const EmptyTeam = require('../../src/components/home-page/TheFreeForCharityTeam').default
      const { container } = render(<EmptyTeam />)
      expect(container.firstChild).toBeNull()
    })
  })

  // A team the charity has not supplied yet (listed in siteConfig.pending) is
  // shown as a visible, non-link "awaiting information" placeholder instead of
  // silently disappearing.
  it('renders the section with a placeholder when the team is pending', () => {
    jest.isolateModules(() => {
      jest.doMock('@/data/team', () => ({ team: [] }))
      // Same module instance the component imports inside this isolated registry.
      const config = require('../../src/lib/site.config')
      config.siteConfig.pending = ['team']
      const PendingTeam = require('../../src/components/home-page/TheFreeForCharityTeam').default
      const { container } = render(<PendingTeam />)

      expect(container.querySelector('#team')).toBeInTheDocument()
      expect(screen.getByText(`The ${config.siteConfig.name} Team`)).toBeInTheDocument()
      expect(screen.getByText(config.PENDING_TEXT).closest('a')).toBeNull()
      expect(screen.queryAllByRole('heading', { level: 3 })).toHaveLength(0)
    })
  })
})

describe('TheFreeForCharityTeam with a populated roster', () => {
  it('shows no placeholder when the team is not pending', () => {
    renderWithFixtureTeam()
    expect(screen.queryByText(PENDING_TEXT)).not.toBeInTheDocument()
  })
})
