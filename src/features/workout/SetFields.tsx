import type { SetValues } from '@/domain'
import { SetValueInput } from './SetValueInput'

type ValuesOf<T extends SetValues['type']> = Extract<SetValues, { type: T }>

/** 只改傳入的欄位；其他欄位以儲存中的最新值為準，才不會蓋掉剛寫入的值 */
type ChangeValues = (change: (current: SetValues) => SetValues) => void

interface FieldsProps<T extends SetValues['type']> {
  values: ValuesOf<T>
  setNumber: number
  onChange: (patch: Partial<Omit<ValuesOf<T>, 'type'>>) => void
}

/** 依記錄類型顯示該組需要的欄位；重量一律以 kg 顯示 */
export function SetFields({
  values,
  setNumber,
  onChange,
}: {
  values: SetValues
  setNumber: number
  onChange: ChangeValues
}) {
  return (
    <div className="flex items-start gap-2">
      <FieldsByType values={values} setNumber={setNumber} onChange={onChange} />
    </div>
  )
}

function FieldsByType({
  values,
  setNumber,
  onChange,
}: {
  values: SetValues
  setNumber: number
  onChange: ChangeValues
}) {
  function patch<T extends SetValues['type']>(type: T) {
    return (fields: Partial<Omit<ValuesOf<T>, 'type'>>) =>
      onChange((current) => (current.type === type ? { ...current, ...fields } : current))
  }

  switch (values.type) {
    case 'weight_reps':
      return (
        <WeightRepsFields values={values} setNumber={setNumber} onChange={patch(values.type)} />
      )
    case 'reps':
      return <RepsFields values={values} setNumber={setNumber} onChange={patch(values.type)} />
    case 'duration':
      return <DurationFields values={values} setNumber={setNumber} onChange={patch(values.type)} />
    case 'distance_duration':
      return (
        <DistanceDurationFields
          values={values}
          setNumber={setNumber}
          onChange={patch(values.type)}
        />
      )
  }
}

function Unit({ children }: { children: string }) {
  return <span className="mt-3 text-sm text-muted-foreground">{children}</span>
}

/** 重量×次數 */
function WeightRepsFields({ values, setNumber, onChange }: FieldsProps<'weight_reps'>) {
  return (
    <>
      <SetValueInput
        field="weightKg"
        label={`第 ${setNumber} 組重量（kg）`}
        value={values.weightKg}
        onChange={(weightKg) => onChange({ weightKg })}
      />
      <Unit>kg ×</Unit>
      <SetValueInput
        field="reps"
        label={`第 ${setNumber} 組次數`}
        value={values.reps}
        onChange={(reps) => onChange({ reps })}
      />
    </>
  )
}

/** 次數，加上選填的額外負重 */
function RepsFields({ values, setNumber, onChange }: FieldsProps<'reps'>) {
  return (
    <>
      <SetValueInput
        field="reps"
        label={`第 ${setNumber} 組次數`}
        value={values.reps}
        onChange={(reps) => onChange({ reps })}
      />
      <Unit>下 ＋</Unit>
      <SetValueInput
        field="addedWeightKg"
        label={`第 ${setNumber} 組額外負重（kg）`}
        placeholder="選填"
        value={values.addedWeightKg}
        onChange={(addedWeightKg) => onChange({ addedWeightKg })}
      />
      <Unit>kg</Unit>
    </>
  )
}

/** 時間（mm:ss） */
function DurationFields({ values, setNumber, onChange }: FieldsProps<'duration'>) {
  return (
    <SetValueInput
      field="durationSec"
      label={`第 ${setNumber} 組時間（mm:ss）`}
      placeholder="mm:ss"
      value={values.durationSec}
      onChange={(durationSec) => onChange({ durationSec })}
    />
  )
}

/** 距離（km）與時間（mm:ss） */
function DistanceDurationFields({ values, setNumber, onChange }: FieldsProps<'distance_duration'>) {
  return (
    <>
      <SetValueInput
        field="distanceKm"
        label={`第 ${setNumber} 組距離（km）`}
        value={values.distanceKm}
        onChange={(distanceKm) => onChange({ distanceKm })}
      />
      <Unit>km</Unit>
      <SetValueInput
        field="durationSec"
        label={`第 ${setNumber} 組時間（mm:ss）`}
        placeholder="mm:ss"
        value={values.durationSec}
        onChange={(durationSec) => onChange({ durationSec })}
      />
    </>
  )
}
