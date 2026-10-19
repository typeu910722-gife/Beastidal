# 架構分析與雙引擎路線（第一、二階段）

分析基準：分支 `claude/elegant-einstein-keyhg2`，版本 0.60.0（commit `d9db181`）。本文件只記錄事實、實測結果與建議，沒有改動任何遊戲程式。

## 結論

1. **現有專案不是 Babylon.js，而是 Three.js r180 的純靜態 ESM 網頁遊戲**，沒有打包工具，也沒有 npm 執行期依賴。Three.js 放在 `dist/vendor/`。
2. 需求中的核心玩法，網頁版大多已存在：御獸與突變、每池 3 隻並可改名、島嶼與採集、小艇、木筏與船融合成堡壘（0.14）、第一與第三人稱、手機橫向介面。
3. 第三階段的示範區，網頁版已經涵蓋大部分內容（見第 3.3 節）。真正缺的是 **UE5 版本**、**效能實測**，以及 **Windows 實機的環境檢查**。
4. 建議不要重寫。先把規則與資料抽成可共用的核心，UE5 與網頁都讀同一份規格與測試向量。
5. **需要你決定**：網頁版要維持 Three.js，還是遷移到 Babylon.js（見第 5.2 節）。

## 1. 本次實測結果

以下都是在本雲端容器（Linux、Node 22.22.0）實際執行的結果：

| 檢查 | 指令 | 結果 |
| --- | --- | --- |
| 安裝宣告的開發依賴 | `npm ci` | 成功，91 個套件 |
| 格式 | `npm run format:check` | 通過 |
| Lint | `npm run lint` | 0 個錯誤、33 個警告（多為未使用變數，集中在 `dist/creatures.js` 等） |
| 語法 | `npm run check` | 通過 |
| 單元測試與 pacing bot | `npm test` | 通過（含 `preload --check`） |
| 翻譯完整度 | `npm run i18n:check` | 通過，2918 個字串都有英文翻譯 |
| 瀏覽器冒煙測試 | `npm run smoke` | 通過（桌機與手機各一輪），截圖 `smoke-desktop.png`、`smoke-mobile.png` |

**尚未測量**：FPS、記憶體使用量、載入時間。冒煙測試用的是 SwiftShader 軟體渲染，數字不代表實機 GPU 或手機，不能用來做效能決策。正式數字需要在指定實機上量測（見第 6 節）。

## 2. 環境檢查（第一階段）

### 2.1 你的 Windows 電腦

本 session 跑在 Linux 雲端容器裡，讀不到你的 Windows 電腦，因此 CPU、GPU、RAM、磁碟與已安裝軟體還沒有檢查。已寫好一支**唯讀**的 PowerShell 腳本：

- 位置：`scripts/windows-env-check.ps1`
- 只讀取硬體與已安裝軟體資訊，不安裝、不修改任何東西。
- 結果顯示在視窗中，並寫入「文件」資料夾的 `beastidal-env-report.txt`。
- 執行方式：在專案資料夾開啟 PowerShell，執行 `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\windows-env-check.ps1`
- **這支腳本尚未在 Windows 上執行過。** 請以你實機跑出的結果為準。

### 2.2 Claude Desktop 的本機能力

無法從本 session 驗證 Claude Desktop 是否能操作你電腦的檔案與終端機。腳本會列出 Claude Desktop 已設定的 MCP 伺服器名稱（只列名稱，不讀取金鑰），可作為線索。

### 2.3 工具候選（網路搜尋結果，未審查程式碼）

搜尋只用了網路搜尋，沒有打開各專案的 LICENSE 檔，也沒有審查安全性。授權以各專案官方為準。

