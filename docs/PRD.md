# My Rep Book — 產品需求文件（PRD）

| 項目 | 內容 |
| --- | --- |
| 版本 | v1.0（MVP） |
| 日期 | 2026-10-24 |
| 狀態 | 草稿，待審閱 |
| 平台 | Web（Mobile-first PWA） |

---

## 1. 背景與目標

### 1.1 背景

在健身房記錄訓練時，最常見的痛點是：組間時間短、手機單手操作、健身房收訊差，以及記不得「上次這個動作做了多重、幾下」。現有 App 多半功能龐雜、需要註冊帳號，或把資料綁在雲端。

My Rep Book 是一個**個人使用、本地優先、可離線**的健身紀錄 Web App，專注在「快速記下今天做了什麼」與「看到上次做了什麼」。

### 1.2 產品目標

| # | 目標 | 衡量方式 |
| --- | --- | --- |
| G1 | 組間能快速記錄一組 | 已有上次紀錄的動作，記錄一組 ≤ 2 次點擊（新增一組 → 視需要微調數值） |
| G2 | 隨時知道上次的表現 | 加入動作後立即顯示上次紀錄，並自動帶入第一組數值 |
| G3 | 完全離線可用 | 安裝 PWA 後，飛航模式下所有 MVP 功能正常運作 |
| G4 | 資料不被綁架 | 隨時可匯出完整資料為 JSON，並能完整匯入還原 |
| G5 | 可維護、可驗證 | domain 邏輯單元測試覆蓋率 ≥ 80%；5 條關鍵流程有 E2E 測試於 CI 執行 |

### 1.3 非目標（MVP 不做）

- 帳號、登入、雲端同步、多裝置同步
- 社群、分享、排行榜
- 訓練範本／課表、進度圖表、PR 追蹤、休息計時器（列入 v2，見 §11）
- 同一天多個訓練 session
- 多語系（介面僅繁體中文）
- 桌機版特別最佳化（只需版面不破）

---

## 2. 目標使用者與使用情境

**主要使用者**：開發者本人，定期上健身房、以自由重量與器械訓練為主，偶爾做有氧。

| 情境 | 描述 |
| --- | --- |
| S1 組間記錄 | 在健身房做完一組，單手打開 App，在今天的訓練裡新增一組，數值已帶入上一組，必要時改一下次數 |
| S2 開始新動作 | 走到臥推架前，加入「槓鈴臥推」，看到上次 60kg×8、60kg×8、62.5kg×6，第一組已預填 60kg×8 |
| S3 補記 | 昨天忘了記，今天切到昨天的日期補上 |
| S4 回顧 | 在月曆上看這個月練了哪幾天；點進某個動作，看它每次的紀錄 |
| S5 自訂動作 | 健身房有台特殊器械，預設庫沒有，新增一個自訂動作 |
| S6 備份 | 換手機前匯出 JSON，在新手機匯入 |

---

## 3. 名詞定義

| 名詞 | 定義 |
| --- | --- |
| 動作（Exercise） | 一個訓練動作的定義，例如「槓鈴臥推」。分為**預設動作**（內建、唯讀）與**自訂動作**（使用者建立） |
| 訓練（Workout） | 某一天的訓練紀錄，以日期為唯一鍵，一天一筆 |
| 訓練動作（Workout Exercise） | 某次訓練中做的某個動作，包含多組與一則備註 |
| 組（Set） | 一組的數值紀錄，欄位依動作的記錄類型決定 |
| 記錄類型（Tracking Type） | `weight_reps`（重量×次數）、`reps`（次數，可選負重）、`duration`（時間）、`distance_duration`（距離＋時間） |
| 熱身組 | 標記為熱身的組，不計入訓練量、不作為「上次紀錄」 |
| 正式組 | 非熱身組 |
| 完整的組 | 所有必填欄位都已填寫且合法的組 |
| 上次紀錄 | 在**目前檢視日期之前**，最近一次含有該動作的訓練中，該動作的所有完整正式組 |
| 訓練量（Volume） | `weight_reps` 類型的完整正式組之 Σ(重量 × 次數) |
| 部位（Muscle） | 細分的肌群，用於資料層 |
| 篩選分類（Browse Category） | 畫面上用來篩選動作的 10 大類，由部位映射而來 |
| 體重（Body Weight） | 某一天的體重，以日期為唯一鍵，一天最多一筆；與訓練分開儲存，沒有訓練的日子也能記錄 |
| BMI | 體重（kg）÷ 身高（m）²，身高取自設定 |

---

## 4. 功能需求

每條 user story 附 Given/When/Then 驗收條件。標註 `[E2E-xx]` 者為 E2E 測試必須涵蓋的關鍵流程。

### 4.1 每日訓練記錄

#### US-01 記錄今日訓練 `[E2E-01]`

> 身為使用者，我想在今天的訓練頁加入動作並記錄每一組，以便留下今天的訓練紀錄。

- **Given** 開啟 App　**When** 進入首頁　**Then** 顯示「今天」的訓練頁，標題為今天日期
- **Given** 在今天的訓練頁　**When** 點「加入動作」並選擇「槓鈴臥推」　**Then** 該動作出現在清單底部，並自動建立第一組
- **Given** 某動作的一組　**When** 輸入重量與次數　**Then** 數值即時自動儲存，重新整理頁面後仍存在
- **Given** 記錄類型為 `duration` 的動作（如平板支撐）　**Then** 該組只顯示「時間（mm:ss）」欄位
- **Given** 記錄類型為 `distance_duration` 的動作（如跑步機）　**Then** 該組顯示「距離（km）」與「時間（mm:ss）」欄位
- **Given** 記錄類型為 `reps` 的動作（如引體向上）　**Then** 該組顯示「次數」與選填的「額外負重」欄位
- 頁面不提供「儲存」按鈕，也沒有每組的「完成」勾選

#### US-02 自動帶入上次數據 `[E2E-02]`

> 身為使用者，我想在加入動作時看到上次的表現並自動帶入，以便不用回想、少打字。

- **Given** 10/20 做過槓鈴臥推（60×8、60×8、62.5×6），檢視日期為 10/24　**When** 加入槓鈴臥推　**Then** 動作標題下方顯示「上次（10/20）：60kg×8、60kg×8、62.5kg×6」，且第一組預填 60kg×8
- **Given** 檢視日期為 10/15（補記），10/12 與 10/20 都做過該動作　**When** 加入該動作　**Then** 上次紀錄取 10/12，而非 10/20
- **Given** 上次紀錄中第一組為熱身組　**Then** 熱身組不顯示於「上次」摘要，預填取第一個正式組
- **Given** 從未做過該動作　**Then** 不顯示「上次」列，第一組各欄位為空白
- 「上次」的顯示單位跟隨目前的重量單位設定

#### US-03 新增一組

> 身為使用者，我想快速新增下一組，以便組間只需最少操作。

- **Given** 某動作已有至少一組　**When** 點「新增一組」　**Then** 新增一組，數值與熱身標記複製自本次的最後一組
- **Given** 某動作目前沒有任何組（全部被刪除）　**When** 點「新增一組」　**Then** 依 US-02 規則預填上次第一個正式組，沒有上次紀錄則為空白

