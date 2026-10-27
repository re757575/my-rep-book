import { useEffect, useSyncExternalStore } from 'react'
import { Button } from '@/components/ui/button'
import { formatRemaining, restTimerPhase, type RestTimer } from '@/domain'
import { adjustRestTimer, alertRestFinished, stopRestTimer, useRestTimer } from './restTimerStore'

const ADJUST_SEC = 15
const TICK_MS = 250

/**
 * 現在的時間，每 `TICK_MS` 更新一次。倒數用實際時間重算而不是累加：
 * 背景分頁的計時器會被瀏覽器延遲，回到前景時要以實際時間為準。
 */
function useNow(): number {
  return useSyncExternalStore(
    (onChange) => {
      const interval = window.setInterval(onChange, TICK_MS)
      document.addEventListener('visibilitychange', onChange)
      return () => {
        window.clearInterval(interval)
        document.removeEventListener('visibilitychange', onChange)
      }
    },
    () => Math.floor(Date.now() / TICK_MS) * TICK_MS,
  )
}

/**
 * 組間休息的倒數列，固定在底部分頁的上方，所以切到任何分頁都看得到剩餘時間。
 * 時間到時發出震動與通知，並顯示「休息結束」一小段時間。沒有計時器時什麼都不顯示。
 */
export function RestTimerBar() {
  const timer = useRestTimer()
  return timer && <ActiveRestTimerBar timer={timer} />
}

function ActiveRestTimerBar({ timer }: { timer: RestTimer }) {
  const now = useNow()
  const phase = restTimerPhase(timer, now)

  // 頁面在前景時剛好在時間到發出提醒；回到前景時由 `useNow` 的 visibilitychange 重新檢查
  useEffect(() => {
    const timeout = window.setTimeout(alertRestFinished, Math.max(0, timer.endsAt - Date.now()))
    return () => window.clearTimeout(timeout)
  }, [timer.endsAt])
  useEffect(() => {
    if (phase.kind === 'finished') alertRestFinished()
    // 「剛結束」的時間過了，清掉儲存的計時器
    if (phase.kind === 'idle') stopRestTimer()
  }, [phase.kind])

  if (phase.kind === 'idle') return null

  return (
    <>
      {/* 撐出倒數列的高度，內容捲到底時才不會被蓋住 */}
      <div aria-hidden="true" className="h-14" />
      <section
        aria-label="組間休息"
        className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] border-t bg-background"
      >
        <div className="mx-auto flex max-w-md items-center gap-1 px-4">
          {phase.kind === 'running' ? (
            <>
              <p className="flex-1 text-sm text-muted-foreground">
                休息{' '}
                <span role="timer" className="text-lg font-semibold text-foreground tabular-nums">
                  {formatRemaining(phase.remainingSec)}
                </span>
              </p>
              <Button variant="ghost" className="h-11" onClick={() => adjustRestTimer(-ADJUST_SEC)}>
                −{ADJUST_SEC} 秒
              </Button>
              <Button variant="ghost" className="h-11" onClick={() => adjustRestTimer(ADJUST_SEC)}>
                ＋{ADJUST_SEC} 秒
              </Button>
              <Button variant="outline" className="h-11" onClick={stopRestTimer}>
                略過
              </Button>
            </>
          ) : (
            <>
              <p role="status" className="flex-1 font-semibold">
                休息結束
              </p>
              <Button variant="outline" className="h-11" onClick={stopRestTimer}>
                關閉
              </Button>
            </>
          )}
        </div>
      </section>
    </>
  )
}
