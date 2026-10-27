import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import {
  backupFixture,
  fixtureBodyWeight,
  fixtureCustomExercise,
  fixtureWorkout,
} from '../src/test/backupFixture.ts'
import { importBackup } from './backup.ts'
import { expect, test } from './fixtures.ts'

// PRD §7 無障礙：axe 沒有 serious／critical 問題（含色彩對比 WCAG AA），觸控目標 ≥ 44×44 px，
// 輸入框字級 ≥ 16px（避免 iOS 聚焦時自動放大）。四個分頁、加入動作選單、自訂動作表單等畫面都要檢查，
// 淺色與深色主題各一次。

/**
 * 讓各畫面都有內容可檢查：今天有兩個動作（含熱身組與備註）、10/20 有紀錄、一個自訂動作；
 * 10/20 與今天記了體重，有身高（顯示 BMI）
 */
const FIXTURE = backupFixture({
  workouts: [
    fixtureWorkout('2026-10-20', [
      {
        exerciseId: 'barbell-bench-press',
        note: '換了握法',
        sets: [
          { type: 'weight_reps', weightKg: 40, reps: 10, setType: 'warmup' },
          { type: 'weight_reps', weightKg: 60, reps: 8 },
        ],
      },
    ]),
    fixtureWorkout('2026-10-24', [
      {
        exerciseId: 'barbell-bench-press',
        note: '左肩不適',
        sets: [
          { type: 'weight_reps', weightKg: 40, reps: 10, setType: 'warmup' },
          // 比 10/20 重：動作詳情會顯示「新紀錄」標記，一併檢查它的對比
          { type: 'weight_reps', weightKg: 62.5, reps: 8 },
        ],
      },
      {
        exerciseId: 'custom-treadmill',
        sets: [{ type: 'distance_duration', distanceKm: 3, durationSec: 1200 }],
      },
    ]),
  ],
  customExercises: [
    fixtureCustomExercise({
      id: 'custom-treadmill',
      nameZh: '健身房跑步機',
      trackingType: 'distance_duration',
    }),
  ],
  bodyWeights: [fixtureBodyWeight('2026-10-20', 72.5), fixtureBodyWeight('2026-10-24', 72)],
  settings: { weightUnit: 'kg', theme: 'system', heightCm: 175 },
})

