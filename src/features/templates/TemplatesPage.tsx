import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import { useLiveData } from '@/data'
import { formatTemplateSummary } from '@/domain'

/** 範本列表（US-42）：每個範本一列，點進去編輯 */
export function TemplatesPage() {
  const templates = useLiveData((repositories) => repositories.templates.listAll(), [])

  return (
    <div className="flex flex-col gap-4">
      <Link
        to="/settings"
        className="-ml-2 flex min-h-11 items-center gap-1 self-start px-2 text-sm text-muted-foreground"
      >
        <ChevronLeft aria-hidden="true" className="size-4" />
        設定
      </Link>
      <h1 className="text-xl font-semibold">訓練範本</h1>
      {templates?.length === 0 && (
        <div className="flex flex-col gap-1 py-6 text-center">
          <p className="font-medium">還沒有範本</p>
          <p className="text-sm text-muted-foreground">在訓練頁或歷史的日明細點「存成範本」建立</p>
        </div>
      )}
      {templates && templates.length > 0 && (
        <ul aria-label="範本" className="flex flex-col divide-y">
          {templates.map((template) => (
            <li key={template.id}>
              <Link
                to={`/templates/${template.id}`}
                className="flex min-h-11 items-center justify-between gap-2 py-3"
              >
                <span className="flex flex-col">
                  <span className="font-medium">{template.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {formatTemplateSummary(template)}
                  </span>
                </span>
                <ChevronRight aria-hidden="true" className="size-4 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