- **Unreal MCP（UE 控制）**
  - `ChiR24/Unreal_mcp`：TypeScript，透過 Remote Control API 控制 UE，標示支援 UE 5.0–5.6，README 標示 MIT。
  - `flopperam/unreal-engine-mcp`：Python 伺服器加上 C++ 外掛，需要 UE 5.5 以上，標示 MIT。
  - `gingerol/UnrealEngine-ai-mcp`：針對 Blueprint、Actor、UMG，需要 UE 5.5 以上，標示 MIT。
  - 三者都需要確認最後更新時間與 UE 版本相容性，再決定採用哪一個。
- **Babylon.js Skills**
  - `freshtechbro/claudedesignskills` 的 `babylonjs-engine`：社群專案，不是 Babylon.js 官方出品。
  - `TerminalSkills/skills` 的 `babylonjs`。
  - 搜尋結果未見 Babylon.js 官方的正式 skill。
- **Blender MCP**
  - `ahujasid/blender-mcp`：MIT 授權。有資料說它已改名為 `mcp-for-blender`，未經驗證。
  - **注意使用條款**：啟用遙測時，條款要求使用者授權提示詞、截圖與產生的程式碼用於 AI 訓練與研究。可以設定環境變數 `DISABLE_TELEMETRY=true` 關閉遙測。若會用於商業專案，請先閱讀條款。

**GitHub 搜尋的限制**：本 session 的 GitHub 工具只限於 `typeu910722-gife/beastidal`，無法做全網 GitHub 搜尋，所以改用網路搜尋。

### 2.4 免費工具清單（僅列出，未安裝）

| 工具 | 用途 | 備註 |
| --- | --- | --- |
| Git | 版本紀錄 | 專案已在 Git |
| Node.js 22 LTS | 網頁版開發與測試 | CI 使用 22 |
| Unreal Engine 5 | 高畫質版 | Epic Games Launcher 免費下載；商業發行的權利金條款以 Epic EULA 為準 |
| Visual Studio 2022 Community + Windows SDK | UE 的 C++ 專案需要 | 免費 |
| Blender | 模型、動畫、匯出 GLB/FBX | GPL，免費 |
| Python 3 | Blender 腳本與部分 MCP 伺服器 | 免費 |
| Poly Haven、Kenney、Quaternius | 免費素材來源 | 多為 CC0；使用前仍需確認各站授權 |

## 3. 現有架構（第二階段）

### 3.1 技術棧

- **前端**：純靜態 HTML、CSS、ESM 模組，沒有打包步驟。Three.js r180 放在 `dist/vendor/`，27 個模組直接 import 它。
- **後端**：Cloudflare Workers 加上 Static Assets（`wrangler.toml`）。留言碑用 `worker/community.js` 搭配 D1 資料庫。
- **雲端存檔**：Google Drive `appDataFolder`，檔名 `beastidal-save.json`，衝突判斷在 `dist/save-store.js`。
- **離線**：Service Worker（`dist/sw.js`）。
- **本機預覽**：`server.mjs` 是 Node 靜態伺服器，只供本機測試。
- **版本管理的風險**：每個 import 路徑都寫死 `?v=0.60.0`，`sw.js` 與 `game.js` 另有版本號。升版時必須手動同步，漏掉會造成快取不一致。

### 3.2 模組分層

以關鍵字粗分（是否 import Three.js、是否碰 DOM 或 `localStorage`）：

| 分類 | 檔數 | 行數 | 內容 |
| --- | --- | --- | --- |
| 純規則與資料 | 60 | 約 11,500 | `rules.js`（生存、經濟、配方）、`genetics.js` 與 `bsgenes.js`（基因與突變）、`taming.js`（馴化）、`housing.js`（池子住處）、`bag.js`、`ship.js`、`fortress.js`、`lake.js` 與 `islands.js`（島與地形資料）、`weather.js`、`combat.js` 的數學、劇情狀態（`story.js`、`chapter2.js`、`chapter3.js`、`dome.js`、`town.js`）、`save-store.js` |
| 渲染與 UI | 36 | 約 24,100 | `world.js`（3,002 行，場景與動畫）、`game.js`（8,673 行，輸入、UI、流程）、`creatures.js`（2,637 行）、約 10 個 `*-models.js`（程序化建模）、`realism.js`（天空、海、畫質）、`postfx.js`、`sound.js`、`i18n.js` |

