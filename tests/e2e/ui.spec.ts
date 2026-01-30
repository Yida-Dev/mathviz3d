import { test, expect } from '@playwright/test'
import type { Locator } from '@playwright/test'

test.describe('Phase 4 UI', () => {
  test.use({
    viewport: { width: 1100, height: 750 },
    deviceScaleFactor: 1,
  })

  test('模式切换：交互模式 ↔ 视频讲解（TimelinePanel 显示/隐藏）', async ({ page }) => {
    await page.goto('/?case=case1&mode=interactive')

    // 交互模式：TimelinePanel 不显示（播放按钮不存在）
    await expect(page.getByRole('button', { name: '播放' })).toHaveCount(0)

    await page.getByRole('button', { name: '视频讲解' }).click()
    await expect(page.getByRole('button', { name: '播放' })).toBeVisible()

    await page.getByRole('button', { name: '交互模式' }).click()
    await expect(page.getByRole('button', { name: '播放' })).toHaveCount(0)
  })

  test('交互模式：滑块修改应触发测量值更新（case3 foldAngle → dist_ApC）', async ({ page }) => {
    await page.goto('/?case=case3&mode=interactive')

    // Tablet 默认折叠左侧面板：先展开，确保测量卡片存在
    await page.getByRole('button', { name: '打开侧栏' }).click()

    const cell = page.getByTestId('measurement-dist_ApC')
    await expect(cell).toBeVisible()

    const before = await readFirstNumber(cell)

    // 把折叠角度拉到 0（键盘方式更稳定地触发 React onChange）
    const slider = page.getByTestId('param-foldAngle-slider')
    await slider.focus()
    for (let i = 0; i < 120; i++) {
      await slider.press('ArrowLeft')
    }

    await expect.poll(async () => await readFirstNumber(cell)).not.toBe(before)
  })

  test('视频模式：上一步/下一步应切换字幕（case1）', async ({ page }) => {
    await page.goto('/?case=case1&mode=video')

    const subtitle = page.getByTestId('subtitle-bar')
    await expect(subtitle).toBeVisible()

    await expect(subtitle).toContainText('正方体')

    await page.getByRole('button', { name: '下一步' }).click()
    await expect(subtitle).toContainText('M是AD1的中点')

    await page.getByRole('button', { name: '上一步' }).click()
    await expect(subtitle).toContainText('正方体')
  })
})

async function readFirstNumber(locator: Locator): Promise<number> {
  const text = await locator.innerText()
  const m = text.match(/(-?\d+(?:\.\d+)?)/)
  if (!m) throw new Error(`No number found in: ${text}`)
  return Number(m[1])
}
