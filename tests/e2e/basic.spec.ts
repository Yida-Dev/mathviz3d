import { test, expect } from '@playwright/test'

test('页面正常加载', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('h1')).toContainText('MathViz3D')
})
