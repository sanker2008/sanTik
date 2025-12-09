# SanTik - TikTok/抖音 无水印视频下载器

SanTik 是一个基于 Node.js 和 Playwright 的高性能 TikTok/抖音视频去水印工具。它采用了混合提取策略和上下文传递技术，能够有效绕过最新的反爬虫机制（包括 403 Forbidden 签名验证），稳定获取并下载无水印视频。支持 TikTok (`tiktok.com`) 与抖音 (`douyin.com`、`v.douyin.com`) 的短链接与长链接。

## 🌟 核心特性

*   **🛡️ 突破反爬机制 (2025 更新)**
    *   **上下文传递 (Context Propagation)**：自动捕获浏览器会话中的 `Cookies`、`Referer` 和 `User-Agent`，并将其传递给下载请求，完美解决 TikTok CDN 的 403 Forbidden 签名验证问题。
    *   **浏览器指纹伪装**：基于 Playwright 深度定制，移除 `navigator.webdriver` 等自动化特征，模拟真实用户环境。

*   **⚡ 混合提取策略**
    *   **数据水合解析**：优先解析页面中的 `__UNIVERSAL_DATA_FOR_REHYDRATION__` JSON 数据，直接获取带签名的有效 URL。
    *   **网络流量嗅探**：实时拦截页面加载过程中的 `media` 类型请求，捕获动态加载的视频流。
    *   **DOM/正则回退**：作为兜底方案，从页面源码和脚本中提取视频链接。

*   **📦 完整功能支持**
    *   支持 **TikTok** 和 **抖音** 短链接/长链接（域名：`tiktok.com`、`douyin.com`、`v.douyin.com`）。
    *   提取 **无水印视频**、**有水印视频** 和 **封面图片**。
    *   **本地代理下载**：服务器端自动下载视频并存储，解决前端跨域和防盗链问题。

## 🛠️ 技术栈

*   **Runtime**: Node.js
*   **Core**: Playwright (Chromium) - 用于浏览器自动化和页面渲染
*   **Server**: Express - 提供 RESTful API 和静态资源服务
*   **Network**: Axios - 处理带凭证的文件流下载

## 🚀 快速开始

### 1. 环境准备

确保已安装 Node.js (v14+)。

### 2. 安装依赖

```bash
# 克隆项目（假设已下载）
cd sanTik

# 安装 NPM 依赖
npm install

# 安装 Playwright 浏览器内核
npx playwright install chromium
```

### 3. 运行服务

#### 启动 Web 服务器 (推荐)
启动后可以通过浏览器访问 Web 界面或调用 API。

```bash
npm start
# 或者
node index.js
```

