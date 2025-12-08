const { chromium } = require('playwright');
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const TikTokDownloader = require('./tiktok-downloader');

class SanTik {
    constructor() {
        this.browser = null;
        this.context = null;
        this.page = null;
    }

    async initialize() {
        this.browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        this.context = await this.browser.newContext({
            userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
        });
        this.page = await this.context.newPage();
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
        }
    }

    async getVideoUrl(shareUrl) {
        console.log('\n--- SanTik.getVideoUrl 方法开始执行 ---');
        console.log('输入URL:', shareUrl);
        
        try {
            // 从文本中提取URL
            console.log('1. 开始提取有效URL...');
            const extractedUrl = extractUrl(shareUrl);
            if (!extractedUrl) {
                console.error('❌ 无效的URL格式:', shareUrl);
                return { watermarked: null, noWatermark: null, cover: null };
            }
            
            const finalUrl = extractedUrl;
            console.log('✅ 提取到有效URL:', finalUrl);
            
            // Check if it's a TikTok URL
            const tiktokDownloader = new TikTokDownloader();
            if (tiktokDownloader.isTikTokUrl(finalUrl)) {
                console.log('✅ 检测到TikTok URL，使用专门的TikTok下载器...');
                // Use TikTok downloader for better reliability
                return await tiktokDownloader.getVideoUrl(finalUrl);
            }
            
            // 初始化浏览器 (for non-TikTok URLs)
            console.log('2. 开始初始化浏览器...');
            const browserStartTime = Date.now();
            await this.initialize();
            const browserEndTime = Date.now();
            console.log(`✅ 浏览器初始化完成，耗时 ${browserEndTime - browserStartTime}ms`);
            
            let watermarkedUrl = null;
            let noWatermarkUrl = null;
            let coverUrl = null;
            let mediaRequestsCount = 0;
            let videoRequestsCount = 0;
            let imageRequestsCount = 0;
            
            // 设置网络拦截
            console.log('3. 设置网络请求拦截...');
            await this.page.route('**/*', route => {
                const request = route.request();
                const url = request.url();
                const resourceType = request.resourceType();
                
                // 统计媒体请求
                if (resourceType === 'media') {
                    mediaRequestsCount++;
                    
                    // 检查是否为视频请求
                    if (url.includes('.mp4')) {
                        videoRequestsCount++;
                        console.log(`📹 发现视频请求 #${videoRequestsCount}:`, url);
                        console.log('   请求类型:', resourceType);
                        
                        // 区分有水印和无水印视频
                        let isWatermarked = false;
                        let isNoWatermark = false;
                        
                        // 1. 检查playwm参数
                        if (url.includes('playwm=1')) {
                            isWatermarked = true;
                        } else if (url.includes('playwm=0')) {
                            isNoWatermark = true;
                        }
                        
                        // 2. 检查其他可能的水印参数
                        if (!isWatermarked && !isNoWatermark) {
                            // 检查URL中是否包含水印相关关键词
                            if (url.includes('watermark') || url.includes('wm') || url.includes('playwm')) {
                                isWatermarked = true;
                            } else {
                                isNoWatermark = true;
                            }
                        }
                        
                        // 3. 处理结果
                        if (isWatermarked) {
                            watermarkedUrl = url;
                            console.log('   ✅ 标记为: 有水印视频');
                            console.log('   检测依据: playwm=1 或包含水印关键词');
                            console.log('   📍 有水印视频原始地址:', url);
                            
                            // 尝试生成无水印URL
                            const noWatermarkCandidate = url.replace('playwm=1', 'playwm=0');
                            if (noWatermarkCandidate !== url) {
                                console.log('   💡 尝试生成无水印URL:', noWatermarkCandidate);
                                noWatermarkUrl = noWatermarkCandidate;
                                console.log('   📍 生成的无水印视频原始地址:', noWatermarkCandidate);
                            }
                        } else if (isNoWatermark) {
                            noWatermarkUrl = url;
                            console.log('   ✅ 标记为: 无水印视频');
                            console.log('   检测依据: playwm=0 或不包含水印关键词');
                            console.log('   📍 无水印视频原始地址:', url);
                        } else {
                            console.log('   ⚠️  无法确定水印状态');
                            
                            // 尝试两种可能性
                            const withWatermarkCandidate = url.includes('playwm=0') ? url.replace('playwm=0', 'playwm=1') : url.includes('playwm') ? url : `${url}&playwm=1`;
                            const withoutWatermarkCandidate = url.includes('playwm=1') ? url.replace('playwm=1', 'playwm=0') : url.includes('playwm') ? url : `${url}&playwm=0`;
                            
                            watermarkedUrl = withWatermarkCandidate;
                            noWatermarkUrl = withoutWatermarkCandidate;
                            console.log('   💡 生成候选URL - 有水印:', withWatermarkCandidate);
                            console.log('   💡 生成候选URL - 无水印:', withoutWatermarkCandidate);
                        }
                    } else {
                        console.log(`🎵 发现媒体请求 #${mediaRequestsCount}:`, url);
                        console.log('   请求类型:', resourceType);
                    }
                } 
                // 捕获图片请求，寻找封面图
                else if (resourceType === 'image') {
                    imageRequestsCount++;
                    
                    // 寻找可能的封面图
                    if (!coverUrl && (url.includes('cover') || url.includes('poster') || url.includes('thumb') || url.includes('thumbnail'))) {
                        coverUrl = url;
                        console.log(`🖼️  发现封面图请求 #${imageRequestsCount}:`, url);
                        console.log('   请求类型:', resourceType);
                    }
                }
                
                route.continue();
            });

            // 导航到视频页面
            console.log('4. 开始导航到视频页面...');
            console.log('   目标URL:', finalUrl);
            const navigateStartTime = Date.now();
            await this.page.goto(finalUrl, {
                waitUntil: 'networkidle',
                timeout: 30000
            });
            const navigateEndTime = Date.now();
            console.log(`✅ 页面导航完成，耗时 ${navigateEndTime - navigateStartTime}ms`);
            
            // 获取页面标题
            const pageTitle = await this.page.title();
            console.log('   页面标题:', pageTitle);

            // 等待视频加载
            console.log('5. 等待视频资源加载...');
            const waitStartTime = Date.now();
            await this.page.waitForTimeout(5000);
            const waitEndTime = Date.now();
            console.log(`✅ 等待完成，耗时 ${waitEndTime - waitStartTime}ms`);

            // 如果没有捕获到封面图，尝试从页面中提取
            if (!coverUrl) {
                console.log('6. 尝试从页面DOM中提取封面图...');
                
                // 1. 尝试从video元素的poster属性获取
                const videoElements = await this.page.$$('video');
                for (const videoElement of videoElements) {
                    const poster = await videoElement.getAttribute('poster');
                    if (poster) {
                        coverUrl = poster;
                        console.log('   ✅ 从video.poster提取到封面图:', coverUrl);
                        break;
                    }
                }
                
                // 2. 尝试从meta标签获取
                if (!coverUrl) {
                    const ogImage = await this.page.$eval('meta[property="og:image"]', el => el?.content || null).catch(() => null);
                    if (ogImage) {
                        coverUrl = ogImage;
                        console.log('   ✅ 从og:image提取到封面图:', coverUrl);
                    }
                }
                
                // 3. 尝试从页面中的图片元素获取
                if (!coverUrl) {
                    const imageElements = await this.page.$$('img');
                    for (const img of imageElements) {
                        const src = await img.getAttribute('src');
                        const width = await img.evaluate(el => el.naturalWidth || 0);
                        const height = await img.evaluate(el => el.naturalHeight || 0);
                        
                        // 寻找较大尺寸的图片作为封面
                        if (src && width > 300 && height > 300 && (src.includes('.jpg') || src.includes('.png') || src.includes('.webp'))) {
                            coverUrl = src;
                            console.log('   ✅ 从页面图片提取到封面图:', coverUrl);
                            console.log(`   图片尺寸: ${width}x${height}`);
                            break;
                        }
                    }
                }
            }

            // 如果没有捕获到视频，尝试从页面中提取
            if (!noWatermarkUrl || !watermarkedUrl) {
                console.log('7. 尝试从页面DOM中提取视频...');
                
                // 1. 尝试获取所有video元素
                const videoElements = await this.page.$$('video');
                console.log(`   找到 ${videoElements.length} 个video元素`);
                
                for (let i = 0; i < videoElements.length; i++) {
                    const videoElement = videoElements[i];
                    const extractedVideoUrl = await videoElement.evaluate(v => v.src);
                    console.log(`   视频元素 #${i+1} 的src:`, extractedVideoUrl);
                    
                    // 分析提取的URL
                    let isElementWatermarked = false;
                    let isElementNoWatermark = false;
                    
                    if (extractedVideoUrl.includes('playwm=1')) {
                        isElementWatermarked = true;
                    } else if (extractedVideoUrl.includes('playwm=0')) {
                        isElementNoWatermark = true;
                    } else {
                        if (extractedVideoUrl.includes('watermark') || extractedVideoUrl.includes('wm') || extractedVideoUrl.includes('playwm')) {
                            isElementWatermarked = true;
                        } else {
                            isElementNoWatermark = true;
                        }
                    }
                    
                    // 更新结果
                    if (isElementWatermarked && !watermarkedUrl) {
                        watermarkedUrl = extractedVideoUrl;
                        console.log('   ✅ 从页面提取到: 有水印视频');
                        
                        // 尝试从有水印URL生成无水印URL
                        const generatedNoWatermarkUrl = extractedVideoUrl.replace('playwm=1', 'playwm=0');
                        if (generatedNoWatermarkUrl !== extractedVideoUrl && !noWatermarkUrl) {
                            console.log('   💡 从有水印URL生成无水印URL:', generatedNoWatermarkUrl);
                            noWatermarkUrl = generatedNoWatermarkUrl;
                        }
                    } else if (isElementNoWatermark && !noWatermarkUrl) {
                        noWatermarkUrl = extractedVideoUrl;
                        console.log('   ✅ 从页面提取到: 无水印视频');
                    }
                }
                
                // 2. 尝试从页面脚本中提取视频信息
                if (!noWatermarkUrl && !watermarkedUrl) {
                    console.log('8. 尝试从页面脚本中提取视频信息...');
                    
                    try {
                        // 执行页面脚本，查找可能包含视频信息的对象
                        const videoInfo = await this.page.evaluate(() => {
                            // 查找页面中的视频数据
                            const scripts = document.querySelectorAll('script');
                            for (const script of scripts) {
                                const content = script.textContent;
                                if (content.includes('playwm') || content.includes('video')) {
                                    // 尝试匹配视频URL
                                    const videoRegex = /(https?:\/\/[^"'\s]+\.mp4[^"'\s]*)/g;
                                    const matches = content.match(videoRegex);
                                    if (matches && matches.length > 0) {
                                        return matches;
                                    }
                                }
                            }
                            return null;
                        });
                        
                        if (videoInfo && videoInfo.length > 0) {
                            console.log('   从脚本中提取到视频URL列表:', videoInfo);
                            
                            // 分析每个URL
                            for (const url of videoInfo) {
                                if (url.includes('.mp4')) {
                                    let isScriptWatermarked = false;
                                    let isScriptNoWatermark = false;
                                    
                                    if (url.includes('playwm=1')) {
                                        isScriptWatermarked = true;
                                    } else if (url.includes('playwm=0')) {
                                        isScriptNoWatermark = true;
                                    } else {
                                        if (url.includes('watermark') || url.includes('wm') || url.includes('playwm')) {
                                            isScriptWatermarked = true;
                                        } else {
                                            isScriptNoWatermark = true;
                                        }
                                    }
                                    
                                    // 更新结果
                                    if (isScriptWatermarked && !watermarkedUrl) {
                                        watermarkedUrl = url;
                                        console.log('   ✅ 从脚本提取到: 有水印视频');
                                    } else if (isScriptNoWatermark && !noWatermarkUrl) {
                                        noWatermarkUrl = url;
                                        console.log('   ✅ 从脚本提取到: 无水印视频');
                                    }
                                }
                            }
                        } else {
                            console.log('   ❌ 未能从脚本中提取到视频信息');
                        }
                    } catch (error) {
                        console.error('   ❌ 执行页面脚本出错:', error.message);
                    }
                }
            }
            
            // 最终处理：确保至少有一个无水印视频URL
            if (!noWatermarkUrl && watermarkedUrl) {
                console.log('9. 最终处理：尝试从有水印URL生成无水印URL...');
                
                // 多种生成无水印URL的策略
                const strategies = [
                    (url) => url.replace('playwm=1', 'playwm=0'),
                    (url) => url.replace('/playwm/', '/play/'),
                    (url) => url.replace('wm=1', 'wm=0'),
                    (url) => url.replace('watermark=1', 'watermark=0'),
                    (url) => url.replace('wm', ''),
                    (url) => url.replace('watermark', '')
                ];
                
                for (const strategy of strategies) {
                    const generatedUrl = strategy(watermarkedUrl);
                    if (generatedUrl !== watermarkedUrl) {
                        console.log(`   💡 尝试策略: ${strategy.toString().match(/=> (.*)\)/)[1]}`);
                        console.log(`   生成URL: ${generatedUrl}`);
                        noWatermarkUrl = generatedUrl;
                        break;
                    }
                }
            }

            // 汇总结果
            console.log('\n10. 视频获取结果汇总:');
            console.log('   媒体请求总数:', mediaRequestsCount);
            console.log('   视频请求总数:', videoRequestsCount);
            console.log('   图片请求总数:', imageRequestsCount);
            console.log('   有水印视频URL:', watermarkedUrl ? '✅ 获取成功' : '❌ 未获取到');
            console.log('   无水印视频URL:', noWatermarkUrl ? '✅ 获取成功' : '❌ 未获取到');
            console.log('   视频封面图URL:', coverUrl ? '✅ 获取成功' : '❌ 未获取到');
            console.log('   最终有水印URL:', watermarkedUrl);
            console.log('   最终无水印URL:', noWatermarkUrl);
            console.log('   最终封面图URL:', coverUrl);
            
            const result = { 
                watermarked: watermarkedUrl, 
                noWatermark: noWatermarkUrl, 
                cover: coverUrl 
            };
            console.log('\n--- getVideoUrl 方法执行完成 ---');
            return result;
        } catch (error) {
            console.error('\n❌ getVideoUrl 方法执行异常:');
            console.error('   错误类型:', error.name);
            console.error('   错误消息:', error.message);
            console.error('   错误堆栈:', error.stack);
            console.error('--- getVideoUrl 方法执行失败 ---');
            return { watermarked: null, noWatermark: null, cover: null };
        } finally {
            // 关闭浏览器
            console.log('8. 关闭浏览器实例...');
            await this.close();
            console.log('✅ 浏览器已关闭');
        }
    }

    async downloadVideo(videoUrl, savePath) {
        console.log('\n--- SanTik.downloadVideo 方法开始执行 ---');
        console.log('视频源URL:', videoUrl);
        console.log('保存路径:', savePath);
        
        try {
            // 发送HTTP请求获取视频流
            console.log('1. 开始发送视频下载请求...');
            const startTime = Date.now();
            
            const response = await axios({
                url: videoUrl,
                method: 'GET',
                responseType: 'stream',
                onDownloadProgress: (progressEvent) => {
                    if (progressEvent.total) {
                        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        console.log(`   📥 下载进度: ${percentCompleted}% (${progressEvent.loaded} / ${progressEvent.total} bytes)`);
                    } else {
                        console.log(`   📥 下载中: ${progressEvent.loaded} bytes`);
                    }
                }
            });
            
            console.log('   ✅ 视频请求成功');
            console.log('   响应状态:', response.status);
            console.log('   响应头:', response.headers);
            
            // 创建文件写入流
            console.log('2. 开始写入文件...');
            const writer = fs.createWriteStream(savePath);
            
            // 管道传输视频流
            response.data.pipe(writer);
            
            // 等待写入完成
            await new Promise((resolve, reject) => {
                writer.on('finish', () => {
                    const endTime = Date.now();
                    const fileStats = fs.statSync(savePath);
                    const fileSize = fileStats.size;
                    const duration = endTime - startTime;
                    const speed = (fileSize / duration * 1000).toFixed(2);
                    
                    console.log(`   ✅ 文件写入完成`);
                    console.log(`   文件大小: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
                    console.log(`   下载速度: ${speed} bytes/s`);
                    console.log(`   总耗时: ${duration} ms`);
                    
                    resolve();
                });
                
                writer.on('error', (error) => {
                    console.error('   ❌ 文件写入失败:', error);
                    reject(error);
                });
            });
            
            console.log('\n✅ 视频下载完成！');
            console.log('--- SanTik.downloadVideo 方法执行完成 ---');
        } catch (error) {
            console.error('\n❌ 视频下载失败:');
            console.error('   错误类型:', error.name);
            console.error('   错误消息:', error.message);
            console.error('   错误堆栈:', error.stack);
            console.error('--- SanTik.downloadVideo 方法执行失败 ---');
            throw error;
        }
    }
}

// 创建Express应用
const app = express();
const PORT = process.env.PORT || 3000;

// 配置中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 确保videos目录存在
const videosDir = path.join(__dirname, 'videos');
if (!fs.existsSync(videosDir)) {
    fs.mkdirSync(videosDir, { recursive: true });
}

// 从文本中提取URL的函数
function extractUrl(text) {
    console.log('\n=== 后端URL提取开始 ===');
    console.log('待提取文本:', text);
    // 匹配抖音和TikTok链接的正则表达式
    const urlRegex = /(https?:\/\/(?:www\.)?(?:douyin\.com|tiktok\.com|v\.douyin\.com)\/[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=%]+)/gi;
    const matches = text.match(urlRegex);
    console.log('正则匹配结果:', matches);
    const extractedUrl = matches ? matches[0] : null;
    console.log('最终提取URL:', extractedUrl);
    console.log('=== 后端URL提取结束 ===');
    return extractedUrl;
}

// API路由
app.post('/api/get-video', async (req, res) => {
    console.log('\n\n==================================================');
    console.log('=== 收到新的视频获取API请求 ===');
    console.log('请求时间:', new Date().toISOString());
    console.log('请求IP:', req.ip);
    console.log('请求体:', req.body);
    
    try {
        let { url } = req.body;
        
        if (!url) {
            console.error('❌ 请求缺少URL参数');
            return res.status(400).json({
                success: false,
                message: '请提供有效的视频链接'
            });
        }

        // 从文本中提取URL
        const extractedUrl = extractUrl(url);
        if (!extractedUrl) {
            console.error('❌ 无法提取有效的视频链接');
            return res.status(400).json({
                success: false,
                message: '请提供有效的抖音或TikTok链接'
            });
        }

        const finalUrl = extractedUrl;
        console.log('\n=== 开始获取视频信息 ===');
        console.log('目标URL:', finalUrl);
        
        const startTime = Date.now();
        const sanTik = new SanTik();
        const videoUrls = await sanTik.getVideoUrl(finalUrl);
        const endTime = Date.now();
        
        console.log(`=== 视频URL获取完成，耗时 ${endTime - startTime}ms ===`);
        console.log('获取结果:', videoUrls);

        // 配置选项：是否下载到服务器（解决前端防盗链问题）
        const DOWNLOAD_TO_SERVER = true; // true: 下载到服务器，false: 直接返回原始URL
        
        // 准备返回数据
        const result = {
            success: true,
            data: {
                // 视频封面图URL
                cover: videoUrls.cover,
                // 原始视频URL（直接从源站获取，不占用服务器资源）
                original: {
                    watermarked: videoUrls.watermarked,
                    noWatermark: videoUrls.noWatermark
                },
                // 本地存储的视频URL（占用服务器资源）
                local: {
                    watermarked: null,
                    noWatermark: null
                }
            }
        };

        // 处理无水印视频
        if (videoUrls.noWatermark) {
            console.log('\n=== 无水印视频处理 ===');
            console.log('📍 无水印视频原始地址:', videoUrls.noWatermark);
            
            if (DOWNLOAD_TO_SERVER) {
                console.log('✅ 下载到服务器，解决前端防盗链问题');
                const noWatermarkFileName = `no_watermark_${Date.now()}.mp4`;
                const noWatermarkPath = path.join(videosDir, noWatermarkFileName);
                console.log('保存路径:', noWatermarkPath);
                
                // 下载视频到服务器
                await sanTik.downloadVideo(videoUrls.noWatermark, noWatermarkPath);
                result.data.local.noWatermark = `/videos/${noWatermarkFileName}`;
                console.log('✅ 无水印视频下载完成，本地访问URL:', result.data.local.noWatermark);
            } else {
                console.log('✅ 直接返回原始URL，不占用服务器资源');
            }
        }

        // 处理有水印视频
        if (videoUrls.watermarked) {
            console.log('\n=== 有水印视频处理 ===');
            console.log('📍 有水印视频原始地址:', videoUrls.watermarked);
            
            if (DOWNLOAD_TO_SERVER) {
                console.log('✅ 下载到服务器，解决前端防盗链问题');
                const watermarkedFileName = `watermarked_${Date.now()}.mp4`;
                const watermarkedPath = path.join(videosDir, watermarkedFileName);
                console.log('保存路径:', watermarkedPath);
                
                // 下载视频到服务器
                await sanTik.downloadVideo(videoUrls.watermarked, watermarkedPath);
                result.data.local.watermarked = `/videos/${watermarkedFileName}`;
                console.log('✅ 有水印视频下载完成，本地访问URL:', result.data.local.watermarked);
            } else {
                console.log('✅ 直接返回原始URL，不占用服务器资源');
            }
        }

        // 处理封面图 - 直接返回原始URL
        if (videoUrls.cover) {
            console.log('\n=== 封面图处理 ===');
            console.log('✅ 直接返回封面图原始URL，不占用服务器资源');
            console.log('📍 封面图原始地址:', videoUrls.cover);
        } else {
            console.log('\n=== 封面图处理 ===');
            console.log('⚠️  未能获取到封面图');
        }

        // 确保至少获取到一种视频
        if (!videoUrls.noWatermark && !videoUrls.watermarked) {
            console.error('❌ 未能获取到任何视频URL');
            return res.status(404).json({
                success: false,
                message: '无法获取视频URL，请检查链接是否有效'
            });
        }

        console.log('\n=== API响应准备完成 ===');
        console.log('响应数据:', result);
        console.log('==================================================\n');
        
        return res.json(result);
    } catch (error) {
        console.error('\n==================================================');
        console.error('❌ API处理异常:', error);
        console.error('==================================================\n');
        return res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
});

// 静态文件服务 - 提供下载的视频
app.use('/videos', express.static(videosDir));

// 启动服务器
app.listen(PORT, () => {
    console.log(`\n🚀 SanTik服务器已启动`);
    console.log(`📦 前端页面: http://localhost:${PORT}`);
    console.log(`🔧 API接口: http://localhost:${PORT}/api/get-video`);
    console.log(`\n按 Ctrl+C 停止服务器\n`);
});

// 命令行使用示例（兼容旧版）
async function main() {
    if (process.argv.length > 2 && process.argv[2] !== 'serve') {
        const shareUrl = process.argv[2];
        const sanTik = new SanTik();
        
        console.log('Processing URL:', shareUrl);
        const videoUrl = await sanTik.getVideoUrl(shareUrl);
        
        if (videoUrl) {
            console.log('\n✅ Success! No watermark video URL:');
            console.log(videoUrl);
        } else {
            console.log('\n❌ Failed to get video URL.');
        }
    }
}

if (require.main === module) {
    main();
}

module.exports = SanTik;