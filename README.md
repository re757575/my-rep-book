# My Rep Book

個人使用、本地優先、可離線的健身紀錄 Web App（Mobile-first PWA）。專注在兩件事：組間快速記下今天做了什麼，以及馬上看到上次做了什麼。

**線上版**：<https://re757575.github.io/my-rep-book/>

- 不需要帳號，資料只存在本機的 IndexedDB，不傳送到任何伺服器，也沒有分析或追蹤
- 安裝到主畫面後，飛航模式下所有功能照常可用
- 隨時可把完整資料匯出成 JSON，換手機時再匯入還原

## 功能

| 分頁 | 內容 |
| --- | --- |
| 今天 | 加入動作並記錄每一組，輸入即儲存；自動顯示上次紀錄並預填第一組；組類型（正式、熱身、遞減、力竭）、備註、調整順序、刪除後可復原；每日摘要（動作數、正式組數、總訓練量、有氧時間）；體重與 BMI；切換到過去的日期補記（預設鎖定，解鎖後才能修改）；動作可收合（可一鍵全部收合或展開）；重量與次數可用 −／+ 微調；組間休息倒數（震動與通知）；破紀錄的那一組當下標示；每組旁顯示上次同一組的數值 |
| 歷史 | 月曆與日明細（可把過去某天的訓練複製到今天）；每週／每月統計與各部位組數；體重紀錄、7 日平均與趨勢圖；把最近幾週的紀錄整理成 AI 提示詞，複製後自行貼到外部 AI |
| 動作庫 | 內建預設動作庫，可依 10 大分類篩選與搜尋；自訂動作（新增、編輯、封存、刪除）；隱藏預設動作或複製為自訂；動作詳情含個人紀錄（最大重量、估算 1RM）、進度圖表（最大重量、估算 1RM、訓練量的走勢）與每次的進度 |
| 設定 | 重量單位（kg／lb）、身高、生日、外觀主題、匯出／匯入資料、持久儲存狀態 |

支援四種記錄類型：重量×次數、次數（可選負重）、時間、距離＋時間。完整需求與驗收條件見 [`docs/PRD.md`](docs/PRD.md)。

## 技術棧

React 19、TypeScript（strict）、Vite、React Router、Tailwind CSS + shadcn/ui、Dexie.js（IndexedDB）、react-hook-form + zod、vite-plugin-pwa。測試用 Vitest + React Testing Library + `fake-indexeddb` 與 Playwright；CI 與部署用 GitHub Actions + GitHub Pages。

## 開始開發

Node 與 npm 版本由 [Volta](https://volta.sh/) 固定在 `package.json` 的 `volta` 欄位。所有套件都固定精確版本（`.npmrc` 設有 `save-exact=true`）。

```bash
npm ci
npm run dev
```

App 部署在 `/my-rep-book/` 底下，開發伺服器也使用同一個 base path。

## 常用指令

| 指令 | 用途 |
| --- | --- |
| `npm run dev` | 啟動開發伺服器 |
| `npm run build` | 建置到 `dist/` |
| `npm run preview` | 預覽建置結果 |
| `npm run lint` | ESLint、Prettier 檢查，以及 PRD 使用者故事編號檢查 |
| `npm run format` | 以 Prettier 格式化 |
| `npm run typecheck` | 型別檢查 |
| `npm test` | 單元與整合測試（Vitest）；加 `-- --coverage` 產生覆蓋率 |
| `npm run test:watch` | 以 watch 模式跑 Vitest |
| `npm run e2e` | E2E 測試（Playwright，Mobile Chrome 與 Mobile Safari） |
| `npm run check:bundle-size` | 檢查首次載入的 JS（gzip）大小，需先 build |
| `npm run lighthouse` | 量首頁 LCP（手機模擬），需先 build；不在 CI 執行 |
| `npm run screenshot -- <路徑>` | 以示範資料截取某個畫面的手機截圖，選項見 `scripts/screenshot.ts` 開頭 |

第一次跑 E2E 前要先安裝瀏覽器：`npx playwright install chromium webkit`。

## 專案結構

```
src/
├── app/            # 路由、Layout、底部導覽、更新提示
├── domain/         # 純 TypeScript 的型別、規則與計算，不依賴 React 與 Dexie
├── data/           # Repository 介面與 Dexie 實作
├── features/       # 各分頁的畫面：workout、history、exercises、settings、bodyWeight
├── components/ui/  # shadcn/ui 元件
└── lib/            # 通用工具
e2e/                # Playwright 測試
scripts/            # bundle 大小、Lighthouse、截圖、PRD 檢查等腳本
docs/               # PRD、實機測試清單、給 agent 的開發指引
```

分層規則：`domain` 不得 import React、Dexie 或 `features`；`features` 只透過 `data/repositories.ts` 的介面存取資料。詳見 PRD §8。

## 測試

測試集中在兩個接縫，再加上 E2E：

- **接縫 A（主要）**：渲染整個 App，以 `fake-indexeddb` 取代 IndexedDB，用 user-event 像使用者一樣操作
- **接縫 B（輔助）**：`src/domain` 的公開函式，`src/domain` 的行覆蓋率須 ≥ 80%
- **E2E**：在建置後的 App 上跑關鍵流程、PWA 離線、無障礙（axe）與鍵盤操作

測試中「今天」固定為 2026-10-24。撰寫測試前請先讀 [`docs/agents/testing.md`](docs/agents/testing.md) 與 [`docs/agents/testing-e2e.md`](docs/agents/testing-e2e.md)，裡面記錄了從程式碼看不出來的坑。

## CI 與部署

每次 push 與 PR 依序執行 lint → typecheck → 單元測試（含覆蓋率）→ build → bundle 大小 → E2E（見 [`.github/workflows/ci.yml`](.github/workflows/ci.yml)）。只有 push 到 `main` 且全部通過才會部署到 GitHub Pages；PR 只跑 CI。

上線前的實機檢查清單見 [`docs/manual-device-test.md`](docs/manual-device-test.md)。

## Issue

需求與待辦都放在 [GitHub Issues](https://github.com/re757575/my-rep-book/issues)。