#### US-04 熱身組標記

- **Given** 任一組　**When** 切換「熱身」標記　**Then** 該組以視覺區隔（例如顯示「熱」標籤與較淡色），並不計入摘要與上次紀錄

#### US-05 動作備註

- **Given** 某訓練動作　**When** 展開並輸入備註　**Then** 備註自動儲存，在歷史明細與動作歷史中可見
- 備註以訓練動作為單位，不提供逐組備註

#### US-06 調整動作順序

- **Given** 訓練中有多個動作　**When** 點某動作的「上移」或「下移」　**Then** 該動作與相鄰動作交換位置並儲存
- 第一個動作的「上移」與最後一個動作的「下移」為停用狀態

#### US-07 刪除與復原

- **Given** 某組　**When** 點「刪除此組」　**Then** 該組立即移除，並出現 toast「已刪除一組」附「復原」按鈕，約 5 秒後消失
- **Given** 刪除後 toast 仍顯示　**When** 點「復原」　**Then** 該組回到原位置、原數值
- 刪除整個訓練動作行為相同，toast 文字為「已刪除『{動作名稱}』」
- 刪除組與刪除訓練動作**不**跳出確認對話框
- 當訓練中最後一個動作被刪除，該日的訓練紀錄一併移除（月曆不再標點）；復原時一併還原

#### US-08 補記與編輯過去日期 `[E2E-04]`

> 身為使用者，我想切換到過去的日期補記或修改，以便修正忘記記錄的訓練。

- **Given** 訓練頁　**When** 點日期標題左右箭頭或開啟日期選擇器　**Then** 可切換到任意過去日期，該日的紀錄可新增、編輯、刪除
- **Given** 檢視日期為今天　**Then** 「下一天」箭頭停用，日期選擇器中未來日期不可選
- **Given** 直接以網址進入未來日期　**Then** 導回今天並顯示 toast「無法記錄未來的日期」
- **Given** 檢視日期不是今天　**Then** 標題旁顯示「回到今天」按鈕

#### US-09 每日摘要

- **Given** 某天有紀錄　**Then** 訓練頁頂部與歷史明細顯示：動作數、正式組數、總訓練量、有氧總時間
- 正式組數：所有記錄類型中完整的正式組數量
- 總訓練量：只計算 `weight_reps`，`reps` 的額外負重不計入；顯示單位跟隨設定
- 有氧總時間：`distance_duration` 類型完整正式組的時間加總；`duration`（如平板支撐）不計入
- 數值為 0 的項目仍顯示 0；不完整的組不計入任何摘要

### 4.2 動作庫

#### US-10 瀏覽與搜尋動作

> 身為使用者，我想快速找到要做的動作。

**加入動作選單**（從訓練頁開啟，全螢幕）由上而下：

1. 搜尋框：比對中文名與英文名，忽略大小寫與前後空白，部分比對即可
2. 「最近使用」：依最近一次使用日期排序，去重，最多 8 個；搜尋或篩選時隱藏此區
3. 篩選分類 tabs：「全部」＋ 10 大類（見 §5.4）
4. 動作清單：每列顯示中文名、英文名、器材
5. 底部固定「＋ 新增自訂動作」入口

- **Given** 搜尋「bench」　**Then** 顯示槓鈴臥推、啞鈴臥推、窄握臥推等英文名含 bench 的動作
- **Given** 選擇「肩」分類　**Then** 顯示主要部位映射到「肩」的動作，包含聳肩（主要部位為斜方肌）
- **Given** 點選某動作　**Then** 選單關閉並加入該動作（一次只加入一個）
- 已隱藏的預設動作與已封存的自訂動作不出現在選單中

**動作庫分頁**（底部導覽）使用相同的搜尋與分類，另有「顯示已隱藏／已封存」開關；點選動作進入動作詳情頁（US-15）。

#### US-11 新增自訂動作 `[E2E-03]`

> 身為使用者，我想新增預設庫沒有的動作。

表單欄位：

| 欄位 | 必填 | 規則 |
| --- | --- | --- |
| 中文名稱 | 是 | 1–40 字；與所有預設動作及自訂動作的中文名稱不可重複（比對時忽略大小寫與前後空白） |
| 英文名稱 | 否 | 0–60 字 |
| 主要部位 | 是 | 至少 1 個，可多選 |
| 次要部位 | 否 | 可多選，不可與主要部位重複 |
| 器材 | 是 | 單選，見 §5.3 |
| 記錄類型 | 是 | 單選，見 §5.2 |

- **Given** 從加入動作選單點「新增自訂動作」並送出合法表單　**Then** 建立動作，並直接加入目前的訓練
- **Given** 從動作庫分頁新增　**Then** 建立後回到動作庫並可搜尋到該動作
- **Given** 名稱與既有動作重複　**Then** 顯示錯誤「已有同名動作」，不可送出

#### US-12 編輯、封存、刪除自訂動作

- **Given** 自訂動作　**When** 編輯名稱、部位、器材　**Then** 更新後所有歷史紀錄顯示新名稱
- **Given** 自訂動作已有任何訓練紀錄　**Then** 記錄類型欄位停用並提示「已有紀錄，無法變更記錄類型」
- **Given** 自訂動作已有紀錄　**Then** 只提供「封存」，不提供「刪除」；封存後不出現在選單，但歷史紀錄照常顯示，可在動作庫中「取消封存」
- **Given** 自訂動作沒有任何紀錄　**When** 點「刪除」　**Then** 跳出確認對話框，確認後永久刪除

#### US-13 隱藏預設動作、複製為自訂

- 預設動作的資料唯讀，不可編輯或刪除
- **Given** 預設動作　**When** 點「隱藏」　**Then** 不出現在加入動作選單；在動作庫開啟「顯示已隱藏」可看到並「取消隱藏」；歷史紀錄不受影響
- **Given** 預設動作　**When** 點「複製為自訂動作」　**Then** 開啟新增自訂動作表單，欄位預填該預設動作的資料，中文名稱預填「{原名}（自訂）」

### 4.3 歷史

#### US-14 月曆檢視

- **Given** 歷史分頁　**Then** 顯示當月月曆，週一為一週第一天，有訓練紀錄的日期下方標點
- 可切換上／下個月；不可切換到未來月份
- **When** 點選某日期　**Then** 顯示該日明細：每日摘要、各動作與各組；明細中有「編輯」按鈕，進入該日的訓練頁

#### US-15 動作歷史

- **Given** 動作詳情頁　**Then** 顯示動作資訊（名稱、部位、器材、記錄類型）與該動作的所有紀錄，依日期由新到舊，每筆顯示日期、各組數值（熱身組標示）、備註
- 點某筆日期可進入該日訓練頁
- 列表採分批載入，首批 20 筆

### 4.4 設定與資料

#### US-16 匯出資料 `[E2E-05]`

- **Given** 設定頁　**When** 點「匯出資料」　**Then** 下載 `my-rep-book-backup-YYYYMMDD-HHmm.json`，內容格式見 §5.6
- 匯出成功後更新「上次匯出時間」並顯示於設定頁；從未匯出則顯示「尚未匯出」

