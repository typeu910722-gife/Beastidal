# 上架規劃：網站版、Google Play、Steam

比斯泰德目前是純靜態網頁遊戲（`dist/`），三個平台都包同一份 `dist/`，只在外殼與登入方式上不同。

| | 網站版 / PWA | Google Play | Steam |
| --- | --- | --- | --- |
| 外殼 | 瀏覽器（Cloudflare 靜態網站） | Trusted Web Activity（建議）或 Capacitor | Electron（或 NW.js） |
| 免登入單機 | ✅ localStorage，service worker 離線可玩 | ✅ 同網站版 | ✅ 同網站版（Electron 的 localStorage 存在使用者資料夾） |
| Google 登入 | Google Identity Services（瀏覽器彈窗） | TWA：同網站版；Capacitor：需原生外掛 | 需原生橋接：系統瀏覽器 + loopback OAuth |
| 雲端存檔 | Google Drive `appDataFolder` | 同左 | 同左；也可另外接 Steam Cloud |

## 1. 存檔設計

- **單機（免登入）**：存檔寫在裝置的 `localStorage`，鍵值沿用 `tidal-rebirth-save-v1`，所以舊進度不會遺失。另有 `beastidal-save-meta-v1` 記錄最後存檔時間，以及每個 Google 帳號最後一次同步的時間點。啟動時會呼叫 `navigator.storage.persist()`，降低瀏覽器自動清除資料的機率。
- **Google 登入後**：存檔同時上傳到該帳號 Google Drive 的 **appDataFolder**（隱藏的應用程式專用資料夾，玩家在雲端硬碟介面看不到，遊戲也讀不到其他檔案）。每次存檔後最多 60 秒內同步一次（`config.js` 的 `cloudSyncInterval`），切到背景、回主畫面與暫停選單的「立即同步雲端」都會立刻上傳。
- **衝突處理**（`dist/save-store.js` 的 `reconcile`）：
  - 只有一邊有存檔 → 自動上傳或下載。
  - 雲端自上次同步後沒變 → 上傳本機進度。
  - 本機自上次同步後沒變、雲端較新 → 下載雲端進度（例如換了一台裝置玩）。
  - 兩邊都變了，或此帳號從沒同步過 → 跳出視窗，顯示兩份進度的天數、建築、御獸數與時間，由玩家選擇保留哪一份。
- 沒有網路時遊戲照常運作，雲端狀態顯示「雲端離線」，30 秒後重試。

## 2. 設定 Google 登入（網站版 / PWA / TWA）

1. 到 [Google Cloud Console](https://console.cloud.google.com/) 建立專案。
2. 「API 和服務 → 程式庫」啟用 **Google Drive API**。
3. 「OAuth 同意畫面」：使用者類型選「外部」，填入遊戲名稱、支援信箱、隱私權政策網址，範圍加入 `.../auth/drive.appdata`、`openid`、`email`、`profile`。
4. 「憑證 → 建立憑證 → OAuth 用戶端 ID → 網頁應用程式」，在「已授權的 JavaScript 來源」加入：
   - `https://beastidal.yzprojecttw.com`
   - `http://localhost:8080`（本機測試）
5. 把用戶端 ID 填進 `dist/config.js` 的 `googleClientId`，並把 `dist/sw.js` 的 `VERSION` 加一版，讓已安裝的玩家拿到新設定。
6. 發布前在 OAuth 同意畫面按「發布應用程式」。在「測試」狀態下只有測試使用者能登入。`drive.appdata` 不是受限範圍，但 Google 仍可能要求完成品牌驗證（應用程式名稱、標誌、網域）。

`googleClientId` 留空時，標題畫面只顯示「單機體驗版」，不會載入任何 Google 程式，也不會連網。

## 3. Google Play

**建議：Trusted Web Activity（TWA）**。TWA 用的是 Chrome 本身，所以 Google Identity Services 登入、Drive 同步、service worker 離線快取都能直接使用，不必改程式碼。

1. 網站版先以 HTTPS 上線（已有 `manifest.webmanifest` 與 `sw.js`）。
2. 用 [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap) 產生 Android 專案：`bubblewrap init --manifest https://beastidal.yzprojecttw.com/manifest.webmanifest`。
3. 把 Bubblewrap 產生的 SHA-256 指紋放進 `dist/.well-known/assetlinks.json`，網址列才會隱藏。
4. Play 上架需要 512×512 PNG 圖示、1024×500 主題圖片與截圖，請另外製作，目前的 `favicon.svg` 不夠。manifest 也要補上 192/512 PNG 圖示。

若改用 **Capacitor**（想要完全離線安裝包），Google 會拒絕在 WebView 內完成的 OAuth。這時要用原生 Google 登入外掛取得 access token，再依下方「原生橋接介面」提供給遊戲。

## 4. Steam（Electron）

1. 用 Electron 載入 `dist/`。建議註冊自訂協定（例如 `app://`），不要直接用 `file://`，因為 ES module 在 `file://` 下無法載入。
2. Google 登入：Google 不允許在 Electron 視窗內登入。請改在主程序用「系統瀏覽器 + loopback redirect（`http://127.0.0.1:<port>`）+ PKCE」流程，憑證類型選「電腦版應用程式」，再透過 preload 把 token 交給遊戲。
3. Steamworks（成就、Steam Cloud、Overlay）可用 `steamworks.js` 等套件在主程序串接。Steam Cloud 可以直接同步 Electron 的使用者資料夾，和 Google Drive 同步並存不衝突。
4. 鍵鼠與手把操作已支援；Steam Deck 需實機測試觸控與手把配置。

## 5. 原生橋接介面

原生外殼（Electron preload、Capacitor 外掛）只要在網頁載入前提供以下物件，遊戲就會改用它來取得 token，略過瀏覽器的 Google Identity Services：

```js
window.BeastidalNative = {
  platform: 'steam', // 或 'android'
  googleAuth: {
    // interactive=false 時請嘗試靜默更新 token，失敗就拋出錯誤
    async getToken({ interactive, scopes, loginHint }) {
      return { accessToken: '...', expiresIn: 3600 };
    },
    async signOut() {}
  }
};
```

`scopes` 包含 `https://www.googleapis.com/auth/drive.appdata openid email profile`。遊戲只用 token 呼叫 `oauth2/v3/userinfo` 與 Drive v3 API，不會碰其他資料。

## 6. 畫質與效能

暫停選單可切換「寫實／平衡／效能」三種畫質（存在 `beastidal-settings-v1`，切換後會重新載入）。觸控裝置預設「平衡」，電腦預設「寫實」。三者差別在解析度倍率、陰影貼圖大小、陰影柔化、海面網格密度、雜訊層數與環境光更新頻率。上架前仍需在中低階 Android 手機上實測幀率。
