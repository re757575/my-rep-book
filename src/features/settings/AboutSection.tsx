import { useId } from 'react'

/** 設定頁最下方的「關於」：目前的 App 版本，回報問題或確認已更新到新版時用 */
export function AboutSection() {
  const id = useId()
  const versionId = useId()
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <h2 id={id} className="font-semibold">
        關於
      </h2>
      <dl className="flex gap-2 text-sm">
        <dt id={versionId} className="text-muted-foreground">
          版本
        </dt>
        <dd aria-labelledby={versionId}>v{__APP_VERSION__}</dd>
      </dl>
    </section>
  )
}