#### US-17 匯入資料 `[E2E-05]`

- **Given** 設定頁　**When** 點「匯入資料」並選擇檔案　**Then** 先驗證檔案；驗證通過後跳出確認對話框「匯入將覆蓋目前所有資料，此動作無法復原。系統會先自動下載目前資料的備份。」
- **When** 確認　**Then** 先自動下載目前資料備份，再以匯入內容整份取代現有資料，顯示「匯入完成」
- **Given** 檔案的 `schemaVersion` 小於目前版本　**Then** 依序執行遷移後匯入
- **Given** 檔案的 `schemaVersion` 大於目前版本　**Then** 拒絕並顯示「此備份來自較新版本的 App，請先更新 App」
- **Given** 檔案非 JSON、缺少必要欄位或欄位不合法　**Then** 拒絕並顯示具體原因（例如「workouts[3].date 格式錯誤」），現有資料不受影響
- E2E-05 流程：記錄資料 → 匯出 → 清空資料 → 匯入 → 資料與匯出前一致

#### US-18 重量單位

- 設定頁可切換 kg／lb，預設 kg
- 資料一律以 kg 儲存；切換單位只影響顯示與輸入
- lb 模式下，重量顯示四捨五入到 0.1；輸入的 lb 值換算成 kg 儲存（1 lb = 0.45359237 kg，儲存時不四捨五入）
- 距離永遠以 km 顯示，不隨單位切換

#### US-19 外觀主題

- 設定頁可選「跟隨系統」（預設）、「淺色」、「深色」，即時生效並記住選擇

#### US-20 離線與安裝（PWA）

- 首次載入後，所有 MVP 功能可在離線狀態下使用
- 支援「加入主畫面」，以 standalone 模式開啟
- 偵測到新版本時顯示 toast「有新版本」附「重新整理」按鈕，不自動強制重新整理

#### US-21 持久儲存

- 首次啟動時呼叫 `navigator.storage.persist()`
- 設定頁顯示持久儲存狀態（「已啟用」或「未啟用，瀏覽器可能在空間不足時清除資料，建議定期匯出」）

#### US-22 體重與身高

- 訓練頁（今天與補記的日期）在日期下方有「體重」欄位，以目前的重量單位輸入與顯示，資料一律以 kg 儲存
- 輸入即儲存，沒有儲存按鈕；清空即刪除當天的體重。須大於 0、最多 2 位小數，不合法時在欄位下方顯示錯誤且不寫入
- 設定頁可填寫身高（cm，50–300，最多 2 位小數），輸入即儲存；清空即改回尚未填寫
- **Given** 已填身高且當天有體重　**Then** 訓練頁與歷史的日明細在體重旁顯示 BMI（四捨五入到 0.1）；未填身高時不顯示
- 歷史的日明細顯示當天體重；只記了體重、沒有訓練的日子也顯示，並可點「編輯」前往該日的訓練頁。月曆的標點不變，仍只標有訓練的日期
- 歷史頁標題旁有「體重紀錄」按鈕，進入 `/history/body-weight`：由新到舊列出所有體重（目前的重量單位）與 BMI（有身高時），點日期前往該日的訓練頁修改；還沒有體重時顯示提示
- 體重與身高包含在匯出檔中（schema v2）

---

## 5. 資料模型

### 5.1 基本型別

```ts
/** 本地時區日期字串，格式 YYYY-MM-DD */
export type LocalDate = string;

/** ISO 8601 時間戳記（UTC），例如 2026-10-24T04:43:00.000Z */
export type Timestamp = string;
```

### 5.2 記錄類型與組數值

```ts
export type TrackingType = 'weight_reps' | 'reps' | 'duration' | 'distance_duration';

/**
 * 組的數值。欄位為 null 表示「尚未填寫」，該組為不完整的組，
 * 不計入摘要與上次紀錄。values.type 必須等於所屬動作的 trackingType。
 */
export type SetValues =
  | { type: 'weight_reps'; weightKg: number | null; reps: number | null }
  | { type: 'reps'; reps: number | null; addedWeightKg: number | null }
  | { type: 'duration'; durationSec: number | null }
  | { type: 'distance_duration'; distanceKm: number | null; durationSec: number | null };
```

**欄位驗證規則**

| 欄位 | 必填（完整的組） | 規則 | 輸入方式 |
| --- | --- | --- | --- |
| `weightKg` | 是 | ≥ 0；以顯示單位輸入時最多 2 位小數 | `inputmode="decimal"` |
| `reps` | 是 | 正整數，1–9999 | `inputmode="numeric"` |
| `addedWeightKg` | 否 | ≥ 0；最多 2 位小數 | `inputmode="decimal"` |
| `durationSec` | 是 | > 0；以 `mm:ss` 輸入，mm 為 0–999，ss 為 0–59。也接受只輸入數字，最後兩位當作秒數（`130` 即 1:30），因為 iOS 數字鍵盤沒有冒號；儲存後一律顯示成 `mm:ss`（如 `01:30`） | `inputmode="numeric"` |
| `distanceKm` | 是 | ≥ 0；最多 2 位小數 | `inputmode="decimal"` |

不合法的輸入在欄位下方即時顯示錯誤，且不寫入儲存（保留上一個合法值或 null）。

### 5.3 部位與器材

```ts
export type Muscle =
  | 'chest'      // 胸
  | 'back'       // 背
  | 'shoulders'  // 肩
  | 'traps'      // 斜方肌
  | 'biceps'     // 二頭
  | 'triceps'    // 三頭
  | 'forearms'   // 前臂
  | 'quads'      // 股四頭
  | 'glutes'     // 臀
  | 'hamstrings' // 腿後側
  | 'calves'     // 小腿
  | 'core'       // 核心
  | 'full_body'; // 有氧／全身

export type Equipment =
  | 'barbell'        // 槓鈴（含 EZ 槓、T-bar）
  | 'dumbbell'       // 啞鈴
  | 'machine'        // 器械
  | 'cable'          // 繩索
  | 'bodyweight'     // 徒手
  | 'kettlebell'     // 壺鈴
  | 'cardio_machine' // 有氧器材
  | 'other';         // 其他（跳繩、腹輪等）
```

### 5.4 篩選分類映射

```ts
export type BrowseCategory =
  | 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps'
  | 'quads_glutes' | 'hamstrings' | 'calves' | 'core' | 'cardio_full_body';

export const CATEGORY_MUSCLES: Record<BrowseCategory, Muscle[]> = {
  chest: ['chest'],                 // 胸
  back: ['back'],                   // 背
  shoulders: ['shoulders', 'traps'],// 肩
  biceps: ['biceps', 'forearms'],   // 手臂：二頭
  triceps: ['triceps'],             // 手臂：三頭
  quads_glutes: ['quads', 'glutes'],// 腿：股四頭／臀
  hamstrings: ['hamstrings'],       // 腿：腿後側
  calves: ['calves'],               // 小腿
  core: ['core'],                   // 核心／腹部
  cardio_full_body: ['full_body'],  // 有氧／全身
};
```

規則：動作的**主要部位**任一映射到某分類，即屬於該分類；次要部位不參與分類。一個動作可屬於多個分類（例如槓鈴深蹲的主要部位為股四頭與臀，兩者皆映射到「腿：股四頭／臀」）。

