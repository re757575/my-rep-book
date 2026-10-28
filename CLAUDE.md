# CLAUDE.md

寫接縫 A 測試（Vitest + RTL）前，先讀 `docs/agents/testing.md`。

寫或改 E2E、新增動態載入或碰到首次載入的效能預算前，先讀 `docs/agents/testing-e2e.md`。

CI 不跑 E2E（會拉長部署時間）：**功能 commit 前，本地要跑過 `npm run e2e` 且全數通過**（多個 worktree 時用 `E2E_PORT=4181 npm run e2e`，見 `docs/agents/testing-e2e.md`）。只改文件、不影響程式行為的 commit 不用跑。

CI 也暫時不跑 bundle 大小檢查：改動首頁、新增依賴或共用模組時，commit 前在本地 `npm run build && npm run check:bundle-size`。**不要為首次載入 JS 的大小花時間**：只要還在 250 KB 預算內，超過基準就直接 `-- --update` 更新基準、連同變更一起 commit，不為它調整 chunk 切分或重構、也不逐項排查；只有總量逼近或超過 250 KB 才需要處理。

確認畫面版面時用 `npm run screenshot -- <路徑>` 截手機截圖（內建示範資料），不用開瀏覽器；選項見 `scripts/screenshot.ts` 開頭（要預先寫入 localStorage 的畫面偏好，例如開啟強度記錄，用 `--storage`）。

## Agent skills

### Issue tracker

Issue 與 spec 都放在 GitHub Issues（re757575/my-rep-book），使用 `gh` CLI 操作。See `docs/agents/issue-tracker.md`.

### Triage labels

使用預設的五個 triage 標籤：needs-triage、needs-info、ready-for-agent、ready-for-human、wontfix。See `docs/agents/triage-labels.md`.

### Domain docs

Single-context：repo 根目錄的 `GLOSSARY.md` 與 `docs/adr/`。See `docs/agents/domain.md`.
