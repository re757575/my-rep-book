# 測試：寫測試前要知道的坑

測試只放兩個接縫：接縫 A（整個 App）與接縫 B（domain 公開函式），定義與範圍見 `docs/PRD.md` §9。這份文件只記從程式碼看不出來的事。

## 接縫 A（Vitest + RTL）

- **一律用 `renderApp(route?)` 起手**（`src/test/renderApp.tsx`），它渲染真正的 `<App />`。`route` 不含 base path，例如 `renderApp('/exercises')`。
- **驗證「重新整理後仍保留」用 `reload()`**：`const { user, reload } = renderApp(...)`。它會卸載 App、關閉 db，再以目前網址重新渲染。
- **每個測試都從空資料庫開始**，`src/test/setup.ts` 自動處理，測試裡不用做任何事。原因：Dexie 在建立 db 時就固定了 `indexedDB`，只替換 `globalThis.indexedDB` 無效，所以 setup 改用 `db.delete({ disableAutoOpen: false })`。
- **只有 `Date` 是假的**，固定在 2026-10-24（`src/test/fixedToday.ts`，E2E 共用）。`setTimeout` 等計時器是真的，所以 user-event、`findBy*`、toast 自動消失都照常運作。
- **資料經 `useLiveData` 非同步載入**：清單、詳情等讀資料的畫面要用 `findBy*` 等待，不能用 `getBy*`。標題先出現、內容晚到的頁面也一樣，例如自訂動作表單要等動作庫載入（重名檢查用）才渲染，看到標題後還要 `findByRole('textbox', { name: '中文名稱' })`。
- **jsdom 缺的瀏覽器 API 在 `src/test/setup.ts` 補**：目前補了 `matchMedia`（sonner、主題）與 `ResizeObserver`（Radix `Checkbox`、`RadioGroup`）。新的 Radix 元件若在測試中出現 `XXX is not defined`，在同一處補空實作，不要在個別測試裡 mock。
- **長字串用 `user.paste`**：測字數上限時 `user.type` 一字一字打很慢，先 `user.click(欄位)` 再 `user.paste('臥'.repeat(41))`。
- **shadcn／Radix 元件的實際 role**：
  - `ToggleGroup type="single"` 是 `radiogroup`／`radio`：`getByRole('radio', { name: '肩' })`、`toBeChecked()`
  - `RadioGroup` 同樣是 `radiogroup`／`radio`；`Checkbox` 是 `checkbox`，可用 `getAllByRole('checkbox', { checked: true })` 數勾選數
  - 自訂動作表單的部位多選是 `fieldset`，role 為 `group`：`within(getByRole('group', { name: '主要部位' })).getByRole('checkbox', { name: '胸' })`
  - `Switch` 是 `switch`
  - `<dl>` 的 `dd` 以 `aria-labelledby` 指向 `dt`：`getByRole('definition', { name: '記錄類型' })`