### 5.5 實體

```ts
export interface ExerciseBase {
  /** 預設動作：固定 slug，例如 'barbell-bench-press'；自訂動作：'custom-' + UUID */
  id: string;
  nameZh: string;
  nameEn: string | null;
  /** 至少 1 個 */
  primaryMuscles: Muscle[];
  /** 不可與 primaryMuscles 重複 */
  secondaryMuscles: Muscle[];
  equipment: Equipment;
  trackingType: TrackingType;
}

/** 預設動作：寫在程式碼中的常數，不存入 IndexedDB */
export interface PresetExercise extends ExerciseBase {
  source: 'preset';
}

/** 自訂動作：存於 IndexedDB */
export interface CustomExercise extends ExerciseBase {
  source: 'custom';
  archived: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type Exercise = PresetExercise | CustomExercise;

export interface WorkoutSet {
  id: string; // UUID
  isWarmup: boolean;
  values: SetValues;
}

export interface WorkoutExercise {
  id: string; // UUID
  exerciseId: string;
  note: string; // 空字串表示無備註
  sets: WorkoutSet[]; // 陣列順序即組的順序
}

export interface Workout {
  date: LocalDate; // 主鍵，一天一筆
  exercises: WorkoutExercise[]; // 陣列順序即動作順序；至少 1 個，空了就刪除整筆 Workout
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** 體重：一天最多一筆 */
export interface BodyWeightEntry {
  date: LocalDate; // 主鍵
  weightKg: number; // > 0
  updatedAt: Timestamp;
}

export interface Settings {
  weightUnit: 'kg' | 'lb';
  theme: 'system' | 'light' | 'dark';
  heightCm: number | null; // 50–300；null 表示尚未填寫
  lastExportedAt: Timestamp | null;
}
```

### 5.6 IndexedDB 結構（Dexie）

| Table | 主鍵 | 索引 | 內容 |
| --- | --- | --- | --- |
| `workouts` | `&date` | `*exerciseIds`（multiEntry，衍生欄位） | `Workout` 加上 `exerciseIds: string[]` |
| `customExercises` | `&id` | `nameKey`（正規化後的中文名稱，用於檢查重複） | `CustomExercise` |
| `hiddenPresets` | `&id` | — | `{ id: string }` |
| `settings` | `&key` | — | 單筆 `{ key: 'settings', ...Settings }` |
| `bodyWeights` | `&date` | — | `BodyWeightEntry`（IndexedDB v2 新增） |

- IndexedDB v1 建立前 4 張資料表，v2 新增 `bodyWeights`；v1 時存的設定沒有 `heightCm`，讀取時以預設值 `null` 補上
- 體重與組的數值一樣經由待寫清單寫入（`FieldEdit` 的 `bodyWeight`），輸入後立刻重新整理也不會遺失

- `exerciseIds` 由 repository 在寫入時從 `exercises` 推導，用於查詢「上次紀錄」、「動作歷史」及「自訂動作是否已有紀錄」
- `nameKey = nameZh.trim().toLowerCase()`

### 5.7 匯出檔格式

```ts
export interface ExportFile {
  app: 'my-rep-book';
  schemaVersion: 2;
  exportedAt: Timestamp;
  data: {
    workouts: Workout[];             // 不含衍生欄位 exerciseIds
    customExercises: CustomExercise[];
    hiddenPresetIds: string[];
    bodyWeights: BodyWeightEntry[];  // 依日期由舊到新
    settings: Omit<Settings, 'lastExportedAt'>;
  };
}
```

- v1 → v2：加上空的 `bodyWeights`，`settings.heightCm` 設為 `null`

- 以 zod schema 驗證；遷移函式以 `migrations[from]` 形式逐版升級：`v1 → v2 → … → current`
- 匯入時若 workouts 引用了不存在的 `exerciseId`（例如未知的預設 slug），拒絕匯入並列出缺少的 ID

### 5.8 Domain 核心函式（純函式，皆需單元測試）

| 函式 | 說明 |
| --- | --- |
| `kgToLb` / `lbToKg` / `formatWeight` | 單位換算與顯示格式化 |
| `parseDuration('mm:ss') / formatDuration(sec)` | 時間輸入解析與顯示 |
| `validateSetValues(values)` | 回傳各欄位錯誤；判斷是否為完整的組 |
| `findLastPerformance(workouts, exerciseId, beforeDate)` | 回傳上次紀錄的日期與完整正式組 |
| `buildInitialSet(lastPerformance, trackingType)` | 依 US-02 規則產生第一組 |
| `cloneSetForNext(previousSet)` | 依 US-03 規則複製上一組 |
| `summarizeWorkout(workout, exercisesById)` | 每日摘要（§US-09） |
| `matchesSearch(exercise, query)` / `exercisesInCategory(...)` | 搜尋與分類篩選 |
| `getRecentExerciseIds(workouts, limit = 8)` | 最近使用 |
| `normalizeNameKey(name)` / `isDuplicateName(...)` | 名稱重複檢查 |
| `parseExportFile(json)` / `migrate(file)` | 匯入驗證與遷移 |
| `parseBodyWeightInput` / `parseHeightInput` | 體重、身高輸入解析與驗證 |
| `calculateBmi` / `formatBmi` | BMI 計算與顯示格式化 |

---

## 6. 畫面與流程

### 6.1 導覽

底部固定 tab bar，四個分頁：

| Tab | 路由 | 說明 |
| --- | --- | --- |
| 今天 | `/`、`/day/:date` | `/` 顯示今天；`/day/:date` 顯示指定日期，未來日期導回 `/` |
| 歷史 | `/history`、`/history/body-weight` | 月曆與日明細；體重紀錄清單 |
| 動作庫 | `/exercises`、`/exercises/:id` | 列表與動作詳情 |
| 設定 | `/settings` | 單位、身高、主題、匯出入、儲存狀態 |

自訂動作表單：`/exercises/new`、`/exercises/:id/edit`。加入動作選單為訓練頁上的全螢幕 Dialog（shadcn `Dialog` 或 `Drawer`），不改變路由。

### 6.2 訓練頁線框

```
┌─────────────────────────────┐
│  ‹   10/24（五）今天    ›    │  ← 日期切換；非今天時顯示「回到今天」
│  體重 [ 72.5 ] kg    BMI 23.7 │  ← 當天體重，輸入即儲存；有身高才顯示 BMI
│  3 個動作 · 9 組 · 2,340 kg  │  ← 每日摘要
│  有氧 20:00                  │
├─────────────────────────────┤
│ 槓鈴臥推           ↑ ↓ ⋯    │  ← ⋯：備註、刪除動作
│ 上次（10/20）60×8 60×8 62.5×6│
│  1  [熱] [ 40 ]kg × [ 10 ]  🗑│
│  2       [ 60 ]kg × [  8 ]  🗑│
│  3       [ 60 ]kg × [  8 ]  🗑│
│        ＋ 新增一組           │
├─────────────────────────────┤
│ 平板支撐           ↑ ↓ ⋯    │
│  1       [ 01:30 ]          🗑│
│        ＋ 新增一組           │
├─────────────────────────────┤
│        ＋ 加入動作           │
├─────────────────────────────┤
│  今天   歷史   動作庫   設定  │
└─────────────────────────────┘
```

