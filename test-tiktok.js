const TikTokDownloader = require('./tiktok-downloader');

async function testTikTokDownloader() {
    console.log('=== TikTok无水印视频下载测试 ===');
    
    // 用户提供的测试URL
    const testUrl = 'https://www.tiktok.com/@cu.cumber69/video/7578952907178134787';
    
    console.log('测试URL:', testUrl);
    
    try {
        const tiktokDownloader = new TikTokDownloader();
        const result = await tiktokDownloader.getVideoUrl(testUrl);
        
        console.log('\n=== 测试结果 ===');
        console.log('有水印视频URL:', result.watermarked);
        console.log('无水印视频URL:', result.noWatermark);
        console.log('封面图URL:', result.cover);
        
        if (result.noWatermark) {
            console.log('\n✅ 测试成功！获取到无水印视频URL');
        } else {
            console.log('\n❌ 测试失败！未能获取到无水印视频URL');
        }
        
        return result;
    } catch (error) {
        console.error('\n❌ 测试异常:', error);
        return null;
    }
}

// 运行测试
testTikTokDownloader();