/** 要檢查的畫面：名稱與如何從匯入完成的設定頁進入 */
const SCREENS: { name: string; open: (page: Page) => Promise<void> }[] = [
  {
    name: '今天',
    open: async (page) => {
      await page.goto('./')
      await expect(page.getByRole('region', { name: '健身房跑步機' })).toBeVisible()
    },
  },
  {
    name: '今天（組間休息倒數中）',
    open: async (page) => {
      await page.goto('./')
      await page
        .getByRole('region', { name: '槓鈴臥推' })
        .getByRole('button', { name: '新增一組' })
        .click()
      await expect(page.getByRole('region', { name: '組間休息' }).getByRole('timer')).toBeVisible()
    },
  },
  {
    name: '過去的訓練（鎖定）',
    open: async (page) => {
      await page.goto('day/2026-10-20')
      await expect(page.getByRole('button', { name: '鎖定', exact: true })).toHaveAttribute(
        'aria-pressed',
        'true',
      )
      await expect(page.getByRole('region', { name: '槓鈴臥推' })).toBeVisible()
    },
  },
  {
    name: '日期選擇器',
    open: async (page) => {
      await page.goto('./')
      await page.getByRole('button', { name: '選擇日期' }).click()
      await expect(
        page.getByRole('dialog', { name: '選擇日期' }).getByRole('grid', { name: '2026年10月' }),
      ).toBeVisible()
    },
  },
  {
    name: '加入動作選單',
    open: async (page) => {
      await page.goto('./')
      await page.getByRole('button', { name: '加入動作' }).click()
      const dialog = page.getByRole('dialog', { name: '加入動作' })
      await expect(dialog.getByRole('region', { name: '最近使用' })).toBeVisible()
      await expect(
        dialog.getByRole('list', { name: '動作清單' }).getByRole('listitem'),
      ).toHaveCount(67)
    },
  },
  {
    name: '加入動作選單的自訂動作表單',
    open: async (page) => {
      await page.goto('./')
      await page.getByRole('button', { name: '加入動作' }).click()
      await page.getByRole('button', { name: '新增自訂動作' }).click()
      const dialog = page.getByRole('dialog', { name: '新增自訂動作' })
      await expect(dialog.getByRole('textbox', { name: '中文名稱' })).toBeVisible()
      // 送出空白表單，連同錯誤訊息一起檢查
      await dialog.getByRole('button', { name: '儲存' }).click()
      await expect(dialog.getByText('請輸入中文名稱')).toBeVisible()
    },
  },
  {
    name: '歷史',
    open: async (page) => {
      await page.goto('history')
      await page.getByRole('button', { name: /10月20日/ }).click()
      await expect(page.getByRole('region', { name: '10/20（二）' })).toBeVisible()
    },
  },
  {
    name: '體重紀錄',
    open: async (page) => {
      await page.goto('history/body-weight')
      await expect(page.getByRole('list', { name: '體重紀錄' }).getByRole('listitem')).toHaveCount(
        2,
      )
    },
  },
  {
    name: 'AI 提示詞',
    open: async (page) => {
      await page.goto('history/ai-prompt')
      await expect(page.getByRole('textbox', { name: '提示詞' })).toHaveValue(/## 訓練明細/)
    },
  },
  {
    name: '動作庫',
    open: async (page) => {
      await page.goto('exercises')
      await expect(page.getByRole('list', { name: '動作清單' }).getByRole('listitem')).toHaveCount(
        67,
      )
    },
  },
  {
    name: '動作詳情',
    open: async (page) => {
      await page.goto('exercises/barbell-bench-press')
      await expect(page.getByRole('article', { name: '2026/10/20（二）' })).toBeVisible()
      await expect(page.getByText('重量新紀錄')).toBeVisible()
    },
  },
  {
    name: '自訂動作表單',
    open: async (page) => {
      await page.goto('exercises/new')
      await expect(page.getByRole('textbox', { name: '中文名稱' })).toBeVisible()
    },
  },
  {
    name: '設定',
    open: async (page) => {
      await page.goto('settings')
      await expect(page.getByRole('radiogroup', { name: '主題' })).toBeVisible()
    },
  },
]

/** axe 的 serious、critical 問題，整理成好讀的訊息 */
async function seriousViolations(page: Page) {
  // 停掉轉場與動畫，直接到最終狀態：axe 若在顏色轉場途中取樣，會算出不存在的低對比
  await page.addStyleTag({
    content: '*, *::before, *::after { transition: none !important; animation: none !important; }',
  })
  const { violations } = await new AxeBuilder({ page }).analyze()
  return violations
    .filter(({ impact }) => impact === 'serious' || impact === 'critical')
    .map(({ id, impact, help, nodes }) => ({
      rule: `${id}（${impact}）：${help}`,
      nodes: nodes.map(({ target, failureSummary }) => `${target.join(' ')}｜${failureSummary}`),
    }))
}

/** 小於 44×44 px 的觸控目標。核取方塊與選項以整個 label 的範圍計算（點 label 也會勾選） */
function smallTouchTargets(page: Page) {
  return page.evaluate((min) => {
    const selector = [
      'a[href]',
      'button',
      'input:not([type="hidden"])',
      'select',
      'textarea',
      '[role="button"]',
      '[role="checkbox"]',
      '[role="radio"]',
      '[role="switch"]',
      '[role="tab"]',
      '[role="link"]',
    ].join(',')
    const describe = (el: Element) =>
      `${el.tagName.toLowerCase()}「${(el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 30)}」`
    return [...document.querySelectorAll(selector)].flatMap((el) => {
      const style = getComputedStyle(el)
      const rect = el.getBoundingClientRect()
      // 看不到的元素（例如隱藏的檔案選擇框、sr-only 的原生 input）不是觸控目標
      if (style.visibility === 'hidden' || rect.width <= 1 || rect.height <= 1) return []
      if (el.closest('[aria-hidden="true"], [inert]')) return []
      const label =
        el.closest('label') ?? (el.id ? document.querySelector(`label[for="${el.id}"]`) : null)
      const area = label ? label.getBoundingClientRect() : rect
      const width = Math.max(area.right, rect.right) - Math.min(area.left, rect.left)
      const height = Math.max(area.bottom, rect.bottom) - Math.min(area.top, rect.top)
      // 量測取到小數，容許 0.5 px 的捨入誤差
      return width + 0.5 < min || height + 0.5 < min
        ? [`${describe(el)} ${width.toFixed(1)}×${height.toFixed(1)}`]
        : []
    })
  }, 44)
}

/** 字級小於 16px 的輸入框（iOS Safari 聚焦時會自動放大畫面） */
function smallInputFonts(page: Page) {
  return page.evaluate(() =>
    [
      ...document.querySelectorAll(
        'input:not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="hidden"]), textarea, select',
      ),
    ].flatMap((el) => {
      const fontSize = parseFloat(getComputedStyle(el).fontSize)
      return fontSize < 16
        ? [`${el.getAttribute('aria-label') ?? el.id ?? el.tagName} ${fontSize}px`]
        : []
    }),
  )
}

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`${colorScheme === 'light' ? '淺色' : '深色'}主題`, () => {
    for (const screen of SCREENS) {
      test(`${screen.name}：axe 沒有 serious／critical 問題，觸控目標與輸入框字級符合規範`, async ({
        page,
      }) => {
        await page.emulateMedia({ colorScheme })
        await importBackup(page, { content: FIXTURE })
        await screen.open(page)

        expect.soft(await seriousViolations(page), 'axe 的 serious／critical 問題').toEqual([])
        expect.soft(await smallTouchTargets(page), '小於 44×44 px 的觸控目標').toEqual([])
        expect.soft(await smallInputFonts(page), '字級小於 16px 的輸入框').toEqual([])
      })
    }
  })
}
