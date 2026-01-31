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

  test('交互模式：UploadZone 上传应触发 mock AI 并切换用例（case1 → case3）', async ({ page }) => {
    // 预置 AI 配置（避免弹出设置对话框阻塞上传流程）
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'ai-config',
        JSON.stringify({ state: { apiKey: 'mock', baseUrl: 'mock', model: 'mock' }, version: 0 }),
      )
    })

    await page.goto('/?case=case1&mode=interactive')

    // 展开侧栏（Tablet 默认折叠）
    await page.getByRole('button', { name: '打开侧栏' }).click()

    const panel = page.getByTestId('ai-result-panel')
    await expect(panel).toContainText('cube')

    await page.getByTestId('upload-input').setInputFiles({
      name: 'case3.png',
      mimeType: 'image/png',
      buffer: Buffer.from([1, 2, 3, 4]),
    })

    // mock 有固定延迟，等待结果生效
    await expect(panel).toContainText('square')
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

  test('视频模式：进度条应显示场景分割点标记（case1）', async ({ page }) => {
    await page.goto('/?case=case1&mode=video')
    const marks = page.getByTestId('timeline-marker')
    await expect.poll(async () => await marks.count()).toBeGreaterThan(0)
  })

  test('视频模式：activeMeasurements 应显示并随场景切换（case1 volume_MPQN）', async ({ page }) => {
    await page.goto('/?case=case1&mode=video')

    // 展开侧栏（Tablet 默认折叠）
    await page.getByRole('button', { name: '打开侧栏' }).click()

    // intro -> mark-points -> dynamic-points -> tetrahedron -> explore
    for (let i = 0; i < 4; i++) {
      await page.getByRole('button', { name: '下一步' }).click()
    }

    const cell = page.getByTestId('measurement-volume_MPQN')
    await expect(cell).toBeVisible()
    await expect(cell).toContainText('0.0417')
  })

  test('视频模式：导出应触发下载并更新进度（mock 导出）', async ({ page }) => {
    await page.addInitScript(() => {
      ;(window as any).__MATHVIZ_E2E_EXPORT__ = async ({ options }: any) => {
        options.onProgress(0)
        // 模拟一点异步延迟，避免 UI 竞争条件
        await new Promise((r) => setTimeout(r, 50))
        options.onProgress(1)
        return new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'video/mp4' })
      }
    })

    await page.goto('/?case=case1&mode=video')

    await page.getByRole('button', { name: '导出视频' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: '开始导出' }).click(),
    ])

    await expect(page.getByTestId('export-progress-text')).toHaveText('100%')
    expect(download.suggestedFilename()).toMatch(/\.mp4$/)
  })
})

async function readFirstNumber(locator: Locator): Promise<number> {
  const text = await locator.innerText()
  const m = text.match(/(-?\d+(?:\.\d+)?)/)
  if (!m) throw new Error(`No number found in: ${text}`)
  return Number(m[1])
}