- **今天頁的 `h1` 是日期**（固定日期下為 `10/24（六）`），不是「今天」。要確認在今天頁，用 `getByRole('heading', { level: 1, name: '10/24（六）' })`。
- **不要用 `getAllByRole('region')` 數訓練動作**：sonner 的 `<Toaster />` 一直掛在 App 上，它的 `<section aria-label="Notifications …">` 也是 `region`。每個訓練動作是以動作名稱命名的 `region`，用 `getByRole('region', { name: '槓鈴臥推' })` 取單一動作；要看順序，改數 `heading` level 2。
- **確認對話框（shadcn `AlertDialog`）是 `alertdialog`**，名稱是標題：`findByRole('alertdialog', { name: '刪除「Smith 臥推」？' })`。對話框裡的確認鍵常和觸發鍵同名（例如都叫「刪除」），要用 `within(dialog)` 取。
- **斷言「沒有某個元素」前，先等相關資料載入完**：依非同步資料決定是否顯示的元素（例如動作詳情頁依「是否已有紀錄」顯示「封存」或「刪除」），載入中兩者都不在，直接 `queryBy*` 斷言不存在會在載入前就通過。先 `findBy*` 等一個載入後必定出現的元素，再斷言另一個不存在。
- **需要「已有紀錄」的動作時，透過 UI 在今天的訓練加入它**：建立自訂動作後切到「今天」分頁，從加入動作選單加入即可，不用填組數值。範例見 `src/features/exercises/archiveCustomExercises.test.tsx` 的 `createCustomWithRecord`。
- **加入動作選單是 `dialog`**，裡面的動作列是 `button`（動作庫分頁則是 `link`）。按鈕名稱是「中文名 英文名 · 器材」（例如「槓鈴臥推Barbell Bench Press · 槓鈴」），比對用 `{ name: /^槓鈴臥推/ }` 錨定開頭，避免名稱較短的關鍵字同時比到器材欄或其他動作。
- **做過的動作會同時出現在「最近使用」與「動作清單」**：只要任何一天的訓練有這個動作（包含剛在今天加入的），加入動作選單裡就有兩個同名按鈕，`within(dialog).getByRole('button', { name: /^槓鈴臥推/ })` 會因為比到多個而失敗。從全部動作選，先取清單：`within(within(dialog).getByRole('list', { name: '動作清單' })).getByRole('button', …)`；「最近使用」是名稱為「最近使用」的 `region`，裡面的清單也叫「最近使用」。範例見 `src/features/workout/addExercisePicker.test.tsx`。
- **在選單中「＋ 新增自訂動作」後，dialog 的名稱變成「新增自訂動作」**：表單在同一個 dialog 裡，`findByRole('dialog', { name: '新增自訂動作' })` 後用 `within` 填表；按「取消」回到名稱為「加入動作」的 dialog。
- **連續加入同一個動作時，不能用 `findByRole('region', { name })` 等它出現**：第二次加入時已經有一個同名的訓練動作，會比到多個；改等訓練動作數（h2 數量）增加，範例見 `addExercisePicker.test.tsx` 的 `addExercise`。
- **組的輸入欄位要讀 `.value` 時**，用 `getByRole<HTMLInputElement>('textbox', …)` 取得正確型別；單純斷言用 `toHaveValue('60')`（欄位是 `type="text"`，值是字串）。
- **組的欄位名稱依記錄類型而定**（N 為組的序號）：重量×次數是「第 N 組重量（kg）」「第 N 組次數」；次數是「第 N 組次數」「第 N 組額外負重（kg）」；時間是「第 N 組時間（mm:ss）」；距離＋時間是「第 N 組距離（km）」「第 N 組時間（mm:ss）」。時間重新載入後一律顯示成 `mm:ss`（例如輸入 `1:30` 或 `130`，重新整理後是 `01:30`）。
- **`user.type` 一字一字輸入，每個中間值都會被驗證，合法的就會寫入**：打 `60.555` 時 `60.55` 已經存下來；先 `clear` 再打不合法的值，清空那一下就寫入了 null。要驗證「保留上一個合法值」，選取全部再改打一個中間值都不合法的字串：`user.type(field, '00:60', { initialSelectionStart: 0, initialSelectionEnd: field.value.length })`。
- **欄位的驗證錯誤用 `toBeInvalid()` 與 `toHaveAccessibleDescription('錯誤訊息')` 斷言**：錯誤訊息以 `aria-describedby` 連到欄位，欄位帶 `aria-invalid`。`getByRole` 沒有 `invalid` 這個選項，傳了會被忽略。
- **domain 覆蓋率門檻（行 ≥ 80%）只在 `npm test -- --coverage` 時檢查**，單跑 `npm test` 不會擋。

## E2E（Playwright）

- **`test`、`expect` 一律從 `e2e/fixtures.ts` import**：它的 auto fixture 會固定「今天」，只固定 Date，計時器照跑。
- **`page.goto` 用相對路徑**：`page.goto('settings')`、`page.goto('day/2026-10-20')`、`page.goto('./')`。`baseURL` 帶有 base path `/my-rep-book/`，寫成 `'/settings'` 會跳出 base path。
- **每個測試都是新的 browser context**，IndexedDB 天生是空的。
- **輸入組的數值後不要立刻 `page.reload()`／`page.goto()`**：每個按鍵都是一次 IndexedDB 寫入，整頁重新載入會中斷還沒完成的 transaction，剛打的值可能整個不見（偶發，兩個瀏覽器都會）。先做其他 App 內的操作或斷言（例如切到動作庫分頁搜尋），再重新載入驗證。不要用 `waitForTimeout` 硬等。範例見 `e2e/custom-exercise.spec.ts` 的 E2E-03。
- **Playwright 的 `name` 字串預設是子字串比對**（RTL 的字串則是完整比對）：`getByRole('radio', { name: '次數' })` 會同時比到「次數」與「重量×次數」而觸發 strict mode 錯誤，要加 `exact: true`。
- **Playwright 不計算 `definition` 角色的名稱**：E2E 改用 `getByRole('definition').filter({ hasText: … })`。
- **尺寸類檢查放 E2E**：jsdom 量不到尺寸，觸控目標 ≥ 44×44 之類的檢查要在真實瀏覽器量。
- **vite preview 會自己 fallback 到 index.html**，直接開深層連結測不出 GitHub Pages 的 404.html 行為。要驗證新的深層路由，把它加進 `e2e/deep-link.spec.ts` 的路由清單，那裡用 `page.route` 以 404 回傳 `dist/404.html` 模擬 Pages。
- **多個 worktree 平行跑 E2E 時，用 `E2E_PORT` 各自指定 port**：例如 `E2E_PORT=4181 npm run e2e`，請在 4181–4189 之間挑。不要用 4190：它在瀏覽器禁止連線的 port 清單上，Mobile Safari（WebKit）會連不上而逾時，Mobile Chrome 卻正常，很容易誤判成程式問題。預設 port 是 4173，而本機 `reuseExistingServer` 為 true：若另一個 worktree 的 `vite preview` 正占用同一個 port，Playwright 會直接拿它的建置產物來測，結果與自己的程式碼無關。
- **新增 Playwright project（瀏覽器）時**，同步修改 `.github/workflows/ci.yml` 的 `playwright install` 參數。