注意：`game.js` 歸在渲染類，但裡面混了不少規則邏輯，所以「純規則」的實際比例比表上數字低。

### 3.3 玩法與程式對應

| 需求 | 目前實作 | 主要檔案 | 狀態 |
| --- | --- | --- | --- |
| 御獸、突變、培養、羈絆 | 基因、馴化、羈絆等級、協採、騎乘、潛水；雙親形態融合 | `genetics.js`、`bsgenes.js`、`taming.js`、`beasts.js`、`creatures.js` | 已有（0.5） |
| 每池 3 隻、自訂名稱、調整住所 | 池子面板、改名、搬移與互換、待安置清單 | `housing.js`、`cabin.js`、`cabin-models.js` | 已有（0.4 至 0.4.2） |
| 島嶼探索、資源收集、基地建設 | 多座島可登岸、採集點、雙層建築、樓梯、家具 | `islands.js`、`lake.js`、`island-models.js`、`construction.js`、`facilities.js` | 已有 |
| 小艇、戰艦升級與航海 | 小艇停泊與駕駛、船隻升級、風暴與海怪 | `ship.js`、`ship-models.js`、`navigation.js`、`route.js` | 已有 |
| 基地與戰艦融合成可移動堡壘 | 融合後地基、樓梯、停靠站併入船體，其他設施放進甲板艙位 | `fortress.js`、`ship.js` | 程式與測試描述已實作；**本次未逐項遊玩驗證** |
| 大型開放世界與生態區 | 一片內海加上數座島，沒有分區載入 | `lake.js`、`lake-models.js`、`lake-worker.js` | **缺口** |
| 第三人稱、自由相機、滑鼠 | 第三人稱右鍵環視、第一人稱 Pointer Lock | `world.js`、`game.js` | 已有 |
| 精緻建築、動畫、光影 | 程序化模型、PBR、IBL、陰影與畫質預設 | `realism.js`、`postfx.js`、`bake.js` | 已有，但外部美術資產很少 |
| 手機橫向操作介面 | 橫屏配置、虛擬搖桿、橫向提示 | `mobile.css` | 已有，實機未測 |

### 3.4 第三階段示範區的現況

| 示範項目 | 網頁版現況 | UE5 版待辦 |
| --- | --- | --- |
| 可探索的島 | 有（湖中島嶼與登岸） | 建一座高度圖島嶼 |
| 可移動角色與相機 | 有（GLB 角色、第三與第一人稱） | Character 與 Spring Arm |
| 生物待機、行走、互動動畫 | 有（程序動畫，`creatures.js`） | 動畫藍圖或 Control Rig |
| 可點擊建築 | 有（靠近後按 E 或互動鍵） | 互動元件 |
| 可駕駛小艇 | 有（`ship.js`） | 簡化物理或 Chaos Vehicle |
| 基地與戰艦融合 | 0.14 已實作 | 尚未開始 |
| Windows 與網頁分別測試 | 網頁：冒煙測試通過；Windows：未做 | 待建 |

### 3.5 資料與存檔

- 單機存檔在 `localStorage`，鍵值 `tidal-rebirth-save-v1`（第一格），其他格為 `…-slot2` 等。`validateSave` 在 `rules.js`，要求 `version === 1`。
- `normalize*` 系列函式負責補齊舊存檔缺少的欄位，所以新版能讀舊檔。
- 雲端同步的衝突規則：只有一邊有檔案就自動同步；兩邊都改過，就由玩家選擇保留哪一份。
- 存檔是純 JSON，UE5 版要讀寫同一份格式並不困難。

### 3.6 素材

