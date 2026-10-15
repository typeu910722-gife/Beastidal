# 線上留言碑（選用）

> 0.60：已設定完成。D1 資料庫 `beastidal-community`（`c635848b-…`）在 Cloudflare 後台建好並套用了資料表，`wrangler.toml` 已加上 Worker 和資料庫，`communityUrl` 指向 `https://beastidal.yzprojecttw.com`。部署 `main` 後即上線。本機（localhost）測試時遊戲會自動改用模擬居民，不會寫進正式留言碑。

0.48 的留言碑預設是**模擬**的：其他居民的留言、共鳴和回應都由 `dist/comms.js` 產生，離線、下載版、沒有伺服器都能玩。

想讓留言碑變成真正的玩家互傳，需要在 Cloudflare 部署 `worker/community.js` 和一個 D1 資料庫。完成後，其他玩家的留言會出現在每個人的留言碑上；沒有網路或伺服器出錯時，遊戲會自動退回模擬。

## 為什麼不用擔心不當言論

留言只能由遊戲內建的**句型 + 詞**組成（例如「有人聽到＿嗎？」＋「嗶嗶聲」）。伺服器只收這兩個代號，並用和遊戲同一份清單（`dist/comms.js`）檢查，所以不存在自由輸入的文字。每台裝置每天最多 3 則，每則留言每台裝置只能共鳴一次。

## 一鍵部署（0.59）

需要 Cloudflare API 權杖（權限：Workers Scripts 編輯、D1 編輯；要用自訂網域再加 Workers Routes／Zone DNS 編輯）和帳號 ID：

```sh
CLOUDFLARE_API_TOKEN=… CLOUDFLARE_ACCOUNT_ID=… npm run deploy:community
```

腳本會：找到或建立 D1 資料庫 `beastidal-community` → 套用 `worker/schema.sql` → 改寫 `wrangler.toml`（加上 Worker、靜態資源綁定、資料庫，保留原本的網域）→ 把 `dist/config.js` 的 `communityUrl` 設成網站網址 → `wrangler deploy`。重跑是安全的。跑完記得把 `wrangler.toml` 和 `dist/config.js` 的變更 commit。

## 本機測試

```sh
# 一個本機用的設定（database_id 隨便填，本機不會用到雲端）
npx wrangler@4 d1 execute beastidal-community --local --config wrangler.local.toml --file worker/schema.sql
npx wrangler@4 dev --local --config wrangler.local.toml
```

`wrangler.local.toml` 的內容和下面第 3 步一樣，只是不需要 routes。0.59 用這個方式端到端測過：遊戲裡的留言碑會顯示伺服器上的留言（標示「居民」），在遊戲裡刻下的留言也會寫進資料庫；句型檢查、每日 3 則上限、每台裝置只能共鳴一次都正常。

## 手動部署步驟

需要 Node.js 和 Cloudflare 帳號，在專案根目錄執行：

1. 建立資料庫：

   ```sh
   npx wrangler d1 create beastidal-community
   ```

   指令會印出 `database_id`。

2. 建立資料表：

   ```sh
   npx wrangler d1 execute beastidal-community --remote --file worker/schema.sql
   ```

3. 修改 `wrangler.toml`，加上 Worker 入口、靜態資源綁定和資料庫（`database_id` 換成第 1 步的值）：

   ```toml
   name = "beastidal"
   main = "worker/community.js"
   compatibility_date = "2025-09-01"

   [assets]
   directory = "./dist"
   binding = "ASSETS"

   [[d1_databases]]
   binding = "DB"
   database_name = "beastidal-community"
   database_id = "貼上 database_id"

   [[routes]]
   pattern = "beastidal.yzprojecttw.com"
   custom_domain = true
   ```

4. 在 `dist/config.js` 把 `communityUrl` 設成網站網址，例如 `'https://beastidal.yzprojecttw.com'`。

5. 部署：

   ```sh
   npx wrangler deploy
   ```

## API

| 方法 | 路徑 | 說明 |
| --- | --- | --- |
| GET | `/api/stele` | 最新 60 則留言 |
| POST | `/api/stele` | `{ t, w }`：句型與詞的代號 |
| POST | `/api/stele/:id/resonate` | 共鳴一則留言 |

每個請求都要帶 `X-Device` 標頭（遊戲自動產生並存在瀏覽器裡的隨機裝置代號）。含有被審查詞的留言，滿一天後會顯示成「已由慈愛組織移除」，和離線版一樣。

## 尚未包含

- 漂流信目前只有模擬版，回信由預寫的居民寄出。
- 殘影（發光足跡）目前是模擬的，不代表真實玩家的位置。