### 6.3 主要流程

```
開 App → 今天頁 → 加入動作 → [選單：搜尋/最近/分類] → 選動作
       → 顯示上次 + 第一組預填 → 調整數值（自動儲存）
       → 新增一組（複製上一組）→ … → 加入下一個動作
```

### 6.4 shadcn/ui 元件對照

| 用途 | 元件 |
| --- | --- |
| 加入動作選單 | `Drawer`（手機）／`Dialog` |
| 分類 tabs | `Tabs` 或水平捲動 `ToggleGroup` |
| 搜尋 | `Input` |
| 刪除與復原 | `sonner` toast |
| 確認對話框 | `AlertDialog` |
| 月曆 | `Calendar`（react-day-picker，`weekStartsOn: 1`） |
| 自訂動作表單 | `Form`（react-hook-form + zod）、`Select`、`Checkbox`／`ToggleGroup` |
| 設定 | `RadioGroup`、`Switch`、`Button` |

---

## 7. 非功能需求

| 類別 | 需求 |
| --- | --- |
| 離線 | 首次載入後所有功能可離線使用（Service Worker 預先快取 App shell 與資源） |
| 效能 | 中階 Android 手機、4G 網路下首次載入 LCP < 2.5 秒；首次載入 JS（gzip）< 250 KB |
| 效能 | 1,000 筆訓練（約 3 年每日訓練）下，開啟訓練頁、加入動作、顯示上次紀錄的回應時間 < 100 ms |
| 資料安全 | 資料只存在本機，不傳送到任何伺服器；不使用任何分析或追蹤服務 |
| 可靠性 | 所有寫入透過 Dexie transaction；同時開啟多個分頁時資料一致（`useLiveQuery` 自動同步） |
| 無障礙 | 色彩對比符合 WCAG 2.1 AA；觸控目標 ≥ 44×44 px；所有操作可用鍵盤完成；所有輸入有 label；圖示按鈕有 `aria-label` |
| 手機輸入 | 數字欄位使用 `inputmode` 叫出數字鍵盤；避免輸入框聚焦時 iOS 自動放大（字級 ≥ 16px） |
| 瀏覽器支援 | iOS Safari 17+、Android Chrome 最新兩版、桌機 Chrome／Safari／Firefox 最新版 |
| 語言 | 介面繁體中文；日期格式 `M/D（週）` |
| 時區 | 日期以使用者裝置的本地時區判定「今天」 |

---

## 8. 技術架構

### 8.1 技術棧

| 類別 | 選擇 |
| --- | --- |
| 框架 | React 19 + TypeScript（strict） |
| 建置 | Vite |
| 套件管理 | npm。所有套件固定精確版本（不使用 `^`／`~`，以 `.npmrc` 的 `save-exact=true` 確保之後新增的套件也是）；Node 與 npm 版本由 Volta 固定 |
| 路由 | React Router |
| 樣式與 UI | Tailwind CSS + shadcn/ui |
| 本地資料庫 | Dexie.js（IndexedDB）+ `dexie-react-hooks`（`useLiveQuery`） |
| 表單 | react-hook-form（僅自訂動作表單） |
| 驗證 | zod（匯入 JSON、自訂動作表單） |
| PWA | vite-plugin-pwa |
| 單元／App 測試 | Vitest + React Testing Library + user-event + `fake-indexeddb`（測試接縫見 §9） |
| E2E | Playwright |
| Lint／格式 | ESLint + Prettier |
| CI | GitHub Actions |
| 部署 | GitHub Pages（GitHub Actions 建置後以 `actions/deploy-pages` 發佈，見 §8.4） |

不引入額外的全域狀態管理工具：持久資料由 `useLiveQuery` 讀取，UI 暫態用元件 state。

### 8.2 目錄結構

```
src/
├── app/                  # 路由、Providers、Layout、底部導覽
├── domain/               # 純 TypeScript：型別、規則、計算；不依賴 React／Dexie
│   ├── types.ts
│   ├── presets.ts        # 預設動作庫常數（附錄 A）
│   ├── categories.ts
│   ├── units.ts
│   ├── duration.ts
│   ├── validation.ts
│   ├── lastPerformance.ts
│   ├── summary.ts
│   ├── search.ts
│   └── backup/           # export schema、parse、migrations
├── data/
│   ├── repositories.ts   # Repository 介面
│   └── dexie/            # Dexie schema 與 Repository 實作
├── features/
│   ├── workout/          # 訓練頁、組輸入、加入動作選單
│   ├── exercises/        # 動作庫、動作詳情、自訂動作表單
│   ├── history/          # 月曆、日明細
│   └── settings/         # 設定、匯出入
├── components/ui/        # shadcn/ui 元件
└── lib/                  # 通用工具（日期、uuid 等）
e2e/                      # Playwright 測試
docs/                     # PRD 等文件
```

### 8.3 分層規則

- `domain` 不得 import `react`、`dexie` 或 `features/*`
- `features` 只透過 `data/repositories.ts` 的介面存取資料，不直接操作 Dexie table
- Repository 介面設計成可替換，未來接雲端同步時只換實作

```ts
export interface WorkoutRepository {
  getByDate(date: LocalDate): Promise<Workout | undefined>;
  save(workout: Workout): Promise<void>;
  delete(date: LocalDate): Promise<void>;
  listByExercise(exerciseId: string, options?: { before?: LocalDate; limit?: number; offset?: number }): Promise<Workout[]>;
  listDatesInRange(from: LocalDate, to: LocalDate): Promise<LocalDate[]>;
  hasAnyWithExercise(exerciseId: string): Promise<boolean>;
}
```

`ExerciseRepository`、`SettingsRepository`、`BackupRepository`（整份匯出／取代）依相同原則定義。

### 8.4 部署（GitHub Pages）

- 發佈網址為專案頁面 `https://<user>.github.io/my-rep-book/`，Vite `base` 設為 `/my-rep-book/`，React Router `basename` 同步設定
- GitHub Pages 不支援伺服器端 rewrite：建置後將 `index.html` 複製為 `404.html`，讓直接開啟 `/my-rep-book/day/2026-10-20` 等深層連結也能載入 SPA，由 React Router 處理路由
- PWA manifest 的 `start_url` 與 `scope` 設為 `/my-rep-book/`；Service Worker 的 `navigateFallback` 指向 `index.html`，安裝後離線開啟任何路由皆可用
- 只有 `main` 分支觸發部署；GitHub Pages 沒有 PR 預覽環境，PR 只跑 CI 不部署

---

## 9. 測試策略

### 9.1 測試接縫

測試只放在兩個接縫，再加上 E2E。接縫越少越好，而且盡量放在最高層。

