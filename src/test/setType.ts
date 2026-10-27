import { waitFor, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { expect } from 'vitest'

/** 某一組左邊的類型按鈕（名稱是「第 N 組類型：正式」這種格式，目前的類型跟在冒號後面） */
export function setTypeButton(card: HTMLElement, setNumber: number) {
  return within(card).getByRole('button', { name: new RegExp(`^第 ${setNumber} 組類型：`) })
}

/** 等某一組的類型變成 `label`（正式、熱身、遞減、力竭）；類型存進資料庫後才會更新畫面 */
export async function expectSetType(card: HTMLElement, setNumber: number, label: string) {
  await waitFor(() =>
    expect(setTypeButton(card, setNumber)).toHaveAccessibleName(`第 ${setNumber} 組類型：${label}`),
  )
}

/**
 * 把某一組換成指定的類型：類型按鈕按一下換成下一個（正式 → 熱身 → 遞減 → 力竭 → 正式），
 * 所以按到目標為止，每按一下就等畫面更新，才不會在寫入完成前連按而跳過。
 */
export async function setSetType(
  user: UserEvent,
  card: HTMLElement,
  setNumber: number,
  label: string,
) {
  const target = `第 ${setNumber} 組類型：${label}`
  for (let presses = 0; presses < 4; presses++) {
    const button = setTypeButton(card, setNumber)
    if (button.getAttribute('aria-label') === target) return
    const before = button.getAttribute('aria-label')
    await user.click(button)
    await waitFor(() => expect(setTypeButton(card, setNumber)).not.toHaveAccessibleName(before!))
  }
  await expectSetType(card, setNumber, label)
}
