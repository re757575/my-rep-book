import { ArrowDown, ArrowUp, ChevronLeft, Minus, Plus, Trash2 } from 'lucide-react'
import { lazy, startTransition, useId, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useLiveData, useRepositories } from '@/data'
import {
  MAX_TEMPLATE_SETS,
  MIN_TEMPLATE_SETS,
  addTemplateExercise,
  formatTemplateSummary,
  moveTemplateExercise,
  parseTemplateName,
  removeTemplateExercise,
  renameTemplate,
  setTemplateSetCount,
  type EditContext,
  type WorkoutTemplate,
} from '@/domain'
import { useLibraryExercises } from '@/features/exercises/useLibraryExercises'
import { showUndoToast } from './undoToast'

// 加入動作選單與訓練頁共用同一個 chunk，第一次點「加入動作」才載入
const AddExerciseDialog = lazy(async () => ({
  default: (await import('@/features/workout/AddExerciseDialog')).AddExerciseDialog,
}))

function editContext(): EditContext {
  return { now: new Date().toISOString(), createId: () => crypto.randomUUID() }
}

/** 範本詳情（US-42）：改名、調整各動作的組數與順序、加入或移除動作、刪除範本 */
export function TemplateDetailPage() {
  const id = useParams().id ?? ''
  const template = useLiveData(
    async (repositories) => (await repositories.templates.getById(id)) ?? null,
    [id],
  )

  return (
    <div className="flex flex-col gap-4">
      <Link
        to="/templates"
        className="-ml-2 flex min-h-11 items-center gap-1 self-start px-2 text-sm text-muted-foreground"
      >
        <ChevronLeft aria-hidden="true" className="size-4" />
        範本
      </Link>
      <h1 className="text-xl font-semibold">編輯範本</h1>
      {template === null && <p className="py-6 text-center">找不到這個範本</p>}
      {template && <TemplateEditor key={template.id} template={template} />}
    </div>
  )
}

function TemplateEditor({ template }: { template: WorkoutTemplate }) {
  const { templates } = useRepositories()
  const navigate = useNavigate()
  const library = useLibraryExercises()
  const nameId = useId()
  const [nameText, setNameText] = useState(template.name)
  const [nameError, setNameError] = useState<string>()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerLoaded, setPickerLoaded] = useState(false)
  const namesById = new Map(library?.map((exercise) => [exercise.id, exercise.nameZh]))

  /** 在 transaction 中以最新的範本套用變更，連點「＋」才不會互相覆蓋 */
  function edit(change: (current: WorkoutTemplate) => WorkoutTemplate) {
    return templates.update(template.id, change)
  }

  return (
    <>
      <div className="flex flex-col gap-1">
        <label htmlFor={nameId} className="text-sm font-medium">
          範本名稱
        </label>
        <Input
          id={nameId}
          value={nameText}
          autoComplete="off"
          aria-invalid={nameError !== undefined}
          aria-describedby={nameError ? `${nameId}-error` : undefined}
          onChange={(event) => {
            setNameText(event.target.value)
            const parsed = parseTemplateName(event.target.value)
            setNameError(parsed.ok ? undefined : parsed.error)
            if (parsed.ok) {
              void edit((current) => renameTemplate(current, parsed.value, editContext().now))
            }
          }}
          className="h-11"
        />
        {nameError && (
          <p id={`${nameId}-error`} className="text-xs text-destructive">
            {nameError}
          </p>
        )}
        <p className="text-sm text-muted-foreground">{formatTemplateSummary(template)}</p>
      </div>

      {library && (
        <ul aria-label="範本的動作" className="flex flex-col divide-y">
          {template.exercises.map((item, index, all) => (
            <li key={item.id} className="flex flex-col gap-1 py-3">
              <span className="font-medium">
                {namesById.get(item.exerciseId) ?? item.exerciseId}
              </span>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center">
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-11"
                    aria-label="減少組數"
                    disabled={item.setCount <= MIN_TEMPLATE_SETS}
                    onClick={() =>
                      edit((current) =>
                        setTemplateSetCount(
                          current,
                          item.id,
                          (current.exercises.find((e) => e.id === item.id)?.setCount ?? 0) - 1,
                          editContext().now,
                        ),
                      )
                    }
                  >
                    <Minus aria-hidden="true" />
                  </Button>
                  <span className="min-w-14 text-center">{item.setCount} 組</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-11"
                    aria-label="增加組數"
                    disabled={item.setCount >= MAX_TEMPLATE_SETS}
                    onClick={() =>
                      edit((current) =>
                        setTemplateSetCount(
                          current,
                          item.id,
                          (current.exercises.find((e) => e.id === item.id)?.setCount ?? 0) + 1,
                          editContext().now,
                        ),
                      )
                    }
                  >
                    <Plus aria-hidden="true" />
                  </Button>
                </div>
                <div className="flex items-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-11"
                    aria-label="上移"
                    disabled={index === 0}
                    onClick={() =>
                      edit((current) =>
                        moveTemplateExercise(current, item.id, 'up', editContext().now),
                      )
                    }
                  >
                    <ArrowUp aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-11"
                    aria-label="下移"
                    disabled={index === all.length - 1}
                    onClick={() =>
                      edit((current) =>
                        moveTemplateExercise(current, item.id, 'down', editContext().now),
                      )
                    }
                  >
                    <ArrowDown aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-11 text-muted-foreground"
                    aria-label="移除動作"
                    disabled={all.length <= 1}
                    onClick={() =>
                      edit((current) => removeTemplateExercise(current, item.id, editContext().now))
                    }
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Button
        variant="outline"
        className="h-11"
        onClick={() =>
          // 用 transition 等選單載入完成再一次打開，不經過 Suspense 的 fallback
          startTransition(() => {
            setPickerLoaded(true)
            setPickerOpen(true)
          })
        }
      >
        <Plus aria-hidden="true" />
        加入動作
      </Button>
      {pickerLoaded && (
        <AddExerciseDialog
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          onSelect={(exercise) =>
            void edit((current) => addTemplateExercise(current, exercise.id, editContext()))
          }
        />
      )}

      <Button
        variant="outline"
        className="h-11 text-destructive"
        onClick={async () => {
          await templates.delete(template.id)
          await navigate('/templates', { replace: true })
          showUndoToast(`已刪除範本『${template.name}』`, () => templates.save(template))
        }}
      >
        刪除範本
      </Button>
    </>
  )
}
