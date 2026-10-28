import type { SetField, SetValues } from '@/domain'
import { useWeightUnit } from '@/features/settings/settingsContext'
import { SetValueInput } from './SetValueInput'

type ValuesOf<T extends SetValues['type']> = Extract<SetValues, { type: T }>

/** 某個欄位輸入了合法的值；只改這個欄位，其他欄位不受影響 */
export type ChangeSetField = (field: SetField, value: number | null) => void

interface FieldsProps<T extends SetValues['type']> {
  values: ValuesOf<T>
  setNumber: number
  onChange: ChangeSetField
}

/** 依記錄類型顯示該組需要的欄位；重量以目前的重量單位顯示，距離固定為 km */
export function SetFields({
  values,
  setNumber,
  onChange,
}: {
  values: SetValues
  setNumber: number
  onChange: ChangeSetField
}) {
  return (
    <div className="flex items-start gap-1">
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
  onChange: ChangeSetField
}) {
  switch (values.type) {
    case 'weight_reps':
      return <WeightRepsFields values={values} setNumber={setNumber} onChange={onChange} />
    case 'reps':
      return <RepsFields values={values} setNumber={setNumber} onChange={onChange} />
    case 'duration':
      return <DurationFields values={values} setNumber={setNumber} onChange={onChange} />
    case 'distance_duration':
      return <DistanceDurationFields values={values} setNumber={setNumber} onChange={onChange} />
  }
}

function Unit({ children }: { children: string }) {
  return <span className="mt-3 text-sm text-muted-foreground">{children}</span>
}

/** 重量×次數 */
function WeightRepsFields({ values, setNumber, onChange }: FieldsProps<'weight_reps'>) {
  const weightUnit = useWeightUnit()
  return (
    <>
      <SetValueInput
        field="weightKg"
        label={`第 ${setNumber} 組重量（${weightUnit}）`}
        value={values.weightKg}
        onChange={onChange}
      />
      <Unit>{`${weightUnit} ×`}</Unit>
      <SetValueInput
        field="reps"
        label={`第 ${setNumber} 組次數`}
        value={values.reps}
        onChange={onChange}
      />
    </>
  )
}

/** 次數，加上選填的額外負重 */
function RepsFields({ values, setNumber, onChange }: FieldsProps<'reps'>) {
  const weightUnit = useWeightUnit()
  return (
    <>
      <SetValueInput
        field="reps"
        label={`第 ${setNumber} 組次數`}
        value={values.reps}
        onChange={onChange}
      />
      <Unit>下 ＋</Unit>
      <SetValueInput
        field="addedWeightKg"
        label={`第 ${setNumber} 組額外負重（${weightUnit}）`}
        placeholder="選填"
        value={values.addedWeightKg}
        onChange={onChange}
      />
      <Unit>{weightUnit}</Unit>
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
      onChange={onChange}
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
        onChange={onChange}
      />
      <Unit>km</Unit>
      <SetValueInput
        field="durationSec"
        label={`第 ${setNumber} 組時間（mm:ss）`}
        placeholder="mm:ss"
        value={values.durationSec}
        onChange={onChange}
      />
    </>
  )
}
