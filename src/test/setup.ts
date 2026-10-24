import '@testing-library/jest-dom/vitest'
// 必須在任何會載入 Dexie 的模組之前：Dexie 在建立 db 時就抓住當下的 indexedDB
import 'fake-indexeddb/auto'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'
import { db } from '@/data/dexie/db'
import { FIXED_TODAY } from './fixedToday'

// jsdom 沒有 matchMedia（sonner 與主題偵測會用到），補一個「淺色、不符合任何 media query」的版本
window.matchMedia ??= (query: string) =>
  ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }) satisfies MediaQueryList

// jsdom 沒有 ResizeObserver（Radix 的 Checkbox、RadioGroup 會用到），補一個什麼都不做的版本
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(async () => {
  // 每個測試都從空的資料庫開始。App 共用模組層級的 Dexie 單例，它在建立時就固定了 indexedDB，
  // 所以只替換 globalThis.indexedDB 沒有用；改為刪除整個資料庫，並允許下一次查詢時自動重新開啟。
  await db.delete({ disableAutoOpen: false })

  // 只假造 Date，計時器維持真實，避免 user-event 與 findBy* 卡住
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(FIXED_TODAY)
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})