| 類別 | 內容 | 大小 | 授權與注意事項 |
| --- | --- | --- | --- |
| 角色模型 | `protagonist.glb`、`protagonist-female.glb`、`guide-qing.glb` | 2.3 至 3.5 MB | Microsoft Rocketbox，MIT。動畫片段重定向自 three.js 範例 `Soldier.glb`（來源為 Mixamo）。**Mixamo 動畫可在遊戲中使用，但不可獨立再發佈**，這會影響 UE 版共用素材的做法 |
| 雕刻資料 | `sculpt-*.json` 四個檔 | 約 2.1 MB | 程序雕刻資料，應能跨平台沿用 |
| 程序化模型 | 約 10 個 `*-models.js` | 程式碼 | 外觀的主要來源，**無法直接當檔案搬到 UE**，需要用 Blender 重新匯出，或重新建模 |
| 音訊 | `dist/audio/`（mp3、m4a、ogg） | 約 13 MB | 音樂來源見 `dist/audio/music/CREDITS.md` |
| 美術 | `dist/art/*.webp` | 約 2.3 MB | 角色與生物的展示圖 |

### 3.7 效能相關現況

- 畫質預設在 `realism.js` 的 `QUALITY`：寫實、平衡、效能三檔，差別在像素比、陰影貼圖大小（4096、2048 等）、天空八度數、環境貼圖大小與海面網格密度。
- `world.js` 在部分情況下會把像素比再降 25%（約第 2596 行）。
- 已做過的優化：靜態批次合併（`bake.js`，0.52）、延遲載入導覽模型、遠處 Boss 剔除（0.52）、湖面資料由 Web Worker 計算（`lake-worker.js`）。
- 已有的量測工具：`scripts/profile-frame.mjs`、`scripts/playtest.mjs`、`scripts/pacing.mjs`。本次未用它們做實機量測。

## 4. 風險與技術債

1. **`game.js` 8,673 行、`world.js` 3,002 行**：單檔過大，每加一個系統都會增加維護成本。拆分是任何遷移的前置工作，而且應該分步進行、不改玩法。
2. **規則與渲染的耦合**：規則模組之間彼此 import，但還沒有一份依賴圖確認哪些可以獨立抽出。這需要用工具掃描，不能只靠判斷。
3. **雙引擎的規則漂移**：如果規則在 JS 與 C++ 各寫一次，兩邊很快會不一致。需要共用資料表與測試向量（見第 5.1 節）。
4. **版本號手動同步**：`?v=` 與 `sw.js` 的版本號要一起改。
5. **Mixamo 動畫授權**：UE 或 Babylon 版要共用這些動畫，需要重新確認授權。
6. **Lint 33 個警告**：沒有錯誤，但都是未使用變數，應該清理。
7. **效能與手機實測缺失**：目前只有 headless 冒煙測試，沒有實機數據。

## 5. 雙引擎架構建議

### 5.1 共用核心

```
            ┌──────── shared/（純資料與規則，無 DOM、無渲染）────────┐
            │ rules、genetics、bag、housing、ship 與 fortress 規則     │
            │ 島嶼與地形定義、天氣、劇情狀態、存檔 schema（JSON）         │
            │ 資料表（species、recipes、crafts 等）以 JSON 匯出          │
            │ golden 測試向量：同一組輸入，JS 與 C++ 必須得到相同結果     │
            └───────────┬──────────────────────────────┬────────────┘
                        │ JS（ESM，現況）                │ JSON 表 + C++/Blueprint 移植
              ┌─────────▼──────────┐          ┌──────────▼──────────────┐
              │ 網頁版 client        │          │ UE5 版 client（Windows） │
              │ Three.js（現況）      │          │ 渲染、物理、動畫、UI      │
              │ 或 Babylon.js（待決）  │          │ 讀 GLB/FBX、Lumen、Nanite │
              └─────────┬──────────┘          └──────────┬──────────────┘
                        └──── 共用：GLB、webp、音訊、存檔 JSON、Cloudflare Worker API ────┘
```

重點：

