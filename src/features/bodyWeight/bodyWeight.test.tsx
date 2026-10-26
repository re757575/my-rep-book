import { screen, waitFor, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { backupFixture, fixtureBodyWeight, fixtureWorkout } from '@/test/backupFixture'
import { renderAppWithBackup } from '@/test/importBackup'
import { renderApp } from '@/test/renderApp'
import { seedV1Database } from '@/test/seedV1Database'

/** 點底部的分頁 */
async function goToTab(user: UserEvent, tab: '今天' | '歷史' | '動作庫' | '設定') {
  const tabs = screen.getByRole('navigation', { name: '主要分頁' })
  await user.click(within(tabs).getByRole('link', { name: tab }))
}

/** 訓練頁上的體重欄位；體重載入後才出現 */
function bodyWeightField(unit: 'kg' | 'lb' = 'kg') {
  return screen.findByRole('textbox', { name: `體重（${unit}）` })
}

/** 在設定頁填寫身高 */
async function enterHeight(user: UserEvent, height: string) {
  await goToTab(user, '設定')
  const field = await screen.findByRole('textbox', { name: '身高' })
  await user.clear(field)
  await user.type(field, height)
}

/** 在設定頁選擇重量單位，等它儲存完成 */
async function chooseWeightUnit(user: UserEvent, unit: 'kg' | 'lb') {
  await goToTab(user, '設定')
  const group = await screen.findByRole('radiogroup', { name: '重量單位' })
  const option = within(group).getByRole('radio', { name: unit })
  await user.click(option)
  await waitFor(() => expect(option).toBeChecked())
}

/** 在歷史月曆點某一天，回傳日明細 */
async function openDayDetail(user: UserEvent, day: number, title: string) {
  await goToTab(user, '歷史')
  const grid = await screen.findByRole('grid')
  await user.click(within(grid).getByRole('button', { name: new RegExp(`10月${day}日`) }))
  return screen.findByRole('region', { name: title })
}

describe('每天的體重', () => {
  it('在訓練頁輸入體重即儲存，重新整理後仍保留；清空即刪除', async () => {
    const { user, reload } = renderApp()
    await user.type(await bodyWeightField(), '72.5')

    const app = reload()
    expect(await bodyWeightField()).toHaveValue('72.5')

    await app.user.clear(await bodyWeightField())
    app.reload()
    expect(await bodyWeightField()).toHaveValue('')
  })

  it('不合法時顯示錯誤且不寫入，儲存的仍是上一個合法值', async () => {
    const { user, reload } = renderApp()
    const field = await bodyWeightField()
    await user.type(field, '72.555')

    expect(field).toBeInvalid()
    expect(field).toHaveAccessibleDescription('最多 2 位小數')

    reload()
    expect(await bodyWeightField()).toHaveValue('72.55')
  })

  it('體重為 0 時顯示「須大於 0」', async () => {
    const { user } = renderApp()
    const field = await bodyWeightField()
    await user.type(field, '0')
    expect(field).toHaveAccessibleDescription('須大於 0')
  })

  it('每一天各自記錄：補記昨天不影響今天', async () => {
    const { user } = renderApp('/day/2026-10-23')
    await user.type(await bodyWeightField(), '73')

    await user.click(screen.getByRole('button', { name: '後一天' }))
    await screen.findByRole('heading', { level: 1, name: '10/24（六）' })
    expect(await bodyWeightField()).toHaveValue('')

    await user.click(screen.getByRole('button', { name: '前一天' }))
    expect(await bodyWeightField()).toHaveValue('73')
  })

  it('以目前的重量單位輸入與顯示，資料一律以 kg 儲存', async () => {
    const { user } = renderApp()
    await chooseWeightUnit(user, 'lb')
    await goToTab(user, '今天')
    await user.type(await bodyWeightField('lb'), '160')

    await chooseWeightUnit(user, 'kg')
    await goToTab(user, '今天')
    // 160 lb = 72.5747792 kg，顯示到最多 2 位小數
    expect(await bodyWeightField('kg')).toHaveValue('72.57')
  })

  it('剛輸入、還沒寫進資料庫就重新整理，重新開啟時補寫', async () => {
    const { reload } = renderApp()
    await bodyWeightField()
    // 輸入時會先記進 localStorage 的待寫清單再寫入資料庫（與組的數值相同），
    // 直接放一筆待寫的編輯，模擬寫入完成前頁面就被重新整理
    localStorage.setItem(
      'my-rep-book:pending-field-edits',
      JSON.stringify([{ kind: 'bodyWeight', date: '2026-10-24', weightKg: 71.2 }]),
    )

    reload()
    expect(await bodyWeightField()).toHaveValue('71.2')
  })
})

describe('身高與 BMI', () => {
  it('在設定填寫身高後，訓練頁在體重旁顯示 BMI；身高重新整理後仍保留', async () => {
    const { user, reload } = renderApp()
    await user.type(await bodyWeightField(), '70')
    const region = screen.getByRole('region', { name: '體重' })
    expect(within(region).queryByText(/BMI/)).not.toBeInTheDocument()

    await enterHeight(user, '175')
    expect(screen.getByText('用於計算 BMI')).toBeInTheDocument()
    await goToTab(user, '今天')
    // 70 ÷ 1.75² = 22.857…
    expect(await screen.findByText('BMI 22.9')).toBeInTheDocument()

    const app = reload()
    await goToTab(app.user, '設定')
    expect(await screen.findByRole('textbox', { name: '身高' })).toHaveValue('175')
  })

  it('身高不合法時顯示錯誤且不寫入', async () => {
    const { user, reload } = renderApp('/settings')
    await enterHeight(user, '1750')
    const field = screen.getByRole('textbox', { name: '身高' })

    expect(field).toBeInvalid()
    expect(field).toHaveAccessibleDescription('請輸入 50–300 的數字')

    reload()
    expect(await screen.findByRole('textbox', { name: '身高' })).toHaveValue('175')
  })

  it('清空身高後不再顯示 BMI', async () => {
    const { user } = await renderAppWithBackup(
      backupFixture({
        bodyWeights: [fixtureBodyWeight('2026-10-24', 70)],
        settings: { weightUnit: 'kg', theme: 'system', heightCm: 175 },
      }),
    )
    expect(await screen.findByText('BMI 22.9')).toBeInTheDocument()

    await goToTab(user, '設定')
    await user.clear(await screen.findByRole('textbox', { name: '身高' }))
    await goToTab(user, '今天')
    await bodyWeightField()
    await waitFor(() => expect(screen.queryByText(/BMI/)).not.toBeInTheDocument())
  })
})

describe('歷史的日明細', () => {
  const backup = backupFixture({
    workouts: [
      fixtureWorkout('2026-10-20', [
        {
          exerciseId: 'barbell-bench-press',
          sets: [{ type: 'weight_reps', weightKg: 60, reps: 8 }],
        },
      ]),
    ],
    bodyWeights: [fixtureBodyWeight('2026-10-20', 72.5), fixtureBodyWeight('2026-10-21', 72)],
    settings: { weightUnit: 'lb', theme: 'system', heightCm: 175 },
  })

  it('顯示當天的體重（目前的重量單位）與 BMI', async () => {
    const { user } = await renderAppWithBackup(backup, '/history')

    const detail = await openDayDetail(user, 20, '10/20（二）')
    // 72.5 kg = 159.8 lb；72.5 ÷ 1.75² = 23.67…
    expect(within(detail).getByText('體重 159.8 lb')).toBeInTheDocument()
    expect(within(detail).getByText('BMI 23.7')).toBeInTheDocument()
    expect(within(detail).getByRole('article', { name: '槓鈴臥推' })).toBeInTheDocument()
  })

  it('沒有訓練、只記了體重的日子，顯示體重並可前往編輯', async () => {
    const { user } = await renderAppWithBackup(backup, '/history')

    const detail = await openDayDetail(user, 21, '10/21（三）')
    expect(within(detail).getByText('體重 158.7 lb')).toBeInTheDocument()
    expect(within(detail).getByText('這天沒有訓練')).toBeInTheDocument()

    await user.click(within(detail).getByRole('link', { name: '編輯' }))
    await screen.findByRole('heading', { level: 1, name: '10/21（三）' })
    expect(await bodyWeightField('lb')).toHaveValue('158.7')
  })

  it('沒有記體重的日子不顯示體重', async () => {
    const { user } = await renderAppWithBackup(backup, '/history')

    const detail = await openDayDetail(user, 22, '10/22（四）')
    expect(within(detail).getByText('這天沒有訓練')).toBeInTheDocument()
    expect(within(detail).queryByText(/體重/)).not.toBeInTheDocument()
    expect(within(detail).queryByRole('link', { name: '編輯' })).not.toBeInTheDocument()
  })
})

describe('從資料庫 v1（還沒有體重與身高）升級', () => {
  it('保留原本的設定與訓練，身高為尚未填寫，可以開始記錄體重', async () => {
    // 模擬已經在用的 App 更新到新版：資料庫裡是舊版的資料
    const workout = fixtureWorkout('2026-10-24', [
      { exerciseId: 'barbell-bench-press', sets: [{ type: 'weight_reps', weightKg: 60, reps: 8 }] },
    ])
    await seedV1Database({
      workouts: [{ ...workout, exerciseIds: ['barbell-bench-press'] }],
      settings: { weightUnit: 'lb', theme: 'system', lastExportedAt: null },
    })

    const { user, reload } = renderApp()
    expect(await screen.findByRole('region', { name: '槓鈴臥推' })).toBeInTheDocument()
    await user.type(await bodyWeightField('lb'), '160')

    const app = reload()
    expect(await bodyWeightField('lb')).toHaveValue('160.0')
    await goToTab(app.user, '設定')
    expect(await screen.findByRole('textbox', { name: '身高' })).toHaveValue('')
    const unit = screen.getByRole('radiogroup', { name: '重量單位' })
    expect(within(unit).getByRole('radio', { name: 'lb' })).toBeChecked()
  })
})

describe('體重紀錄', () => {
  /** 體重紀錄清單的每一列：[日期, 體重, BMI（沒有時為 null）, 7 日平均與比上週增減] */
  async function bodyWeightRows() {
    const list = await screen.findByRole('list', { name: '體重紀錄' })
    return within(list)
      .getAllByRole('listitem')
      .map((item) => [
        within(item).getByRole('link').textContent,
        within(item).getByText(/^[\d.]+ (kg|lb)$/).textContent,
        within(item).queryByText(/^BMI /)?.textContent ?? null,
        within(item).getByText(/^7 日平均 /).textContent,
      ])
  }

  /** 從歷史頁點「體重紀錄」 */
  async function openFromHistory(user: UserEvent) {
    await user.click(await screen.findByRole('link', { name: '體重紀錄' }))
    await screen.findByRole('heading', { level: 1, name: '體重紀錄' })
  }

  const backup = backupFixture({
    bodyWeights: [
      fixtureBodyWeight('2026-09-30', 74),
      fixtureBodyWeight('2026-10-20', 72.5),
      fixtureBodyWeight('2026-10-21', 72),
    ],
    settings: { weightUnit: 'lb', theme: 'system', heightCm: 175 },
  })

  it('從歷史頁進入，由新到舊列出所有體重（目前的重量單位）與 BMI', async () => {
    const { user } = await renderAppWithBackup(backup, '/history')
    await openFromHistory(user)

    expect(await bodyWeightRows()).toEqual([
      // 10/15–10/21 的平均 (72.5 + 72) ÷ 2 = 72.25 kg = 159.3 lb
      ['2026/10/21（三）', '158.7 lb', 'BMI 23.5', '7 日平均 159.3 lb'],
      ['2026/10/20（二）', '159.8 lb', 'BMI 23.7', '7 日平均 159.8 lb'],
      ['2026/9/30（三）', '163.1 lb', 'BMI 24.2', '7 日平均 163.1 lb'],
    ])
    // 仍在歷史分頁
    const tabs = screen.getByRole('navigation', { name: '主要分頁' })
    expect(within(tabs).getByRole('link', { name: '歷史' })).toHaveAttribute('aria-current', 'page')
  })

  it('沒填身高時只列出體重', async () => {
    await renderAppWithBackup(
      backupFixture({ bodyWeights: [fixtureBodyWeight('2026-10-20', 72.5)] }),
      '/history/body-weight',
    )
    expect(await bodyWeightRows()).toEqual([
      ['2026/10/20（二）', '72.5 kg', null, '7 日平均 72.5 kg'],
    ])
  })

  it('在訓練頁輸入的體重出現在清單中', async () => {
    const { user } = renderApp('/day/2026-10-23')
    await user.type(await bodyWeightField(), '73')
    await user.click(screen.getByRole('button', { name: '後一天' }))
    await user.type(await bodyWeightField(), '72.8')

    await goToTab(user, '歷史')
    await openFromHistory(user)
    expect(await bodyWeightRows()).toEqual([
      ['2026/10/24（六）', '72.8 kg', null, '7 日平均 72.9 kg'],
      ['2026/10/23（五）', '73 kg', null, '7 日平均 73 kg'],
    ])
  })

  it('每筆顯示 7 日平均與比上週增減，上一週沒有體重時不比較', async () => {
    await renderAppWithBackup(
      backupFixture({
        bodyWeights: [
          fixtureBodyWeight('2026-10-12', 74),
          fixtureBodyWeight('2026-10-17', 73),
          fixtureBodyWeight('2026-10-20', 72),
          fixtureBodyWeight('2026-10-24', 71),
        ],
      }),
      '/history/body-weight',
    )

    expect((await bodyWeightRows()).map((row) => [row[0], row[3]])).toEqual([
      // 10/18–10/24 平均 71.5；上週 10/11–10/17 平均 73.5
      ['2026/10/24（六）', '7 日平均 71.5 kg · 比上週 -2 kg'],
      // 10/14–10/20 平均 72.5；上週 10/7–10/13 只有 74
      ['2026/10/20（二）', '7 日平均 72.5 kg · 比上週 -1.5 kg'],
      // 上週 10/4–10/10 沒有體重
      ['2026/10/17（六）', '7 日平均 73.5 kg'],
      ['2026/10/12（一）', '7 日平均 74 kg'],
    ])
  })

  it('還沒有體重時顯示提示', async () => {
    renderApp('/history/body-weight')
    expect(
      await screen.findByText('還沒有體重紀錄，可以在訓練頁輸入當天的體重'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: '體重紀錄' })).not.toBeInTheDocument()
  })

  it('點日期前往該日的訓練頁修改體重；點「返回歷史」回到歷史頁', async () => {
    const { user } = await renderAppWithBackup(backup, '/history/body-weight')
    const list = await screen.findByRole('list', { name: '體重紀錄' })
    await user.click(within(list).getByRole('link', { name: '2026/10/20（二）' }))

    await screen.findByRole('heading', { level: 1, name: '10/20（二）' })
    expect(await bodyWeightField('lb')).toHaveValue('159.8')

    await user.click(screen.getByRole('button', { name: '前一天' }))
    await screen.findByRole('heading', { level: 1, name: '10/19（一）' })
    await goToTab(user, '歷史')
    await openFromHistory(user)
    await user.click(screen.getByRole('link', { name: '返回歷史' }))
    expect(await screen.findByRole('heading', { level: 1, name: '歷史' })).toBeInTheDocument()
  })
})
