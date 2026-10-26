# GitHub Pages 的深層連結用 404.html fallback，不用 HashRouter

GitHub Pages 不支援伺服器端 rewrite，直接開啟 `/my-rep-book/day/2026-10-20` 這類深層連結會得到 404。我們在建置時把 `index.html` 複製成 `404.html`，讓 Pages 以它回應任何找不到的路徑，再由 React Router 處理路由，而不改用 HashRouter（`/#/day/2026-10-20`）。這樣網址保持乾淨，PWA 的 `scope` 與 Service Worker 的 `navigateFallback` 也能照一般路徑設定。

## Consequences

- 第一次直接開啟深層連結時 HTTP 狀態碼是 404，畫面正常；安裝 PWA 後由 Service Worker 回應，不受影響。
- `vite preview` 本身會 fallback 到 `index.html`，測不出這個行為；新增深層路由時要加進 `e2e/deep-link.spec.ts`，那裡模擬 Pages 以 404 回傳 `dist/404.html`。
- 若之後換到支援 rewrite 的主機，可以拿掉 `404.html`，路由不用改。
