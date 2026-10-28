import { useId, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useRepositories } from '@/data'
import { buildTemplateFromWorkout, parseTemplateName, type Workout } from '@/domain'

/** 輸入範本名稱後，把 `workout` 存成範本（US-40） */
export function SaveTemplateDialog({
  open,
  onOpenChange,
  workout,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  workout: Workout
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-lg">存成範本</DialogTitle>
          <DialogDescription>
            範本記下動作的順序與正式組數；重量和次數每次依上次紀錄帶入。
          </DialogDescription>
        </DialogHeader>
        {/* 每次開啟都重新掛載，讓名稱與錯誤回到初始狀態 */}
        {open && <SaveTemplateForm workout={workout} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function SaveTemplateForm({ workout, onDone }: { workout: Workout; onDone: () => void }) {
  const { templates } = useRepositories()
  const id = useId()
  const [text, setText] = useState('')
  const [showError, setShowError] = useState(false)
  const parsed = parseTemplateName(text)
  const error = showError && !parsed.ok ? parsed.error : undefined

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!parsed.ok) {
      setShowError(true)
      return
    }
    await templates.save(
      buildTemplateFromWorkout(workout, parsed.value, {
        now: new Date().toISOString(),
        createId: () => crypto.randomUUID(),
      }),
    )
    toast(`已存成範本『${parsed.value}』`)
    onDone()
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1">
        <label htmlFor={id} className="text-sm font-medium">
          範本名稱
        </label>
        <Input
          id={id}
          value={text}
          autoComplete="off"
          aria-invalid={error !== undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(event) => {
            setText(event.target.value)
            setShowError(true)
          }}
          className="h-11"
        />
        {error && (
          <p id={`${id}-error`} className="text-xs text-destructive">
            {error}
          </p>
        )}
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" className="h-11" onClick={onDone}>
          取消
        </Button>
        <Button type="submit" className="h-11">
          儲存
        </Button>
      </DialogFooter>
    </form>
  )
}