- **UE5 不能當網頁跑**。UE 專案是另一個 client，只讀取共用的資料、素材與規格。
- **規則的單一真實來源**：建議先以 JS 為準（已有 2918 個字串的翻譯檢查、pacing bot 與單元測試）。資料表由腳本匯出成 JSON，UE 直接讀取；函式部分則在 C++ 移植，並用 golden 測試向量比對。
- **後端共用**：現有 Cloudflare Worker 同時服務網頁與 UE。UE 的 Google 登入可沿用 `docs/PLATFORMS.md` 第 4 節描述的 loopback + PKCE 流程。

### 5.2 網頁版：Three.js 還是 Babylon.js（需要你決定）

| 選項 | 做法 | 成本 | 代價 |
| --- | --- | --- | --- |
| A. 維持 Three.js | 網頁版不動，規則抽成共用核心 | 最低 | 需求中的 Babylon.js 不會實現 |
| B. 遷移到 Babylon.js | 把 36 個渲染相關檔（約 24,100 行）逐步改寫 | 高，要分階段，時程需實測 | 要重測每個視覺與效能細節，風險最大 |
| C. 加入渲染介面層 | 定義 `createCreature`、`setTime` 等介面，Three.js 與 Babylon.js 各自實作 | 中 | 多一層抽象，要維護兩套實作 |

**我的建議**：先選 A，同時按 C 的思路整理渲染邊界（只整理，不換引擎）。等有了實機效能基準，再決定是否做 B。這樣不會因為換引擎而拖慢第一個 UE5 示範。

### 5.3 UE5 版路線

- 建議放在獨立目錄或獨立 repo，因為 UE 專案有大量二進位檔，需要 Git LFS。原始網頁專案不動。
- 第一個目標是第三階段的示範區（見第 3.4 節）。
- 素材流程：Blender 匯出 GLB 或 FBX。UE 內建的 glTF 匯入功能要依照所用 UE 版本確認。
- 畫質：Lumen 與 Nanite 需要較新的獨立顯示卡，**要以實機 GPU 報告為準**。

## 6. 效能與測試計畫

在沒有實機數據之前，不宣稱任何效能指標。

| 指標 | 網頁版量測方式 | UE5 量測方式 |
| --- | --- | --- |
| FPS | Chrome DevTools Performance，或 `scripts/profile-frame.mjs` | `stat fps`、`stat unit` |
| 記憶體 | Chrome 工作管理員，`performance.memory`（僅 Chromium） | `stat memory`、Unreal Insights |
| 載入時間 | Navigation Timing，加上首幀時間戳記 | Unreal Insights 的載入紀錄 |

需要你指定測試設備，例如某台中階 Windows 電腦、某支中階 Android 手機、某支 iPhone。

## 7. 建議的下一步順序

1. **你**在 Windows 執行 `scripts/windows-env-check.ps1`，把 `beastidal-env-report.txt` 的內容或摘要給我。
2. **你**決定網頁版渲染（第 5.2 節）。
3. **我**把規則相關的資料表匯出成共用 JSON，並加上 golden 測試。這一步不改變遊戲行為，是網頁與 UE5 共用的第一步。
4. 建立 UE5 專案，做第三階段示範區（島、角色、生物動畫、可點擊建築、小艇、融合堡壘）。
5. 在你指定的實機上量測 FPS、記憶體與載入時間。
6. 漸進拆分 `game.js`，不改玩法。
7. 清理 33 個 lint 警告。

## 8. 本次未做的事

- 未安裝任何軟體，未在 Windows 上執行任何東西，未打開 UE、Blender 或 Babylon.js。
- 未 clone 或審查任何外部 GitHub 專案的程式碼，未審查 MCP 工具的安全性。
- 未做實機效能測試。
- 未驗證 Claude Desktop 的本機檔案與終端機能力。
- 第 3.3 節中標示為「已實作」的項目，多數來自文件與既有測試的描述，本次未逐項遊玩驗證。
