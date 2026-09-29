// Team member data
// This file imports team member data from JSON files in ./team/ directory
// To edit team members, edit the JSON files directly in src/data/team/.
// Each member needs: name and role. linkedinUrl is optional — when present the
// member's card links to it. There are no photos: cards render an initials
// monogram, so a forking charity never has to source or host portrait images.

export type TeamMember = {
  /** Full name; the first + last initials seed the avatar monogram. */
  name: string
  /** Role or title, e.g. "Founder", "Program Lead", "Treasurer". */
  role: string
  /**
   * Optional LinkedIn profile URL. Must be `https://` on linkedin.com (or a
   * subdomain) to render as a link — TeamMemberCard's `safeLinkedInUrl()`
   * ignores any other host or scheme, so the card shows without a link.
   */
  linkedinUrl?: string
}

// Online Impacts is defunct (now part of Free For Charity), so it has no team
// to show; the template's sample roster was Free For Charity's own staff.
// Empty and not pending: the team section renders nothing.
export const team: TeamMember[] = []
