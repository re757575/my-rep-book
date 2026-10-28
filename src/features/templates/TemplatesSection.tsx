import { ChevronRight } from 'lucide-react'
import { useId } from 'react'
import { Link } from 'react-router'
import { useLiveData } from '@/data'

/** 設定頁的「訓練範本」：範本數量與前往範本列表的連結（US-42） */
export function TemplatesSection() {
  const id = useId()
  const templates = useLiveData((repositories) => repositories.templates.listAll(), [])

  return (
    <section className="flex flex-col gap-2">
      <h2 id={id} className="font-semibold">
        訓練範本
      </h2>
      <Link
        to="/templates"
        aria-describedby={`${id}-count`}
        className="flex min-h-11 items-center justify-between gap-2 rounded-md border px-3"
      >
        管理範本
        <ChevronRight aria-hidden="true" className="size-4 text-muted-foreground" />
      </Link>
      <p id={`${id}-count`} className="text-sm text-muted-foreground">
        {templates === undefined ? '' : `共 ${templates.length} 個範本`}
      </p>
    </section>
  )
}
