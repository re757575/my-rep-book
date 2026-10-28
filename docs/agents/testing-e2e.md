# E2E 與效能預算：寫之前要知道的坑

**E2E 與單元測試暫時不在 CI 執行**（會拉長部署時間，見 `docs/PRD.md` §9.6），功能 commit 前要在本地跑過 `npm run e2e` 與單元測試 `npm test -- --coverage` 且全數通過；跑法與 port 見下面。E2E 的範圍見 `docs/PRD.md` §9.4；接縫 A（Vitest + RTL）的坑在 `docs/agents/testing.md`。這份文件只記從程式碼看不出來的事。

## E2E（Playwright）

- **`test`、`expect` 一律從 `e2e/fixtures.ts` import**：它的 auto fixture 會固定「今天」，只固定 Date，計時器照跑。
- **`page.goto` 用相對路徑**：`page.goto('settings')`、`page.goto('day/2026-10-20')`、`page.goto('./')`。`baseURL` 帶有 base path `/my-rep-book/`，寫成 `'/settings'` 會跳出 base path。
- **每個測試都是新的 browser context**，IndexedDB 天生是空的。
- **輸入組的數值或備註後可以直接 `page.reload()`／`page.goto()`／關閉分頁**：欄位編輯走 `WorkoutRepository.editField`，輸入當下就同步記進 localStorage 的待寫清單，下次開啟資料庫時會在任何讀取之前補寫，所以不用先做別的操作、也不用 `waitForTimeout` 等寫入完成。保證範圍見 `e2e/durable-writes.spec.ts`。新增「輸入即儲存」的欄位時也要走 `editField`（在 `src/domain/fieldEdits.ts` 的 `FieldEdit` 加一種 kind）；若改用 `update` 每次按鍵寫一次，這個保證就不成立。
- **E2E 需要既有資料時用 `importBackup(page, { content: backupFixture(...) })`**（`e2e/backup.ts`，fixture 與接縫 A 共用 `src/test/backupFixture.ts`）；匯入已下載的檔案用 `{ path: await download.path() }`。下載用 `page.waitForEvent('download')` 接，檔名看 `download.suggestedFilename()`。
- **E2E 中清空資料**：在頁面裡 `indexedDB.deleteDatabase('my-rep-book')` 並 `localStorage.clear()` 後再 `goto`。Dexie 收到 versionchange 會自動關閉連線，刪除不會被擋住。範例見 `e2e/export-import.spec.ts`。
- **在過去的日期修改紀錄前先解鎖**：非今天的訓練頁預設鎖定，用 `e2e/unlockDay.ts` 的 `await unlockDay(page)`；`page.reload()`／`page.goto()` 後會回到預設的鎖定。
- **E2E 中開新分頁要自己固定「今天」**：`e2e/fixtures.ts` 的 auto fixture 只作用在預設的 `page`。用 `context.newPage()` 開的頁面要先 `await newPage.clock.setFixedTime(FIXED_TODAY)`（從 `src/test/fixedToday.ts` import）再 `goto`。
- **Playwright 的 `name` 字串預設是子字串比對**（RTL 的字串則是完整比對）：`getByRole('radio', { name: '次數' })` 會同時比到「次數」與「重量×次數」而觸發 strict mode 錯誤，要加 `exact: true`。
- **Playwright 不計算 `definition` 角色的名稱**：`dd` 以 `aria-labelledby` 指向 `dt` 時，改用 `getByLabel('總訓練量')` 取（Playwright 的 `getByLabel` 會看 `aria-labelledby`），例如 `summary.getByLabel('總訓練量')`；或用 `getByRole('definition').filter({ hasText: … })`。
- **尺寸類檢查放 E2E**：jsdom 量不到尺寸，觸控目標 ≥ 44×44 之類的檢查要在真實瀏覽器量。
- **vite preview 會自己 fallback 到 index.html**，直接開深層連結測不出 GitHub Pages 的 404.html 行為。要驗證新的深層路由，把它加進 `e2e/deep-link.spec.ts` 的路由清單，那裡用 `page.route` 以 404 回傳 `dist/404.html` 模擬 Pages。
- **多個 worktree 平行跑 E2E 時，用 `E2E_PORT` 各自指定 port**：例如 `E2E_PORT=4181 npm run e2e`，請在 4181–4189 之間挑。不要用 4190：它在瀏覽器禁止連線的 port 清單上，Mobile Safari（WebKit）會連不上而逾時，Mobile Chrome 卻正常，很容易誤判成程式問題。預設 port 是 4173，而本機 `reuseExistingServer` 為 true：若另一個 worktree 的 `vite preview` 正占用同一個 port，Playwright 會直接拿它的建置產物來測，結果與自己的程式碼無關。
- **E2E 測的是建置後的 App，每個測試第一次載入就會註冊 Service Worker**：之後的 `page.reload()`／`page.goto()` 改由 Service Worker 從預先快取回應，`page.route` 攔不到這些請求。要用 `page.route` 改寫回應時，在第一次 `goto` 之前設好（如 `e2e/deep-link.spec.ts`），或在該檔加 `test.use({ serviceWorkers: 'block' })`。
- **離線測試要先等 Service Worker 啟用**：`await page.evaluate(async () => { await navigator.serviceWorker.ready })` 之後再 `context.setOffline(true)`，否則預先快取還沒完成，重新整理會失敗。範例見 `e2e/pwa.spec.ts`。
- **Playwright 的 route 攔不到 Service Worker 本身（`sw.js`）的請求**：要模擬「部署了新版本」，對該 context 加 cookie `e2e-sw-version`（`context.addCookies([{ name: 'e2e-sw-version', value: '2', url: page.url() }])`）再 `page.reload()`，vite preview 會回傳內容不同的 `sw.js`（`vite.config.ts` 的 `simulateNewServiceWorker()`）。cookie 只影響這個 context，不會干擾平行的測試。重新整理後還要由頁面呼叫 `registration.update()`：Linux 的 WebKit（CI）換頁後自動檢查更新時抓 `sw.js` 不帶 cookie，只有頁面主動 `update()` 才會帶；macOS 的 WebKit 會帶，所以本機看不出差別。
- **sonner toast 在 Playwright 中是 `listitem`**：`page.getByRole('listitem').filter({ hasText: '有新版本' })`，按鈕再從它裡面取。
- **新增 Playwright project（瀏覽器）時**，本機要 `npx playwright install` 該瀏覽器。CI 目前不跑 E2E 也不跑 bundle 大小檢查，`.github/workflows/ci.yml` 裡 E2E、「安裝 Playwright 瀏覽器」與「Bundle 大小檢查」的步驟都是註解掉的；之後放回 CI 時，取消註解並同步修改那裡的 `playwright install` 參數。
- **量回應時間不要用 Playwright 端的計時**：`expect(...).toBeVisible()` 是輪詢（間隔 100 ms 以上），加上與瀏覽器之間的通訊，量不出 < 100 ms 的差異。用 `e2e/performance.spec.ts` 的 `measureClick`，在頁面裡以點擊事件為起點、DOM 符合條件後的下一個畫格為終點計時。終點條件用 CSS 選擇器（只拿來計時，行為仍用 role 斷言）。Playwright 的 Clock（`e2e/fixtures.ts` 固定「今天」）也接管了 `performance.now()`，解析度是 1 ms。
- **用 `page.mouse` 點元素上的某個位置前，先 `scrollIntoViewIfNeeded()`**：`boundingBox()` 與 `mouse.click` 的座標都是相對於可視範圍，元素在畫面外時點擊會落空，而且沒有任何錯誤，只看到「點了沒反應」。範例見 `e2e/progress-chart.spec.ts`。
- **`e2e/performance.spec.ts` 在 CI 上跳過**（現在整個 E2E 都不在 CI 跑，這條是之後放回 CI 時的提醒）：GitHub 的 runner 量到 Chrome 約 90–120 ms、WebKit 150–435 ms（本機 23–69 ms），不代表使用者的手機。改動訓練頁、加入動作選單或上次紀錄後，在本機跑 `npx playwright test e2e/performance.spec.ts`。
- **大量資料用程式產生 fixture 再匯入**：1,000 筆訓練（每筆 4 個動作）的備份檔匯入約 3 秒，見 `e2e/performance.spec.ts` 的 `thousandWorkouts`。
- **無障礙檢查集中在 `e2e/accessibility.spec.ts`**：`SCREENS` 列出要檢查的畫面，每個畫面在淺色與深色主題下各跑 axe（serious／critical 不得出現，含色彩對比）、觸控目標 ≥ 44×44 px、輸入框字級 ≥ 16px。新增畫面或對話框時加進 `SCREENS`。axe 前會插入停用 `transition`／`animation` 的樣式：顏色轉場途中取樣會算出不存在的低對比，造成偶發失敗。核取方塊、選項的觸控目標以整個 `label` 計算，所以 `Label` 要撐滿列高（`min-h-11`）。
- **WebKit 的 Tab 預設只在表單欄位間移動**（與 macOS Safari 相同），按鈕與連結要用 `Alt+Tab`。只用鍵盤操作的測試見 `e2e/keyboard.spec.ts` 的 `tabTo`。
- **量有進場動畫的元素（例如 sonner toast）的位置前，先等動畫結束**：`await toast.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)))`，否則量到的是滑入途中的位置。toast 顯示在底部分頁上方（`src/app/App.tsx` 的 `TOAST_BOTTOM_OFFSET`），不會擋住分頁；若 Playwright 點分頁時出現 `<li … data-sonner-toast …> intercepts pointer events` 並一直重試，代表 toast 又蓋到分頁了（滑鼠停在 toast 上時 sonner 會暫停倒數，toast 不會自己消失）。

