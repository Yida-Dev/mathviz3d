import { test, expect } from '@playwright/test'

test.describe('视觉回归（MVP）', () => {
  test.use({
    viewport: { width: 1100, height: 750 },
    deviceScaleFactor: 1,
  })

  async function waitForCanvasReady(page: any) {
    const canvas = page.locator('canvas')
    await expect(canvas).toBeVisible()
    // 给 WebGL 一点时间完成首帧渲染（避免截到空白）
    await page.waitForTimeout(500)
    return canvas
  }

  test('case1（cube）应稳定渲染', async ({ page }) => {
    await page.goto('/')
    await page.getByLabel('用例').selectOption('case1')
    const canvas = await waitForCanvasReady(page)
    await expect(canvas).toHaveScreenshot('case1.png')
  })

  test('case2（tetrahedron）应稳定渲染', async ({ page }) => {
    await page.goto('/')
    await page.getByLabel('用例').selectOption('case2')
    const canvas = await waitForCanvasReady(page)
    await expect(canvas).toHaveScreenshot('case2.png')
  })

  test("case3（fold）应稳定渲染", async ({ page }) => {
    await page.goto('/')
    await page.getByLabel('用例').selectOption('case3')
    const canvas = await waitForCanvasReady(page)
    await expect(canvas).toHaveScreenshot('case3.png')
  })
})

