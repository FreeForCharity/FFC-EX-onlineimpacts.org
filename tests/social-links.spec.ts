import { test, expect } from '@playwright/test'

/**
 * Social Links Tests
 *
 * No validated social links exist for Online Impacts, a now-defunct
 * organization (see src/lib/site.config.ts) — the footer renders none.
 * These tests verify that absence rather than any specific link.
 */

test.describe('Footer Social Links', () => {
  test('should not contain Google+ social link', async ({ page }) => {
    await page.goto('/')

    const googlePlusLink = page.locator('footer a[href*="plus.google.com"]')
    await expect(googlePlusLink).toHaveCount(0)

    const googlePlusLabel = page.locator('footer a[aria-label="Google Plus"]')
    await expect(googlePlusLabel).toHaveCount(0)
  })

  test('should render no social media icons', async ({ page }) => {
    await page.goto('/')

    const socialMediaLinks = page.locator(
      'footer a[aria-label="Facebook"], footer a[aria-label="X (Twitter)"], footer a[aria-label="LinkedIn"], footer a[aria-label="GitHub"]'
    )
    await expect(socialMediaLinks).toHaveCount(0)
  })
})
