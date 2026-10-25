import { waitFor } from '@testing-library/react'
import { expect } from 'vitest'

/**
 * 接縫 A 的下載攔截：jsdom 沒有 `URL.createObjectURL`，也不會真的下載檔案。
 * `installDownloadCapture()` 在 setup 呼叫一次：補上 `createObjectURL`（記住 Blob），
 * 並攔下點擊 `<a download>` 的動作，記錄檔名與內容。
 */
const blobs = new Map<string, Blob>()
let downloads: { fileName: string; url: string }[] = []

export function installDownloadCapture() {
  URL.createObjectURL = (object: Blob | MediaSource) => {
    const url = `blob:test/${blobs.size + 1}`
    blobs.set(url, object as Blob)
    return url
  }
  // 測試結束前都要讀得到內容，不真的釋放
  URL.revokeObjectURL = () => {}

  document.addEventListener(
    'click',
    (event) => {
      const link = event.target instanceof Element ? event.target.closest('a[download]') : null
      if (!(link instanceof HTMLAnchorElement)) return
      // jsdom 不支援導覽，取消預設行為避免錯誤訊息
      event.preventDefault()
      downloads.push({ fileName: link.download, url: link.href })
    },
    true,
  )
}

export function resetDownloads() {
  downloads = []
  blobs.clear()
}

export interface DownloadedFile {
  fileName: string
  text: string
}

/** 等到至少下載了 `count` 個檔案，依下載順序回傳全部 */
export async function waitForDownloads(count: number): Promise<DownloadedFile[]> {
  await waitFor(() => expect(downloads.length).toBeGreaterThanOrEqual(count))
  return Promise.all(
    downloads.map(async ({ fileName, url }) => {
      const blob = blobs.get(url)
      if (!blob) throw new Error(`找不到下載的內容：${fileName}`)
      return { fileName, text: await blob.text() }
    }),
  )
}

/** 目前已下載的檔案數 */
export function downloadCount() {
  return downloads.length
}