## 效能預算（PRD §7）

- **點擊後才動態載入的元件，不要包在新的 `<Suspense>` 裡**：React 會把 fallback 換成內容的時機延後約 300 ms（Suspense 的 reveal throttle），第一次打開加入動作選單就從 30 ms 變成 300 ms 以上，`e2e/performance.spec.ts` 會失敗。改在點擊時用 `startTransition` 設定「已載入」的 state，讓 React 等 chunk 載入完成再一次渲染（範例見 `TodayPage` 的加入動作選單、`WorkoutDateHeader` 的日期選擇器）。即使如此，第一次打開仍要等 chunk 下載，全套 E2E 的負載下會超過 100 ms；主要操作的 chunk 要再用 `whenIdleAfterLoad`（`src/lib/whenIdleAfterLoad.ts`）在頁面閒置時先載入，像加入動作選單那樣。
- **首次載入的效能預算（PRD §7）不在測試裡，是兩支腳本**，都要先 `npm run build`：`npm run check:bundle-size` 以 Chromium 打開首頁，把實際載入的 JS 逐一 gzip 加總，須 < 250 KB，而且不能比 `scripts/bundle-baseline.json` 的基準多超過 1 KB（失敗時會列出和基準相比變動的 chunk）。**CI 暫時不跑它**（見上方，和 E2E 一起停用），所以改動首頁、新增依賴或新增共用模組後要自己在本地跑，不然預算悄悄超標沒人擋。**不要為大小花時間**：只要還在 250 KB 預算內，超過基準就直接執行 `npm run check:bundle-size -- --update`（變小超過 1 KB 時腳本也會提醒更新），基準檔連同變更一起 commit，不為它調整 chunk 切分或重構、也不逐項排查；總量逼近或超過 250 KB 才需要處理；`npm run lighthouse` 以 Lighthouse 手機版預設（模擬節流）跑 3 次取 LCP 中位數，須 < 2.5 秒，結果會隨機器負載浮動，所以不放 CI，改動首頁或新增依賴後手動跑。首頁（今天的訓練頁）新增的大型依賴要動態載入，否則兩者都會超標。
- **`src/domain` 的模組最上層只放沒有副作用的宣告**（下面兩條是過去排查 chunk 切分的紀錄，只作參考，不需要為了省 KB 刻意遵守或排查）：domain 經由 `@/domain` 進入首頁，打包工具（rolldown）遇到最上層有副作用的模組（例如 `new Intl.NumberFormat(…)`）會改變 chunk 的切分，把 `button`、`settingsContext` 等共用模組拆成額外的小 chunk，首次載入多約 3 KB，即使用到它的只有動態載入的頁面。`new Intl.*` 已由 ESLint 擋下（`eslint.config.js` 的 `no-restricted-syntax`），其他副作用一樣改成第一次用到時才建立並快取，像 `src/domain/units.ts` 的 `formatterFor`。`check:bundle-size` 比基準多出新的共用 chunk（例如 `button`）時，多半就是這類切分改變；首頁新用到只有動態載入頁才用的元件也會這樣（例如在訓練頁用 Switch，改用首頁已有的 Toggle 就沒事）。
- **動態載入的頁面不要 import 原本只有首頁（訓練頁）用的模組**：歷史頁的「複製到今天」一度 import `src/features/workout/deleteWithUndo.ts` 來共用「復原」toast，`check:bundle-size` 就多出一個 5 KB 的 `button` 共用 chunk、首次載入多 1.3 KB（`index` 少 3.5 KB，總量卻變大）。這類模組被動態載入的 chunk 也用到時，打包工具會重新切分；小段重複（這裡是 toast 的 5 行設定）比共用便宜。要共用就改放在 `src/lib` 這類兩邊本來就都會用到的地方，並看 `check:bundle-size` 有沒有新的 chunk。
- **訓練頁多一整行元素，會讓 WebKit 上「打開加入動作選單」多約 60 ms**：整套 E2E 平行執行時，`e2e/performance.spec.ts` 的這一項在 Mobile Safari 從約 50 ms 變成 110–150 ms（單獨跑看不出來，要整套一起跑），拿掉那一行或把它併進既有的一行就回到原本。原因沒有查到（和 chunk 切分無關：改用純靜態按鈕、不載入任何新模組也一樣慢），所以「加入動作」下方的按鈕（從範本加入、存成範本）與它放在同一行（`flex-1`）。改動訓練頁的版面後，要整套跑 `npm run e2e` 才會發現。
