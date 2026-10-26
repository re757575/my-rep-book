// 檢查 docs/PRD.md 的使用者故事編號（`#### US-NN`）：整份文件不重複，同一節（`###`）內遞增。
// PRD 依功能分節，新的故事放進所屬的節，編號會跨節跳號（例如 §4.3 的 US-15 之後接 US-23），
// 所以只檢查節內的順序。由 npm run lint 執行。
//
// 用法：node scripts/check-prd.ts [PRD 檔案路徑]
import { readFile } from 'node:fs/promises'
import path from 'node:path'

const file = process.argv[2] ?? path.resolve(import.meta.dirname, '../docs/PRD.md')
const lines = (await readFile(file, 'utf8')).split('\n')

const errors: string[] = []
const seen = new Map<number, number>()
let section = ''
let previous: { id: number; line: number } | undefined

lines.forEach((text, index) => {
  const line = index + 1
  // 遇到新的一節（#、##、###）重新開始比較順序
  if (/^#{1,3} /.test(text)) {
    section = text
    previous = undefined
    return
  }
  const match = /^#### US-(\d+)\b/.exec(text)
  if (!match) return
  const id = Number(match[1])
  const label = `US-${match[1]}`

  const firstLine = seen.get(id)
  if (firstLine !== undefined) {
    errors.push(`第 ${line} 行：${label} 重複（第 ${firstLine} 行已有）`)
  } else if (previous && id < previous.id) {
    errors.push(
      `第 ${line} 行：${label} 排在 US-${String(previous.id).padStart(2, '0')}（第 ${previous.line} 行）之後，` +
        `同一節（${section.replace(/^#+ /, '')}）內要遞增`,
    )
  }
  seen.set(id, firstLine ?? line)
  previous = { id, line }
})

if (errors.length > 0) {
  console.error(`${path.relative(process.cwd(), file)} 的使用者故事編號有誤：`)
  for (const error of errors) console.error(`  ${error}`)
  process.exitCode = 1
}
