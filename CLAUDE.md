# CLAUDE.md

寫接縫 A 測試（Vitest + RTL）前，先讀 `docs/agents/testing.md`。

寫或改 E2E、新增動態載入或碰到首次載入的效能預算前，先讀 `docs/agents/testing-e2e.md`。

確認畫面版面時用 `npm run screenshot -- <路徑>` 截手機截圖（內建示範資料），不用開瀏覽器；選項見 `scripts/screenshot.ts` 開頭。

## Agent skills

### Issue tracker

Issue 與 spec 都放在 GitHub Issues（re757575/my-rep-book），使用 `gh` CLI 操作。See `docs/agents/issue-tracker.md`.

### Triage labels

使用預設的五個 triage 標籤：needs-triage、needs-info、ready-for-agent、ready-for-human、wontfix。See `docs/agents/triage-labels.md`.

### Domain docs

Single-context：repo 根目錄的 `GLOSSARY.md` 與 `docs/adr/`。See `docs/agents/domain.md`.
