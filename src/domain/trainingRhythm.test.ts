import { describe, expect, it } from 'vitest'
import { buildTrainingRhythm } from './trainingRhythm'

// 2026-10-24 是週六；本週是 10/19（一）– 10/25（日），上週 10/12–10/18，再上週 10/5–10/11
const TODAY = '2026-10-24'

describe('buildTrainingRhythm：本週已練天數與連續週數', () => {
  it('沒有任何訓練時三項都是 0', () => {
    expect(buildTrainingRhythm([], TODAY)).toEqual({
      daysThisWeek: 0,
      currentStreakWeeks: 0,
      longestStreakWeeks: 0,
    })
  })

  it('本週已練天數：只算今天所在的週一到週日，不重複計算同一天', () => {
    const dates = ['2026-10-18', '2026-10-19', '2026-10-21', '2026-10-21', '2026-10-24']
    expect(buildTrainingRhythm(dates, TODAY).daysThisWeek).toBe(3)
  })

  it('連續週數：本週有練時算到本週，往前連續的週都算', () => {
    const dates = ['2026-10-05', '2026-10-13', '2026-10-20']
    expect(buildTrainingRhythm(dates, TODAY)).toMatchObject({
      daysThisWeek: 1,
      currentStreakWeeks: 3,
      longestStreakWeeks: 3,
    })
  })

  it('本週還沒練時算到上週（本週還沒結束，不算中斷）', () => {
    const dates = ['2026-10-05', '2026-10-13']
    expect(buildTrainingRhythm(dates, TODAY)).toMatchObject({
      daysThisWeek: 0,
      currentStreakWeeks: 2,
    })
  })

  it('本週與上週都沒練就是 0，之前的連續週數只留在最長連續', () => {
    const dates = ['2026-09-21', '2026-09-28', '2026-10-05']
    expect(buildTrainingRhythm(dates, TODAY)).toMatchObject({
      currentStreakWeeks: 0,
      longestStreakWeeks: 3,
    })
  })

  it('中間有一週沒練就中斷：目前連續只算斷點之後', () => {
    // 10/5 週沒練
    const dates = ['2026-09-28', '2026-10-13', '2026-10-20']
    expect(buildTrainingRhythm(dates, TODAY)).toMatchObject({
      currentStreakWeeks: 2,
      longestStreakWeeks: 2,
    })
  })

  it('最長連續取全部歷史中最長的一段，至少等於目前的連續週數', () => {
    const dates = [
      // 較早的一段：連續 4 週（8/31、9/7、9/14、9/21）
      '2026-09-01',
      '2026-09-08',
      '2026-09-15',
      '2026-09-22',
      // 目前的一段：連續 2 週
      '2026-10-14',
      '2026-10-22',
    ]
    expect(buildTrainingRhythm(dates, TODAY)).toMatchObject({
      currentStreakWeeks: 2,
      longestStreakWeeks: 4,
    })
  })

  it('同一週練很多天只算一週；週日與下一個週一屬於不同的週', () => {
    // 10/11（日）是 10/5 那一週，10/12（一）是上週
    const dates = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-11', '2026-10-12']
    expect(buildTrainingRhythm(dates, TODAY)).toMatchObject({
      currentStreakWeeks: 2,
      longestStreakWeeks: 2,
    })
  })

  it('跨月、跨年也照週計算', () => {
    // 2026-01-01 是週四；2025-12-29（一）– 2026-01-04（日）是同一週
    const dates = ['2025-12-23', '2025-12-31', '2026-01-06']
    expect(buildTrainingRhythm(dates, '2026-01-07')).toMatchObject({
      daysThisWeek: 1,
      currentStreakWeeks: 3,
    })
  })

  it('晚於今天的日期（不該出現的未來日期）不計入', () => {
    const dates = ['2026-10-20', '2026-10-26', '2026-11-02']
    expect(buildTrainingRhythm(dates, TODAY)).toMatchObject({
      daysThisWeek: 1,
      currentStreakWeeks: 1,
      longestStreakWeeks: 1,
    })
  })

  it('今天是週一或週日時，本週的範圍正確', () => {
    // 10/19 週一、10/25 週日
    expect(buildTrainingRhythm(['2026-10-19'], '2026-10-19').daysThisWeek).toBe(1)
    expect(buildTrainingRhythm(['2026-10-19'], '2026-10-25').daysThisWeek).toBe(1)
    expect(buildTrainingRhythm(['2026-10-18'], '2026-10-19').daysThisWeek).toBe(0)
    expect(buildTrainingRhythm(['2026-10-18'], '2026-10-19').currentStreakWeeks).toBe(1)
  })
})
