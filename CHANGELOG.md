# 變更紀錄

本檔案由 [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) 依照 [Conventional Commits](https://www.conventionalcommits.org/) 規範的 commit 訊息自動產生，請勿手動編輯內容，執行 `npm run release` 即可更新。

## [0.1.4](https://github.com/re757575/my-rep-book/compare/v0.1.3...v0.1.4) (2026-10-28)

### Features

* **history:** 月曆標點依當天組數分級，看出訓練的輕重節奏 ([5a7131d](https://github.com/re757575/my-rep-book/commit/5a7131d315b2cc014f8cf81023b8646f0ee237c4))

### Bug Fixes

* **history:** 組數趨勢切換區間時不再用舊資料閃一下 0 組 ([c615929](https://github.com/re757575/my-rep-book/commit/c615929c330c098fb54c9e2bee445445c207eda8))
## [0.1.3](https://github.com/re757575/my-rep-book/compare/v0.1.2...v0.1.3) (2026-10-28)

### Features

* **history:** 歷史頁新增組數趨勢，看各部位每週組數的長期走勢 ([9e52954](https://github.com/re757575/my-rep-book/commit/9e529546668a6ef77658462e41e27098183721f7))

### Bug Fixes

* **exercises:** 個人紀錄卡片的說明各占一行，日期不再被拆成兩半 ([635a963](https://github.com/re757575/my-rep-book/commit/635a963e4c6719f9d3eef5bf4187090d78fcd33a))
## [0.1.2](https://github.com/re757575/my-rep-book/compare/v0.1.1...v0.1.2) (2026-10-28)

### Features

* **history:** 歷史頁新增訓練節奏，看本週練幾天與連續幾週有練 ([57227b0](https://github.com/re757575/my-rep-book/commit/57227b04578d817aa5f62058bcd859b3cf1be954))

### Bug Fixes

* **pwa:** manifest 補上明確的 id ([1346b9d](https://github.com/re757575/my-rep-book/commit/1346b9df751ab013aca443581f861ce34f789239))
## [0.1.1](https://github.com/re757575/my-rep-book/compare/v0.1.0...v0.1.1) (2026-10-28)

### Features

* **workout:** 組可以勾選完成，完成後整列鎖住，看得出做到哪一組 ([e8640f1](https://github.com/re757575/my-rep-book/commit/e8640f1e50314a36972a3d0c3db2bc5aba75409c))
## 0.1.0 (2026-10-28)

### Features

* **app:** 上線驗收的無障礙檢查、鍵盤操作與 LCP 改善 ([b9a650b](https://github.com/re757575/my-rep-book/commit/b9a650b1c97f9a0139b94c570df2c59314268f49)), references [#20](https://github.com/re757575/my-rep-book/issues/20)
* **app:** 建立專案骨架、底部分頁與測試架構 ([5dd1103](https://github.com/re757575/my-rep-book/commit/5dd1103979c92de975980628e5d1a09a2ac46b87)), references [#2](https://github.com/re757575/my-rep-book/issues/2)
* **body-weight:** 新增每日體重、身高設定、BMI 與體重紀錄清單 ([87ace9d](https://github.com/re757575/my-rep-book/commit/87ace9d36bf6605763c271e59b1933ee8458ad89))
* **body-weight:** 體重紀錄頁新增趨勢圖，看每日體重與 7 日平均的走勢 ([adbb835](https://github.com/re757575/my-rep-book/commit/adbb83529346899a50d32ccc7983864542566c9f))
* **body-weight:** 體重紀錄顯示 7 日平均與比上週增減 ([6aa44c9](https://github.com/re757575/my-rep-book/commit/6aa44c9cde0b64d239f1f8b81d80bf5640ff0586))
* **exercises:** 自訂動作封存、刪除與記錄類型鎖定 ([c964fdf](https://github.com/re757575/my-rep-book/commit/c964fdf58692959f51183c1b45de19b67c897274)), references [#12](https://github.com/re757575/my-rep-book/issues/12)
* **exercises:** 動作詳情的歷史紀錄可收合，預設只展開最近 3 筆 ([a9928cf](https://github.com/re757575/my-rep-book/commit/a9928cf45a9ff4e935fea9b11ecf782af8ffdb7f))
* **exercises:** 動作詳情頁顯示動作歷史，分批載入並可跳到該日訓練 ([765c1e2](https://github.com/re757575/my-rep-book/commit/765c1e2b79391997bc63512fe8049800c3494fea)), references [#16](https://github.com/re757575/my-rep-book/issues/16)
* **exercises:** 動作詳情新增進度圖表，看最大重量與 1RM、訓練量的走勢 ([160cf7b](https://github.com/re757575/my-rep-book/commit/160cf7b6120d447bb8fb39b4ea002c2ac6f99129))
* **exercises:** 動作詳情顯示個人紀錄、估算 1RM 與每次的進度 ([b4bd1b7](https://github.com/re757575/my-rep-book/commit/b4bd1b756e39b77a268a68689a49bbbf3145d80b))
* **exercises:** 新增動作詳情、隱藏預設動作與 IndexedDB schema v1 ([dce23e3](https://github.com/re757575/my-rep-book/commit/dce23e3d8c806c9216914f5696c0118d5935fad1)), references [#5](https://github.com/re757575/my-rep-book/issues/5)
* **exercises:** 新增預設動作庫與搜尋、分類篩選 ([0d07cfc](https://github.com/re757575/my-rep-book/commit/0d07cfce18bbb6c39a38af037f61de92dd64c7c3)), references [#4](https://github.com/re757575/my-rep-book/issues/4)
* **exercises:** 新增與編輯自訂動作、複製預設動作 ([302c986](https://github.com/re757575/my-rep-book/commit/302c9865f1e6d5dfe7eb258edf1535e3fea675a7)), references [#6](https://github.com/re757575/my-rep-book/issues/6)
* **history:** 一鍵產生 AI 提示詞，把訓練紀錄貼到外部 AI 分析 ([9e6dc8b](https://github.com/re757575/my-rep-book/commit/9e6dc8befb2e42c47ba09f61868e781428d43dd5))
* **history:** 進入歷史頁預設選取今天，直接顯示今天的明細 ([687334a](https://github.com/re757575/my-rep-book/commit/687334af1c9c4f7f79f2178b26c78809e6f3480a))
* **history:** 歷史日明細新增「複製到今天」，重複過去的課表 ([59c4b17](https://github.com/re757575/my-rep-book/commit/59c4b178a2b9d73cee27c21ec323df1aa5ad4bdf))
* **history:** 歷史月曆標示有訓練的日期，點選日期查看日明細 ([1ac0d4f](https://github.com/re757575/my-rep-book/commit/1ac0d4f68eca2e2a928eed0ea4caf6b938b316ca)), references [#15](https://github.com/re757575/my-rep-book/issues/15)
* **history:** 歷史頁顯示每週／每月統計與各部位組數 ([b16b934](https://github.com/re757575/my-rep-book/commit/b16b9342dfbd023c5785a020e0c11c70e73be896))
* **pwa:** 支援離線使用、加入主畫面、新版本提示與持久儲存 ([abbb56f](https://github.com/re757575/my-rep-book/commit/abbb56fae3288bd41df68bb83afce375fe6a0f48)), references [#19](https://github.com/re757575/my-rep-book/issues/19)
* **rest-timer:** 新增組間休息計時器，新增一組或填完一組後自動倒數 ([563266d](https://github.com/re757575/my-rep-book/commit/563266df15876ff8d841530a27399fdeb358bf8a))
* **settings:** 設定頁可切換重量單位與外觀主題 ([749e0e5](https://github.com/re757575/my-rep-book/commit/749e0e57e2ba7cd3cafe860a21f00b8e12304eef)), references [#17](https://github.com/re757575/my-rep-book/issues/17)
* **settings:** 設定頁可匯出與匯入備份檔，並顯示上次匯出時間 ([84e4ec8](https://github.com/re757575/my-rep-book/commit/84e4ec8e41d6efbade7a2305a9b7f3b05d155392)), references [#18](https://github.com/re757575/my-rep-book/issues/18)
* **settings:** 設定頁顯示 App 版本號，並加入 release 流程 ([3cf3b48](https://github.com/re757575/my-rep-book/commit/3cf3b489d55e346c438b2788d0404475b2ad1cfb))
* **settings:** 新增生日設定，AI 提示詞帶入年齡 ([48e15de](https://github.com/re757575/my-rep-book/commit/48e15de0420ef432e2a37ca9e48ca806a36af5bc))
* **templates:** 新增訓練範本，可存成範本並一鍵從範本加入動作 ([cfa2692](https://github.com/re757575/my-rep-book/commit/cfa2692132faf71380df3ce43e6480928d4b3bd8))
* **workout:** 今日訓練可加入動作並記錄重量×次數 ([454877d](https://github.com/re757575/my-rep-book/commit/454877d2894adb8d2bef4860e576bcfe68303439)), references [#7](https://github.com/re757575/my-rep-book/issues/7)
* **workout:** 支援次數、時間、距離＋時間三種記錄類型與輸入驗證 ([45a13a0](https://github.com/re757575/my-rep-book/commit/45a13a063dba2f388261333fab203d0e13d04875)), references [#8](https://github.com/re757575/my-rep-book/issues/8)
* **workout:** 加入動作選單顯示最近使用並可就地新增自訂動作 ([2ec50e7](https://github.com/re757575/my-rep-book/commit/2ec50e732f142d9bc56015f491ab461b7beae8d6)), references [#13](https://github.com/re757575/my-rep-book/issues/13)
* **workout:** 每一組可以選填強度，用 RPE 或 RIR 記錄吃力程度 ([63ef293](https://github.com/re757575/my-rep-book/commit/63ef29363c00526fd851f636a4ccd0afa76ff634))
* **workout:** 每組旁顯示上次同一組的數值，方便決定要不要加重 ([e1a16e4](https://github.com/re757575/my-rep-book/commit/e1a16e4293e5b6dd359f01b437ac32cc6da54468))
* **workout:** 重量與次數欄位加 −／+，單手不用叫出鍵盤就能微調 ([034c5cb](https://github.com/re757575/my-rep-book/commit/034c5cb302ca8242192b597c57e9918696cf1902))
* **workout:** 訓練頁可切換日期並補記過去的訓練 ([bc4e08a](https://github.com/re757575/my-rep-book/commit/bc4e08a6e16035d92bf48530a08bbf1b290b6e67)), references [#9](https://github.com/re757575/my-rep-book/issues/9)
* **workout:** 訓練頁頂部顯示每日摘要 ([f29d12f](https://github.com/re757575/my-rep-book/commit/f29d12fcc0d3eb4b22d5380b8387e36d626081ff)), references [#14](https://github.com/re757575/my-rep-book/issues/14)
* **workout:** 訓練頁新增「全部收合／展開」，動作多時快速回到總覽 ([dcb42fd](https://github.com/re757575/my-rep-book/commit/dcb42fd760b5ed332fd9aaec7e6ea1ba9f2523d1))
* **workout:** 訓練頁新增鎖定開關，非今天的紀錄預設鎖定 ([0ba3c58](https://github.com/re757575/my-rep-book/commit/0ba3c58062aded68b4ba666a96cf5e6176886fa4))
* **workout:** 訓練動作可收合，收合後顯示該動作的總計 ([64ea9e2](https://github.com/re757575/my-rep-book/commit/64ea9e2be66a7d632bc894a417289372e19418fb))
* **workout:** 訓練動作可寫備註、調整順序，刪除組或動作可復原 ([3fff08a](https://github.com/re757575/my-rep-book/commit/3fff08ac21ff498017e861278d6cf20ee2c0ba48)), references [#10](https://github.com/re757575/my-rep-book/issues/10)
* **workout:** 記錄當下在破紀錄的那一組旁標示「新紀錄」 ([5787449](https://github.com/re757575/my-rep-book/commit/5787449b5ce18a4d9ce99c51b52c5a093701ab5d))
* **workout:** 熱身按鈕擴充為組類型，可標示正式、熱身、遞減、力竭 ([3f073f4](https://github.com/re757575/my-rep-book/commit/3f073f48e3bd6a52711c389dd398f4b6080b5956))
* **workout:** 熱身組標記、顯示上次紀錄並預填第一組 ([e051c82](https://github.com/re757575/my-rep-book/commit/e051c82d0d6f88ecc29d98ddbd67acb8e18fb4ad)), references [#11](https://github.com/re757575/my-rep-book/issues/11)

### Bug Fixes

* **history:** 換日期時重新掛載日明細，不再短暫顯示上一天的內容 ([ab24cd2](https://github.com/re757575/my-rep-book/commit/ab24cd2770a2eaa86e9b2189d8888cdc1ff3e227))
* **workout:** 時間欄位只打數字就自動補上冒號，手機鍵盤也能輸入 ([933dba1](https://github.com/re757575/my-rep-book/commit/933dba16a9627784ee73ae7dccc8e60360d303a6))
* **workout:** 輸入後立刻重新整理或關閉頁面也不遺失組的數值與備註 ([c4a95ff](https://github.com/re757575/my-rep-book/commit/c4a95ff4a0afa180b94b994066bc0ba576d5684f)), references [#21](https://github.com/re757575/my-rep-book/issues/21)

### Performance Improvements

* **app:** 動態載入非首頁的分頁與元件，首次載入的 JS 降到 250 KB 內 ([c8575fb](https://github.com/re757575/my-rep-book/commit/c8575fb824ffd798b8c0aedde42c225aaeea6397)), references [#20](https://github.com/re757575/my-rep-book/issues/20)

### Build System

* **bundle:** 首次載入的 JS 與基準比對，多超過 1 KB 就失敗 ([ab9321f](https://github.com/re757575/my-rep-book/commit/ab9321f7a36ef54e2b67be26941bf38d7c579ebd))
* **lint:** 禁止 domain 模組最上層建立 Intl 格式器 ([576af04](https://github.com/re757575/my-rep-book/commit/576af04663f2d56eee23f5f8fdad70998534725c))
* **lint:** 檢查 PRD 的使用者故事編號不重複且節內遞增 ([30f6698](https://github.com/re757575/my-rep-book/commit/30f6698b58ab60466dc4388235e0439126a738fd))