| 接縫 | 工具 | 範圍 | 門檻 |
| --- | --- | --- | --- |
| **A（主要）：整個 App** | Vitest + React Testing Library + user-event + `fake-indexeddb` | 大多數 user story（見 §9.2） | 主要互動皆有測試 |
| **B（輔助）：domain 公開函式** | Vitest | 組合情境多的規則（見 §9.3）、預設動作庫完整性 | `src/domain` 行覆蓋率 ≥ 80%，CI 強制 |
| **E2E** | Playwright | 和接縫 A 相同的行為，在真實瀏覽器中跑 5 條關鍵流程（見 §9.4） | 全數通過 |

**不另外設的接縫**
- Repository 介面不另外寫測試，Dexie 實作透過接縫 A 間接驗證。
- 個別元件不單獨測試。

**好測試的定義**
- 只透過公開介面驗證外部行為：在接縫 A，就是使用者能操作、能看到的東西；在接縫 B，就是函式的輸入與輸出。
- 不 mock 內部模組，不斷言 Dexie table 的內容、元件 state 或 hook 的呼叫次數。
- 只要重構沒有改變行為，測試就不應該壞掉。
- 選取元素優先用 `getByRole`、`getByLabel`，不依賴 CSS class 或 test id。這也順便驗證了無障礙的 label 是否齊全。
- 測試名稱使用 §3 的名詞：上次紀錄、正式組、熱身組、完整的組、訓練量。

### 9.2 接縫 A：整個 App

- 渲染整個 App 的根元件。IndexedDB 換成 `fake-indexeddb`，「今天」固定在 2026-10-24，用 React Testing Library 搭配 user-event，像真實使用者一樣操作。
- 涵蓋範圍：
  - 記錄與自動儲存
  - 四種記錄類型的欄位與驗證
  - 新增一組、熱身組、備註、排序
  - 刪除與復原
  - 上次紀錄與預填，包含補記時的日期邊界
  - 日期切換與禁止未來日期
  - 每日摘要
  - 搜尋與分類
  - 隱藏、複製、自訂動作的完整生命週期
  - 月曆與動作歷史
  - 單位與主題
  - 匯出入，包含各種拒絕匯入的情況
- 每個測試開始前都重置資料庫。
- 測試資料透過 App 本身的行為建立：匯入功能（US-17）完成前用 UI 操作，完成後改走匯入 fixture JSON 的流程。不直接寫 table。
- M0 會建立這一層的測試架構（App 渲染 helper、資料庫重置、時間固定），作為之後所有測試的範本。

### 9.3 接縫 B：domain 公開函式

- 只用在組合情境多、在 UI 層測會很冗長的規則，對應 §5.8 的函式：
  - 單位換算與四捨五入
  - `mm:ss` 的解析與邊界值
  - 組數值驗證，以及完整的組的判斷
  - 上次紀錄：熱身組排除、不完整組排除、早於檢視日期、同日排除
  - 第一組預填與複製上一組
  - 每日摘要的各項計算
  - 搜尋比對與分類映射
  - 最近使用的排序、去重與上限
  - 名稱正規化與重名檢查
  - 匯出檔解析、驗證錯誤的位置、逐版遷移
- 預設動作庫完整性（見附錄 A.11）也在這一層測。
- 情境多的規則優先寫成 table-driven 測試。

### 9.4 E2E 關鍵流程

| ID | 流程 | 對應 |
| --- | --- | --- |
| E2E-01 | 今天加入槓鈴臥推，記錄 3 組，重新整理後資料仍在，摘要正確 | US-01、US-03、US-09 |
| E2E-02 | 預先建立 10/20 的紀錄 → 10/24 加入同動作 → 顯示上次並預填；切到 10/15 加入同動作 → 無上次紀錄 | US-02 |
| E2E-03 | 新增自訂動作（`distance_duration`）→ 加入今天訓練 → 記錄一組 → 動作庫可搜尋到 | US-10、US-11 |
| E2E-04 | 切到昨天補記一個動作 → 月曆昨天出現標點 → 明細正確；嘗試前往未來日期被導回 | US-08、US-14 |
| E2E-05 | 記錄資料 → 匯出 → 清空 → 匯入 → 資料一致；匯入格式錯誤檔案顯示錯誤且資料不變 | US-16、US-17 |

### 9.5 E2E 設定

- Playwright projects：`Mobile Chrome`（Pixel 7）、`Mobile Safari`（iPhone 14）
- 選取元素的原則和接縫 A 相同
- 每個測試開始前清空 IndexedDB。需要歷史資料的測試，在匯入功能完成前透過 UI 補記建立，完成後改用匯入 fixture JSON
- 測試中以 Playwright Clock API 固定「今天」為 2026-10-24
- M4 加入 axe 無障礙檢查，以及在 1,000 筆訓練下的效能量測（§7）

### 9.6 CI（GitHub Actions）

每次 push 與 PR 依序執行：`npm run lint` → `npm run typecheck` → `npm test -- --coverage` → `npm run build` → `npm run e2e`（安裝依賴用 `npm ci`）。任一步失敗即失敗；E2E 失敗時上傳 Playwright trace 作為 artifact。

push 到 `main` 且上述步驟全部通過後，以 `actions/upload-pages-artifact` 上傳 `dist/`，再以 `actions/deploy-pages` 部署到 GitHub Pages。E2E 在與正式環境相同的 `base` 路徑（`/my-rep-book/`）下對 `vite preview` 執行，確保路徑設定錯誤能在 CI 中被發現。

---

## 10. 里程碑

| 里程碑 | 內容 | 完成標準 |
| --- | --- | --- |
| **M0** 專案骨架與 CI | Vite + React 19 + TS、Tailwind + shadcn/ui、React Router 與底部導覽空殼、Vitest、Playwright、ESLint／Prettier、GitHub Actions、GitHub Pages 部署 | CI 全綠；GitHub Pages 網址可開啟四個空分頁，且直接開啟深層連結（如 `/my-rep-book/settings`）不會 404 |
| **M1** 動作庫與自訂動作 | domain 型別、預設動作常數、分類映射、搜尋；Dexie schema 與 Repository；動作庫分頁、動作詳情（不含歷史）、自訂動作 CRUD、隱藏與複製 | US-10～US-13；E2E-03（不含加入訓練的部分） |
| **M2** 每日記錄與自動帶入 | 訓練頁、組輸入（4 種記錄類型）、熱身、備註、排序、刪除與復原、上次紀錄與預填、每日摘要、日期切換與補記 | US-01～US-09；E2E-01、E2E-02、E2E-03 完整 |
| **M3** 歷史與匯出入 | 月曆、日明細、動作歷史、設定頁（單位、主題）、匯出、匯入與遷移框架 | US-14～US-19；E2E-04、E2E-05 |
| **M4** PWA 與上線 | vite-plugin-pwa、離線快取、安裝、更新提示、持久儲存、效能與無障礙檢查 | US-20、US-21；§7 非功能需求驗收；正式部署 |

---

## 11. v2 規劃（未來）

| 功能 | 說明 |
| --- | --- |
| 訓練範本／課表 | 例如「推日」，一鍵帶入多個動作 |
| 進度圖表 | 單一動作的最大重量、估算 1RM、訓練量趨勢；每週訓練量依部位統計 |
| 個人最佳紀錄（PR） | 自動偵測並標示新 PR |
| 組間休息計時器 | 記錄一組後自動開始倒數，支援通知與震動 |
| RPE／RIR | 每組強度記錄 |
| Drop set、超級組 | 組類型與動作群組 |
| 拖曳排序 | 取代上移／下移按鈕 |
| 合併匯入、CSV 匯出 | 匯入時與現有資料合併；匯出成試算表 |
| 帳號與雲端同步 | 替換 Repository 實作，支援多裝置 |
| 一天多個 session | 將 Workout 主鍵從日期改為 ID |

