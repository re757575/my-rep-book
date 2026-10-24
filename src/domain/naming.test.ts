import { describe, expect, it } from 'vitest'
import { hasDuplicateName, normalizeExerciseName, type ExerciseBase } from './index'

describe('名稱正規化', () => {
  it.each([
    { name: '槓鈴臥推', expected: '槓鈴臥推' },
    { name: '  槓鈴臥推  ', expected: '槓鈴臥推' },
    { name: 'Smith Machine Squat', expected: 'smith machine squat' },
    { name: '\t史密斯 SQUAT\n', expected: '史密斯 squat' },
    // 只去掉前後空白，中間的空白保留
    { name: '史密斯  深蹲', expected: '史密斯  深蹲' },
    { name: '   ', expected: '' },
  ])('「$name」→「$expected」', ({ name, expected }) => {
    expect(normalizeExerciseName(name)).toBe(expected)
  })
})

const benchPress: ExerciseBase = {
  id: 'barbell-bench-press',
  nameZh: '槓鈴臥推',
  nameEn: 'Barbell Bench Press',
  primaryMuscles: ['chest'],
  secondaryMuscles: ['triceps', 'shoulders'],
  equipment: 'barbell',
  trackingType: 'weight_reps',
}

const smithSquat: ExerciseBase = {
  id: 'custom-1',
  nameZh: 'Smith 深蹲',
  nameEn: null,
  primaryMuscles: ['quads'],
  secondaryMuscles: [],
  equipment: 'machine',
  trackingType: 'weight_reps',
}

const existing = [benchPress, smithSquat]

describe('重名檢查', () => {
  it.each([
    { name: '槓鈴臥推', expected: true },
    { name: '  槓鈴臥推 ', expected: true },
    { name: 'smith 深蹲', expected: true },
    { name: ' SMITH 深蹲', expected: true },
    { name: '槓鈴臥推（自訂）', expected: false },
    { name: '槓鈴', expected: false },
    { name: 'Smith  深蹲', expected: false },
    // 只比對中文名稱，不比對英文名稱
    { name: 'Barbell Bench Press', expected: false },
  ])('「$name」→ $expected', ({ name, expected }) => {
    expect(hasDuplicateName(name, existing)).toBe(expected)
  })

  it('編輯時排除動作自己：名稱沒變不算重名', () => {
    expect(hasDuplicateName('Smith 深蹲', existing, { excludeId: 'custom-1' })).toBe(false)
    expect(hasDuplicateName('槓鈴臥推', existing, { excludeId: 'custom-1' })).toBe(true)
  })

  it('沒有任何動作時不會重名', () => {
    expect(hasDuplicateName('槓鈴臥推', [])).toBe(false)
  })
})
