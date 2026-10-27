import type { Locator, Page } from '@playwright/test'
import { backupFixture, fixtureWorkout, type FixtureExercise } from '../src/test/backupFixture.ts'
import { importBackup } from './backup.ts'
import { expect, test } from './fixtures.ts'

// PRD §7：1,000 筆訓練（約 3 年每日訓練）下，開啟訓練頁、加入動作、顯示上次紀錄的回應時間 < 100 ms。
const BUDGET_MS = 100
const WORKOUT_COUNT = 1000

/** 每天輪流做的動作（都是重量×次數）；槓鈴臥推另外隔天做一次，但今天沒做 */
const ROTATION = [
  'dumbbell-bench-press',
  'incline-press',
  'lat-pulldown',
  'barbell-row',
  'deadlift',
  'overhead-press',
  'dumbbell-shoulder-press',
  'seated-cable-row',
]

/** 從今天（2026-10-24）往前第 n 天的日期 */
function daysBeforeToday(n: number) {
  return new Date(Date.UTC(2026, 9, 24 - n)).toISOString().slice(0, 10)
}

function exercise(exerciseId: string): FixtureExercise {
  return {
    exerciseId,
    sets: [
      { type: 'weight_reps', weightKg: 20, reps: 12, setType: 'warmup' },
      { type: 'weight_reps', weightKg: 60, reps: 8 },
      { type: 'weight_reps', weightKg: 60, reps: 8 },
      { type: 'weight_reps', weightKg: 62.5, reps: 6 },
    ],
  }
}

/** 今天往前連續 1,000 天、每天 4 個動作的訓練。槓鈴臥推上次做是 10/23，今天沒做 */
function thousandWorkouts() {
  return Array.from({ length: WORKOUT_COUNT }, (_, n) => {
    const ids = [0, 1, 2, 3].map((k) => ROTATION[(n + k * 2) % ROTATION.length])
    if (n % 2 === 1) ids[0] = 'barbell-bench-press'
    return fixtureWorkout(daysBeforeToday(n), ids.map(exercise))
  })
}

/** 回應的終點：符合 CSS 選擇器、且文字包含所有 `texts` 的元素達到 `count` 個 */
interface Done {
  selector: string
  texts?: string[]
  count: number
}

/**
 * 量測「點擊 → 畫面更新完成」的時間，全程在頁面裡計時，不含 Playwright 與瀏覽器之間的通訊。
 * 起點是點擊事件；終點是 DOM 符合條件後的下一個畫格（rAF + setTimeout，近似畫面實際更新）。
 * 同一次點擊可以量多個終點，回傳的時間依 `dones` 的順序排列。
 */
async function measureClick(page: Page, target: Locator, dones: Done[]): Promise<number[]> {
  const timings = page.evaluate(
    (conditions) =>
      Promise.all(
        conditions.map(
          ({ selector, texts = [], count }) =>
            new Promise<number>((resolve, reject) => {
              // 條件寫錯或畫面沒更新時盡快失敗，不要等到測試逾時
              setTimeout(() => reject(new Error(`10 秒內沒有等到 ${selector}`)), 10_000)
              let start: number | undefined
              const isDone = () =>
                [...document.querySelectorAll(selector)].filter((el) =>
                  texts.every((text) => el.textContent?.includes(text)),
                ).length >= count
              const observer = new MutationObserver(() => {
                if (start === undefined || !isDone()) return
                observer.disconnect()
                const begin = start
                requestAnimationFrame(() => setTimeout(() => resolve(performance.now() - begin)))
              })
              document.addEventListener('click', () => (start ??= performance.now()), {
                capture: true,
                once: true,
              })
              observer.observe(document.body, {
                subtree: true,
                childList: true,
                characterData: true,
                attributes: true,
              })
            }),
        ),
      ),
    dones,
  )
  // 等頁面裡的監聽裝好再點：evaluate 依序執行，這個空的 evaluate 回來時上面的已經開始等待
  await page.evaluate(() => undefined)
  await target.click()
  return timings
}

test('1,000 筆訓練下，開啟訓練頁、加入動作、顯示上次紀錄的回應時間都 < 100 ms', async ({
  page,
}, testInfo) => {
  // CI 的 runner（2 核心，WebKit 尤其慢）量到的時間是本機的 3～10 倍，不代表使用者的手機，所以只在本機跑
  test.skip(!!process.env.CI, '回應時間只在本機量測')
  test.setTimeout(120_000)
  await importBackup(page, { content: backupFixture({ workouts: thousandWorkouts() }) })

  const report = (name: string, ms: number) => {
    testInfo.annotations.push({ type: name, description: `${ms.toFixed(1)} ms` })
    console.log(`[${testInfo.project.name}] ${name}：${ms.toFixed(1)} ms`)
    expect.soft(ms, `${name}的回應時間（ms）`).toBeLessThan(BUDGET_MS)
  }

  // 開啟訓練頁：從設定頁點「今天」分頁，到今天的 4 個動作連同各自的上次紀錄都顯示出來
  const tabs = page.getByRole('navigation', { name: '主要分頁' })
  const [openWorkout] = await measureClick(page, tabs.getByRole('link', { name: '今天' }), [
    { selector: 'main section', texts: ['上次（'], count: 4 },
  ])
  report('開啟訓練頁', openWorkout)
  await expect(page.getByRole('heading', { level: 1, name: '10/24（六）' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2 })).toHaveCount(4)
  await expect(page.getByRole('region', { name: '每日摘要' })).toBeVisible()

  // 加入動作：打開選單到最近使用與全部動作都列出來
  const [openPicker] = await measureClick(page, page.getByRole('button', { name: '加入動作' }), [
    { selector: '[role="dialog"] ul[aria-label="動作清單"] button', count: 66 },
  ])
  report('打開加入動作選單', openPicker)
  const dialog = page.getByRole('dialog', { name: '加入動作' })
  await expect(dialog.getByRole('region', { name: '最近使用' })).toBeVisible()

  // 從清單選槓鈴臥推：量到它出現在訓練頁，以及它的上次紀錄顯示出來
  const bench = dialog
    .getByRole('list', { name: '動作清單' })
    .getByRole('button', { name: /^槓鈴臥推/ })
  const [added, lastShown] = await measureClick(page, bench, [
    { selector: 'main section h2', count: 5 },
    { selector: 'main section', texts: ['槓鈴臥推', '上次（10/23）'], count: 1 },
  ])
  report('加入動作', added)
  report('顯示上次紀錄', lastShown)

  const card = page.getByRole('region', { name: '槓鈴臥推' })
  await expect(card.getByText('上次（10/23）：60kg×8、60kg×8、62.5kg×6')).toBeVisible()
  await expect(card.getByRole('textbox', { name: '第 1 組重量（kg）' })).toHaveValue('60')
})