服务启动后：
- **Web 界面**: [http://localhost:3000](http://localhost:3000)
- **API 接口**: [http://localhost:3000/api/get-video](http://localhost:3000/api/get-video)

#### 命令行模式
也可以直接在命令行中解析单个链接（支持 TikTok 与抖音）：

```bash
node index.js "https://www.tiktok.com/@user/video/123456789..."
node index.js "https://v.douyin.com/xxxxxx/"
```

## 🔌 API 文档

### 获取视频信息 `POST /api/get-video`

**请求体:**
```json
{
  "url": "https://v.douyin.com/..."
}
```

**响应示例:**
```json
{
  "success": true,
  "data": {
    "cover": "https://p16-sign-sg.tiktokcdn.com/...",
    "original": {
      "watermarked": "https://...",
      "noWatermark": "https://..."
    },
    "local": {
      "noWatermark": "/videos/no_watermark_1733734567890.mp4",
      "watermarked": "/videos/watermarked_1733734567890.mp4"
    }
  }
}
```
*注：`local` 字段返回的是服务器下载后的本地路径，可直接在浏览器播放，无需担心防盗链。*

## 🧠 技术与难点（TikTok 与抖音）

### 通用流程概览
- **平台识别与URL归一化**：在 `index.js:33` 的 `SanTik.getVideoUrl` 中对输入文本进行解析与域名判断，TikTok 由 `TikTokDownloader.getVideoUrl` 专用处理（`tiktok-downloader.js:43`），其他情况走通用抓取流程。
- **多源数据提取**：优先解析页面 `__UNIVERSAL_DATA_FOR_REHYDRATION__` 数据以获取带签名的直链，其次拦截 `media` 请求并回退到脚本/DOM解析。
- **上下文传递下载**：将浏览器会话的 `Cookie`、`Referer`、`User-Agent` 作为请求头传递到下载器，在 `index.js:402` 的 `SanTik.downloadVideo` 中执行带凭证的流式下载。
- **Web/API 输出**：API 路由在 `index.js:510`，返回原始直链与本地代理链接，前端可直接播放。

### TikTok 技术要点与难点
- **签名直链与时效性**：TikTok 视频直链通常包含 `signature`、`expire`、`btag`、`ft` 等参数，属于短时效签名链接，必须在有效期内访问。
- **会话验证**：部分资源需要携带有效的 `Cookie`（常见如 `tt_chain_token` 等会话令牌），否则 CDN 返回 `403 Forbidden`。
- **来源限制**：需要正确的 `Referer`（通常为 `https://www.tiktok.com/`）以及真实的 `User-Agent` 才能命中 CDN 规则。
- **解决策略**：
  - 在 `tiktok-downloader.js:43` 的专用流程中，通过 Playwright 完整渲染页面，解析 `__UNIVERSAL_DATA_FOR_REHYDRATION__` 脚本标签中的 JSON，直接获取带签名的可用 URL。
  - 同步提取当前页面 `Cookie` 并构造 `headers` 返回给调用方，在 `index.js:585` 下载阶段携带这些头部，实现稳定访问。
  - 针对网络拦截仅出现占位视频（例如 `playback1.mp4`）的情况，优先使用页面数据路径 `__DEFAULT_SCOPE__ -> webapp.video-detail -> itemInfo.itemStruct.video.PlayAddrStruct.UrlList` 取直链。

### 抖音 技术要点与难点
- **URL 形态多样**：抖音既有 `douyin.com` 长链接，也有 `v.douyin.com` 短链接，需先归一化并定位到具体作品页。
- **水印参数差异**：常见的有水印/无水印区分可通过 URL 参数或路径（如 `playwm=1/0`、`/playwm/` 与 `/play/`），但并非所有作品都提供无水印直链。
- **会话与反爬**：同样需要携带页面生成时的 `Cookie` 与 `Referer`，并使用移动端 UA（在 `index.js:21-23` 的上下文配置），以提升直链可访问性。
- **解决策略**：
  - 使用通用抓取流程：网络请求拦截（`index.js:71-139`）识别 `.mp4` 媒体流，结合 `playwm` 参数与关键词初步判定水印状态。
  - 对有水印直链尝试替换策略（`index.js:338-346`），从 `playwm=1` 推导 `playwm=0` 或替换路径 `/playwm/` → `/play/` 作为回退。
  - 遇到来源限制时，统一走带凭证下载（`index.js:402`），复用 TikTok 的上下文传递能力。

### 防爬策略对比与实践
- **浏览器指纹伪装**：在 TikTok 专用类中通过 `context.addInitScript` 移除 `navigator.webdriver`、补齐 `plugins` 与 `mimeTypes` 等指纹（`tiktok-downloader.js:83-119`），降低被识别为自动化脚本的概率。
- **真实环境模拟**：设置视口、时区、地理位置、语言等（`tiktok-downloader.js:64-81`），使网络与页面行为更接近真实用户。
- **请求头一致性**：统一由页面上下文生成并传递请求头，保证下载端与页面端身份一致，避免“页面能看、下载被拒”的不一致状态。

### 失败排查 Checklist
- 链接是否过期（`expire` 参数过期会返回 403/404）。
- 是否携带了页面生成时的 `Cookie`、`Referer` 与 `User-Agent`（`index.js:402`）。
- 是否命中了真实视频直链而不是占位资源（如 `playback1.mp4`）。
- 抖音是否仅提供有水印资源，尝试替换策略（`index.js:338-346`）。
- Playwright 是否已安装并能正常启动（Chromium 内核）。

## 📂 项目结构

```
sanTik/
├── index.js               # 主程序入口 (Express Server + CLI)
├── tiktok-downloader.js   # 核心下载类 (Playwright 逻辑封装)
├── public/                # 前端静态资源
│   └── index.html         # Web 界面
├── videos/                # 下载视频的存储目录
├── package.json           # 项目配置
└── README.md              # 说明文档
```

## ❓ 常见问题

**Q: 为什么视频下载速度有时较慢？**
A: 程序使用了 Headless Browser (无头浏览器) 完整加载页面以获取签名，这比纯 API 请求慢但更稳定。

**Q: 遇到 403 Forbidden 错误怎么办？**
A: 本项目最新版已修复此问题。程序会自动获取当前会话的 Cookie 和 Header 用于下载。如果仍有问题，请尝试清除 `videos` 目录下的缓存或重启服务。

## ⚠️ 免责声明

本项目仅供技术学习和研究使用。请勿用于非法用途。下载的内容版权归原作者所有。
