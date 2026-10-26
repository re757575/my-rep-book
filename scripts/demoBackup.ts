// `npm run screenshot` 預設匯入的示範資料：以固定的今天（2026-10-24，週六）往前 5 週，
// 讓每個畫面都有內容可看。日期固定，同一個畫面每次截出來都一樣。
import {
  backupFixture,
  fixtureBodyWeight,
  fixtureCustomExercise,
  fixtureWorkout,
  type FixtureExercise,
  type FixtureSet,
} from '../src/test/backupFixture.ts'

const ws = (weightKg: number, reps: number, isWarmup = false): FixtureSet => ({
  type: 'weight_reps',
  weightKg,
  reps,
  isWarmup,
})

/** 推日：臥推（每週 +2.5 kg）、肩推、三頭下壓 */
function push(week: number, note = ''): FixtureExercise[] {
  const bench = 55 + week * 2.5
  return [
    {
      exerciseId: 'barbell-bench-press',
      note,
      sets: [ws(40, 10, true), ws(bench, 8), ws(bench, 8), ws(bench, 6)],
    },
    { exerciseId: 'overhead-press', sets: [ws(35 + week, 8), ws(35 + week, 7)] },
    { exerciseId: 'triceps-pushdown', sets: [ws(20, 12), ws(20, 12)] },
  ]
}

/** 拉日：硬舉、滑輪下拉、啞鈴彎舉 */
function pull(week: number): FixtureExercise[] {
  return [
    { exerciseId: 'deadlift', sets: [ws(60, 5, true), ws(120 + week * 5, 5)] },
    { exerciseId: 'lat-pulldown', sets: [ws(45, 10), ws(45, 10), ws(45, 8)] },
    { exerciseId: 'dumbbell-curl', sets: [ws(10, 12), ws(10, 10)] },
  ]
}

/** 腿日：深蹲、平板支撐，加上一次戶外跑步 */
function legs(week: number): FixtureExercise[] {
  return [
    {
      exerciseId: 'barbell-squat',
      sets: [ws(60, 8, true), ws(90 + week * 5, 5), ws(90 + week * 5, 5)],
    },
    { exerciseId: 'plank', sets: [{ type: 'duration', durationSec: 60 }] },
    {
      exerciseId: 'custom-outdoor-run',
      sets: [{ type: 'distance_duration', distanceKm: 5, durationSec: 1650 - week * 15 }],
    },
  ]
}

/** 每週的週一、週三、週五（最後一週的週五之後是今天週六，另外加一次推日） */
const WEEK_MONDAYS = ['2026-09-21', '2026-09-28', '2026-10-05', '2026-10-12', '2026-10-19']

function addDays(date: string, days: number) {
  const [year, month, day] = date.split('-').map(Number)
  const result = new Date(year, month - 1, day + days, 12)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${result.getFullYear()}-${pad(result.getMonth() + 1)}-${pad(result.getDate())}`
}

const workouts = WEEK_MONDAYS.flatMap((monday, week) => [
  fixtureWorkout(monday, push(week, week === 3 ? '左肩有點緊，最後一組少做' : '')),
  fixtureWorkout(addDays(monday, 2), pull(week)),
  fixtureWorkout(addDays(monday, 4), legs(week)),
])
workouts.push(fixtureWorkout('2026-10-24', push(5, '今天狀況不錯')))

/** 體重：最近 3 週每 1～2 天一筆，緩慢下降 */
const bodyWeights = Array.from({ length: 21 }, (_, index) => index)
  .filter((index) => index % 3 !== 2)
  .map((index) =>
    fixtureBodyWeight(
      addDays('2026-10-04', index),
      Math.round((74 - index * 0.1 + (index % 2) * 0.3) * 10) / 10,
    ),
  )

export const DEMO_BACKUP = backupFixture({
  workouts,
  customExercises: [
    fixtureCustomExercise({
      id: 'custom-outdoor-run',
      nameZh: '戶外跑步',
      trackingType: 'distance_duration',
      primaryMuscles: ['full_body'],
      equipment: 'other',
    }),
  ],
  bodyWeights,
  settings: { weightUnit: 'kg', theme: 'system', heightCm: 175, birthDate: '1990-05-20' },
})
