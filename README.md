# TikTok无水印视频获取解决方案

一个基于Playwright的可靠TikTok无水印视频获取工具，能够绕过TikTok的高级反爬机制，成功提取视频URL。

## 项目概述

该解决方案使用Playwright浏览器自动化技术，结合多种高级反检测和提取策略，能够有效绕过TikTok的反爬机制，提取无水印视频URL。

## 功能特性

### ✅ 成功的视频URL提取
- **多策略提取**：网络拦截、DOM提取、脚本解析、手动构建
- **视频ID提取**：从URL中提取视频ID并构建CDN URL
- **双重URL支持**：桌面版和移动版URL
- **会话管理**：保存Cookie以提高成功率

### ✅ 增强的下载机制
- **浏览器自动化下载**：模拟真实用户行为
- **增强代理下载**：带重试机制和高级请求头
- **智能回退策略**：多种下载方法自动切换
- **详细的用户指导**：提供替代下载方案

### ✅ 抗检测能力
- **浏览器指纹伪装**：移除自动化标志
- **真实环境模拟**：模拟真实设备和浏览器
- **智能网络请求**：绕过检测机制

## 技术栈

- **Node.js**：运行环境
- **Playwright**：浏览器自动化
- **Express**：Web服务器（可选）
- **Axios**：HTTP请求

## 安装方法

### 1. 克隆项目

```bash
git clone <repository-url>
cd tikTok-downloader
```

### 2. 安装依赖

```bash
npm install
```

### 3. 安装Playwright浏览器

```bash
npx playwright install chromium
```

## 使用示例

### 基本使用

```javascript
const TikTokDownloader = require('./tiktok-downloader');

async function main() {
    const tiktokDownloader = new TikTokDownloader();
    const videoInfo = await tiktokDownloader.getVideoUrl('TikTok视频URL');
    
    console.log('无水印视频URL:', videoInfo.noWatermark);
    console.log('有水印视频URL:', videoInfo.watermarked);
}

main();
```

### 尝试下载

```javascript
const downloadResult = await tiktokDownloader.downloadVideo(videoInfo.noWatermark, 'output.mp4');
if (downloadResult.success) {
    console.log('视频下载成功:', downloadResult.path);
} else {
    console.log('直接下载失败，使用替代方案:');
    console.log(downloadResult.guidance);
}
```

### 命令行测试

```bash
# 提取视频URL
node final-test.js

# 测试浏览器自动化下载
node test-browser-download.js

# 测试新URL
node test-new-url.js
```

### Web服务器使用

```bash
# 启动Web服务器
node index.js

# 访问API
# POST http://localhost:3000/api/get-video
# Body: { "url": "TikTok视频URL" }
```

## 测试结果

### 测试URL 1
- **URL**: `https://www.tiktok.com/@cu.cumber69/video/7578952907178134787`
- **结果**: ✅ URL提取成功，✅ 下载成功
- **文件大小**: 0.32 MB
- **下载方法**: 增强代理下载

### 测试URL 2
- **URL**: `https://www.tiktok.com/@mxgchx0ng/video/7539927946769747220?is_from_webapp=1&sender_device=pc`
- **结果**: ✅ URL提取成功， ⚠️ 直接下载失败（提供替代方案）

## 替代下载方法

由于TikTok的严格反爬机制，直接下载可能失败。此时，您可以使用以下替代方法：

### 1. 浏览器直接访问
1. 复制提取的URL到浏览器地址栏
2. 浏览器会自动开始下载，或显示视频播放界面
3. 在视频播放界面，右键点击视频，选择 "另存为" 保存视频

### 2. 使用浏览器扩展
- **Video DownloadHelper** (Chrome/Firefox)
- **TikTok Video Downloader** (Chrome)

### 3. 使用命令行工具

```bash
curl -o "output.mp4" \
  -H "Referer: https://www.tiktok.com/" \
  -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" \
  "提取的视频URL"
```

## 项目结构

```
.
├── tiktok-downloader.js      # 核心下载器类
├── index.js                  # 主应用（Web服务器）
├── final-test.js             # 基础功能测试
├── test-browser-download.js  # 浏览器自动化下载测试
├── test-new-url.js           # 新URL测试
├── package.json              # 项目依赖
└── README.md                 # 项目文档
```

## 常见问题

### Q: 为什么直接下载失败？
A: TikTok有严格的反爬机制，直接下载可能会被拒绝。建议使用替代下载方法，或复制提取的URL到浏览器访问。

### Q: URL提取成功率如何？
A: 测试中URL提取成功率为100%，但下载成功率取决于网络环境和TikTok的反爬策略。

### Q: URL有效期是多久？
A: TikTok CDN URL通常有较短的有效期（几分钟到几小时不等），建议提取后立即使用。

### Q: 如何提高成功率？
A: 使用良好的网络环境，定期更新依赖，尝试不同的下载方法。

## 注意事项

1. **URL有效期**：TikTok CDN URL通常有较短的有效期
2. **网络环境**：良好的网络连接有助于提高成功率
3. **定期更新**：TikTok经常更新反爬机制，可能需要定期调整策略
4. **法律合规**：确保遵守TikTok的使用条款和相关法律法规
5. **浏览器依赖**：首次运行会自动下载Playwright浏览器

## 技术细节

### 提取策略
1. **网络请求拦截**：捕获所有视频相关请求
2. **DOM元素提取**：分析页面视频元素
3. **页面脚本解析**：提取嵌入在JavaScript中的视频数据
4. **视频ID手动提取**：从URL中提取视频ID并构建CDN URL

### 抗检测措施
- 移除 `navigator.webdriver` 标志
- 模拟真实浏览器指纹
- 模拟真实设备和浏览器
- 使用真实的用户代理
- 保存和使用Cookie会话

## 许可证

ISC

## 更新日志

### v1.0.0
- 初始版本发布
- 实现基于Playwright的视频URL提取
- 实现增强的下载机制
- 支持多种提取策略
- 提供详细的用户指导

## 贡献

欢迎提交Issue和Pull Request，帮助改进这个项目。

## 联系方式

如有问题或建议，请提交Issue或联系项目维护者。

---

**注意**：本项目仅用于学习和研究目的，请遵守相关法律法规和TikTok的使用条款。