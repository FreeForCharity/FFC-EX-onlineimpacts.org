import { team } from '../../src/data/team'

describe('Team data integrity', () => {
  it('ships no roster (Online Impacts is defunct and now part of Free For Charity)', () => {
    // The template's sample roster was Free For Charity's own staff; it must
    // never be presented as this organization's team.
    expect(team).toEqual([])
  })

  it('every member (if any are added) has the required fields', () => {
    for (const member of team) {
      expect(typeof member.name).toBe('string')
      expect(member.name.trim().length).toBeGreaterThan(0)
      expect(typeof member.role).toBe('string')
      expect(member.role.trim().length).toBeGreaterThan(0)
      // Photos were removed in favor of initials monograms — no imageUrl field.
      expect('imageUrl' in member).toBe(false)
      if (member.linkedinUrl !== undefined) {
        expect(member.linkedinUrl).toMatch(/^https:\/\/([a-z0-9-]+\.)*linkedin\.com(\/|$)/i)
      }
    }
  })

  it('should have no duplicate names', () => {
    const names = team.map((m) => m.name)
    expect(new Set(names).size).toBe(names.length)
  })
})
