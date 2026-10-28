import { Link } from 'react-router'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useLiveData, useRepositories } from '@/data'
import { formatTemplateSummary, type LocalDate } from '@/domain'
import { useLibraryExercises } from '@/features/exercises/useLibraryExercises'
import { addTemplateToDay } from './addTemplateToDay'

/**
 * 「從範本加入」的選單（US-41）：列出所有範本，點一個就把它的動作加到 `date` 的訓練最後面。
 * 載入範本與動作庫之前不顯示清單，避免先閃出「還沒有範本」。
 */
export function TemplatePickerDialog({
  open,
  onOpenChange,
  date,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: LocalDate
}) {
  const repositories = useRepositories()
  const templates = useLiveData((repos) => repos.templates.listAll(), [])
  const library = useLibraryExercises()
  const namesById = new Map(library?.map((exercise) => [exercise.id, exercise.nameZh]))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined} className="max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">從範本加入</DialogTitle>
        </DialogHeader>
        {templates && library && templates.length === 0 && (
          <div className="flex flex-col gap-1 py-4 text-center">
            <p className="font-medium">還沒有範本</p>
            <p className="text-sm text-muted-foreground">
              在訓練頁或歷史的日明細點「存成範本」建立
            </p>
          </div>
        )}
        {templates && library && templates.length > 0 && (
          <ul aria-label="範本" className="flex flex-col divide-y">
            {templates.map((template) => (
              <li key={template.id}>
                <button
                  type="button"
                  className="flex min-h-11 w-full flex-col gap-0.5 py-3 text-left"
                  onClick={() => {
                    onOpenChange(false)
                    void addTemplateToDay(repositories, template, date)
                  }}
                >
                  <span className="font-medium">{template.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {formatTemplateSummary(template)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {template.exercises
                      .map((item) => namesById.get(item.exerciseId) ?? item.exerciseId)
                      .join('、')}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <Link to="/templates" className="min-h-11 py-3 text-center text-sm underline">
          管理範本
        </Link>
      </DialogContent>
    </Dialog>
  )
}
