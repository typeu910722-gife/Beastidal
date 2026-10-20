# 給 Claude 的專案規則

## 溝通

- **一律用繁體中文回覆使用者**：進度回報、說明、問題、總結，全部都用中文。不要切回英文，即使前一則訊息是系統通知或英文的工具輸出也一樣。
- 程式碼、程式註解、commit 訊息和 PR 說明維持英文，跟現有慣例一致。

## 工作流程

- 每一輪做完：跑完整檢查（`npm test`、`npm run lint`、`npm run format:check`、`npm run check`、`npm run smoke`），更新版本號、`dist/sw.js` 和 modulepreload 清單（`node scripts/preload.mjs`），開 PR，CI 通過後合併到 main（使用者已授權自動合併），確認 Cloudflare 有部署，然後用中文回報。
- 效能數據要實測，未部署不能給網址，未測試不能說通過。
- 每做完一個階段（合併到 main 之後）就用中文回報，然後冷卻 1 小時，時間到才開始下一個階段。