---

## 12. 撰寫 PRD 時補充的決定（待確認）

以下細節在訪談中沒有逐一討論，撰寫時依既有決策推導，請審閱：

1. **篩選分類為 10 大類**：原動作清單分為胸、背、肩、二頭、三頭、股四頭／臀、腿後側、小腿、核心、有氧／全身，共 10 類（訪談中誤寫為 9 類）
2. **分類只看主要部位**：次要部位不參與分類篩選
3. **組欄位允許 null**：自動儲存下，沒有上次紀錄的第一組欄位為空白；不完整的組不計入摘要與上次紀錄
4. **訓練沒有任何動作時刪除整筆**：月曆只對至少有一個動作的日期標點
5. **自訂動作名稱不可與預設動作重名**：「複製為自訂動作」時預填「{原名}（自訂）」以避開重名
6. **有氧總時間只計算 `distance_duration`**：平板支撐、跳繩（`duration`）不計入
7. **lb 換算儲存不四捨五入**：只在顯示時四捨五入到 0.1
8. **匯入引用未知動作 ID 時拒絕匯入**
9. **GitHub Pages 路由採 `404.html` fallback 而非 HashRouter**：網址保持乾淨（`/day/2026-10-20` 而非 `/#/day/2026-10-20`）；代價是首次直接開啟深層連結時 HTTP 狀態碼為 404（畫面正常），安裝 PWA 後由 Service Worker 接手則不受影響

---

## 附錄 A：預設動作庫

共 66 個動作。ID 為固定 slug，發佈後不可更改。

部位代碼：胸 `chest`、背 `back`、肩 `shoulders`、斜方肌 `traps`、二頭 `biceps`、三頭 `triceps`、前臂 `forearms`、股四頭 `quads`、臀 `glutes`、腿後側 `hamstrings`、小腿 `calves`、核心 `core`、有氧／全身 `full_body`。

### A.1 胸

| ID | 中文 | 英文 | 主要部位 | 次要部位 | 器材 | 記錄類型 |
| --- | --- | --- | --- | --- | --- | --- |
| `barbell-bench-press` | 槓鈴臥推 | Barbell Bench Press | 胸 | 三頭、肩 | 槓鈴 | weight_reps |
| `dumbbell-bench-press` | 啞鈴臥推 | Dumbbell Bench Press | 胸 | 三頭、肩 | 啞鈴 | weight_reps |
| `incline-press` | 上斜臥推 | Incline Press | 胸 | 肩、三頭 | 槓鈴 | weight_reps |
| `decline-press` | 下斜臥推 | Decline Press | 胸 | 三頭 | 槓鈴 | weight_reps |
| `dumbbell-fly` | 啞鈴飛鳥 | Dumbbell Fly | 胸 | 肩 | 啞鈴 | weight_reps |
| `pec-deck` | 器械夾胸 | Pec Deck | 胸 | 肩 | 器械 | weight_reps |
| `cable-crossover` | 繩索夾胸 | Cable Crossover | 胸 | 肩 | 繩索 | weight_reps |
| `push-up` | 伏地挺身 | Push-up | 胸 | 三頭、肩 | 徒手 | reps |
| `chest-dip` | 雙槓撐體（偏胸） | Dip (Chest) | 胸 | 三頭、肩 | 徒手 | reps |

### A.2 背

| ID | 中文 | 英文 | 主要部位 | 次要部位 | 器材 | 記錄類型 |
| --- | --- | --- | --- | --- | --- | --- |
| `pull-up` | 引體向上 | Pull-up | 背 | 二頭 | 徒手 | reps |
| `lat-pulldown` | 滑輪下拉 | Lat Pulldown | 背 | 二頭 | 繩索 | weight_reps |
| `barbell-row` | 槓鈴划船 | Barbell Row | 背 | 二頭 | 槓鈴 | weight_reps |
| `one-arm-dumbbell-row` | 啞鈴單臂划船 | One-arm Dumbbell Row | 背 | 二頭 | 啞鈴 | weight_reps |
| `seated-cable-row` | 坐姿划船 | Seated Cable Row | 背 | 二頭 | 繩索 | weight_reps |
| `t-bar-row` | T-bar 划船 | T-bar Row | 背 | 二頭 | 槓鈴 | weight_reps |
| `deadlift` | 硬舉 | Deadlift | 背 | 腿後側、臀、斜方肌、前臂 | 槓鈴 | weight_reps |
| `straight-arm-pulldown` | 直臂下拉 | Straight-arm Pulldown | 背 | — | 繩索 | weight_reps |
| `back-extension` | 超人式 | Back Extension | 背 | 臀、腿後側 | 徒手 | reps |

### A.3 肩

| ID | 中文 | 英文 | 主要部位 | 次要部位 | 器材 | 記錄類型 |
| --- | --- | --- | --- | --- | --- | --- |
| `overhead-press` | 槓鈴肩推 | Overhead Press | 肩 | 三頭、核心 | 槓鈴 | weight_reps |
| `dumbbell-shoulder-press` | 啞鈴肩推 | Dumbbell Shoulder Press | 肩 | 三頭 | 啞鈴 | weight_reps |
| `lateral-raise` | 啞鈴側平舉 | Lateral Raise | 肩 | 斜方肌 | 啞鈴 | weight_reps |
| `front-raise` | 啞鈴前平舉 | Front Raise | 肩 | — | 啞鈴 | weight_reps |
| `rear-delt-fly` | 俯身飛鳥 | Rear Delt Fly | 肩 | 背、斜方肌 | 啞鈴 | weight_reps |
| `face-pull` | 面拉 | Face Pull | 肩 | 斜方肌、背 | 繩索 | weight_reps |
| `shrug` | 聳肩 | Shrug | 斜方肌 | 前臂 | 啞鈴 | weight_reps |
| `arnold-press` | 阿諾肩推 | Arnold Press | 肩 | 三頭 | 啞鈴 | weight_reps |

### A.4 手臂：二頭

| ID | 中文 | 英文 | 主要部位 | 次要部位 | 器材 | 記錄類型 |
| --- | --- | --- | --- | --- | --- | --- |
| `barbell-curl` | 槓鈴彎舉 | Barbell Curl | 二頭 | 前臂 | 槓鈴 | weight_reps |
| `dumbbell-curl` | 啞鈴彎舉 | Dumbbell Curl | 二頭 | 前臂 | 啞鈴 | weight_reps |
| `hammer-curl` | 錘式彎舉 | Hammer Curl | 二頭 | 前臂 | 啞鈴 | weight_reps |
| `preacher-curl` | 牧師椅彎舉 | Preacher Curl | 二頭 | — | 槓鈴 | weight_reps |
| `cable-curl` | 繩索彎舉 | Cable Curl | 二頭 | 前臂 | 繩索 | weight_reps |

