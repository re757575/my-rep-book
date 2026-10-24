/** 尚未實作的 Repository 方法：由後續 ticket 補上 */
export function notImplemented(method: string) {
  return (): Promise<never> => Promise.reject(new Error(`${method} 尚未實作`))
}
