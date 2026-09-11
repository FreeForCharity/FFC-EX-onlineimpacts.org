import { test, expect } from '@playwright/test'

/**
 * Footer smoke test.
 *
 * Online Impacts is a defunct organization whose home page is a single
 * "merged with Free For Charity" notice (see src/app/home-page) — there is
 * no team section on this site, unlike the bare template's default content.
 */

test.describe('Footer', () => {
  test('should render the Footer', async ({ page }) => {
    await page.goto('/')

    await expect(page.locator('footer')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Quick Links' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Contact Us' })).toBeVisible()
  })
})