### A.5 手臂：三頭

| ID | 中文 | 英文 | 主要部位 | 次要部位 | 器材 | 記錄類型 |
| --- | --- | --- | --- | --- | --- | --- |
| `triceps-pushdown` | 繩索下壓 | Triceps Pushdown | 三頭 | — | 繩索 | weight_reps |
| `skull-crusher` | 仰臥臂屈伸 | Skull Crusher | 三頭 | — | 槓鈴 | weight_reps |
| `overhead-triceps-extension` | 過頭臂屈伸 | Overhead Triceps Extension | 三頭 | — | 啞鈴 | weight_reps |
| `close-grip-bench-press` | 窄握臥推 | Close-grip Bench Press | 三頭 | 胸、肩 | 槓鈴 | weight_reps |
| `triceps-dip` | 雙槓撐體（偏三頭） | Dip (Triceps) | 三頭 | 胸、肩 | 徒手 | reps |
| `bench-dip` | 椅上撐體 | Bench Dip | 三頭 | 肩 | 徒手 | reps |

### A.6 腿：股四頭／臀

| ID | 中文 | 英文 | 主要部位 | 次要部位 | 器材 | 記錄類型 |
| --- | --- | --- | --- | --- | --- | --- |
| `barbell-squat` | 槓鈴深蹲 | Barbell Squat | 股四頭、臀 | 腿後側、核心 | 槓鈴 | weight_reps |
| `front-squat` | 前蹲舉 | Front Squat | 股四頭 | 臀、核心 | 槓鈴 | weight_reps |
| `leg-press` | 腿推機 | Leg Press | 股四頭 | 臀、腿後側 | 器械 | weight_reps |
| `leg-extension` | 腿伸展 | Leg Extension | 股四頭 | — | 器械 | weight_reps |
| `lunge` | 弓箭步 | Lunge | 股四頭、臀 | 腿後側 | 啞鈴 | weight_reps |
| `bulgarian-split-squat` | 保加利亞分腿蹲 | Bulgarian Split Squat | 股四頭、臀 | 腿後側 | 啞鈴 | weight_reps |
| `hack-squat` | 哈克深蹲 | Hack Squat | 股四頭 | 臀 | 器械 | weight_reps |
| `hip-thrust` | 臀推 | Hip Thrust | 臀 | 腿後側 | 槓鈴 | weight_reps |

### A.7 腿：腿後側

| ID | 中文 | 英文 | 主要部位 | 次要部位 | 器材 | 記錄類型 |
| --- | --- | --- | --- | --- | --- | --- |
| `romanian-deadlift` | 羅馬尼亞硬舉 | Romanian Deadlift | 腿後側 | 臀、背 | 槓鈴 | weight_reps |
| `leg-curl` | 腿彎舉 | Leg Curl | 腿後側 | — | 器械 | weight_reps |
| `good-morning` | 早安式 | Good Morning | 腿後側 | 臀、背 | 槓鈴 | weight_reps |
| `stiff-leg-deadlift` | 直腿硬舉 | Stiff-leg Deadlift | 腿後側 | 臀、背 | 槓鈴 | weight_reps |

### A.8 小腿

| ID | 中文 | 英文 | 主要部位 | 次要部位 | 器材 | 記錄類型 |
| --- | --- | --- | --- | --- | --- | --- |
| `standing-calf-raise` | 站姿提踵 | Standing Calf Raise | 小腿 | — | 器械 | weight_reps |
| `seated-calf-raise` | 坐姿提踵 | Seated Calf Raise | 小腿 | — | 器械 | weight_reps |
| `leg-press-calf-raise` | 腿推機提踵 | Leg Press Calf Raise | 小腿 | — | 器械 | weight_reps |

### A.9 核心／腹部

| ID | 中文 | 英文 | 主要部位 | 次要部位 | 器材 | 記錄類型 |
| --- | --- | --- | --- | --- | --- | --- |
| `crunch` | 捲腹 | Crunch | 核心 | — | 徒手 | reps |
| `hanging-leg-raise` | 懸垂舉腿 | Hanging Leg Raise | 核心 | 前臂 | 徒手 | reps |
| `plank` | 平板支撐 | Plank | 核心 | 肩 | 徒手 | duration |
| `russian-twist` | 俄羅斯轉體 | Russian Twist | 核心 | — | 徒手 | reps |
| `ab-wheel-rollout` | 腹輪 | Ab Wheel Rollout | 核心 | 肩 | 其他 | reps |
| `cable-crunch` | 繩索捲腹 | Cable Crunch | 核心 | — | 繩索 | weight_reps |
| `lying-leg-raise` | 仰臥抬腿 | Lying Leg Raise | 核心 | — | 徒手 | reps |

### A.10 有氧／全身

| ID | 中文 | 英文 | 主要部位 | 次要部位 | 器材 | 記錄類型 |
| --- | --- | --- | --- | --- | --- | --- |
| `treadmill` | 跑步機 | Treadmill | 有氧／全身 | — | 有氧器材 | distance_duration |
| `stationary-bike` | 飛輪／腳踏車 | Stationary Bike | 有氧／全身 | 股四頭 | 有氧器材 | distance_duration |
| `rowing-machine` | 划船機 | Rowing Machine | 有氧／全身 | 背 | 有氧器材 | distance_duration |
| `elliptical` | 橢圓機 | Elliptical | 有氧／全身 | — | 有氧器材 | distance_duration |
| `jump-rope` | 跳繩 | Jump Rope | 有氧／全身 | 小腿 | 其他 | duration |
| `kettlebell-swing` | 壺鈴擺盪 | Kettlebell Swing | 有氧／全身 | 臀、腿後側、核心 | 壺鈴 | weight_reps |
| `burpee` | 波比跳 | Burpee | 有氧／全身 | — | 徒手 | reps |

### A.11 TypeScript 範例（`src/domain/presets.ts`）

```ts
import type { PresetExercise } from './types';

export const PRESET_EXERCISES: readonly PresetExercise[] = [
  {
    source: 'preset',
    id: 'barbell-bench-press',
    nameZh: '槓鈴臥推',
    nameEn: 'Barbell Bench Press',
    primaryMuscles: ['chest'],
    secondaryMuscles: ['triceps', 'shoulders'],
    equipment: 'barbell',
    trackingType: 'weight_reps',
  },
  {
    source: 'preset',
    id: 'plank',
    nameZh: '平板支撐',
    nameEn: 'Plank',
    primaryMuscles: ['core'],
    secondaryMuscles: ['shoulders'],
    equipment: 'bodyweight',
    trackingType: 'duration',
  },
  {
    source: 'preset',
    id: 'treadmill',
    nameZh: '跑步機',
    nameEn: 'Treadmill',
    primaryMuscles: ['full_body'],
    secondaryMuscles: [],
    equipment: 'cardio_machine',
    trackingType: 'distance_duration',
  },
  // …其餘依附錄 A.1–A.10
];
```

單元測試需驗證預設動作庫的完整性：ID 唯一、符合 slug 格式、中文名稱唯一、`primaryMuscles` 至少 1 個、主要與次要部位不重複、每個篩選分類至少有 1 個動作。
