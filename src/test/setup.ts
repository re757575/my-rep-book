import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'
import { cleanup } from '@testing-library/react'
import { IDBFactory } from 'fake-indexeddb'
import { afterEach, beforeEach, vi } from 'vitest'
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

beforeEach(() => {
  // 每個測試都從全新的 IndexedDB 開始
  globalThis.indexedDB = new IDBFactory()

  // 只假造 Date，計時器維持真實，避免 user-event 與 findBy* 卡住
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(FIXED_TODAY)
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})
